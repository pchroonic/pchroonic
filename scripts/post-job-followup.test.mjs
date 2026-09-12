import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('staff completion close-out records Window direct costs only after completion',()=>{
  const api=read('api/staff-job-action.js');
  const jobs=read('api/staff-jobs.js');
  const ui=read('staff-closeout.js');
  assert.match(api,/action==='economics'/);
  assert.match(api,/Complete the job before saving its direct-cost review/);
  assert.match(api,/quote\.service_key!=='windows'/);
  assert.match(api,/booking_job_costs\?on_conflict=booking_id/);
  assert.match(api,/action:'booking\.economics'/);
  assert.match(jobs,/booking_job_costs\?booking_id=in\./);
  assert.match(jobs,/economics:c\?/);
  assert.match(ui,/This feeds Stage 1 direct-contribution reporting; it is not net profit/);
  assert.match(ui,/Save direct-cost review/);
});

test('post-job follow-up asks every completed customer for honest feedback and review',()=>{
  const follow=read('lib/post-job-followup.js');
  assert.match(follow,/notification_type=eq\.follow_up/);
  assert.match(follow,/ensureBookingFeedbackInvite/);
  assert.match(follow,/publicReviewUrl/);
  assert.match(follow,/Leave an honest Google review/);
  assert.match(follow,/positive, neutral or negative/);
  assert.match(follow,/does not offer rewards for reviews/);
});

test('feedback API no longer gates public reviews behind a positive private rating',()=>{
  const api=read('api/feedback.js');
  const ui=read('feedback.js');
  assert.doesNotMatch(api,/row\.status!=='positive'/);
  assert.doesNotMatch(api,/status==='positive'\?await publicReviewUrl/);
  assert.match(api,/if\(b\.action==='public_review_click'\)\{\s*const url=await publicReviewUrl/);
  assert.match(api,/const reviewUrl=await publicReviewUrl\(\)/);
  assert.match(ui,/Leave an honest Google review/);
  assert.match(ui,/positive, neutral or negative/);
});

test('review settings are staff protected, Google-only and auditable',()=>{
  const api=read('api/admin-review-settings.js');
  const admin=read('admin-post-job-followup.js');
  assert.match(api,/requireStaff\(req,'bookings'\)/);
  assert.match(api,/requireStaff\(req,'settings'\)/);
  assert.match(api,/googleHost/);
  assert.match(api,/reviews\.settings_update/);
  assert.match(admin,/shown equally to completed customers/);
  assert.match(admin,/official review-request link from your Google Business Profile/);
});

test('notification cron processes post-job follow-ups first with bounded batches',()=>{
  const api=read('api/booking-notifications.js');
  const post=api.indexOf('processPostJobFollowUps(10)');
  const generic=api.indexOf('processDueBookingNotifications(10)');
  assert.ok(post>=0&&generic>post);
  assert.match(api,/processBusinessFollowUps\(10\)/);
});

test('new modules are loaded by staff and admin entrypoints',()=>{
  assert.match(read('staff.js'),/staff-closeout\.js/);
  assert.match(read('admin.js'),/admin-post-job-followup\.js/);
});
