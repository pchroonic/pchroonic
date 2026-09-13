create table if not exists public.system_health_runs (
  id uuid primary key default gen_random_uuid(),
  component text not null,
  status text not null check (status in ('healthy','warning','failing')),
  summary text not null default '',
  source text not null default 'runtime',
  started_at timestamptz,
  finished_at timestamptz not null default now(),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.system_health_runs enable row level security;
create index if not exists system_health_runs_component_finished_idx on public.system_health_runs(component, finished_at desc);
create index if not exists system_health_runs_status_finished_idx on public.system_health_runs(status, finished_at desc);

create table if not exists public.system_health_incidents (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  component text not null,
  severity text not null check (severity in ('warning','failing')),
  status text not null default 'open' check (status in ('open','resolved')),
  title text not null,
  message text not null default '',
  occurrence_count integer not null default 1 check (occurrence_count >= 1),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  latest_run_id uuid references public.system_health_runs(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.system_health_incidents enable row level security;
create unique index if not exists system_health_incidents_open_fingerprint_unique on public.system_health_incidents(fingerprint) where status='open';
create index if not exists system_health_incidents_status_seen_idx on public.system_health_incidents(status, last_seen_at desc);
create index if not exists system_health_incidents_component_seen_idx on public.system_health_incidents(component, last_seen_at desc);
create index if not exists system_health_incidents_latest_run_idx on public.system_health_incidents(latest_run_id);

comment on table public.system_health_runs is 'Server-only operational health run history. No direct browser policies.';
comment on table public.system_health_incidents is 'Server-only incident history created from operational health checks. No direct browser policies.';
