create index if not exists business_expense_receipts_updated_by_idx
  on public.business_expense_receipts(updated_by);

create index if not exists business_expense_merchant_rules_created_by_idx
  on public.business_expense_merchant_rules(created_by);

create index if not exists business_expense_merchant_rules_updated_by_idx
  on public.business_expense_merchant_rules(updated_by);
