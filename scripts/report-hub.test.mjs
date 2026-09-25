import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');

test('Reporting hub defines focused report workspaces',()=>{
  const src=read('admin-report-hub.js');
  for(const id of ['overview','revenue','quotes','services','staff','feedback','website','window','finance']){
    assert.match(src,new RegExp(`${id}:\\{title:`));
  }
  assert.match(src,/Choose what you want to review/);
  assert.match(src,/report-hub-grid/);
  assert.match(src,/9 reports/);
});

test('Reporting hub gives reports stable URLs and browser navigation',()=>{
  const src=read('admin-report-hub.js');
  assert.match(src,/searchParams\.set\('tab','reports'\)/);
  assert.match(src,/searchParams\.set\('report',id\)/);
  assert.match(src,/searchParams\.delete\('report'\)/);
  assert.match(src,/history\.pushState/);
  assert.match(src,/history\.replaceState/);
  assert.match(src,/addEventListener\('popstate'/);
});

test('existing Reporting content is moved into the intended pages',()=>{
  const src=read('admin-report-hub.js');
  const pairs=[
    ['reportRevenue','overview'],
    ['reportRevenueChart','revenue'],
    ['reportPaymentMethods','revenue'],
    ['reportQuoteFunnel','quotes'],
    ['reportServiceTable','services'],
    ['reportStaffTable','staff'],
    ['reportFeedbackBreakdown','feedback'],
    ['websiteAnalyticsPanel','website'],
    ['windowPerformancePanel','window'],
    ['businessFinancePanel','finance']
  ];
  for(const [element,page] of pairs){
    assert.match(src,new RegExp(`document\\.getElementById\\('${element}'\\)[\\s\\S]{0,100}'${page}'`));
  }
});

test('report pages communicate with the existing live data modules',()=>{
  const hub=read('admin-report-hub.js');
  const analytics=read('admin-page-analytics.js');
  const finance=read('admin-business-finance.js');
  const windowPerf=read('admin-window-performance.js');
  assert.match(hub,/namdar:report-view/);
  assert.match(analytics,/detail\?\.report==='website'/);
  assert.match(finance,/detail\?\.report==='finance'/);
  assert.match(windowPerf,/detail\?\.report==='window'/);
  assert.match(finance,/NamdarReportHub\.current\(\)==='finance'/);
  assert.match(windowPerf,/NamdarReportHub\.current\(\)==='window'/);
});

test('Reporting hub keeps shared controls contextual',()=>{
  const src=read('admin-report-hub.js');
  assert.match(src,/period:false,export:false,refresh:true/);
  assert.match(src,/exportBtn\.hidden=id==='hub'\|\|!meta\.export/);
  assert.match(src,/range\.hidden=id!=='hub'&&!meta\.period/);
  assert.match(src,/reportGenerated/);
});

test('Admin loader pins the Reporting hub release assets',()=>{
  const loader=read('admin.js');
  assert.match(loader,/6\.4\.60-report-hub-1/);
  assert.match(loader,/admin-report-hub\.css/);
  assert.match(loader,/admin-report-hub\.js/);
});
