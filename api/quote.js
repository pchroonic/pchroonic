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

module.exports=async function handler(req,res){
  try{
    if(req.method==='POST'){
      const body=parseBody(req),key=String(body.serviceKey||body.service||'').trim();
      if(!key)return json(res,400,{ok:false,error:'Choose a valid Namdar service.'});
      const service=await serviceByKey(db,key);
      if(!service)return json(res,400,{ok:false,error:'Choose a valid Namdar service.'});
      if(!isLive(service))return json(res,409,{ok:false,error:unavailableMessage(service),service:{serviceKey:service.service_key,status:service.status,name:service.name}});
      if(key==='windows')req.body=normaliseWindowInputs(body);
    }
    return core(req,res);
  }catch(error){return safeError(res,error)}
};
