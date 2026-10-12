const {json,requireStaff,safeError,queryParam}=require('../lib/server');
const {sha256,verified}=require('../lib/area-seo-publication');
const areas=new Set(['lambeth','lewisham','southwark','wandsworth','greenwich']);
const project='prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC',team='team_8Az8WtWcnfwtYRdhR8vGqC3L';
async function fetchJson(url,headers={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
 try{const r=await fetch(url,{headers,signal:controller.signal,cache:'no-store'});if(!r.ok)throw Error('Source returned HTTP '+r.status);return r.json();}
 finally{clearTimeout(timer);}
}
async function githubFile(area,sha,path){
 const token=process.env.GITHUB_TOKEN;
 const url='https://api.github.com/repos/pchroonic/pchroonic/contents/areas/'+area+path+'?ref='+encodeURIComponent(sha);
 const data=await fetchJson(url,{Accept:'application/vnd.github+json','User-Agent':'Namdar-SEO-verifier',...(token?{Authorization:'Bearer '+token}:{})});
 if(data.encoding!=='base64'||typeof data.content!=='string')throw Error('GitHub file cannot be verified');
 return Buffer.from(data.content.replace(/\s/g,''),'base64').toString('utf8');
}
module.exports=async(req,res)=>{
 try{
  if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
  const staff=await requireStaff(req,'settings');
  if(staff.profile.role!=='admin')return json(res,403,{ok:false,error:'Administrator required'});
  const area=String(queryParam(req,'area','')||'');
  if(!areas.has(area))return json(res,400,{ok:false,error:'Unsupported borough'});
  if(!process.env.VERCEL_TOKEN)return json(res,200,{ok:true,verified:false,reason:'Server-side VERCEL_TOKEN not configured',rollbackEnabled:false});
  const deployments=await fetchJson('https://api.vercel.com/v6/deployments?projectId='+project+'&teamId='+team+'&target=production&limit=8',{Authorization:'Bearer '+process.env.VERCEL_TOKEN});
  const recent=(deployments.deployments||[]).filter(d=>d.state==='READY'&&/^[a-f0-9]{40}$/.test(d.meta?.githubCommitSha||''));
  const liveBase='https://namdar.co.uk/areas/'+area;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
  let liveHtml,liveManifest;
  try{
   const [page,manifest]=await Promise.all([fetch(liveBase,{signal:controller.signal,cache:'no-store'}),fetch(liveBase+'.publication.json',{signal:controller.signal,cache:'no-store'})]);
   if(!page.ok||!manifest.ok)return json(res,200,{ok:true,verified:false,reason:'Public page or publication manifest missing',rollbackEnabled:false});
   liveHtml=await page.text();liveManifest=await manifest.json();
  }finally{clearTimeout(timer);}
  if(!verified(liveManifest,liveHtml,area))return json(res,200,{ok:true,verified:false,reason:'Live HTML and manifest fingerprint do not match',rollbackEnabled:false});
  for(const deployment of recent){
   try{
    const sha=deployment.meta.githubCommitSha;
    const [page,manifestText]=await Promise.all([githubFile(area,sha,'.html'),githubFile(area,sha,'.publication.json')]);
    const manifest=JSON.parse(manifestText);
    if(!verified(manifest,page,area)||sha256(page)!==sha256(liveHtml)||JSON.stringify(manifest)!==JSON.stringify(liveManifest))continue;
    return json(res,200,{ok:true,verified:true,area,draftRevision:manifest.draftRevision,commitSha:sha,deploymentId:deployment.uid||deployment.id,htmlSha256:manifest.htmlSha256,reason:'Exact public HTML and manifest match checked-in files at this READY production deployment commit. This does not prove Google indexing or that the commit is the current production alias.',rollbackEnabled:false});
   }catch(_){/* A missing manifest at an older commit cannot establish publication. */}
  }
  return json(res,200,{ok:true,verified:false,reason:'Live page matches manifest, but no recent ready deployment Git commit could be independently matched',rollbackEnabled:false});
 }catch(e){return safeError(res,e)}
};
