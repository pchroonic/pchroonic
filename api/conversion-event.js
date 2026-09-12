const {json,parseBody,db,safeError}=require('../lib/server');

function cleanVisitor(value=''){
  const v=String(value||'').trim();
  return /^[A-Za-z0-9_-]{8,96}$/.test(v)?v:'';
}
function cleanArea(value=''){
  const v=String(value||'').trim().toUpperCase();
  return /^[A-Z]{1,2}$/.test(v)?v:null;
}

module.exports=async function handler(req,res){
  try{
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const b=parseBody(req),eventType=String(b.eventType||'').trim(),visitorId=cleanVisitor(b.visitorId),serviceKey=String(b.serviceKey||'').trim();
    if(eventType!=='postcode_checked'||serviceKey!=='windows'||!visitorId)return json(res,400,{ok:false,error:'Invalid conversion event.'});
    const postcodeArea=cleanArea(b.postcodeArea),covered=typeof b.covered==='boolean'?b.covered:null;
    const recent=(await db(`conversion_events?event_type=eq.postcode_checked&visitor_id=eq.${encodeURIComponent(visitorId)}&service_key=eq.windows&postcode_area=${postcodeArea?`eq.${encodeURIComponent(postcodeArea)}`:'is.null'}&select=id,created_at&order=created_at.desc&limit=1`).catch(()=>[]))?.[0];
    if(recent&&Date.now()-new Date(recent.created_at).getTime()<5*60*1000)return json(res,200,{ok:true,deduped:true});
    await db('conversion_events',{method:'POST',prefer:'return=minimal',body:{event_type:'postcode_checked',visitor_id:visitorId,service_key:'windows',postcode_area:postcodeArea,covered}});
    return json(res,201,{ok:true});
  }catch(error){return safeError(res,error)}
};

module.exports.cleanVisitor=cleanVisitor;
module.exports.cleanArea=cleanArea;
