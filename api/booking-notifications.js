const { json, env, db, isManagedInboxAddress, processDueBookingNotifications, processDueBusinessNotifications, safeError } = require('../lib/server');
const { processPostJobFollowUps } = require('../lib/post-job-followup');
const { scanBusinessFollowUpsBatched } = require('../lib/business-followup-batched');

function stageFailed(data){return data?.degraded===true||Number(data?.failed||0)>0}
async function runStage(name,fn){
  try{const data=await fn();return{ok:!stageFailed(data),data}}
  catch(error){console.error(`Notification cron stage failed: ${name}`,error?.status||'',error?.message||error);return{ok:false,error:String(error?.status?error.message:'Stage failed').slice(0,240)}}
}

module.exports=async function handler(req,res){
  try{
    if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
    const secret=env('CRON_SECRET');
    if(!secret)return json(res,503,{ok:false,error:'CRON_SECRET is not configured.'});
    const auth=req.headers.authorization||req.headers.Authorization||'';
    if(auth!==`Bearer ${secret}`)return json(res,401,{ok:false,error:'Unauthorized'});

    const postJob=await runStage('post_job',()=>processPostJobFollowUps(10));
    const booking=await runStage('booking_delivery',()=>processDueBookingNotifications(10));
    const businessScan=await runStage('business_scan',()=>scanBusinessFollowUpsBatched({db,env,isManagedInboxAddress}));
    const businessDelivery=await runStage('business_delivery',()=>processDueBusinessNotifications(10));
    const stages={postJob,booking,businessScan,businessDelivery};
    const failed=Object.values(stages).filter(x=>!x.ok).length;
    const status=failed===Object.keys(stages).length?503:200;
    return json(res,status,{ok:failed===0,degraded:failed>0,stages,timestamp:new Date().toISOString()});
  }catch(e){return safeError(res,e)}
};
