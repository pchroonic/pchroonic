const core=require('./postcode-core');
const {json,db,safeError,queryParam}=require('../lib/server');
const {consumeRateLimit}=require('../lib/security');
const {serviceByKey,isLive,unavailableMessage}=require('../lib/service-catalog');
module.exports=async function handler(req,res){
  try{
    if(req.method==='GET'){
      await consumeRateLimit(req,res,{scope:'postcode.lookup.ip',limit:60,windowSeconds:600,message:'Too many postcode checks were made from this connection. Please wait a few minutes and try again.'});
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
