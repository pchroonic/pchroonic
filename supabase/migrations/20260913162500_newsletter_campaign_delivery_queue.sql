create table if not exists public.newsletter_campaign_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.newsletter_campaigns(id) on delete cascade,
  subscriber_id uuid references public.newsletter_subscribers(id) on delete set null,
  status text not null default 'queued' check (status in ('queued','sent','failed','skipped')),
  provider_id text,
  failure_code text,
  attempted_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, subscriber_id)
);

create index if not exists newsletter_campaign_deliveries_campaign_status_idx
  on public.newsletter_campaign_deliveries(campaign_id, status, created_at);
create index if not exists newsletter_campaign_deliveries_subscriber_idx
  on public.newsletter_campaign_deliveries(subscriber_id);

alter table public.newsletter_campaign_deliveries enable row level security;
