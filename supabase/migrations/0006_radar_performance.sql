-- Radar fix, part 2. Run this after 0005_radar_timeout_fix.sql.
--
-- Two things:
-- 1. This project cancels app-initiated queries after ~3 seconds — barely
--    enough for a single news-feed fetch. Raise the ceiling to 20s for the
--    app's roles (fine for an internal tool; every other query is <100ms).
-- 2. Make the sweep leaner: bulk-insert headlines in one statement, then
--    match coaches in one pass, instead of row-by-row work.

alter role anon set statement_timeout = '20s';
alter role authenticated set statement_timeout = '20s';
notify pgrst, 'reload config';

-- Safe timestamp parse for RSS pubDates ("Sat, 18 Jul 2026 17:21:05 GMT").
create or replace function try_timestamptz(p text)
returns timestamptz
language plpgsql
immutable
as $$
begin
  return p::timestamptz;
exception when others then
  return null;
end;
$$;

create or replace function run_radar(p_source_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_src radar_sources%rowtype;
  v_body text;
  v_xml xml;
  v_new int := 0;
  v_cnt int;
  v_sources_ok int := 0;
begin
  -- Cap each outbound fetch so a slow feed can't blow the statement timeout.
  begin
    perform http_set_curlopt('CURLOPT_TIMEOUT_MS', '2500');
  exception when others then null;
  end;

  for v_src in
    select * from radar_sources
    where enabled and (p_source_id is null or id = p_source_id)
  loop
    begin
      select content into v_body from http_get(v_src.url);
      v_xml := v_body::xml;
      v_sources_ok := v_sources_ok + 1;

      insert into radar_items (source_id, title, link, published_at)
      select v_src.id, u.t::text, u.l::text, try_timestamptz(u.d::text)
      from unnest(
        xpath('//item/title/text()', v_xml),
        xpath('//item/link/text()', v_xml),
        xpath('//item/pubDate/text()', v_xml)
      ) as u(t, l, d)
      where u.t is not null and u.l is not null
      on conflict (link) do nothing;

      get diagnostics v_cnt = row_count;
      v_new := v_new + v_cnt;
    exception when others then
      -- One bad feed never stops the sweep.
      continue;
    end;
  end loop;

  -- Match fresh headlines to active coaches in one pass (full name required,
  -- short names skipped to avoid noise).
  if v_new > 0 then
    update radar_items ri
    set matched_coach_id = c.id
    from coaches c
    where ri.status = 'new'
      and ri.matched_coach_id is null
      and c.status = 'active'
      and length(c.first_name) > 2 and length(c.last_name) > 2
      and position(lower(c.first_name || ' ' || c.last_name) in lower(ri.title)) > 0;

    insert into alerts (kind, title, body, payload)
    values (
      'radar_news',
      v_new || ' new coaching-news item(s) on the radar',
      'The National Radar picked up new coaching-change headlines. Review them on the Coach Tracker page under News Radar.',
      jsonb_build_object('new_items', v_new)
    );
  end if;

  return jsonb_build_object('new_items', v_new, 'sources_scanned', v_sources_ok);
end;
$$;

grant execute on function run_radar(uuid) to anon, authenticated;
