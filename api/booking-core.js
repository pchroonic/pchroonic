const { json, parseBody, db, requireCustomer, sendEmail, escapeHtml, env, ensureInvoiceForBooking, createStaffNotification, safeError, isManagedInboxAddress, sendBookingNotificationNow, scheduleBookingReminder } = require('../lib/server');
function londonParts(v){return Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(v).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]))}
function allowedCustomerWindow(start,end){const a=londonParts(start),z=londonParts(end),same=a.year===z.year&&a.month===z.month&&a.day===z.day&&a.minute==='00'&&z.minute==='00',pair=`${a.hour}-${z.hour}`;return same&&['08-11','11-14','14-17'].includes(pair)&&start.getTime()>Date.now()&&start.getTime()<=Date.now()+21*86400000}
module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') return json(res,405,{ok:false,error:'Method not allowed'});
    const b = parseBody(req), quoteId=String(b.quoteId||'').trim(), address=String(b.address||'').trim().slice(0,500);
    const startsAt=new Date(b.startsAt), endsAt=new Date(b.endsAt);
    if(!quoteId||!address||!Number.isFinite(startsAt.getTime())||!Number.isFinite(endsAt.getTime())||endsAt<=startsAt)return json(res,400,{ok:false,error:'Choose a valid booking date, time and address.'});
    if(startsAt.getTime()<Date.now()-60000)return json(res,400,{ok:false,error:'Please choose a future booking slot.'});
    if(!allowedCustomerWindow(startsAt,endsAt))return json(res,400,{ok:false,error:'Choose one of the available Namdar booking windows within the next 21 days.'});
    const quote=(await db(`quotes?id=eq.${encodeURIComponent(quoteId)}&select=*&limit=1`))?.[0];if(!quote)return json(res,404,{ok:false,error:'Quote not found.'});
    const {user}=await requireCustomer(req);if(quote.customer_id!==user.id)return json(res,403,{ok:false,error:'Please sign in to the customer account that owns this quote.'});
    if(quote.customer_response!=='accepted'||quote.final_price==null||!['approved','sent'].includes(quote.status))return json(res,409,{ok:false,error:'Accept the final quote in My Namdar before choosing an appointment.'});
    const customerId=user.id;
    const result=await db('rpc/reserve_customer_booking',{method:'POST',body:{p_quote_id:quote.id,p_customer_id:customerId,p_starts_at:startsAt.toISOString(),p_ends_at:endsAt.toISOString(),p_address:address}});
    if(!result?.ok)return json(res,409,{ok:false,error:result?.error||'The appointment could not be reserved. Please try again.'});
    const booking=result.booking,confirmed=booking.status==='confirmed';
    const response={ok:true,booking:{id:booking.id,status:booking.status,paymentStatus:booking.payment_status,startsAt:booking.starts_at},message:confirmed?'Your appointment is confirmed.':'Booking request sent. Namdar will confirm the appointment.'};
    if(!result.created)return json(res,200,response);
    try {
    if(booking)await ensureInvoiceForBooking(booking,{issue:false});
    if(quote.promo_code){const promo=(await db(`promo_codes?code=eq.${encodeURIComponent(quote.promo_code)}&select=id,uses_count&limit=1`))?.[0];if(promo){await db('promo_redemptions',{method:'POST',body:{promo_id:promo.id,customer_id:customerId,quote_id:quote.id,booking_id:booking.id,discount_amount:Number(quote.promo_discount||0)}});await db(`promo_codes?id=eq.${encodeURIComponent(promo.id)}`,{method:'PATCH',body:{uses_count:Number(promo.uses_count||0)+1,updated_at:new Date().toISOString()}})}}
    if(quote.reward_code&&customerId){const reward=(await db(`reward_redemptions?redemption_code=eq.${encodeURIComponent(quote.reward_code)}&customer_id=eq.${encodeURIComponent(customerId)}&status=eq.issued&select=id&limit=1`))?.[0];if(reward)await db(`reward_redemptions?id=eq.${encodeURIComponent(reward.id)}`,{method:'PATCH',body:{status:'used',used_at:new Date().toISOString()}})}
    } catch(error) { console.error('Booking saved; billing or redemption follow-up failed',booking.id); }
    const when=startsAt.toLocaleString('en-GB',{timeZone:'Europe/London'});
    await createStaffNotification({type:confirmed?'booking_confirmed':'booking_request',title:confirmed?'Automatically confirmed booking':'New booking request',body:`${quote.customer_name} · ${when} · ${address}`,targetPath:`/admin?tab=bookings&booking=${encodeURIComponent(booking.id)}`,permissionKey:'bookings',entityType:'booking',entityId:booking.id,priority:'high',dedupeKey:`booking-request:${booking.id}`}).catch(()=>console.error('Booking staff notification failed',booking.id));
    const notify=env('NAMDAR_NOTIFY_EMAIL',env('NAMDAR_SUPPORT_EMAIL','support@namdar.co.uk'));
    if(notify&&!isManagedInboxAddress(notify))await sendEmail({to:notify,subject:confirmed?'Namdar appointment automatically confirmed':'New Namdar booking request',html:`<p>${escapeHtml(quote.customer_name)} · ${escapeHtml(when)}</p><p>${escapeHtml(address)}</p><p>${confirmed?'Confirmed automatically. Allocate a team member in Admin.':'Awaiting your approval in Admin.'}</p>`}).catch(()=>console.error('Booking staff email failed',booking.id));
    if(confirmed){
      await sendBookingNotificationNow({booking,quote,type:'confirmation'}).catch(()=>console.error('Booking confirmation queue failed',booking.id));
      await scheduleBookingReminder(booking,quote).catch(()=>console.error('Booking reminder queue failed',booking.id));
    }else{
      await sendEmail({to:quote.email,subject:'Namdar booking request received',html:`<p>Hi ${escapeHtml(quote.customer_name)},</p><p>We received your preferred booking slot for <strong>${escapeHtml(when)}</strong>.</p><p>Namdar will review the booking request and confirm the appointment. Your accepted final quote remains unchanged unless the job scope changes.</p><p><a href="https://namdar.co.uk/account?tab=bookings&booking=${encodeURIComponent(booking.id)}">Open this booking in My Namdar</a></p>`,archiveForCustomer:true,customerId,messageCategory:'booking',targetPath:`/account?tab=bookings&booking=${encodeURIComponent(booking.id)}`}).catch(()=>console.error('Booking request email failed',booking.id));
    }
    return json(res,201,response);
  } catch(e) { return safeError(res,e); }
};
