import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('homepage journey checks coverage first and keeps optional extras out of the main path',()=>{
  const source=read('booking-journey.js'),conversion=read('conversion.js');
  assert.match(conversion,/booking-journey\.js/);
  assert.match(conversion,/6\.4\.32-booking-journey-1/);
  assert.match(source,/Check your postcode/);
  assert.match(source,/ensureCoverage\(\)/);
  assert.match(source,/postcode\.dataset\.covered==='false'/);
  assert.match(source,/booking-journey-extras/);
  assert.match(source,/Save my guide estimate/);
});

test('selected quote address is retained without requiring a signed-in address-detail request',()=>{
  const source=read('booking-journey.js');
  assert.match(source,/installAddressChoice/);
  assert.match(source,/selectedQuoteAddress=\{id,displayAddress\}/);
  assert.match(source,/\[Requested address\]/);
  assert.doesNotMatch(source,/\/api\/address-get/);
});

test('guest quote claiming requires an authenticated customer and exact matching email',()=>{
  const api=read('api/customer-quote-claim.js');
  assert.match(api,/requireCustomer\(req\)/);
  assert.match(api,/quote\.customer_id===user\.id/);
  assert.match(api,/if\(quote\.customer_id\)return json\(res,409/);
  assert.match(api,/accountEmail!==quoteEmail/);
  assert.match(api,/customer_id:is\.null|customer_id=is\.null/);
  assert.doesNotMatch(api,/email_confirm/);
});

test('My Namdar continues a guest quote after sign-in and shows quote-to-booking progress',()=>{
  const loader=read('account.js'),source=read('account-booking-journey.js');
  assert.match(loader,/6\.4\.35-payment-policy-engine-1/);
  assert.match(loader,/account-booking-journey\.js/);
  assert.match(source,/customer-quote-claim/);
  assert.match(source,/onAuthStateChange/);
  assert.match(source,/same email used for the estimate/);
  assert.match(source,/Request','Final quote','Decision','Appointment/);
  assert.match(source,/requestedAddress/);
  assert.match(source,/Requested address/);
});

test('base booking journey does not bypass final-quote acceptance and payment controls remain layered separately',()=>{
  const home=read('booking-journey.js'),account=read('account-booking-journey.js'),claim=read('api/customer-quote-claim.js'),loader=read('account.js');
  assert.doesNotMatch(home,/stripeEnabled\s*=\s*true/);
  assert.doesNotMatch(account,/create-checkout|payment_policy|stripe/i);
  assert.doesNotMatch(claim,/final_price|customer_response\s*=/);
  assert.match(account,/accepted final price stays unchanged unless the job scope changes/);
  assert.match(loader,/account-payments\.js/);
  assert.match(loader,/account-booking-policy\.js/);
});


test('accepted quote appointment uses a calendar and time buttons without changing the booking submit contract',()=>{
  const html=read('account.html'),source=read('account-booking-journey.js'),css=read('booking-journey.css'),base=read('account-original.js');
  assert.match(html,/account-booking-journey\.js\?v=6\.4\.91-booking-calendar-1/);
  assert.match(html,/id="quoteScheduleSlot"/);
  assert.match(source,/6\.4\.91-booking-calendar-1/);
  assert.match(source,/id='quoteSlotPicker'|picker\.id='quoteSlotPicker'/);
  assert.match(source,/data-schedule-day/);
  assert.match(source,/data-schedule-slot/);
  assert.match(source,/Europe\/London/);
  assert.match(source,/select\.value=slot\.dataset\.scheduleSlot/);
  assert.match(css,/\.booking-slot-picker\{/);
  assert.match(css,/\.booking-calendar-grid\{/);
  assert.match(css,/\.booking-time-slot\.selected/);
  assert.match(css,/@media\(max-width:760px\)\{\.booking-slot-picker\{grid-template-columns:1fr\}/);
  assert.match(base,/const raw=\$\('#quoteScheduleSlot'\)\.value/);
});
