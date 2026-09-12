const core=require('./customer-quote-action-core');
const {json,queryParam,db,safeError}=require('../lib/server');
const {availabilityForQuote}=require('../lib/booking-operations');

function captureResponse(){
  const headers={};
  return {statusCode:200,headers,payload:'',setHeader(k,v){headers[String(k).toLowerCase()]=v},end(v=''){this.payload=String(v||'')}};
}

module.exports=async function handler(req,res){
  try{
    if(req.method!=='GET')return core(req,res);
    const capture=captureResponse();
    await core(req,capture);
    let body={};try{body=capture.payload?JSON.parse(capture.payload):{}}catch{return json(res,500,{ok:false,error:'Invalid customer quote response.'})}
    if(capture.statusCode!==200||!body?.ok||!Array.isArray(body.slots)||!body.slots.length)return json(res,capture.statusCode||200,body);
    const quoteId=String(queryParam(req,'quoteId')||'').trim();
    const quote=(await db(`quotes?id=eq.${encodeURIComponent(quoteId)}&select=id,postcode,service_key&limit=1`))?.[0];
    if(!quote)return json(res,capture.statusCode||200,body);
    const availability=await availabilityForQuote(db,quote);
    body.slots=availability.slots;
    body.scheduling={
      routeZone:availability.routeZone,
      horizonDays:availability.rules.horizonDays,
      minimumNoticeHours:availability.rules.minimumNoticeHours,
      maxJobsPerDay:availability.rules.maxJobsPerDay,
      operatingDays:availability.rules.operatingDays,
      routeDensityEnabled:availability.rules.routeDensityEnabled,
      message:availability.rules.routeDensityEnabled?'Appointments are offered around Namdar operating days and route zones so nearby work can be grouped efficiently.':'Appointments are offered from Namdar’s current operating calendar.'
    };
    return json(res,200,body);
  }catch(error){return safeError(res,error)}
};
