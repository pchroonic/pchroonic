alter table public.newsletter_subscribers
  add column if not exists preferences jsonb not null default '{"offers":true,"tips":true,"news":true}'::jsonb,
  add column if not exists confirmation_sent_at timestamptz,
  add column if not exists preferences_updated_at timestamptz;

alter table public.newsletter_campaigns
  add column if not exists preheader text,
  add column if not exists body_text text,
  add column if not exists cta_label text,
  add column if not exists cta_url text,
  add column if not exists audience_topic text not null default 'all',
  add column if not exists recipient_count integer not null default 0,
  add column if not exists failed_count integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

alter table public.newsletter_campaigns drop constraint if exists newsletter_campaigns_status_check;
alter table public.newsletter_campaigns add constraint newsletter_campaigns_status_check check (status = any (array['draft'::text,'sending'::text,'sent'::text,'failed'::text]));
alter table public.newsletter_campaigns add constraint newsletter_campaigns_audience_topic_check check (audience_topic = any (array['all'::text,'offers'::text,'tips'::text,'news'::text]));

create table if not exists public.newsletter_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.newsletter_campaigns(id) on delete cascade,
  subscriber_id uuid references public.newsletter_subscribers(id) on delete set null,
  status text not null check (status = any (array['sent'::text,'failed'::text])),
  provider_id text,
  error_message text,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists newsletter_deliveries_campaign_subscriber_idx on public.newsletter_deliveries(campaign_id,subscriber_id) where subscriber_id is not null;
create index if not exists newsletter_deliveries_campaign_status_idx on public.newsletter_deliveries(campaign_id,status);
create index if not exists newsletter_campaigns_status_created_idx on public.newsletter_campaigns(status,created_at desc);

alter table public.newsletter_deliveries enable row level security;

comment on table public.newsletter_deliveries is 'Server-mediated marketing campaign delivery audit. No direct browser policy by design.';
