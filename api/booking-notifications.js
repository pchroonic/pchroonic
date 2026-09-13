const { json, env, db, isManagedInboxAddress, processDueBookingNotifications, processDueBusinessNotifications, safeError } = require('../lib/server');
const { processPostJobFollowUps } = require('../lib/post-job-followup');
const { scanBusinessFollowUpsBatched } = require('../lib/business-followup-batched');
const { createResilientReadDb, retryTransient } = require('../lib/notification-cron-resilience');
const { recordHealthState, statusFromFailures } = require('../lib/system-health');

function stageFailed(data){return data?.degraded===true||Number(data?.failed||0)>0}
async function runStage(name,fn,metrics){
  try{
    const result=await retryTransient(fn,{maxAttempts:3,metrics,label:`stage:${name}`});
    const data=result.value;
    return{ok:!stageFailed(data),data,attempts:result.attempts,recovered:result.recovered};
  }
  catch(error){console.error(`Notification cron stage failed: ${name}`,error?.status||'',error?.message||error);return{ok:false,error:String(error?.status?error.message:'Stage failed').slice(0,240)}}
}
function healthDetails(stages,retryMetrics){
  return{
    stages:Object.fromEntries(Object.entries(stages).map(([name,x])=>[name,{ok:!!x.ok,attempts:Number(x.attempts||1),recovered:!!x.recovered,failed:Number(x?.data?.failed||0)}])),
    databaseRetries:{retries:Number(retryMetrics?.retries||0),recovered:Number(retryMetrics?.recovered||0),exhausted:Number(retryMetrics?.exhausted||0)}
  };
}

module.exports=async function handler(req,res){
  const startedMs=Date.now(),startedAt=new Date(startedMs).toISOString();let authorized=false;
  try{
    if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
    const secret=env('CRON_SECRET');
    if(!secret)return json(res,503,{ok:false,error:'CRON_SECRET is not configured.'});
    const auth=req.headers.authorization||req.headers.Authorization||'';
    if(auth!==`Bearer ${secret}`)return json(res,401,{ok:false,error:'Unauthorized'});
    authorized=true;

    const retryMetrics={retries:0,recovered:0,exhausted:0};
    const cronReadDb=createResilientReadDb(db,{maxAttempts:3,metrics:retryMetrics,label:'notification-cron'});

    const postJob=await runStage('post_job',()=>processPostJobFollowUps(10),retryMetrics);
    const booking=await runStage('booking_delivery',()=>processDueBookingNotifications(10),retryMetrics);
    const businessScan=await runStage('business_scan',()=>scanBusinessFollowUpsBatched({db:cronReadDb,env,isManagedInboxAddress}),retryMetrics);
    const businessDelivery=await runStage('business_delivery',()=>processDueBusinessNotifications(10),retryMetrics);
    const stages={postJob,booking,businessScan,businessDelivery};
    const failed=Object.values(stages).filter(x=>!x.ok).length;
    const status=failed===Object.keys(stages).length?503:200;
    const healthStatus=statusFromFailures(failed,Object.keys(stages).length),details=healthDetails(stages,retryMetrics);
    await recordHealthState({component:'notification_cron',status:healthStatus,summary:healthStatus==='healthy'?'Notification and follow-up cron completed normally':healthStatus==='warning'?`${failed} notification cron stage${failed===1?'':'s'} degraded`:'Notification and follow-up cron failed',source:'vercel_cron',startedAt,durationMs:Date.now()-startedMs,details,fingerprint:'notification-cron-degraded',title:healthStatus==='failing'?'Namdar notification cron is failing':'Namdar notification cron degraded',message:healthStatus==='failing'?'All notification/follow-up stages failed. Open System Health for details.':`${failed} notification/follow-up stage${failed===1?'':'s'} did not complete normally. Namdar will retry on the next scheduled run.`}).catch(error=>console.error('Could not record notification cron health',error?.status||'',error?.message||error));
    return json(res,status,{ok:failed===0,degraded:failed>0,stages,databaseRetries:retryMetrics,timestamp:new Date().toISOString()});
  }catch(e){
    if(authorized)await recordHealthState({component:'notification_cron',status:'failing',summary:'Notification cron stopped before completion',source:'vercel_cron',startedAt,durationMs:Date.now()-startedMs,details:{errorClass:e?.status===504?'gateway_timeout':'runtime_error'},fingerprint:'notification-cron-degraded',title:'Namdar notification cron is failing',message:'The scheduled notification/follow-up run stopped before completion. Open System Health for details.'}).catch(()=>null);
    return safeError(res,e)
  }
};
