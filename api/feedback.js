const {json,queryParam,parseBody,db,sendEmail,escapeHtml,env,publicReviewUrl,createStaffNotification,safeError,isManagedInboxAddress}=require('../lib/server');
const SERVICE_LABELS={windows:'Window cleaning',gutters:'Gutter cleaning',roof:'Roof cleaning',jetwash:'Jet washing',handyman:'Handyman service',tour3d:'3D property tour'};
function cleanToken(v=''){const t=String(v||'').trim();return /^fb_[a-f0-9]{48}$/i.test(t)?t:''}
async function contextFor(row){
  const booking=(await db(`bookings?id=eq.${encodeURIComponent(row.booking_id)}&select=id,quote_id,customer_id,starts_at,completed_at,address,status,work_status&limit=1`))?.[0]||null;
  const quote=booking?.quote_id?(await db(`quotes?id=eq.${encodeURIComponent(booking.quote_id)}&select=id,customer_id,customer_name,email,phone,postcode,service_key&limit=1`))?.[0]||null:null;
  return {booking,quote};
}
async function routeToSupport(row,booking,quote,rating,comments){
  const email=String(quote?.email||'').trim().toLowerCase(),name=String(quote?.customer_name||'Customer').trim();
  const filter=row.customer_id?`customer_id=eq.${encodeURIComponent(row.customer_id)}`:(email?`guest_email=ilike.${encodeURIComponent(email)}`:'');
  let ticket=null;
  if(filter)ticket=(await db(`support_tickets?${filter}&status=in.(awaiting_staff,awaiting_customer)&or=(source.is.null,source.neq.email)&select=*&order=updated_at.desc&limit=1`))?.[0]||null;
  const service=SERVICE_LABELS[quote?.service_key]||'Namdar service',message=`Private service feedback: ${rating}/5 stars\nService: ${service}\nBooking: ${booking?.starts_at||'—'}\nAddress: ${booking?.address||'—'}\n\n${comments||'No written comment was provided.'}`;
  if(!ticket){
    ticket=(await db('support_tickets',{method:'POST',prefer:'return=representation',body:{customer_id:row.customer_id||null,guest_email:row.customer_id?null:(email||null),guest_name:row.customer_id?null:name,subject:`Service feedback: ${rating}/5 — ${service}`,category:'complaint',priority:rating===1?'urgent':'high',status:'awaiting_staff',source:'feedback',last_customer_reply_at:new Date().toISOString()}}))?.[0]||null;
  }else if(ticket.status!=='awaiting_staff'){
    ticket=(await db(`support_tickets?id=eq.${encodeURIComponent(ticket.id)}`,{method:'PATCH',prefer:'return=representation',body:{status:'awaiting_staff',last_customer_reply_at:new Date().toISOString(),updated_at:new Date().toISOString()}}))?.[0]||ticket;
  }
  if(ticket?.id)await db('support_ticket_messages',{method:'POST',body:{ticket_id:ticket.id,sender_id:row.customer_id||null,sender_role:row.customer_id?'customer':'guest',sender_name:name,sender_email:email||null,message}});
  await createStaffNotification({type:'feedback_attention',title:`Customer feedback needs attention · ${rating}/5`,body:`${name} · ${service}${comments?` · ${comments.slice(0,180)}`:''}`,targetPath:ticket?.id?`/admin?tab=tickets&ticket=${encodeURIComponent(ticket.id)}`:'/admin?tab=feedback',permissionKey:'tickets',entityType:ticket?.id?'support_ticket':'feedback',entityId:ticket?.id||row.id,priority:rating===1?'urgent':'high',dedupeKey:`feedback-attention:${row.id}`});
  const notify=env('NAMDAR_NOTIFY_EMAIL')||env('NAMDAR_SUPPORT_EMAIL','support@namdar.co.uk');
  if(notify&&!isManagedInboxAddress(notify))await sendEmail({to:notify,subject:`Private Namdar feedback: ${rating}/5 — ${name}`,html:`<p><strong>${escapeHtml(name)}</strong> rated their ${escapeHtml(service)} <strong>${rating}/5</strong>.</p><p>${escapeHtml(comments||'No written comment was provided.').replace(/\n/g,'<br>')}</p>${ticket?.ticket_no?`<p>Support ticket <strong>#${ticket.ticket_no}</strong> is waiting for the team.</p>`:''}<p><a href="https://namdar.co.uk/admin">Open Namdar Admin</a></p>`});
  if(email)await sendEmail({to:email,subject:'Thanks for your private feedback',html:`<p>Hi ${escapeHtml(name)},</p><p>Thank you for telling us about your experience. Your feedback has been sent privately to the Namdar support team and will not be posted publicly by us.</p><p>We'll review it and follow up if anything needs attention.</p>`,archiveForCustomer:true,customerId:row.customer_id||null,messageCategory:'support',targetPath:'/account?tab=support'});
  return ticket;
}
module.exports=async function handler(req,res){try{
  if(req.method==='GET'){
    const token=cleanToken(queryParam(req,'token'));if(!token)return json(res,400,{ok:false,error:'This feedback link is invalid.'});
    const row=(await db(`booking_feedback?token=eq.${encodeURIComponent(token)}&select=*&limit=1`))?.[0];if(!row)return json(res,404,{ok:false,error:'This feedback link could not be found.'});
    const {booking,quote}=await contextFor(row);if(!booking)return json(res,404,{ok:false,error:'The booking linked to this feedback no longer exists.'});
    const reviewUrl=await publicReviewUrl();
    return json(res,200,{ok:true,feedback:{submitted:!!row.submitted_at,rating:row.rating,status:row.status,comments:row.comments||'',publicReviewAvailable:!!reviewUrl},job:{service:SERVICE_LABELS[quote?.service_key]||'Namdar service',customerName:quote?.customer_name||'Customer',completedAt:booking.completed_at||booking.starts_at,address:booking.address||''},reviewUrl});
  }
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
  const b=parseBody(req),token=cleanToken(b.token);if(!token)return json(res,400,{ok:false,error:'This feedback link is invalid.'});
  let row=(await db(`booking_feedback?token=eq.${encodeURIComponent(token)}&select=*&limit=1`))?.[0];if(!row)return json(res,404,{ok:false,error:'This feedback link could not be found.'});
  if(b.action==='public_review_click'){
    const url=await publicReviewUrl();if(!url)return json(res,404,{ok:false,error:'Public review link is not configured yet.'});
    await db(`booking_feedback?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{public_review_clicked_at:new Date().toISOString(),updated_at:new Date().toISOString()}});
    return json(res,200,{ok:true,url});
  }
  if(row.submitted_at){const url=await publicReviewUrl();return json(res,200,{ok:true,duplicate:true,status:row.status,rating:row.rating,reviewUrl:url});}
  const rating=Number(b.rating),comments=String(b.comments||'').trim().slice(0,4000);if(!Number.isInteger(rating)||rating<1||rating>5)return json(res,400,{ok:false,error:'Please choose a rating from 1 to 5.'});
  const status=rating<=3?'needs_attention':'positive',now=new Date().toISOString();
  row=(await db(`booking_feedback?id=eq.${encodeURIComponent(row.id)}&submitted_at=is.null`,{method:'PATCH',prefer:'return=representation',body:{rating,comments:comments||null,status,submitted_at:now,updated_at:now}}))?.[0]||row;
  const {booking,quote}=await contextFor(row);
  let ticket=null;if(status==='needs_attention'){ticket=await routeToSupport(row,booking,quote,rating,comments);if(ticket?.id)row=(await db(`booking_feedback?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',prefer:'return=representation',body:{support_ticket_id:ticket.id,updated_at:new Date().toISOString()}}))?.[0]||row;}
  const reviewUrl=await publicReviewUrl();
  return json(res,200,{ok:true,status,rating,reviewUrl,supportNotified:status==='needs_attention',ticketNo:ticket?.ticket_no||null});
}catch(e){return safeError(res,e)}};
