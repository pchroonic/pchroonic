const { json, env, processDueBookingNotifications, processBusinessFollowUps, safeError } = require('../lib/server');
module.exports=async function handler(req,res){
  try{
    if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
    const secret=env('CRON_SECRET');
    if(!secret)return json(res,503,{ok:false,error:'CRON_SECRET is not configured.'});
    const auth=req.headers.authorization||req.headers.Authorization||'';
    if(auth!==`Bearer ${secret}`)return json(res,401,{ok:false,error:'Unauthorized'});
    const booking=await processDueBookingNotifications(100);
    const business=await processBusinessFollowUps(100);
    return json(res,200,{ok:true,booking,business,timestamp:new Date().toISOString()});
  }catch(e){return safeError(res,e)}
};
