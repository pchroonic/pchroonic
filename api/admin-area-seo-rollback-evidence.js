const {json,requireStaff,db,safeError}=require('../lib/server');
const allowed=new Set(['lewisham','southwark','lambeth','wandsworth','greenwich']);
module.exports=async(req,res)=>{
 try{
  if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
  const staff=await requireStaff(req,'settings');
  if(staff.profile.role!=='admin')return json(res,403,{ok:false,error:'Administrator required'});
  const rows=await db('site_settings?key=eq.area_seo_drafts&select=value&limit=1');
  const state=rows?.[0]?.value||{};
  const requests=(Array.isArray(state._rollbackRequests)?state._rollbackRequests:[]).filter(x=>allowed.has(x.area)).slice(-20).reverse();
  const token=process.env.VERCEL_TOKEN;
  let deployments=[],evidenceStatus='Vercel token not configured; deployment evidence unavailable';
  if(token){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
   try{
    const url='https://api.vercel.com/v6/deployments?projectId=prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC&teamId=team_8Az8WtWcnfwtYRdhR8vGqC3L&target=production&limit=30';
    const result=await fetch(url,{headers:{Authorization:'Bearer '+token},signal:controller.signal});
    if(!result.ok)throw Error('Vercel returned '+result.status);
    const data=await result.json();deployments=(Array.isArray(data.deployments)?data.deployments:[]).filter(d=>d.meta?.githubCommitSha).map(d=>({sha:String(d.meta.githubCommitSha),id:String(d.uid||d.id||''),state:String(d.state||d.readyState||''),created:Number(d.created||0)}));
    evidenceStatus='Production deployment list retrieved; these commits do not establish that any archived draft was deployed';
   }catch(e){evidenceStatus='Deployment evidence unavailable: '+String(e.message||e);}
   finally{clearTimeout(timer);}
  }
  const result=requests.map(request=>({id:request.id,area:request.area,revision:request.revision,requestedAt:request.requestedAt,status:request.status,verification:'UNVERIFIED_DRAFT_SNAPSHOT',matchingDeployment:null,reason:'No immutable mapping between this draft snapshot and a deployed Git commit. Do not automatically roll back.'}));
  return json(res,200,{ok:true,requests:result,productionCommits:deployments.slice(0,10),evidenceStatus,rollbackEnabled:false});
 }catch(e){return safeError(res,e)}
};
