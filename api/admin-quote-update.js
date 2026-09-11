const { json, parseBody, db, requireStaff, ensureInvoiceForBooking, sendEmail, escapeHtml, cancelPendingBusinessNotifications, auditLog, safeError } = require('../lib/server');
const STATUSES=new Set(['new','reviewing','sent','approved','declined','expired']);
module.exports=async function handler(req,res){
  try{
    if(req.method!=='PATCH') return json(res,405,{ok:false,error:'Method not allowed'});
    const staff=await requireStaff(req,'quotes');
    const b=parseBody(req),id=String(b.id||''),status=String(b.status||'');
    if(!id||!STATUSES.has(status)) return json(res,400,{ok:false,error:'Quote ID and valid status are required.'});
    const current=(await db(`quotes?id=eq.${encodeURIComponent(id)}&select=*&limit=1`))?.[0];if(!current)return json(res,404,{ok:false,error:'Quote not found.'});
    const price=b.finalPrice===''||b.finalPrice===null||b.finalPrice===undefined?null:Number(b.finalPrice);if(price!==null&&(!Number.isFinite(price)||price<0)) return json(res,400,{ok:false,error:'Final price must be a valid amount.'});
    const notes=String(b.adminNotes||'').slice(0,4000),customerNote=String(b.customerNote||'').slice(0,2500);
    let expiresAt=null;
    if(b.expiresAt){const raw=String(b.expiresAt).slice(0,10),d=new Date(`${raw}T23:59:59`);if(!/^\d{4}-\d{2}-\d{2}$/.test(raw)||!Number.isFinite(d.getTime()))return json(res,400,{ok:false,error:'Choose a valid quote expiry date.'});expiresAt=d.toISOString()}
    else if(['sent','approved'].includes(status))expiresAt=current.expires_at&&new Date(current.expires_at).getTime()>Date.now()?current.expires_at:new Date(Date.now()+14*86400000).toISOString();
    const oldPrice=current.final_price==null?null:Number(current.final_price),priceChanged=(oldPrice===null)!==(price===null)||(oldPrice!==null&&price!==null&&Math.abs(oldPrice-price)>.005),statusChanged=current.status!==status;
    const nowIso=new Date().toISOString(),shouldSendFinal=((statusChanged&&['sent','approved'].includes(status))||(priceChanged&&['sent','approved'].includes(status)));
    const patch={final_price:price,status,admin_notes:notes,customer_quote_note:customerNote,expires_at:expiresAt,updated_at:nowIso};if(shouldSendFinal)patch.sent_at=nowIso;
    const reopening=['sent','approved'].includes(status)&&!['sent','approved'].includes(current.status);if(reopening||priceChanged&&current.customer_response!=='pending'){patch.customer_response='pending';patch.customer_responded_at=null;patch.customer_response_note=null;if(status==='approved'&&priceChanged)patch.status='sent'}
    if(status==='declined')patch.customer_response='declined';
    const rows=await db(`quotes?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=representation',body:patch});const q=rows?.[0];if(!q)return json(res,404,{ok:false,error:'Quote not found.'});
    if(priceChanged){const booking=(await db(`bookings?quote_id=eq.${encodeURIComponent(id)}&status=neq.cancelled&select=*&limit=1`))?.[0];if(booking)await ensureInvoiceForBooking(booking,{issue:['sent','approved'].includes(q.status)}).catch(()=>null)}
    if(!['sent','approved'].includes(q.status)||q.customer_response!=='pending')await cancelPendingBusinessNotifications('quote',q.id,'quote_reminder').catch(()=>null);
    await auditLog(req,staff,{action:'quote.update',entityType:'quote',entityId:q.id,summary:`Updated ${q.customer_name||'customer'} quote`,before:current,after:q,metadata:{priceChanged,statusChanged,finalQuoteSent:shouldSendFinal}});
    if(q.email&&shouldSendFinal){
      const amount=price!==null?price:Number(q.automatic_estimate||0),subject='Your Namdar quote is ready',expiry=q.expires_at?new Date(q.expires_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'';
      await sendEmail({to:q.email,subject,html:`<p>Hi ${escapeHtml(q.customer_name)},</p><p>Your final Namdar quote is <strong>£${amount.toFixed(2)}</strong>.</p>${customerNote?`<p>${escapeHtml(customerNote).replace(/\n/g,'<br>')}</p>`:''}${expiry?`<p>This quote is valid until <strong>${escapeHtml(expiry)}</strong>.</p>`:''}<p>Sign in to <a href="https://namdar.co.uk/account?tab=quotes&quote=${encodeURIComponent(q.id)}">My Namdar</a> to open this quote directly, accept or decline it, and choose an appointment after acceptance.</p>`,archiveForCustomer:true,customerId:q.customer_id||null,messageCategory:'quote',targetPath:`/account?tab=quotes&quote=${encodeURIComponent(q.id)}`});
    }
    return json(res,200,{ok:true,quote:q});
  }catch(e){return safeError(res,e)}
};
