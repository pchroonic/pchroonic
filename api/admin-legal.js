const {json,parseBody,db,requireStaff,sanitizeLegalHtml,auditLog,safeError}=require('../lib/server');
const SLUGS=new Set(['privacy','terms','cookies']);
module.exports=async function handler(req,res){
  try{
    const staff=await requireStaff(req,'legal');
    if(req.method!=='PATCH')return json(res,405,{ok:false,error:'Method not allowed'});
    const b=parseBody(req),slug=String(b.slug||'').trim().toLowerCase(),raw=String(b.contentHtml||'');
    if(!SLUGS.has(slug))return json(res,400,{ok:false,error:'Invalid legal document.'});
    const clean=sanitizeLegalHtml(raw);if(clean.replace(/<[^>]+>/g,'').trim().length<80)return json(res,400,{ok:false,error:'Legal document is too short to publish.'});
    const before=(await db(`legal_documents?slug=eq.${encodeURIComponent(slug)}&select=slug,title,content_html,version,published,updated_at&limit=1`))?.[0];if(!before)return json(res,404,{ok:false,error:'Legal document not found.'});
    const nextVersion=Math.max(1,Number(before.version||0)+1),after=(await db(`legal_documents?slug=eq.${encodeURIComponent(slug)}`,{method:'PATCH',prefer:'return=representation',body:{content_html:clean,version:nextVersion,published:true,updated_by:staff.user.id,updated_at:new Date().toISOString()}}))?.[0];
    await auditLog(req,staff,{action:'legal.publish',entityType:'legal_document',entityId:slug,summary:`Published ${before.title||slug} version ${nextVersion}`,before:{version:before.version,published:before.published,updated_at:before.updated_at},after:{version:nextVersion,published:true,updated_at:after?.updated_at||null}});
    return json(res,200,{ok:true,document:{slug,version:nextVersion,updatedAt:after?.updated_at||null}});
  }catch(error){return safeError(res,error)}
};
