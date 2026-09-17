alter table public.booking_feedback
  add column if not exists public_review_requested_at timestamptz,
  add column if not exists public_review_reminder_sent_at timestamptz;

create index if not exists booking_feedback_public_review_requested_idx
  on public.booking_feedback (public_review_requested_at desc)
  where public_review_requested_at is not null;

create index if not exists booking_feedback_public_review_reminder_pending_idx
  on public.booking_feedback (public_review_requested_at)
  where public_review_requested_at is not null
    and public_review_clicked_at is null
    and submitted_at is null
    and public_review_reminder_sent_at is null;

alter table public.booking_notifications
  drop constraint if exists booking_notifications_notification_type_check;

alter table public.booking_notifications
  add constraint booking_notifications_notification_type_check
  check (notification_type = any (array[
    'confirmation'::text,
    'booking_update'::text,
    'reminder_24h'::text,
    'on_my_way'::text,
    'completion'::text,
    'follow_up'::text,
    'review_reminder'::text
  ]));
