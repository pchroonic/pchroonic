alter table public.page_views
  add column if not exists session_id text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conrelid='public.page_views'::regclass and conname='page_views_session_id_check'
  ) then
    alter table public.page_views add constraint page_views_session_id_check
      check (session_id is null or char_length(session_id) between 8 and 96);
  end if;
  if not exists (
    select 1 from pg_constraint where conrelid='public.page_views'::regclass and conname='page_views_utm_source_check'
  ) then
    alter table public.page_views add constraint page_views_utm_source_check
      check (utm_source is null or char_length(utm_source) <= 100);
  end if;
  if not exists (
    select 1 from pg_constraint where conrelid='public.page_views'::regclass and conname='page_views_utm_medium_check'
  ) then
    alter table public.page_views add constraint page_views_utm_medium_check
      check (utm_medium is null or char_length(utm_medium) <= 100);
  end if;
  if not exists (
    select 1 from pg_constraint where conrelid='public.page_views'::regclass and conname='page_views_utm_campaign_check'
  ) then
    alter table public.page_views add constraint page_views_utm_campaign_check
      check (utm_campaign is null or char_length(utm_campaign) <= 160);
  end if;
end $$;

alter table public.conversion_events drop constraint if exists conversion_events_event_type_check;
alter table public.conversion_events add constraint conversion_events_event_type_check
  check (event_type in (
    'service_viewed','quote_started','postcode_checked','quote_submitted','quote_continue',
    'quote_accepted','quote_declined','booking_started','booking_submitted','checkout_started',
    'payment_confirmed','phone_clicked','email_clicked','support_clicked'
  ));

alter table public.conversion_events
  add column if not exists path text,
  add column if not exists quote_id uuid references public.quotes(id) on delete set null,
  add column if not exists booking_id uuid references public.bookings(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conrelid='public.conversion_events'::regclass and conname='conversion_events_path_check'
  ) then
    alter table public.conversion_events add constraint conversion_events_path_check
      check (path is null or char_length(path) <= 300);
  end if;
end $$;

create index if not exists page_views_session_created_idx
  on public.page_views(session_id,created_at desc) where session_id is not null;
create index if not exists page_views_utm_created_idx
  on public.page_views(utm_source,utm_medium,utm_campaign,created_at desc);
create index if not exists conversion_events_visitor_created_idx
  on public.conversion_events(visitor_id,created_at desc);
create index if not exists conversion_events_type_created_idx
  on public.conversion_events(event_type,created_at desc);
create index if not exists conversion_events_quote_idx
  on public.conversion_events(quote_id) where quote_id is not null;
create index if not exists conversion_events_booking_idx
  on public.conversion_events(booking_id) where booking_id is not null;
