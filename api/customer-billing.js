const {json,db,requireCustomer,env,safeError}=require('../lib/server');
const {loadPaymentPolicy,checkoutPlan}=require('../lib/payment-policy');
const SERVICE_LABELS={windows:'Window cleaning',gutters:'Gutter cleaning',roof:'Roof cleaning',jetwash:'Jet washing',handyman:'Handyman',tour3d:'3D property tour'};

module.exports=async function handler(req,res){
  try{
    if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
    const {user}=await requireCustomer(req),policy=await loadPaymentPolicy({db,env});
    const invoices=await db(`invoices?customer_id=eq.${encodeURIComponent(user.id)}&select=*&order=created_at.desc&limit=300`);
    const invoiceIds=(invoices||[]).map(x=>x.id),bookingIds=[...new Set((invoices||[]).map(x=>x.booking_id).filter(Boolean))],quoteIds=[...new Set((invoices||[]).map(x=>x.quote_id).filter(Boolean))];
    let payments=[],bookings=[],quotes=[];
    if(invoiceIds.length)payments=await db(`payment_records?invoice_id=in.(${invoiceIds.map(x=>encodeURIComponent(x)).join(',')})&select=id,invoice_id,booking_id,direction,payment_kind,method,amount,reference,paid_at,created_at&order=paid_at.desc`);
    if(bookingIds.length)bookings=await db(`bookings?id=in.(${bookingIds.map(x=>encodeURIComponent(x)).join(',')})&select=id,starts_at,ends_at,address,status,payment_status`);
    if(quoteIds.length)quotes=await db(`quotes?id=in.(${quoteIds.map(x=>encodeURIComponent(x)).join(',')})&select=id,service_key,customer_name,postcode`);
    const bmap=Object.fromEntries(bookings.map(x=>[x.id,x])),qmap=Object.fromEntries(quotes.map(x=>[x.id,x])),pmap={};for(const p of payments){(pmap[p.invoice_id]??=[]).push(p)}
    const rows=(invoices||[]).map(i=>{const b=bmap[i.booking_id]||{},q=qmap[i.quote_id]||{},paid=Number(i.amount_paid||0),total=Number(i.total||0),outstanding=Number(Math.max(0,total-paid).toFixed(2));
      const eligible=policy.effectiveActive&&q.service_key==='windows'&&['pending','confirmed','completed'].includes(b.status)&&i.status!=='void'&&outstanding>.004;
      const plan=eligible?checkoutPlan({policy,total,net:paid,outstanding}):null;
      return{
        id:i.id,invoiceNumber:i.invoice_number,status:i.status,currency:i.currency,total,amountPaid:paid,outstanding,issuedAt:i.issued_at,dueAt:i.due_at,paidAt:i.paid_at,notes:i.notes||'',
        booking:{id:i.booking_id,startsAt:b.starts_at||null,endsAt:b.ends_at||null,address:b.address||'',status:b.status||'',paymentStatus:b.payment_status||''},
        serviceKey:q.service_key||'',serviceLabel:SERVICE_LABELS[q.service_key]||q.service_key||'Namdar service',customerName:q.customer_name||'',postcode:q.postcode||'',
        onlinePayment:plan?{available:true,kind:plan.kind,amount:plan.amount,required:plan.required,allowFullPayment:policy.allowFullPayment&&plan.kind==='deposit'}:{available:false},
        payments:(pmap[i.id]||[]).map(p=>({id:p.id,direction:p.direction,kind:p.payment_kind,method:p.method,amount:Number(p.amount||0),reference:p.reference||'',paidAt:p.paid_at}))
      };
    });
    return json(res,200,{ok:true,invoices:rows,stripeEnabled:policy.effectiveActive,onlinePaymentsEnabled:policy.effectiveActive,stripeConfigured:policy.stripeConfigured,webhookConfigured:policy.webhookConfigured,paymentPolicy:{active:policy.active,effectiveActive:policy.effectiveActive,mode:policy.mode,depositPercent:policy.depositPercent,minimumDeposit:policy.minimumDeposit,allowFullPayment:policy.allowFullPayment}});
  }catch(e){return safeError(res,e)}
};
