const {json,parseBody,queryParam,db,requireStaff,sendEmail,auditLog,createStaffNotification,env,safeError}=require('../lib/server');
async function context(req){const base=await requireStaff(req);if(base.profile.role==='admin')return{...base,isAdmin:true,perms:{all:true}};const a=(await db(`staff_access?user_id=eq.${encodeURIComponent(base.user.id)}&select=permissions,active&limit=1`))?.[0];return{...base,isAdmin:false,perms:a?.active?(a.permissions||{}):{}}}
function canInbox(ctx){return ctx.isAdmin||ctx.perms?.inbox===true||ctx.perms?.tickets===true||ctx.perms?.bookings===true||ctx.perms?.payments===true}
function visibleThread(t,ctx){if(t.target_user_id&&t.target_user_id!==ctx.user.id)return false;if(ctx.isAdmin)return true;const permission=String(t.permission_key||'inbox');return ctx.perms?.[permission]===true}
function parseMailbox(v='support'){const x=String(v||'support').toLowerCase().replace(/[^a-z0-9._-]/g,'');return['support','bookings','accounts','billing','hello'].includes(x)?x:'support'}
function fromFor(mailbox){const local=parseMailbox(mailbox),label=local==='bookings'?'Namdar Bookings':(['accounts','billing'].includes(local)?'Namdar Accounts':local==='hello'?'Namdar':'Namdar Support');return `${label} <${local==='billing'?'accounts':local}@namdar.co.uk>`}
function inboundReply(thread){const domain=String(env('NAMDAR_INBOUND_DOMAIN')||'').trim().toLowerCase().replace(/^@/,'');return domain?`reply+${thread.reply_token}@${domain}`:(env('NAMDAR_SUPPORT_EMAIL')||'support@namdar.co.uk')}
async function getThread(id,ctx){const t=(await db(`support_inbox_threads?id=eq.${encodeURIComponent(id)}&select=*&limit=1`))?.[0];if(!t||!visibleThread(t,ctx)){const e=new Error('Inbox thread not found.');e.status=404;throw e}return t}
module.exports=async function(req,res){try{
  const ctx=await context(req);if(!canInbox(ctx)&&!ctx.isAdmin)return json(res,403,{ok:false,error:'You do not have inbox access.'});
  if(req.method==='GET'){
    const threadId=String(queryParam(req,'threadId','')||'').trim();
    if(threadId){const t=await getThread(threadId,ctx),messages=await db(`support_inbox_messages?thread_id=eq.${encodeURIComponent(t.id)}&select=id,direction,resend_email_id,email_message_id,in_reply_to,from_email,to_emails,cc_emails,subject,body_text,attachments,sent_by,delivery_status,sent_at,created_at&order=sent_at.asc&limit=300`);await db(`support_inbox_threads?id=eq.${encodeURIComponent(t.id)}`,{method:'PATCH',body:{unread_count:0,updated_at:new Date().toISOString()}}).catch(()=>null);return json(res,200,{ok:true,thread:{...t,unread_count:0},messages:messages||[]})}
    const rows=await db('support_inbox_threads?select=*&order=last_message_at.desc&limit=200'),threads=(rows||[]).filter(t=>visibleThread(t,ctx));
    let enrichedThreads=threads;if(threads.length){const ids=threads.map(t=>t.id).filter(Boolean).slice(0,200),recent=ids.length?await db(`support_inbox_messages?thread_id=in.(${ids.map(x=>encodeURIComponent(x)).join(',')})&select=thread_id,direction,body_text,sent_at,created_at&order=sent_at.desc&limit=500`).catch(()=>[]):[],latest={};for(const m of recent||[])if(m.thread_id&&!latest[m.thread_id])latest[m.thread_id]=m;enrichedThreads=threads.map(t=>{const m=latest[t.id]||{};return{...t,last_message_preview:String(m.body_text||'').slice(0,220),last_direction:m.direction||null}})}
    let staff=[];if(ctx.isAdmin||ctx.perms?.staff){const profiles=await db('profiles?role=in.(admin,staff)&account_status=eq.active&select=id,full_name,email,role&order=full_name.asc').catch(()=>[]),ids=(profiles||[]).filter(p=>p.role==='staff').map(p=>p.id),access=ids.length?await db(`staff_access?user_id=in.(${ids.map(x=>encodeURIComponent(x)).join(',')})&select=user_id,permissions,active`).catch(()=>[]):[],am=Object.fromEntries((access||[]).map(a=>[a.user_id,a]));staff=(profiles||[]).filter(p=>p.role==='admin'||am[p.id]?.active).map(p=>({...p,permissions:p.role==='admin'?{all:true}:(am[p.id]?.permissions||{})}))}
    return json(res,200,{ok:true,threads:enrichedThreads,unreadCount:threads.reduce((a,t)=>a+Number(t.unread_count||0),0),staff});
  }
  if(req.method==='POST'){
    const b=parseBody(req),action=String(b.action||'reply');if(action!=='reply')return json(res,400,{ok:false,error:'Unknown inbox action.'});
    const t=await getThread(String(b.threadId||''),ctx),message=String(b.message||'').trim().slice(0,10000);if(!message)return json(res,400,{ok:false,error:'Write a reply first.'});
    const latest=(await db(`support_inbox_messages?thread_id=eq.${encodeURIComponent(t.id)}&email_message_id=not.is.null&select=email_message_id&order=sent_at.desc&limit=1`))?.[0];
    const headers=latest?.email_message_id?{'In-Reply-To':latest.email_message_id,'References':latest.email_message_id}:null;
    const subject=/^re:/i.test(t.subject)?t.subject:`Re: ${t.subject}`;
    const sent=await sendEmail({to:t.customer_email,subject,text:message,from:fromFor(t.mailbox),replyTo:inboundReply(t),headers,archiveForCustomer:!!t.customer_id,customerId:t.customer_id||null,messageCategory:'support',targetPath:'/account?tab=support'});if(!sent?.ok)return json(res,502,{ok:false,error:'The reply could not be sent. Please try again.'});
    await db('support_inbox_messages',{method:'POST',body:{thread_id:t.id,direction:'outbound',resend_email_id:sent.data?.id||null,email_message_id:null,in_reply_to:latest?.email_message_id||null,from_email:fromFor(t.mailbox),to_emails:[t.customer_email],cc_emails:[],subject,body_text:message,attachments:[],headers:headers||{},sent_by:ctx.user.id,delivery_status:'sent',sent_at:new Date().toISOString()}});
    await db(`support_inbox_threads?id=eq.${encodeURIComponent(t.id)}`,{method:'PATCH',body:{status:'awaiting_customer',unread_count:0,last_message_at:new Date().toISOString(),updated_at:new Date().toISOString()}});
    await auditLog(req,ctx,{action:'inbox.reply',entityType:'support_inbox_thread',entityId:t.id,summary:`Replied to ${t.mailbox} inbox thread`,metadata:{customerEmail:t.customer_email,messageLength:message.length}});return json(res,200,{ok:true});
  }
  if(req.method==='PATCH'){
    const b=parseBody(req),t=await getThread(String(b.threadId||''),ctx),action=String(b.action||'read'),patch={updated_at:new Date().toISOString()};
    if(action==='read')patch.unread_count=0;
    else if(action==='unread')patch.unread_count=Math.max(1,Number(t.unread_count||0));
    else if(action==='assign'){const id=b.userId?String(b.userId):null;if(id){const p=(await db(`profiles?id=eq.${encodeURIComponent(id)}&role=in.(admin,staff)&select=id,role&limit=1`))?.[0];if(!p)return json(res,400,{ok:false,error:'Choose a valid team member.'});if(p.role!=='admin'){const a=(await db(`staff_access?user_id=eq.${encodeURIComponent(id)}&select=permissions,active&limit=1`))?.[0];if(!a?.active||a.permissions?.[t.permission_key||'inbox']!==true)return json(res,400,{ok:false,error:'That team member does not have access to this mailbox.'})}}patch.assigned_to=id}
    else if(action==='priority'){if(!['low','normal','high','urgent'].includes(b.priority))return json(res,400,{ok:false,error:'Invalid priority.'});patch.priority=b.priority}
    else if(action==='status'){if(!['awaiting_staff','awaiting_customer','closed'].includes(b.status))return json(res,400,{ok:false,error:'Invalid status.'});patch.status=b.status;if(b.status==='closed')patch.unread_count=0}
    else return json(res,400,{ok:false,error:'Unknown inbox action.'});
    await db(`support_inbox_threads?id=eq.${encodeURIComponent(t.id)}`,{method:'PATCH',body:patch});
    if(action==='assign'&&patch.assigned_to)await createStaffNotification({type:'inbox_assignment',title:`Inbox conversation assigned to you`,body:`${t.customer_name||t.customer_email} · ${t.subject}`,targetPath:`/admin?tab=inbox&thread=${encodeURIComponent(t.id)}`,permissionKey:t.permission_key||'inbox',targetUserId:patch.assigned_to,entityType:'support_inbox_thread',entityId:t.id,priority:t.priority||'normal',dedupeKey:`inbox-assigned:${t.id}:${patch.assigned_to}`});
    await auditLog(req,ctx,{action:`inbox.${action}`,entityType:'support_inbox_thread',entityId:t.id,summary:`Updated ${t.mailbox} inbox thread`,before:t,after:{...t,...patch}});return json(res,200,{ok:true});
  }
  return json(res,405,{ok:false,error:'Method not allowed'});
}catch(e){return safeError(res,e)}};
