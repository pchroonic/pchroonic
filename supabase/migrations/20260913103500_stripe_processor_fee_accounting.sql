-- Capture payment-provider economics separately from customer-visible invoice amounts.
-- These fields are server-side accounting data. Existing payment/invoice behaviour is unchanged.

alter table public.payment_records
  add column if not exists provider_payment_id text,
  add column if not exists provider_balance_transaction text,
  add column if not exists provider_fee numeric(12,2),
  add column if not exists provider_net numeric(12,2),
  add column if not exists provider_fee_currency text;

create index if not exists payment_records_provider_payment_idx
  on public.payment_records (provider_payment_id)
  where provider_payment_id is not null;

comment on column public.payment_records.provider_fee is
  'Actual processor fee reported by the payment provider balance transaction. Internal business cost; never a customer surcharge.';
comment on column public.payment_records.provider_net is
  'Net provider balance impact reported by the payment provider balance transaction.';
comment on column public.payment_records.provider_fee_currency is
  'Lowercase ISO currency for provider_fee/provider_net.';
comment on column public.payment_records.provider_balance_transaction is
  'Payment-provider balance transaction reference used to audit processor fee/net.';
