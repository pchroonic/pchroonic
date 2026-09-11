const { json, parseBody, queryParam, db, requireStaff, sendEmail, escapeHtml, sendBookingNotificationNow, scheduleBookingReminder, cancelPendingBookingNotifications, scheduleCancelledBookingFollowUp, auditLog, safeError } = require('../lib/server');

const SERVICE_LABELS={windows:'Window cleaning',gutters:'Gutter cleaning',roof:'Roof cleaning',jetwash:'Jet washing',handyman:'Handyman',tour3d:'3D property tour'};
function londonDisplay(v){return v?new Date(v).toLocaleString('en-GB',{timeZone:'Europe/London',weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}
async function quoteFor(id){return id?(await db(`quotes?id=eq.${encodeURIComponent(id)}&select=id,customer_id,customer_name,email,phone,postcode,service_key&limit=1`))?.[0]||null:null}
async function conflict(booking,start,end){
  const rows=await db(`bookings?starts_at=lt.${encodeURIComponent(end.toISOString())}&ends_at=gt.${encodeURIComponent(start.toISOString())}&status=in.(pending,confirmed)&select=id,assigned_staff_id&limit=100`),others=(rows||[]).filter(x=>x.id!==booking.id);
  return booking.assigned_staff_id?others.some(x=>x.assigned_staff_id===booking.assigned_staff_id):others.length>0;
}
async function loadRequest(id){
  const r=(await db(`booking_change_requests?id=eq.${encodeURIComponent(id)}&select=*&limit=1`))?.[0];if(!r){const e=new Error('Booking change request not found.');e.status=404;throw e}return r;
}
async function notifyDecision({request,booking,quote,approved,note}){
  if(!quote?.email)return;
  const name=quote.customer_name||'there',isCancel=request.request_type==='cancel',service=SERVICE_LABELS[quote.service_key]||'Namdar service';
  if(approved){
    await sendBookingNotificationNow({booking,quote,type:'booking_update'});
    return;
  }
  await sendEmail({to:quote.email,subject:isCancel?'Update on your Namdar cancellation request':'Update on your Namdar booking change request',html:`<p>Hi ${escapeHtml(name)},</p><p>We reviewed your request to ${isCancel?'cancel':`reschedule your ${escapeHtml(service)}`} booking, but we could not approve it${request.requested_starts_at?` for <strong>${escapeHtml(londonDisplay(request.requested_starts_at))}</strong>`:''}.</p>${note?`<p><strong>Namdar note:</strong><br>${escapeHtml(note).replace(/\n/g,'<br>')}</p>`:''}<p>Your existing booking remains unchanged. You can choose another available slot from <a href="https://namdar.co.uk/account?tab=bookings&booking=${encodeURIComponent(booking.id)}">My Namdar</a>.</p>`,archiveForCustomer:true,customerId:quote.customer_id||booking.customer_id||null,messageCategory:'booking',targetPath:`/account?tab=bookings&booking=${encodeURIComponent(booking.id)}`});
}

module.exports=async function handler(req,res){
  try{
    const staff=await requireStaff(req,'bookings');
    if(req.method==='GET'){
      const status=String(queryParam(req,'status')||'pending');const valid=new Set(['pending','approved','declined','withdrawn','superseded','all']);if(!valid.has(status))return json(res,400,{ok:false,error:'Invalid request status.'});
      const where=status==='all'?'':`&status=eq.${encodeURIComponent(status)}`,rows=await db(`booking_change_requests?select=*&order=created_at.desc&limit=250${where}`);
      const bookingIds=[...new Set((rows||[]).map(x=>x.booking_id).filter(Boolean))],bookings=bookingIds.length?await db(`bookings?id=in.(${bookingIds.map(x=>encodeURIComponent(x)).join(',')})&select=id,quote_id,customer_id,starts_at,ends_at,address,status,payment_status,assigned_staff_id,work_status`):[];
      const quoteIds=[...new Set((bookings||[]).map(x=>x.quote_id).filter(Boolean))],quotes=quoteIds.length?await db(`quotes?id=in.(${quoteIds.map(x=>encodeURIComponent(x)).join(',')})&select=id,customer_name,email,phone,postcode,service_key`):[];
      const bm=Object.fromEntries((bookings||[]).map(x=>[x.id,x])),qm=Object.fromEntries((quotes||[]).map(x=>[x.id,x]));
      return json(res,200,{ok:true,requests:(rows||[]).map(r=>{const b=bm[r.booking_id]||{},q=qm[b.quote_id]||{};return{id:r.id,bookingId:r.booking_id,type:r.request_type,requestedStartsAt:r.requested_starts_at,requestedEndsAt:r.requested_ends_at,reason:r.reason||'',status:r.status,adminNote:r.admin_note||'',createdAt:r.created_at,reviewedAt:r.reviewed_at,booking:{startsAt:b.starts_at||null,endsAt:b.ends_at||null,address:b.address||'',status:b.status||'',paymentStatus:b.payment_status||'',workStatus:b.work_status||'scheduled',assignedStaffId:b.assigned_staff_id||null},customer:{name:q.customer_name||'Customer',email:q.email||'',phone:q.phone||'',postcode:q.postcode||''},serviceKey:q.service_key||'',serviceLabel:SERVICE_LABELS[q.service_key]||q.service_key||'Namdar service'}})});
    }
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const body=parseBody(req),id=String(body.requestId||'').trim(),action=String(body.action||''),note=String(body.note||'').trim().slice(0,2000);if(!id||!['approve','decline'].includes(action))return json(res,400,{ok:false,error:'Request and review action are required.'});
    const request=await loadRequest(id);if(request.status!=='pending')return json(res,409,{ok:false,error:'This booking change request has already been reviewed.'});
    const booking=(await db(`bookings?id=eq.${encodeURIComponent(request.booking_id)}&select=*&limit=1`))?.[0];if(!booking)return json(res,404,{ok:false,error:'The booking no longer exists.'});const quote=await quoteFor(booking.quote_id);
    if(action==='decline'){
      const updated=(await db(`booking_change_requests?id=eq.${encodeURIComponent(request.id)}&status=eq.pending`,{method:'PATCH',prefer:'return=representation',body:{status:'declined',admin_note:note||null,reviewed_by:staff.user.id,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}}))?.[0];if(!updated)return json(res,409,{ok:false,error:'This request was already reviewed by another staff member.'});
      await notifyDecision({request,booking,quote,approved:false,note});await auditLog(req,staff,{action:'booking_change.decline',entityType:'booking_change_request',entityId:request.id,summary:`Declined ${request.request_type} request`,before:request,after:updated,metadata:{bookingId:booking.id}});return json(res,200,{ok:true,request:updated,message:'Request declined. The customer has been notified.'});
    }
    if(!['pending','confirmed'].includes(booking.status)||(booking.work_status||'scheduled')!=='scheduled'||new Date(booking.starts_at)<=new Date())return json(res,409,{ok:false,error:'This booking can no longer be changed because the appointment has started, passed or been closed.'});
    let updatedBooking=booking;
    if(request.request_type==='reschedule'){
      const start=new Date(request.requested_starts_at),end=new Date(request.requested_ends_at);if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start||start<=new Date())return json(res,409,{ok:false,error:'The requested slot is no longer valid.'});
      if(await conflict(booking,start,end))return json(res,409,{ok:false,error:'The requested slot is no longer available. Decline the request or ask the customer to choose another slot.'});
      updatedBooking=(await db(`bookings?id=eq.${encodeURIComponent(booking.id)}`,{method:'PATCH',prefer:'return=representation',body:{starts_at:start.toISOString(),ends_at:end.toISOString()}}))?.[0]||booking;
      if(updatedBooking.status==='confirmed'&&quote)await scheduleBookingReminder(updatedBooking,quote);else await cancelPendingBookingNotifications(updatedBooking.id,'reminder_24h');
    }else{
      updatedBooking=(await db(`bookings?id=eq.${encodeURIComponent(booking.id)}`,{method:'PATCH',prefer:'return=representation',body:{status:'cancelled'}}))?.[0]||booking;
      await cancelPendingBookingNotifications(updatedBooking.id,'reminder_24h');await cancelPendingBookingNotifications(updatedBooking.id,'follow_up');if(quote)await scheduleCancelledBookingFollowUp(updatedBooking,quote);
    }
    const updated=(await db(`booking_change_requests?id=eq.${encodeURIComponent(request.id)}&status=eq.pending`,{method:'PATCH',prefer:'return=representation',body:{status:'approved',admin_note:note||null,reviewed_by:staff.user.id,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}}))?.[0];if(!updated)return json(res,409,{ok:false,error:'This request was already reviewed by another staff member.'});
    await notifyDecision({request,booking:updatedBooking,quote,approved:true,note});
    await auditLog(req,staff,{action:'booking_change.approve',entityType:'booking_change_request',entityId:request.id,summary:`Approved ${request.request_type} request`,before:{request,booking},after:{request:updated,booking:updatedBooking},metadata:{bookingId:booking.id}});
    return json(res,200,{ok:true,request:updated,booking:updatedBooking,message:request.request_type==='cancel'?'Cancellation approved and customer notified.':'Booking moved to the requested slot and customer notified.'});
  }catch(e){return safeError(res,e)}
};
