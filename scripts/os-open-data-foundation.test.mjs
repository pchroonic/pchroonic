import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {
  parseCsvLine,cleanPostcode,bngToWgs84,codePointRecord,headerMap,openUprnRecord,
  pointInGeoJson,haversineKm,inServiceArea,OS_PRODUCTS
}=require('../lib/os-open-data');

test('CSV parser handles quoted commas and escaped quotes',()=>{
  assert.deepEqual(parseCsvLine('A,"B,C","D""E",F'),['A','B,C','D"E','F']);
});

test('postcode normalisation matches UK display form',()=>{
  assert.equal(cleanPostcode('so160as'),'SO16 0AS');
  assert.equal(cleanPostcode(' SW2   3HL '),'SW2 3HL');
});

test('Code-Point official example maps the 10 documented fields',()=>{
  const row=codePointRecord('SO16 0AS,10,437292,115542,E92000001,E19000003,E18000006,,E06000045,E05002471',{
    datasetVersion:'test-2026',coverageScope:'pilot'
  });
  assert.equal(row.postcode,'SO16 0AS');
  assert.equal(row.positional_quality_indicator,10);
  assert.equal(row.easting,437292);
  assert.equal(row.northing,115542);
  assert.equal(row.country_code,'E92000001');
  assert.equal(row.nhs_regional_ha_code,'E19000003');
  assert.equal(row.nhs_ha_code,'E18000006');
  assert.equal(row.admin_county_code,null);
  assert.equal(row.admin_district_code,'E06000045');
  assert.equal(row.admin_ward_code,'E05002471');
  assert.equal(row.dataset_version,'test-2026');
  assert.equal(row.coverage_scope,'pilot');
});

test('British National Grid conversion is close to authoritative transform',()=>{
  const {latitude,longitude}=bngToWgs84(437292,115542);
  assert.ok(Math.abs(latitude-50.9381226)<0.00002,`latitude ${latitude}`);
  assert.ok(Math.abs(longitude-(-1.4706364))<0.00002,`longitude ${longitude}`);
});

test('Code-Point PQI 90 does not fabricate WGS84 coordinates',()=>{
  const row=codePointRecord('GY1 1AA,90,0,0,L99999999,,,,,',{datasetVersion:'x'});
  assert.equal(row.latitude,null);
  assert.equal(row.longitude,null);
});

test('Open UPRN parser uses header names rather than fixed column positions',()=>{
  const headers=headerMap('Y_COORDINATE,UPRN,LATITUDE,X_COORDINATE,LONGITUDE');
  const row=openUprnRecord('179000,100023336956,51.5010,530000,-0.1410',headers,{
    datasetVersion:'2026-09',coverageScope:'pilot'
  });
  assert.equal(row.uprn,'100023336956');
  assert.equal(row.source_record_id,'100023336956');
  assert.equal(row.easting,530000);
  assert.equal(row.northing,179000);
  assert.equal(row.latitude,51.501);
  assert.equal(row.longitude,-0.141);
  assert.equal(row.dataset_version,'2026-09');
});

test('Polygon and MultiPolygon filters include valid service points and exclude holes',()=>{
  const polygon={type:'Polygon',coordinates:[
    [[0,0],[10,0],[10,10],[0,10],[0,0]],
    [[4,4],[6,4],[6,6],[4,6],[4,4]]
  ]};
  assert.equal(pointInGeoJson(2,2,polygon),true);
  assert.equal(pointInGeoJson(5,5,polygon),false);
  assert.equal(pointInGeoJson(11,5,polygon),false);
  const multi={type:'MultiPolygon',coordinates:[
    [[[20,20],[22,20],[22,22],[20,22],[20,20]]],
    [[[30,30],[32,30],[32,32],[30,32],[30,30]]]
  ]};
  assert.equal(pointInGeoJson(21,21,multi),true);
  assert.equal(pointInGeoJson(31,31,multi),true);
  assert.equal(pointInGeoJson(25,25,multi),false);
});

test('service-area fallback radius works when polygon is unavailable',()=>{
  const areas=[{latitude:51.5,longitude:-0.1,radius_km:2}];
  assert.equal(inServiceArea(51.501,-0.101,areas),true);
  assert.equal(inServiceArea(51.6,-0.1,areas),false);
  assert.ok(haversineKm(51.5,-0.1,51.501,-0.101)<1);
});

test('OS product identifiers and official download endpoints are explicit',()=>{
  assert.equal(OS_PRODUCTS.uprn.productId,'OpenUPRN');
  assert.match(OS_PRODUCTS.uprn.downloadUrl,/OpenUPRN\/downloads/);
  assert.equal(OS_PRODUCTS.codepoint.productId,'CodePointOpen');
  assert.match(OS_PRODUCTS.codepoint.downloadUrl,/CodePointOpen\/downloads/);
});

test('migration separates postcode/property stores and locks commercial views to service role',()=>{
  const migration=fs.readFileSync(new URL('../supabase/migrations/20260912190000_os_open_property_foundation.sql',import.meta.url),'utf8');
  for(const text of [
    "record_store text not null default 'master_addresses'",
    'create table if not exists public.postcode_points',
    'create table if not exists public.property_entities',
    'create table if not exists public.property_field_observations',
    'create table if not exists public.open_data_import_runs',
    'create or replace view public.postcode_distribution_eligible',
    'create or replace view public.property_distribution_eligible',
    'create or replace function public.finalize_open_data_import',
    'revoke all on public.postcode_points from anon, authenticated',
    'grant all on public.property_entities to service_role'
  ])assert.ok(migration.includes(text),`missing migration guard: ${text}`);
  assert.match(migration,/commercial_redistribution_allowed = true[\s\S]*subscription_api_allowed = true/);
});

test('streaming importer defaults safe and blocks accidental national UPRN write',()=>{
  const importer=fs.readFileSync(new URL('./os-open-data-import.mjs',import.meta.url),'utf8');
  assert.match(importer,/write:false/);
  assert.match(importer,/scope:'active-service-areas'/);
  assert.match(importer,/allowLargeImport:false/);
  assert.match(importer,/National OS Open UPRN writes are blocked by default/);
  assert.match(importer,/automated_bulk_ingest_allowed/);
  assert.match(importer,/record_store/);
  assert.match(importer,/--activate-source requires --complete-scope/);
});
