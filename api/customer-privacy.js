const {json,parseBody,db,requireCustomer,sendEmail,safeError}=require('../lib/server');

const TYPES=new Set(['access','portability','rectification','erasure','restriction','objection','marketing','other']);
const OPEN=new Set(['received','identity_check','in_progress']);
const LABELS={access:'access to your personal information',portability:'data portability',rectification:'correction of your information',erasure:'erasure of your information',restriction:'restriction of processing',objection:'an objection to processing',marketing:'your marketing choices',other:'a privacy matter'};

function publicRow(row={}){
  return {id:row.id,requestType:row.request_type,status:row.status,identityStatus:row.identity_status,source:row.source,requestedAt:row.requested_at,dueAt:row.due_at,completedAt:row.completed_at,responseSummary:row.response_summary||''};
}

module.exports=async function handler(req,res){
  try{
    const {user,profile}=await requireCustomer(req);
    if(req.method==='GET'){
      const rows=await db(`privacy_requests?customer_id=eq.${encodeURIComponent(user.id)}&select=id,request_type,status,identity_status,source,requested_at,due_at,completed_at,response_summary&order=requested_at.desc&limit=100`);
      return json(res,200,{ok:true,requests:(rows||[]).map(publicRow)});
    }
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const body=parseBody(req),requestType=String(body.requestType||'').trim().toLowerCase(),details=String(body.details||'').trim();
    if(!TYPES.has(requestType))return json(res,400,{ok:false,error:'Choose a valid privacy request type.'});
    if(details.length>4000)return json(res,400,{ok:false,error:'Please keep the request details under 4,000 characters.'});
    const open=await db(`privacy_requests?customer_id=eq.${encodeURIComponent(user.id)}&status=in.(received,identity_check,in_progress)&select=id,status&limit=6`);
    if((open||[]).length>=5)return json(res,429,{ok:false,error:'You already have several privacy requests open. Please allow Namdar to respond before creating another.'});
    const row=(await db('privacy_requests',{method:'POST',prefer:'return=representation',body:{customer_id:user.id,requester_email:String(user.email||profile.email||'').trim().toLowerCase(),requester_name:profile.full_name||null,request_type:requestType,details:details||null,identity_status:'verified',status:'received',source:'portal'}}))?.[0];
    if(!row)throw new Error('Could not create privacy request.');
    const erasureNote=requestType==='erasure'?'<p>If you want to delete your whole Namdar account, you can also use <strong>My Namdar → Security → Delete my account</strong>. That separate flow includes email confirmation and a 30-day recovery period. Some records may still need to be retained where the law requires it.</p>':'';
    await sendEmail({to:user.email,subject:'We received your Namdar privacy request',html:`<p>Hi ${profile.full_name||'there'},</p><p>We received your request about <strong>${LABELS[requestType]}</strong>.</p><p>Reference: <strong>${String(row.id).slice(0,8).toUpperCase()}</strong><br>Target response date: <strong>${new Date(row.due_at).toLocaleDateString('en-GB')}</strong></p>${erasureNote}<p>You can track this request in My Namdar under Privacy &amp; data.</p>`,archiveForCustomer:true,customerId:user.id,messageCategory:'account',targetPath:'/account?tab=privacy',messageKey:`privacy-request:${row.id}:received`}).catch(()=>null);
    return json(res,201,{ok:true,request:publicRow(row),message:'Your privacy request has been recorded. You can track it in My Namdar.'});
  }catch(error){return safeError(res,error)}
};
