alter table public.address_harvest_settings
  add column if not exists prioritize_service_areas boolean not null default true,
  add column if not exists service_seed_cursor bigint not null default 0 check (service_seed_cursor >= 0);

alter table public.address_harvest_postcodes
  add column if not exists priority_score integer not null default 0 check (priority_score >= 0 and priority_score <= 10000),
  add column if not exists coverage_label text,
  add column if not exists outcode text,
  add column if not exists expected_yield numeric not null default 0 check (expected_yield >= 0);

alter table public.address_harvest_runs
  add column if not exists service_area_postcodes_harvested integer not null default 0,
  add column if not exists service_area_addresses_collected integer not null default 0;

create index if not exists address_harvest_postcodes_priority_queue_idx
  on public.address_harvest_postcodes (status, priority_score desc, expected_yield desc, discovered_at asc)
  where status = 'pending';

comment on column public.address_harvest_settings.prioritize_service_areas is 'When true, daily GetAddress harvesting fills active Namdar service areas before expansion/fallback postcodes.';
comment on column public.address_harvest_postcodes.priority_score is 'Higher values are harvested first. Active Namdar service-area candidates receive the highest scores.';
comment on column public.address_harvest_postcodes.expected_yield is 'Learned expected address yield, primarily from previously harvested postcodes in the same outward code.';
