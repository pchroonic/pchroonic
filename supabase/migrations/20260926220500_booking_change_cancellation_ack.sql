alter table public.booking_change_requests
  add column if not exists cancellation_policy_acknowledged_at timestamptz,
  add column if not exists cancellation_policy_version text;

comment on column public.booking_change_requests.cancellation_policy_acknowledged_at is
  'When the customer explicitly acknowledged the cancellation terms while submitting a cancellation request.';

comment on column public.booking_change_requests.cancellation_policy_version is
  'Cancellation policy version presented when the customer submitted the cancellation request.';
