const { json, parseBody, db, env, requireStaff, ensureInvoiceForBooking, syncInvoicePaymentState, sendEmail, escapeHtml, cancelPendingBusinessNotifications, auditLog, safeError } = require('../lib/server');
const { receiptNumber } = require('../lib/payment-receipts');
const { createRefund, refundIdempotencyKey } = require('../lib/stripe-payments');
const { processRefund } = require('./stripe-webhook');
const METHODS=new Set(['cash','bank_transfer','card','other']);
const KINDS=new Set(['deposit','balance','full','adjustment','refund']);
async function invoiceContext(invoiceId){
  const invoice=(await db(`invoices?id=eq.${encodeURIComponent(invoiceId)}&select=*&limit=1`))?.[0];
  if(!invoice)return null;
  const booking=invoice.booking_id?(await db(`bookings?id=eq.${encodeURIComponent(invoice.booking_id)}&select=*&limit=1`))?.[0]:null;
  const quote=invoice.quote_id?(await db(`quotes?id=eq.${encodeURIComponent(invoice.quote_id)}&select=id,customer_id,customer_name,email,phone,postcode,service_key,final_price,automatic_estimate&limit=1`))?.[0]:null;
  return {invoice,booking,quote};
}
async function listData(){
  const invoices=await db('invoices?select=*&order=created_at.desc&limit=500');
  const invoiceIds=(invoices||[]).map(x=>x.id),bookingIds=[...new Set((invoices||[]).map(x=>x.booking_id).filter(Boolean))],quoteIds=[...new Set((invoices||[]).map(x=>x.quote_id).filter(Boolean))];
  let payments=[],bookings=[],quotes=[];
  if(invoiceIds.length)payments=await db(`payment_records?invoice_id=in.(${invoiceIds.map(x=>encodeURIComponent(x)).join(',')})&select=*&order=paid_at.desc`);
  if(bookingIds.length)bookings=await db(`bookings?id=in.(${bookingIds.map(x=>encodeURIComponent(x)).join(',')})&select=id,starts_at,ends_at,address,status,payment_status`);
  if(quoteIds.length)quotes=await db(`quotes?id=in.(${quoteIds.map(x=>encodeURIComponent(x)).join(',')})&select=id,customer_id,customer_name,email,phone,postcode,service_key,final_price,automatic_estimate`);
  const bmap=Object.fromEntries(bookings.map(x=>[x.id,x])),qmap=Object.fromEntries(quotes.map(x=>[x.id,x])),pmap={};for(const p of payments){const safe={...p,receipt_number:receiptNumber(p)};(pmap[p.invoice_id]??=[]).push(safe)}
  return (invoices||[]).map(i=>({invoice:i,booking:bmap[i.booking_id]||null,quote:qmap[i.quote_id]||null,payments:pmap[i.id]||[]}));
}
module.exports=async function handler(req,res){
  try{
    const staff=await requireStaff(req,'payments');
    if(req.method==='GET')return json(res,200,{ok:true,records:await listData()});
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const b=parseBody(req),action=String(b.action||'').trim();
    if(action==='create_invoice'){
      const bookingId=String(b.bookingId||'').trim();if(!bookingId)return json(res,400,{ok:false,error:'Booking ID is required.'});
      const invoice=await ensureInvoiceForBooking(bookingId,{issue:true});await auditLog(req,staff,{action:'invoice.create_or_issue',entityType:'invoice',entityId:invoice?.id||bookingId,summary:'Created or issued invoice for booking',after:invoice,metadata:{bookingId}});return json(res,200,{ok:true,invoice});
    }
    const invoiceId=String(b.invoiceId||'').trim();if(!invoiceId)return json(res,400,{ok:false,error:'Invoice ID is required.'});
    const ctx=await invoiceContext(invoiceId);if(!ctx)return json(res,404,{ok:false,error:'Invoice not found.'});
    if(action==='void_payment_record'){
      const paymentId=String(b.paymentId||'').trim(),reason=String(b.reason||'').trim().slice(0,500);
      if(!paymentId)return json(res,400,{ok:false,error:'Payment record ID is required.'});
      if(reason.length<3)return json(res,400,{ok:false,error:'Add a short reason for correcting this refund record.'});
      const payment=(await db(`payment_records?id=eq.${encodeURIComponent(paymentId)}&invoice_id=eq.${encodeURIComponent(invoiceId)}&select=*&limit=1`))?.[0];
      if(!payment)return json(res,404,{ok:false,error:'Payment record not found.'});
      if(payment.voided_at)return json(res,409,{ok:false,error:'This payment record has already been voided.'});
      if(payment.direction!=='refund'||payment.method==='stripe'||payment.provider_reference)return json(res,400,{ok:false,error:'Only manual refund records can be undone here. Stripe refunds must remain reconciled to Stripe.'});
      const beforeState=await syncInvoicePaymentState(invoiceId),voidedAt=new Date().toISOString();
      const voided=(await db(`payment_records?id=eq.${encodeURIComponent(paymentId)}`,{method:'PATCH',prefer:'return=representation',body:{voided_at:voidedAt,voided_by:staff.user.id,void_reason:reason}}))?.[0]||payment;
      const updated=await syncInvoicePaymentState(invoiceId);
      await auditLog(req,staff,{action:'payment.refund_void',entityType:'invoice',entityId:invoiceId,summary:`Voided mistaken manual refund ${receiptNumber(payment)}`,before:payment,after:voided,metadata:{paymentId,receiptNumber:receiptNumber(payment),reason,invoiceBefore:beforeState.invoice,invoiceAfter:updated.invoice}});
      return json(res,200,{ok:true,voidedPayment:{id:paymentId,receiptNumber:receiptNumber(payment),voidedAt},state:updated});
    }
    if(action==='record_payment'||action==='record_refund'){
      if(ctx.invoice.status==='void')return json(res,409,{ok:false,error:'A void invoice cannot accept payments.'});
      const amount=Number(b.amount),method=String(b.method||'other'),direction=action==='record_refund'?'refund':'payment',kind=direction==='refund'?'refund':String(b.kind||'balance');
      if(!Number.isFinite(amount)||amount<=0)return json(res,400,{ok:false,error:'Enter a valid payment amount.'});
      if(direction==='payment'&&method==='stripe')return json(res,400,{ok:false,error:'Stripe payments are recorded automatically from verified Stripe webhooks and cannot be entered manually.'});
      if((method!=='stripe'&&!METHODS.has(method))||!KINDS.has(kind))return json(res,400,{ok:false,error:'Choose a valid payment method and type.'});
      const state=await syncInvoicePaymentState(invoiceId),outstanding=state.outstanding,net=state.net;
      if(direction==='payment'&&amount>outstanding+.005)return json(res,400,{ok:false,error:`Payment cannot exceed the outstanding balance of £${outstanding.toFixed(2)}.`});
      if(direction==='refund'&&amount>net+.005)return json(res,400,{ok:false,error:`Refund cannot exceed the net amount paid of £${net.toFixed(2)}.`});
      if(direction==='refund'&&method==='stripe'){
        const providerPaymentId=String(b.providerPaymentId||'').trim();
        if(!providerPaymentId)return json(res,400,{ok:false,error:'Choose the Stripe payment to refund.'});
        const stripeRows=await db(`payment_records?invoice_id=eq.${encodeURIComponent(invoiceId)}&method=eq.stripe&voided_at=is.null&select=*&order=paid_at.desc`);
        const target=(stripeRows||[]).find(p=>p.direction==='payment'&&String(p.provider_payment_id||'')===providerPaymentId);
        if(!target)return json(res,400,{ok:false,error:'That Stripe payment is not available for this invoice.'});
        const alreadyRefunded=(stripeRows||[]).filter(p=>p.direction==='refund'&&String(p.provider_payment_id||'')===providerPaymentId).reduce((sum,p)=>sum+Number(p.amount||0),0);
        const available=Math.max(0,Number(target.amount||0)-alreadyRefunded);
        if(amount>available+.005)return json(res,400,{ok:false,error:`This Stripe payment has £${available.toFixed(2)} left available to refund.`});
        const secret=env('STRIPE_SECRET_KEY');if(!secret)return json(res,503,{ok:false,error:'Stripe is not configured.'});
        const liveSecret=String(secret).startsWith('sk_live_');
        if(target.provider_livemode!==null&&target.provider_livemode!==undefined&&Boolean(target.provider_livemode)!==liveSecret)return json(res,409,{ok:false,error:'This payment belongs to a different Stripe environment. Switch Namdar to the matching Stripe mode before refunding it.'});
        const idempotencyKey=refundIdempotencyKey({paymentRecordId:target.id,paymentIntentId:providerPaymentId,amount,alreadyRefunded});
        const refund=await createRefund({secret,paymentIntentId:providerPaymentId,amount:Number(amount.toFixed(2)),idempotencyKey,metadata:{namdar_invoice_id:invoiceId,namdar_payment_id:target.id,source:'admin'}});
        let processed={handled:true,recorded:false,reason:`refund_${String(refund.status||'unknown')}`};
        if(String(refund.status||'')==='succeeded'){
          try{processed=await processRefund(refund,providerPaymentId)}catch(error){
            const providerReference=`stripe_refund:${String(refund.id||'')}`;
            const existing=(await db(`payment_records?provider_reference=eq.${encodeURIComponent(providerReference)}&select=*&limit=1`).catch(()=>[]))?.[0]||null;
            if(!existing)throw error;
            processed={handled:true,recorded:false,invoiceId,receiptNumber:receiptNumber(existing),reconciliationPending:true};
          }
        }
        const updated=await syncInvoicePaymentState(invoiceId);
        await auditLog(req,staff,{action:'payment.stripe_refund',entityType:'invoice',entityId:invoiceId,summary:`Requested Stripe refund of £${amount.toFixed(2)}${processed.receiptNumber?` · ${processed.receiptNumber}`:''}`,before:state.invoice,after:updated.invoice,metadata:{stripeRefundId:refund.id||null,stripeRefundStatus:refund.status||null,providerPaymentId,paymentId:target.id,receiptNumber:processed.receiptNumber||null,amount:Number(amount.toFixed(2)),reconciliationPending:Boolean(processed.reconciliationPending)}});
        return json(res,200,{ok:true,stripeRefund:{id:refund.id||null,status:refund.status||null,amount:Number(amount.toFixed(2))},receiptNumber:processed.receiptNumber||null,pending:String(refund.status||'')!=='succeeded',reconciliationPending:Boolean(processed.reconciliationPending),state:updated});
      }
      if(direction==='refund'){
        const methodRows=await db(`payment_records?invoice_id=eq.${encodeURIComponent(invoiceId)}&method=eq.${encodeURIComponent(method)}&voided_at=is.null&select=direction,amount`);
        const methodPaid=(methodRows||[]).filter(p=>p.direction==='payment').reduce((sum,p)=>sum+Number(p.amount||0),0);
        const methodRefunded=(methodRows||[]).filter(p=>p.direction==='refund').reduce((sum,p)=>sum+Number(p.amount||0),0);
        const methodAvailable=Math.max(0,Number((methodPaid-methodRefunded).toFixed(2)));
        if(amount>methodAvailable+.005)return json(res,400,{ok:false,error:`A ${String(method).replaceAll('_',' ')} refund cannot exceed the £${methodAvailable.toFixed(2)} actually received by that method. Refund the original payment method instead.`});
      }
      const rows=await db('payment_records',{method:'POST',prefer:'return=representation',body:{booking_id:ctx.invoice.booking_id,invoice_id:ctx.invoice.id,customer_id:ctx.invoice.customer_id||null,direction,payment_kind:kind,method,amount:Number(amount.toFixed(2)),reference:String(b.reference||'').trim().slice(0,240)||null,paid_at:b.paidAt?new Date(b.paidAt).toISOString():new Date().toISOString(),recorded_by:staff.user.id}});const payment=rows?.[0],receiptNo=receiptNumber(payment);
      const updated=await syncInvoicePaymentState(invoiceId);const q=ctx.quote;
      if(updated.outstanding<.005)await cancelPendingBusinessNotifications('invoice',invoiceId,'invoice_overdue').catch(()=>null);
      if(q?.email){const refund=direction==='refund',subject=refund?`Namdar refund receipt ${receiptNo}`:`Namdar payment receipt ${receiptNo}`;await sendEmail({to:q.email,subject,html:`<p>Hi ${escapeHtml(q.customer_name||'there')},</p><p>${refund?'A refund of':'We recorded a payment of'} <strong>£${amount.toFixed(2)}</strong> for invoice <strong>${escapeHtml(ctx.invoice.invoice_number)}</strong>.</p><p><strong>Receipt number:</strong> ${escapeHtml(receiptNo)}<br><strong>Payment method:</strong> ${escapeHtml(String(method).replaceAll('_',' '))}<br><strong>Date:</strong> ${escapeHtml(new Date(payment?.paid_at||Date.now()).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}))}${payment?.reference?`<br><strong>Payment reference:</strong> ${escapeHtml(payment.reference)}`:''}</p><p>Net paid: £${updated.net.toFixed(2)} · Outstanding: £${updated.outstanding.toFixed(2)}</p><p>Your receipt PDF and payment history are available in <a href="https://namdar.co.uk/account?tab=billing">My Namdar</a>. Please quote <strong>${escapeHtml(receiptNo)}</strong> if you contact us about this transaction.</p>`,archiveForCustomer:true,customerId:q.customer_id||ctx.invoice.customer_id||null,messageCategory:'billing',targetPath:'/account?tab=billing',messageKey:`manual-${direction}:${payment?.id||invoiceId}`})}
      await auditLog(req,staff,{action:direction==='refund'?'payment.refund':'payment.record',entityType:'invoice',entityId:invoiceId,summary:`${direction==='refund'?'Recorded refund':'Recorded payment'} of £${amount.toFixed(2)} · ${receiptNo}`,before:state.invoice,after:updated.invoice,metadata:{paymentId:payment?.id||null,receiptNumber:receiptNo,amount:Number(amount.toFixed(2)),method,kind,direction}});
      return json(res,200,{ok:true,payment:payment?{...payment,receipt_number:receiptNo}:payment,state:updated});
    }
    if(action==='update_invoice'){
      const due=b.dueAt?new Date(b.dueAt):null;if(due&&!Number.isFinite(due.getTime()))return json(res,400,{ok:false,error:'Choose a valid due date.'});
      const patch={notes:String(b.notes||'').trim().slice(0,3000)||null,updated_at:new Date().toISOString()};if(due)patch.due_at=due.toISOString();
      const invoice=(await db(`invoices?id=eq.${encodeURIComponent(invoiceId)}`,{method:'PATCH',prefer:'return=representation',body:patch}))?.[0];await auditLog(req,staff,{action:'invoice.update',entityType:'invoice',entityId:invoiceId,summary:`Updated invoice ${ctx.invoice.invoice_number||''}`.trim(),before:ctx.invoice,after:invoice});return json(res,200,{ok:true,invoice});
    }
    if(action==='issue_invoice'||action==='send_invoice'){
      let invoice=ctx.invoice;if(invoice.status==='draft')invoice=(await db(`invoices?id=eq.${encodeURIComponent(invoiceId)}`,{method:'PATCH',prefer:'return=representation',body:{status:'issued',issued_at:new Date().toISOString(),updated_at:new Date().toISOString()}}))?.[0]||invoice;
      const state=await syncInvoicePaymentState(invoiceId),q=ctx.quote;
      if(q?.email)await sendEmail({to:q.email,subject:`Namdar invoice ${invoice.invoice_number}`,html:`<p>Hi ${escapeHtml(q.customer_name||'there')},</p><p>Your Namdar invoice <strong>${escapeHtml(invoice.invoice_number)}</strong> is ready.</p><p>Total: <strong>£${Number(invoice.total||0).toFixed(2)}</strong><br>Paid: £${state.net.toFixed(2)}<br>Outstanding: <strong>£${state.outstanding.toFixed(2)}</strong></p><p>View or download it securely from <a href="https://namdar.co.uk/account?tab=billing">My Namdar</a>.</p>`,archiveForCustomer:true,customerId:q.customer_id||invoice.customer_id||null,messageCategory:'billing',targetPath:'/account?tab=billing'});
      await auditLog(req,staff,{action:action==='send_invoice'?'invoice.send':'invoice.issue',entityType:'invoice',entityId:invoiceId,summary:`${action==='send_invoice'?'Sent':'Issued'} invoice ${invoice.invoice_number||''}`.trim(),before:ctx.invoice,after:state.invoice,metadata:{emailSent:Boolean(q?.email)}});
      return json(res,200,{ok:true,invoice:state.invoice,emailSent:Boolean(q?.email)});
    }
    if(action==='void_invoice'){
      const state=await syncInvoicePaymentState(invoiceId);if(state.net>0)return json(res,409,{ok:false,error:'Refund or remove the paid balance before voiding this invoice.'});
      const invoice=(await db(`invoices?id=eq.${encodeURIComponent(invoiceId)}`,{method:'PATCH',prefer:'return=representation',body:{status:'void',updated_at:new Date().toISOString()}}))?.[0];await cancelPendingBusinessNotifications('invoice',invoiceId,'invoice_overdue').catch(()=>null);await auditLog(req,staff,{action:'invoice.void',entityType:'invoice',entityId:invoiceId,summary:`Voided invoice ${ctx.invoice.invoice_number||''}`.trim(),before:ctx.invoice,after:invoice});return json(res,200,{ok:true,invoice});
    }
    return json(res,400,{ok:false,error:'Unknown payment action.'});
  }catch(e){return safeError(res,e)}
};
