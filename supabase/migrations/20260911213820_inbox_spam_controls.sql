-- Applied to namdar-production as migration 20260911213820 inbox_spam_controls.
alter table public.support_inbox_threads
  drop constraint if exists support_inbox_threads_status_valid;

alter table public.support_inbox_threads
  add constraint support_inbox_threads_status_valid
  check (status = any (array['awaiting_staff'::text,'awaiting_customer'::text,'closed'::text,'spam'::text]));

alter table public.support_inbox_threads
  add column if not exists spam_reason text,
  add column if not exists spam_score integer not null default 0,
  add column if not exists spam_source text;

alter table public.support_inbox_threads
  drop constraint if exists support_inbox_threads_spam_score_valid,
  drop constraint if exists support_inbox_threads_spam_source_valid;

alter table public.support_inbox_threads
  add constraint support_inbox_threads_spam_score_valid check (spam_score between 0 and 100),
  add constraint support_inbox_threads_spam_source_valid check (
    spam_source is null or spam_source = any (
      array['manual'::text,'automatic'::text,'blocked_sender'::text,'blocked_domain'::text]
    )
  );

create table if not exists public.support_inbox_blocklist (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  value text not null,
  reason text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_inbox_blocklist_scope_valid check (scope = any (array['sender'::text,'domain'::text])),
  constraint support_inbox_blocklist_value_nonempty check (length(btrim(value)) > 0),
  constraint support_inbox_blocklist_scope_value_unique unique (scope,value)
);

alter table public.support_inbox_blocklist enable row level security;
revoke all on table public.support_inbox_blocklist from anon, authenticated;
grant select, insert, update, delete on table public.support_inbox_blocklist to service_role;

create index if not exists support_inbox_blocklist_active_lookup_idx
  on public.support_inbox_blocklist (scope,value)
  where active;

create index if not exists support_inbox_threads_spam_status_idx
  on public.support_inbox_threads (status,last_message_at desc);
