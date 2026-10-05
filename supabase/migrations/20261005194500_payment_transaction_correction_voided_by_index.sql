-- Cover the payment_records.voided_by foreign key introduced by the transaction-correction audit fields.
create index if not exists payment_records_voided_by_idx
  on public.payment_records (voided_by)
  where voided_by is not null;
