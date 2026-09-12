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
