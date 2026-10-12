const {json,requireStaff,safeError}=require('../lib/server');
module.exports=async function(req,res){
 try{
  if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
  const staff=await requireStaff(req,'settings');
  if(staff.profile.role!=='admin')return json(res,403,{ok:false,error:'Administrator access required'});
  const token=process.env.VERCEL_TOKEN;
  if(!token)return json(res,200,{ok:true,configured:false,deployments:[],message:'Vercel read-only history requires a server-side VERCEL_TOKEN. No rollback action is enabled.'});
  const project='prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC',team='team_8Az8WtWcnfwtYRdhR8vGqC3L';
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  let response;
  try{response=await fetch('https://api.vercel.com/v6/deployments?projectId='+encodeURIComponent(project)+'&teamId='+encodeURIComponent(team)+'&target=production&limit=12',{headers:{Authorization:'Bearer '+token},signal:controller.signal});}
  finally{clearTimeout(timeout);}
  if(!response.ok)throw Object.assign(new Error('Vercel history request failed'),{status:502});
  const data=await response.json();
  const deployments=(Array.isArray(data.deployments)?data.deployments:[]).map(x=>({
   id:String(x.uid||x.id||'').slice(0,120),state:String(x.state||x.readyState||'unknown').slice(0,30),
   created:Number(x.created||0),sha:String(x.meta?.githubCommitSha||'').slice(0,40),
   rollbackCandidate:x.isRollbackCandidate===true,url:/^[a-z0-9.-]+\.vercel\.app$/i.test(x.url||'')?'https://'+x.url:null
  }));
  return json(res,200,{ok:true,configured:true,deployments,message:'Read-only production deployment history. Rollback requires a separate reviewed operation.'});
 }catch(e){return safeError(res,e)}
};
