const { json, env, processDueBookingNotifications, processBusinessFollowUps, safeError } = require('../lib/server');
const { processPostJobFollowUps } = require('../lib/post-job-followup');

module.exports=async function handler(req,res){
  try{
    if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
    const secret=env('CRON_SECRET');
    if(!secret)return json(res,503,{ok:false,error:'CRON_SECRET is not configured.'});
    const auth=req.headers.authorization||req.headers.Authorization||'';
    if(auth!==`Bearer ${secret}`)return json(res,401,{ok:false,error:'Unauthorized'});
    const postJob=await processPostJobFollowUps(10);
    const booking=await processDueBookingNotifications(10);
    const business=await processBusinessFollowUps(10);
    return json(res,200,{ok:true,postJob,booking,business,timestamp:new Date().toISOString()});
  }catch(e){return safeError(res,e)}
};
