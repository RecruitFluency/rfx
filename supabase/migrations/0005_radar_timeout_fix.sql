-- Radar fix: sweep one source per call so it fits inside Supabase's
-- per-request statement timeout. Run this after 0004_radar.sql.
--
-- The app now calls run_radar(source_id) once per source; the pg_cron job
-- (which runs with a longer timeout) still sweeps everything in one call.
-- Each feed fetch is also capped at 2.5s so one slow site can't hang a call.

drop function if exists run_radar();
drop function if exists run_radar(uuid);

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
  v_titles xml[];
  v_links xml[];
  v_dates xml[];
  v_title text;
  v_link text;
  v_pub timestamptz;
  v_new int := 0;
  v_sources_ok int := 0;
  v_inserted boolean;
  i int;
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
      v_titles := xpath('//item/title/text()', v_xml);
      v_links := xpath('//item/link/text()', v_xml);
      v_dates := xpath('//item/pubDate/text()', v_xml);
      v_sources_ok := v_sources_ok + 1;

      for i in 1 .. coalesce(array_length(v_titles, 1), 0) loop
        v_title := v_titles[i]::text;
        v_link := v_links[i]::text;
        begin
          v_pub := (v_dates[i]::text)::timestamptz;
        exception when others then
          v_pub := null;
        end;

        insert into radar_items (source_id, title, link, published_at, matched_coach_id)
        values (
          v_src.id, v_title, v_link, v_pub,
          (select c.id from coaches c
           where c.status = 'active'
             and length(c.first_name) > 2 and length(c.last_name) > 2
             and position(lower(c.first_name || ' ' || c.last_name) in lower(v_title)) > 0
           limit 1)
        )
        on conflict (link) do nothing
        returning true into v_inserted;
        if v_inserted then v_new := v_new + 1; end if;
        v_inserted := null;
      end loop;
    exception when others then
      -- One bad feed never stops the sweep.
      continue;
    end;
  end loop;

  if v_new > 0 then
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
