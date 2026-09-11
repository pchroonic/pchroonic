const crypto = require('crypto');

function env(name, fallback = '') { return process.env[name] || fallback; }
function supabaseUrl() {
  const value = env('SUPABASE_URL') || env('NEXT_PUBLIC_SUPABASE_URL');
  if (!value) throw new Error('SUPABASE_URL is not configured');
  return value.replace(/\/$/, '');
}
function serviceKey() {
  const value = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY');
  if (!value) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  return value;
}
function publicKey() {
  const value = env('SUPABASE_ANON_KEY') || env('SUPABASE_PUBLISHABLE_KEY') || env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  if (!value) throw new Error('SUPABASE_ANON_KEY / publishable key is not configured');
  return value;
}
function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function queryParam(req, name, fallback = '') {
  const direct = req?.query?.[name];
  if (Array.isArray(direct)) return direct[0] ?? fallback;
  if (direct !== undefined && direct !== null && direct !== '') return direct;
  try {
    const host = req?.headers?.['x-forwarded-host'] || req?.headers?.host || 'namdar.local';
    const proto = (req?.headers?.['x-forwarded-proto'] || 'https').split(',')[0];
    const url = new URL(req?.url || '/', `${proto}://${host}`);
    return url.searchParams.get(name) ?? fallback;
  } catch {
    return fallback;
  }
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
}
async function db(path, options = {}) {
  const key = serviceKey();
  const headers = { apikey: key, Authorization: `Bearer ${key}`, ...(options.headers || {}) };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.prefer) headers.Prefer = options.prefer;
  const response = await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    method: options.method || 'GET', headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!response.ok) {
    const message = data?.message || data?.error_description || data?.hint || `Database request failed (${response.status})`;
    const error = new Error(message); error.status = response.status; error.details = data; throw error;
  }
  return data;
}
function bearer(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}
async function authUser(req) {
  const token = bearer(req); if (!token) return null;
  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, { headers: { apikey: publicKey(), Authorization: `Bearer ${token}` } });
  if (!response.ok) return null;
  return response.json();
}
async function userProfile(userId) {
  const rows = await db(`profiles?id=eq.${encodeURIComponent(userId)}&select=*&limit=1`);
  return rows?.[0] || null;
}
async function requireCustomer(req) {
  const user = await authUser(req);
  if (!user?.id) { const e = new Error('Please sign in to your Namdar account.'); e.status = 401; throw e; }
  const profile = await userProfile(user.id);
  if (!profile || profile.account_status && profile.account_status !== 'active') {
    const e = new Error('This Namdar account is not active.'); e.status = 403; throw e;
  }
  return { user, profile };
}
async function requireStaff(req, permission = null) {
  const user = await authUser(req);
  if (!user?.id) { const e = new Error('Please sign in as Namdar staff.'); e.status = 401; throw e; }
  const profile = await userProfile(user.id);
  if (!profile || !['admin','staff'].includes(profile.role) || (profile.account_status && profile.account_status !== 'active')) {
    const e = new Error('This account does not have Namdar staff access.'); e.status = 403; throw e;
  }
  if (profile.role === 'admin' || !permission) return { user, profile, permissions: { all: true } };
  const rows = await db(`staff_access?user_id=eq.${encodeURIComponent(user.id)}&select=permissions,active,job_title&limit=1`);
  const access = rows?.[0];
  if (!access?.active || access.permissions?.[permission] !== true) {
    const e = new Error(`You do not have permission to manage ${permission}.`); e.status = 403; throw e;
  }
  return { user, profile, permissions: access.permissions || {}, jobTitle: access.job_title || '' };
}
async function authAdmin(path, options = {}) {
  const key = serviceKey();
  const r = await fetch(`${supabaseUrl()}/auth/v1/admin/${path.replace(/^\//,'')}`, {
    method: options.method || 'GET',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await r.text(); let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!r.ok) { const e = new Error(data?.msg || data?.message || data?.error_description || `Auth admin request failed (${r.status})`); e.status=r.status; e.details=data; throw e; }
  return data;
}

async function ensureInvoiceForBooking(bookingOrId, options = {}) {
  const booking = typeof bookingOrId === 'string'
    ? (await db(`bookings?id=eq.${encodeURIComponent(bookingOrId)}&select=*&limit=1`))?.[0]
    : bookingOrId;
  if (!booking?.id) { const e = new Error('Booking not found.'); e.status = 404; throw e; }
  let invoice = (await db(`invoices?booking_id=eq.${encodeURIComponent(booking.id)}&select=*&limit=1`))?.[0] || null;
  let quote = null;
  if (booking.quote_id) quote = (await db(`quotes?id=eq.${encodeURIComponent(booking.quote_id)}&select=id,customer_id,final_price,automatic_estimate&limit=1`))?.[0] || null;
  const total = Math.max(0, Number(quote?.final_price ?? quote?.automatic_estimate ?? invoice?.total ?? 0));
  const issue = options.issue !== false;
  if (!invoice) {
    const issuedAt = issue ? new Date().toISOString() : null;
    const baseDue = booking.ends_at ? new Date(booking.ends_at) : new Date();
    baseDue.setDate(baseDue.getDate() + 7);
    const rows = await db('invoices',{method:'POST',prefer:'return=representation',body:{
      booking_id:booking.id,quote_id:booking.quote_id||null,customer_id:booking.customer_id||quote?.customer_id||null,
      total:Number(total.toFixed(2)),amount_paid:0,status:issue?'issued':'draft',issued_at:issuedAt,due_at:baseDue.toISOString()
    }});
    invoice = rows?.[0] || null;
  } else {
    const patch = {};
    if (Math.abs(Number(invoice.total||0)-total) > .004) patch.total = Number(total.toFixed(2));
    if (issue && invoice.status === 'draft') { patch.status='issued'; patch.issued_at=new Date().toISOString(); }
    if (Object.keys(patch).length) {
      patch.updated_at = new Date().toISOString();
      invoice = (await db(`invoices?id=eq.${encodeURIComponent(invoice.id)}`,{method:'PATCH',prefer:'return=representation',body:patch}))?.[0] || invoice;
    }
  }
  return invoice;
}
async function syncInvoicePaymentState(invoiceId) {
  let invoice = (await db(`invoices?id=eq.${encodeURIComponent(invoiceId)}&select=*&limit=1`))?.[0];
  if (!invoice) { const e = new Error('Invoice not found.'); e.status = 404; throw e; }
  const payments = await db(`payment_records?invoice_id=eq.${encodeURIComponent(invoiceId)}&select=id,direction,amount,paid_at&order=paid_at.asc`);
  const paid = (payments||[]).filter(p=>p.direction==='payment').reduce((a,p)=>a+Number(p.amount||0),0);
  const refunded = (payments||[]).filter(p=>p.direction==='refund').reduce((a,p)=>a+Number(p.amount||0),0);
  const net = Math.max(0, Number((paid-refunded).toFixed(2))), total = Math.max(0,Number(invoice.total||0));
  let invoiceStatus = invoice.status === 'void' ? 'void' : (total===0 || net >= total-.004 ? 'paid' : net>0 ? 'part_paid' : refunded>0 ? 'refunded' : (invoice.issued_at?'issued':'draft'));
  const latestPaidAt=(payments||[]).filter(p=>p.direction==='payment').map(p=>p.paid_at).filter(Boolean).sort().at(-1)||null;
  const invoicePatch={amount_paid:net,status:invoiceStatus,paid_at:invoiceStatus==='paid'?(invoice.paid_at||latestPaidAt||new Date().toISOString()):null,updated_at:new Date().toISOString()};
  invoice=(await db(`invoices?id=eq.${encodeURIComponent(invoiceId)}`,{method:'PATCH',prefer:'return=representation',body:invoicePatch}))?.[0]||invoice;
  if(invoice.booking_id){
    const bookingPayment = invoiceStatus==='paid'?'paid':net>0?'deposit_paid':refunded>0?'refunded':'unpaid';
    await db(`bookings?id=eq.${encodeURIComponent(invoice.booking_id)}`,{method:'PATCH',prefer:'return=minimal',body:{payment_status:bookingPayment}});
  }
  return {invoice,payments,paid:Number(paid.toFixed(2)),refunded:Number(refunded.toFixed(2)),net,outstanding:Number(Math.max(0,total-net).toFixed(2))};
}
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function stripHtml(value='') {
  return String(value).replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/p>/gi,'\n\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#39;/gi,"'").replace(/&quot;/gi,'"').replace(/[ \t]+/g,' ').replace(/\n\s+\n/g,'\n\n').trim();
}
function emailShell(content='') {
  return `<!doctype html><html><body style="margin:0;background:#f4f5ef;font-family:Arial,Helvetica,sans-serif;color:#0d1715"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f5ef;padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border-radius:20px;overflow:hidden"><tr><td style="background:#173c32;padding:22px 28px;color:#ffffff"><strong style="font-size:18px;letter-spacing:.16em">NAMDAR</strong></td></tr><tr><td style="padding:30px 28px;font-size:15px;line-height:1.65">${content}</td></tr><tr><td style="padding:20px 28px;border-top:1px solid #e2e6df;color:#68736f;font-size:12px;line-height:1.5">Namdar · London and surrounding areas<br>support@namdar.co.uk</td></tr></table></td></tr></table></body></html>`;
}
function customerMessageCategory(subject=''){
  const s=String(subject||'').toLowerCase();
  if(/quote/.test(s))return'quote';
  if(/booking|appointment|visit|on the way|job is complete|job complete/.test(s))return'booking';
  if(/invoice|payment|refund|receipt|balance/.test(s))return'billing';
  if(/ticket|support|feedback/.test(s))return'support';
  if(/account|password|sign-in|sign in|security|deletion|recover/.test(s))return'account';
  if(/newsletter|updates|offer/.test(s))return'marketing';
  return'general';
}
function customerMessageDefaultTarget(category='general'){
  return({quote:'/account?tab=quotes',booking:'/account?tab=bookings',billing:'/account?tab=billing',support:'/account?tab=support',account:'/account?tab=profile',marketing:'/account?tab=messages'})[category]||'/account?tab=messages';
}
async function archiveCustomerMessage({to,subject,content,text,customerId=null,category='',targetPath='',providerId=null,deliveryStatus='sent',messageKey=''}){
  const recipient=String(Array.isArray(to)?to[0]:to||'').trim().toLowerCase();if(!recipient||!recipient.includes('@'))return null;
  let cid=customerId||null;
  if(!cid){try{const row=(await db(`profiles?email=eq.${encodeURIComponent(recipient)}&role=eq.customer&select=id&limit=1`))?.[0];cid=row?.id||null}catch{}}
  const kind=category||customerMessageCategory(subject),target=String(targetPath||customerMessageDefaultTarget(kind)).slice(0,500),dedupe=String(messageKey||'').trim().slice(0,240)||null;
  const body={customer_id:cid,recipient_email:recipient,subject:String(subject||'Namdar message').slice(0,240),body_html:String(content||'').slice(0,50000),body_text:String(text||stripHtml(content||'')).slice(0,50000),category:kind,target_path:target,provider_id:providerId||null,delivery_status:deliveryStatus,sent_at:new Date().toISOString(),dedupe_key:dedupe};
  try{
    if(dedupe){
      const existing=(await db(`customer_messages?dedupe_key=eq.${encodeURIComponent(dedupe)}&select=id,read_at,archived_at&limit=1`))?.[0];
      if(existing?.id)return (await db(`customer_messages?id=eq.${encodeURIComponent(existing.id)}`,{method:'PATCH',prefer:'return=representation',body}))?.[0]||existing;
    }
    return (await db('customer_messages',{method:'POST',prefer:'return=representation',body}))?.[0]||null;
  }catch(e){
    if(dedupe&&String(e?.message||'').toLowerCase().includes('duplicate')){try{return (await db(`customer_messages?dedupe_key=eq.${encodeURIComponent(dedupe)}&select=*&limit=1`))?.[0]||null}catch{}}
    console.error('Customer message archive error:',e.message);return null
  }
}
async function sendEmail({ to, subject, html, text, from, replyTo, headers=null, archiveForCustomer=false, customerId=null, messageCategory='', targetPath='', messageKey='' }) {
  const apiKey = env('RESEND_API_KEY');
  const sender = from || env('NAMDAR_FROM_EMAIL') || 'Namdar <hello@namdar.co.uk>';
  const content = html || `<p>${escapeHtml(text||'')}</p>`;
  const plain = text || stripHtml(content);
  if (!sender || !to) return { skipped: true };
  if (!apiKey) {
    if(archiveForCustomer)await archiveCustomerMessage({to,subject,content,text:plain,customerId,category:messageCategory,targetPath,deliveryStatus:'skipped',messageKey});
    return { skipped: true };
  }
  const brandedHtml = emailShell(content);
  const payload = { from: sender, to: Array.isArray(to) ? to : [to], subject, html: brandedHtml, text: plain };
  const reply = replyTo || env('NAMDAR_REPLY_TO_EMAIL');
  if (reply) payload.reply_to = Array.isArray(reply) ? reply : [reply];
  if (headers && typeof headers === 'object' && !Array.isArray(headers)) payload.headers = Object.fromEntries(Object.entries(headers).filter(([k,v])=>k&&v!=null).map(([k,v])=>[String(k).slice(0,120),String(v).slice(0,2000)]));
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const t = await response.text(); console.error('Resend error:', response.status, t.slice(0,500));
    if(archiveForCustomer)await archiveCustomerMessage({to,subject,content,text:plain,customerId,category:messageCategory,targetPath,deliveryStatus:'failed',messageKey});
    return { ok:false, error:t };
  }
  const data=await response.json().catch(()=>null);
  if(archiveForCustomer)await archiveCustomerMessage({to,subject,content,text:plain,customerId,category:messageCategory,targetPath,providerId:data?.id||null,deliveryStatus:'sent',messageKey});
  return { ok:true, data };
}

