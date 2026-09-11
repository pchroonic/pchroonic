const {json,parseBody,db,authUser,userProfile,requireStaff,auditLog,sendEmail,escapeHtml,createStaffNotification,safeError}=require('../lib/server');
module.exports=async function(req,res){try{
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'}); const b=parseBody(req);
  const id=String(b.ticketId||''); const message=String(b.message||'').trim().slice(0,6000); if(!id||message.length<1)return json(res,400,{ok:false,error:'Ticket and reply are required.'});
  const user=await authUser(req); if(!user?.id)return json(res,401,{ok:false,error:'Please sign in.'}); const profile=await userProfile(user.id);
  const tickets=await db(`support_tickets?id=eq.${encodeURIComponent(id)}&select=*`); const t=tickets?.[0]; if(!t)return json(res,404,{ok:false,error:'Ticket not found.'});
  const staff=['admin','staff'].includes(profile?.role);
  let staffCtx=null;if(staff){staffCtx=await requireStaff(req,'tickets')} else if(t.customer_id!==user.id)return json(res,403,{ok:false,error:'You cannot access this ticket.'});
  if(!staff && t.status==='awaiting_staff')return json(res,409,{ok:false,error:'Please wait for Namdar to reply before sending another message.'});
  if(['closed','cancelled'].includes(t.status))return json(res,409,{ok:false,error:'This ticket is closed.'});
  await db('support_ticket_messages',{method:'POST',body:{ticket_id:t.id,sender_id:user.id,sender_role:staff?'staff':'customer',sender_name:profile?.full_name||user.email,sender_email:user.email,message}});
  const patch=staff?{status:'awaiting_customer',last_staff_reply_at:new Date().toISOString(),updated_at:new Date().toISOString()}:{status:'awaiting_staff',last_customer_reply_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  await db(`support_tickets?id=eq.${encodeURIComponent(t.id)}`,{method:'PATCH',body:patch});
  const customerEmail=t.customer_id?(await db(`profiles?id=eq.${encodeURIComponent(t.customer_id)}&select=email&limit=1`))?.[0]?.email:t.guest_email;
  if(staff&&customerEmail)await sendEmail({to:customerEmail,subject:`Namdar replied to ticket #${t.ticket_no}`,html:`<p>Namdar has replied to your support ticket <strong>#${t.ticket_no}</strong>.</p><blockquote>${escapeHtml(message).replace(/\n/g,'<br>')}</blockquote><p><a href="https://namdar.co.uk/account?tab=support">Open support in My Namdar</a></p>`,archiveForCustomer:true,customerId:t.customer_id||null,messageCategory:'support',targetPath:'/account?tab=support'});
  if(!staff)await createStaffNotification({type:'support_customer_reply',title:`Customer replied to ticket #${t.ticket_no}`,body:`${profile?.full_name||user.email} · ${t.subject}`,targetPath:`/admin?tab=tickets&ticket=${encodeURIComponent(t.id)}`,permissionKey:'tickets',entityType:'support_ticket',entityId:t.id,priority:t.priority||'normal',dedupeKey:`ticket-customer-reply:${t.id}:${Date.now()}`});
  if(staff)await auditLog(req,staffCtx,{action:'ticket.reply',entityType:'support_ticket',entityId:t.id,summary:`Replied to support ticket #${t.ticket_no||''}`.trim(),before:{status:t.status},after:{status:patch.status},metadata:{messageLength:message.length}});
  return json(res,200,{ok:true,status:patch.status});
}catch(e){return safeError(res,e)}};
