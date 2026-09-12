alter table public.address_dataset_registry
  add column if not exists licence_category text not null default 'unreviewed',
  add column if not exists operational_use_allowed boolean not null default false,
  add column if not exists human_input_required boolean not null default false,
  add column if not exists automated_bulk_ingest_allowed boolean not null default false,
  add column if not exists commercial_redistribution_allowed boolean not null default false,
  add column if not exists subscription_api_allowed boolean not null default false,
  add column if not exists bulk_export_allowed boolean not null default false,
  add column if not exists share_alike_required boolean not null default false,
  add column if not exists attribution_text text,
  add column if not exists terms_reference text,
  add column if not exists rights_reviewed_at timestamptz,
  add column if not exists permission_reference text,
  add column if not exists rights_notes text;

alter table public.address_dataset_registry
  drop constraint if exists address_dataset_registry_licence_category_check;
alter table public.address_dataset_registry
  add constraint address_dataset_registry_licence_category_check
  check (licence_category in ('unreviewed','restricted_provider','odbl','ogl','commercial_licensed','proprietary'));

update public.address_dataset_registry
set
  licence_name = 'GetAddress Terms of Service',
  licence_reference = 'https://getaddress.io/Terms',
  licence_category = 'restricted_provider',
  operational_use_allowed = true,
  human_input_required = true,
  automated_bulk_ingest_allowed = false,
  commercial_redistribution_allowed = false,
  subscription_api_allowed = false,
  bulk_export_allowed = false,
  share_alike_required = false,
  attribution_text = null,
  terms_reference = 'https://getaddress.io/Terms',
  rights_reviewed_at = now(),
  rights_notes = 'Operational address lookup/cache only unless GetAddress grants explicit written permission. Current terms prohibit automated Autocomplete/Typeahead harvesting, large offline dataset extraction, and resale of the service or data without explicit permission.',
  notes = 'GetAddress may be used for operational, human-initiated address lookup and caching. Automated harvesting and commercial redistribution are blocked by Namdar policy unless explicit provider permission is recorded.',
  updated_at = now()
where source_dataset = 'getaddress-daily-cache';

update public.address_dataset_registry
set
  licence_category = 'odbl',
  operational_use_allowed = true,
  human_input_required = false,
  automated_bulk_ingest_allowed = false,
  commercial_redistribution_allowed = true,
  subscription_api_allowed = false,
  bulk_export_allowed = false,
  share_alike_required = true,
  attribution_text = '© OpenStreetMap contributors',
  terms_reference = 'https://www.openstreetmap.org/copyright',
  rights_reviewed_at = now(),
  rights_notes = 'Commercial use is permitted under ODbL, but public use of a Derivative Database can trigger attribution/share-alike obligations. Keep OSM-derived address rows out of proprietary paid-data exports until the distribution model is reviewed for ODbL compliance.',
  updated_at = now()
where source_dataset = 'osm-postcode-cache';

