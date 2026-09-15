const { json, parseBody, db, env, requireStaff, ensureInvoiceForBooking, syncInvoicePaymentState, sendBookingNotificationNow, scheduleBookingReminder, scheduleBookingFollowUp, cancelPendingBookingNotifications, scheduleCancelledBookingFollowUp, cancelPendingBusinessNotifications, auditLog, safeError } = require('../lib/server');
const {loadPaymentPolicy,snapshotPaymentPolicy,paymentPolicyFromSnapshot,paymentRequirementMet}=require('../lib/payment-policy');
const STATUSES=new Set(['pending','confirmed','completed','cancelled']);
const PAYMENTS=new Set(['unpaid','deposit_paid','paid','refunded']);
function validDate(v){const d=new Date(v);return Number.isFinite(d.getTime())?d:null}
async function quoteFor(id){return (await db(`quotes?id=eq.${encodeURIComponent(id)}&select=*&limit=1`))?.[0]||null}
async function enforcePaymentBeforeConfirmation(quote,booking=null){
  if(!quote||quote.service_key!=='windows')return null;
  const livePolicy=await loadPaymentPolicy({db,env});
  if(!booking?.id){
    if(!livePolicy.active||livePolicy.mode==='optional')return null;
    const e=new Error(livePolicy.mode==='full_required'?'Create this appointment as Pending so the customer can pay in full before confirmation.':'Create this appointment as Pending so the customer can pay the required deposit before confirmation.');e.status=409;throw e;
  }
  const policy=paymentPolicyFromSnapshot(livePolicy,booking.payment_policy_snapshot||null);
  if(policy.legacyBooking)return null;
  if(!policy.contractActive||policy.mode==='optional')return null;
  policy.effectiveActive=true;
  const invoice=await ensureInvoiceForBooking(booking,{issue:true}),state=await syncInvoicePaymentState(invoice.id),paymentStatus=state.outstanding<=.004?'paid':state.net>.004?'deposit_paid':'unpaid';
  if(!paymentRequirementMet(policy,paymentStatus,{net:state.net,total:invoice.total})){
    const required=policy.mode==='full_required'?Number(invoice.total||0):Number(policy.lockedDepositAmount||0);
    const e=new Error(policy.mode==='full_required'?`Full payment of £${required.toFixed(2)} is required before this Window Cleaning booking can be confirmed.`:`The recorded £${required.toFixed(2)} deposit must be paid before this Window Cleaning booking can be confirmed.`);e.status=409;throw e;
  }
  return{policy,paymentStatus,state};
}
async function validateAssignedStaff(id){
  if(!id)return null;
  const p=(await db(`profiles?id=eq.${encodeURIComponent(id)}&role=in.(staff,admin)&select=id,full_name,email,role,account_status&limit=1`))?.[0];
  if(!p||(p.account_status||'active')!=='active')return null;
  if(p.role==='admin')return p;
  const a=(await db(`staff_access?user_id=eq.${encodeURIComponent(id)}&select=active,permissions,job_title&limit=1`))?.[0];
  return a?.active&&a?.permissions?.bookings===true?{...p,job_title:a.job_title}:null;
}
async function conflict(startsAt,endsAt,excludeId='',assignedStaffId=null){
  const q=`bookings?starts_at=lt.${encodeURIComponent(endsAt.toISOString())}&ends_at=gt.${encodeURIComponent(startsAt.toISOString())}&status=in.(pending,confirmed)&select=id,assigned_staff_id&limit=50`;
  const rows=(await db(q)||[]).filter(x=>x.id!==excludeId);
  if(assignedStaffId)return rows.some(x=>x.assigned_staff_id===assignedStaffId);
  return rows.length>0;
}
module.exports=async function handler(req,res){
  try{
    if(!['POST','PATCH'].includes(req.method)) return json(res,405,{ok:false,error:'Method not allowed'});
    const staff=await requireStaff(req,'bookings');
    const b=parseBody(req);
    if(req.method==='POST'){
      const quoteId=String(b.quoteId||'');const status=String(b.status||'confirmed'),payment='unpaid';const startsAt=validDate(b.startsAt),endsAt=validDate(b.endsAt),address=String(b.address||'').trim().slice(0,500),assignedStaffId=String(b.assignedStaffId||'').trim()||null;
      if(!quoteId||!STATUSES.has(status)||!PAYMENTS.has(payment)||!startsAt||!endsAt||endsAt<=startsAt||!address)return json(res,400,{ok:false,error:'Quote, date/time, address, booking status and payment status are required.'});
      if(assignedStaffId&&!(await validateAssignedStaff(assignedStaffId)))return json(res,400,{ok:false,error:'Choose an active Namdar team member who can manage bookings.'});
      if(startsAt.getTime()<Date.now()-60000&&status!=='completed')return json(res,400,{ok:false,error:'Choose a future booking time.'});
      const quote=await quoteFor(quoteId);if(!quote)return json(res,404,{ok:false,error:'Quote not found.'});
      const livePaymentPolicy=quote.service_key==='windows'?await loadPaymentPolicy({db,env}):null;
      if(livePaymentPolicy?.active&&livePaymentPolicy.mode!=='optional'&&!(Number(quote.final_price)>0))return json(res,409,{ok:false,error:'Set a final Window Cleaning quote before creating an appointment under the active payment policy.'});
      if(status==='confirmed')await enforcePaymentBeforeConfirmation(quote,null);
      const paymentLockedAt=livePaymentPolicy?new Date().toISOString():null,paymentSnapshot=livePaymentPolicy?snapshotPaymentPolicy(livePaymentPolicy,Number(quote.final_price||0)):null;
      const existing=await db(`bookings?quote_id=eq.${encodeURIComponent(quoteId)}&status=neq.cancelled&select=id,status,starts_at&limit=1`);if(existing?.length)return json(res,409,{ok:false,error:'This quote already has an active booking.'});
      if(['pending','confirmed'].includes(status)&&await conflict(startsAt,endsAt,'',assignedStaffId))return json(res,409,{ok:false,error:assignedStaffId?'That team member already has a booking during this time.':'That time overlaps another pending or confirmed booking. Assign a team member to allow parallel jobs.'});
      const rows=await db('bookings',{method:'POST',prefer:'return=representation',body:{quote_id:quote.id,customer_id:quote.customer_id||null,starts_at:startsAt.toISOString(),ends_at:endsAt.toISOString(),address,status,payment_status:payment,assigned_staff_id:assignedStaffId,promo_code:quote.promo_code||null,discount_total:Number(quote.promo_discount||0)+Number(quote.reward_discount||0),payment_policy_revision:paymentSnapshot?.revision??null,payment_policy_locked_at:paymentLockedAt,payment_policy_snapshot:paymentSnapshot,deposit_required:Number(paymentSnapshot?.initialPaymentRequired?paymentSnapshot.initialPaymentAmount:0)}});const booking=rows?.[0];if(!booking)return json(res,500,{ok:false,error:'Booking could not be created.'});
      if(quote.promo_code){const promo=(await db(`promo_codes?code=eq.${encodeURIComponent(quote.promo_code)}&select=id,uses_count&limit=1`))?.[0];if(promo){await db('promo_redemptions',{method:'POST',body:{promo_id:promo.id,customer_id:quote.customer_id||null,quote_id:quote.id,booking_id:booking.id,discount_amount:Number(quote.promo_discount||0)}}).catch(()=>null);await db(`promo_codes?id=eq.${encodeURIComponent(promo.id)}`,{method:'PATCH',body:{uses_count:Number(promo.uses_count||0)+1,updated_at:new Date().toISOString()}}).catch(()=>null)}}
      if(quote.reward_code&&quote.customer_id){const reward=(await db(`reward_redemptions?redemption_code=eq.${encodeURIComponent(quote.reward_code)}&customer_id=eq.${encodeURIComponent(quote.customer_id)}&status=eq.issued&select=id&limit=1`))?.[0];if(reward)await db(`reward_redemptions?id=eq.${encodeURIComponent(reward.id)}`,{method:'PATCH',body:{status:'used',used_at:new Date().toISOString()}}).catch(()=>null)}
      if(quote.status!=='approved')await db(`quotes?id=eq.${encodeURIComponent(quote.id)}`,{method:'PATCH',body:{status:'approved',updated_at:new Date().toISOString()}});
      await ensureInvoiceForBooking(booking,{issue:status!=='pending'});
      if(status==='confirmed'){await sendBookingNotificationNow({booking,quote,type:'confirmation'});await scheduleBookingReminder(booking,quote)}
      else await sendBookingNotificationNow({booking,quote,type:'booking_update'});
      await auditLog(req,staff,{action:'booking.create',entityType:'booking',entityId:booking.id,summary:`Created booking for ${quote.customer_name||'customer'}`,after:booking,metadata:{quoteId:quote.id,paymentPolicyRevision:paymentSnapshot?.revision??null}});
      return json(res,201,{ok:true,booking});
    }
    const id=String(b.id||'');const current=(await db(`bookings?id=eq.${encodeURIComponent(id)}&select=*&limit=1`))?.[0];if(!id||!current)return json(res,404,{ok:false,error:'Booking not found.'});
    const status=b.status===undefined?current.status:String(b.status),payment=current.payment_status;if(!STATUSES.has(status)||!PAYMENTS.has(payment))return json(res,400,{ok:false,error:'Valid booking status and payment status are required.'});
    const startsAt=b.startsAt===undefined?new Date(current.starts_at):validDate(b.startsAt),endsAt=b.endsAt===undefined?new Date(current.ends_at):validDate(b.endsAt),address=b.address===undefined?current.address:String(b.address||'').trim().slice(0,500),assignedStaffId=b.assignedStaffId===undefined?(current.assigned_staff_id||null):(String(b.assignedStaffId||'').trim()||null);
    if(assignedStaffId&&!(await validateAssignedStaff(assignedStaffId)))return json(res,400,{ok:false,error:'Choose an active Namdar team member who can manage bookings.'});
    if(!startsAt||!endsAt||endsAt<=startsAt||!address)return json(res,400,{ok:false,error:'Choose a valid date/time and service address.'});
    const scheduleChanged=startsAt.toISOString()!==new Date(current.starts_at).toISOString()||endsAt.toISOString()!==new Date(current.ends_at).toISOString(),staffChanged=assignedStaffId!==(current.assigned_staff_id||null);
    if(scheduleChanged&&startsAt.getTime()<Date.now()-60000&&status!=='completed')return json(res,400,{ok:false,error:'Choose a future booking time.'});
    if(status==='confirmed'&&current.status!=='confirmed'){const quote=current.quote_id?await quoteFor(current.quote_id):null;if(quote)await enforcePaymentBeforeConfirmation(quote,current)}
    if(['pending','confirmed'].includes(status)&&await conflict(startsAt,endsAt,id,assignedStaffId))return json(res,409,{ok:false,error:assignedStaffId?'That team member already has a booking during this time.':'That time overlaps another pending or confirmed booking. Assign a team member to allow parallel jobs.'});
    const patch={status,payment_status:payment,starts_at:startsAt.toISOString(),ends_at:endsAt.toISOString(),address,assigned_staff_id:assignedStaffId};if(status==='completed'&&current.status!=='completed'){patch.work_status='completed';patch.completed_at=current.completed_at||new Date().toISOString()}else if(current.status==='completed'&&status!=='completed'){patch.work_status='scheduled';patch.completed_at=null}const rows=await db(`bookings?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=representation',body:patch});const booking=rows?.[0];
    if(booking&&['confirmed','completed'].includes(status))await ensureInvoiceForBooking(booking,{issue:true});
    const statusChanged=status!==current.status,customerMeaningful=statusChanged||scheduleChanged||address!==current.address;
    if(booking&&customerMeaningful){await db(`booking_change_requests?booking_id=eq.${encodeURIComponent(booking.id)}&status=eq.pending`,{method:'PATCH',body:{status:'superseded',admin_note:'Booking was updated directly by Namdar staff.',reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}}).catch(()=>null)}
    if(booking){
      const quote=booking.quote_id?await quoteFor(booking.quote_id):null;
      if(status==='confirmed'&&quote)await scheduleBookingReminder(booking,quote);else await cancelPendingBookingNotifications(booking.id,'reminder_24h');if(status!=='completed')await cancelPendingBookingNotifications(booking.id,'follow_up');
      if(quote&&status==='confirmed'&&current.status!=='confirmed')await sendBookingNotificationNow({booking,quote,type:'confirmation'});
      else if(quote&&status==='completed'&&current.status!=='completed'){await sendBookingNotificationNow({booking,quote,type:'completion'});await scheduleBookingFollowUp(booking,quote)}
      else if(quote&&customerMeaningful)await sendBookingNotificationNow({booking,quote,type:'booking_update'});
      if(status==='cancelled'&&current.status!=='cancelled'&&quote)await scheduleCancelledBookingFollowUp(booking,quote);
      else if(status!=='cancelled')await cancelPendingBusinessNotifications('booking',booking.id,'booking_cancel_followup').catch(()=>null);
    }
    await auditLog(req,staff,{action:'booking.update',entityType:'booking',entityId:booking?.id||id,summary:'Updated booking',before:current,after:booking,metadata:{statusChanged,scheduleChanged,staffChanged}});
    return json(res,200,{ok:true,booking,staffChanged});
  }catch(e){return safeError(res,e)}
};