const {json,parseBody,db,requireStaff,sendEmail,escapeHtml,requestOrigin,auditLog,safeError}=require('../lib/server');
const {normalizeTopic,normalizePreferences,subscriberWantsTopic,safeCampaignUrl,buildCampaignMessage,TOPIC_LABELS}=require('../lib/newsletter');

function clean(value='',max=20000){return String(value||'').trim().slice(0,max)}
function campaignInput(body={},origin='https://namdar.co.uk'){
  const subject=clean(body.subject,160),message=clean(body.body||body.bodyText,20000),preheader=clean(body.preheader,220),ctaLabel=clean(body.ctaLabel,80),ctaUrl=safeCampaignUrl(body.ctaUrl,origin),audienceTopic=normalizeTopic(body.audienceTopic);
  if(!subject||!message){const e=new Error('Subject and message are required.');e.status=400;throw e}
  if(body.ctaUrl&&body.ctaLabel&&!ctaUrl){const e=new Error('Call-to-action URL must be a valid secure URL.');e.status=400;throw e}
  return{subject,bodyText:message,preheader,ctaLabel,ctaUrl,audienceTopic};
}
async function subscribedAudience(topic='all'){
  const rows=await db('newsletter_subscribers?status=eq.subscribed&select=id,email,full_name,preferences,unsubscribe_token&order=created_at.asc');
  return(rows||[]).filter(x=>subscriberWantsTopic(x,topic));
}
function draftBody(input,staffId){return{subject:input.subject,preheader:input.preheader||null,body_text:input.bodyText,body_html:escapeHtml(input.bodyText).replace(/\n/g,'<br>'),cta_label:input.ctaLabel||null,cta_url:input.ctaUrl||null,audience_topic:input.audienceTopic,status:'draft',recipient_count:0,sent_count:0,failed_count:0,sent_at:null,created_by:staffId,updated_at:new Date().toISOString()}}

