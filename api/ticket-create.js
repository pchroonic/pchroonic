const {json,parseBody,db,authUser,userProfile,sendEmail,escapeHtml,env,createStaffNotification,safeError,isManagedInboxAddress}=require('../lib/server');
module.exports=async function(req,res){try{
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
  const b=parseBody(req);
  const user=await authUser(req);if(!user?.id)return json(res,401,{ok:false,error:'Please sign in to My Namdar to open a support ticket.'});
  const profile=await userProfile(user.id);
  if(!profile||profile.role!=='customer'||(profile.account_status&&profile.account_status!=='active'))return json(res,403,{ok:false,error:'This account cannot open customer support tickets.'});
  const relationships=await Promise.all([
    db(`quotes?customer_id=eq.${encodeURIComponent(user.id)}&select=id&limit=1`),
    db(`bookings?customer_id=eq.${encodeURIComponent(user.id)}&select=id&limit=1`),
    db(`service_subscriptions?customer_id=eq.${encodeURIComponent(user.id)}&select=id&limit=1`),
    db(`customer_projects?customer_id=eq.${encodeURIComponent(user.id)}&select=id&limit=1`)
  ]);
  if(!relationships.some(rows=>rows?.length))return json(res,403,{ok:false,error:'Support tickets become available after you have a Namdar quote, booking, subscription or project. For a new enquiry, request a quote or email support@namdar.co.uk.'});
  const name=String(profile.full_name||'').trim().slice(0,120);
  const email=String(user.email||'').trim().toLowerCase().slice(0,180);
  const subject=String(b.subject||'Website enquiry').trim().slice(0,180);
  const category=String(b.category||'general').trim().slice(0,60);
  const message=String(b.message||'').trim().slice(0,6000);
  if(!name||!email.includes('@')||message.length<3)return json(res,400,{ok:false,error:'Please complete your name, email and message.'});
  const customerFilter=`customer_id=eq.${encodeURIComponent(user.id)}`;
  const open=await db(`support_tickets?${customerFilter}&status=in.(awaiting_staff,awaiting_customer)&or=(source.is.null,source.neq.email)&select=id,ticket_no,subject,status&order=updated_at.desc&limit=1`);
  if(open?.length)return json(res,409,{ok:false,error:open[0].status==='awaiting_staff'?`You already have ticket #${open[0].ticket_no} waiting for a Namdar reply. Please wait for the team to respond.`:`Ticket #${open[0].ticket_no} is still open. Continue that conversation from your Namdar account before opening another ticket.`,ticket:open[0]});
  const rows=await db('support_tickets',{method:'POST',prefer:'return=representation',body:{customer_id:user.id,guest_email:null,guest_name:null,subject,category,status:'awaiting_staff',source:'website',last_customer_reply_at:new Date().toISOString()}});
  const ticket=rows?.[0];
  await db('support_ticket_messages',{method:'POST',body:{ticket_id:ticket.id,sender_id:user.id,sender_role:'customer',sender_name:name,sender_email:email,message}});
  await db('contact_messages',{method:'POST',body:{customer_id:user?.id||null,name,email,message:`[Ticket #${ticket.ticket_no}] ${subject}\n\n${message}`,status:'ticketed'}}).catch(()=>null);
  await createStaffNotification({type:'support_ticket',title:`New support ticket #${ticket.ticket_no}`,body:`${name} · ${subject}`,targetPath:`/admin?tab=tickets&ticket=${encodeURIComponent(ticket.id)}`,permissionKey:'tickets',entityType:'support_ticket',entityId:ticket.id,priority:'high',dedupeKey:`ticket-new:${ticket.id}`});const notify=env('NAMDAR_NOTIFY_EMAIL')||env('NAMDAR_SUPPORT_EMAIL','support@namdar.co.uk');
  if(notify&&!isManagedInboxAddress(notify))await sendEmail({to:notify,subject:`Namdar ticket #${ticket.ticket_no} — ${subject}`,html:`<h2>New support ticket #${ticket.ticket_no}</h2><p><strong>${escapeHtml(name)}</strong> · ${escapeHtml(email)}</p><p>${escapeHtml(message).replace(/\n/g,'<br>')}</p><p><a href="https://namdar.co.uk/admin">Open Namdar admin</a></p>`});
  await sendEmail({to:email,subject:`Namdar support ticket #${ticket.ticket_no}`,html:`<p>Hi ${escapeHtml(name)},</p><p>We received your enquiry as ticket <strong>#${ticket.ticket_no}</strong>.</p><p><a href="https://namdar.co.uk/account?tab=support">Open support in My Namdar</a> to follow the ticket.</p><p>Namdar Support</p>`,archiveForCustomer:true,customerId:user?.id||null,messageCategory:'support',targetPath:'/account?tab=support'});
  return json(res,201,{ok:true,ticket:{id:ticket.id,ticketNo:ticket.ticket_no,status:ticket.status},requiresAccount:false});
}catch(e){return safeError(res,e)}};
