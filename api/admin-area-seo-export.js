const {json,db,requireStaff,safeError,queryParam}=require('../lib/server');
const crypto=require('node:crypto');
const AREAS=new Set(['lewisham','southwark','lambeth','wandsworth','greenwich']);
function makeExport(area,draft){
 const fields=['title','metaDescription','heading','intro','faqQuestion','faqAnswer'];
 if(draft?.status!=='approved_for_deployment'||!draft.approvedAt||!draft.approvedBy||!draft.updatedAt)throw Object.assign(new Error('Not an approved draft'),{status:409});
 const out={schemaVersion:1,area,status:draft.status,approvedAt:draft.approvedAt,approvedBy:draft.approvedBy,updatedAt:draft.updatedAt};
 for(const key of fields)out[key]=String(draft[key]||'');
 if(!out.title||!out.metaDescription||!out.heading||!out.intro||Boolean(out.faqQuestion)!==Boolean(out.faqAnswer))throw Object.assign(new Error('Approved draft incomplete'),{status:422});
 out.fingerprint=crypto.createHash('sha256').update(JSON.stringify(out)).digest('hex');
 return out;
}
module.exports=async function(req,res){
 try{
  if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
  const staff=await requireStaff(req,'settings');
  if(staff.profile.role!=='admin')return json(res,403,{ok:false,error:'Administrator required'});
  const area=String(queryParam(req,'area','')||'').toLowerCase();
  if(!AREAS.has(area))return json(res,400,{ok:false,error:'Unsupported area'});
  const rows=await db('site_settings?key=eq.area_seo_drafts&select=value&limit=1');
  const draft=rows?.[0]?.value?.[area];
  return json(res,200,{ok:true,export:makeExport(area,draft),publication:'NOT_PUBLISHED',nextStep:'Independently review Git diff and deploy through protected GitHub/Vercel workflow'});
 }catch(e){return safeError(res,e)}
};
module.exports.makeExport=makeExport;
