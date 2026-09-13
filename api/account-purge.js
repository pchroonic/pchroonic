const {json,db,authAdmin,env,safeError}=require('../lib/server');
const {recordHealthState}=require('../lib/system-health');
module.exports=async function(req,res){const startedMs=Date.now(),startedAt=new Date(startedMs).toISOString();let authorized=false;try{
  if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
  const secret=env('CRON_SECRET');
  if(!secret)return json(res,503,{ok:false,error:'CRON_SECRET is not configured.'});
  const auth=req.headers.authorization||req.headers.Authorization||'';
  if(auth!==`Bearer ${secret}`)return json(res,401,{ok:false,error:'Unauthorized'});
  authorized=true;
  const now=new Date().toISOString();
  const rows=await db(`account_deletion_requests?status=eq.verified&delete_after=lte.${encodeURIComponent(now)}&select=id,customer_id&limit=100`);
  let deleted=0,failed=0;
  for(const row of rows||[]){try{await authAdmin(`users/${encodeURIComponent(row.customer_id)}`,{method:'DELETE'});deleted++}catch(e){failed++;console.error('Account purge failed',row.customer_id,e.message)}}
  const healthStatus=failed>0?'warning':'healthy';
  await recordHealthState({component:'account_purge',status:healthStatus,summary:failed>0?`${failed} account deletion${failed===1?'':'s'} could not be purged`:'Account purge completed normally',source:'vercel_cron',startedAt,durationMs:Date.now()-startedMs,details:{checked:rows?.length||0,deleted,failed},fingerprint:'account-purge-degraded',title:'Namdar account purge needs attention',message:`${failed} verified account deletion${failed===1?'':'s'} could not be completed. Open System Health for details.`}).catch(error=>console.error('Could not record account purge health',error?.status||'',error?.message||error));
  return json(res,200,{ok:failed===0,degraded:failed>0,checked:rows?.length||0,deleted,failed});
}catch(e){if(authorized)await recordHealthState({component:'account_purge',status:'failing',summary:'Account purge stopped before completion',source:'vercel_cron',startedAt,durationMs:Date.now()-startedMs,details:{errorClass:e?.status===504?'gateway_timeout':'runtime_error'},fingerprint:'account-purge-degraded',title:'Namdar account purge is failing',message:'The scheduled account-deletion purge stopped before completion. Open System Health for details.'}).catch(()=>null);return safeError(res,e)}};
