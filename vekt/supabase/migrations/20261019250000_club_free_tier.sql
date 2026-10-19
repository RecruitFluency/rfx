-- Club dashboard free while growing. Leave the value empty until the terms are set;
-- the dashboard shows the offer only when it holds a whole number of families.
insert into public.app_config (key, value, note) values
  ('club_free_families', '', 'Club dashboard is free up to this many approved families. Empty = no offer shown.')
on conflict (key) do nothing;
