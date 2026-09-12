const core=require('./quote-core');
const {json,parseBody,db,safeError}=require('../lib/server');
const {serviceByKey,isLive,unavailableMessage}=require('../lib/service-catalog');

const WINDOW_DETAIL=new Set([1,1.15,1.28]);
const WINDOW_EXTRA=new Set([1,1.12,1.28,1.5]);
const WINDOW_FREQUENCY=new Set(['once','4_weekly','8_weekly','12_weekly','monthly','quarterly']);

function normaliseWindowInputs(body){
  const inputs={...(body.inputs||{})};
  const detail=Number(inputs.detail),extra=Number(inputs.extra);
  inputs.detail=WINDOW_DETAIL.has(detail)?detail:1;
  inputs.extra=WINDOW_EXTRA.has(extra)?extra:1;
  inputs.frequency=WINDOW_FREQUENCY.has(String(inputs.frequency||''))?String(inputs.frequency):'once';
  return {...body,serviceKey:'windows',inputs};
}
function cleanVisitor(value=''){
  const v=String(value||'').trim();
  return /^[A-Za-z0-9_-]{8,96}$/.test(v)?v:'';
}
function captureQuoteLink(res,visitorId){
  if(!visitorId)return;
  const original=res.end.bind(res);
  res.end=async function(chunk,...args){
    try{
      if(res.statusCode===201&&chunk){
        const payload=JSON.parse(Buffer.isBuffer(chunk)?chunk.toString('utf8'):String(chunk));
        const quoteId=payload?.quote?.id;
        if(quoteId)await db('quote_funnel_links?on_conflict=quote_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{quote_id:quoteId,visitor_id:visitorId}});
      }
    }catch(error){console.warn('Quote funnel link skipped',error.message)}
    return original(chunk,...args);
  };
}

module.exports=async function handler(req,res){
  try{
    if(req.method==='POST'){
      const body=parseBody(req),key=String(body.serviceKey||body.service||'').trim();
      if(!key)return json(res,400,{ok:false,error:'Choose a valid Namdar service.'});
      const service=await serviceByKey(db,key);
      if(!service)return json(res,400,{ok:false,error:'Choose a valid Namdar service.'});
      if(!isLive(service))return json(res,409,{ok:false,error:unavailableMessage(service),service:{serviceKey:service.service_key,status:service.status,name:service.name}});
      if(key==='windows'){
        const visitorId=cleanVisitor(body.visitorId);
        req.body=normaliseWindowInputs(body);
        captureQuoteLink(res,visitorId);
      }
    }
    return core(req,res);
  }catch(error){return safeError(res,error)}
};

module.exports.cleanVisitor=cleanVisitor;
