alter table public.bookings
  add column if not exists terms_version integer,
  add column if not exists booking_policy_version text,
  add column if not exists booking_policy_accepted_at timestamptz,
  add column if not exists early_service_requested_at timestamptz,
  add column if not exists early_service_acknowledged boolean not null default false,
  add column if not exists cancellation_window_hours integer,
  add column if not exists booking_policy_snapshot jsonb;

comment on column public.bookings.booking_policy_accepted_at is 'When the customer explicitly accepted the booking/cancellation policy for this appointment request.';
comment on column public.bookings.early_service_requested_at is 'When the customer expressly requested service on the agreed date even if it falls within an applicable statutory cancellation period.';
comment on column public.bookings.booking_policy_snapshot is 'Non-PII snapshot of the booking/cancellation policy presented at appointment request time.';

insert into public.legal_documents (slug,title,content_html,version,published,updated_at)
values (
  'terms',
  'Terms & Conditions',
  $terms$
<h2>About these terms</h2>
<p>These terms apply to consumer property-service quotes and bookings made with Namdar. Namdar is the trading name used by this UK sole-trader property-services business. Nothing in these terms removes or limits rights that consumers have under UK law.</p>

<h2>Guide estimates and final quotes</h2>
<p>Any instant or guide price shown before review is an estimate only. Namdar may review the property, access, photographs and job details before issuing a final quote. The final quote sets the agreed price for the stated scope unless the customer later asks for, or the parties agree to, a material change in the work.</p>

<h2>Accepting a quote and requesting an appointment</h2>
<p>Accepting a final quote does not by itself reserve an appointment. After accepting the final quote, the customer chooses an available appointment window and submits a booking request. Unless Namdar and the customer expressly agree otherwise, the service booking is confirmed only when Namdar confirms that appointment.</p>
<p>Before submitting an appointment request, the customer is shown the cancellation and deposit policy and is asked to accept these terms. Namdar records the applicable terms/policy version and acceptance time with the booking.</p>

<h2>Prices, deposits and payment</h2>
<p>Where Namdar requires a booking deposit, the amount and any option to pay in full will be shown before payment. A deposit reserves an appointment and is not a card surcharge. Online card payments, when enabled, are handled through a secure payment provider and Namdar does not store full card details.</p>
<p>A deposit is not automatically forfeited in every cancellation circumstance. Any amount Namdar retains following a customer cancellation must be fair and proportionate to the reasonable direct loss caused by that cancellation, taking account of costs saved and whether the appointment can reasonably be filled by another customer.</p>

<h2>Customer cancellation and the 48-hour policy</h2>
<ul>
<li><strong>More than 48 hours before the appointment:</strong> a booking deposit will normally be refunded, or the customer may ask for it to be transferred to a replacement appointment.</li>
<li><strong>Within 48 hours of the appointment:</strong> Namdar may retain some or all of a deposit only to cover reasonable direct loss caused by the late cancellation. Namdar will take account of costs saved and whether the appointment slot can be filled.</li>
<li><strong>No-show or no agreed access:</strong> if the customer is unavailable or does not provide access that was agreed and the job cannot reasonably proceed, the same reasonable-loss approach may apply.</li>
<li><strong>Rescheduling:</strong> Namdar will normally try to move the appointment rather than cancel it, subject to availability. Repeated or very late changes may be treated as a cancellation where they cause the same reasonable loss.</li>
</ul>
<p>The 48-hour policy does not replace any statutory cancellation right and does not permit Namdar to charge an unfair penalty or recover the same loss twice.</p>

<h2>If Namdar cancels</h2>
<p>If Namdar cancels an appointment and the customer does not agree to a replacement date, payments for the unprovided service, including any booking deposit, will be refunded. This does not affect any additional remedy the customer may have under applicable consumer law.</p>

<h2>14-day statutory cancellation period for online or off-premises service contracts</h2>
<p>Where the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013 apply, a consumer will normally have 14 days from the day after the service contract is entered into to cancel without giving a reason, subject to the statutory rules and exceptions.</p>
<p>If the customer asks Namdar to provide the service during that cancellation period, Namdar records the customer's express request. If the customer then cancels after performance has begun, the law may permit a proportionate charge for service actually supplied up to cancellation. If the service is fully performed within the cancellation period after the customer expressly requested early performance and acknowledged the consequence, the statutory cancellation right may end once the service has been fully performed.</p>
<p>Where a statutory right requires a refund, the 48-hour deposit policy does not override that right.</p>

<h2>How to cancel</h2>
<p>Customers can request cancellation from My Namdar or send a clear cancellation statement to <a href="mailto:support@namdar.co.uk">support@namdar.co.uk</a>. Please include the booking reference, name, service address and enough information for Namdar to identify the booking. An online cancellation request remains visible in My Namdar while Namdar processes it.</p>
<p>For a statutory cooling-off cancellation, a customer may use any clear statement. For example: “I give notice that I cancel my contract for [service], booked on [date], for [name and service address].”</p>

<h2>Access, safety and weather</h2>
<p>The customer must provide safe, lawful and reasonably clear access needed for the agreed service. Namdar may stop, postpone or refuse work where conditions are unsafe, access is materially different from what was agreed, or weather makes the work unsafe or unsuitable. Where Namdar postpones for safety or weather reasons, it will normally offer another appointment and will not treat that postponement as a customer cancellation.</p>

<h2>Changes to the job</h2>
<p>If the actual property, access or requested scope is materially different from the information used for the final quote, Namdar will explain any proposed change before carrying out additional chargeable work. The customer can decline additional work that was not part of the agreed scope.</p>

<h2>Service quality and complaints</h2>
<p>Namdar will provide services with reasonable care and skill. If a customer believes the service has not been carried out as agreed, they should contact <a href="mailto:support@namdar.co.uk">support@namdar.co.uk</a> promptly so Namdar can investigate and, where appropriate, put matters right. Nothing in these terms restricts statutory remedies for services that do not meet legal standards.</p>

<h2>Changes to these terms</h2>
<p>The version accepted for a booking is recorded with that booking. Later updates do not retrospectively change the terms already recorded for an existing booking unless the customer and Namdar agree otherwise or the law requires it.</p>
$terms$,
  2,
  true,
  now()
)
on conflict (slug) do update set
  title=excluded.title,
  content_html=excluded.content_html,
  version=greatest(public.legal_documents.version + 1, excluded.version),
  published=true,
  updated_at=now();
