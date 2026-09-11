create or replace function private.has_staff_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'private'
as $function$
  select coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
    and exists (
      select 1
      from public.profiles p
      left join public.staff_access s on s.user_id = p.id
      where p.id = auth.uid()
        and p.account_status = 'active'
        and (
          p.role = 'admin'
          or (
            p.role = 'staff'
            and coalesce(s.active, false)
            and coalesce((s.permissions ->> permission_key)::boolean, false)
          )
        )
    );
$function$;

drop policy if exists "Staff read own access" on public.staff_access;
create policy "Staff read own access"
on public.staff_access
for select
to authenticated
using (
  auth.uid() = user_id
  and coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
);
