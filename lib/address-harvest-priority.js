const base = require('./address-harvest');
const { db, env } = require('./server');

const MAX_FREE_DISCOVERY_CALLS = 12;
const SERVICE_QUEUE_MULTIPLIER = 6;
const LONDON_TERMS = ['SE','SW','E','N','NW','W','EC','WC','BR','CR','DA','KT','SM','TW','SE1','SE2','SE3','SE4','SE5','SE6','SE7','SE8','SE9','SE10','SE11','SE12','SE13','SE14','SE15','SE16','SE17','SE18','SE19','SE20','SE21','SE22','SE23','SE24','SE25','SE26','SE27','SE28','SW1','SW2','SW3','SW4','SW5','SW6','SW7','SW8','SW9','SW10','SW11','SW12','SW13','SW14','SW15','SW16','SW17','SW18','SW19','SW20'];
const UK_AREAS = ['AB','AL','B','BA','BB','BD','BH','BL','BN','BR','BS','BT','CA','CB','CF','CH','CM','CO','CR','CT','CV','CW','DA','DD','DE','DG','DH','DL','DN','DT','DY','E','EC','EH','EN','EX','FK','FY','G','GL','GU','GY','HA','HD','HG','HP','HR','HS','HU','HX','IG','IM','IP','IV','JE','KA','KT','KW','KY','L','LA','LD','LE','LL','LN','LS','LU','M','ME','MK','ML','N','NE','NG','NN','NP','NR','NW','OL','OX','PA','PE','PH','PL','PO','PR','RG','RH','RM','S','SA','SE','SG','SK','SL','SM','SN','SO','SP','SR','SS','ST','SW','SY','TA','TD','TF','TN','TQ','TR','TS','TW','UB','W','WA','WC','WD','WF','WN','WR','WS','WV','YO','ZE'];

