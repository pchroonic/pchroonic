const {json,parseBody,db,requireStaff,auditLog,safeError}=require('../lib/server');

function normalizeReviewUrl(value=''){
  const raw=String(value||'').trim();
  if(!raw)return '';
  let url;
  try{url=new URL(raw)}catch{return null}
  if(url.protocol!=='https:')return null;
  const host=url.hostname.toLowerCase();
  const googleHost=host==='google.com'||host.endsWith('.google.com')||host==='g.page'||host==='goo.gl'||host.endsWith('.goo.gl');
  return googleHost?url.href:null;
}
async function currentRow(){return (await db('site_settings?key=eq.reviews&select=*&limit=1').catch(()=>[]))?.[0]||null}
function canEdit(staff){return staff?.profile?.role==='admin'||staff?.permissions?.all===true||staff?.permissions?.settings===true}

module.exports=async function handler(req,res){
  try{
    if(req.method==='GET'){
      const staff=await requireStaff(req,'bookings');
      const row=await currentRow();
      return json(res,200,{ok:true,canEdit:canEdit(staff),publicReviewUrl:String(row?.value?.public_review_url||'')});
    }
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const staff=await requireStaff(req,'settings'),body=parseBody(req);
    const publicReviewUrl=normalizeReviewUrl(body.publicReviewUrl);
    if(publicReviewUrl===null)return json(res,400,{ok:false,error:'Use an official HTTPS Google review link.'});
    const before=await currentRow(),now=new Date().toISOString();
    await db('site_settings?on_conflict=key',{method:'POST',prefer:'resolution=merge-duplicates,return=representation',body:{
      key:'reviews',
      value:{...(before?.value||{}),public_review_url:publicReviewUrl},
      updated_by:staff.user.id,updated_at:now
    }});
    const after=await currentRow();
    await auditLog(req,staff,{action:'reviews.settings_update',entityType:'site_settings',entityId:'reviews',summary:publicReviewUrl?'Updated public Google review link':'Disabled public Google review link',before,after});
    return json(res,200,{ok:true,canEdit:true,publicReviewUrl});
  }catch(error){return safeError(res,error)}
};

module.exports.normalizeReviewUrl=normalizeReviewUrl;
