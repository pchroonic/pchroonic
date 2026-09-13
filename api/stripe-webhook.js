const {json,db,env,syncInvoicePaymentState,createStaffNotification,sendEmail,escapeHtml,cancelPendingBusinessNotifications,safeError}=require('../lib/server');
const {verifyStripeSignature,readRawBody,retrievePaymentIntent,retrievePaymentProcessorDetails,retrieveRefundProcessorDetails}=require('../lib/stripe-payments');

async function contextFromMetadata(meta={}){
  const bookingId=String(meta.booking_id||''),invoiceId=String(meta.invoice_id||''),customerId=String(meta.customer_id||'');
  if(!bookingId||!invoiceId)return null;
  const booking=(await db(`bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,quote_id,customer_id,status,payment_status&limit=1`))?.[0];
  const invoice=(await db(`invoices?id=eq.${encodeURIComponent(invoiceId)}&select=*&limit=1`))?.[0];
  if(!booking||!invoice||invoice.booking_id!==booking.id||String(invoice.customer_id||booking.customer_id||'')!==customerId)return null;
  const quote=booking.quote_id?(await db(`quotes?id=eq.${encodeURIComponent(booking.quote_id)}&select=id,customer_id,customer_name,email,service_key&limit=1`))?.[0]:null;
  if(!quote||quote.service_key!=='windows'||String(quote.customer_id||'')!==customerId)return null;
  return{booking,invoice,quote};
}
async function insertStripeRecord(body){
  try{return await db('payment_records?on_conflict=provider_reference',{method:'POST',prefer:'resolution=ignore-duplicates,return=representation',body})||[]}catch(e){if(e.status===409)return[];throw e}
}
function providerFields(paymentIntentId,details=null){
  return{provider_payment_id:String(paymentIntentId||'').slice(0,180)||null,provider_balance_transaction:details?.providerBalanceTransaction||null,provider_fee:details?.providerFee??null,provider_net:details?.providerNet??null,provider_fee_currency:details?.providerFeeCurrency||null};
}
async function attachProcessorDetails(providerReference,paymentIntentId,loader){
  let details;
  try{details=await loader()}catch(e){const err=new Error(`Stripe payment was recorded but processor-cost reconciliation needs a retry: ${e.message}`);err.status=503;throw err}
  if(!details?.providerBalanceTransaction||details.providerFee==null||!details.providerFeeCurrency){const err=new Error('Stripe payment was recorded but processor-cost data is not ready yet.');err.status=503;throw err}
  await db(`payment_records?provider_reference=eq.${encodeURIComponent(providerReference)}`,{method:'PATCH',prefer:'return=minimal',body:providerFields(paymentIntentId,details)});
  return details;
}
async function notifyPayment(ctx,amount,kind,providerReference){
  await createStaffNotification({type:'payment_received',title:'Stripe payment received',body:`${ctx.quote.customer_name||ctx.quote.email||'Customer'} · £${amount.toFixed(2)}`,targetPath:'/admin?tab=payments',permissionKey:'payments',entityType:'invoice',entityId:ctx.invoice.id,priority:ctx.booking.status==='cancelled'?'high':'normal',dedupeKey:`stripe-payment:${providerReference}`});
  if(ctx.quote.email)await sendEmail({to:ctx.quote.email,subject:'Namdar payment received',html:`<p>Hi ${escapeHtml(ctx.quote.customer_name||'there')},</p><p>We received your secure Stripe payment of <strong>£${amount.toFixed(2)}</strong>.</p><p>Your updated invoice and receipt are available in <a href="https://namdar.co.uk/account?tab=billing">My Namdar</a>.</p>`,archiveForCustomer:true,customerId:ctx.quote.customer_id||ctx.invoice.customer_id||null,messageCategory:'billing',targetPath:'/account?tab=billing',messageKey:`stripe-receipt:${providerReference}`});
}
async function processCheckoutSession(session){
  if(!session||session.payment_status!=='paid')return{handled:true,recorded:false,reason:'not_paid'};
  if(String(session.currency||'').toLowerCase()!=='gbp')throw Object.assign(new Error('Stripe payment currency did not match GBP.'),{status:400});
  const ctx=await contextFromMetadata(session.metadata||{});if(!ctx)throw Object.assign(new Error('Stripe payment metadata did not match a Namdar Window invoice.'),{status:400});
  const amount=Number(session.amount_total||0)/100,expected=Number(session.metadata?.amount_pence||0)/100;
  if(!Number.isFinite(amount)||amount<=0||!Number.isFinite(expected)||Math.abs(amount-expected)>.004)throw Object.assign(new Error('Stripe payment amount did not match the checkout metadata.'),{status:400});
  const kind=['deposit','balance','full'].includes(String(session.metadata?.payment_kind||''))?String(session.metadata.payment_kind):'balance';
  const paymentIntentId=String(session.payment_intent||''),providerReference=String(session.id);
  const rows=await insertStripeRecord({booking_id:ctx.booking.id,invoice_id:ctx.invoice.id,customer_id:ctx.booking.customer_id||null,direction:'payment',payment_kind:kind,method:'stripe',amount:Number(amount.toFixed(2)),reference:paymentIntentId?`Stripe ${paymentIntentId.slice(0,80)}`:'Stripe Checkout',provider_reference:providerReference,...providerFields(paymentIntentId),paid_at:session.created?new Date(Number(session.created)*1000).toISOString():new Date().toISOString()});
  const state=await syncInvoicePaymentState(ctx.invoice.id);
  if(state.outstanding<.005)await cancelPendingBusinessNotifications('invoice',ctx.invoice.id,'invoice_overdue').catch(()=>null);
  if(rows.length)await notifyPayment(ctx,amount,kind,providerReference);
  const processor=await attachProcessorDetails(providerReference,paymentIntentId,()=>retrievePaymentProcessorDetails(env('STRIPE_SECRET_KEY'),paymentIntentId));
  return{handled:true,recorded:rows.length>0,invoiceId:ctx.invoice.id,paymentStatus:state.invoice.status,processingCostCaptured:processor.providerFee!=null};
}
async function processRefund(refund,paymentIntentId=''){
  if(!refund||String(refund.status||'')!=='succeeded')return{handled:true,recorded:false,reason:'refund_not_succeeded'};
  const piId=String(refund.payment_intent||paymentIntentId||'');if(!piId)return{handled:false,recorded:false,reason:'missing_payment_intent'};
  const pi=await retrievePaymentIntent(env('STRIPE_SECRET_KEY'),piId),ctx=await contextFromMetadata(pi.metadata||{});if(!ctx)throw Object.assign(new Error('Stripe refund metadata did not match a Namdar Window invoice.'),{status:400});
  const amount=Number(refund.amount||0)/100;if(!Number.isFinite(amount)||amount<=0)throw Object.assign(new Error('Stripe refund amount was invalid.'),{status:400});
  const providerReference=`stripe_refund:${String(refund.id)}`;
  const rows=await insertStripeRecord({booking_id:ctx.booking.id,invoice_id:ctx.invoice.id,customer_id:ctx.booking.customer_id||null,direction:'refund',payment_kind:'refund',method:'stripe',amount:Number(amount.toFixed(2)),reference:`Stripe refund ${String(refund.id).slice(0,80)}`,provider_reference:providerReference,...providerFields(piId),paid_at:refund.created?new Date(Number(refund.created)*1000).toISOString():new Date().toISOString()});
  const state=await syncInvoicePaymentState(ctx.invoice.id);
  if(rows.length){
    await createStaffNotification({type:'payment_received',title:'Stripe refund recorded',body:`${ctx.quote.customer_name||ctx.quote.email||'Customer'} · £${amount.toFixed(2)} refund`,targetPath:'/admin?tab=payments',permissionKey:'payments',entityType:'invoice',entityId:ctx.invoice.id,priority:'normal',dedupeKey:`stripe-refund:${refund.id}`});
    if(ctx.quote.email)await sendEmail({to:ctx.quote.email,subject:'Namdar Stripe refund confirmed',html:`<p>Hi ${escapeHtml(ctx.quote.customer_name||'there')},</p><p>A Stripe refund of <strong>£${amount.toFixed(2)}</strong> has been recorded against your Namdar invoice.</p><p>Your updated payment history is available in <a href="https://namdar.co.uk/account?tab=billing">My Namdar</a>.</p>`,archiveForCustomer:true,customerId:ctx.quote.customer_id||ctx.invoice.customer_id||null,messageCategory:'billing',targetPath:'/account?tab=billing',messageKey:`stripe-refund:${refund.id}`});
  }
  const processor=await attachProcessorDetails(providerReference,piId,()=>retrieveRefundProcessorDetails(env('STRIPE_SECRET_KEY'),refund));
  return{handled:true,recorded:rows.length>0,invoiceId:ctx.invoice.id,paymentStatus:state.invoice.status,processingCostCaptured:processor.providerFee!=null};
}

