const {json,parseBody,db,authUser,userProfile,requireStaff,auditLog,safeError,queryParam}=require('../lib/server');
function niceTicketAction(v){return ({close:'Closed',reopen:'Reopened',cancel:'Cancelled'}[v]||'Updated')}
module.exports=async function(req,res){try{
  if(!['PATCH','DELETE'].includes(req.method))return json(res,405,{ok:false,error:'Method not allowed'}); const b=parseBody(req); const id=String(b.ticketId||queryParam(req,'ticketId')||''); if(!id)return json(res,400,{ok:false,error:'Ticket id required.'});
  const user=await authUser(req); if(!user?.id)return json(res,401,{ok:false,error:'Please sign in.'}); const profile=await userProfile(user.id); const rows=await db(`support_tickets?id=eq.${encodeURIComponent(id)}&select=*`); const t=rows?.[0]; if(!t)return json(res,404,{ok:false,error:'Ticket not found.'});
  const staff=['admin','staff'].includes(profile?.role);
  let staffCtx=null;if(staff)staffCtx=await requireStaff(req,'tickets'); else if(t.customer_id!==user.id)return json(res,403,{ok:false,error:'You cannot access this ticket.'});
  if(req.method==='DELETE'){if(!staff)return json(res,403,{ok:false,error:'Only Namdar staff can delete a ticket.'});await db(`support_tickets?id=eq.${encodeURIComponent(id)}`,{method:'DELETE'});await auditLog(req,staffCtx,{action:'ticket.delete',entityType:'support_ticket',entityId:id,summary:`Deleted support ticket #${t.ticket_no||''}`.trim(),before:t});return json(res,200,{ok:true,deleted:true})}
  const action=String(b.action||''); let status;
  if(!staff){if(action!=='cancel')return json(res,403,{ok:false,error:'Customers can only cancel their own ticket.'});status='cancelled'}
  else {status={close:'closed',reopen:'awaiting_staff',cancel:'cancelled'}[action];if(!status)return json(res,400,{ok:false,error:'Unknown ticket action.'})}
  await db(`support_tickets?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:{status,updated_at:new Date().toISOString(),closed_at:['closed','cancelled'].includes(status)?new Date().toISOString():null}});
  if(staff){const after={...t,status};await auditLog(req,staffCtx,{action:`ticket.${action}`,entityType:'support_ticket',entityId:id,summary:`${niceTicketAction(action)} ticket #${t.ticket_no||''}`.trim(),before:t,after})}
  return json(res,200,{ok:true,status});
}catch(e){return safeError(res,e)}};
