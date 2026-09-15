-- Namdar staff role management foundation.
-- Keeps profiles.role as the coarse customer/staff/admin security boundary while
-- adding a separate access-role layer for Owner, Administrator and custom roles.

create table if not exists public.staff_roles (
  key text primary key,
  name text not null,
  description text,
  permissions jsonb not null default '{}'::jsonb,
  system_role boolean not null default false,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_roles_key_format check (key ~ '^[a-z][a-z0-9_-]{1,49}$'),
  constraint staff_roles_permissions_object check (jsonb_typeof(permissions) = 'object')
);

create unique index if not exists staff_roles_name_lower_uq
  on public.staff_roles (lower(name));

alter table public.staff_roles enable row level security;
revoke all on table public.staff_roles from anon, authenticated;

alter table public.staff_access
  add column if not exists role_key text;

create index if not exists staff_access_role_key_idx
  on public.staff_access(role_key);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'staff_access_role_key_fkey'
      and conrelid = 'public.staff_access'::regclass
  ) then
    alter table public.staff_access
      add constraint staff_access_role_key_fkey
      foreign key (role_key)
      references public.staff_roles(key)
      on update cascade
      on delete restrict;
  end if;
end $$;

insert into public.staff_roles(key,name,description,permissions,system_role,active)
values
  (
    'owner',
    'Owner',
    'Highest Namdar access. Owners can manage administrators, staff and custom access roles.',
    '{"quotes":true,"bookings":true,"payments":true,"tickets":true,"inbox":true,"pricing":true,"content":true,"customers":true,"staff":true,"loyalty":true,"newsletter":true,"analytics":true,"settings":true,"legal":true,"chat":true}'::jsonb,
    true,
    true
  ),
  (
    'administrator',
    'Administrator',
    'Full operational Admin access. Owner-only controls such as creating roles and managing Owners remain protected.',
    '{"quotes":true,"bookings":true,"payments":true,"tickets":true,"inbox":true,"pricing":true,"content":true,"customers":true,"staff":true,"loyalty":true,"newsletter":true,"analytics":true,"settings":true,"legal":true,"chat":true}'::jsonb,
    true,
    true
  )
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  permissions = excluded.permissions,
  system_role = true,
  active = true,
  updated_at = now();

-- Every existing coarse Admin gets an Administrator access-role record if it
-- does not already have one. This preserves all current access.
insert into public.staff_access(user_id,permissions,job_title,active,created_by,role_key)
select
  p.id,
  '{"quotes":true,"bookings":true,"payments":true,"tickets":true,"inbox":true,"pricing":true,"content":true,"customers":true,"staff":true,"loyalty":true,"newsletter":true,"analytics":true,"settings":true,"legal":true,"chat":true}'::jsonb,
  'Administrator',
  true,
  p.id,
  'administrator'
from public.profiles p
where p.role = 'admin'
on conflict (user_id) do update set
  role_key = coalesce(public.staff_access.role_key, excluded.role_key),
  updated_at = now();

-- If there is exactly one active Admin when this migration is first applied,
-- that unambiguous existing account becomes the initial Owner. No generated
-- user id is hard-coded into the migration.
do $$
declare
  initial_owner uuid;
begin
  if (
    select count(*)
    from public.profiles
    where role = 'admin'
      and coalesce(account_status, 'active') = 'active'
  ) = 1 then
    select id into initial_owner
    from public.profiles
    where role = 'admin'
      and coalesce(account_status, 'active') = 'active'
    limit 1;

    update public.staff_access
    set role_key = 'owner',
        updated_at = now()
    where user_id = initial_owner;
  end if;
end $$;
