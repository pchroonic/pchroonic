const {json,parseBody,db,requireStaff,auditLog,safeError}=require('../lib/server');
const allowed=new Set(['lewisham','southwark','lambeth','wandsworth','greenwich']);
module.exports=async(req,res)=>{
 try{
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
  const staff=await requireStaff(req,'settings');
  if(staff.profile.role!=='admin')return json(res,403,{ok:false,error:'Administrator required'});
  const body=parseBody(req),area=String(body.area||''),revision=String(body.revision||'');
  if(!allowed.has(area)||!revision||revision.length>80)return json(res,400,{ok:false,error:'Choose an area and historical draft revision'});
  const rows=await db('site_settings?key=eq.area_seo_drafts&select=value,updated_at&limit=1');
  const row=rows?.[0],all=row?.value||{};
  if(!row||row.updated_at!==body.expectedVersion)return json(res,409,{ok:false,error:'Data changed; reload before requesting rollback'});
  const entry=(Array.isArray(all._revisions)?all._revisions:[]).find(x=>x.area===area&&x.timestamp===revision&&x.snapshot);
  if(!entry)return json(res,404,{ok:false,error:'Historical revision not found; no action taken'});
  const submittedAt=new Date().toISOString();
  const request={id:require('node:crypto').randomUUID(),area,revision,requestedAt:submittedAt,requestedBy:staff.user.id,status:'pending_manual_review',note:'No production rollback executed; review live Git changes, deployment history and quotation flow.'};
  const history=(Array.isArray(all._rollbackRequests)?all._rollbackRequests:[]).slice(-49).concat(request);
  const filter='site_settings?key=eq.area_seo_drafts&updated_at=eq.'+encodeURIComponent(row.updated_at)+'&select=updated_at';
  const saved=await db(filter,{method:'PATCH',prefer:'return=representation',body:{value:{...all,_rollbackRequests:history},updated_at:submittedAt,updated_by:staff.user.id}});
  if(!saved?.length)return json(res,409,{ok:false,error:'Conflict; reload and retry'});
  await auditLog(req,staff,{action:'area_seo_rollback_requested',entityType:'area_seo_draft',entityId:area,summary:'Manual rollback review requested (no deployment executed)'});
  return json(res,200,{ok:true,request,version:saved[0].updated_at,message:'Rollback review requested. No public site change made.'});
 }catch(e){return safeError(res,e)}
};
