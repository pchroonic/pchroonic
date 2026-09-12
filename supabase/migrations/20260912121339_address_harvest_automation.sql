create table if not exists public.address_harvest_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default false,
  daily_lookup_cap integer not null default 20 check (daily_lookup_cap between 1 and 20),
  seed_cursor bigint not null default 0 check (seed_cursor >= 0),
  provider_usage_today integer,
  provider_daily_limit integer,
  provider_usage_checked_at timestamptz,
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.address_harvest_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.address_harvest_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null default current_date,
  trigger text not null check (trigger in ('cron','manual')),
  status text not null default 'running' check (status in ('running','completed','partial','skipped','failed')),
  requested_limit integer not null default 20 check (requested_limit between 0 and 20),
  provider_usage_before integer,
  provider_daily_limit integer,
  lookups_attempted integer not null default 0,
  lookups_succeeded integer not null default 0,
  postcodes_harvested integer not null default 0,
  addresses_collected integer not null default 0,
  addresses_upserted integer not null default 0,
  seed_terms jsonb not null default '[]'::jsonb,
  backup_json_path text,
  backup_csv_path text,
  error_text text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists address_harvest_runs_started_idx on public.address_harvest_runs (started_at desc);
create index if not exists address_harvest_runs_date_idx on public.address_harvest_runs (run_date, started_at desc);

create table if not exists public.address_harvest_postcodes (
  postcode text primary key,
  seed_term text,
  status text not null default 'pending' check (status in ('pending','harvested','error')),
  attempts integer not null default 0,
  address_count integer not null default 0,
  last_error text,
  discovered_at timestamptz not null default now(),
  harvested_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists address_harvest_postcodes_queue_idx on public.address_harvest_postcodes (status, discovered_at, postcode);

create table if not exists public.address_harvest_snapshots (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.address_harvest_runs(id) on delete cascade,
  postcode text not null,
  provider_payload jsonb not null,
  address_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (run_id, postcode)
);
create index if not exists address_harvest_snapshots_run_idx on public.address_harvest_snapshots (run_id, postcode);

alter table public.address_harvest_settings enable row level security;
alter table public.address_harvest_runs enable row level security;
alter table public.address_harvest_postcodes enable row level security;
alter table public.address_harvest_snapshots enable row level security;
revoke all on public.address_harvest_settings from anon, authenticated;
revoke all on public.address_harvest_runs from anon, authenticated;
revoke all on public.address_harvest_postcodes from anon, authenticated;
revoke all on public.address_harvest_snapshots from anon, authenticated;
grant all on public.address_harvest_settings to service_role;
grant all on public.address_harvest_runs to service_role;
grant all on public.address_harvest_postcodes to service_role;
grant all on public.address_harvest_snapshots to service_role;
grant usage, select on sequence public.address_harvest_snapshots_id_seq to service_role;

insert into public.address_dataset_registry (source_dataset, provider, product, dataset_version, licence_name, licence_reference, row_count, active, notes, imported_at, updated_at)
values ('getaddress-daily-cache','getAddress.io','Postcode autocomplete address cache','live',null,'https://getaddress.io/',0,true,'Addresses collected from postcode autocomplete lookups and retained in Namdar master storage. Automation is independently controlled by address_harvest_settings.',now(),now())
on conflict (source_dataset) do update set provider=excluded.provider, product=excluded.product, dataset_version=excluded.dataset_version, licence_reference=excluded.licence_reference, notes=excluded.notes, updated_at=now();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('address-harvest-backups','address-harvest-backups',false,52428800,array['application/json','text/csv']::text[])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
