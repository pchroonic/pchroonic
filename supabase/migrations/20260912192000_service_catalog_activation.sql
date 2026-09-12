create table if not exists public.service_catalog (
  service_key text primary key,
  name text not null,
  short_name text not null,
  slug text not null unique,
  status text not null default 'planned' check (status in ('planned','coming_soon','live','paused','retired')),
  stage_number integer not null check (stage_number >= 1),
  display_order integer not null default 100,
  description text not null default '',
  live_since timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (service_key ~ '^[a-z0-9][a-z0-9_-]{1,39}$'),
  check (slug ~ '^[a-z0-9][a-z0-9-]{1,79}$')
);

alter table public.service_catalog enable row level security;
revoke all on public.service_catalog from anon, authenticated;
grant all on public.service_catalog to service_role;

insert into public.service_catalog (
  service_key,name,short_name,slug,status,stage_number,display_order,description,live_since
)
values
  ('windows','Window Cleaning','Windows','window-cleaning','live',1,10,'Exterior window, frame and sill cleaning for homes and commercial properties.',now()),
  ('gutters','Gutter Cleaning','Gutters','gutter-cleaning','planned',2,20,'Gutter clearing and cleaning, ready to launch when Namdar reaches the next service stage.',null),
  ('jetwash','Patio & Jet Washing','Jet wash','jet-washing','planned',3,30,'Patio, paving, driveway and exterior surface cleaning for a future Namdar stage.',null),
  ('roof','Roof Cleaning','Roof','roof-cleaning','planned',4,40,'Roof and moss cleaning subject to safe access, planned for a later Namdar stage.',null),
  ('handyman','Handyman Services','Handyman','handyman','planned',5,50,'Small repairs, fitting and practical property maintenance for a future Namdar stage.',null),
  ('tour3d','3D Property Tours','3D tour','3d-property-tours','planned',6,60,'Immersive property walkthroughs for a later Namdar service stage.',null)
on conflict (service_key) do update set
  name=excluded.name,
  short_name=excluded.short_name,
  slug=excluded.slug,
  stage_number=excluded.stage_number,
  display_order=excluded.display_order,
  description=excluded.description,
  updated_at=now();

create index if not exists service_catalog_status_order_idx
  on public.service_catalog (status, display_order);
