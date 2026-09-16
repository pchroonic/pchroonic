import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

const migration='supabase/migrations/20260916103000_staff_field_quality_and_incidents.sql';

test('Staff v3 keeps field quality and incidents server-only',()=>{
  const sql=read(migration);
  assert.match(sql,/booking_field_quality/);
  assert.match(sql,/booking_field_incidents/);
  assert.match(sql,/enable row level security/i);
  assert.match(sql,/revoke all on table public\.booking_field_quality from anon, authenticated/i);
  assert.match(sql,/revoke all on table public\.booking_field_incidents from anon, authenticated/i);
  assert.match(sql,/on_my_way_eta_minutes/);
  assert.match(sql,/estimated_arrival_at/);
});

test('Staff mutations remain assignment-protected and completion is checklist-gated',()=>{
  const source=read('api/staff-job-action.js');
  assert.match(source,/assignedBooking\(user\.id,id\)/);
  assert.match(source,/action==='checklist'/);
  assert.match(source,/missingWindowChecklist/);
  assert.match(source,/Complete the field quality checklist first/);
  assert.match(source,/action==='incident'/);
  assert.match(source,/createStaffNotification/);
  assert.match(source,/action==='incident_photo'/);
  assert.match(source,/safeIncidentPhotoPath/);
  assert.match(source,/on_my_way_eta_minutes/);
  assert.match(source,/estimated_arrival_at/);
  assert.match(source,/sendBookingNotificationNow/);
});

test('Staff jobs API returns private quality/incident summaries and ETA',()=>{
  const source=read('api/staff-jobs.js');
  assert.match(source,/booking_field_quality/);
  assert.match(source,/booking_field_incidents/);
  assert.match(source,/onMyWayEtaMinutes/);
  assert.match(source,/estimatedArrivalAt/);
  assert.match(source,/evidenceCount/);
});

test('Staff v3 field UI adds checklist incidents evidence and ETA workflow',()=>{
  const source=read('staff-operations-v3.js'),css=read('staff-operations-v3.css');
  assert.match(source,/Window-cleaning checklist/);
  assert.match(source,/staff-ops-quality/);
  assert.match(source,/Report a problem/);
  assert.match(source,/staff-ops-incidents/);
  assert.match(source,/incident_photo/);
  assert.match(source,/staffEtaMinutes/);
  assert.match(source,/customerNotification/);
  assert.match(source,/baseOpen=openJob/);
  assert.match(source,/baseRender=renderJobs/);
  assert.match(source,/baseRun=runAction/);
  assert.match(source,/missingQuality/);
  assert.match(css,/staff-ops-section/);
  assert.match(css,/staff-ops-incident/);
  assert.match(css,/staff-ops-eta-live/);
  assert.match(css,/@media\(max-width:700px\)/);
});

test('Admin can review and resolve field incidents without exposing them publicly',()=>{
  const api=read('api/admin-booking-incidents.js'),ui=read('admin-field-incidents.js'),loader=read('admin.js');
  assert.match(api,/requireStaff\(req,'bookings'\)/);
  assert.match(api,/booking_field_incidents/);
  assert.match(api,/action==='resolve'/);
  assert.match(api,/auditLog/);
  assert.match(ui,/openBookingEditor/);
  assert.match(ui,/\/api\/admin-booking-incidents/);
  assert.match(loader,/admin-field-incidents\.js/);
  assert.match(loader,/admin-field-incidents\.css/);
});

test('Customer job tracking exposes only ETA fields needed for the arrival update',()=>{
  const api=read('api/customer-jobs.js'),ui=read('account-field-eta.js'),loader=read('account.js');
  assert.match(api,/onMyWayEtaMinutes/);
  assert.match(api,/estimatedArrivalAt/);
  assert.doesNotMatch(api,/booking_field_incidents/);
  assert.doesNotMatch(api,/booking_field_quality/);
  assert.match(ui,/customer-live-banner/);
  assert.match(ui,/Expected around/);
  assert.match(loader,/account-field-eta\.js/);
});

test('Staff v3 assets have their own loader and PWA cache generation',()=>{
  const loader=read('staff.js'),html=read('staff.html'),sw=read('staff-sw.js');
  assert.match(loader,/6\.4\.41-staff-operations-v3-1/);
  assert.match(loader,/staff-operations-v3\.js/);
  assert.match(loader,/staff-operations-v3\.css/);
  assert.match(html,/staff\.js\?v=6\.4\.41-staff-operations-v3-1/);
  assert.match(sw,/namdar-staff-v6\.4\.41-staff-operations-v3-1/);
  assert.match(sw,/staff-operations-v3\.js/);
  assert.match(sw,/staff-operations-v3\.css/);
  assert.match(sw,/AUTH_CRITICAL/);
});
