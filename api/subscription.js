const core=require('./subscription-core');
const {json,parseBody,db,safeError}=require('../lib/server');
const {serviceByKey,isLive,unavailableMessage}=require('../lib/service-catalog');
module.exports=async function handler(req,res){
  try{
    if(req.method==='POST'){
      const body=parseBody(req),key=String(body.serviceKey||'windows').trim();
      const service=await serviceByKey(db,key);
      if(!service)return json(res,400,{ok:false,error:'Choose a valid Namdar service.'});
      if(!isLive(service))return json(res,409,{ok:false,error:unavailableMessage(service),service:{serviceKey:service.service_key,status:service.status,name:service.name}});
    }
    return core(req,res);
  }catch(error){return safeError(res,error)}
};
