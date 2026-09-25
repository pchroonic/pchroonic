alter table public.business_expenses
drop constraint if exists business_expenses_source_check;

alter table public.business_expenses
add constraint business_expenses_source_check
check (
  source = any (
    array[
      'manual'::text,
      'import'::text,
      'job_cost_sync'::text,
      'receipt'::text
    ]
  )
);
