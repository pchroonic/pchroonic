alter table public.address_dataset_registry
  add column if not exists record_store text not null default 'master_addresses',
  add column if not exists upstream_product_id text,
  add column if not exists expected_refresh_days integer,
  add column if not exists last_checked_at timestamptz,
  add column if not exists last_available_version text;

alter table public.address_dataset_registry
  drop constraint if exists address_dataset_registry_record_store_check;
alter table public.address_dataset_registry
  add constraint address_dataset_registry_record_store_check
  check (record_store in ('master_addresses','postcode_points','property_entities','external'));

alter table public.address_dataset_registry
  drop constraint if exists address_dataset_registry_expected_refresh_days_check;
alter table public.address_dataset_registry
  add constraint address_dataset_registry_expected_refresh_days_check
  check (expected_refresh_days is null or expected_refresh_days between 1 and 3660);

update public.address_dataset_registry
set record_store = 'master_addresses', updated_at = now()
where source_dataset in ('getaddress-daily-cache','osm-postcode-cache');

update public.address_dataset_registry
set record_store = 'property_entities',
    upstream_product_id = 'OpenUPRN',
    expected_refresh_days = 42,
    notes = 'OS Open UPRN property identifiers and coordinates. Import into property_entities, not master_addresses. Start with a service-area-scoped pilot while Namdar is on the Supabase Free database limit.',
    updated_at = now()
where source_dataset = 'os-open-uprn';

update public.address_dataset_registry
set record_store = 'postcode_points',
    upstream_product_id = 'CodePointOpen',
    expected_refresh_days = 92,
    notes = 'Code-Point Open postcode-unit location and administrative-code intelligence. Import into postcode_points, not master_addresses. Service-area-first imports are preferred while Namdar is on the Supabase Free database limit.',
    updated_at = now()
where source_dataset = 'code-point-open';

create table if not exists public.open_data_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_dataset text not null references public.address_dataset_registry(source_dataset),
  upstream_product_id text,
  upstream_version text not null,
  upstream_url text,
  coverage_scope text not null default 'GB',
  filter_definition jsonb not null default '{}'::jsonb,
  status text not null default 'running' check (status in ('running','completed','partial','failed','cancelled')),
  complete_scope boolean not null default false,
  rows_read bigint not null default 0 check (rows_read >= 0),
  rows_selected bigint not null default 0 check (rows_selected >= 0),
  rows_upserted bigint not null default 0 check (rows_upserted >= 0),
  rows_deactivated bigint not null default 0 check (rows_deactivated >= 0),
  source_bytes bigint check (source_bytes is null or source_bytes >= 0),
  source_sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  error_text text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists open_data_import_runs_source_started_idx
  on public.open_data_import_runs (source_dataset, started_at desc);
create index if not exists open_data_import_runs_scope_started_idx
  on public.open_data_import_runs (source_dataset, coverage_scope, started_at desc);

create table if not exists public.postcode_points (
  postcode text primary key,
  source_dataset text not null default 'code-point-open' references public.address_dataset_registry(source_dataset),
  positional_quality_indicator smallint,
  easting integer,
  northing integer,
  latitude double precision,
  longitude double precision,
  country_code text,
  nhs_regional_ha_code text,
  nhs_ha_code text,
  admin_county_code text,
  admin_district_code text,
  admin_ward_code text,
  dataset_version text not null,
  coverage_scope text not null default 'GB',
  import_run_id uuid references public.open_data_import_runs(id) on delete set null,
  active boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (postcode ~ '^[A-Z]{1,2}[0-9][A-Z0-9]? [0-9][A-Z]{2}$'),
  check (positional_quality_indicator is null or positional_quality_indicator in (10,20,30,40,50,60,90)),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);
create index if not exists postcode_points_district_idx on public.postcode_points (admin_district_code, active);
create index if not exists postcode_points_ward_idx on public.postcode_points (admin_ward_code, active);
create index if not exists postcode_points_xy_idx on public.postcode_points (easting, northing) where active = true;
create index if not exists postcode_points_lat_lon_idx on public.postcode_points (latitude, longitude) where active = true;
create index if not exists postcode_points_version_idx on public.postcode_points (source_dataset, dataset_version);

