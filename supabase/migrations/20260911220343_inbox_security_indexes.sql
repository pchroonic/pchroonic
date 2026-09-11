-- Supporting indexes for inbound email security checks.
create index if not exists support_inbox_messages_from_sent_idx
  on public.support_inbox_messages (from_email, sent_at desc)
  where direction = 'inbound';

create index if not exists support_inbox_messages_message_id_idx
  on public.support_inbox_messages (email_message_id, from_email)
  where direction = 'inbound' and email_message_id is not null;

create index if not exists support_inbox_messages_subject_sent_idx
  on public.support_inbox_messages (subject, sent_at desc)
  where direction = 'inbound';
