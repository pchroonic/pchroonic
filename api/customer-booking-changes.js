const { json, parseBody, queryParam, db, requireCustomer, sendEmail, escapeHtml, env, createStaffNotification, safeError, isManagedInboxAddress } = require('../lib/server');

const WINDOWS={
  '08-11':{start:'08:00',end:'11:00',label:'08:00–11:00'},
  '11-14':{start:'11:00',end:'14:00',label:'11:00–14:00'},
  '14-17':{start:'14:00',end:'17:00',label:'14:00–17:00'}
};
const ACTIVE_STATUSES=new Set(['pending','confirmed']);

function londonLocalToUtc(dateStr,timeStr){
  const [y,m,d]=String(dateStr||'').split('-').map(Number),[hh,mm]=String(timeStr||'').split(':').map(Number);
  if(!y||!m||!d||!Number.isFinite(hh)||!Number.isFinite(mm))return null;
  let guess=new Date(Date.UTC(y,m-1,d,hh,mm,0));
  const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  for(let i=0;i<2;i++){
    const p=Object.fromEntries(fmt.formatToParts(guess).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
    const shown=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour),Number(p.minute));
    const wanted=Date.UTC(y,m-1,d,hh,mm);
    guess=new Date(guess.getTime()+(wanted-shown));
  }
  return guess;
}
function londonDateString(value=new Date()){
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(value).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function addDays(dateStr,n){const [y,m,d]=dateStr.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+n,12)).toISOString().slice(0,10)}
function londonDisplay(v){return new Date(v).toLocaleString('en-GB',{timeZone:'Europe/London',weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}
async function ownedBooking(userId,id){
  const b=(await db(`bookings?id=eq.${encodeURIComponent(id)}&customer_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`))?.[0];
  if(!b){const e=new Error('Booking not found.');e.status=404;throw e}return b;
}
function ensureChangeable(booking){
  if(!ACTIVE_STATUSES.has(booking.status)){const e=new Error('This booking can no longer be changed online.');e.status=409;throw e}
  if((booking.work_status||'scheduled')!=='scheduled'){const e=new Error('This job has already entered the field-work stage and can no longer be changed online.');e.status=409;throw e}
  if(new Date(booking.starts_at)<=new Date()){const e=new Error('Past appointments cannot be changed online.');e.status=409;throw e}
}
async function quoteFor(booking){return booking.quote_id?(await db(`quotes?id=eq.${encodeURIComponent(booking.quote_id)}&select=id,customer_name,email,service_key,postcode&limit=1`))?.[0]||null:null}
async function pendingFor(bookingId){return (await db(`booking_change_requests?booking_id=eq.${encodeURIComponent(bookingId)}&status=eq.pending&select=*&order=created_at.desc&limit=1`))?.[0]||null}
async function bookingConflicts(booking,start,end){
  const rows=await db(`bookings?starts_at=lt.${encodeURIComponent(end.toISOString())}&ends_at=gt.${encodeURIComponent(start.toISOString())}&status=in.(pending,confirmed)&select=id,assigned_staff_id&limit=100`);
  const others=(rows||[]).filter(x=>x.id!==booking.id);
  return booking.assigned_staff_id?others.some(x=>x.assigned_staff_id===booking.assigned_staff_id):others.length>0;
}
async function slotsFor(booking){
  ensureChangeable(booking);
  const today=londonDateString(),last=addDays(today,20),rangeStart=londonLocalToUtc(today,'00:00'),rangeEnd=londonLocalToUtc(addDays(last,1),'00:00');
  const existing=await db(`bookings?starts_at=lt.${encodeURIComponent(rangeEnd.toISOString())}&ends_at=gt.${encodeURIComponent(rangeStart.toISOString())}&status=in.(pending,confirmed)&select=id,starts_at,ends_at,assigned_staff_id&limit=1000`);
  const others=(existing||[]).filter(x=>x.id!==booking.id),now=Date.now(),slots=[];
  for(let day=0;day<21;day++){
    const date=addDays(today,day);
    for(const [key,w] of Object.entries(WINDOWS)){
      const start=londonLocalToUtc(date,w.start),end=londonLocalToUtc(date,w.end);if(!start||!end||start.getTime()<=now)continue;if(start.toISOString()===new Date(booking.starts_at).toISOString()&&end.toISOString()===new Date(booking.ends_at).toISOString())continue;
      const conflict=others.some(x=>{
        const overlaps=new Date(x.starts_at)<end&&new Date(x.ends_at)>start;if(!overlaps)return false;
        return booking.assigned_staff_id?x.assigned_staff_id===booking.assigned_staff_id:true;
      });
      if(!conflict)slots.push({date,windowKey:key,label:w.label,startsAt:start.toISOString(),endsAt:end.toISOString()});
    }
  }
  return slots;
}
async function notifyRequest({booking,quote,profile,request,customerId}){
  const customerEmail=quote?.email||profile?.email||'',name=quote?.customer_name||profile?.full_name||'there',support=env('NAMDAR_NOTIFY_EMAIL',env('NAMDAR_SUPPORT_EMAIL','support@namdar.co.uk'));
  const isCancel=request.request_type==='cancel',when=isCancel?'':londonDisplay(request.requested_starts_at);
  if(customerEmail)await sendEmail({to:customerEmail,subject:isCancel?'Namdar cancellation request received':'Namdar booking change request received',html:`<p>Hi ${escapeHtml(name)},</p><p>We received your request to ${isCancel?'cancel your upcoming booking':`move your booking to <strong>${escapeHtml(when)}</strong>`}.</p><p>Your current appointment stays in place until Namdar reviews the request. You can track the request in <a href="https://namdar.co.uk/account?tab=bookings&booking=${encodeURIComponent(booking.id)}">My Namdar</a>.</p>`,archiveForCustomer:true,customerId:customerId||null,messageCategory:'booking',targetPath:`/account?tab=bookings&booking=${encodeURIComponent(booking.id)}`});
  if(support&&!isManagedInboxAddress(support))await sendEmail({to:support,subject:isCancel?'Customer cancellation request':'Customer booking change request',html:`<h2>${isCancel?'Cancellation':'Reschedule'} request</h2><p><strong>${escapeHtml(name)}</strong> submitted a self-service booking request.</p>${when?`<p>Requested slot: <strong>${escapeHtml(when)}</strong></p>`:''}${request.reason?`<p>Customer note:<br>${escapeHtml(request.reason).replace(/\n/g,'<br>')}</p>`:''}<p>Booking ID: ${escapeHtml(booking.id)}</p><p><a href="https://namdar.co.uk/admin">Open Namdar Admin</a></p>`});
}

module.exports=async function handler(req,res){
  try{
    const {user,profile}=await requireCustomer(req);
    if(req.method==='GET'){
      const bookingId=String(queryParam(req,'bookingId')||'').trim();if(!bookingId)return json(res,400,{ok:false,error:'Booking ID is required.'});
      const booking=await ownedBooking(user.id,bookingId),pending=await pendingFor(booking.id);ensureChangeable(booking);
      const slots=await slotsFor(booking);
      return json(res,200,{ok:true,booking:{id:booking.id,startsAt:booking.starts_at,endsAt:booking.ends_at,status:booking.status,workStatus:booking.work_status||'scheduled'},pendingRequest:pending?{id:pending.id,type:pending.request_type,requestedStartsAt:pending.requested_starts_at,requestedEndsAt:pending.requested_ends_at,reason:pending.reason||'',status:pending.status,createdAt:pending.created_at}:null,slots});
    }
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const body=parseBody(req),action=String(body.action||'').trim();
    if(action==='withdraw'){
      const requestId=String(body.requestId||'').trim(),row=(await db(`booking_change_requests?id=eq.${encodeURIComponent(requestId)}&customer_id=eq.${encodeURIComponent(user.id)}&status=eq.pending&select=*&limit=1`))?.[0];
      if(!row)return json(res,404,{ok:false,error:'Pending change request not found.'});
      await db(`booking_change_requests?id=eq.${encodeURIComponent(row.id)}&status=eq.pending`,{method:'PATCH',body:{status:'withdrawn',updated_at:new Date().toISOString()}});
      return json(res,200,{ok:true,message:'Your booking change request has been withdrawn.'});
    }
    const bookingId=String(body.bookingId||'').trim(),booking=await ownedBooking(user.id,bookingId);ensureChangeable(booking);
    if(await pendingFor(booking.id))return json(res,409,{ok:false,error:'You already have a booking change request waiting for Namdar review.'});
    const reason=String(body.reason||'').trim().slice(0,2000);let requestType='',starts=null,ends=null;
    if(action==='request_cancel')requestType='cancel';
    else if(action==='request_reschedule'){
      requestType='reschedule';const date=String(body.date||''),windowKey=String(body.windowKey||''),w=WINDOWS[windowKey];if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!w)return json(res,400,{ok:false,error:'Choose an available date and time window.'});
      starts=londonLocalToUtc(date,w.start);ends=londonLocalToUtc(date,w.end);if(!starts||!ends||starts<=new Date())return json(res,400,{ok:false,error:'Choose a future booking slot.'});if(starts.toISOString()===new Date(booking.starts_at).toISOString()&&ends.toISOString()===new Date(booking.ends_at).toISOString())return json(res,400,{ok:false,error:'Choose a different time from your current appointment.'});
      const max=londonLocalToUtc(addDays(londonDateString(),20),'23:59');if(starts>max)return json(res,400,{ok:false,error:'Please choose a slot within the next 21 days.'});
      if(await bookingConflicts(booking,starts,ends))return json(res,409,{ok:false,error:'That slot is no longer available. Please choose another one.'});
    }else return json(res,400,{ok:false,error:'Choose whether you want to reschedule or cancel the booking.'});
    const rows=await db('booking_change_requests',{method:'POST',prefer:'return=representation',body:{booking_id:booking.id,customer_id:user.id,request_type:requestType,requested_starts_at:starts?.toISOString()||null,requested_ends_at:ends?.toISOString()||null,reason:reason||null,status:'pending'}}),request=rows?.[0];if(!request)return json(res,500,{ok:false,error:'Your booking request could not be saved.'});
    const quote=await quoteFor(booking);await notifyRequest({booking,quote,profile,request,customerId:user.id});await createStaffNotification({type:requestType==='cancel'?'booking_cancel_request':'booking_change_request',title:requestType==='cancel'?'Customer cancellation request':'Customer reschedule request',body:`${quote?.customer_name||profile?.full_name||profile?.email||'Customer'}${starts?` · ${londonDisplay(starts)}`:''}${reason?` · ${reason}`:''}`,targetPath:`/admin?tab=bookings&change=${encodeURIComponent(request.id)}`,permissionKey:'bookings',entityType:'booking_change_request',entityId:request.id,priority:requestType==='cancel'?'high':'normal',dedupeKey:`booking-change:${request.id}`});
    return json(res,201,{ok:true,request:{id:request.id,type:request.request_type,requestedStartsAt:request.requested_starts_at,requestedEndsAt:request.requested_ends_at,status:request.status,createdAt:request.created_at},message:'Your request has been sent to Namdar for review.'});
  }catch(e){return safeError(res,e)}
};
