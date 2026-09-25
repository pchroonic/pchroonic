alter table public.business_expenses
  add column if not exists original_currency text,
  add column if not exists original_amount numeric,
  add column if not exists original_vat_amount numeric,
  add column if not exists fx_rate numeric,
  add column if not exists fx_rate_date date,
  add column if not exists fx_provider text,
  add column if not exists fx_reference_gbp numeric,
  add column if not exists fx_method text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conrelid='public.business_expenses'::regclass and conname='business_expenses_original_currency_check'
  ) then
    alter table public.business_expenses add constraint business_expenses_original_currency_check
      check (original_currency is null or original_currency ~ '^[A-Z]{3}$');
  end if;
  if not exists (
    select 1 from pg_constraint where conrelid='public.business_expenses'::regclass and conname='business_expenses_original_amount_check'
  ) then
    alter table public.business_expenses add constraint business_expenses_original_amount_check
      check (original_amount is null or original_amount >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conrelid='public.business_expenses'::regclass and conname='business_expenses_original_vat_amount_check'
  ) then
    alter table public.business_expenses add constraint business_expenses_original_vat_amount_check
      check (original_vat_amount is null or original_vat_amount >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conrelid='public.business_expenses'::regclass and conname='business_expenses_fx_rate_check'
  ) then
    alter table public.business_expenses add constraint business_expenses_fx_rate_check
      check (fx_rate is null or fx_rate > 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conrelid='public.business_expenses'::regclass and conname='business_expenses_fx_reference_gbp_check'
  ) then
    alter table public.business_expenses add constraint business_expenses_fx_reference_gbp_check
      check (fx_reference_gbp is null or fx_reference_gbp >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conrelid='public.business_expenses'::regclass and conname='business_expenses_fx_method_check'
  ) then
    alter table public.business_expenses add constraint business_expenses_fx_method_check
      check (fx_method is null or fx_method = any(array['auto_reference'::text,'actual_override'::text,'manual'::text]));
  end if;
end $$;
