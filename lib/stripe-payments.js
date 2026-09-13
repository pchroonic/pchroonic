'use strict';

const crypto=require('crypto');

function stripeError(message,status=502,details=null){const e=new Error(message);e.status=status;e.details=details;return e}
function checkoutIdempotencyKey({invoiceId,net=0,outstanding=0,kind='',amount=0}){
  const state=[invoiceId,Number(net).toFixed(2),Number(outstanding).toFixed(2),kind,Number(amount).toFixed(2)].join('|');
  return `namdar_checkout_${crypto.createHash('sha256').update(state).digest('hex').slice(0,48)}`;
}
async function stripeRequest(path,{secret,method='GET',form=null,idempotencyKey=''}={}){
  if(!secret)throw stripeError('Stripe is not configured.',503);
  const headers={Authorization:`Bearer ${secret}`};
  if(form!==null)headers['Content-Type']='application/x-www-form-urlencoded';
  if(idempotencyKey)headers['Idempotency-Key']=String(idempotencyKey).slice(0,255);
  const response=await fetch(`https://api.stripe.com/v1/${String(path||'').replace(/^\//,'')}`,{method,headers,body:form===null?undefined:(form instanceof URLSearchParams?form.toString():String(form))});
  const text=await response.text();let data=null;try{data=text?JSON.parse(text):{}}catch{data={}}
  if(!response.ok)throw stripeError(data?.error?.message||`Stripe request failed (${response.status}).`,response.status===429?503:502,data?.error||null);
  return data;
}
function createCheckoutForm({booking,invoice,quote,amount,kind,origin='https://namdar.co.uk'}){
  const amountPence=Math.max(50,Math.round(Number(amount||0)*100));
  const base=String(origin||'https://namdar.co.uk').replace(/\/$/,'');
  const p=new URLSearchParams();
  p.set('mode','payment');
  if(quote?.email)p.set('customer_email',String(quote.email));
  p.set('client_reference_id',String(booking.id));
  p.set('success_url',`${base}/account?tab=billing&payment=success&session_id={CHECKOUT_SESSION_ID}`);
  p.set('cancel_url',`${base}/account?tab=billing&payment=cancelled`);
  p.set('line_items[0][quantity]','1');
  p.set('line_items[0][price_data][currency]','gbp');
  p.set('line_items[0][price_data][unit_amount]',String(amountPence));
  p.set('line_items[0][price_data][product_data][name]',`Namdar ${kind==='deposit'?'booking deposit':kind==='full'?'payment':'balance'} — Window cleaning`);
  const meta={booking_id:booking.id,invoice_id:invoice.id,payment_kind:kind,customer_id:booking.customer_id||'',service_key:'windows',amount_pence:String(amountPence)};
  for(const [key,value] of Object.entries(meta)){
    p.set(`metadata[${key}]`,String(value));
    p.set(`payment_intent_data[metadata][${key}]`,String(value));
  }
  return{form:p,amountPence};
}
async function createCheckoutSession(args){
  const {form,amountPence}=createCheckoutForm(args);
  const session=await stripeRequest('checkout/sessions',{secret:args.secret,method:'POST',form,idempotencyKey:args.idempotencyKey});
  if(!session?.id||!session?.url)throw stripeError('Stripe did not return a usable Checkout session.',502);
  return{session,amountPence};
}
async function retrieveCheckoutSession(secret,id){return stripeRequest(`checkout/sessions/${encodeURIComponent(id)}`,{secret})}
async function retrievePaymentIntent(secret,id){return stripeRequest(`payment_intents/${encodeURIComponent(id)}`,{secret})}

function parseStripeSignature(header=''){
  const raw=Array.isArray(header)?header.join(','):String(header||'');let timestamp=0;const signatures=[];
  for(const part of raw.split(',')){const [k,...rest]=part.trim().split('=');const v=rest.join('=');if(k==='t')timestamp=Number(v)||0;else if(k==='v1'&&v)signatures.push(v)}
  return{timestamp,signatures};
}
function secureEqual(a,b){const aa=Buffer.from(String(a)),bb=Buffer.from(String(b));return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb)}
function verifyStripeSignature(rawBody,header,secret,{toleranceSeconds=300,nowSeconds=Math.floor(Date.now()/1000)}={}){
  if(!secret)return false;const {timestamp,signatures}=parseStripeSignature(header);if(!timestamp||!signatures.length)return false;
  if(Math.abs(Number(nowSeconds)-timestamp)>Math.max(0,Number(toleranceSeconds)||300))return false;
  const payload=Buffer.concat([Buffer.from(`${timestamp}.`),Buffer.isBuffer(rawBody)?rawBody:Buffer.from(String(rawBody||''))]);
  const expected=crypto.createHmac('sha256',secret).update(payload).digest('hex');
  return signatures.some(sig=>secureEqual(sig,expected));
}
async function readRawBody(req,{limit=1024*1024}={}){
  if(Buffer.isBuffer(req?.body))return req.body;
  if(typeof req?.body==='string')return Buffer.from(req.body);
  if(req?.body&&typeof req.body==='object')throw stripeError('Webhook raw body is unavailable.',400);
  const chunks=[];let size=0;
  for await(const chunk of req){const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);size+=b.length;if(size>limit)throw stripeError('Webhook payload is too large.',413);chunks.push(b)}
  return Buffer.concat(chunks);
}

module.exports={stripeRequest,checkoutIdempotencyKey,createCheckoutForm,createCheckoutSession,retrieveCheckoutSession,retrievePaymentIntent,parseStripeSignature,verifyStripeSignature,readRawBody};
