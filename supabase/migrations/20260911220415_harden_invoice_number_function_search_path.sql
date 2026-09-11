-- Lock the trigger function search path to prevent object-shadowing attacks.
alter function public.namdar_set_invoice_number()
  set search_path = pg_catalog, public;
