import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {SERVICE_DEFINITIONS,mergeCatalog,isLive,isPubliclyVisible,unavailableMessage}=require('../lib/service-catalog.js');

test('safe fallback exposes only window cleaning as live',()=>{
  const services=mergeCatalog([]),live=services.filter(isLive);
  assert.equal(live.length,1);
  assert.equal(live[0].service_key,'windows');
  for(const service of services.filter(s=>s.service_key!=='windows'))assert.equal(service.status,'planned');
});

test('database rows override staged status without losing service definitions',()=>{
  const services=mergeCatalog([{service_key:'gutters',status:'coming_soon',name:'Gutter Cleaning',slug:'gutter-cleaning',stage_number:2,display_order:20}]);
  assert.equal(services.length,SERVICE_DEFINITIONS.length);
  const gutters=services.find(s=>s.service_key==='gutters');
  assert.equal(gutters.status,'coming_soon');
  assert.equal(isLive(gutters),false);
  assert.equal(isPubliclyVisible(gutters),true);
  assert.match(unavailableMessage(gutters),/coming soon/i);
});

test('service catalog migration seeds windows live and later stages planned',()=>{
  const sql=fs.readFileSync(new URL('../supabase/migrations/20260912192000_service_catalog_activation.sql',import.meta.url),'utf8');
  assert.match(sql,/create table if not exists public\.service_catalog/i);
  assert.match(sql,/\('windows','Window Cleaning','Windows','window-cleaning','live',1/);
  for(const key of ['gutters','jetwash','roof','handyman','tour3d'])assert.match(sql,new RegExp(`\\('${key}'[^\\n]+,'planned'`));
  assert.match(sql,/enable row level security/i);
  assert.match(sql,/revoke all on public\.service_catalog from anon, authenticated/i);
});

test('new quote, postcode and subscription entrypoints gate on live catalog status',()=>{
  for(const file of ['../api/quote.js','../api/postcode.js','../api/subscription.js']){
    const source=fs.readFileSync(new URL(file,import.meta.url),'utf8');
    assert.match(source,/serviceByKey/);
    assert.match(source,/isLive/);
    assert.match(source,/unavailableMessage/);
  }
  assert.ok(fs.existsSync(new URL('../api/quote-core.js',import.meta.url)));
  assert.ok(fs.existsSync(new URL('../api/postcode-core.js',import.meta.url)));
  assert.ok(fs.existsSync(new URL('../api/subscription-core.js',import.meta.url)));
});

test('public data hides dormant pricing and normalises service-area service keys to live services',()=>{
  const source=fs.readFileSync(new URL('../api/public-data.js',import.meta.url),'utf8');
  assert.match(source,/liveKeys/);
  assert.match(source,/pricing:\(pricing\|\|\[\]\)\.filter\(p=>liveKeys\.has\(p\.service_key\)\)/);
  assert.match(source,/configured\.length\?configured\.filter\(k=>liveKeys\.has\(k\)\):\[\.\.\.liveKeys\]/);
});

test('sitemap includes only live service slugs',()=>{
  const source=fs.readFileSync(new URL('../api/sitemap.js',import.meta.url),'utf8');
  assert.match(source,/services\.filter\(s=>s\.status==='live'\)/);
  assert.match(source,/path:`\/services\/\$\{s\.slug\}`/);
  assert.equal(source.includes('/services/gutter-cleaning'),false,'future service must not be hard-coded into sitemap');
});

test('admin launch API requires pricing and active coverage before live',()=>{
  const source=fs.readFileSync(new URL('../api/admin-services.js',import.meta.url),'utf8');
  assert.match(source,/requireStaff\(req,'settings'\)/);
  assert.match(source,/status==='live'&&!checks\.pricingConfigured/);
  assert.match(source,/status==='live'&&!checks\.coverageConfigured/);
  assert.match(source,/auditLog/);
});

test('homepage and customer portal fail safe to window cleaning only',()=>{
  const home=fs.readFileSync(new URL('../conversion.js',import.meta.url),'utf8');
  assert.match(home,/key==='windows'\?'live':'planned'/);
  assert.match(home,/radio\.disabled=!isLive/);
  const account=fs.readFileSync(new URL('../account-service-availability.js',import.meta.url),'utf8');
  assert.match(account,/serviceKey:'windows'/);
  assert.match(account,/list\.filter\(s=>s\.status==='live'\)/);
});

test('planned direct service pages are noindex and redirected to live window quote actions',()=>{
  const source=fs.readFileSync(new URL('../seo-page.js',import.meta.url),'utf8');
  assert.match(source,/noindex,follow/);
  assert.match(source,/\?service=windows#quote/);
  assert.match(source,/status==='live'/);
});
