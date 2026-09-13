const {json,db,env,requireStaff,safeError}=require('../lib/server');
const {freshnessStatus}=require('../lib/system-health');

const MINUTE=60*1000,HOUR=60*MINUTE;
const rank={healthy:0,warning:1,failing:2};
const worst=(...statuses)=>statuses.filter(Boolean).sort((a,b)=>(rank[b]??0)-(rank[a]??0))[0]||'healthy';
const ageLabel=ms=>ms==null?'No run recorded':ms<MINUTE?'Just now':ms<HOUR?`${Math.round(ms/MINUTE)} min ago`:`${Math.round(ms/HOUR*10)/10} h ago`;

async function databaseCheck(){
  const started=Date.now();
  try{const rows=await db('pricing_rules?select=service_key&limit=1');return{key:'database',label:'Database',status:Array.isArray(rows)?'healthy':'failing',summary:Array.isArray(rows)?'Supabase/PostgREST responded':'Unexpected database response',latencyMs:Date.now()-started}}
  catch(error){return{key:'database',label:'Database',status:'failing',summary:error?.status===504?'Database gateway timeout':'Database check failed',latencyMs:Date.now()-started}}
}

function configCheck(){
  const stripeSecret=String(env('STRIPE_SECRET_KEY','')||''),stripeWebhook=String(env('STRIPE_WEBHOOK_SECRET','')||''),email=Boolean(env('RESEND_API_KEY')&&env('NAMDAR_FROM_EMAIL')),cron=Boolean(env('CRON_SECRET'));
  return[
    {key:'stripe',label:'Stripe',status:stripeSecret&&stripeWebhook?'healthy':'failing',summary:stripeSecret&&stripeWebhook?`Configured · ${stripeSecret.startsWith('sk_live_')?'live':'sandbox/test'} mode`:'Stripe secret or webhook secret is missing',mode:stripeSecret.startsWith('sk_live_')?'live':stripeSecret?'sandbox':'unconfigured'},
    {key:'email',label:'Email delivery',status:email?'healthy':'failing',summary:email?'Resend and Namdar sender are configured':'Email provider configuration is incomplete'},
    {key:'cron_config',label:'Cron authentication',status:cron?'healthy':'failing',summary:cron?'CRON_SECRET is configured':'CRON_SECRET is missing'}
  ];
}

async function receiptStorageCheck(){
  const base=String(env('SUPABASE_URL','')||'').replace(/\/$/,''),key=String(env('SUPABASE_SERVICE_ROLE_KEY','')||'');
  if(!base||!key)return{key:'receipt_storage',label:'Receipt storage',status:'failing',summary:'Supabase storage credentials are incomplete'};
  const started=Date.now();
  try{
    const response=await fetch(`${base}/storage/v1/bucket/finance-receipts`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
    return{key:'receipt_storage',label:'Receipt storage',status:response.ok?'healthy':'failing',summary:response.ok?'Private finance receipt bucket is reachable':`Receipt bucket check returned ${response.status}`,latencyMs:Date.now()-started};
  }catch{return{key:'receipt_storage',label:'Receipt storage',status:'failing',summary:'Could not reach private receipt storage',latencyMs:Date.now()-started}}
}

async function latestRun(component){return(await db(`system_health_runs?component=eq.${encodeURIComponent(component)}&select=id,component,status,summary,source,started_at,finished_at,duration_ms,details&order=finished_at.desc&limit=1`).catch(()=>[]))?.[0]||null}
function cronComponent(key,label,row,warningAfterMs,failingAfterMs,schedule){
  const freshness=freshnessStatus(row?.finished_at,warningAfterMs,failingAfterMs),status=worst(row?.status,freshness.status);
  let summary=row?.summary||'No recorded run yet';
  if(freshness.reason==='late')summary=`Last run is later than expected · ${summary}`;
  if(freshness.reason==='stale')summary=`Last run is stale · ${summary}`;
  return{key,label,status,summary,schedule,lastRunAt:row?.finished_at||null,lastRunStatus:row?.status||null,lastRunAge:ageLabel(freshness.ageMs),durationMs:row?.duration_ms??null,details:row?.details||{}};
}

async function queueState(table,label){
  const rows=await db(`${table}?status=in.(pending,sending,failed)&select=id,status,due_at,attempts,last_attempt_at&order=due_at.asc&limit=500`).catch(()=>null);
  if(!rows)return{key:`queue_${table}`,label,status:'failing',summary:'Could not read notification queue'};
  const now=Date.now(),cutoff=now-30*MINUTE;let pending=0,overdue=0,sending=0,stuck=0,failed=0;
  for(const row of rows){const status=row.status;if(status==='pending'){pending++;const due=new Date(row.due_at||0).getTime();if(Number.isFinite(due)&&due<cutoff)overdue++}else if(status==='sending'){sending++;const last=new Date(row.last_attempt_at||0).getTime();if(!Number.isFinite(last)||last<cutoff)stuck++}else if(status==='failed')failed++}
  const problems=overdue+stuck+failed,status=problems>=5?'failing':problems?'warning':'healthy';
  return{key:`queue_${table}`,label,status,summary:problems?`${overdue} overdue · ${stuck} stuck · ${failed} failed`:`${pending} pending · ${sending} sending · no queue failures`,counts:{pending,overdue,sending,stuck,failed}};
}

module.exports=async function handler(req,res){
  try{
    if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
    await requireStaff(req,'settings');
    const [database,receiptStorage,notificationRun,purgeRun,bookingQueue,businessQueue,incidents,runs]=await Promise.all([
      databaseCheck(),receiptStorageCheck(),latestRun('notification_cron'),latestRun('account_purge'),queueState('booking_notifications','Booking email queue'),queueState('business_notifications','Business follow-up queue'),
      db('system_health_incidents?select=id,fingerprint,component,severity,status,title,message,occurrence_count,first_seen_at,last_seen_at,resolved_at,details&order=last_seen_at.desc&limit=30').catch(()=>[]),
      db('system_health_runs?select=id,component,status,summary,source,finished_at,duration_ms,details&order=finished_at.desc&limit=40').catch(()=>[])
    ]);
    const components=[database,...configCheck(),cronComponent('notification_cron','Notifications & follow-ups',notificationRun,90*MINUTE,150*MINUTE,'Hourly at :07'),cronComponent('account_purge','Account-deletion purge',purgeRun,30*HOUR,42*HOUR,'Daily at 04:15 UTC'),bookingQueue,businessQueue,receiptStorage];
    const overall=worst(...components.map(x=>x.status));
    const openIncidents=(incidents||[]).filter(x=>x.status==='open').length;
    return json(res,200,{ok:true,overall,openIncidents,components,incidents:incidents||[],recentRuns:runs||[],generatedAt:new Date().toISOString(),notes:{expectedNoise:'Expired or missing customer/staff sessions (HTTP 401) are authentication events, not platform incidents.',history:'System Health records scheduled cron reliability from this release onward; older Vercel logs are not backfilled.'}});
  }catch(error){return safeError(res,error)}
};
