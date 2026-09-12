#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {
  OS_PRODUCTS,parseCsvLine,codePointRecord,headerMap,openUprnRecord,
  inServiceArea,productVersion
}=require('../lib/os-open-data');

function args(argv){
  const out={write:false,completeScope:false,activateSource:false,allowLargeImport:false,maxRows:0,scope:'active-service-areas'};
  for(const item of argv){
    if(item==='--write')out.write=true;
    else if(item==='--complete-scope')out.completeScope=true;
    else if(item==='--activate-source')out.activateSource=true;
    else if(item==='--allow-large-import')out.allowLargeImport=true;
    else if(item.startsWith('--')){const [key,...rest]=item.slice(2).split('=');out[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=rest.join('=');}
  }
  out.maxRows=Math.max(0,Math.round(Number(out.maxRows)||0));
  return out;
}
function fail(message){console.error(message);process.exit(1);}
function findCsv(input){
  const stat=fs.statSync(input);
  if(stat.isFile())return input.toLowerCase().endsWith('.csv')?[input]:[];
  const files=[];
  for(const name of fs.readdirSync(input)){
    const full=path.join(input,name),s=fs.statSync(full);
    if(s.isDirectory())files.push(...findCsv(full));
    else if(name.toLowerCase().endsWith('.csv'))files.push(full);
  }
  return files.sort();
}
function supabase(){
  const url=String(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,'');
  const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'');
  if(!url||!key)throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --write.');
  return{url,key};
}
async function rest(apiPath,{method='GET',body,prefer}={}){
  const {url,key}=supabase();
  const headers={apikey:key,Authorization:`Bearer ${key}`};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(prefer)headers.Prefer=prefer;
  const r=await fetch(`${url}/rest/v1/${apiPath}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const text=await r.text();let data=null;
  if(text){try{data=JSON.parse(text)}catch{data=text}}
  if(!r.ok)throw new Error(data?.message||data?.error||`Supabase request failed (${r.status})`);
  return data;
}
async function discoverVersion(product){
  const r=await fetch(`https://api.os.uk/downloads/v1/products/${encodeURIComponent(product.productId)}`);
  if(!r.ok)throw new Error(`OS product metadata request failed (${r.status})`);
  const data=await r.json();
  const version=productVersion(data);
  if(!version)throw new Error(`OS product ${product.productId} did not return a version.`);
  return{version,metadata:data};
}
async function sourcePolicy(dataset){
  return (await rest(`address_dataset_registry?source_dataset=eq.${encodeURIComponent(dataset)}&select=source_dataset,record_store,active,automated_bulk_ingest_allowed,commercial_redistribution_allowed,subscription_api_allowed&limit=1`))?.[0]||null;
}
async function activeServiceAreas(){
  return await rest('service_areas?active=eq.true&select=id,label,admin_area_codes,geojson,latitude,longitude,radius_km,priority&order=priority.desc');
}
function explicitDistrictCodes(raw=''){
  return new Set(String(raw||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean));
}
function geojsonAreas(file){
  if(!file)return[];
  const geojson=JSON.parse(fs.readFileSync(file,'utf8'));
  return[{label:path.basename(file),geojson}];
}
async function createRun(product,version,scope,filterDefinition,metadata){
  const rows=await rest('open_data_import_runs',{method:'POST',prefer:'return=representation',body:{
    source_dataset:product.dataset,upstream_product_id:product.productId,upstream_version:version,
    upstream_url:product.downloadUrl,coverage_scope:scope,filter_definition:filterDefinition,
    status:'running',metadata
  }});
  if(!rows?.[0]?.id)throw new Error('Unable to create open-data import run.');
  return rows[0];
}
async function updateRun(id,patch){
  await rest(`open_data_import_runs?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=minimal',body:patch});
}
async function upsert(table,conflict,rows){
  if(!rows.length)return;
  await rest(`${table}?on_conflict=${encodeURIComponent(conflict)}`,{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:rows});
}
async function finalizeRun(id,completeScope,activateSource){
  return await rest('rpc/finalize_open_data_import',{method:'POST',body:{p_run_id:id,p_complete_scope:completeScope,p_activate_source:activateSource}});
}
async function readLines(file,onLine,{header=false}={}){
  const input=fs.createReadStream(file,{encoding:'utf8'});
  const rl=readline.createInterface({input,crlfDelay:Infinity});
  let first=true,headers=null;
  for await(const raw of rl){
    const line=String(raw||'').replace(/^\uFEFF/,'');
    if(!line.trim())continue;
    if(first&&header){headers=headerMap(line);first=false;continue;}
    first=false;
    const stop=await onLine(line,headers);
    if(stop){rl.close();input.destroy();break;}
  }
}

async function main(){
  const opt=args(process.argv.slice(2));
  const dataset=String(opt.dataset||'').toLowerCase();
  if(!['codepoint','uprn'].includes(dataset))fail('Use --dataset=codepoint or --dataset=uprn.');
  if(!opt.input)fail('Provide --input=/path/to/extracted/csv-or-directory.');
  if(!fs.existsSync(opt.input))fail(`Input not found: ${opt.input}`);
  if(opt.completeScope&&opt.maxRows>0)fail('--complete-scope cannot be used with --max-rows.');
  if(opt.activateSource&&!opt.completeScope)fail('--activate-source requires --complete-scope so a partial sample cannot be presented as a complete source.');
  if(String(opt.scope).toUpperCase()==='GB'&&opt.write&&!opt.allowLargeImport){
    fail('National OS OpenData writes are blocked by default. Add --allow-large-import only after database capacity has been deliberately upgraded or moved to a dedicated data store.');
  }

  const product=OS_PRODUCTS[dataset];
  const files=findCsv(opt.input);
  if(!files.length)fail('No CSV files were found in the supplied input.');

  let metadata={},version=String(opt.version||'').trim();
  if(!version){const discovered=await discoverVersion(product);version=discovered.version;metadata={osProduct:discovered.metadata};}

  let areas=[],districtCodes=explicitDistrictCodes(opt.districtCodes);
  if(String(opt.scope).toUpperCase()!=='GB'){
    if(opt.write){
      areas=await activeServiceAreas();
      for(const area of areas||[])for(const code of area.admin_area_codes||[])districtCodes.add(String(code).toUpperCase());
    }else if(dataset==='uprn'&&opt.geojson){areas=geojsonAreas(opt.geojson);}
    if(dataset==='codepoint'&&!districtCodes.size)fail('Service-area Code-Point dry-runs need --district-codes=...; --write can read live service areas.');
    if(dataset==='uprn'&&!areas.length)fail('Service-area UPRN dry-runs need --geojson=...; --write can read live service areas.');
  }

  let run=null;
  if(opt.write){
    const policy=await sourcePolicy(product.dataset);
    if(!policy?.source_dataset)fail(`Dataset rights record missing for ${product.dataset}.`);
    if(policy.automated_bulk_ingest_allowed!==true)fail(`Automated ingestion is blocked by source rights for ${product.dataset}.`);
    const expectedStore=dataset==='codepoint'?'postcode_points':'property_entities';
    if(policy.record_store!==expectedStore)fail(`Dataset record_store must be ${expectedStore}, found ${policy.record_store||'missing'}.`);
    run=await createRun(product,version,String(opt.scope),{
      districtCodes:[...districtCodes],serviceAreaLabels:(areas||[]).map(a=>a.label).filter(Boolean),maxRows:opt.maxRows||null
    },{inputFiles:files.map(file=>path.basename(file)),dryRun:false});
  }

  const batch=[],batchSize=500;
  let rowsRead=0,rowsSelected=0,rowsUpserted=0,stop=false;
  const table=dataset==='codepoint'?'postcode_points':'property_entities';
  const conflict=dataset==='codepoint'?'postcode':'uprn';
  const scope=String(opt.scope||'active-service-areas');
  const flush=async()=>{
    if(!batch.length)return;
    if(opt.write)await upsert(table,conflict,batch);
    rowsUpserted+=batch.length;
    batch.length=0;
  };
  try{
    for(const file of files){
      await readLines(file,async(line,headers)=>{
        rowsRead++;
        let row=null;
        if(dataset==='codepoint'){
          row=codePointRecord(parseCsvLine(line),{datasetVersion:version,coverageScope:scope,importRunId:run?.id||null});
          if(!row)return false;
          if(scope.toUpperCase()!=='GB'&&!districtCodes.has(String(row.admin_district_code||'').toUpperCase()))return false;
        }else{
          row=openUprnRecord(parseCsvLine(line),headers,{datasetVersion:version,coverageScope:scope,importRunId:run?.id||null});
          if(!row)return false;
          if(scope.toUpperCase()!=='GB'&&!inServiceArea(row.latitude,row.longitude,areas))return false;
        }
        rowsSelected++;
        batch.push(row);
        if(batch.length>=batchSize)await flush();
        if(opt.maxRows>0&&rowsSelected>=opt.maxRows){stop=true;return true;}
        return false;
      },{header:dataset==='uprn'});
      if(stop)break;
    }
    await flush();
    if(opt.write){
      await updateRun(run.id,{rows_read:rowsRead,rows_selected:rowsSelected,rows_upserted:rowsUpserted,metadata:{...run.metadata,inputFileCount:files.length}});
      const result=await finalizeRun(run.id,opt.completeScope,opt.activateSource);
      console.log(JSON.stringify({ok:true,write:true,dataset:product.dataset,version,scope,rowsRead,rowsSelected,rowsUpserted,finalize:result},null,2));
    }else{
      console.log(JSON.stringify({ok:true,write:false,dataset:product.dataset,version,scope,rowsRead,rowsSelected,rowsPrepared:rowsUpserted,maxRows:opt.maxRows||null,files:files.length},null,2));
    }
  }catch(error){
    if(opt.write&&run?.id){await updateRun(run.id,{status:rowsUpserted?'partial':'failed',rows_read:rowsRead,rows_selected:rowsSelected,rows_upserted:rowsUpserted,error_text:String(error.message||error).slice(0,1000),finished_at:new Date().toISOString()}).catch(()=>{});}
    throw error;
  }
}

main().catch(error=>{console.error(`OS OpenData import failed: ${error.message||error}`);process.exit(1);});
