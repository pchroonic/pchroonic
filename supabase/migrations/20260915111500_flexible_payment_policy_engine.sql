alter table public.bookings
  add column if not exists payment_policy_revision integer,
  add column if not exists payment_policy_locked_at timestamptz,
  add column if not exists payment_policy_snapshot jsonb,
  add column if not exists deposit_required numeric;

alter table public.invoices
  add column if not exists payment_policy_revision integer,
  add column if not exists payment_policy_snapshot jsonb,
  add column if not exists deposit_required numeric,
  add column if not exists balance_due_hours integer,
  add column if not exists overdue_booking_hold_days integer,
  add column if not exists overdue_final_review_days integer;

comment on column public.bookings.payment_policy_snapshot is 'Non-secret snapshot of the payment/deposit and overdue rules shown for this booking, so later Admin changes do not rewrite the customer agreement.';
comment on column public.bookings.deposit_required is 'Initial deposit amount required by the payment policy recorded for this booking. Zero/null does not itself mean the whole invoice is paid.';
comment on column public.invoices.payment_policy_snapshot is 'Copy of the booking payment-policy snapshot used to preserve invoice due/overdue behaviour.';
comment on column public.invoices.overdue_booking_hold_days is 'Days overdue after which another appointment may be paused under the recorded policy. No automatic consumer monetary penalty is created by this field.';

update public.legal_documents
set
  content_html = case
    when content_html not ilike '%Payment due dates and overdue balances%'
      then content_html || $append$
<h2>Payment due dates and overdue balances</h2>
<p>Where Namdar requires a deposit or other payment for a booking, the amount and timing are shown before the customer commits to that payment. Namdar may use different deposit levels for different job values. The payment rule recorded for a booking is kept with that booking, so a later change to Namdar’s payment settings does not silently increase an earlier customer’s agreed deposit.</p>
<p>The remaining balance is due at the time shown for the booking or invoice. If a consumer balance becomes overdue, Namdar may send payment reminders and may pause new appointment requests until a materially overdue balance is resolved. Under this policy Namdar does <strong>not</strong> automatically add a consumer late-payment penalty, compounding fee or interest merely because time has passed. Any additional amount would only be applied where it is lawful, fair, transparent and properly due.</p>
<p>Business-to-business late-payment rights are separate. Statutory commercial interest or recovery costs may apply to qualifying business debts, but Namdar treats those as a separate commercial-debt process and does not automatically apply them to consumer bookings.</p>
$append$
    else content_html
  end,
  version = case
    when content_html not ilike '%Payment due dates and overdue balances%'
      then greatest(version + 1, 3)
    else version
  end,
  updated_at = now()
where slug = 'terms' and published = true;
