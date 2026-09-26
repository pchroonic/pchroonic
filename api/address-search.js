const { json, authUser, db, safeError, queryParam, env } = require('../lib/server');
const { consumeRateLimit } = require('../lib/security');
const { autocompletePostcode, DATASET: GETADDRESS_DATASET } = require('../lib/address-harvest');
const { datasetPolicy } = require('../lib/address-policy');

function cleanPostcode(value=''){const raw=String(value).trim().toUpperCase().replace(/\s+/g,'');return raw.length>3?`${raw.slice(0,-3)} ${raw.slice(-3)}`:raw}
function label(a){return [a.address_line1,a.address_line2,a.city,a.postcode].filter(Boolean).join(', ')}
function normLabel(v=''){return String(v).toLowerCase().replace(/\s+/g,' ').replace(/\s*,\s*/g,',').trim()}
function today(){return new Date().toISOString().slice(0,10)}
function uniqueParts(parts){const seen=new Set();return parts.filter(v=>{v=String(v||'').trim();if(!v)return false;const k=v.toLowerCase();if(seen.has(k))return false;seen.add(k);return true})}
function qlString(value=''){return String(value).replace(/\\/g,'\\\\').replace(/"/g,'\\"')}
async function postcodeLocation(postcode){
  const rows=await db(`postcode_directory?postcode=eq.${encodeURIComponent(postcode)}&select=city,district,region,latitude,longitude&limit=1`).catch(()=>[]);
  return rows?.[0]||{};
}
function osmRecord(el,postcode,loc){
  const t=el?.tags||{};
  const sub=String(t['addr:unit']||t['addr:flats']||'').trim();
  const building=String(t['addr:housename']||'').trim();
  const number=String(t['addr:housenumber']||'').trim();
  const street=String(t['addr:street']||t['addr:place']||'').trim();
  if(!sub&&!building&&!number)return null;
  if(!street&&!building)return null;
  const locality=String(t['addr:suburb']||t['addr:hamlet']||t['addr:locality']||'').trim();
  const city=String(t['addr:city']||t['addr:town']||loc.city||'London').trim();
  const district=String(t['addr:borough']||t['addr:district']||loc.district||locality||'').trim();
  const region=String(t['addr:state']||loc.region||'London').trim();
  const premise=uniqueParts([sub,building]).join(', ');
  const numberedStreet=uniqueParts([number,street]).join(' ');
  const line1=uniqueParts([premise,numberedStreet||street]).join(', ');
  const line2=locality&&locality.toLowerCase()!==city.toLowerCase()?locality:'';
  const display=uniqueParts([line1,line2,city,postcode]).join(', ');
  if(!line1||!display)return null;
  const latitude=Number(el.lat??el.center?.lat);
  const longitude=Number(el.lon??el.center?.lon);
  return {
    source_dataset:'osm-postcode-cache',source_record_id:`${el.type}/${el.id}`,
    uprn:null,udprn:null,postcode,organisation_name:null,department_name:null,po_box_number:null,
    sub_building_name:sub||null,building_name:building||null,building_number:number||null,
    dependent_thoroughfare:null,thoroughfare:street||null,double_dependent_locality:null,
    dependent_locality:line2||null,post_town:city||null,address_line1:line1,address_line2:line2||null,
    address_line3:null,display_address:display,city:city||null,district:district||null,region:region||null,
    country_code:'GB',latitude:Number.isFinite(latitude)?latitude:null,longitude:Number.isFinite(longitude)?longitude:null,
    property_class:String(t.building||t.amenity||t.shop||'').trim()||null,active:true,dataset_version:today(),
    import_batch:`postcode:${postcode.replace(/\s/g,'')}`,updated_at:new Date().toISOString()
  };
}
async function cacheState(postcode,sourceDataset='osm-postcode-cache'){
  const rows=await db(`address_lookup_cache?postcode=eq.${encodeURIComponent(postcode)}&source_dataset=eq.${encodeURIComponent(sourceDataset)}&select=status,result_count,expires_at,last_error&limit=1`).catch(()=>[]);
  return rows?.[0]||null;
}
async function saveCache(postcode,status,count,lastError='',ttlMs=1000*60*60*24,sourceDataset='osm-postcode-cache'){
  const now=new Date();
  await db('address_lookup_cache?on_conflict=postcode,source_dataset',{method:'POST',prefer:'resolution=merge-duplicates',body:{postcode,source_dataset:sourceDataset,status,result_count:count,checked_at:now.toISOString(),expires_at:new Date(now.getTime()+ttlMs).toISOString(),last_error:lastError||null}}).catch(()=>null);
}
async function lookupGetAddress(postcode){
  const apiKey=env('GETADDRESS_API_KEY','').trim()||env('GETADDRESS_DOMAIN_TOKEN','').trim();
  if(!apiKey)return{attempted:false,available:false,reason:'credential_missing',rows:[]};
  const policy=await datasetPolicy(GETADDRESS_DATASET);
  if(!policy.active||policy.operationalUseAllowed!==true||policy.humanInputRequired!==true){
    return{attempted:false,available:false,reason:'policy_blocked',rows:[]};
  }
  const cached=await cacheState(postcode,GETADDRESS_DATASET);
  if(cached?.expires_at&&new Date(cached.expires_at).getTime()>Date.now()){
    if(cached.status==='ok')return{attempted:false,available:true,reason:'cache_fresh',rows:[]};
    if(cached.status==='error'&&!/^auth:/i.test(String(cached.last_error||'')))return{attempted:false,available:false,reason:'recent_error',rows:[]};
  }
  try{
    const result=await autocompletePostcode(postcode,apiKey);
    const rows=result.rows||[];
    if(rows.length){
      await db('master_addresses?on_conflict=source_dataset,source_record_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:rows});
    }
    await saveCache(postcode,'ok',rows.length,'',rows.length?1000*60*60*24*30:1000*60*60*24,GETADDRESS_DATASET);
    return{attempted:true,available:true,reason:'provider_lookup',rows};
  }catch(error){
    const message=String(error?.message||error).slice(0,240);
    const authFailure=Number(error?.status)===401||/unauthori[sz]ed|invalid.*key|api.?key/i.test(message);
    console.warn('GetAddress customer postcode lookup:',message);
    if(!authFailure)await saveCache(postcode,'error',0,message,1000*60*10,GETADDRESS_DATASET);
    return{attempted:true,available:false,reason:authFailure?'provider_unauthorized':'provider_error',rows:[]};
  }
}
function overpassEndpoints(){
  const configured=env('OVERPASS_API_URL','').trim();
  return [...new Set([configured,'https://overpass.private.coffee/api/interpreter','https://overpass-api.de/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter'].filter(Boolean))];
}
async function overpassRequest(endpoint,query,timeoutMs=6500){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','User-Agent':'NamdarAddressLookup/4.4.1 (+https://namdar.co.uk)'},body:new URLSearchParams({data:query}),signal:controller.signal});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    return await r.json();
  }finally{clearTimeout(timer)}
}
async function fetchOpenStreetMap(postcode){
  const cached=await cacheState(postcode);
  if(cached?.status==='ok'&&cached?.expires_at&&new Date(cached.expires_at).getTime()>Date.now())return [];
  const compact=postcode.replace(/\s/g,'');
  const loc=await postcodeLocation(postcode);
  const lat=Number(loc.latitude),lon=Number(loc.longitude);
  const spatial=Number.isFinite(lat)&&Number.isFinite(lon);
  const selector=(pc)=>spatial?`nwr(around:1200,${lat},${lon})["addr:postcode"="${qlString(pc)}"]`:`nwr["addr:postcode"="${qlString(pc)}"]`;
  const query=`[out:json][timeout:6];(${selector(postcode)};${selector(compact)};);out center tags 250;`;
  let lastError='';
  for(const endpoint of overpassEndpoints()){
    try{
      const data=await overpassRequest(endpoint,query);
      const byLabel=new Map();
      for(const el of data?.elements||[]){const row=osmRecord(el,postcode,loc);if(row&&!byLabel.has(normLabel(row.display_address)))byLabel.set(normLabel(row.display_address),row)}
      const rows=[...byLabel.values()].slice(0,200);
      if(rows.length)await db('master_addresses?on_conflict=source_dataset,source_record_id',{method:'POST',prefer:'resolution=merge-duplicates',body:rows});
      await saveCache(postcode,'ok',rows.length,'',rows.length?1000*60*60*24*30:1000*60*60*24);
      return rows;
    }catch(e){
      lastError=`${endpoint}: ${String(e?.message||e)}`.slice(0,240);
      console.warn('OpenStreetMap address fallback:',lastError);
    }
  }
  await saveCache(postcode,'error',0,lastError,1000*60*10);
  return [];
}
async function masterRows(postcode){
  return db(`master_addresses?postcode=eq.${encodeURIComponent(postcode)}&active=eq.true&select=id,display_address,postcode,sub_building_name,building_name,building_number,dependent_thoroughfare,thoroughfare,source_dataset&order=display_address.asc&limit=200`).catch(()=>[]);
}
module.exports=async function handler(req,res){try{
  if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
  await consumeRateLimit(req,res,{scope:'address.lookup.ip',limit:12,windowSeconds:600,message:'Too many address lookups were made from this connection. Please wait a few minutes and try again.'});
  const postcode=cleanPostcode(queryParam(req,'postcode')||'');
  if(!postcode)return json(res,400,{ok:false,error:'Enter a postcode.'});

  let master=await masterRows(postcode);
  let providerCached=master.some(a=>a.source_dataset===GETADDRESS_DATASET);
  let providerAttempted=false,providerAvailable=providerCached,providerReason=providerCached?'cached':'';
  if(!providerCached){
    const provider=await lookupGetAddress(postcode);
    providerAttempted=provider.attempted;
    providerAvailable=provider.available;
    providerReason=provider.reason||'';
    if(provider.attempted||provider.reason==='cache_fresh')master=await masterRows(postcode);
    providerCached=master.some(a=>a.source_dataset===GETADDRESS_DATASET);
  }

  let openDataAttempted=false;
  if(!providerCached&&!(master||[]).length){
    openDataAttempted=true;
    await fetchOpenStreetMap(postcode);
    master=await masterRows(postcode);
  }

  // Once a full GetAddress postcode set is cached, do not mix partial OSM rows into
  // the customer picker. Other licensed/owned master sources remain eligible.
  const displayMaster=providerCached?(master||[]).filter(a=>a.source_dataset!=='osm-postcode-cache'):(master||[]);
  const addresses=displayMaster.map(a=>({
    id:`master:${a.id}`,address:a.display_address,
    houseUnit:[a.sub_building_name,a.building_name,a.building_number].filter(Boolean).join(', '),
    street:[a.dependent_thoroughfare,a.thoroughfare].filter(Boolean).join(' '),
    source:a.source_dataset==='osm-postcode-cache'?'openstreetmap':a.source_dataset===GETADDRESS_DATASET?'getaddress':'namdar-master',
    dataset:a.source_dataset
  }));

  const approved=await db(`address_directory?postcode=eq.${encodeURIComponent(postcode)}&active=eq.true&verified=eq.true&select=id,postcode,house_unit,street,address_line1,address_line2,city,district,region,country_code,latitude,longitude&order=address_line1.asc&limit=100`).catch(()=>[]);
  for(const a of approved||[]){
    const text=label(a);
    if(!addresses.some(x=>normLabel(x.address)===normLabel(text)))addresses.push({id:`directory:${a.id}`,address:text,houseUnit:a.house_unit||'',street:a.street||'',source:'namdar-directory'});
  }

  const user=await authUser(req);
  if(user?.id){
    const rows=await db(`profiles?id=eq.${encodeURIComponent(user.id)}&postcode=eq.${encodeURIComponent(postcode)}&select=house_unit,street,address_line1,address_line2,city,postcode,latitude,longitude,district,region,country_code&limit=1`);
    const p=rows?.[0];
    if(p?.address_line1){
      const savedLabel=label(p);
      if(!addresses.some(a=>normLabel(a.address)===normLabel(savedLabel)))addresses.unshift({id:'saved-profile',address:savedLabel,houseUnit:p.house_unit||'',street:p.street||'',source:'saved-profile'});
    }
  }
  addresses.sort((a,b)=>a.address.localeCompare(b.address,'en-GB',{numeric:true,sensitivity:'base'}));
  const osmCount=addresses.filter(a=>a.source==='openstreetmap').length;
  const getAddressCount=addresses.filter(a=>a.source==='getaddress').length;
  return json(res,200,{ok:true,enabled:true,mode:providerCached?'getaddress-cache':'namdar-master',postcode,addresses:addresses.slice(0,200),count:Math.min(addresses.length,200),manualEntryAllowed:true,masterCount:(master||[]).length,getAddressCount,providerCached,providerAttempted,providerAvailable,providerReason,openDataAttempted,openStreetMapCount:osmCount,attribution:osmCount?'© OpenStreetMap contributors, ODbL':''});
}catch(e){return safeError(res,e)}};
