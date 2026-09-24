const {json,parseBody,db,safeError}=require('../lib/server');

const VISITOR=/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[0-9a-f]{24,64})$/i;
function visitorId(v=''){const x=String(v||'').trim();return x.length<=96&&VISITOR.test(x)?x:''}
function productionHost(req){const h=String(req.headers?.host||'').split(':')[0].toLowerCase();return h==='namdar.co.uk'||h==='www.namdar.co.uk'}

module.exports=async function handler(req,res){
  try{
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    if(!productionHost(req))return json(res,202,{ok:true,deleted:false,reason:'non_production_host'});
    const id=visitorId(parseBody(req).sessionId);
    if(!id)return json(res,400,{ok:false,error:'Invalid analytics session.'});
    await Promise.all([
      db(`page_views?session_id=eq.${encodeURIComponent(id)}`,{method:'DELETE',prefer:'return=minimal'}).catch(()=>null),
      db(`conversion_events?visitor_id=eq.${encodeURIComponent(id)}`,{method:'DELETE',prefer:'return=minimal'}).catch(()=>null),
      db(`quote_funnel_links?visitor_id=eq.${encodeURIComponent(id)}`,{method:'DELETE',prefer:'return=minimal'}).catch(()=>null)
    ]);
    return json(res,200,{ok:true,deleted:true});
  }catch(e){return safeError(res,e)}
};