create table if not exists public.property_entities (
  uprn text primary key,
  location_source_dataset text not null default 'os-open-uprn' references public.address_dataset_registry(source_dataset),
  source_record_id text not null,
  easting double precision,
  northing double precision,
  latitude double precision,
  longitude double precision,
  dataset_version text not null,
  coverage_scope text not null default 'GB',
  import_run_id uuid references public.open_data_import_runs(id) on delete set null,
  active boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (uprn ~ '^[0-9]{1,12}$'),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180),
  unique (location_source_dataset, source_record_id)
);
create index if not exists property_entities_location_idx on public.property_entities (latitude, longitude) where active = true;
create index if not exists property_entities_version_idx on public.property_entities (location_source_dataset, dataset_version);
create index if not exists property_entities_scope_idx on public.property_entities (coverage_scope, active);

create table if not exists public.property_field_observations (
  id bigint generated always as identity primary key,
  uprn text not null references public.property_entities(uprn) on delete cascade,
  field_name text not null,
  field_value jsonb not null,
  source_dataset text not null references public.address_dataset_registry(source_dataset),
  source_record_id text,
  dataset_version text,
  observed_at timestamptz not null default now(),
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  active boolean not null default true,
  import_run_id uuid references public.open_data_import_runs(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists property_field_observations_uprn_field_idx
  on public.property_field_observations (uprn, field_name, active, observed_at desc);
create index if not exists property_field_observations_source_idx
  on public.property_field_observations (source_dataset, dataset_version);

alter table public.open_data_import_runs enable row level security;
alter table public.postcode_points enable row level security;
alter table public.property_entities enable row level security;
alter table public.property_field_observations enable row level security;

revoke all on public.open_data_import_runs from anon, authenticated;
revoke all on public.postcode_points from anon, authenticated;
revoke all on public.property_entities from anon, authenticated;
revoke all on public.property_field_observations from anon, authenticated;

grant all on public.open_data_import_runs to service_role;
grant all on public.postcode_points to service_role;
grant all on public.property_entities to service_role;
grant all on public.property_field_observations to service_role;
grant usage, select on sequence public.property_field_observations_id_seq to service_role;

create or replace function public.refresh_address_dataset_registry_count(p_source_dataset text)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_store text;
  v_count bigint := 0;
begin
  select record_store into v_store
  from public.address_dataset_registry
  where source_dataset = p_source_dataset;

  if not found then
    raise exception 'unknown_address_dataset:%', p_source_dataset;
  end if;

  if v_store = 'master_addresses' then
    select count(*) into v_count from public.master_addresses where source_dataset = p_source_dataset;
  elsif v_store = 'postcode_points' then
    select count(*) into v_count from public.postcode_points where source_dataset = p_source_dataset;
  elsif v_store = 'property_entities' then
    select count(*) into v_count from public.property_entities where location_source_dataset = p_source_dataset;
  else
    v_count := 0;
  end if;

  update public.address_dataset_registry
  set row_count = v_count,
      updated_at = now()
  where source_dataset = p_source_dataset;

  return v_count;
end;
$$;

revoke all on function public.refresh_address_dataset_registry_count(text) from public, anon, authenticated;
grant execute on function public.refresh_address_dataset_registry_count(text) to service_role;

create or replace function public.sync_address_registry_after_insert()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare v_source text;
begin
  for v_source in select distinct source_dataset from new_rows loop
    perform public.refresh_address_dataset_registry_count(v_source);
  end loop;
  return null;
end;
$$;

create or replace function public.sync_address_registry_after_delete()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare v_source text;
begin
  for v_source in select distinct source_dataset from old_rows loop
    perform public.refresh_address_dataset_registry_count(v_source);
  end loop;
  return null;
end;
$$;

create or replace function public.sync_address_registry_after_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare v_source text;
begin
  for v_source in
    select source_dataset from new_rows
    union
    select source_dataset from old_rows
  loop
    perform public.refresh_address_dataset_registry_count(v_source);
  end loop;
  return null;
end;
$$;

create or replace function public.sync_property_registry_after_insert()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare v_source text;
begin
  for v_source in select distinct location_source_dataset from new_rows loop
    perform public.refresh_address_dataset_registry_count(v_source);
  end loop;
  return null;
end;
$$;

create or replace function public.sync_property_registry_after_delete()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare v_source text;
begin
  for v_source in select distinct location_source_dataset from old_rows loop
    perform public.refresh_address_dataset_registry_count(v_source);
  end loop;
  return null;
end;
$$;

create or replace function public.sync_property_registry_after_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare v_source text;
begin
  for v_source in
    select location_source_dataset from new_rows
    union
    select location_source_dataset from old_rows
  loop
    perform public.refresh_address_dataset_registry_count(v_source);
  end loop;
  return null;
end;
$$;

revoke all on function public.sync_address_registry_after_insert() from public, anon, authenticated;
revoke all on function public.sync_address_registry_after_delete() from public, anon, authenticated;
revoke all on function public.sync_address_registry_after_update() from public, anon, authenticated;
revoke all on function public.sync_property_registry_after_insert() from public, anon, authenticated;
revoke all on function public.sync_property_registry_after_delete() from public, anon, authenticated;
revoke all on function public.sync_property_registry_after_update() from public, anon, authenticated;
grant execute on function public.sync_address_registry_after_insert() to service_role;
grant execute on function public.sync_address_registry_after_delete() to service_role;
grant execute on function public.sync_address_registry_after_update() to service_role;
grant execute on function public.sync_property_registry_after_insert() to service_role;
grant execute on function public.sync_property_registry_after_delete() to service_role;
grant execute on function public.sync_property_registry_after_update() to service_role;

drop trigger if exists postcode_points_registry_count_insert on public.postcode_points;
create trigger postcode_points_registry_count_insert
after insert on public.postcode_points
referencing new table as new_rows
for each statement execute function public.sync_address_registry_after_insert();

drop trigger if exists postcode_points_registry_count_delete on public.postcode_points;
create trigger postcode_points_registry_count_delete
after delete on public.postcode_points
referencing old table as old_rows
for each statement execute function public.sync_address_registry_after_delete();

drop trigger if exists postcode_points_registry_count_update on public.postcode_points;
create trigger postcode_points_registry_count_update
after update on public.postcode_points
referencing old table as old_rows new table as new_rows
for each statement execute function public.sync_address_registry_after_update();

drop trigger if exists property_entities_registry_count_insert on public.property_entities;
create trigger property_entities_registry_count_insert
after insert on public.property_entities
referencing new table as new_rows
for each statement execute function public.sync_property_registry_after_insert();

drop trigger if exists property_entities_registry_count_delete on public.property_entities;
create trigger property_entities_registry_count_delete
after delete on public.property_entities
referencing old table as old_rows
for each statement execute function public.sync_property_registry_after_delete();

drop trigger if exists property_entities_registry_count_update on public.property_entities;
create trigger property_entities_registry_count_update
after update on public.property_entities
referencing old table as old_rows new table as new_rows
for each statement execute function public.sync_property_registry_after_update();

select public.refresh_address_dataset_registry_count(source_dataset)
from public.address_dataset_registry
where record_store in ('master_addresses','postcode_points','property_entities');

create or replace view public.address_dataset_health
with (security_invoker = true)
as
select
  r.*,
  case r.record_store
    when 'master_addresses' then (select count(*)::bigint from public.master_addresses m where m.source_dataset = r.source_dataset)
    when 'postcode_points' then (select count(*)::bigint from public.postcode_points p where p.source_dataset = r.source_dataset)
    when 'property_entities' then (select count(*)::bigint from public.property_entities p where p.location_source_dataset = r.source_dataset)
    else 0::bigint
  end as actual_row_count,
  case r.record_store
    when 'master_addresses' then (select count(*)::bigint from public.master_addresses m where m.source_dataset = r.source_dataset and m.active = true)
    when 'postcode_points' then (select count(*)::bigint from public.postcode_points p where p.source_dataset = r.source_dataset and p.active = true)
    when 'property_entities' then (select count(*)::bigint from public.property_entities p where p.location_source_dataset = r.source_dataset and p.active = true)
    else 0::bigint
  end as active_row_count,
  r.row_count = case r.record_store
    when 'master_addresses' then (select count(*)::bigint from public.master_addresses m where m.source_dataset = r.source_dataset)
    when 'postcode_points' then (select count(*)::bigint from public.postcode_points p where p.source_dataset = r.source_dataset)
    when 'property_entities' then (select count(*)::bigint from public.property_entities p where p.location_source_dataset = r.source_dataset)
    else 0::bigint
  end as count_in_sync
from public.address_dataset_registry r;

revoke all on public.address_dataset_health from anon, authenticated;
grant select on public.address_dataset_health to service_role;

create or replace view public.postcode_distribution_eligible
with (security_invoker = true)
as
select
  p.*,
  r.licence_category,
  r.licence_name,
  r.licence_reference,
  r.attribution_text,
  r.share_alike_required
from public.postcode_points p
join public.address_dataset_registry r using (source_dataset)
where p.active = true
  and r.active = true
  and r.commercial_redistribution_allowed = true
  and r.subscription_api_allowed = true;

create or replace view public.property_distribution_eligible
with (security_invoker = true)
as
select
  p.*,
  r.licence_category,
  r.licence_name,
  r.licence_reference,
  r.attribution_text,
  r.share_alike_required
from public.property_entities p
join public.address_dataset_registry r on r.source_dataset = p.location_source_dataset
where p.active = true
  and r.active = true
  and r.commercial_redistribution_allowed = true
  and r.subscription_api_allowed = true;

create or replace view public.property_field_distribution_eligible
with (security_invoker = true)
as
select
  o.*,
  r.licence_category,
  r.licence_name,
  r.licence_reference,
  r.attribution_text,
  r.share_alike_required
from public.property_field_observations o
join public.address_dataset_registry r using (source_dataset)
where o.active = true
  and r.active = true
  and r.commercial_redistribution_allowed = true
  and r.subscription_api_allowed = true;

revoke all on public.postcode_distribution_eligible from anon, authenticated;
revoke all on public.property_distribution_eligible from anon, authenticated;
revoke all on public.property_field_distribution_eligible from anon, authenticated;
grant select on public.postcode_distribution_eligible to service_role;
grant select on public.property_distribution_eligible to service_role;
grant select on public.property_field_distribution_eligible to service_role;

create or replace view public.open_data_import_latest
with (security_invoker = true)
as
select distinct on (source_dataset, coverage_scope)
  id, source_dataset, upstream_product_id, upstream_version, upstream_url,
  coverage_scope, filter_definition, status, complete_scope,
  rows_read, rows_selected, rows_upserted, rows_deactivated,
  source_bytes, source_sha256, metadata, error_text, started_at, finished_at
from public.open_data_import_runs
order by source_dataset, coverage_scope, started_at desc;

revoke all on public.open_data_import_latest from anon, authenticated;
grant select on public.open_data_import_latest to service_role;

create or replace function public.finalize_open_data_import(
  p_run_id uuid,
  p_complete_scope boolean default false,
  p_activate_source boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_run public.open_data_import_runs%rowtype;
  v_store text;
  v_deactivated bigint := 0;
  v_count bigint := 0;
begin
  select * into v_run
  from public.open_data_import_runs
  where id = p_run_id
  for update;

  if not found then
    raise exception 'open_data_import_run_not_found';
  end if;

  if v_run.status <> 'running' then
    raise exception 'open_data_import_run_not_running';
  end if;

  select record_store into v_store
  from public.address_dataset_registry
  where source_dataset = v_run.source_dataset;

  if p_complete_scope then
    if v_store = 'postcode_points' then
      update public.postcode_points
      set active = false, updated_at = now()
      where source_dataset = v_run.source_dataset
        and coverage_scope = v_run.coverage_scope
        and active = true
        and import_run_id is distinct from p_run_id;
      get diagnostics v_deactivated = row_count;
    elsif v_store = 'property_entities' then
      update public.property_entities
      set active = false, updated_at = now()
      where location_source_dataset = v_run.source_dataset
        and coverage_scope = v_run.coverage_scope
        and active = true
        and import_run_id is distinct from p_run_id;
      get diagnostics v_deactivated = row_count;
    end if;
  end if;

  v_count := public.refresh_address_dataset_registry_count(v_run.source_dataset);

  update public.address_dataset_registry
  set dataset_version = v_run.upstream_version,
      last_available_version = v_run.upstream_version,
      last_checked_at = now(),
      imported_at = now(),
      active = case when p_activate_source then true else active end,
      updated_at = now()
  where source_dataset = v_run.source_dataset;

  update public.open_data_import_runs
  set status = 'completed',
      complete_scope = p_complete_scope,
      rows_deactivated = v_deactivated,
      finished_at = now()
  where id = p_run_id;

  return jsonb_build_object(
    'runId', p_run_id,
    'sourceDataset', v_run.source_dataset,
    'coverageScope', v_run.coverage_scope,
    'completeScope', p_complete_scope,
    'rowsDeactivated', v_deactivated,
    'sourceRows', v_count,
    'sourceActive', p_activate_source
  );
end;
$$;

revoke all on function public.finalize_open_data_import(uuid,boolean,boolean) from public, anon, authenticated;
grant execute on function public.finalize_open_data_import(uuid,boolean,boolean) to service_role;