insert into public.address_dataset_registry (
  source_dataset, provider, product, dataset_version, licence_name, licence_reference,
  row_count, active, notes, imported_at, updated_at,
  licence_category, operational_use_allowed, human_input_required,
  automated_bulk_ingest_allowed, commercial_redistribution_allowed,
  subscription_api_allowed, bulk_export_allowed, share_alike_required,
  attribution_text, terms_reference, rights_reviewed_at, rights_notes
)
values
(
  'os-open-uprn', 'Ordnance Survey', 'OS Open UPRN', null,
  'Open Government Licence v3.0', 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
  0, false, 'Planned open-data source for UPRN and coordinates. Not yet imported.', now(), now(),
  'ogl', true, false, true, true, true, true, false,
  'Contains OS data © Crown copyright and database right 2026',
  'https://www.ordnancesurvey.co.uk/products/os-open-uprn', now(),
  'OS Open UPRN is free to use under OGL. It is a strong commercial foundation for UPRN/location intelligence but does not by itself provide a complete postal-address text dataset.'
),
(
  'code-point-open', 'Ordnance Survey', 'Code-Point Open', null,
  'Open Government Licence v3.0', 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
  0, false, 'Planned open-data source for postcode units and coordinates. Not yet imported.', now(), now(),
  'ogl', true, false, true, true, true, true, false,
  'Contains OS data © Crown copyright and database right 2026; Contains Royal Mail data © Royal Mail copyright and Database right 2026; Contains National Statistics data © Crown copyright and database right 2026',
  'https://www.ordnancesurvey.co.uk/products/code-point-open', now(),
  'Code-Point Open is suitable for commercial postcode/location intelligence subject to required attribution. It is not a complete full-address dataset.'
)
on conflict (source_dataset) do update set
  provider = excluded.provider,
  product = excluded.product,
  licence_name = excluded.licence_name,
  licence_reference = excluded.licence_reference,
  notes = excluded.notes,
  licence_category = excluded.licence_category,
  operational_use_allowed = excluded.operational_use_allowed,
  human_input_required = excluded.human_input_required,
  automated_bulk_ingest_allowed = excluded.automated_bulk_ingest_allowed,
  commercial_redistribution_allowed = excluded.commercial_redistribution_allowed,
  subscription_api_allowed = excluded.subscription_api_allowed,
  bulk_export_allowed = excluded.bulk_export_allowed,
  share_alike_required = excluded.share_alike_required,
  attribution_text = excluded.attribution_text,
  terms_reference = excluded.terms_reference,
  rights_reviewed_at = excluded.rights_reviewed_at,
  rights_notes = excluded.rights_notes,
  updated_at = now();

create or replace function public.refresh_address_dataset_registry_count(p_source_dataset text)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count bigint;
begin
  select count(*) into v_count
  from public.master_addresses
  where source_dataset = p_source_dataset;

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
begin
  update public.address_dataset_registry r
  set row_count = (select count(*) from public.master_addresses m where m.source_dataset = r.source_dataset),
      updated_at = now()
  where r.source_dataset in (select distinct source_dataset from new_rows);
  return null;
end;
$$;

create or replace function public.sync_address_registry_after_delete()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.address_dataset_registry r
  set row_count = (select count(*) from public.master_addresses m where m.source_dataset = r.source_dataset),
      updated_at = now()
  where r.source_dataset in (select distinct source_dataset from old_rows);
  return null;
end;
$$;

create or replace function public.sync_address_registry_after_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.address_dataset_registry r
  set row_count = (select count(*) from public.master_addresses m where m.source_dataset = r.source_dataset),
      updated_at = now()
  where r.source_dataset in (
    select source_dataset from new_rows
    union
    select source_dataset from old_rows
  );
  return null;
end;
$$;

revoke all on function public.sync_address_registry_after_insert() from public, anon, authenticated;
revoke all on function public.sync_address_registry_after_delete() from public, anon, authenticated;
revoke all on function public.sync_address_registry_after_update() from public, anon, authenticated;
grant execute on function public.sync_address_registry_after_insert() to service_role;
grant execute on function public.sync_address_registry_after_delete() to service_role;
grant execute on function public.sync_address_registry_after_update() to service_role;

drop trigger if exists master_addresses_registry_count_insert on public.master_addresses;
create trigger master_addresses_registry_count_insert
after insert on public.master_addresses
referencing new table as new_rows
for each statement execute function public.sync_address_registry_after_insert();

drop trigger if exists master_addresses_registry_count_delete on public.master_addresses;
create trigger master_addresses_registry_count_delete
after delete on public.master_addresses
referencing old table as old_rows
for each statement execute function public.sync_address_registry_after_delete();

drop trigger if exists master_addresses_registry_count_update on public.master_addresses;
create trigger master_addresses_registry_count_update
after update on public.master_addresses
referencing old table as old_rows new table as new_rows
for each statement execute function public.sync_address_registry_after_update();

update public.address_dataset_registry r
set row_count = counts.row_count,
    updated_at = now()
from (
  select source_dataset, count(*)::bigint as row_count
  from public.master_addresses
  group by source_dataset
) counts
where r.source_dataset = counts.source_dataset;

update public.address_dataset_registry r
set row_count = 0,
    updated_at = now()
where not exists (
  select 1 from public.master_addresses m where m.source_dataset = r.source_dataset
);

