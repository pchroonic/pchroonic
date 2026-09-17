import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('post-job API is customer-authenticated and only works on completed owned bookings',()=>{
  const source=read('api/customer-post-job.js');
  assert.match(source,/requireCustomer\(req\)/);
  assert.match(source,/customer_id=eq\.\$\{encodeURIComponent\(userId\)\}/);
  assert.match(source,/work_status==='completed'\|\|booking\.status==='completed'/);
  assert.match(source,/Post-job actions are available after the job is completed/);
});

test('private feedback and honest public review actions reuse the established feedback system',()=>{
  const source=read('api/customer-post-job.js');
  assert.match(source,/ensureBookingFeedbackInvite/);
  assert.match(source,/publicReviewUrl/);
  assert.match(source,/feedback_link/);
  assert.match(source,/public_review_click/);
  assert.match(source,/public_review_clicked_at/);
  assert.doesNotMatch(source,/rating\s*[><=]+\s*[45][\s\S]{0,120}publicReviewUrl/);
});

test('customer repeat quote reuses safe job inputs but recalculates price and coverage through the normal quote API',()=>{
  const ui=read('account-post-job.js'),jobs=read('api/customer-jobs.js');
  assert.match(ui,/Request a fresh/);
  assert.match(ui,/recalculate current coverage and pricing/);
  assert.match(ui,/api\('\/api\/quote'/);
  assert.match(ui,/serviceKey:job\.serviceKey/);
  assert.match(jobs,/rebookTemplate/);
  assert.match(jobs,/recurringWeeks/);
  assert.doesNotMatch(jobs,/rebookTemplate:[^\n]*notes/);
  assert.doesNotMatch(ui,/\/api\/booking|create-checkout/);
});

test('completed booking cards surface feedback review repeat booking and next-clean guidance',()=>{
  const ui=read('account-post-job.js'),loader=read('account.js');
  assert.match(ui,/Job complete ✓/);
  assert.match(ui,/Book again/);
  assert.match(ui,/Private feedback/);
  assert.match(ui,/Leave an honest Google review/);
  assert.match(ui,/nothing is booked automatically/);
  assert.match(loader,/6\.4\.42-post-job-experience-1/);
  assert.match(loader,/account-post-job\.js/);
  assert.match(loader,/account-post-job\.css/);
});
