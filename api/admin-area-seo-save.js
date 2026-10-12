const {json,parseBody,db,requireStaff,safeError}=require('../lib/server');
const allowed=new Set(['lewisham','southwark','lambeth','wandsworth','greenwich']);
function invalid(error,status=400){const e=new Error(error);e.status=status;return e;}
function validDraft(d){
 const fields={title:100,metaDescription:300,heading:120,intro:1200,faqQuestion:200,faqAnswer:1000};
 if(!d||typeof d!=='object'||Array.isArray(d))throw invalid('Invalid draft');
 const result={};
 for(const [key,max] of Object.entries(fields)){
  if(d[key]!==undefined&&typeof d[key]!=='string')throw invalid('Invalid '+key);
  result[key]=String(d[key]||'').trim();
  if(result[key].length>max)throw invalid(key+' too long');
 }
 if(!result.title||!result.metaDescription)throw invalid('Title and description required');
 return result;
}
module.exports=async function(req,res){
 try{
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
  const staff=await requireStaff(req,'settings');
  const input=parseBody(req),area=String(input.area||'');
  if(!allowed.has(area))throw invalid('Unsupported borough');
  const fields=validDraft(input.draft);
  if(input.expectedVersion!==null&&typeof input.expectedVersion!=='string')throw invalid('Invalid revision');
  const rows=await db('site_settings?key=eq.area_seo_drafts&select=value,updated_at&limit=1');
  const row=rows?.[0]||null;
  if((row?.updated_at||null)!==input.expectedVersion)throw invalid('Draft changed elsewhere; reload before saving',409);
  const stamp=new Date().toISOString();
  const value={...(row?.value||{}),[area]:{...fields,updatedAt:stamp,status:'draft'}};
  let saved;
  if(row){
   const filter='site_settings?key=eq.area_seo_drafts&updated_at=eq.'+encodeURIComponent(row.updated_at)+'&select=value,updated_at';
   saved=await db(filter,{method:'PATCH',prefer:'return=representation',body:{value,updated_at:stamp,updated_by:staff.user.id}});
  }else{
   saved=await db('site_settings?on_conflict=key&select=value,updated_at',{method:'POST',prefer:'return=representation',body:{key:'area_seo_drafts',value,updated_at:stamp,updated_by:staff.user.id}});
  }
  if(!saved?.length)throw invalid('Draft changed during save; reload before retrying',409);
  return json(res,200,{ok:true,version:saved[0].updated_at,draft:saved[0].value[area]});
 }catch(e){
  if(e.status===409||e.code==='23505')return json(res,409,{ok:false,error:'Another change was saved first. Reload before retrying.'});
  return safeError(res,e);
 }
};
