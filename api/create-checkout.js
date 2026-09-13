const {json,parseBody,db,env,requireCustomer,ensureInvoiceForBooking,syncInvoicePaymentState,safeError,requestOrigin}=require('../lib/server');
const {loadPaymentPolicy,checkoutPlan}=require('../lib/payment-policy');
const {checkoutIdempotencyKey,createCheckoutSession}=require('../lib/stripe-payments');

module.exports=async function handler(req,res){
  try{
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const {user}=await requireCustomer(req),body=parseBody(req),bookingId=String(body.bookingId||'').trim();
    if(!bookingId)return json(res,400,{ok:false,error:'Booking ID is required.'});
    const policy=await loadPaymentPolicy({db,env});
    if(!policy.ready)return json(res,503,{ok:false,error:'Secure online payment is not configured yet.'});
    if(!policy.effectiveActive)return json(res,409,{ok:false,error:'Online payment is currently disabled by Namdar.'});
    const booking=(await db(`bookings?id=eq.${encodeURIComponent(bookingId)}&select=*&limit=1`))?.[0];
    if(!booking)return json(res,404,{ok:false,error:'Booking not found.'});
    if(booking.customer_id!==user.id)return json(res,403,{ok:false,error:'This booking does not belong to your account.'});
    if(!['pending','confirmed','completed'].includes(booking.status))return json(res,409,{ok:false,error:'This booking cannot accept an online payment.'});
    const quote=booking.quote_id?(await db(`quotes?id=eq.${encodeURIComponent(booking.quote_id)}&select=id,email,customer_name,customer_id,service_key&limit=1`))?.[0]:null;
    if(!quote)return json(res,404,{ok:false,error:'Quote not found.'});
    if(quote.service_key!=='windows')return json(res,409,{ok:false,error:'Online payment is currently available for Window Cleaning only.'});
    const invoice=await ensureInvoiceForBooking(booking,{issue:true});
    if(!invoice||invoice.status==='void')return json(res,409,{ok:false,error:'This invoice cannot accept payment.'});
    const state=await syncInvoicePaymentState(invoice.id);
    if(state.outstanding<=.004)return json(res,409,{ok:false,error:'This invoice is already paid.'});
    const plan=checkoutPlan({policy,total:invoice.total,net:state.net,outstanding:state.outstanding,preferFull:body.fullPayment===true});
    if(!plan)return json(res,409,{ok:false,error:'No online payment is due for this invoice.'});
    const idempotencyKey=checkoutIdempotencyKey({invoiceId:invoice.id,net:state.net,outstanding:state.outstanding,kind:plan.kind,amount:plan.amount});
    const {session}=await createCheckoutSession({secret:env('STRIPE_SECRET_KEY'),booking,invoice,quote,amount:plan.amount,kind:plan.kind,origin:requestOrigin(req),idempotencyKey});
    await db(`bookings?id=eq.${encodeURIComponent(booking.id)}`,{method:'PATCH',prefer:'return=minimal',body:{stripe_checkout_session_id:session.id}});
    return json(res,200,{ok:true,url:session.url,sessionId:session.id,invoiceId:invoice.id,paymentKind:plan.kind,amount:plan.amount,outstanding:state.outstanding,depositPercent:policy.depositPercent,minimumDeposit:policy.minimumDeposit,required:plan.required});
  }catch(e){return safeError(res,e)}
};
