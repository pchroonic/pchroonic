create index if not exists postcode_points_import_run_idx
  on public.postcode_points (import_run_id)
  where import_run_id is not null;

create index if not exists property_entities_import_run_idx
  on public.property_entities (import_run_id)
  where import_run_id is not null;

create index if not exists property_field_observations_import_run_idx
  on public.property_field_observations (import_run_id)
  where import_run_id is not null;
