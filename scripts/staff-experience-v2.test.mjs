import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('Staff v2 loader is independently cache-versioned',()=>{
  const loader=read('staff.js');
  assert.match(loader,/6\.4\.40-staff-experience-v2-1/);
  assert.match(loader,/staff-experience-v2\.css/);
  assert.match(loader,/staff-experience-v2\.js/);
  assert.match(loader,/staff-original\.js/);
  assert.match(loader,/staff-mfa-guard\.js/);
});

test('Staff v2 adds a mobile daily command centre without replacing core job actions',()=>{
  const source=read('staff-experience-v2.js');
  assert.match(source,/staffTodayOverview/);
  assert.match(source,/Today progress/);
  assert.match(source,/pickFocusJob/);
  assert.match(source,/data-v2-focus-open/);
  assert.match(source,/staff-v2-card-actions/);
  assert.match(source,/staff-v2-workflow/);
  assert.match(source,/Job brief/);
  assert.match(source,/baseRender=renderJobs/);
  assert.match(source,/baseOpen=openJob/);
  assert.doesNotMatch(source,/\/api\/staff-job-action/);
});

test('Staff v2 background refresh avoids overwriting an open job editor',()=>{
  const source=read('staff-experience-v2.js');
  assert.match(source,/document\.visibilityState!=='visible'/);
  assert.match(source,/!navigator\.onLine/);
  assert.match(source,/\$\('#staffJobDialog'\)\?\.open/);
  assert.match(source,/180000/);
});

test('Staff PWA keeps v2 assets while moving to the v3 cache generation',()=>{
  const sw=read('staff-sw.js');
  assert.match(sw,/namdar-staff-v6\.4\.41-staff-operations-v3-1/);
  assert.match(sw,/staff-experience-v2\.js/);
  assert.match(sw,/staff-experience-v2\.css/);
});

test('Staff v2 CSS contains responsive workflow and touch-friendly quick actions',()=>{
  const css=read('staff-experience-v2.css');
  assert.match(css,/staff-v2-overview/);
  assert.match(css,/staff-v2-progress-ring/);
  assert.match(css,/staff-v2-card-actions/);
  assert.match(css,/staff-v2-workflow/);
  assert.match(css,/env\(safe-area-inset-bottom\)/);
  assert.match(css,/@media\(max-width:700px\)/);
});
