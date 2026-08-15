-- The National Radar: watches external news sources around the clock for
-- coaching changes across the country, before they show up in vendor files.
-- Run this in the Supabase SQL editor after 0003_watchtower.sql.
--
-- Sources are keyless RSS feeds (Google News searches per sport). A pg_cron
-- job fetches them every 6 hours via the `http` extension, dedupes by link,
-- tries to match each headline to a coach already in the database, and posts
-- a Watchtower alert when new items land. Findings appear on the Coach
-- Tracker page under "News Radar".

create extension if not exists http;

create table if not exists radar_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  sport text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists radar_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references radar_sources(id) on delete cascade,
  title text not null,
  link text not null unique,
  published_at timestamptz,
  matched_coach_id uuid references coaches(id) on delete set null,
  status text not null default 'new' check (status in ('new', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists radar_items_status_idx on radar_items (status, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['radar_sources', 'radar_items'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_all', t);
    execute format('create policy %I on %I for all using (true) with check (true)', t || '_all', t);
  end loop;
end $$;

-- Let the Watchtower announce radar findings too.
alter table alerts drop constraint if exists alerts_kind_check;
alter table alerts add constraint alerts_kind_check check (kind in
  ('movement_digest', 'review_reminder', 'stale_data', 'mass_departure', 'radar_news'));

-- Default sources: one Google News RSS search per major sport, plus a
-- catch-all. Add or disable rows in radar_sources to tune coverage.
insert into radar_sources (name, url, sport) values
  ('College coaching changes (all sports)',
   'https://news.google.com/rss/search?q=%22named+head+coach%22+college&hl=en-US&gl=US&ceid=US:en', null),
  ('College soccer coaching news',
   'https://news.google.com/rss/search?q=college+soccer+%22head+coach%22+(named+OR+hired+OR+resigns+OR+steps+down)&hl=en-US&gl=US&ceid=US:en', 'Soccer'),
  ('College basketball coaching news',
   'https://news.google.com/rss/search?q=college+basketball+%22head+coach%22+(named+OR+hired+OR+resigns+OR+steps+down)&hl=en-US&gl=US&ceid=US:en', 'Basketball'),
  ('College football coaching news',
   'https://news.google.com/rss/search?q=college+football+%22head+coach%22+(named+OR+hired+OR+resigns+OR+steps+down)&hl=en-US&gl=US&ceid=US:en', 'Football'),
  ('College baseball coaching news',
   'https://news.google.com/rss/search?q=college+baseball+%22head+coach%22+(named+OR+hired+OR+resigns+OR+steps+down)&hl=en-US&gl=US&ceid=US:en', 'Baseball'),
  ('College volleyball coaching news',
   'https://news.google.com/rss/search?q=college+volleyball+%22head+coach%22+(named+OR+hired+OR+resigns+OR+steps+down)&hl=en-US&gl=US&ceid=US:en', 'Volleyball'),
  ('College lacrosse coaching news',
   'https://news.google.com/rss/search?q=college+lacrosse+%22head+coach%22+(named+OR+hired+OR+resigns+OR+steps+down)&hl=en-US&gl=US&ceid=US:en', 'Lacrosse'),
  ('College softball coaching news',
   'https://news.google.com/rss/search?q=college+softball+%22head+coach%22+(named+OR+hired+OR+resigns+OR+steps+down)&hl=en-US&gl=US&ceid=US:en', 'Softball'),
  ('College ice hockey coaching news',
   'https://news.google.com/rss/search?q=college+hockey+%22head+coach%22+(named+OR+hired+OR+resigns+OR+steps+down)&hl=en-US&gl=US&ceid=US:en', 'Ice Hockey')
on conflict (url) do nothing;

create or replace function run_radar()
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
  for v_src in select * from radar_sources where enabled loop
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
          -- Best-effort match: an active coach whose full name appears in the
          -- headline (both names required, short names skipped to avoid noise).
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

grant execute on function run_radar() to anon, authenticated;

-- Sweep every 6 hours, offset from the daily Watchtower run.
do $$
begin
  perform cron.unschedule('rfx-radar');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule('rfx-radar', '15 */6 * * *', 'select run_radar()');
exception when others then
  raise notice 'pg_cron not available — run_radar() can still be called manually.';
end $$;
