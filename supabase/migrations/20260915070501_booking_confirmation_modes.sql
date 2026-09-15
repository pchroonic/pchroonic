-- Existing quotes stay review-first until staff explicitly clear this flag.
alter table public.quotes add column if not exists booking_requires_review boolean not null default true;

-- Server-only reservation. Never accept status, price or policy from a browser.
create or replace function public.reserve_customer_booking(
  p_quote_id uuid, p_customer_id uuid, p_starts_at timestamptz,
  p_ends_at timestamptz, p_address text
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  q public.quotes%rowtype;
  b public.bookings%rowtype;
  rules jsonb;
  mode text;
  local_start timestamp := p_starts_at at time zone 'Europe/London';
  local_end timestamp := p_ends_at at time zone 'Europe/London';
  day_start timestamptz;
  day_end timestamptz;
  window_key text;
  zone text;
  capacity integer;
begin
  -- Short transaction only; notifications/invoices happen after this returns.
  -- Serialize reservations and hold policy/quote state stable during the decision.
  lock table public.site_settings in share mode;
  lock table public.quotes in share row exclusive mode;
  lock table public.bookings in share row exclusive mode;
  select * into q from public.quotes where id=p_quote_id;
  if not found or p_customer_id is null or q.customer_id is distinct from p_customer_id then
    return jsonb_build_object('ok',false,'error','This quote does not belong to your account.');
  end if;
  if q.customer_response is distinct from 'accepted' or q.final_price is null or q.final_price<0 or q.status not in ('approved','sent') then
    return jsonb_build_object('ok',false,'error','Accept the final quote before booking.');
  end if;
  select * into b from public.bookings where quote_id=q.id and status in ('pending','confirmed','completed') limit 1;
  if found then
    if b.starts_at=p_starts_at and b.ends_at=p_ends_at and b.address=btrim(p_address) then
      return jsonb_build_object('ok',true,'created',false,'booking',to_jsonb(b));
    end if;
    return jsonb_build_object('ok',false,'error','This quote already has a booking.');
  end if;
  select value into rules from public.site_settings where key='booking_operations';
  rules:=coalesce(rules,'{}'::jsonb);
  mode:=coalesce(rules->>'confirmationMode','manual');
  if mode='paused' then
    return jsonb_build_object('ok',false,'error','New bookings are temporarily paused. Please contact Namdar.');
  end if;
  if p_starts_at is null or p_ends_at is null or p_address is null or length(btrim(p_address)) not between 1 and 500
     or local_start::date<>local_end::date or p_starts_at<=now()
     or p_starts_at<now()+make_interval(hours=>greatest(0,least(168,coalesce((rules->>'minimumNoticeHours')::integer,24))))
     or local_start::date>=(now() at time zone 'Europe/London')::date+greatest(7,least(21,coalesce((rules->>'horizonDays')::integer,21))) then
    return jsonb_build_object('ok',false,'error','Choose an available future booking window and service address.');
  end if;
  window_key:=to_char(local_start,'HH24')||'-'||to_char(local_end,'HH24');
  if window_key not in ('08-11','11-14','14-17') or local_start::time<>date_trunc('hour',local_start)::time
    or local_end::time<>date_trunc('hour',local_end)::time
    or not (coalesce(rules->'enabledWindows','["08-11","11-14","14-17"]'::jsonb) ? window_key)
    or not (coalesce(rules->'operatingDays','[1,2,3,4,5,6]'::jsonb) @> jsonb_build_array(extract(dow from local_start)::integer)) then
    return jsonb_build_object('ok',false,'error','That window is outside the current operating schedule.');
  end if;
  day_start:=local_start::date::timestamp at time zone 'Europe/London';
  day_end:=(local_start::date+1)::timestamp at time zone 'Europe/London';
  capacity:=greatest(1,least(12,coalesce((rules->>'maxJobsPerDay')::integer,3)));
  if (select count(*) from public.bookings where starts_at>=day_start and starts_at<day_end and status in ('pending','confirmed'))>=capacity
     or exists(select 1 from public.bookings where starts_at<p_ends_at and ends_at>p_starts_at and status in ('pending','confirmed')) then
    return jsonb_build_object('ok',false,'error','That appointment has just filled. Please choose another slot.');
  end if;
  zone:=substring(upper(btrim(q.postcode)) from '^[A-Z]{1,2}');
  if coalesce((rules->>'routeDensityEnabled')::boolean,true) and zone is not null
     and exists(select 1 from public.bookings existing join public.quotes other on other.id=existing.quote_id
       where existing.starts_at>=day_start and existing.starts_at<day_end and existing.status in ('pending','confirmed')
       and substring(upper(btrim(other.postcode)) from '^[A-Z]{1,2}') is not null)
     and not exists(select 1 from public.bookings existing join public.quotes other on other.id=existing.quote_id
       where existing.starts_at>=day_start and existing.starts_at<day_end and existing.status in ('pending','confirmed')
       and substring(upper(btrim(other.postcode)) from '^[A-Z]{1,2}')=zone) then
    return jsonb_build_object('ok',false,'error','Please choose another day for your postcode area.');
  end if;
  if not exists(select 1 from public.service_catalog where service_key=q.service_key and status='live') then
    return jsonb_build_object('ok',false,'error','This service is not currently open for booking.');
  end if;
  insert into public.bookings(quote_id,customer_id,starts_at,ends_at,address,status,payment_status,promo_code,discount_total)
    values(q.id,p_customer_id,p_starts_at,p_ends_at,btrim(p_address),
      case when mode='automatic' and q.service_key='windows' and not q.booking_requires_review then 'confirmed' else 'pending' end,
      'unpaid',q.promo_code,coalesce(q.promo_discount,0)+coalesce(q.reward_discount,0)) returning * into b;
  return jsonb_build_object('ok',true,'created',true,'booking',to_jsonb(b));
end;
$$;
revoke all on function public.reserve_customer_booking(uuid,uuid,timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.reserve_customer_booking(uuid,uuid,timestamptz,timestamptz,text) to service_role;
