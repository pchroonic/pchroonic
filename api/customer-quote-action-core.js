const { json, parseBody, queryParam, db, requireCustomer, sendEmail, escapeHtml, env, cancelPendingBusinessNotifications, createStaffNotification, safeError, isManagedInboxAddress } = require('../lib/server');
const {availabilityForQuote}=require('../lib/booking-operations');
const WINDOWS={
  '08-11':{start:'08:00',end:'11:00',label:'08:00–11:00'},
  '11-14':{start:'11:00',end:'14:00',label:'11:00–14:00'},
  '14-17':{start:'14:00',end:'17:00',label:'14:00–17:00'}
};
function londonLocalToUtc(dateStr,timeStr){
  const [y,m,d]=String(dateStr||'').split('-').map(Number),[hh,mm]=String(timeStr||'').split(':').map(Number);
  if(!y||!m||!d||!Number.isFinite(hh)||!Number.isFinite(mm))return null;
  let guess=new Date(Date.UTC(y,m-1,d,hh,mm,0));
  const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  for(let i=0;i<2;i++){const p=Object.fromEntries(fmt.formatToParts(guess).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));const shown=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour),Number(p.minute)),wanted=Date.UTC(y,m-1,d,hh,mm);guess=new Date(guess.getTime()+(wanted-shown))}return guess;
}
function londonDateString(value=new Date()){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(value).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`}
function addDays(dateStr,n){const [y,m,d]=dateStr.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+n,12)).toISOString().slice(0,10)}
async function ownedQuote(userId,id){const q=(await db(`quotes?id=eq.${encodeURIComponent(id)}&customer_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`))?.[0];if(!q){const e=new Error('Quote not found.');e.status=404;throw e}return q}
function expired(q){return q.expires_at&&new Date(q.expires_at).getTime()<Date.now()}
async function activeBooking(quoteId){return (await db(`bookings?quote_id=eq.${encodeURIComponent(quoteId)}&status=in.(pending,confirmed,completed)&select=id,status,starts_at&limit=1`))?.[0]||null}
async function availableSlots(){
  const today=londonDateString(),last=addDays(today,20),rangeStart=londonLocalToUtc(today,'00:00'),rangeEnd=londonLocalToUtc(addDays(last,1),'00:00');
  const existing=await db(`bookings?starts_at=lt.${encodeURIComponent(rangeEnd.toISOString())}&ends_at=gt.${encodeURIComponent(rangeStart.toISOString())}&status=in.(pending,confirmed)&select=id,starts_at,ends_at&limit=1000`),now=Date.now(),slots=[];
  for(let day=0;day<21;day++){const date=addDays(today,day);for(const [key,w] of Object.entries(WINDOWS)){const start=londonLocalToUtc(date,w.start),end=londonLocalToUtc(date,w.end);if(!start||!end||start.getTime()<=now)continue;const conflict=(existing||[]).some(x=>new Date(x.starts_at)<end&&new Date(x.ends_at)>start);if(!conflict)slots.push({date,windowKey:key,label:w.label,startsAt:start.toISOString(),endsAt:end.toISOString()})}}
  return slots;
}
function safePhotoPaths(paths,userId,quoteId){const prefix=`${userId}/quotes/${quoteId}/request/`,out=[];for(const v of Array.isArray(paths)?paths:[]){const p=String(v||'').trim();if(p&&p.length<=700&&p.startsWith(prefix)&&!p.includes('..')&&!out.includes(p))out.push(p)}return out.slice(0,8)}
module.exports=async function handler(req,res){
  try{
    const {user,profile}=await requireCustomer(req);
    if(req.method==='GET'){
      const quoteId=String(queryParam(req,'quoteId')||'').trim();if(!quoteId)return json(res,400,{ok:false,error:'Quote ID is required.'});
      const q=await ownedQuote(user.id,quoteId),booking=await activeBooking(q.id);
      if(expired(q)&&q.customer_response==='pending'&&q.status!=='expired')await db(`quotes?id=eq.${encodeURIComponent(q.id)}`,{method:'PATCH',body:{status:'expired',updated_at:new Date().toISOString()}}).catch(()=>null);
      const canSchedule=!booking&&q.customer_response==='accepted'&&q.final_price!=null&&['approved','sent'].includes(q.status);
      const availability=await availabilityForQuote(db,q),paused=availability.rules.confirmationMode==='paused';
      const automatic=availability.rules.confirmationMode==='automatic'&&q.service_key==='windows'&&q.booking_requires_review===false;
      const confirmationMessage=paused?'New bookings are temporarily paused. Please contact Namdar.':automatic?'Your appointment will be confirmed immediately if the slot is still available. Your accepted final price stays unchanged.':'Your appointment needs Namdar approval. We will confirm it after reviewing your request. Your accepted final price stays unchanged.';
      return json(res,200,{ok:true,quote:{id:q.id,status:expired(q)&&q.customer_response==='pending'?'expired':q.status,customerResponse:q.customer_response,expiresAt:q.expires_at,finalPrice:q.final_price},booking,slots:canSchedule?availability.slots:[],scheduling:{paused,automatic,confirmationMessage}});
    }
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const b=parseBody(req),quoteId=String(b.quoteId||'').trim(),action=String(b.action||'').trim();if(!quoteId)return json(res,400,{ok:false,error:'Quote ID is required.'});
    const q=await ownedQuote(user.id,quoteId);
    if(action==='add_photos'){
      if(['declined','expired'].includes(q.status)||q.customer_response==='declined')return json(res,409,{ok:false,error:'Photos cannot be added to this quote now.'});
      const incoming=safePhotoPaths(b.paths,user.id,q.id);if(!incoming.length)return json(res,400,{ok:false,error:'No valid quote photos were supplied.'});
      const current=Array.isArray(q.photo_paths)?q.photo_paths:[],combined=[...new Set([...current,...incoming])].slice(0,8);await db(`quotes?id=eq.${encodeURIComponent(q.id)}`,{method:'PATCH',body:{photo_paths:combined,updated_at:new Date().toISOString()}});await createStaffNotification({type:'quote_photos',title:'Customer added quote photos',body:`${q.customer_name||profile?.full_name||'Customer'} · ${incoming.length} new photo${incoming.length===1?'':'s'}`,targetPath:`/admin?tab=quotes&quote=${encodeURIComponent(q.id)}`,permissionKey:'quotes',entityType:'quote',entityId:q.id,priority:'normal',dedupeKey:`quote-photos:${q.id}:${combined.length}`});const support=env('NAMDAR_NOTIFY_EMAIL',env('NAMDAR_SUPPORT_EMAIL','support@namdar.co.uk'));if(support&&!isManagedInboxAddress(support))await sendEmail({to:support,subject:'Customer added quote photos',html:`<p><strong>${escapeHtml(q.customer_name||profile?.full_name||'Customer')}</strong> added ${incoming.length} private photo${incoming.length===1?'':'s'} to a Namdar quote.</p><p>Quote ID: ${escapeHtml(q.id)}</p><p><a href="https://namdar.co.uk/admin">Open Namdar Admin</a></p>`});return json(res,200,{ok:true,photoPaths:combined});
    }
    if(!['accept','decline'].includes(action))return json(res,400,{ok:false,error:'Choose a valid quote action.'});
    if(await activeBooking(q.id))return json(res,409,{ok:false,error:'This quote already has a booking.'});
    if(expired(q)){await db(`quotes?id=eq.${encodeURIComponent(q.id)}`,{method:'PATCH',body:{status:'expired',updated_at:new Date().toISOString()}}).catch(()=>null);return json(res,409,{ok:false,error:'This quote has expired. Please ask Namdar for an updated quote.'})}
    if(q.final_price==null||!['sent','approved'].includes(q.status))return json(res,409,{ok:false,error:'Namdar has not sent the final quote yet.'});
    const now=new Date().toISOString(),note=String(b.note||'').trim().slice(0,1200),accepted=action==='accept',patch={customer_response:accepted?'accepted':'declined',customer_responded_at:now,customer_response_note:note||null,status:accepted?'approved':'declined',updated_at:now};
    await db(`quotes?id=eq.${encodeURIComponent(q.id)}`,{method:'PATCH',body:patch});
    await cancelPendingBusinessNotifications('quote',q.id,'quote_reminder').catch(()=>null);
    const name=q.customer_name||profile?.full_name||'there',support=env('NAMDAR_NOTIFY_EMAIL',env('NAMDAR_SUPPORT_EMAIL','support@namdar.co.uk')),amount=Number(q.final_price||0).toFixed(2);
    if(q.email)await sendEmail({to:q.email,subject:accepted?'Namdar quote accepted':'Namdar quote declined',html:accepted?`<p>Hi ${escapeHtml(name)},</p><p>Your acceptance of the <strong>£${amount}</strong> Namdar quote has been recorded.</p><p>You can now choose an available appointment slot in <a href="https://namdar.co.uk/account?tab=quotes&quote=${encodeURIComponent(q.id)}">My Namdar</a>. The slot becomes a booking request when you submit it.</p>`:`<p>Hi ${escapeHtml(name)},</p><p>Your decision to decline the <strong>£${amount}</strong> Namdar quote has been recorded.</p><p>If you change your mind or need a revised scope, contact Namdar support.</p><p><a href="https://namdar.co.uk/account?tab=quotes&quote=${encodeURIComponent(q.id)}">View this quote in My Namdar</a></p>`,archiveForCustomer:true,customerId:user.id,messageCategory:'quote',targetPath:`/account?tab=quotes&quote=${encodeURIComponent(q.id)}`});
    await createStaffNotification({type:accepted?'quote_accepted':'quote_declined',title:`Customer ${accepted?'accepted':'declined'} quote`,body:`${name} · £${amount}${note?` · ${note}`:''}`,targetPath:`/admin?tab=quotes&quote=${encodeURIComponent(q.id)}`,permissionKey:'quotes',entityType:'quote',entityId:q.id,priority:accepted?'high':'normal',dedupeKey:`quote-response:${q.id}:${accepted?'accepted':'declined'}`});if(support&&!isManagedInboxAddress(support))await sendEmail({to:support,subject:`Customer ${accepted?'accepted':'declined'} Namdar quote`,html:`<h2>Quote ${accepted?'accepted':'declined'}</h2><p><strong>${escapeHtml(name)}</strong> ${accepted?'accepted':'declined'} quote <strong>£${amount}</strong>.</p>${note?`<p>Customer note:<br>${escapeHtml(note).replace(/\n/g,'<br>')}</p>`:''}<p>Quote ID: ${escapeHtml(q.id)}</p><p><a href="https://namdar.co.uk/admin">Open Namdar Admin</a></p>`});
    return json(res,200,{ok:true,quote:{id:q.id,status:patch.status,customerResponse:patch.customer_response,customerRespondedAt:now},message:accepted?'Quote accepted. Choose your preferred appointment slot next.':'Quote declined.'});
  }catch(e){return safeError(res,e)}
};
