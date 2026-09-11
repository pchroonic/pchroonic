const { json, parseBody, db, env, requireCustomer, ensureInvoiceForBooking, syncInvoicePaymentState, safeError } = require('../lib/server');
module.exports = async function handler(req,res){
  try{
    if(req.method!=='POST') return json(res,405,{ok:false,error:'Method not allowed'});
    const stripeKey=env('STRIPE_SECRET_KEY');if(!stripeKey)return json(res,503,{ok:false,error:'Online payment is not enabled yet.'});
    const {user}=await requireCustomer(req);const b=parseBody(req),bookingId=String(b.bookingId||'').trim();if(!bookingId)return json(res,400,{ok:false,error:'Booking ID is required.'});
    const booking=(await db(`bookings?id=eq.${encodeURIComponent(bookingId)}&select=*&limit=1`))?.[0];if(!booking)return json(res,404,{ok:false,error:'Booking not found.'});if(booking.customer_id!==user.id)return json(res,403,{ok:false,error:'This booking does not belong to your account.'});
    const invoice=await ensureInvoiceForBooking(booking,{issue:true}),state=await syncInvoicePaymentState(invoice.id);if(state.outstanding<=.004)return json(res,409,{ok:false,error:'This invoice is already paid.'});
    const quote=booking.quote_id?(await db(`quotes?id=eq.${encodeURIComponent(booking.quote_id)}&select=id,email,customer_name,service_key&limit=1`))?.[0]:null;if(!quote)return json(res,404,{ok:false,error:'Quote not found.'});
    const percent=Math.max(1,Math.min(100,Number(env('NAMDAR_DEPOSIT_PERCENT','20'))||20));let kind='balance',charge=state.outstanding;
    if(state.net<=.004&&percent<100){kind='deposit';charge=Math.min(state.outstanding,Math.max(.5,Number((Number(invoice.total||0)*percent/100).toFixed(2))))}else if(state.net<=.004&&percent>=100){kind='full'}
    const amountPence=Math.max(50,Math.round(charge*100));
    const params=new URLSearchParams();params.set('mode','payment');params.set('customer_email',quote.email);params.set('success_url','https://namdar.co.uk/account?tab=billing&payment=success&session_id={CHECKOUT_SESSION_ID}');params.set('cancel_url','https://namdar.co.uk/account?tab=billing&payment=cancelled');params.set('line_items[0][quantity]','1');params.set('line_items[0][price_data][currency]','gbp');params.set('line_items[0][price_data][unit_amount]',String(amountPence));params.set('line_items[0][price_data][product_data][name]',`Namdar ${kind==='deposit'?'booking deposit':kind==='full'?'payment':'balance'} — ${quote.service_key}`);params.set('metadata[booking_id]',booking.id);params.set('metadata[invoice_id]',invoice.id);params.set('metadata[payment_kind]',kind);params.set('metadata[customer_id]',user.id);
    const response=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:`Bearer ${stripeKey}`,'Content-Type':'application/x-www-form-urlencoded'},body:params.toString()});const session=await response.json();if(!response.ok){const e=new Error(session?.error?.message||'Could not create Stripe checkout.');e.status=502;throw e}
    await db(`bookings?id=eq.${encodeURIComponent(booking.id)}`,{method:'PATCH',prefer:'return=minimal',body:{stripe_checkout_session_id:session.id}});
    return json(res,200,{ok:true,url:session.url,sessionId:session.id,invoiceId:invoice.id,paymentKind:kind,amount:Number(charge.toFixed(2)),outstanding:state.outstanding,depositPercent:percent});
  }catch(e){return safeError(res,e)}
};
