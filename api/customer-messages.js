const {json,parseBody,queryParam,db,requireCustomer,safeError}=require('../lib/server');
module.exports=async function(req,res){
  try{
    const {user}=await requireCustomer(req),email=String(user.email||'').trim().toLowerCase();
    if(email)await db(`customer_messages?customer_id=is.null&recipient_email=eq.${encodeURIComponent(email)}`,{method:'PATCH',prefer:'return=minimal',body:{customer_id:user.id}}).catch(()=>null);
    if(req.method==='GET'){
      const view=String(queryParam(req,'view','inbox')||'inbox').toLowerCase();if(!['inbox','archived'].includes(view))return json(res,400,{ok:false,error:'Invalid notification view.'});
      const archiveFilter=view==='archived'?'archived_at=not.is.null':'archived_at=is.null';
      const rows=await db(`customer_messages?customer_id=eq.${encodeURIComponent(user.id)}&${archiveFilter}&select=id,subject,body_text,category,target_path,delivery_status,read_at,archived_at,sent_at,created_at&order=sent_at.desc&limit=100`);
      return json(res,200,{ok:true,view,messages:(rows||[]).map(x=>({id:x.id,subject:x.subject,bodyText:x.body_text,category:x.category,targetPath:x.target_path,deliveryStatus:x.delivery_status,readAt:x.read_at,archivedAt:x.archived_at,sentAt:x.sent_at||x.created_at})),unreadCount:(rows||[]).filter(x=>!x.read_at).length});
    }
    if(req.method==='PATCH'){
      const b=parseBody(req),action=String(b.action||'read');
      if(action==='read_all'){
        await db(`customer_messages?customer_id=eq.${encodeURIComponent(user.id)}&archived_at=is.null&read_at=is.null`,{method:'PATCH',prefer:'return=minimal',body:{read_at:new Date().toISOString()}});
        return json(res,200,{ok:true});
      }
      if(!['read','unread','archive','restore'].includes(action))return json(res,400,{ok:false,error:'Invalid notification action.'});
      const id=String(b.messageId||'');if(!id)return json(res,400,{ok:false,error:'Message ID is required.'});
      const existing=(await db(`customer_messages?id=eq.${encodeURIComponent(id)}&customer_id=eq.${encodeURIComponent(user.id)}&select=id&limit=1`))?.[0];if(!existing)return json(res,404,{ok:false,error:'Message not found.'});
      const now=new Date().toISOString(),body=action==='archive'?{archived_at:now,read_at:now}:action==='restore'?{archived_at:null}:action==='unread'?{read_at:null}:{read_at:now};
      await db(`customer_messages?id=eq.${encodeURIComponent(id)}&customer_id=eq.${encodeURIComponent(user.id)}`,{method:'PATCH',prefer:'return=minimal',body});
      return json(res,200,{ok:true});
    }
    return json(res,405,{ok:false,error:'Method not allowed'});
  }catch(e){return safeError(res,e)}
};
