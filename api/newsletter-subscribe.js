const {json,parseBody,db,sendEmail,safeError,randomId,verifyTurnstile,authUser,requestOrigin}=require('../lib/server');
const {normalizePreferences,confirmationMessage}=require('../lib/newsletter');

const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_MS=15*60*1000;

function safeSource(value='website'){
  const v=String(value||'website').trim().toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,60);
  return v||'website';
}

module.exports=async function(req,res){
  try{
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const b=parseBody(req),email=String(b.email||'').trim().toLowerCase().slice(0,180),fullName=String(b.fullName||'').trim().slice(0,120),source=safeSource(b.source),preferences=normalizePreferences(b.preferences);
    if(!EMAIL_RE.test(email))return json(res,400,{ok:false,error:'Enter a valid email address.'});
    if(!Object.values(preferences).some(Boolean))return json(res,400,{ok:false,error:'Choose at least one type of Namdar update.'});
    const captcha=await verifyTurnstile(String(b.turnstileToken||''),req);
    if(!captcha.ok)return json(res,400,{ok:false,error:captcha.error||'Please complete the anti-bot check.'});

    const now=new Date(),nowIso=now.toISOString();
    const existing=(await db(`newsletter_subscribers?email=eq.${encodeURIComponent(email)}&select=id,email,full_name,status,source,confirm_token,unsubscribe_token,confirmation_sent_at,customer_id,preferences&limit=1`))?.[0]||null;
    let customerId=existing?.customer_id||null;
    try{const user=await authUser(req);if(user?.id&&String(user.email||'').toLowerCase()===email)customerId=user.id}catch{}

    if(existing?.status==='subscribed'){
      await db(`newsletter_subscribers?id=eq.${encodeURIComponent(existing.id)}`,{method:'PATCH',body:{full_name:fullName||existing.full_name||null,customer_id:customerId,source,preferences,preferences_updated_at:nowIso,updated_at:nowIso}});
      return json(res,200,{ok:true,message:'If this address needs confirmation, we have sent a confirmation link. If it is already subscribed, no further action is needed.'});
    }

    const lastSent=existing?.confirmation_sent_at?new Date(existing.confirmation_sent_at).getTime():0;
    if(existing?.status==='pending'&&Number.isFinite(lastSent)&&now.getTime()-lastSent<RESEND_COOLDOWN_MS){
      await db(`newsletter_subscribers?id=eq.${encodeURIComponent(existing.id)}`,{method:'PATCH',body:{full_name:fullName||existing.full_name||null,customer_id:customerId,source,preferences,preferences_updated_at:nowIso,updated_at:nowIso}});
      return json(res,200,{ok:true,message:'Check your inbox for the Namdar confirmation email. If it has not arrived, wait a few minutes before trying again.'});
    }

    const confirmToken=randomId('c_'),unsubscribeToken=existing?.unsubscribe_token||randomId('u_');
    let row;
    if(existing){
      row=(await db(`newsletter_subscribers?id=eq.${encodeURIComponent(existing.id)}`,{method:'PATCH',prefer:'return=representation',body:{full_name:fullName||existing.full_name||null,customer_id:customerId,status:'pending',source,confirm_token:confirmToken,unsubscribe_token:unsubscribeToken,preferences,consent_at:nowIso,confirmed_at:null,confirmation_sent_at:nowIso,preferences_updated_at:nowIso,unsubscribed_at:null,updated_at:nowIso}}))?.[0]||null;
    }else{
      row=(await db('newsletter_subscribers',{method:'POST',prefer:'return=representation',body:{email,full_name:fullName||null,customer_id:customerId,status:'pending',source,confirm_token:confirmToken,unsubscribe_token:unsubscribeToken,preferences,consent_at:nowIso,confirmation_sent_at:nowIso,preferences_updated_at:nowIso}}))?.[0]||null;
    }

    const confirmUrl=`${requestOrigin(req)}/newsletter-confirm?token=${encodeURIComponent(confirmToken)}`,message=confirmationMessage({name:fullName||row?.full_name||'',confirmUrl});
    const mail=await sendEmail({to:email,subject:'Confirm your Namdar updates',html:message.html,text:message.text});
    if(!mail?.ok){
      if(row?.id)await db(`newsletter_subscribers?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{confirmation_sent_at:null,updated_at:new Date().toISOString()}}).catch(()=>null);
      const error=new Error('We could not send the confirmation email. Please try again shortly.');error.status=503;throw error;
    }
    return json(res,200,{ok:true,message:'Check your inbox and confirm your subscription before Namdar sends marketing updates.'});
  }catch(e){return safeError(res,e)}
};