const SERVICE_LABELS={windows:'window cleaning',gutters:'gutter cleaning',roof:'roof cleaning',jetwash:'jet washing',handyman:'handyman service',tour3d:'3D property tour'};
function bookingNotificationKey(type,booking={}){
  const seed=type==='confirmation'||type==='reminder_24h'?String(booking.starts_at||''):
    type==='on_my_way'?String(booking.on_my_way_at||booking.starts_at||''):
    type==='completion'||type==='follow_up'?String(booking.completed_at||booking.ends_at||''):
    JSON.stringify([booking.status||'',booking.starts_at||'',booking.ends_at||'',booking.address||'']);
  return crypto.createHash('sha256').update(`${type}|${seed}`).digest('hex').slice(0,40);
}
function londonDateTime(value){
  if(!value)return'—';
  return new Date(value).toLocaleString('en-GB',{timeZone:'Europe/London',weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
}
async function notificationQuote(booking){
  if(!booking?.quote_id)return null;
  return (await db(`quotes?id=eq.${encodeURIComponent(booking.quote_id)}&select=id,customer_id,customer_name,email,service_key,final_price,automatic_estimate&limit=1`))?.[0]||null;
}
async function notificationStaff(booking){
  if(!booking?.assigned_staff_id)return null;
  return (await db(`profiles?id=eq.${encodeURIComponent(booking.assigned_staff_id)}&select=id,full_name,email&limit=1`))?.[0]||null;
}
async function ensureBookingFeedbackInvite(booking,quote=null){
  if(!booking?.id)throw Object.assign(new Error('Booking is required for feedback.'),{status:400});
  let row=(await db(`booking_feedback?booking_id=eq.${encodeURIComponent(booking.id)}&select=*&limit=1`))?.[0]||null;
  if(row)return row;
  const token=`fb_${crypto.randomBytes(24).toString('hex')}`;
  try{
    return (await db('booking_feedback',{method:'POST',prefer:'return=representation',body:{booking_id:booking.id,quote_id:booking.quote_id||quote?.id||null,customer_id:booking.customer_id||quote?.customer_id||null,token,status:'pending'}}))?.[0]||null;
  }catch(e){
    if(e.status!==409)throw e;
    return (await db(`booking_feedback?booking_id=eq.${encodeURIComponent(booking.id)}&select=*&limit=1`))?.[0]||null;
  }
}
async function publicReviewUrl(){
  const row=(await db('site_settings?key=eq.reviews&select=value&limit=1'))?.[0]||null;
  const url=String(row?.value?.public_review_url||'').trim();
  return /^https:\/\//i.test(url)?url:'';
}
async function queueBookingNotification({booking,quote,type,dueAt,eventKey,recipientEmail}){
  if(!booking?.id)throw Object.assign(new Error('Booking is required for a notification.'),{status:400});
  const email=String(recipientEmail||quote?.email||'').trim().toLowerCase();
  if(!email)return {skipped:true,reason:'no_recipient'};
  const key=eventKey||bookingNotificationKey(type,booking),due=new Date(dueAt||Date.now()).toISOString();
  let row=(await db(`booking_notifications?booking_id=eq.${encodeURIComponent(booking.id)}&notification_type=eq.${encodeURIComponent(type)}&event_key=eq.${encodeURIComponent(key)}&select=*&limit=1`))?.[0]||null;
  if(row){
    if(row.status==='sent')return row;
    if(row.status==='cancelled'||row.status==='failed'){
      row=(await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',prefer:'return=representation',body:{recipient_email:email,due_at:due,status:'pending',error:null,updated_at:new Date().toISOString()}}))?.[0]||row;
    }else if(row.recipient_email!==email||new Date(row.due_at).toISOString()!==due){
      row=(await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',prefer:'return=representation',body:{recipient_email:email,due_at:due,updated_at:new Date().toISOString()}}))?.[0]||row;
    }
    return row;
  }
  try{
    return (await db('booking_notifications',{method:'POST',prefer:'return=representation',body:{booking_id:booking.id,notification_type:type,event_key:key,due_at:due,recipient_email:email,status:'pending'}}))?.[0]||null;
  }catch(e){
    if(e.status!==409)throw e;
    return (await db(`booking_notifications?booking_id=eq.${encodeURIComponent(booking.id)}&notification_type=eq.${encodeURIComponent(type)}&event_key=eq.${encodeURIComponent(key)}&select=*&limit=1`))?.[0]||null;
  }
}
async function cancelPendingBookingNotifications(bookingId,type,exceptEventKey=''){
  const rows=await db(`booking_notifications?booking_id=eq.${encodeURIComponent(bookingId)}&notification_type=eq.${encodeURIComponent(type)}&status=eq.pending&select=id,event_key`);
  for(const row of rows||[]){if(exceptEventKey&&row.event_key===exceptEventKey)continue;await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}&status=eq.pending`,{method:'PATCH',body:{status:'cancelled',updated_at:new Date().toISOString()}})}
}
function bookingNotificationContent(type,booking,quote,staff,feedbackUrl=''){
  const name=escapeHtml(quote?.customer_name||'there'),service=escapeHtml(SERVICE_LABELS[quote?.service_key]||'Namdar service'),when=escapeHtml(londonDateTime(booking.starts_at)),address=escapeHtml(booking.address||''),staffName=staff?.full_name?escapeHtml(staff.full_name):'';
  const account=`<p><a href="https://namdar.co.uk/account?tab=bookings&booking=${encodeURIComponent(booking.id)}">Open this booking in My Namdar</a> to see job updates and billing.</p>`;
  if(type==='confirmation')return{subject:'Your Namdar booking is confirmed',html:`<p>Hi ${name},</p><p>Your <strong>${service}</strong> booking is confirmed.</p><p><strong>${when}</strong><br>${address}</p>${staffName?`<p>Assigned team member: <strong>${staffName}</strong></p>`:''}${account}`};
  if(type==='booking_update'){
    const cancelled=booking.status==='cancelled';
    return{subject:cancelled?'Your Namdar booking has been cancelled':'Your Namdar booking has been updated',html:`<p>Hi ${name},</p><p>Your Namdar booking is now <strong>${escapeHtml(String(booking.status||'').replaceAll('_',' '))}</strong>.</p><p><strong>${when}</strong><br>${address}</p>${account}`};
  }
  if(type==='reminder_24h')return{subject:'Reminder: your Namdar visit is coming up',html:`<p>Hi ${name},</p><p>This is your reminder for tomorrow's <strong>${service}</strong> visit.</p><p><strong>${when}</strong><br>${address}</p>${staffName?`<p>Your assigned Namdar team member is <strong>${staffName}</strong>.</p>`:''}<p>If access details have changed, please contact Namdar before the visit.</p>${account}`};
  if(type==='on_my_way')return{subject:'Namdar is on the way',html:`<p>Hi ${name},</p><p>Your Namdar team member is <strong>on the way</strong> to your property.</p>${staffName?`<p>Team member: <strong>${staffName}</strong></p>`:''}<p><strong>${when}</strong><br>${address}</p>${account}`};
  if(type==='completion')return{subject:'Your Namdar job is complete',html:`<p>Hi ${name},</p><p>Your scheduled <strong>${service}</strong> has been marked <strong>complete</strong>. Thank you for choosing Namdar.</p>${booking.customer_note?`<p><strong>Job update:</strong><br>${escapeHtml(booking.customer_note).replace(/\n/g,'<br>')}</p>`:''}${account}`};
  return{subject:'How did your Namdar service go?',html:`<p>Hi ${name},</p><p>Thanks again for choosing Namdar for your <strong>${service}</strong>.</p><p>We'd really value a quick rating of your service. Your feedback takes less than a minute and helps us improve.</p>${feedbackUrl?`<p><a href="${escapeHtml(feedbackUrl)}" style="display:inline-block;background:#173c32;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Rate your Namdar service</a></p>`:''}<p>Your completed job details, before/after photos, invoices and receipts are available in My Namdar.</p>${account}`};
}
async function processBookingNotification(row,context={}){
  if(!row?.id||row.status!=='pending')return{skipped:true,reason:'not_pending'};
  const now=new Date(),attempts=Number(row.attempts||0)+1;
  const claimed=(await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}&status=eq.pending`,{method:'PATCH',prefer:'return=representation',body:{status:'sending',attempts,last_attempt_at:now.toISOString(),updated_at:now.toISOString()}}))?.[0];
  if(!claimed)return{skipped:true,reason:'already_claimed'};
  try{
    const booking=context.booking||(await db(`bookings?id=eq.${encodeURIComponent(row.booking_id)}&select=*&limit=1`))?.[0];
    if(!booking){await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:'cancelled',error:'Booking no longer exists.',updated_at:new Date().toISOString()}});return{skipped:true,reason:'missing_booking'}}
    if(row.notification_type==='reminder_24h'){
      if(booking.status!=='confirmed'||new Date(booking.starts_at)<=now||bookingNotificationKey('reminder_24h',booking)!==row.event_key){await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:'cancelled',error:'Booking changed before reminder was sent.',updated_at:new Date().toISOString()}});return{skipped:true,reason:'stale_reminder'}}
    }
    if(row.notification_type==='follow_up'){
      if((booking.work_status||'scheduled')!=='completed'&&booking.status!=='completed'){await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:'cancelled',error:'Booking is not completed.',updated_at:new Date().toISOString()}});return{skipped:true,reason:'not_completed'}}
      if(bookingNotificationKey('follow_up',booking)!==row.event_key){await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:'cancelled',error:'Completion event changed.',updated_at:new Date().toISOString()}});return{skipped:true,reason:'stale_follow_up'}}
    }
    if(row.notification_type==='confirmation'&&(booking.status!=='confirmed'||bookingNotificationKey('confirmation',booking)!==row.event_key)){await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:'cancelled',error:'Booking changed before confirmation was sent.',updated_at:new Date().toISOString()}});return{skipped:true,reason:'stale_confirmation'}}
    if(row.notification_type==='on_my_way'&&((booking.work_status||'scheduled')!=='on_my_way'||bookingNotificationKey('on_my_way',booking)!==row.event_key)){await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:'cancelled',error:'Job status changed before on-the-way email was sent.',updated_at:new Date().toISOString()}});return{skipped:true,reason:'stale_on_my_way'}}
    if(row.notification_type==='completion'&&(((booking.work_status||'scheduled')!=='completed'&&booking.status!=='completed')||bookingNotificationKey('completion',booking)!==row.event_key)){await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:'cancelled',error:'Completion event changed before email was sent.',updated_at:new Date().toISOString()}});return{skipped:true,reason:'stale_completion'}}
    const quote=context.quote||await notificationQuote(booking),staff=context.staff||await notificationStaff(booking);
    const feedback=row.notification_type==='follow_up'?await ensureBookingFeedbackInvite(booking,quote):null;
    const feedbackUrl=feedback?.token?`https://namdar.co.uk/feedback?token=${encodeURIComponent(feedback.token)}`:'';
    const content=bookingNotificationContent(row.notification_type,booking,quote,staff,feedbackUrl);
    const sent=await sendEmail({to:row.recipient_email,subject:content.subject,html:content.html,archiveForCustomer:true,customerId:quote?.customer_id||booking?.customer_id||null,messageCategory:'booking',targetPath:`/account?tab=bookings&booking=${encodeURIComponent(booking.id)}`,messageKey:`booking-notification:${row.event_key||row.id}`});
    if(sent?.ok){await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:'sent',provider_id:sent.data?.id||null,sent_at:new Date().toISOString(),error:null,updated_at:new Date().toISOString()}});return{ok:true,row:claimed}}
    const failed=attempts>=5;await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:failed?'failed':'pending',error:String(sent?.error||'Email provider did not send the message.').slice(0,1000),updated_at:new Date().toISOString()}});return{ok:false,retry:!failed};
  }catch(e){
    const failed=attempts>=5;await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:failed?'failed':'pending',error:String(e.message||e).slice(0,1000),updated_at:new Date().toISOString()}}).catch(()=>null);throw e;
  }
}
async function sendBookingNotificationNow({booking,quote,type,eventKey}){
  const row=await queueBookingNotification({booking,quote,type,eventKey,dueAt:new Date(),recipientEmail:quote?.email});
  if(!row||row.skipped||row.status==='sent')return{skipped:true,duplicate:row?.status==='sent'};
  return processBookingNotification(row,{booking,quote});
}
async function scheduleBookingReminder(booking,quote){
  if(!booking?.id)return null;
  const key=bookingNotificationKey('reminder_24h',booking);await cancelPendingBookingNotifications(booking.id,'reminder_24h',key);
  if(booking.status!=='confirmed')return null;
  const start=new Date(booking.starts_at),now=new Date();if(!Number.isFinite(start.getTime())||start<=now)return null;
  const due=new Date(start.getTime()-24*60*60*1000);
  if(due.getTime()-now.getTime()<4*60*60*1000)return null;
  return queueBookingNotification({booking,quote,type:'reminder_24h',eventKey:key,dueAt:due,recipientEmail:quote?.email});
}
async function scheduleBookingFollowUp(booking,quote){
  if(!booking?.id||!booking.completed_at)return null;
  const key=bookingNotificationKey('follow_up',booking);await cancelPendingBookingNotifications(booking.id,'follow_up',key);
  const due=new Date(new Date(booking.completed_at).getTime()+24*60*60*1000);
  return queueBookingNotification({booking,quote,type:'follow_up',eventKey:key,dueAt:due,recipientEmail:quote?.email});
}
async function processDueBookingNotifications(limit=100){
  const stale=new Date(Date.now()-20*60*1000).toISOString();
  await db(`booking_notifications?status=eq.sending&last_attempt_at=lt.${encodeURIComponent(stale)}`,{method:'PATCH',body:{status:'pending',updated_at:new Date().toISOString()}}).catch(()=>null);
  const now=new Date().toISOString(),rows=await db(`booking_notifications?status=eq.pending&due_at=lte.${encodeURIComponent(now)}&attempts=lt.5&select=*&order=due_at.asc&limit=${Math.max(1,Math.min(250,Number(limit)||100))}`);let sent=0,skipped=0,failed=0;
  for(const row of rows||[]){try{const r=await processBookingNotification(row);if(r?.ok)sent++;else if(r?.skipped)skipped++;else failed++}catch(e){failed++;console.error('Booking notification failed',row.id,e.message)}}
  return{checked:(rows||[]).length,sent,skipped,failed};
}

