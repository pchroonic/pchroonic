const {json,db,authAdmin,env,safeError}=require('../lib/server');
module.exports=async function(req,res){try{
  if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
  const secret=env('CRON_SECRET');
  if(!secret)return json(res,503,{ok:false,error:'CRON_SECRET is not configured.'});
  const auth=req.headers.authorization||req.headers.Authorization||'';
  if(auth!==`Bearer ${secret}`)return json(res,401,{ok:false,error:'Unauthorized'});
  const now=new Date().toISOString();
  const rows=await db(`account_deletion_requests?status=eq.verified&delete_after=lte.${encodeURIComponent(now)}&select=id,customer_id&limit=100`);
  let deleted=0,failed=0;
  for(const row of rows||[]){try{await authAdmin(`users/${encodeURIComponent(row.customer_id)}`,{method:'DELETE'});deleted++}catch(e){failed++;console.error('Account purge failed',row.customer_id,e.message)}}
  return json(res,200,{ok:true,checked:rows?.length||0,deleted,failed});
}catch(e){return safeError(res,e)}};
