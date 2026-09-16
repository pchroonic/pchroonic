-- Staff operations v3: private field quality, incidents, and customer ETA.

alter table public.bookings
  add column if not exists on_my_way_eta_minutes integer,
  add column if not exists estimated_arrival_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_on_my_way_eta_minutes_valid'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_on_my_way_eta_minutes_valid
      check (on_my_way_eta_minutes is null or on_my_way_eta_minutes between 5 and 120);
  end if;
end $$;

create table if not exists public.booking_field_quality (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  checklist_version text not null default 'windows_v1',
  checklist jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_field_incidents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reported_by uuid references auth.users(id) on delete set null,
  incident_type text not null,
  severity text not null default 'attention',
  summary text not null,
  details text,
  evidence_paths text[] not null default '{}'::text[],
  status text not null default 'open',
  resolution_note text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_field_incidents_type_valid check (incident_type in ('no_access','safety','weather','equipment','damage','complaint','extra_work','other')),
  constraint booking_field_incidents_severity_valid check (severity in ('info','attention','urgent')),
  constraint booking_field_incidents_status_valid check (status in ('open','resolved')),
  constraint booking_field_incidents_summary_length check (char_length(summary) between 3 and 180),
  constraint booking_field_incidents_details_length check (details is null or char_length(details) <= 2000),
  constraint booking_field_incidents_evidence_limit check (coalesce(array_length(evidence_paths,1),0) <= 10)
);

create index if not exists booking_field_incidents_booking_created_idx
  on public.booking_field_incidents (booking_id, created_at desc);
create index if not exists booking_field_incidents_open_idx
  on public.booking_field_incidents (status, created_at desc)
  where status = 'open';

alter table public.booking_field_quality enable row level security;
alter table public.booking_field_incidents enable row level security;

revoke all on table public.booking_field_quality from anon, authenticated;
revoke all on table public.booking_field_incidents from anon, authenticated;
grant select, insert, update, delete on table public.booking_field_quality to service_role;
grant select, insert, update, delete on table public.booking_field_incidents to service_role;

comment on table public.booking_field_quality is 'Server-only field quality checklist for assigned Namdar jobs.';
comment on table public.booking_field_incidents is 'Server-only field incident reports linked to Namdar bookings.';