const BUSINESS_TYPES=new Set(['quote_reminder','invoice_overdue','booking_cancel_followup','booking_attention','unassigned_staff']);
function businessUtcMorning(value,days=0,hour=9){
  const d=new Date(value);if(!Number.isFinite(d.getTime()))return new Date();
  return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+days,hour,0,0));
}
function businessEventKey(parts=[]){return crypto.createHash('sha256').update(parts.map(x=>String(x??'')).join('|')).digest('hex').slice(0,40)}

const MANAGED_INBOX_LOCALS=new Set(['support','bookings','accounts','billing','hello']);
function isManagedInboxAddress(value=''){
  const raw=String(value||'').trim().toLowerCase(),m=raw.match(/<([^<>\s]+@[^<>\s]+)>/),email=(m?m[1]:raw).replace(/^mailto:/,'');
  const [local,domain]=email.split('@');return domain==='namdar.co.uk'&&MANAGED_INBOX_LOCALS.has(local);
}
async function businessAlertEmail(){
  const configured=String(env('NAMDAR_NOTIFY_EMAIL',env('NAMDAR_ALERT_EMAIL',''))||'').trim().toLowerCase();if(configured&&!isManagedInboxAddress(configured))return configured;
  const admins=await db('profiles?role=eq.admin&select=email,account_status&limit=20').catch(()=>[]);
  const active=(admins||[]).find(x=>x.email&&(!x.account_status||x.account_status==='active')&&!isManagedInboxAddress(x.email));
  return String(active?.email||'').trim().toLowerCase();
}
async function queueBusinessNotification({type,entityType,entityId,eventKey,dueAt,recipientEmail,metadata={}}){
  if(!BUSINESS_TYPES.has(type)||!['quote','invoice','booking'].includes(entityType)||!entityId)throw Object.assign(new Error('Valid business notification details are required.'),{status:400});
  const email=String(recipientEmail||'').trim().toLowerCase();if(!email)return{skipped:true,reason:'no_recipient'};
  const key=String(eventKey||businessEventKey([type,entityType,entityId])),due=new Date(dueAt||Date.now()).toISOString();
  let row=(await db(`business_notifications?notification_type=eq.${encodeURIComponent(type)}&entity_type=eq.${encodeURIComponent(entityType)}&entity_id=eq.${encodeURIComponent(entityId)}&event_key=eq.${encodeURIComponent(key)}&select=*&limit=1`))?.[0]||null;
  if(row){
    if(row.status==='sent')return row;
    if(row.status==='cancelled'||row.status==='failed')row=(await db(`business_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',prefer:'return=representation',body:{recipient_email:email,due_at:due,status:'pending',attempts:0,error:null,metadata,updated_at:new Date().toISOString()}}))?.[0]||row;
    else if(row.recipient_email!==email||new Date(row.due_at).toISOString()!==due)row=(await db(`business_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',prefer:'return=representation',body:{recipient_email:email,due_at:due,metadata,updated_at:new Date().toISOString()}}))?.[0]||row;
    return row;
  }
  try{
    row=(await db('business_notifications',{method:'POST',prefer:'return=representation',body:{notification_type:type,entity_type:entityType,entity_id:entityId,event_key:key,due_at:due,recipient_email:email,status:'pending',metadata}}))?.[0]||null;
    if(row)row._created=true;return row;
  }catch(e){if(e.status!==409)throw e;return (await db(`business_notifications?notification_type=eq.${encodeURIComponent(type)}&entity_type=eq.${encodeURIComponent(entityType)}&entity_id=eq.${encodeURIComponent(entityId)}&event_key=eq.${encodeURIComponent(key)}&select=*&limit=1`))?.[0]||null}
}
async function cancelPendingBusinessNotifications(entityType,entityId,type=''){
  if(!entityType||!entityId)return 0;let query=`business_notifications?entity_type=eq.${encodeURIComponent(entityType)}&entity_id=eq.${encodeURIComponent(entityId)}&status=eq.pending&select=id`;
  if(type)query+=`&notification_type=eq.${encodeURIComponent(type)}`;const rows=await db(query);let count=0;
  for(const row of rows||[]){await db(`business_notifications?id=eq.${encodeURIComponent(row.id)}&status=eq.pending`,{method:'PATCH',body:{status:'cancelled',updated_at:new Date().toISOString()}});count++}return count;
}
async function scanBusinessFollowUps(){
  const now=new Date(),nowIso=now.toISOString(),adminEmail=await businessAlertEmail();let queued=0,considered=0;
  const quotes=await db('quotes?status=in.(sent,approved)&customer_response=eq.pending&final_price=not.is.null&select=id,customer_name,email,service_key,final_price,automatic_estimate,expires_at,sent_at,updated_at,created_at&limit=500').catch(()=>[]);
  for(const q of quotes||[]){
    considered++;if(!q.email)continue;const sentAt=new Date(q.sent_at||q.updated_at||q.created_at),expiry=q.expires_at?new Date(q.expires_at):null;if(!Number.isFinite(sentAt.getTime())||(expiry&&expiry<=now))continue;
    for(const [stage,days] of [[1,2],[2,7]]){const due=businessUtcMorning(sentAt,days,9);if(expiry&&due>=expiry)continue;const row=await queueBusinessNotification({type:'quote_reminder',entityType:'quote',entityId:q.id,eventKey:businessEventKey(['quote_reminder',q.id,sentAt.toISOString(),stage]),dueAt:due,recipientEmail:q.email,metadata:{stage,sentAt:sentAt.toISOString()}});if(row?._created)queued++}
  }
  const invoices=await db(`invoices?status=in.(issued,part_paid)&due_at=not.is.null&due_at=lt.${encodeURIComponent(nowIso)}&select=id,quote_id,booking_id,invoice_number,total,amount_paid,due_at,status&limit=500`).catch(()=>[]);
  for(const invoice of invoices||[]){
    considered++;const outstanding=Math.max(0,Number(invoice.total||0)-Number(invoice.amount_paid||0));if(outstanding<.005||!invoice.quote_id)continue;
    const q=(await db(`quotes?id=eq.${encodeURIComponent(invoice.quote_id)}&select=id,customer_name,email,service_key&limit=1`))?.[0];if(!q?.email)continue;const dueBase=new Date(invoice.due_at);if(!Number.isFinite(dueBase.getTime()))continue;
    for(const [stage,days] of [[1,1],[2,8],[3,15],[4,29]]){const due=businessUtcMorning(dueBase,days,9);const row=await queueBusinessNotification({type:'invoice_overdue',entityType:'invoice',entityId:invoice.id,eventKey:businessEventKey(['invoice_overdue',invoice.id,dueBase.toISOString(),stage]),dueAt:due,recipientEmail:q.email,metadata:{stage,dueAt:dueBase.toISOString()}});if(row?._created)queued++}
  }
  if(adminEmail){
    const upcomingEnd=new Date(now.getTime()+24*60*60*1000).toISOString();
    const unassigned=await db(`bookings?status=eq.confirmed&assigned_staff_id=is.null&starts_at=gt.${encodeURIComponent(nowIso)}&starts_at=lte.${encodeURIComponent(upcomingEnd)}&select=id,quote_id,starts_at,ends_at,address,status,assigned_staff_id,work_status&limit=250`).catch(()=>[]);
    for(const b of unassigned||[]){considered++;const due=(now.getUTCHours()>=7&&now.getUTCHours()<20)?now:businessUtcMorning(now,now.getUTCHours()>=20?1:0,8);const row=await queueBusinessNotification({type:'unassigned_staff',entityType:'booking',entityId:b.id,eventKey:businessEventKey(['unassigned_staff',b.id,b.starts_at]),dueAt:due,recipientEmail:adminEmail,metadata:{startsAt:b.starts_at}});if(row?._created)queued++}
    const staleStart=new Date(now.getTime()-3*86400000).toISOString(),attentionCutoff=new Date(now.getTime()-2*60*60*1000).toISOString();
    const attention=await db(`bookings?status=eq.confirmed&work_status=eq.scheduled&ends_at=gte.${encodeURIComponent(staleStart)}&ends_at=lt.${encodeURIComponent(attentionCutoff)}&select=id,quote_id,starts_at,ends_at,address,status,assigned_staff_id,work_status&limit=250`).catch(()=>[]);
    for(const b of attention||[]){considered++;const due=(now.getUTCHours()>=7&&now.getUTCHours()<20)?now:businessUtcMorning(now,now.getUTCHours()>=20?1:0,8);const row=await queueBusinessNotification({type:'booking_attention',entityType:'booking',entityId:b.id,eventKey:businessEventKey(['booking_attention',b.id,b.ends_at]),dueAt:due,recipientEmail:adminEmail,metadata:{endsAt:b.ends_at}});if(row?._created)queued++}
  }
  return{considered,queued};
}
async function businessQuoteForBooking(booking){return booking?.quote_id?(await db(`quotes?id=eq.${encodeURIComponent(booking.quote_id)}&select=id,customer_id,customer_name,email,service_key,postcode&limit=1`))?.[0]||null:null}
async function businessNotificationContext(row){
  if(row.entity_type==='quote'){const quote=(await db(`quotes?id=eq.${encodeURIComponent(row.entity_id)}&select=*&limit=1`))?.[0]||null;return{quote}}
  if(row.entity_type==='invoice'){const invoice=(await db(`invoices?id=eq.${encodeURIComponent(row.entity_id)}&select=*&limit=1`))?.[0]||null;const quote=invoice?.quote_id?(await db(`quotes?id=eq.${encodeURIComponent(invoice.quote_id)}&select=id,customer_id,customer_name,email,service_key,postcode&limit=1`))?.[0]||null:null;return{invoice,quote}}
  const booking=(await db(`bookings?id=eq.${encodeURIComponent(row.entity_id)}&select=*&limit=1`))?.[0]||null;const quote=await businessQuoteForBooking(booking);let staff=null;if(booking?.assigned_staff_id)staff=(await db(`profiles?id=eq.${encodeURIComponent(booking.assigned_staff_id)}&select=id,full_name,email&limit=1`))?.[0]||null;return{booking,quote,staff};
}
function businessNotificationContent(row,ctx){
  const type=row.notification_type,meta=row.metadata||{},quote=ctx.quote||{},booking=ctx.booking||{},invoice=ctx.invoice||{},name=escapeHtml(quote.customer_name||'there'),service=escapeHtml(SERVICE_LABELS[quote.service_key]||'Namdar service'),target=type==='quote_reminder'?`/account?tab=quotes&quote=${encodeURIComponent(quote.id||'')}`:type==='invoice_overdue'?'/account?tab=billing':`/account?tab=bookings${booking.id?`&booking=${encodeURIComponent(booking.id)}`:''}`,account=`<p><a href="https://namdar.co.uk${target}">Open My Namdar</a></p>`,admin='<p><a href="https://namdar.co.uk/admin">Open Namdar Admin</a></p>';
  if(type==='quote_reminder')return{subject:meta.stage===2?'Reminder: your Namdar quote is still available':'Your Namdar quote is waiting for you',html:`<p>Hi ${name},</p><p>Your final quote for <strong>${service}</strong> is waiting in My Namdar.</p><p>Final quote: <strong>£${Number(quote.final_price||0).toFixed(2)}</strong>${quote.expires_at?`<br>Valid until: <strong>${escapeHtml(new Date(quote.expires_at).toLocaleDateString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'long',year:'numeric'}))}</strong>`:''}</p><p>You can accept or decline it online. If you accept, you can then choose an available appointment window.</p>${account}`};
  if(type==='invoice_overdue'){const outstanding=Math.max(0,Number(invoice.total||0)-Number(invoice.amount_paid||0));return{subject:`Reminder: Namdar invoice ${escapeHtml(invoice.invoice_number||'') } is overdue`,html:`<p>Hi ${name},</p><p>This is a reminder that Namdar invoice <strong>${escapeHtml(invoice.invoice_number||'')}</strong> is overdue.</p><p>Outstanding balance: <strong>£${outstanding.toFixed(2)}</strong>${invoice.due_at?`<br>Due date: ${escapeHtml(new Date(invoice.due_at).toLocaleDateString('en-GB',{timeZone:'Europe/London'}))}`:''}</p><p>Your invoice and payment history are available securely in My Namdar. If you have already arranged payment with us, you can ignore this reminder.</p>${account}`};}
  if(type==='booking_cancel_followup')return{subject:'Would you like to arrange another Namdar appointment?',html:`<p>Hi ${name},</p><p>Your previous <strong>${service}</strong> appointment was cancelled.</p><p>If you still need the service, you can request a new quote or contact Namdar support and we can help arrange another appointment.</p>${account}`};
  const when=escapeHtml(londonDateTime(booking.starts_at)),address=escapeHtml(booking.address||''),staff=ctx.staff?.full_name?escapeHtml(ctx.staff.full_name):'Unassigned';
  if(type==='unassigned_staff')return{subject:'Namdar alert: upcoming job has no staff assigned',html:`<p>An upcoming Namdar job still has no team member assigned.</p><p><strong>${service}</strong><br>${when}<br>${address}</p><p>Customer: <strong>${name}</strong><br>Assigned staff: <strong>${staff}</strong></p>${admin}`};
  return{subject:'Namdar alert: job still shows as scheduled',html:`<p>A past appointment still shows as <strong>Scheduled</strong> and may need attention.</p><p><strong>${service}</strong><br>${when}<br>${address}</p><p>Customer: <strong>${name}</strong><br>Assigned staff: <strong>${staff}</strong></p><p>Please confirm whether the job was completed, cancelled, rescheduled or missed so customer tracking and follow-ups stay accurate.</p>${admin}`};
}
async function processBusinessNotification(row){
  if(!row?.id||row.status!=='pending')return{skipped:true,reason:'not_pending'};const now=new Date(),attempts=Number(row.attempts||0)+1;
  const claimed=(await db(`business_notifications?id=eq.${encodeURIComponent(row.id)}&status=eq.pending`,{method:'PATCH',prefer:'return=representation',body:{status:'sending',attempts,last_attempt_at:now.toISOString(),updated_at:now.toISOString()}}))?.[0];if(!claimed)return{skipped:true,reason:'already_claimed'};
  try{
    const ctx=await businessNotificationContext(row),meta=row.metadata||{};
    if(row.notification_type==='quote_reminder'){
      const q=ctx.quote;if(!q||!['sent','approved'].includes(q.status)||q.customer_response!=='pending'||q.final_price==null||(q.expires_at&&new Date(q.expires_at)<=now)||!q.email||String(q.email).toLowerCase()!==String(row.recipient_email).toLowerCase()||(meta.sentAt&&new Date(q.sent_at||q.updated_at||q.created_at).toISOString()!==new Date(meta.sentAt).toISOString()))return cancelBusinessClaim(row.id,'Quote changed before reminder was sent.');
    }else if(row.notification_type==='invoice_overdue'){
      const i=ctx.invoice,q=ctx.quote,outstanding=i?Math.max(0,Number(i.total||0)-Number(i.amount_paid||0)):0;if(!i||!q?.email||!['issued','part_paid'].includes(i.status)||outstanding<.005||!i.due_at||new Date(i.due_at)>=now||(meta.dueAt&&new Date(i.due_at).toISOString()!==new Date(meta.dueAt).toISOString()))return cancelBusinessClaim(row.id,'Invoice is no longer overdue.');
    }else if(row.notification_type==='booking_cancel_followup'){
      if(!ctx.booking||ctx.booking.status!=='cancelled'||!ctx.quote?.email)return cancelBusinessClaim(row.id,'Booking is no longer cancelled.');
    }else if(row.notification_type==='unassigned_staff'){
      if(!ctx.booking||ctx.booking.status!=='confirmed'||ctx.booking.assigned_staff_id||new Date(ctx.booking.starts_at)<=now)return cancelBusinessClaim(row.id,'Booking is no longer an upcoming unassigned job.');
    }else if(row.notification_type==='booking_attention'){
      if(!ctx.booking||ctx.booking.status!=='confirmed'||(ctx.booking.work_status||'scheduled')!=='scheduled'||new Date(ctx.booking.ends_at)>=now)return cancelBusinessClaim(row.id,'Booking no longer needs attention.');
    }
    const content=businessNotificationContent(row,ctx),customerFacing=['quote_reminder','invoice_overdue','booking_cancel_followup'].includes(row.notification_type),target=row.notification_type==='quote_reminder'?`/account?tab=quotes&quote=${encodeURIComponent(ctx.quote?.id||'')}`:row.notification_type==='invoice_overdue'?'/account?tab=billing':`/account?tab=bookings${ctx.booking?.id?`&booking=${encodeURIComponent(ctx.booking.id)}`:''}`,category=row.notification_type==='quote_reminder'?'quote':row.notification_type==='invoice_overdue'?'billing':'booking',sent=await sendEmail({to:row.recipient_email,subject:content.subject,html:content.html,archiveForCustomer:customerFacing,customerId:ctx.quote?.customer_id||ctx.booking?.customer_id||null,messageCategory:category,targetPath:target,messageKey:`business-notification:${row.event_key||row.id}`});
    if(sent?.ok){await db(`business_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:'sent',provider_id:sent.data?.id||null,sent_at:new Date().toISOString(),error:null,updated_at:new Date().toISOString()}});return{ok:true}}
    const failed=attempts>=5;await db(`business_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:failed?'failed':'pending',error:String(sent?.error||'Email provider did not send the message.').slice(0,1000),updated_at:new Date().toISOString()}});return{ok:false,retry:!failed};
  }catch(e){const failed=attempts>=5;await db(`business_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:failed?'failed':'pending',error:String(e.message||e).slice(0,1000),updated_at:new Date().toISOString()}}).catch(()=>null);throw e}
}
async function cancelBusinessClaim(id,reason){await db(`business_notifications?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:{status:'cancelled',error:String(reason||'No longer applicable.').slice(0,1000),updated_at:new Date().toISOString()}});return{skipped:true,reason}}
async function processDueBusinessNotifications(limit=100){
  const stale=new Date(Date.now()-20*60*1000).toISOString();await db(`business_notifications?status=eq.sending&last_attempt_at=lt.${encodeURIComponent(stale)}`,{method:'PATCH',body:{status:'pending',updated_at:new Date().toISOString()}}).catch(()=>null);
  const now=new Date().toISOString(),rows=await db(`business_notifications?status=eq.pending&due_at=lte.${encodeURIComponent(now)}&attempts=lt.5&select=*&order=due_at.asc&limit=${Math.max(1,Math.min(250,Number(limit)||100))}`);let sent=0,skipped=0,failed=0;
  for(const row of rows||[]){try{const r=await processBusinessNotification(row);if(r?.ok)sent++;else if(r?.skipped)skipped++;else failed++}catch(e){failed++;console.error('Business notification failed',row.id,e.message)}}return{checked:(rows||[]).length,sent,skipped,failed};
}
async function processBusinessFollowUps(limit=100){const scan=await scanBusinessFollowUps(),delivery=await processDueBusinessNotifications(limit);return{scan,delivery}}
async function scheduleCancelledBookingFollowUp(booking,quote){
  if(!booking?.id||booking.status!=='cancelled'||!quote?.email)return null;const due=businessUtcMorning(new Date(),1,9);return queueBusinessNotification({type:'booking_cancel_followup',entityType:'booking',entityId:booking.id,eventKey:businessEventKey(['booking_cancel_followup',booking.id,booking.starts_at||'']),dueAt:due,recipientEmail:quote.email,metadata:{cancelledBookingStart:booking.starts_at||null}})
}


