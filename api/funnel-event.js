const {json,parseBody,db,safeError}=require('../lib/server');
const SERVICES=new Set(['windows','gutters','roof','jetwash','handyman','tour3d']);
const VISITOR=/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[0-9a-f]{24,64})$/i;
function visitorId(v=''){const x=String(v||'').trim();return x.length<=96&&VISITOR.test(x)?x:''}
function postcodeArea(v=''){const x=String(v||'').trim().toUpperCase().replace(/\s+/g,'');return (x.match(/^[A-Z]{1,2}/)||[])[0]||null}
module.exports=async function handler(req,res){
  try{
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const b=parseBody(req),eventType=String(b.eventType||'').trim(),visitor=visitorId(b.visitorId),serviceKey=String(b.serviceKey||'').trim(),area=postcodeArea(b.postcode),covered=b.covered===true;
    if(eventType!=='postcode_checked'||!visitor||!SERVICES.has(serviceKey)||!area)return json(res,400,{ok:false,error:'Invalid funnel event.'});
    const since=new Date(Date.now()-30*60*1000).toISOString();
    const duplicate=(await db(`conversion_events?event_type=eq.postcode_checked&visitor_id=eq.${encodeURIComponent(visitor)}&service_key=eq.${encodeURIComponent(serviceKey)}&postcode_area=eq.${encodeURIComponent(area)}&covered=eq.${covered?'true':'false'}&created_at=gte.${encodeURIComponent(since)}&select=id&limit=1`).catch(()=>[]))?.[0];
    if(!duplicate)await db('conversion_events',{method:'POST',prefer:'return=minimal',body:{event_type:'postcode_checked',visitor_id:visitor,service_key:serviceKey,postcode_area:area,covered}});
    return json(res,201,{ok:true,recorded:!duplicate});
  }catch(error){return safeError(res,error)}
};
