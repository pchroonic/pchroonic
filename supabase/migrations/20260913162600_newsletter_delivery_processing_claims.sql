alter table public.newsletter_campaign_deliveries
  drop constraint if exists newsletter_campaign_deliveries_status_check;

alter table public.newsletter_campaign_deliveries
  add constraint newsletter_campaign_deliveries_status_check
  check (status in ('queued','processing','sent','failed','skipped'));
