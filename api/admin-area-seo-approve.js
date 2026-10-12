const {json,parseBody,db,requireStaff,auditLog,safeError}=require('../lib/server');
const AREAS=new Set(['lewisham','southwark','lambeth','wandsworth','greenwich']);
module.exports=async function(req,res){
 try{
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
  const staff=await requireStaff(req,'settings');
  if(staff.profile.role!=='admin')return json(res,403,{ok:false,error:'Administrator approval required'});
  const body=parseBody(req),area=String(body.area||'').toLowerCase();
  if(!AREAS.has(area))return json(res,400,{ok:false,error:'Invalid borough'});
  const rows=await db('site_settings?key=eq.area_seo_drafts&select=value&limit=1');
  const drafts=rows?.[0]?.value||{},draft=drafts[area];
  if(!draft||draft.status!=='review_requested')return json(res,409,{ok:false,error:'This draft is not awaiting review'});
  if(!draft.title||!draft.metaDescription||!draft.heading||!draft.intro||Boolean(draft.faqQuestion)!==Boolean(draft.faqAnswer))
   return json(res,422,{ok:false,error:'Required SEO content incomplete'});
  if(draft.updatedAt!==body.expectedUpdatedAt||draft.reviewRequestedAt!==body.expectedReviewRequestedAt)
   return json(res,409,{ok:false,error:'Draft changed; reload before approval'});
  const approvedAt=new Date().toISOString();
  const approved={...draft,status:'approved_for_deployment',approvedAt,approvedBy:staff.user.id};
  const history=(Array.isArray(drafts._approvalHistory)?drafts._approvalHistory:[]).slice(-49);
  history.push({area,approvedAt,approvedBy:staff.user.id,revision:draft.updatedAt,title:draft.title});
  const value={...drafts,[area]:approved,_approvalHistory:history};
  await db('site_settings?key=eq.area_seo_drafts',{method:'PATCH',body:{value,updated_at:approvedAt}});
  await auditLog(req,staff,{action:'area_seo_approval',entityType:'area_seo_draft',entityId:area,summary:'Approved SEO content for reviewed deployment (not published)'});
  return json(res,200,{ok:true,status:'approved_for_deployment',approvedAt,message:'Approved for deployment review. Public website unchanged.'});
 }catch(e){return safeError(res,e)}
};