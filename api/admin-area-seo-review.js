const {json,parseBody,db,requireStaff,safeError}=require('../lib/server');
const AREAS=new Set(['lewisham','southwark','lambeth','wandsworth','greenwich']);
module.exports=async function(req,res){
 try{
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
  const staff=await requireStaff(req,'settings'),body=parseBody(req),area=String(body.area||'');
  if(!AREAS.has(area)||typeof body.expectedVersion!=='string')return json(res,400,{ok:false,error:'Invalid area or revision'});
  const rows=await db('site_settings?key=eq.area_seo_drafts&select=value,updated_at&limit=1');
  const row=rows?.[0],draft=row?.value?.[area];
  if(!row||row.updated_at!==body.expectedVersion||!draft||draft.status!=='draft')return json(res,409,{ok:false,error:'Draft changed or is not ready; reload'});
  if(!draft.title||!draft.metaDescription||!draft.heading||!draft.intro||Boolean(draft.faqQuestion)!==Boolean(draft.faqAnswer))return json(res,422,{ok:false,error:'Incomplete content'});
  const now=new Date().toISOString();
  const value={...row.value,[area]:{...draft,status:'review_requested',reviewRequestedAt:now}};
  const filter='site_settings?key=eq.area_seo_drafts&updated_at=eq.'+encodeURIComponent(row.updated_at)+'&select=value,updated_at';
  const saved=await db(filter,{method:'PATCH',prefer:'return=representation',body:{value,updated_at:now,updated_by:staff.user.id}});
  if(!saved?.length)return json(res,409,{ok:false,error:'Draft was updated concurrently; reload'});
  return json(res,200,{ok:true,version:saved[0].updated_at,draft:saved[0].value[area],message:'Review requested; public page unchanged'});
 }catch(e){return safeError(res,e)}
};
