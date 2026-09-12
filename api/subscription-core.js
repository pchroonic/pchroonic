const {json,parseBody,db,requireCustomer,safeError}=require('../lib/server');
const SERVICES=new Set(['windows','gutters','roof','jetwash','handyman','tour3d']);
const INTERVALS=new Set(['weekly','fortnightly','monthly','quarterly','4_weekly','8_weekly','12_weekly','custom']);
module.exports=async function(req,res){try{
  const {user,profile}=await requireCustomer(req);
  if(req.method==='GET'){
    const rows=await db(`service_subscriptions?customer_id=eq.${encodeURIComponent(user.id)}&select=*&order=created_at.desc`);
    return json(res,200,{ok:true,subscriptions:rows||[]});
  }
  const b=parseBody(req);
  if(req.method==='POST'){
    const service=String(b.serviceKey||'windows'),interval=String(b.intervalKey||'8_weekly');
    if(!SERVICES.has(service)||!INTERVALS.has(interval))return json(res,400,{ok:false,error:'Choose a valid service and frequency.'});
    const address=String(b.address||[profile.address_line1,profile.address_line2,profile.city,profile.postcode].filter(Boolean).join(', ')).trim().slice(0,500);
    if(!address)return json(res,400,{ok:false,error:'Save your service address before starting a subscription.'});
    const existing=await db(`service_subscriptions?customer_id=eq.${encodeURIComponent(user.id)}&service_key=eq.${encodeURIComponent(service)}&status=in.(pending,active,paused)&select=id&limit=1`);
    if(existing?.length)return json(res,409,{ok:false,error:'You already have an open subscription for this service.'});
    const rows=await db('service_subscriptions',{method:'POST',prefer:'return=representation',body:{customer_id:user.id,service_key:service,interval_key:interval,status:'pending',starts_on:b.startsOn||null,address,notes:String(b.notes||'').slice(0,1000)}});
    return json(res,201,{ok:true,subscription:rows?.[0],message:'Subscription request received. Namdar will confirm the regular price and schedule before activation.'});
  }
  if(req.method==='PATCH'){
    const id=String(b.id||'');if(!id)return json(res,400,{ok:false,error:'Subscription id required.'});
    const row=(await db(`service_subscriptions?id=eq.${encodeURIComponent(id)}&customer_id=eq.${encodeURIComponent(user.id)}&select=id,status&limit=1`))?.[0];if(!row)return json(res,404,{ok:false,error:'Subscription not found.'});
    if(String(b.action||'')!=='cancel')return json(res,400,{ok:false,error:'Unsupported action.'});
    await db(`service_subscriptions?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:{status:'cancelled',updated_at:new Date().toISOString()}});
    return json(res,200,{ok:true});
  }
  return json(res,405,{ok:false,error:'Method not allowed'});
}catch(e){return safeError(res,e)}};
