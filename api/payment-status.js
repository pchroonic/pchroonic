const { json, parseBody, db, env, requireCustomer, syncInvoicePaymentState, createStaffNotification, safeError, queryParam } = require('../lib/server');
module.exports=async function handler(req,res){
  try{
    if(!['GET','POST'].includes(req.method))return json(res,405,{ok:false,error:'Method not allowed'});
    const stripeKey=env('STRIPE_SECRET_KEY');if(!stripeKey)return json(res,503,{ok:false,error:'Online payment is not enabled.'});const {user}=await requireCustomer(req);
    const sessionId=String(queryParam(req,'session_id')||parseBody(req).sessionId||'').trim();if(!sessionId.startsWith('cs_'))return json(res,400,{ok:false,error:'Invalid payment session.'});
    const response=await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,{headers:{Authorization:`Bearer ${stripeKey}`}});const session=await response.json();if(!response.ok){const e=new Error(session?.error?.message||'Could not verify payment.');e.status=502;throw e}
    const bookingId=session?.metadata?.booking_id,invoiceId=session?.metadata?.invoice_id;if(!bookingId||!invoiceId)return json(res,400,{ok:false,error:'This payment is not linked to a Namdar invoice.'});
    const booking=(await db(`bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,customer_id&limit=1`))?.[0];if(!booking||booking.customer_id!==user.id)return json(res,403,{ok:false,error:'This payment does not belong to your account.'});
    if(session.payment_status==='paid'){
      const existing=(await db(`payment_records?provider_reference=eq.${encodeURIComponent(session.id)}&select=id&limit=1`))?.[0];if(!existing){const amount=Number(session.amount_total||0)/100;if(amount<=0)return json(res,400,{ok:false,error:'Stripe returned an invalid payment amount.'});await db('payment_records',{method:'POST',prefer:'return=minimal',body:{booking_id:bookingId,invoice_id:invoiceId,customer_id:user.id,direction:'payment',payment_kind:String(session?.metadata?.payment_kind||'balance'),method:'stripe',amount:Number(amount.toFixed(2)),reference:'Stripe Checkout',provider_reference:session.id,paid_at:new Date().toISOString()}});await createStaffNotification({type:'payment_received',title:'Online payment received',body:`${user.email||'Customer'} · £${amount.toFixed(2)}`,targetPath:'/admin?tab=payments',permissionKey:'payments',entityType:'invoice',entityId:invoiceId,priority:'normal',dedupeKey:`stripe-payment:${session.id}`})}
    }
    const state=await syncInvoicePaymentState(invoiceId);return json(res,200,{ok:true,paid:session.payment_status==='paid',paymentStatus:state.invoice.status,bookingId,invoiceId,amountPaid:state.net,outstanding:state.outstanding});
  }catch(e){return safeError(res,e)}
};
