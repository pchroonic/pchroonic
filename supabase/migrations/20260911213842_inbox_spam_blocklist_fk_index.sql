-- Applied to namdar-production as migration 20260911213842 inbox_spam_blocklist_fk_index.
create index if not exists support_inbox_blocklist_created_by_idx
  on public.support_inbox_blocklist (created_by)
  where created_by is not null;