module.exports=async function handler(req,res){
  try{
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const webhookSecret=env('STRIPE_WEBHOOK_SECRET'),stripeSecret=env('STRIPE_SECRET_KEY');
    if(!webhookSecret||!stripeSecret)return json(res,503,{ok:false,error:'Stripe webhook is not configured.'});
    const raw=await readRawBody(req),signature=req.headers['stripe-signature']||req.headers['Stripe-Signature']||'';
    if(!verifyStripeSignature(raw,signature,webhookSecret))return json(res,400,{ok:false,error:'Invalid Stripe webhook signature.'});
    let event;try{event=JSON.parse(raw.toString('utf8'))}catch{return json(res,400,{ok:false,error:'Invalid Stripe webhook payload.'})}
    let result={handled:false};
    if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))result=await processCheckoutSession(event.data?.object);
    else if(['refund.created','refund.updated'].includes(event.type))result=await processRefund(event.data?.object);
    else if(event.type==='charge.refunded'){
      const charge=event.data?.object,results=[];for(const refund of charge?.refunds?.data||[])results.push(await processRefund(refund,charge?.payment_intent||''));result={handled:true,refunds:results};
    }
    return json(res,200,{ok:true,received:true,eventType:String(event.type||''),handled:result.handled!==false});
  }catch(e){return safeError(res,e)}
};
module.exports.config={api:{bodyParser:false}};
module.exports.processCheckoutSession=processCheckoutSession;
module.exports.processRefund=processRefund;
module.exports.attachProcessorDetails=attachProcessorDetails;
