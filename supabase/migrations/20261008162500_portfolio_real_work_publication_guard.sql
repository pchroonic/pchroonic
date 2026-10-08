alter table public.portfolio_jobs
  add column if not exists source_booking_id uuid references public.bookings(id) on delete set null,
  add column if not exists publication_consent_at timestamptz,
  add column if not exists publication_consent_by uuid references public.profiles(id) on delete set null,
  add column if not exists published_at timestamptz;

create unique index if not exists portfolio_jobs_source_booking_uidx
  on public.portfolio_jobs(source_booking_id)
  where source_booking_id is not null;

alter table public.portfolio_jobs
  drop constraint if exists portfolio_jobs_publish_integrity_chk;

alter table public.portfolio_jobs
  add constraint portfolio_jobs_publish_integrity_chk
  check (
    published = false
    or (
      source_booking_id is not null
      and publication_consent_at is not null
      and publication_consent_by is not null
      and jsonb_typeof(image_urls) = 'array'
      and jsonb_array_length(image_urls) > 0
    )
  );
