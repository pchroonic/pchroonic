const {json,parseBody,db,sendEmail,safeError,randomId,requestOrigin}=require('../lib/server');
const {welcomeMessage}=require('../lib/newsletter');

module.exports=async function(req,res){
  try{
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const b=parseBody(req),token=String(b.token||'').trim().slice(0,160);
    if(!token||!token.startsWith('c_'))return json(res,400,{ok:false,error:'This confirmation link is invalid or has expired.'});
    const row=(await db(`newsletter_subscribers?confirm_token=eq.${encodeURIComponent(token)}&select=id,email,full_name,status,unsubscribe_token,preferences&limit=1`))?.[0]||null;
    if(!row)return json(res,400,{ok:false,error:'This confirmation link is invalid or has already been used.'});
    if(row.status==='unsubscribed')return json(res,400,{ok:false,error:'This subscription was cancelled. Please join again from the Namdar website.'});
    if(row.status==='subscribed')return json(res,200,{ok:true,alreadyConfirmed:true,message:'Your Namdar newsletter subscription is already confirmed.'});
    const now=new Date().toISOString(),nextToken=randomId('c_');
    const updated=(await db(`newsletter_subscribers?id=eq.${encodeURIComponent(row.id)}&status=eq.pending`,{method:'PATCH',prefer:'return=representation',body:{status:'subscribed',confirmed_at:now,confirm_token:nextToken,updated_at:now}}))?.[0]||null;
    if(!updated)return json(res,409,{ok:false,error:'This subscription could not be confirmed. Please refresh and try again.'});
    const unsubscribeUrl=`${requestOrigin(req)}/unsubscribe?token=${encodeURIComponent(row.unsubscribe_token)}`,welcome=welcomeMessage({name:row.full_name||'',preferences:row.preferences});
    await sendEmail({to:row.email,subject:'Welcome to Namdar updates',html:`${welcome.html}<p style="font-size:12px;color:#68736f"><a href="${unsubscribeUrl}">Unsubscribe from Namdar marketing emails</a></p>`,text:`${welcome.text}\n\nUnsubscribe: ${unsubscribeUrl}`,headers:{'List-Unsubscribe':`<${requestOrigin(req)}/api/newsletter-unsubscribe?token=${encodeURIComponent(row.unsubscribe_token)}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}}).catch(()=>null);
    return json(res,200,{ok:true,message:'Your Namdar newsletter subscription is confirmed.'});
  }catch(e){return safeError(res,e)}
};
