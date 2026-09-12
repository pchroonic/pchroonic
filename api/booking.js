const core=require('./booking-core');
const {json,parseBody,db,authUser,safeError}=require('../lib/server');
const {validateSlotForQuote}=require('../lib/booking-operations');

module.exports=async function handler(req,res){
  try{
    if(req.method!=='POST')return core(req,res);
    const body=parseBody(req),quoteId=String(body.quoteId||'').trim();
    if(!quoteId)return core(req,res);
    const quote=(await db(`quotes?id=eq.${encodeURIComponent(quoteId)}&select=id,customer_id,postcode,service_key&limit=1`))?.[0];
    if(!quote)return core(req,res);
    const user=await authUser(req);
    if(!user?.id||quote.customer_id!==user.id)return core(req,res);
    const check=await validateSlotForQuote(db,quote,body.startsAt,body.endsAt);
    if(!check.ok)return json(res,409,{ok:false,error:check.error,scheduling:{routeZone:check.routeZone||null,minimumNoticeHours:check.rules?.minimumNoticeHours||null,maxJobsPerDay:check.rules?.maxJobsPerDay||null}});
    return core(req,res);
  }catch(error){return safeError(res,error)}
};
