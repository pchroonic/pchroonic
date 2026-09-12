create unique index if not exists address_harvest_one_running_per_day_idx
  on public.address_harvest_runs (run_date)
  where status = 'running';
