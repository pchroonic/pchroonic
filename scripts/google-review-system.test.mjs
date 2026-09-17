import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('migration extends existing feedback audit and notification queue without a new public table',()=>{
  const sql=read('supabase/migrations/20260917182721_google_review_tracking.sql');
  assert.match(sql,/public_review_requested_at timestamptz/);
  assert.match(sql,/public_review_reminder_sent_at timestamptz/);
  assert.match(sql,/'review_reminder'::text/);
  assert.doesNotMatch(sql,/create table/i);
});

test('review settings require privileged staff and support pause plus one reminder timing',()=>{
  const api=read('api/admin-review-settings.js');
  assert.match(api,/requireStaff\(req,'bookings'\)/);
  assert.match(api,/requireStaff\(req,'settings'\)/);
  assert.match(api,/review_requests_enabled/);
  assert.match(api,/review_reminders_enabled/);
  assert.match(api,/review_reminder_delay_days/);
  assert.match(api,/Use an official HTTPS Google review link/);
});

test('runtime review URL is Google-only and respects the owner enable switch',()=>{
  const server=read('lib/server.js');
  assert.match(server,/normalizeGoogleReviewUrl/);
  assert.match(server,/review_requests_enabled===false/);
  assert.match(server,/googleHost/);
  assert.match(server,/host\.endsWith\('\.google\.com'\)/);
});

test('initial follow-up uses a tracked review link and records a real request only after send success',()=>{
  const follow=read('lib/post-job-followup.js');
  assert.match(follow,/trackedReviewUrl\(feedback\.token\)/);
  assert.match(follow,/public_review_requested_at=is\.null/);
  assert.match(follow,/if\(sent\?\.ok\)/);
  assert.match(follow,/queueReviewReminder/);
  assert.match(follow,/positive, neutral or negative/);
  assert.match(follow,/does not offer rewards for reviews/);
});

test('tracked review redirect cannot be used as an open redirect',()=>{
  const api=read('api/review-click.js');
  assert.match(api,/const url=await publicReviewUrl\(\)/);
  assert.match(api,/public_review_clicked_at/);
  assert.match(api,/res\.statusCode=302/);
  assert.match(api,/res\.setHeader\('Location',url\)/);
  assert.doesNotMatch(api,/queryParam\(req,'url'/);
});

test('review reminder is one-time, fair and stops after customer interaction',()=>{
  const reminder=read('lib/review-reminders.js');
  assert.match(reminder,/notification_type:'review_reminder'/);
  assert.match(reminder,/feedback\.public_review_clicked_at\|\|feedback\.submitted_at/);
  assert.match(reminder,/This is the only automatic Google-review reminder/);
  assert.match(reminder,/Positive, neutral and negative experiences are all welcome/);
  assert.match(reminder,/does not offer rewards for reviews/);
  assert.match(reminder,/public_review_reminder_sent_at:is\.null|public_review_reminder_sent_at=is\.null/);
});

test('admin review dashboard reports requests clicks feedback reminders and attention without rating gating',()=>{
  const api=read('api/admin-review-dashboard.js');
  const admin=read('admin-post-job-followup.js');
  const loader=read('admin.js');
  assert.match(api,/reviewRequests:requested/);
  assert.match(api,/googleClicks:clicks/);
  assert.match(api,/clickThroughRate/);
  assert.match(api,/averagePrivateRating/);
  assert.match(api,/remindersSent/);
  assert.match(api,/needsAttention/);
  assert.match(admin,/Google reviews & post-job feedback/);
  assert.match(admin,/Customer message preview/);
  assert.match(admin,/Recent completed-job review history/);
  assert.match(loader,/6\.4\.43-google-reviews-1/);
  assert.doesNotMatch(api,/rating\s*[><=]+\s*4/);
});

test('notification cron isolates review reminders from other delivery stages',()=>{
  const api=read('api/booking-notifications.js');
  const post=api.indexOf("runStage('post_job'");
  const reviews=api.indexOf("runStage('review_reminders'");
  const booking=api.indexOf("runStage('booking_delivery'");
  const scan=api.indexOf("runStage('business_scan'");
  assert.ok(post>=0&&reviews>post&&booking>reviews&&scan>booking);
  assert.match(api,/processReviewReminders\(10\)/);
});
