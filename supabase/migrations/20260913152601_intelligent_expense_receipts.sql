create table if not exists public.business_expense_receipts (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references public.business_expenses(id) on delete set null,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  file_size bigint not null default 0 check (file_size >= 0),
  sha256 text,
  ocr_text text,
  extracted_data jsonb not null default '{}'::jsonb,
  extraction_confidence numeric(5,4),
  extraction_method text not null default 'browser_ocr_v1',
  status text not null default 'uploading' check (status in ('uploading','review','attached','error','rejected')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_expense_receipts_expense_idx on public.business_expense_receipts(expense_id);
create index if not exists business_expense_receipts_sha_idx on public.business_expense_receipts(sha256) where sha256 is not null;
create index if not exists business_expense_receipts_created_by_idx on public.business_expense_receipts(created_by, created_at desc);
alter table public.business_expense_receipts enable row level security;

create table if not exists public.business_expense_merchant_rules (
  id uuid primary key default gen_random_uuid(),
  merchant_key text not null unique,
  merchant_name text,
  category text not null,
  tax_treatment text not null default 'allowable',
  business_use_percent numeric(5,2) not null default 100 check (business_use_percent between 0 and 100),
  payment_method text,
  use_count integer not null default 1 check (use_count >= 0),
  last_used_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_expense_merchant_rules_updated_idx on public.business_expense_merchant_rules(updated_at desc);
alter table public.business_expense_merchant_rules enable row level security;

create or replace function private.can_manage_finance_receipts()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(auth.jwt()->>'aal','') = 'aal2'
    and exists (
      select 1
      from public.profiles p
      left join public.staff_access s on s.user_id = p.id
      where p.id = auth.uid()
        and p.role in ('admin','staff')
        and coalesce(p.account_status,'active') = 'active'
        and (
          p.role = 'admin'
          or (coalesce(s.active,false) = true and coalesce(s.permissions->>'settings','false') = 'true')
        )
    );
$$;

revoke all on function private.can_manage_finance_receipts() from public;
grant execute on function private.can_manage_finance_receipts() to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('finance-receipts','finance-receipts',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']::text[])
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Finance staff read receipts" on storage.objects;
create policy "Finance staff read receipts" on storage.objects for select to authenticated
using (bucket_id='finance-receipts' and private.can_manage_finance_receipts());

drop policy if exists "Finance staff upload receipts" on storage.objects;
create policy "Finance staff upload receipts" on storage.objects for insert to authenticated
with check (bucket_id='finance-receipts' and private.can_manage_finance_receipts() and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "Finance staff update receipts" on storage.objects;
create policy "Finance staff update receipts" on storage.objects for update to authenticated
using (bucket_id='finance-receipts' and private.can_manage_finance_receipts() and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='finance-receipts' and private.can_manage_finance_receipts() and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "Finance staff delete receipts" on storage.objects;
create policy "Finance staff delete receipts" on storage.objects for delete to authenticated
using (bucket_id='finance-receipts' and private.can_manage_finance_receipts() and (storage.foldername(name))[1]=auth.uid()::text);
