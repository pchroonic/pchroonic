const {json,parseBody,db,safeError}=require('../lib/server');
function prefs(value={}){return{offers:value?.offers!==false,tips:value?.tips!==false,news:value?.news!==false}}
module.exports=async function(req,res){try{
  if(!['GET','POST'].includes(req.method))return json(res,405,{ok:false,error:'Method not allowed'});
  const url=new URL(req.url,'https://namdar.co.uk'),token=String(url.searchParams.get('token')||'').trim();
  if(!token)return json(res,400,{ok:false,error:'Missing email preference token.'});
  const subscriber=(await db(`newsletter_subscribers?unsubscribe_token=eq.${encodeURIComponent(token)}&select=id,status,preferences&limit=1`))?.[0];
  if(!subscriber)return json(res,404,{ok:false,error:'Subscription not found.'});
  if(req.method==='GET')return json(res,200,{ok:true,status:subscriber.status,preferences:prefs(subscriber.preferences)});
  const body=parseBody(req),action=String(body.action||url.searchParams.get('action')||'unsubscribe');
  if(action==='preferences'){
    const next={offers:body.preferences?.offers===true,tips:body.preferences?.tips===true,news:body.preferences?.news===true},any=Object.values(next).some(Boolean),now=new Date().toISOString();
    await db(`newsletter_subscribers?id=eq.${encodeURIComponent(subscriber.id)}`,{method:'PATCH',body:{preferences:next,preferences_updated_at:now,status:any?'subscribed':'unsubscribed',unsubscribed_at:any?null:now,updated_at:now}});
    return json(res,200,{ok:true,status:any?'subscribed':'unsubscribed',preferences:next});
  }
  if(action!=='unsubscribe')return json(res,400,{ok:false,error:'Unknown email preference action.'});
  const now=new Date().toISOString();
  await db(`newsletter_subscribers?id=eq.${encodeURIComponent(subscriber.id)}`,{method:'PATCH',body:{status:'unsubscribed',unsubscribed_at:now,updated_at:now}});
  return json(res,200,{ok:true,status:'unsubscribed'});
}catch(e){return safeError(res,e)}};
