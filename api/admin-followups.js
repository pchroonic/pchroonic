const { json, parseBody, queryParam, db, requireStaff, processBusinessFollowUps, auditLog, safeError } = require('../lib/server');
const VALID_STATUS=new Set(['all','pending','sending','sent','failed','cancelled']);
const VALID_TYPES=new Set(['all','quote_reminder','invoice_overdue','booking_cancel_followup','booking_attention','unassigned_staff']);
module.exports=async function handler(req,res){
  try{
    const staff=await requireStaff(req,'analytics');
    if(req.method==='GET'){
      const status=String(queryParam(req,'status')||'all'),type=String(queryParam(req,'type')||'all');
      if(!VALID_STATUS.has(status)||!VALID_TYPES.has(type))return json(res,400,{ok:false,error:'Invalid follow-up filter.'});
      let q='business_notifications?select=*&order=created_at.desc&limit=400';if(status!=='all')q+=`&status=eq.${encodeURIComponent(status)}`;if(type!=='all')q+=`&notification_type=eq.${encodeURIComponent(type)}`;
      const rows=await db(q),all=await db('business_notifications?select=id,status,notification_type,due_at,sent_at&order=created_at.desc&limit=1000');
      const stats={total:(all||[]).length,pending:0,sent:0,failed:0,cancelled:0,dueNow:0};const now=Date.now();for(const r of all||[]){if(stats[r.status]!==undefined)stats[r.status]++;if(r.status==='pending'&&new Date(r.due_at).getTime()<=now)stats.dueNow++}
      return json(res,200,{ok:true,rows,stats,rules:{quoteReminders:'2 and 7 days after a final quote is sent, while still valid',invoiceReminders:'1, 8, 15 and 29 days after an unpaid invoice becomes overdue',unassignedStaff:'alert within 24 hours of an upcoming confirmed job',bookingAttention:'alert when a confirmed job is still Scheduled more than 2 hours after its end time',cancelFollowUp:'customer follow-up the next morning after an approved/direct cancellation'}});
    }
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const b=parseBody(req),action=String(b.action||'');
    if(action==='run'){const result=await processBusinessFollowUps(100);await auditLog(req,staff,{action:'followup.run',entityType:'business_notifications',summary:'Ran business follow-up check',after:result});return json(res,200,{ok:true,result})}
    const id=String(b.id||'').trim();if(!id)return json(res,400,{ok:false,error:'Follow-up ID is required.'});
    const row=(await db(`business_notifications?id=eq.${encodeURIComponent(id)}&select=*&limit=1`))?.[0];if(!row)return json(res,404,{ok:false,error:'Follow-up not found.'});
    if(action==='retry'){
      if(row.status==='sent')return json(res,409,{ok:false,error:'A sent follow-up cannot be retried.'});
      const updated=(await db(`business_notifications?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=representation',body:{status:'pending',attempts:0,due_at:new Date().toISOString(),error:null,updated_at:new Date().toISOString()}}))?.[0];await auditLog(req,staff,{action:'followup.retry',entityType:'business_notification',entityId:id,summary:'Retried business follow-up',before:row,after:updated});return json(res,200,{ok:true,row:updated});
    }
    if(action==='cancel'){
      if(!['pending','failed'].includes(row.status))return json(res,409,{ok:false,error:'Only pending or failed follow-ups can be cancelled.'});
      const updated=(await db(`business_notifications?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=representation',body:{status:'cancelled',updated_at:new Date().toISOString()}}))?.[0];await auditLog(req,staff,{action:'followup.cancel',entityType:'business_notification',entityId:id,summary:'Cancelled business follow-up',before:row,after:updated});return json(res,200,{ok:true,row:updated});
    }
    return json(res,400,{ok:false,error:'Unknown follow-up action.'});
  }catch(e){return safeError(res,e)}
};
