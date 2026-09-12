const {json,db,requireStaff,auditLog,safeError,parseBody}=require('../lib/server');
const {VALID_STATUSES,loadServiceCatalog}=require('../lib/service-catalog');

async function readiness(serviceKey){
  const [pricing,areas]=await Promise.all([
    db(`pricing_rules?service_key=eq.${encodeURIComponent(serviceKey)}&select=service_key&limit=1`).catch(()=>[]),
    db('service_areas?active=eq.true&select=id,label,service_keys').catch(()=>[])
  ]);
  const coverage=(areas||[]).filter(a=>{
    const keys=Array.isArray(a.service_keys)?a.service_keys:[];
    return !keys.length||keys.includes(serviceKey);
  });
  return {
    pricingConfigured:Boolean(pricing?.length),
    coverageConfigured:Boolean(coverage.length),
    coverageAreas:coverage.map(a=>a.label).filter(Boolean)
  };
}

async function state(){
  const services=await loadServiceCatalog(db);
  return Promise.all(services.map(async service=>({...service,readiness:await readiness(service.service_key)})));
}

module.exports=async function handler(req,res){
  try{
    const staff=await requireStaff(req,'settings');
    if(req.method==='GET')return json(res,200,{ok:true,services:await state()});
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const body=parseBody(req),action=String(body.action||'');
    if(action!=='set-status')return json(res,400,{ok:false,error:'Unknown service action.'});
    const key=String(body.serviceKey||'').trim(),status=String(body.status||'').trim();
    if(!key||!VALID_STATUSES.has(status))return json(res,400,{ok:false,error:'Choose a valid service and status.'});
    const before=(await db(`service_catalog?service_key=eq.${encodeURIComponent(key)}&select=*&limit=1`))?.[0];
    if(!before)return json(res,404,{ok:false,error:'Service not found.'});
    const checks=await readiness(key);
    if(status==='live'&&!checks.pricingConfigured)return json(res,409,{ok:false,error:'Configure pricing for this service before making it live.',readiness:checks});
    if(status==='live'&&!checks.coverageConfigured)return json(res,409,{ok:false,error:'Add this service to at least one active service area before making it live.',readiness:checks});
    const patch={status,updated_at:new Date().toISOString()};
    if(status==='live'&&!before.live_since)patch.live_since=new Date().toISOString();
    await db(`service_catalog?service_key=eq.${encodeURIComponent(key)}`,{method:'PATCH',body:patch});
    const after=(await db(`service_catalog?service_key=eq.${encodeURIComponent(key)}&select=*&limit=1`))?.[0]||null;
    await auditLog(req,staff,{action:'service_catalog.status',entityType:'service_catalog',entityId:key,summary:`${before.name||key}: ${before.status} → ${status}`,before,after});
    return json(res,200,{ok:true,services:await state()});
  }catch(error){return safeError(res,error)}
};