function nowIso(){ return new Date().toISOString(); }
function cleanPostcode(value=''){
  const raw=String(value||'').trim().toUpperCase().replace(/\s+/g,'');
  return raw.length>3?`${raw.slice(0,-3)} ${raw.slice(-3)}`:raw;
}
function isFullPostcode(value=''){ return /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(String(value||'').trim()); }
function outward(value=''){
  const full=cleanPostcode(value).replace(/\s/g,'');
  return full.length>3?full.slice(0,-3):full;
}
function norm(value=''){ return String(value||'').trim().toLowerCase().replace(/\s+/g,' '); }
function postcodeParts(value=''){
  const full=cleanPostcode(value).replace(/\s/g,''),out=full.length>3?full.slice(0,-3):full,sector=full.length>3?out+full.slice(-3,-2):out;
  return {full,outward:out,sector};
}
function cleanRule(value=''){ return String(value||'').trim().toUpperCase().replace(/\s+/g,'').replace(/[^A-Z0-9*]/g,''); }
function matchesRule(postcode,rules=[]){
  const p=postcodeParts(postcode);
  return (Array.isArray(rules)?rules:[]).some(raw=>{
    const rule=cleanRule(raw); if(!rule)return false;
    if(rule.endsWith('*'))return p.full.startsWith(rule.slice(0,-1));
    return rule===p.full||rule===p.sector||rule===p.outward;
  });
}
function distanceKm(a,b,c,d){
  const r=6371,toRad=x=>x*Math.PI/180,dLat=toRad(c-a),dLon=toRad(d-b),q=Math.sin(dLat/2)**2+Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(dLon/2)**2;
  return 2*r*Math.asin(Math.sqrt(q));
}
function geometryOf(value){ if(!value||typeof value!=='object')return null; return value.type==='Feature'?(value.geometry||null):value; }
function pointInRing(lng,lat,ring=[]){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const xi=Number(ring[i]?.[0]),yi=Number(ring[i]?.[1]),xj=Number(ring[j]?.[0]),yj=Number(ring[j]?.[1]);
    if(![xi,yi,xj,yj].every(Number.isFinite))continue;
    const hit=((yi>lat)!==(yj>lat))&&(lng<(xj-xi)*(lat-yi)/((yj-yi)||1e-12)+xi);
    if(hit)inside=!inside;
  }
  return inside;
}
function pointInPolygon(lng,lat,coords=[]){
  if(!coords.length||!pointInRing(lng,lat,coords[0]))return false;
  for(let i=1;i<coords.length;i++)if(pointInRing(lng,lat,coords[i]))return false;
  return true;
}
function pointInGeometry(lng,lat,value){
  const g=geometryOf(value); if(!g)return false;
  if(g.type==='Polygon')return pointInPolygon(lng,lat,g.coordinates||[]);
  if(g.type==='MultiPolygon')return(g.coordinates||[]).some(poly=>pointInPolygon(lng,lat,poly));
  return false;
}
function coveredByArea(p,a){
  if(matchesRule(p.postcode,a.exclude_postcodes||[]))return false;
  if(matchesRule(p.postcode,a.include_postcodes||[]))return true;
  const mode=['administrative','polygon'].includes(a.coverage_mode)?a.coverage_mode:'radius';
  if(mode==='administrative'){
    const codes=(a.admin_area_codes||[]).map(x=>String(x).toUpperCase()),names=(a.admin_area_names||[]).map(norm);
    return (!!p.district_code&&codes.includes(String(p.district_code).toUpperCase())) || (!!p.district&&names.includes(norm(p.district)));
  }
  const lat=Number(p.latitude),lng=Number(p.longitude);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return false;
  if(mode==='polygon'&&geometryOf(a.geojson))return pointInGeometry(lng,lat,a.geojson);
  const alat=Number(a.latitude),alng=Number(a.longitude),radius=Number(a.radius_km||0);
  return [alat,alng,radius].every(Number.isFinite)&&radius>0&&distanceKm(lat,lng,alat,alng)<=radius;
}
function priorityTimestamp(score=9000,expectedYield=0,postcode=''){
  const baseMs=Date.UTC(2000,0,1);
  const priorityDelay=Math.max(0,10000-Math.min(10000,Math.max(0,Number(score)||0)))*60*1000;
  const yieldBoost=Math.min(500,Math.max(0,Number(expectedYield)||0))*1000;
  let jitter=0; for(const c of String(postcode))jitter=(jitter*31+c.charCodeAt(0))%997;
  return new Date(baseMs+priorityDelay-yieldBoost+jitter).toISOString();
}
async function providerRequest(url,body){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
    const text=await r.text(); let data=null; if(text){try{data=JSON.parse(text)}catch{data=text}}
    if(!r.ok){const e=new Error(data?.message||data?.Message||`getAddress discovery failed (${r.status})`);e.status=r.status;throw e}
    return data;
  }finally{clearTimeout(timer)}
}
async function typeahead(term,apiKey,filter={}){
  const url=`https://api.getAddress.io/typeahead/${encodeURIComponent(term)}?api-key=${encodeURIComponent(apiKey)}&top=20`;
  const data=await providerRequest(url,{search:['postcode'],filter});
  const values=Array.isArray(data)?data:Array.isArray(data?.suggestions)?data.suggestions:[];
  return [...new Set(values.map(cleanPostcode).filter(isFullPostcode))];
}
async function activeServiceAreas(){
  return db('service_areas?active=eq.true&select=id,label,region,city,district,latitude,longitude,radius_km,geojson,coverage_mode,include_postcodes,exclude_postcodes,admin_area_codes,admin_area_names,service_keys,priority&order=priority.desc').catch(()=>[]);
}
async function yieldByOutcode(){
  const rows=await db('address_harvest_postcodes?status=eq.harvested&address_count=gt.0&outcode=not.is.null&select=outcode,address_count&limit=5000').catch(()=>[]);
  const grouped=new Map();
  for(const row of rows||[]){const key=String(row.outcode||'').toUpperCase();if(!key)continue;const g=grouped.get(key)||{sum:0,n:0};g.sum+=Math.max(0,Number(row.address_count)||0);g.n++;grouped.set(key,g)}
  return new Map([...grouped].map(([k,g])=>[k,g.n?g.sum/g.n:0]));
}
function serviceFilters(areas){
  const filters=[];
  for(const area of areas||[]){
    if(area.coverage_mode==='administrative'&&(area.admin_area_names||[]).length){
      for(const name of area.admin_area_names)filters.push({area,label:`${area.label} · ${name}`,filter:{district:name}});
    }else if(area.district){
      filters.push({area,label:area.label,filter:{district:area.district}});
    }else if(area.city){
      filters.push({area,label:area.label,filter:{town_or_city:area.city}});
    }
  }
  return filters;
}
function serviceTerms(areas){
  const london=(areas||[]).some(a=>norm(a.region)==='london'||norm(a.city)==='london');
  if(london)return LONDON_TERMS;
  const includeTerms=[];
  for(const area of areas||[])for(const rule of area.include_postcodes||[]){const x=cleanRule(rule).replace(/\*$/,'');if(x&&x.length>=2)includeTerms.push(x)}
  return [...new Set([...includeTerms,...UK_AREAS])];
}
async function insertPriorityRows(postcodes,{seedTerm,coverageLabel,score,yields}){
  const unique=[...new Set((postcodes||[]).map(cleanPostcode).filter(isFullPostcode))];
  if(!unique.length)return 0;
  const rows=unique.map(postcode=>{
    const out=outward(postcode),expected=Number(yields.get(out)||0);
    return {postcode,seed_term:seedTerm,status:'pending',priority_score:score,coverage_label:coverageLabel,outcode:out,expected_yield:Number(expected.toFixed(2)),discovered_at:priorityTimestamp(score,expected,postcode),updated_at:nowIso()};
  });
  const inserted=await db('address_harvest_postcodes?on_conflict=postcode',{method:'POST',prefer:'resolution=ignore-duplicates,return=representation',body:rows});
  return Array.isArray(inserted)?inserted.length:0;
}
async function seedKnownCovered(areas,yields){
  const known=await db('postcode_directory?select=postcode,district,district_code,latitude,longitude&order=verified_at.desc&limit=2000').catch(()=>[]);
  let added=0;
  for(const area of areas||[]){
    const postcodes=(known||[]).filter(p=>coveredByArea(p,area)).map(p=>p.postcode);
    added+=await insertPriorityRows(postcodes,{seedTerm:'namdar-covered',coverageLabel:area.label,score:9700+Math.min(299,Number(area.priority)||0),yields});
    const explicit=(area.include_postcodes||[]).map(cleanRule).filter(x=>isFullPostcode(x));
    added+=await insertPriorityRows(explicit,{seedTerm:'service-include',coverageLabel:area.label,score:10000,yields});
  }
  return added;
}
async function seedServiceAreaQueue(apiKey,currentSettings,target=120){
  const areas=await activeServiceAreas();
  if(!areas.length)return{areas:[],terms:[],discovered:0,pending:0};
  const yields=await yieldByOutcode();
  let discovered=await seedKnownCovered(areas,yields),terms=[];
  const pendingBefore=await db('address_harvest_postcodes?status=eq.pending&coverage_label=not.is.null&select=postcode&limit=5000').catch(()=>[]);
  if((pendingBefore||[]).length>=target)return{areas:areas.map(a=>a.label),terms,discovered,pending:pendingBefore.length};
  const filters=serviceFilters(areas),termPool=serviceTerms(areas);
  if(!filters.length||!termPool.length)return{areas:areas.map(a=>a.label),terms,discovered,pending:(pendingBefore||[]).length};
  let cursor=Math.max(0,Number(currentSettings.service_seed_cursor)||0),calls=0;
  const remainingTarget=Math.max(0,target-(pendingBefore||[]).length);
  for(let step=0;step<MAX_FREE_DISCOVERY_CALLS&&discovered<remainingTarget;step++){
    const planIndex=cursor++;
    const filterItem=filters[planIndex%filters.length];
    const termIndex=Math.floor(planIndex/filters.length)%termPool.length;
    const term=termPool[termIndex];
    terms.push(`${filterItem.label}:${term}`); calls++;
    try{
      let postcodes=await typeahead(term,apiKey,filterItem.filter);
      postcodes=postcodes.filter(pc=>!matchesRule(pc,filterItem.area.exclude_postcodes||[]));
      const score=9000+Math.min(699,Number(filterItem.area.priority)||0);
      discovered+=await insertPriorityRows(postcodes,{seedTerm:`service:${term}`,coverageLabel:filterItem.label,score,yields});
    }catch(error){
      if(error.status===429)break;
      console.warn(`GetAddress service-area discovery ${filterItem.label} ${term}:`,error.message);
    }
  }
  await db('address_harvest_settings?id=eq.1',{method:'PATCH',body:{service_seed_cursor:cursor,updated_at:nowIso()}}).catch(()=>null);
  const pending=await db('address_harvest_postcodes?status=eq.pending&coverage_label=not.is.null&select=postcode&limit=5000').catch(()=>[]);
  return{areas:areas.map(a=>a.label),terms,discovered,pending:(pending||[]).length,discoveryCalls:calls};
}
async function annotateRun(result,priorityPrep){
  if(!result?.runId)return result;
  const run=(await db(`address_harvest_runs?id=eq.${encodeURIComponent(result.runId)}&select=started_at,finished_at,seed_terms&limit=1`))?.[0];
  if(!run?.started_at)return result;
  let path=`address_harvest_postcodes?coverage_label=not.is.null&harvested_at=gte.${encodeURIComponent(run.started_at)}&select=postcode,address_count,coverage_label`;
  if(run.finished_at)path+=`&harvested_at=lte.${encodeURIComponent(run.finished_at)}`;
  const rows=await db(path).catch(()=>[]);
  const servicePostcodes=(rows||[]).length,serviceAddresses=(rows||[]).reduce((n,x)=>n+Math.max(0,Number(x.address_count)||0),0);
  const previous=Array.isArray(run.seed_terms)?run.seed_terms:[];
  await db(`address_harvest_runs?id=eq.${encodeURIComponent(result.runId)}`,{method:'PATCH',body:{service_area_postcodes_harvested:servicePostcodes,service_area_addresses_collected:serviceAddresses,seed_terms:[...priorityPrep.terms,...previous].slice(0,100)}}).catch(()=>null);
  return{...result,serviceAreaPostcodesHarvested:servicePostcodes,serviceAreaAddressesCollected:serviceAddresses,priorityQueuePending:priorityPrep.pending,priorityAreas:priorityPrep.areas};
}
async function runHarvest(options={}){
  const current=(await db('address_harvest_settings?id=eq.1&select=*&limit=1'))?.[0]||null;
  const respectEnabled=options.respectEnabled!==false;
  if(!current||(respectEnabled&&!current.enabled)||!current.prioritize_service_areas||!env('GETADDRESS_API_KEY','').trim())return base.runHarvest(options);
  const cap=Math.min(base.MAX_DAILY_LOOKUPS,Math.max(1,Number(current.daily_lookup_cap)||base.MAX_DAILY_LOOKUPS));
  const requested=Math.min(cap,Math.max(1,Number(options.requestedLimit??cap)||cap));
  const target=Math.max(80,requested*SERVICE_QUEUE_MULTIPLIER);
  let prep={areas:[],terms:[],discovered:0,pending:0};
  try{prep=await seedServiceAreaQueue(env('GETADDRESS_API_KEY','').trim(),current,target)}catch(error){console.warn('Service-area address discovery unavailable:',error.message)}
  return annotateRun(await base.runHarvest(options),prep);
}
async function harvestStatus(){
  const status=await base.harvestStatus();
  const [areas,pending,harvested]=await Promise.all([
    activeServiceAreas(),
    db('address_harvest_postcodes?status=eq.pending&coverage_label=not.is.null&select=postcode,coverage_label,expected_yield&limit=5000').catch(()=>[]),
    db('address_harvest_postcodes?status=eq.harvested&coverage_label=not.is.null&select=postcode,address_count,coverage_label&limit=5000').catch(()=>[])
  ]);
  return{...status,priority:{enabled:status.settings?.prioritize_service_areas!==false,activeAreas:(areas||[]).map(a=>a.label),pendingServicePostcodes:(pending||[]).length,harvestedServicePostcodes:(harvested||[]).length,harvestedServiceAddresses:(harvested||[]).reduce((n,x)=>n+Math.max(0,Number(x.address_count)||0),0)}};
}
module.exports={...base,runHarvest,harvestStatus,seedServiceAreaQueue};