create or replace view public.address_dataset_health
with (security_invoker = true)
as
select
  r.*,
  coalesce(c.actual_row_count, 0)::bigint as actual_row_count,
  (r.row_count = coalesce(c.actual_row_count, 0)) as count_in_sync
from public.address_dataset_registry r
left join (
  select source_dataset, count(*)::bigint as actual_row_count
  from public.master_addresses
  group by source_dataset
) c using (source_dataset);

revoke all on public.address_dataset_health from anon, authenticated;
grant select on public.address_dataset_health to service_role;

create or replace view public.address_distribution_eligible
with (security_invoker = true)
as
select
  m.*,
  r.licence_category,
  r.licence_name,
  r.licence_reference,
  r.attribution_text,
  r.share_alike_required
from public.master_addresses m
join public.address_dataset_registry r using (source_dataset)
where m.active = true
  and r.active = true
  and r.commercial_redistribution_allowed = true
  and r.subscription_api_allowed = true;

revoke all on public.address_distribution_eligible from anon, authenticated;
grant select on public.address_distribution_eligible to service_role;

create table if not exists public.address_api_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'paused' check (status in ('active','paused','closed')),
  plan_code text not null default 'sandbox',
  monthly_request_limit bigint not null default 0 check (monthly_request_limit >= 0),
  allowed_products text[] not null default '{}'::text[],
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.address_api_keys (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.address_api_clients(id) on delete cascade,
  key_prefix text not null,
  key_hash text not null unique,
  label text,
  active boolean not null default true,
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists address_api_keys_client_idx on public.address_api_keys (client_id, active);
create index if not exists address_api_keys_prefix_idx on public.address_api_keys (key_prefix);

create table if not exists public.address_api_usage_daily (
  client_id uuid not null references public.address_api_clients(id) on delete cascade,
  usage_date date not null default current_date,
  request_count bigint not null default 0 check (request_count >= 0),
  matched_rows bigint not null default 0 check (matched_rows >= 0),
  bytes_served bigint not null default 0 check (bytes_served >= 0),
  updated_at timestamptz not null default now(),
  primary key (client_id, usage_date)
);

alter table public.address_api_clients enable row level security;
alter table public.address_api_keys enable row level security;
alter table public.address_api_usage_daily enable row level security;
revoke all on public.address_api_clients from anon, authenticated;
revoke all on public.address_api_keys from anon, authenticated;
revoke all on public.address_api_usage_daily from anon, authenticated;
grant all on public.address_api_clients to service_role;
grant all on public.address_api_keys to service_role;
grant all on public.address_api_usage_daily to service_role;

create or replace function public.consume_address_api_request(
  p_client_id uuid,
  p_matched_rows bigint default 0,
  p_bytes_served bigint default 0
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_limit bigint;
  v_used bigint;
  v_today_count bigint;
begin
  select monthly_request_limit into v_limit
  from public.address_api_clients
  where id = p_client_id and status = 'active'
  for update;

  if not found then
    raise exception 'address_api_client_inactive';
  end if;

  if v_limit <= 0 then
    raise exception 'address_api_quota_not_configured';
  end if;

  select coalesce(sum(request_count), 0) into v_used
  from public.address_api_usage_daily
  where client_id = p_client_id
    and usage_date >= date_trunc('month', current_date)::date
    and usage_date < (date_trunc('month', current_date) + interval '1 month')::date;

  if v_used >= v_limit then
    raise exception 'address_api_monthly_quota_exceeded';
  end if;

  insert into public.address_api_usage_daily (client_id, usage_date, request_count, matched_rows, bytes_served, updated_at)
  values (p_client_id, current_date, 1, greatest(0, p_matched_rows), greatest(0, p_bytes_served), now())
  on conflict (client_id, usage_date) do update set
    request_count = public.address_api_usage_daily.request_count + 1,
    matched_rows = public.address_api_usage_daily.matched_rows + excluded.matched_rows,
    bytes_served = public.address_api_usage_daily.bytes_served + excluded.bytes_served,
    updated_at = now()
  returning request_count into v_today_count;

  return v_today_count;
end;
$$;

revoke all on function public.consume_address_api_request(uuid,bigint,bigint) from public, anon, authenticated;
grant execute on function public.consume_address_api_request(uuid,bigint,bigint) to service_role;
