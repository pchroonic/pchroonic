const core=require('./quote-core');
const {json,parseBody,db,safeError}=require('../lib/server');
const {consumeRateLimit}=require('../lib/security');
const {serviceByKey,isLive,unavailableMessage}=require('../lib/service-catalog');

const WINDOW_DETAIL=new Set([1,1.15,1.28]);
const WINDOW_EXTRA=new Set([1,1.12,1.28,1.5]);
const WINDOW_FREQUENCY=new Set(['once','4_weekly','8_weekly','12_weekly','monthly','quarterly']);
const VISITOR=/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[0-9a-f]{24,64})$/i;
function safeVisitor(v=''){const x=String(v||'').trim();return x.length<=96&&VISITOR.test(x)?x:''}
function normaliseWindowInputs(body){
  const inputs={...(body.inputs||{})};
  const detail=Number(inputs.detail),extra=Number(inputs.extra);
  inputs.detail=WINDOW_DETAIL.has(detail)?detail:1;
  inputs.extra=WINDOW_EXTRA.has(extra)?extra:1;
  inputs.frequency=WINDOW_FREQUENCY.has(String(inputs.frequency||''))?String(inputs.frequency):'once';
  return {...body,serviceKey:'windows',inputs};
}

module.exports=async function handler(req,res){
  let originalEnd=null,captured='',visitor='';
  try{
    if(req.method==='POST'){
      await consumeRateLimit(req,res,{scope:'quote.create.ip',limit:8,windowSeconds:900,message:'Too many quote requests were submitted from this connection. Please wait a few minutes and try again.'});
      const body=parseBody(req),key=String(body.serviceKey||body.service||'').trim();
      if(!key)return json(res,400,{ok:false,error:'Choose a valid Namdar service.'});
      const service=await serviceByKey(db,key);
      if(!service)return json(res,400,{ok:false,error:'Choose a valid Namdar service.'});
      if(!isLive(service))return json(res,409,{ok:false,error:unavailableMessage(service),service:{serviceKey:service.service_key,status:service.status,name:service.name}});
      visitor=safeVisitor(body.visitorId);
      if(key==='windows')req.body=normaliseWindowInputs(body);else req.body=body;
      if(visitor){
        originalEnd=res.end.bind(res);
        res.end=(chunk,...args)=>{if(chunk!=null)captured+=Buffer.isBuffer(chunk)?chunk.toString('utf8'):String(chunk);return originalEnd(chunk,...args)};
      }
    }
    await core(req,res);
    if(visitor&&captured&&res.statusCode===201){
      try{const payload=JSON.parse(captured),quoteId=String(payload?.quote?.id||'');if(quoteId)await db('quote_funnel_links?on_conflict=quote_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{quote_id:quoteId,visitor_id:visitor}})}catch(e){console.warn('Quote funnel link not recorded',e.message)}
    }
  }catch(error){return safeError(res,error)}finally{if(originalEnd)res.end=originalEnd}
};
