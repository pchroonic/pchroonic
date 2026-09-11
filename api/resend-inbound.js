const crypto=require('crypto');
const {json,db,env,createStaffNotification,safeError}=require('../lib/server');
const MAX_WEBHOOK_BYTES=1024*1024;
const DANGEROUS_ATTACHMENT_EXTENSIONS=new Set(['exe','com','scr','msi','msp','bat','cmd','ps1','vbs','vbe','js','jse','wsf','wsh','hta','jar','lnk','iso','img','dmg','pkg','apk','app','docm','xlsm','pptm','xll']);
function header(req,name){return String(req.headers?.[name]||req.headers?.[name.toLowerCase()]||'')}
function tooLarge(){const e=new Error('Webhook payload is too large.');e.status=413;return e}
function checkedPayload(value){const text=Buffer.isBuffer(value)?value.toString('utf8'):typeof value==='string'?value:JSON.stringify(value);if(Buffer.byteLength(text,'utf8')>MAX_WEBHOOK_BYTES)throw tooLarge();return text}
async function rawBody(req){if(Buffer.isBuffer(req.body)||typeof req.body==='string'||(req.body&&typeof req.body==='object'))return checkedPayload(req.body);const chunks=[];let size=0;for await(const c of req){const b=Buffer.isBuffer(c)?c:Buffer.from(String(c));size+=b.length;if(size>MAX_WEBHOOK_BYTES)throw tooLarge();chunks.push(b)}return Buffer.concat(chunks).toString('utf8')}
function verify(payload,req){const secret=String(env('RESEND_WEBHOOK_SECRET')||'');if(!secret)return false;const id=header(req,'svix-id'),ts=header(req,'svix-timestamp'),sig=header(req,'svix-signature');if(!id||!ts||!sig)return false;const n=Number(ts);if(!Number.isFinite(n)||Math.abs(Date.now()/1000-n)>300)return false;let key=secret.replace(/^whsec_/,'');try{key=Buffer.from(key,'base64')}catch{return false}const digest=crypto.createHmac('sha256',key).update(`${id}.${ts}.${payload}`).digest('base64');const options=sig.split(' ').map(x=>x.replace(/^v1,/,'').trim()).filter(Boolean);return options.some(x=>{try{const a=Buffer.from(x),b=Buffer.from(digest);return a.length===b.length&&crypto.timingSafeEqual(a,b)}catch{return false}})}
function emailOnly(v=''){const m=String(v||'').match(/<([^<>\s]+@[^<>\s]+)>/);return String(m?m[1]:v).trim().toLowerCase().replace(/^mailto:/,'').slice(0,240)}
function displayName(v=''){const s=String(v||'').trim(),m=s.match(/^(.+?)\s*<[^>]+>$/);return (m?m[1].replace(/^['"]|['"]$/g,'').trim():'').slice(0,160)||null}
function domainOf(v=''){const e=emailOnly(v),at=e.lastIndexOf('@');return at>0?e.slice(at+1).replace(/^\.+|\.+$/g,'').slice(0,240):''}
function mailboxOf(to=[]){for(const v of Array.isArray(to)?to:[to]){const e=emailOnly(v),local=e.split('@')[0]||'';const reply=local.match(/^reply[+._-]([a-z0-9]{8,40})$/i);if(reply)return{mailbox:'support',replyToken:reply[1]};const clean=local.split('+')[0].replace(/[^a-z0-9._-]/gi,'').toLowerCase();if(clean)return{mailbox:['support','bookings','accounts','billing','hello'].includes(clean)?clean:'support',replyToken:null}}return{mailbox:'support',replyToken:null}}
function permissionFor(mailbox){if(mailbox==='bookings')return'bookings';if(['accounts','billing'].includes(mailbox))return'payments';if(mailbox==='support')return'tickets';return'inbox'}
function priorityFor(subject='',body=''){const s=`${subject} ${body}`.toLowerCase();return /urgent|emergency|danger|unsafe|injur|complaint|chargeback/.test(s)?'urgent':/cancel|payment|refund|problem|issue|damage/.test(s)?'high':'normal'}
function getHeader(headers,name){if(!headers)return'';if(Array.isArray(headers)){const x=headers.find(h=>String(h?.name||h?.key||'').toLowerCase()===name.toLowerCase());return String(x?.value||'')}for(const [k,v] of Object.entries(headers))if(k.toLowerCase()===name.toLowerCase())return Array.isArray(v)?String(v[0]||''):String(v||'');return''}
async function receivedEmail(id){const apiKey=String(env('RESEND_API_KEY')||'');if(!apiKey){const e=new Error('Inbound email retrieval is not configured.');e.status=503;throw e}const r=await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${apiKey}`,Accept:'application/json'}});if(!r.ok)throw new Error(`Could not retrieve inbound email (${r.status}).`);return r.json()}
async function blockedRule(from){
  const email=emailOnly(from),domain=domainOf(email);if(!email)return null;
  const [sender,domainRule]=await Promise.all([
    db(`support_inbox_blocklist?active=eq.true&scope=eq.sender&value=eq.${encodeURIComponent(email)}&select=id,scope,value,reason&limit=1`).catch(()=>[]),
    domain?db(`support_inbox_blocklist?active=eq.true&scope=eq.domain&value=eq.${encodeURIComponent(domain)}&select=id,scope,value,reason&limit=1`).catch(()=>[]):Promise.resolve([])
  ]);
  return sender?.[0]||domainRule?.[0]||null
}
function assessSecurity({from='',headers={},attachments=[],replyContext=false}){
  const reasons=[];let score=0;const add=(points,reason)=>{score+=points;if(reason&&!reasons.includes(reason))reasons.push(reason)};
  const autoSubmitted=String(getHeader(headers,'auto-submitted')||'').trim().toLowerCase(),xAutoReply=String(getHeader(headers,'x-autoreply')||getHeader(headers,'x-autorespond')||getHeader(headers,'x-auto-response-suppress')||'').trim().toLowerCase();
  if(autoSubmitted&&autoSubmitted!=='no')add(100,'Automated reply/notification');
  if(xAutoReply&&xAutoReply!=='no'&&xAutoReply!=='none')add(100,'Automated responder header');
  if(domainOf(from)==='namdar.co.uk')add(100,'Potential Namdar mail loop');
  const auth=String(getHeader(headers,'authentication-results')||'').toLowerCase();
  if(!replyContext&&/\bdmarc=fail\b/.test(auth)&&(/\bspf=fail\b/.test(auth)||/\bdkim=fail\b/.test(auth)))add(70,'Sender authentication failed');
  const risky=(attachments||[]).filter(a=>{const name=String(a?.filename||'').toLowerCase(),ext=name.includes('.')?name.split('.').pop():'';return DANGEROUS_ATTACHMENT_EXTENSIONS.has(ext)});
  if(risky.length)add(100,`Risky attachment type: ${String(risky[0]?.filename||'attachment').slice(0,120)}`);
  return{isSpam:score>=60,score:Math.min(100,score),reason:reasons.slice(0,3).join(' · ')||null}
}
function assessSpam({subject='',body='',headers={},knownCustomer=false,replyContext=false}){
  if(knownCustomer||replyContext)return{isSpam:false,score:0,reason:null};
  let score=0;const reasons=[],text=`${subject}\n${body}`.toLowerCase();
  const add=(points,reason)=>{score+=points;if(reason&&!reasons.includes(reason))reasons.push(reason)};
  const upstream=String(getHeader(headers,'x-spam-status')||'').toLowerCase();if(/\byes\b|spam/.test(upstream))add(80,'Upstream spam header');
  if(getHeader(headers,'list-unsubscribe'))add(30,'Bulk-mail unsubscribe header');
  if(/bulk|list|junk/.test(String(getHeader(headers,'precedence')||'').toLowerCase()))add(30,'Bulk-mail precedence header');
  const patterns=[
    [/\bseo\b|search engine optimization|google rankings?|rank (?:your )?(?:site|website)|backlinks?|domain authority/i,35,'SEO/link-building outreach'],
    [/guest posts?|link insertion|link building|sponsored (?:post|article)/i,35,'Guest-post/link outreach'],
    [/lead generation|appointment setting|cold email|digital marketing agency|marketing services/i,30,'Cold sales/marketing outreach'],
    [/ai[- ]driven growth|grow your (?:business|website)|increase (?:your )?(?:website )?traffic|more qualified leads/i,30,'Generic growth outreach'],
    [/web(?:site)? redesign|web design services?|website development services?/i,25,'Website sales outreach'],
    [/noticed your website|quick question about your website|more (?:clients|customers) for/i,20,'Unsolicited website outreach']
  ];
  for(const [re,points,reason] of patterns)if(re.test(text))add(points,reason);
  const urls=(text.match(/https?:\/\/|www\./g)||[]).length;if(urls>=3)add(20,'Multiple external links');else if(urls>=1)add(5,'External link');
  score=Math.min(100,score);
  return{isSpam:score>=60,score,reason:reasons.slice(0,3).join(' · ')||null}
}
async function highFrequencyUnknownSender(from){
  const since=new Date(Date.now()-60*60*1000).toISOString();
  const rows=await db(`support_inbox_messages?direction=eq.inbound&from_email=eq.${encodeURIComponent(from)}&sent_at=gte.${encodeURIComponent(since)}&select=id&limit=9`).catch(()=>[]);
  return (rows||[]).length>=8
}
async function inboundFloodActive(){
  const since=new Date(Date.now()-60*60*1000).toISOString();
  const rows=await db(`support_inbox_messages?direction=eq.inbound&sent_at=gte.${encodeURIComponent(since)}&select=id&limit=151`).catch(()=>[]);
  return (rows||[]).length>=150
}
function duplicateError(e){const s=String(e?.message||'').toLowerCase(),code=String(e?.details?.code||'');return code==='23505'||s.includes('duplicate')||s.includes('unique constraint')}
module.exports=async function(req,res){try{
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});const payload=await rawBody(req);if(!verify(payload,req))return json(res,400,{ok:false,error:'Invalid webhook signature.'});
  let event;try{event=JSON.parse(payload)}catch{return json(res,400,{ok:false,error:'Invalid webhook payload.'})}if(event.type!=='email.received')return json(res,200,{ok:true,ignored:true});const meta=event.data||{},rawEmailId=String(meta.email_id||'');if(!rawEmailId||rawEmailId.length>200||!/^[a-z0-9_-]+$/i.test(rawEmailId))return json(res,400,{ok:false,error:'Invalid inbound email identifier.'});const emailId=rawEmailId;
  const duplicate=(await db(`support_inbox_messages?resend_email_id=eq.${encodeURIComponent(emailId)}&select=id&limit=1`).catch(()=>[]))?.[0];if(duplicate)return json(res,200,{ok:true,duplicate:true});
  const full=await receivedEmail(emailId),from=emailOnly(full.from||meta.from),name=displayName(full.from||meta.from),to=Array.isArray(full.to)?full.to:(meta.to||[]),cc=Array.isArray(full.cc)?full.cc:(meta.cc||[]),subject=String(full.subject||meta.subject||'Email to Namdar').trim().slice(0,300),body=String(full.text||'').trim().slice(0,50000),html=String(full.html||'').slice(0,50000),headers=full.headers||{},messageId=String(full.message_id||meta.message_id||getHeader(headers,'message-id')||'').slice(0,1000)||null,inReplyTo=String(getHeader(headers,'in-reply-to')||'').slice(0,1000)||null,route=mailboxOf(to),permission=permissionFor(route.mailbox);
  if(!from||!from.includes('@'))return json(res,200,{ok:true,ignored:true});
  let thread=null;if(route.replyToken)thread=(await db(`support_inbox_threads?reply_token=eq.${encodeURIComponent(route.replyToken)}&select=*&limit=1`))?.[0]||null;
  if(!thread&&inReplyTo){const m=(await db(`support_inbox_messages?email_message_id=eq.${encodeURIComponent(inReplyTo)}&select=thread_id&limit=1`).catch(()=>[]))?.[0];if(m?.thread_id)thread=(await db(`support_inbox_threads?id=eq.${encodeURIComponent(m.thread_id)}&select=*&limit=1`))?.[0]||null}
  const customer=(await db(`profiles?email=eq.${encodeURIComponent(from)}&role=eq.customer&select=id,full_name&limit=1`).catch(()=>[]))?.[0]||null;
  const block=await blockedRule(from),replyContext=!!thread||!!route.replyToken||!!inReplyTo,rawAttachments=(full.attachments||meta.attachments||[]).slice(0,20),security=assessSecurity({from,headers,attachments:rawAttachments,replyContext});
  let assessment=block?{isSpam:true,score:100,reason:block.reason||(block.scope==='domain'?`Blocked domain @${block.value}`:`Blocked sender ${block.value}`)}:security.isSpam?security:assessSpam({subject,body,headers,knownCustomer:!!customer,replyContext});
  if(!block&&!security.isSpam&&!customer&&!replyContext&&await highFrequencyUnknownSender(from))assessment={isSpam:true,score:100,reason:'High-frequency unknown sender'};
  if(!block&&!security.isSpam&&!customer&&!replyContext&&!assessment.isSpam&&await inboundFloodActive())assessment={isSpam:true,score:100,reason:'Inbound flood protection'};
  let quarantined=!!block||assessment.isSpam||thread?.status==='spam';
  if(!thread&&quarantined){thread=(await db(`support_inbox_threads?customer_email=eq.${encodeURIComponent(from)}&mailbox=eq.${encodeURIComponent(route.mailbox)}&status=eq.spam&select=*&order=updated_at.desc&limit=1`).catch(()=>[]))?.[0]||null}
  const spamSource=block?(block.scope==='domain'?'blocked_domain':'blocked_sender'):(security.isSpam?'security':assessment.isSpam?'automatic':thread?.spam_source||null);
  const spamReason=block?(block.reason||(block.scope==='domain'?`Blocked domain @${block.value}`:`Blocked sender ${block.value}`)):(assessment.isSpam?assessment.reason:thread?.spam_reason||null);
  const spamScore=block?100:(assessment.isSpam?assessment.score:Number(thread?.spam_score||0));
  if(!thread){thread=(await db('support_inbox_threads',{method:'POST',prefer:'return=representation',body:{mailbox:route.mailbox,permission_key:permission,customer_id:customer?.id||null,customer_email:from,customer_name:customer?.full_name||name,subject,status:quarantined?'spam':'awaiting_staff',priority:priorityFor(subject,body),unread_count:0,last_message_at:new Date().toISOString(),spam_source:quarantined?spamSource:null,spam_reason:quarantined?spamReason:null,spam_score:quarantined?spamScore:0}}))?.[0]}
  if(!thread)return json(res,500,{ok:false,error:'Could not create inbox thread.'});
  quarantined=quarantined||thread.status==='spam';
  const attachments=rawAttachments.map(a=>({id:String(a.id||'').slice(0,200),filename:String(a.filename||'attachment').slice(0,240),content_type:String(a.content_type||'').slice(0,160),size:Number(a.size||0)||0}));
  try{
    await db('support_inbox_messages',{method:'POST',body:{thread_id:thread.id,direction:'inbound',resend_email_id:emailId,email_message_id:messageId,in_reply_to:inReplyTo,from_email:from,to_emails:(to||[]).map(emailOnly).filter(Boolean).slice(0,20),cc_emails:(cc||[]).map(emailOnly).filter(Boolean).slice(0,20),subject,body_html:html||null,body_text:body||'(No plain-text body supplied)',attachments,headers:{'message-id':messageId,'in-reply-to':inReplyTo,'auto-submitted':String(getHeader(headers,'auto-submitted')||'').slice(0,500),'authentication-results':String(getHeader(headers,'authentication-results')||'').slice(0,2000)},delivery_status:'received',sent_at:full.created_at||meta.created_at||new Date().toISOString()}});
  }catch(e){if(duplicateError(e))return json(res,200,{ok:true,duplicate:true});throw e}
  const unread=quarantined?0:Number(thread.unread_count||0)+1,threadPatch={customer_id:thread.customer_id||customer?.id||null,customer_name:thread.customer_name||customer?.full_name||name,status:quarantined?'spam':'awaiting_staff',unread_count:unread,last_message_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  if(quarantined){threadPatch.spam_source=spamSource||thread.spam_source||'automatic';threadPatch.spam_reason=spamReason||thread.spam_reason||'Quarantined by Namdar inbox protection';threadPatch.spam_score=Math.max(spamScore,Number(thread.spam_score||0))}
  await db(`support_inbox_threads?id=eq.${encodeURIComponent(thread.id)}`,{method:'PATCH',body:threadPatch});
  if(quarantined)return json(res,200,{ok:true,quarantined:true});
  await createStaffNotification({type:'inbound_email',title:`New ${route.mailbox} email`,body:`${customer?.full_name||name||from} · ${subject}`,targetPath:`/admin?tab=inbox&thread=${encodeURIComponent(thread.id)}`,permissionKey:permission,entityType:'support_inbox_thread',entityId:thread.id,priority:thread.priority||priorityFor(subject,body),dedupeKey:`inbound-email:${emailId}`});
  return json(res,200,{ok:true});
}catch(e){return safeError(res,e)}};