module.exports=async function(req,res){
  try{
    const staff=await requireStaff(req,'newsletter');
    if(req.method==='GET'){
      const [subscribers,campaigns]=await Promise.all([
        db('newsletter_subscribers?select=id,email,full_name,status,source,consent_at,confirmed_at,unsubscribed_at,preferences,created_at&order=created_at.desc&limit=500'),
        db('newsletter_campaigns?select=id,subject,preheader,body_text,body_html,cta_label,cta_url,audience_topic,status,recipient_count,sent_count,failed_count,created_at,updated_at,sent_at&order=created_at.desc&limit=100')
      ]);
      const rows=subscribers||[],active=rows.filter(x=>x.status==='subscribed'),pending=rows.filter(x=>x.status==='pending'),unsubscribed=rows.filter(x=>x.status==='unsubscribed');
      const topics={all:active.length,offers:active.filter(x=>normalizePreferences(x.preferences).offers).length,tips:active.filter(x=>normalizePreferences(x.preferences).tips).length,news:active.filter(x=>normalizePreferences(x.preferences).news).length};
      return json(res,200,{ok:true,stats:{active:active.length,pending:pending.length,unsubscribed:unsubscribed.length,total:rows.length,topics},subscribers:rows,campaigns:campaigns||[],topicLabels:TOPIC_LABELS});
    }
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const b=parseBody(req),action=String(b.action||'').trim(),origin=requestOrigin(req);
    if(action==='save_draft'){
      const input=campaignInput(b,origin),campaignId=clean(b.campaignId,80);let campaign;
      if(campaignId){
        const existing=(await db(`newsletter_campaigns?id=eq.${encodeURIComponent(campaignId)}&select=id,status&limit=1`))?.[0];
        if(!existing)return json(res,404,{ok:false,error:'Campaign not found.'});
        if(existing.status!=='draft')return json(res,409,{ok:false,error:'Only draft campaigns can be edited.'});
        campaign=(await db(`newsletter_campaigns?id=eq.${encodeURIComponent(campaignId)}`,{method:'PATCH',prefer:'return=representation',body:draftBody(input,staff.user.id)}))?.[0]||null;
      }else campaign=(await db('newsletter_campaigns',{method:'POST',prefer:'return=representation',body:draftBody(input,staff.user.id)}))?.[0]||null;
      await auditLog(req,staff,{action:'newsletter.draft_save',entityType:'newsletter_campaign',entityId:campaign?.id||null,summary:'Saved newsletter campaign draft',after:{id:campaign?.id||null,subject:input.subject,audience_topic:input.audienceTopic}});
      return json(res,200,{ok:true,campaign});
    }
    if(action==='test'){
      const input=campaignInput(b,origin),to=String(staff.user.email||'').trim().toLowerCase();
      if(!to)return json(res,400,{ok:false,error:'Your staff account does not have an email address for the test message.'});
      const rendered=buildCampaignMessage({preheader:input.preheader,body_text:input.bodyText,cta_label:input.ctaLabel,cta_url:input.ctaUrl},{full_name:staff.profile?.full_name||''},{origin});
      const result=await sendEmail({to,subject:`[TEST] ${input.subject}`,html:`<p style="font-size:12px;color:#68736f"><strong>Newsletter test only</strong> · this was not sent to subscribers.</p>${rendered.html}`,text:`NEWSLETTER TEST ONLY\n\n${rendered.text}`});
      if(!result?.ok)return json(res,503,{ok:false,error:'The test email could not be sent.'});
      await auditLog(req,staff,{action:'newsletter.test_send',entityType:'newsletter_campaign',entityId:null,summary:'Sent newsletter test to signed-in staff account',after:{subject:input.subject,audience_topic:input.audienceTopic}});
      return json(res,200,{ok:true,message:'Test email sent to your signed-in staff address.'});
    }
    if(action==='send'){
      const campaignId=clean(b.campaignId,80);if(!campaignId)return json(res,400,{ok:false,error:'Save the campaign draft before sending.'});
      const campaign=(await db(`newsletter_campaigns?id=eq.${encodeURIComponent(campaignId)}&select=*&limit=1`))?.[0];
      if(!campaign)return json(res,404,{ok:false,error:'Campaign not found.'});
      if(campaign.status!=='draft')return json(res,409,{ok:false,error:'This campaign has already been sent or is no longer sendable. Create a new draft instead.'});
      const audience=await subscribedAudience(campaign.audience_topic||'all');
      if(!audience.length)return json(res,400,{ok:false,error:'There are no active subscribers in this audience.'});
      if(audience.length>500)return json(res,400,{ok:false,error:'This audience is too large for the current safe sender. Use a batched campaign sender before mailing more than 500 recipients.'});
      const start=new Date().toISOString();
      const locked=(await db(`newsletter_campaigns?id=eq.${encodeURIComponent(campaignId)}&status=eq.draft`,{method:'PATCH',prefer:'return=representation',body:{status:'sending',recipient_count:audience.length,sent_count:0,failed_count:0,updated_at:start}}))?.[0];
      if(!locked)return json(res,409,{ok:false,error:'This campaign is already being processed.'});
      let sent=0,failed=0;
      for(const subscriber of audience){
        const oneClick=`${origin}/api/newsletter-unsubscribe?token=${encodeURIComponent(subscriber.unsubscribe_token)}`,webUnsub=`${origin}/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribe_token)}`;
        const rendered=buildCampaignMessage(campaign,subscriber,{origin,unsubscribeUrl:webUnsub});
        const result=await sendEmail({to:subscriber.email,subject:campaign.subject,html:rendered.html,text:rendered.text,headers:{'List-Unsubscribe':`<${oneClick}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}});
        const ok=result?.ok===true;ok?sent++:failed++;
        await db('newsletter_deliveries',{method:'POST',prefer:'return=minimal',body:{campaign_id:campaign.id,subscriber_id:subscriber.id,status:ok?'sent':'failed',provider_id:ok?(result.data?.id||null):null,error_message:ok?null:'Delivery provider did not accept the message',sent_at:new Date().toISOString()}});
      }
      const status=sent>0?'sent':'failed',finished=new Date().toISOString();
      await db(`newsletter_campaigns?id=eq.${encodeURIComponent(campaign.id)}`,{method:'PATCH',prefer:'return=minimal',body:{status,sent_count:sent,failed_count:failed,sent_at:finished,updated_at:finished}});
      await auditLog(req,staff,{action:'newsletter.send',entityType:'newsletter_campaign',entityId:campaign.id,summary:`Sent newsletter campaign to ${sent} subscriber${sent===1?'':'s'}`,after:{id:campaign.id,subject:campaign.subject,audience_topic:campaign.audience_topic,recipient_count:audience.length,sent_count:sent,failed_count:failed}});
      return json(res,200,{ok:sent>0,sent,failed,total:audience.length,status});
    }
    return json(res,400,{ok:false,error:'Unknown newsletter action.'});
  }catch(e){return safeError(res,e)}
};
