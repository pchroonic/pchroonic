const core=require('./postcode-core');
const {json,db,safeError,queryParam}=require('../lib/server');
const {serviceByKey,isLive,unavailableMessage}=require('../lib/service-catalog');
module.exports=async function handler(req,res){
  try{
    if(req.method==='GET'){
      const key=String(queryParam(req,'service')||'').trim();
      if(key){
        const service=await serviceByKey(db,key);
        if(!service)return json(res,400,{ok:false,error:'Unknown service.'});
        if(!isLive(service))return json(res,409,{ok:false,error:unavailableMessage(service),service:{serviceKey:service.service_key,status:service.status,name:service.name}});
      }
    }
    return core(req,res);
  }catch(error){return safeError(res,error)}
};
