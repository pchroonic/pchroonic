const {json,parseBody,db,requireStaff,sendEmail,auditLog,safeError}=require('../lib/server');

const TYPES=new Set(['access','portability','rectification','erasure','restriction','objection','marketing','other']);
const STATUSES=new Set(['received','identity_check','in_progress','completed','refused','cancelled']);
const IDENTITIES=new Set(['verified','needs_verification']);
const SOURCES=new Set(['portal','email','phone','in_person','other']);
const FINISHED=new Set(['completed','refused','cancelled']);

function cleanText(value,max=4000){return String(value||'').trim().slice(0,max)}
async function rowById(id){return (await db(`privacy_requests?id=eq.${encodeURIComponent(id)}&select=*&limit=1`))?.[0]||null}
async function matchingCustomer(email){return (await db(`profiles?role=eq.customer&email=eq.${encodeURIComponent(email)}&select=id,full_name,email&limit=1`).catch(()=>[]))?.[0]||null}

module.exports=async function handler(req,res){
  try{
    const staff=await requireStaff(req,'legal');
    if(req.method==='GET'){
      const rows=await db('privacy_requests?select=*&order=requested_at.desc&limit=500');
      const now=Date.now(),open=(rows||[]).filter(r=>!FINISHED.has(r.status)),dueSoon=open.filter(r=>{const d=new Date(r.due_at).getTime();return Number.isFinite(d)&&d>=now&&d-now<=7*86400000}),overdue=open.filter(r=>new Date(r.due_at).getTime()<now);
      return json(res,200,{ok:true,requests:rows||[],stats:{total:(rows||[]).length,open:open.length,dueSoon:dueSoon.length,overdue:overdue.length}});
    }
    if(req.method==='POST'){
      const b=parseBody(req),requestType=String(b.requestType||'').toLowerCase(),source=String(b.source||'other').toLowerCase(),email=cleanText(b.email,320).toLowerCase(),name=cleanText(b.name,200),details=cleanText(b.details,4000);
      if(!TYPES.has(requestType))return json(res,400,{ok:false,error:'Choose a valid privacy request type.'});
      if(!SOURCES.has(source))return json(res,400,{ok:false,error:'Choose a valid request source.'});
      if(!email.includes('@'))return json(res,400,{ok:false,error:'A valid requester email is required so the response can be delivered.'});
      const customer=await matchingCustomer(email);
      const row=(await db('privacy_requests',{method:'POST',prefer:'return=representation',body:{customer_id:customer?.id||null,requester_email:email,requester_name:name||customer?.full_name||null,request_type:requestType,details:details||null,identity_status:'needs_verification',status:'identity_check',source,created_by_staff:staff.user.id}}))?.[0];
      if(!row)throw new Error('Could not record privacy request.');
      await auditLog(req,staff,{action:'privacy.request_create',entityType:'privacy_request',entityId:row.id,summary:`Recorded ${requestType} privacy request from ${email}`,after:{request_type:requestType,source,status:row.status,identity_status:row.identity_status,due_at:row.due_at,customer_id:row.customer_id}});
      await sendEmail({to:email,subject:'Namdar has recorded your privacy request',html:`<p>We have recorded your Namdar privacy request.</p><p>Reference: <strong>${String(row.id).slice(0,8).toUpperCase()}</strong><br>Target response date: <strong>${new Date(row.due_at).toLocaleDateString('en-GB')}</strong></p><p>We may contact you if we need reasonable information to confirm your identity before disclosing or changing personal information.</p>`,archiveForCustomer:!!customer?.id,customerId:customer?.id||null,messageCategory:'account',targetPath:'/account?tab=privacy',messageKey:`privacy-request:${row.id}:manual-received`}).catch(()=>null);
      return json(res,201,{ok:true,request:row});
    }
    if(req.method==='PATCH'){
      const b=parseBody(req),id=String(b.id||'').trim();if(!id)return json(res,400,{ok:false,error:'Privacy request id is required.'});
      const before=await rowById(id);if(!before)return json(res,404,{ok:false,error:'Privacy request not found.'});
      const patch={updated_at:new Date().toISOString()};
      if(b.status!==undefined){const status=String(b.status||'').toLowerCase();if(!STATUSES.has(status))return json(res,400,{ok:false,error:'Invalid privacy request status.'});patch.status=status;patch.completed_at=FINISHED.has(status)?(before.completed_at||new Date().toISOString()):null}
      if(b.identityStatus!==undefined){const identity=String(b.identityStatus||'').toLowerCase();if(!IDENTITIES.has(identity))return json(res,400,{ok:false,error:'Invalid identity status.'});patch.identity_status=identity}
      if(b.responseSummary!==undefined)patch.response_summary=cleanText(b.responseSummary,6000)||null;
      if(b.adminNotes!==undefined)patch.admin_notes=cleanText(b.adminNotes,6000)||null;
      const finalStatus=patch.status||before.status,finalSummary=patch.response_summary===undefined?before.response_summary:patch.response_summary;
      if(['completed','refused'].includes(finalStatus)&&!cleanText(finalSummary,6000))return json(res,400,{ok:false,error:'Add a customer-facing response summary before completing or refusing a privacy request.'});
      const after=(await db(`privacy_requests?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=representation',body:patch}))?.[0]||await rowById(id);
      await auditLog(req,staff,{action:'privacy.request_update',entityType:'privacy_request',entityId:id,summary:`Updated ${before.request_type} privacy request`,before:{status:before.status,identity_status:before.identity_status,due_at:before.due_at,response_summary:before.response_summary,admin_notes:before.admin_notes},after:{status:after.status,identity_status:after.identity_status,due_at:after.due_at,response_summary:after.response_summary,admin_notes:after.admin_notes}});
      if(before.status!==after.status&&['completed','refused'].includes(after.status)){
        const label=after.status==='completed'?'completed':'reviewed';
        await sendEmail({to:after.requester_email,subject:`Your Namdar privacy request has been ${label}`,html:`<p>Your Namdar privacy request <strong>${String(after.id).slice(0,8).toUpperCase()}</strong> has been ${label}.</p><p><strong>Response:</strong><br>${String(after.response_summary||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])).replace(/\n/g,'<br>')}</p><p>If you have questions about this response, contact support@namdar.co.uk. You can also find information about complaining to the ICO in our Privacy Policy.</p>`,archiveForCustomer:!!after.customer_id,customerId:after.customer_id||null,messageCategory:'account',targetPath:'/account?tab=privacy',messageKey:`privacy-request:${after.id}:${after.status}`}).catch(()=>null);
      }
      return json(res,200,{ok:true,request:after});
    }
    return json(res,405,{ok:false,error:'Method not allowed'});
  }catch(error){return safeError(res,error)}
};