async function createStaffNotification({type='general',title='',body='',targetPath='',permissionKey=null,targetUserId=null,entityType=null,entityId=null,priority='normal',dedupeKey=null}={}){
  const cleanTitle=String(title||'Namdar update').trim().slice(0,220),cleanBody=String(body||'').trim().slice(0,3000),dedupe=String(dedupeKey||'').trim().slice(0,240)||null;
  if(dedupe){try{const existing=(await db(`staff_notifications?dedupe_key=eq.${encodeURIComponent(dedupe)}&select=id&limit=1`))?.[0];if(existing?.id)return existing}catch{}}
  try{return (await db('staff_notifications',{method:'POST',prefer:'return=representation',body:{notification_type:String(type||'general').slice(0,80),title:cleanTitle,body:cleanBody||null,target_path:String(targetPath||'').slice(0,500)||null,permission_key:permissionKey?String(permissionKey).slice(0,80):null,target_user_id:targetUserId||null,entity_type:entityType?String(entityType).slice(0,80):null,entity_id:entityId==null?null:String(entityId).slice(0,240),priority:['low','normal','high','urgent'].includes(priority)?priority:'normal',dedupe_key:dedupe}}))?.[0]||null}catch(e){console.error('Staff notification write failed',e.message);return null}
}

async function verifyTurnstile(token, req) {
  const secret = env('TURNSTILE_SECRET_KEY');
  if (!secret) return { ok:true, skipped:true };
  if (!token) return { ok:false, error:'Please complete the anti-bot check.' };
  const form = new URLSearchParams(); form.set('secret', secret); form.set('response', token);
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim(); if (ip) form.set('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:form });
  const d = await r.json().catch(()=>({success:false}));
  return d.success ? {ok:true} : {ok:false,error:'Anti-bot verification failed. Please try again.'};
}

function safeHttpsUrl(value='') { try { const u=new URL(String(value||'').trim()); return u.protocol==='https:'?u.toString():''; } catch { return ''; } }
function sanitizeLegalHtml(value='') {
  let html=String(value||'').replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|iframe|object|embed|form|input|button|svg|math)[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<(script|style|iframe|object|embed|form|input|button|svg|math)[^>]*\/?>/gi,'');
  const allowed=new Set(['p','br','h2','h3','h4','strong','b','em','i','ul','ol','li','blockquote','a']);
  return html.replace(/<\/?([a-z0-9]+)([^>]*)>/gi,(m,tag,attrs)=>{tag=tag.toLowerCase();if(!allowed.has(tag))return'';const closing=/^<\//.test(m);if(closing)return `</${tag}>`;if(tag==='br')return '<br>';if(tag==='a'){const hm=attrs.match(/href\s*=\s*(["'])(.*?)\1/i);const href=hm?hm[2].trim():'';let safe='';if(/^mailto:[^\s@]+@[^\s@]+$/i.test(href)||/^\/(?!\/)/.test(href))safe=href;else safe=safeHttpsUrl(href);return safe?`<a href="${escapeHtml(safe)}" rel="noopener noreferrer">`:'<a>'; }return `<${tag}>`;});
}


const AUDIT_SECRET_KEYS=new Set(['password','token','access_token','refresh_token','secret','api_key','service_role_key','anon_key','publishable_key','unsubscribe_token','guest_token','confirmation_token','recovery_token','stripe_checkout_session_id']);
function auditSanitize(value,depth=0){
  if(value===null||value===undefined)return null;
  if(depth>5)return '[depth limited]';
  if(Array.isArray(value))return value.slice(0,60).map(v=>auditSanitize(v,depth+1));
  if(typeof value==='object'){
    const out={};let count=0;
    for(const [k,v] of Object.entries(value)){
      if(count++>100)break;
      if(AUDIT_SECRET_KEYS.has(String(k).toLowerCase())||/(password|secret|token|api[_-]?key)/i.test(k)){out[k]='[redacted]';continue}
      out[k]=auditSanitize(v,depth+1);
    }
    return out;
  }
  if(typeof value==='string')return value.length>2000?value.slice(0,2000)+'…':value;
  if(['number','boolean'].includes(typeof value))return value;
  return String(value).slice(0,2000);
}
function auditIpHash(req){
  try{const raw=String(req?.headers?.['x-forwarded-for']||req?.socket?.remoteAddress||'').split(',')[0].trim();if(!raw)return null;return crypto.createHash('sha256').update(`${requestOrigin(req)}|${raw}`).digest('hex').slice(0,24)}catch{return null}
}
async function auditLog(req,staff,event={}){
  try{
    const action=String(event.action||'').trim().slice(0,120),entityType=String(event.entityType||'').trim().slice(0,120);
    if(!action||!entityType)return false;
    const profile=staff?.profile||{},user=staff?.user||{};
    const body={
      actor_user_id:user.id||null,actor_email:String(profile.email||user.email||'').slice(0,240)||null,actor_name:String(profile.full_name||'').slice(0,240)||null,actor_role:String(profile.role||'system').slice(0,60),
      action,entity_type:entityType,entity_id:event.entityId==null?null:String(event.entityId).slice(0,240),summary:String(event.summary||action).slice(0,500),
      before_data:event.before===undefined?null:auditSanitize(event.before),after_data:event.after===undefined?null:auditSanitize(event.after),metadata:auditSanitize(event.metadata||{}),
      request_id:String(req?.headers?.['x-vercel-id']||req?.headers?.['x-request-id']||'').slice(0,240)||null,ip_hash:auditIpHash(req),user_agent:String(req?.headers?.['user-agent']||'').slice(0,500)||null
    };
    await db('audit_logs',{method:'POST',prefer:'return=minimal',body});return true;
  }catch(e){console.error('Audit log write failed',event?.action||'',e.message);return false}
}

function safeError(res, error) { console.error(error); return json(res, error.status || 500, { ok:false, error:error.status ? error.message : 'Something went wrong. Please try again.' }); }
function requestOrigin(req) { const configured=env('SITE_ORIGIN','https://namdar.co.uk').replace(/\/$/,''); return /^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(configured)?configured:'https://namdar.co.uk'; }
function randomId(prefix='') { return `${prefix}${crypto.randomBytes(8).toString('hex')}`; }
module.exports = { safeHttpsUrl,sanitizeLegalHtml, env,supabaseUrl,serviceKey,publicKey,json,parseBody,queryParam,db,bearer,authUser,userProfile,requireCustomer,requireStaff,authAdmin,ensureInvoiceForBooking,syncInvoicePaymentState,escapeHtml,sendEmail,archiveCustomerMessage,bookingNotificationKey,queueBookingNotification,cancelPendingBookingNotifications,sendBookingNotificationNow,scheduleBookingReminder,scheduleBookingFollowUp,processDueBookingNotifications,queueBusinessNotification,cancelPendingBusinessNotifications,scanBusinessFollowUps,processDueBusinessNotifications,processBusinessFollowUps,scheduleCancelledBookingFollowUp,createStaffNotification,ensureBookingFeedbackInvite,publicReviewUrl,verifyTurnstile,auditSanitize,auditLog,safeError,requestOrigin,randomId,isManagedInboxAddress };
