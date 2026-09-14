const {json,parseBody,db,authUser,userProfile,requireStaff,verifyTurnstile,env,auditLog,safeError}=require('../lib/server');
const {loadServiceCatalog}=require('../lib/service-catalog');
const {classifyIntent,guidedReply,actionsForIntent,normaliseHistory,buildInstructions}=require('../lib/chat-assistant');

function aiConfigured(){return Boolean(env('OPENAI_API_KEY')&&env('OPENAI_MODEL'))}
function assistantMode(session){return session?.mode==='human'?'human':(aiConfigured()?'ai':'guided')}
function outputText(data={}){
  if(data.output_text)return String(data.output_text).trim();
  for(const item of data.output||[])for(const content of item.content||[])if(content.type==='output_text'&&content.text)return String(content.text).trim();
  return'';
}
async function aiReply({history=[],faqs=[],catalog=[],supportEmail='support@namdar.co.uk'}={}){
  const key=env('OPENAI_API_KEY'),model=env('OPENAI_MODEL');if(!key||!model)return null;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
  try{
    const input=normaliseHistory(history);
    if(!input.length)return null;
    const response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',signal:controller.signal,
      headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
      body:JSON.stringify({model,instructions:buildInstructions({faqs,catalog,supportEmail}),input,max_output_tokens:300,store:false})
    });
    if(!response.ok)return null;
    const data=await response.json();return outputText(data)||null;
  }catch{return null}finally{clearTimeout(timer)}
}
async function getSession({sessionId,guestToken,userId}){
  if(!sessionId)return null;
  const rows=await db(`chat_sessions?id=eq.${encodeURIComponent(sessionId)}&select=*`),session=rows?.[0];
  if(!session)return null;
  if(userId&&session.customer_id===userId)return session;
  if(!userId&&guestToken&&session.guest_token===guestToken)return session;
  return null;
}
async function staffIsOnline(){
  const online=await db('staff_presence?online=eq.true&select=user_id,display_name,last_seen_at&limit=1');
  return!!online?.length;
}
function publicSession(session){return{id:session.id,guestToken:session.guest_token,mode:session.mode,status:session.status}}

module.exports=async function(req,res){try{
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
  const body=parseBody(req),action=String(body.action||'message'),user=await authUser(req);if(user?.id)await userProfile(user.id);

  if(action==='staff_reply'){
    const staffCtx=await requireStaff(req,'chat'),session=(await db(`chat_sessions?id=eq.${encodeURIComponent(body.sessionId)}&select=*`))?.[0];
    if(!session)return json(res,404,{ok:false,error:'Chat not found.'});
    const message=String(body.message||'').trim().slice(0,4000);if(!message)return json(res,400,{ok:false,error:'Reply required.'});
    await db('chat_messages',{method:'POST',body:{session_id:session.id,sender_id:user.id,sender_role:'staff',message}});
    await db(`chat_sessions?id=eq.${encodeURIComponent(session.id)}`,{method:'PATCH',body:{mode:'human',assigned_to:user.id,updated_at:new Date().toISOString()}});
    await auditLog(req,staffCtx,{action:'chat.reply',entityType:'chat_session',entityId:session.id,summary:'Replied to live chat',before:{mode:session.mode,status:session.status},after:{mode:'human',status:session.status},metadata:{messageLength:message.length}});
    return json(res,200,{ok:true});
  }
  if(action==='close'){
    const staffCtx=await requireStaff(req,'chat'),before=(await db(`chat_sessions?id=eq.${encodeURIComponent(body.sessionId)}&select=*&limit=1`))?.[0]||null;
    await db(`chat_sessions?id=eq.${encodeURIComponent(body.sessionId)}`,{method:'PATCH',body:{status:'closed',closed_at:new Date().toISOString(),updated_at:new Date().toISOString()}});
    await auditLog(req,staffCtx,{action:'chat.close',entityType:'chat_session',entityId:body.sessionId,summary:'Closed live chat session',before,after:{...before,status:'closed'}});
    return json(res,200,{ok:true});
  }

  let session=await getSession({sessionId:body.sessionId,guestToken:body.guestToken,userId:user?.id});
  if(action==='poll'&&!session)return json(res,404,{ok:false,error:'Chat session not found.'});
  if(action==='poll'){
    const messages=await db(`chat_messages?session_id=eq.${encodeURIComponent(session.id)}&select=id,sender_role,message,created_at&order=created_at.asc`);
    return json(res,200,{ok:true,session:publicSession(session),messages:messages||[],assistantMode:assistantMode(session)});
  }

  if(action!=='message')return json(res,400,{ok:false,error:'Unknown chat action.'});
  if(session?.status==='closed')session=null;
  if(!session&&!user?.id){const turn=await verifyTurnstile(body.turnstileToken,req);if(!turn.ok)return json(res,400,{ok:false,error:turn.error})}
  if(!session){
    const rows=await db('chat_sessions',{method:'POST',prefer:'return=representation',body:{customer_id:user?.id||null,guest_name:user?.id?null:String(body.name||'Guest').slice(0,120),guest_email:user?.id?null:String(body.email||'').toLowerCase().slice(0,180),status:'open',mode:'assistant'}});
    session=rows[0];
  }

  const message=String(body.message||'').trim().slice(0,4000);if(!message)return json(res,400,{ok:false,error:'Write a message.'});
  await db('chat_messages',{method:'POST',body:{session_id:session.id,sender_id:user?.id||null,sender_role:user?.id?'customer':'guest',message}});
  await db(`chat_sessions?id=eq.${encodeURIComponent(session.id)}`,{method:'PATCH',body:{updated_at:new Date().toISOString()}});
  const staffOnline=await staffIsOnline();

  // Once a team member takes over, the assistant stays out of that conversation.
  if(session.mode==='human')return json(res,200,{ok:true,session:publicSession(session),reply:null,staffOnline,assistantMode:'human',actions:[]});

  const supportEmail=env('NAMDAR_SUPPORT_EMAIL','support@namdar.co.uk');
  const [faqs,catalog,historyDesc]=await Promise.all([
    db('assistant_knowledge?active=eq.true&select=question,answer,keywords&order=sort_order.asc'),
    loadServiceCatalog(db),
    db(`chat_messages?session_id=eq.${encodeURIComponent(session.id)}&select=sender_role,message,created_at&order=created_at.desc&limit=12`)
  ]);
  const history=(historyDesc||[]).reverse(),intent=classifyIntent(message);
  let reply=await aiReply({history,faqs,catalog,supportEmail});
  if(!reply)reply=guidedReply(message,{faqs,catalog,signedIn:!!user?.id,supportEmail});
  await db('chat_messages',{method:'POST',body:{session_id:session.id,sender_role:'assistant',message:reply}});
  const actions=actionsForIntent(intent,{signedIn:!!user?.id,supportEmail});
  return json(res,200,{ok:true,session:publicSession(session),reply,staffOnline,assistantMode:aiConfigured()?'ai':'guided',actions});
}catch(error){return safeError(res,error)}};
