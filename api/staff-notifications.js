const {json,parseBody,queryParam,db,requireStaff,safeError}=require('../lib/server');
async function context(req){
  const base=await requireStaff(req);if(base.profile.role==='admin')return{...base,isAdmin:true,perms:{all:true}};
  const a=(await db(`staff_access?user_id=eq.${encodeURIComponent(base.user.id)}&select=permissions,active&limit=1`))?.[0];
  return{...base,isAdmin:false,perms:a?.active?(a.permissions||{}):{}};
}
function visible(n,ctx){return(!n.target_user_id||n.target_user_id===ctx.user.id)&&(!n.permission_key||ctx.isAdmin||ctx.perms?.[n.permission_key]===true)}
async function stateFor(userId,id){return (await db(`staff_notification_states?notification_id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}&select=notification_id,read_at,archived_at&limit=1`))?.[0]||null}
async function putState(userId,id,patch){return db(`staff_notification_states?on_conflict=notification_id,user_id`,{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{notification_id:id,user_id:userId,...patch}})}
module.exports=async function(req,res){try{
  const ctx=await context(req);
  if(req.method==='GET'){
    const view=String(queryParam(req,'view','inbox')||'inbox').toLowerCase();if(!['inbox','archived'].includes(view))return json(res,400,{ok:false,error:'Invalid notification view.'});
    const rows=await db('staff_notifications?select=id,notification_type,title,body,target_path,permission_key,target_user_id,entity_type,entity_id,priority,created_at&order=created_at.desc&limit=200');
    const candidate=(rows||[]).filter(n=>visible(n,ctx)),ids=candidate.map(x=>x.id);let states=[];
    if(ids.length)states=await db(`staff_notification_states?user_id=eq.${encodeURIComponent(ctx.user.id)}&notification_id=in.(${ids.map(x=>encodeURIComponent(x)).join(',')})&select=notification_id,read_at,archived_at`);
    const sm=Object.fromEntries((states||[]).map(x=>[x.notification_id,x]));
    const all=candidate.map(n=>({...n,read_at:sm[n.id]?.read_at||null,archived_at:sm[n.id]?.archived_at||null}));
    const messages=all.filter(n=>view==='archived'?!!n.archived_at:!n.archived_at),unreadCount=all.filter(n=>!n.archived_at&&!n.read_at).length;
    return json(res,200,{ok:true,view,unreadCount,notifications:messages});
  }
  if(req.method==='PATCH'){
    const b=parseBody(req),action=String(b.action||'read');
    if(action==='read_all'){
      const rows=await db('staff_notifications?select=id,permission_key,target_user_id&order=created_at.desc&limit=250'),visibleRows=(rows||[]).filter(x=>visible(x,ctx)),ids=visibleRows.map(x=>x.id);let states=[];
      if(ids.length)states=await db(`staff_notification_states?user_id=eq.${encodeURIComponent(ctx.user.id)}&notification_id=in.(${ids.map(x=>encodeURIComponent(x)).join(',')})&select=notification_id,read_at,archived_at`);
      const sm=Object.fromEntries((states||[]).map(x=>[x.notification_id,x])),now=new Date().toISOString();for(const n of visibleRows){const old=sm[n.id];if(old?.archived_at)continue;await putState(ctx.user.id,n.id,{read_at:now,archived_at:null})}
      return json(res,200,{ok:true});
    }
    if(!['read','unread','archive','restore'].includes(action))return json(res,400,{ok:false,error:'Invalid notification action.'});
    const id=String(b.notificationId||'').trim();if(!id)return json(res,400,{ok:false,error:'Notification ID is required.'});
    const n=(await db(`staff_notifications?id=eq.${encodeURIComponent(id)}&select=*&limit=1`))?.[0];if(!n||!visible(n,ctx))return json(res,404,{ok:false,error:'Notification not found.'});
    const old=await stateFor(ctx.user.id,id),now=new Date().toISOString();let patch={};
    if(action==='read')patch={read_at:now,archived_at:old?.archived_at||null};
    if(action==='unread')patch={read_at:null,archived_at:old?.archived_at||null};
    if(action==='archive')patch={read_at:old?.read_at||now,archived_at:now};
    if(action==='restore')patch={read_at:old?.read_at||null,archived_at:null};
    await putState(ctx.user.id,id,patch);return json(res,200,{ok:true});
  }
  return json(res,405,{ok:false,error:'Method not allowed'});
}catch(e){return safeError(res,e)}};
