-- Preserve payment/refund history while allowing administrators to correct manual entry mistakes.
-- Voided rows remain auditable but must not affect invoice balances, customer billing or finance reports.

alter table public.payment_records
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid,
  add column if not exists void_reason text;

do $$
begin
  alter table public.payment_records
    add constraint payment_records_voided_by_fkey
    foreign key (voided_by) references public.profiles(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.payment_records
    add constraint payment_records_void_reason_check
    check (
      voided_at is null
      or (
        voided_by is not null
        and nullif(btrim(void_reason), '') is not null
        and char_length(void_reason) <= 500
      )
    );
exception
  when duplicate_object then null;
end $$;

create index if not exists payment_records_active_invoice_paid_idx
  on public.payment_records (invoice_id, paid_at desc)
  where voided_at is null;

comment on column public.payment_records.voided_at is
  'Timestamp when a manually-entered transaction was corrected/voided. Voided rows remain in the audit trail but do not affect balances.';
comment on column public.payment_records.voided_by is
  'Administrator profile that voided/corrected the manual transaction.';
comment on column public.payment_records.void_reason is
  'Administrator-supplied reason for correcting the manual transaction.';
