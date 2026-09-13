const {json,parseBody,db,env,requireCustomer,syncInvoicePaymentState,safeError,queryParam}=require('../lib/server');
const {retrieveCheckoutSession}=require('../lib/stripe-payments');

module.exports=async function handler(req,res){
  try{
    if(!['GET','POST'].includes(req.method))return json(res,405,{ok:false,error:'Method not allowed'});
    const stripeKey=env('STRIPE_SECRET_KEY');if(!stripeKey)return json(res,503,{ok:false,error:'Online payment is not enabled.'});
    const {user}=await requireCustomer(req),sessionId=String(queryParam(req,'session_id')||parseBody(req).sessionId||'').trim();
    if(!sessionId.startsWith('cs_'))return json(res,400,{ok:false,error:'Invalid payment session.'});
    const session=await retrieveCheckoutSession(stripeKey,sessionId),bookingId=String(session?.metadata?.booking_id||''),invoiceId=String(session?.metadata?.invoice_id||'');
    if(!bookingId||!invoiceId)return json(res,400,{ok:false,error:'This payment is not linked to a Namdar invoice.'});
    const booking=(await db(`bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,customer_id,quote_id&limit=1`))?.[0];
    if(!booking||booking.customer_id!==user.id)return json(res,403,{ok:false,error:'This payment does not belong to your account.'});
    const quote=booking.quote_id?(await db(`quotes?id=eq.${encodeURIComponent(booking.quote_id)}&select=service_key&limit=1`))?.[0]:null;
    if(!quote||quote.service_key!=='windows')return json(res,409,{ok:false,error:'This payment is not a Window Cleaning payment.'});
    const recorded=(await db(`payment_records?provider_reference=eq.${encodeURIComponent(session.id)}&direction=eq.payment&method=eq.stripe&select=id,amount,payment_kind,paid_at&limit=1`))?.[0]||null;
    const state=await syncInvoicePaymentState(invoiceId);
    return json(res,200,{ok:true,paid:Boolean(recorded),recorded:Boolean(recorded),stripePaymentStatus:String(session.payment_status||''),pendingWebhook:session.payment_status==='paid'&&!recorded,paymentStatus:state.invoice.status,bookingId,invoiceId,amountPaid:state.net,outstanding:state.outstanding});
  }catch(e){return safeError(res,e)}
};
