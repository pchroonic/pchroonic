const {json,parseBody,db,requireStaff,sendEmail,requestOrigin,auditLog,safeError}=require('../lib/server');
const {topic,validEmail,subscriberWantsTopic,cleanCampaignInput,campaignEmail,deliveryCounts}=require('../lib/newsletter');

const campaignSelect='id,subject,preheader,body_text,cta_label,cta_url,audience_topic,recipient_count,sent_count,failed_count,status,created_at,updated_at,sent_at';
const subscriberSelect='id,email,full_name,status,source,consent_at,unsubscribed_at,preferences,created_at';

function fail(message,status=400){const e=new Error(message);e.status=status;throw e}
async function campaignById(id){return (await db(`newsletter_campaigns?id=eq.${encodeURIComponent(id)}&select=${campaignSelect}&limit=1`))?.[0]||null}
async function allDeliveries(campaignId){return db(`newsletter_campaign_deliveries?campaign_id=eq.${encodeURIComponent(campaignId)}&select=id,status&order=created_at.asc`)||[]}
async function progress(campaignId){const campaign=await campaignById(campaignId);const deliveries=await allDeliveries(campaignId);return{campaign,deliveryCounts:deliveryCounts(deliveries)}}

async function dashboard(){
  const [subscribers,campaigns]=await Promise.all([
    db(`newsletter_subscribers?select=${subscriberSelect}&order=created_at.desc&limit=1000`),
    db(`newsletter_campaigns?select=${campaignSelect}&order=created_at.desc&limit=100`)
  ]);
  const rows=subscribers||[],active=rows.filter(x=>x.status==='subscribed');
  const audiences={all:active.length,offers:active.filter(x=>subscriberWantsTopic(x,'offers')).length,tips:active.filter(x=>subscriberWantsTopic(x,'tips')).length,news:active.filter(x=>subscriberWantsTopic(x,'news')).length};
  return{subscribers:rows,campaigns:campaigns||[],summary:{total:rows.length,active:active.length,unsubscribed:rows.filter(x=>x.status==='unsubscribed').length,pending:rows.filter(x=>x.status==='pending').length,audiences}};
}

async function saveDraft(req,staff,b){
  const clean=cleanCampaignInput(b,requestOrigin(req));
  const body={subject:clean.subject,preheader:clean.preheader,body_text:clean.bodyText,body_html:clean.bodyHtml,cta_label:clean.ctaLabel,cta_url:clean.ctaUrl,audience_topic:clean.audienceTopic,updated_at:new Date().toISOString()};
  let row=null;
  if(b.campaignId){
    const current=await campaignById(b.campaignId);if(!current)fail('Campaign not found.',404);if(current.status!=='draft')fail('Only draft campaigns can be edited.');
    row=(await db(`newsletter_campaigns?id=eq.${encodeURIComponent(current.id)}`,{method:'PATCH',prefer:'return=representation',body}))?.[0]||null;
  }else{
    row=(await db('newsletter_campaigns',{method:'POST',prefer:'return=representation',body:{...body,status:'draft',created_by:staff.user.id}}))?.[0]||null;
  }
  await auditLog(req,staff,{action:'newsletter.draft.save',entityType:'newsletter_campaign',entityId:row?.id||null,summary:'Saved newsletter draft',after:{id:row?.id||null,subject:clean.subject,audience_topic:clean.audienceTopic}});
  return row;
}

async function sendTest(req,staff,b){
  const clean=cleanCampaignInput(b,requestOrigin(req)),testEmail=String(b.testEmail||staff.profile?.email||staff.user?.email||'').trim().toLowerCase();
  if(!validEmail(testEmail))fail('Enter a valid test email address.');
  const email=campaignEmail({campaign:{subject:clean.subject,preheader:clean.preheader,body_text:clean.bodyText,cta_label:clean.ctaLabel,cta_url:clean.ctaUrl},subscriber:{full_name:staff.profile?.full_name||'Namdar team'},origin:requestOrigin(req),test:true});
  const result=await sendEmail({to:testEmail,subject:email.subject,html:email.html,text:email.text});if(!result?.ok)fail('The test email could not be sent.',502);
  await auditLog(req,staff,{action:'newsletter.test.send',entityType:'newsletter_campaign',entityId:b.campaignId||null,summary:'Sent newsletter test email',after:{campaign_id:b.campaignId||null}});
  return{ok:true};
}

async function startSend(req,staff,b){
  const id=String(b.campaignId||'');if(!id)fail('Choose a campaign first.');
  const campaign=await campaignById(id);if(!campaign)fail('Campaign not found.',404);
  if(campaign.status==='sending')return progress(id);
  if(campaign.status!=='draft')fail('Only a draft campaign can start sending.');
  const subscribers=await db('newsletter_subscribers?status=eq.subscribed&select=id,status,preferences&order=created_at.asc&limit=10000');
  const audience=(subscribers||[]).filter(s=>subscriberWantsTopic(s,campaign.audience_topic));
  if(!audience.length)fail('No active subscribers currently match this audience.');
  const rows=audience.map(s=>({campaign_id:id,subscriber_id:s.id,status:'queued'}));
  await db('newsletter_campaign_deliveries?on_conflict=campaign_id,subscriber_id',{method:'POST',prefer:'resolution=ignore-duplicates,return=minimal',body:rows});
  await db(`newsletter_campaigns?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:{status:'sending',recipient_count:audience.length,sent_count:0,failed_count:0,updated_at:new Date().toISOString()}});
  await auditLog(req,staff,{action:'newsletter.send.start',entityType:'newsletter_campaign',entityId:id,summary:`Queued newsletter for ${audience.length} subscriber${audience.length===1?'':'s'}`,after:{campaign_id:id,audience_topic:topic(campaign.audience_topic),recipient_count:audience.length}});
  return progress(id);
}

async function processSend(req,staff,b){
  const id=String(b.campaignId||'');if(!id)fail('Campaign is required.');
  let campaign=await campaignById(id);if(!campaign)fail('Campaign not found.',404);if(campaign.status!=='sending')return progress(id);
  const stale=new Date(Date.now()-10*60*1000).toISOString();
  await db(`newsletter_campaign_deliveries?campaign_id=eq.${encodeURIComponent(id)}&status=eq.processing&attempted_at=lt.${encodeURIComponent(stale)}`,{method:'PATCH',body:{status:'queued',attempted_at:null,updated_at:new Date().toISOString()}}).catch(()=>null);
  const queued=await db(`newsletter_campaign_deliveries?campaign_id=eq.${encodeURIComponent(id)}&status=eq.queued&select=id,subscriber_id&order=created_at.asc&limit=10`);
  for(const delivery of queued||[]){
    const now=new Date().toISOString();
    const claimed=(await db(`newsletter_campaign_deliveries?id=eq.${encodeURIComponent(delivery.id)}&status=eq.queued`,{method:'PATCH',prefer:'return=representation',body:{status:'processing',attempted_at:now,updated_at:now}}))?.[0];
    if(!claimed)continue;
    const subscriber=(await db(`newsletter_subscribers?id=eq.${encodeURIComponent(delivery.subscriber_id)}&select=id,email,full_name,status,preferences,unsubscribe_token&limit=1`))?.[0];
    if(!subscriber||!validEmail(subscriber.email)||!subscriberWantsTopic(subscriber,campaign.audience_topic)){
      await db(`newsletter_campaign_deliveries?id=eq.${encodeURIComponent(delivery.id)}`,{method:'PATCH',body:{status:'skipped',failure_code:!subscriber?'subscriber_missing':subscriber?.status!=='subscribed'?'unsubscribed':'preference_changed',updated_at:new Date().toISOString()}});continue;
    }
    const email=campaignEmail({campaign,subscriber,origin:requestOrigin(req)});
    const result=await sendEmail({to:subscriber.email,subject:email.subject,html:email.html,text:email.text});
    await db(`newsletter_campaign_deliveries?id=eq.${encodeURIComponent(delivery.id)}`,{method:'PATCH',body:result?.ok?{status:'sent',provider_id:result.data?.id||null,failure_code:null,sent_at:new Date().toISOString(),updated_at:new Date().toISOString()}:{status:'failed',provider_id:null,failure_code:'provider_rejected',updated_at:new Date().toISOString()}});
  }
  const deliveries=await allDeliveries(id),counts=deliveryCounts(deliveries),remaining=counts.queued+counts.processing;
  const terminalStatus=remaining? 'sending' : ((counts.sent+counts.skipped)>0?'sent':'failed');
  const patch={status:terminalStatus,sent_count:counts.sent,failed_count:counts.failed,recipient_count:counts.total,updated_at:new Date().toISOString()};
  if(!remaining)patch.sent_at=new Date().toISOString();
  await db(`newsletter_campaigns?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:patch});
  if(!remaining)await auditLog(req,staff,{action:'newsletter.send.complete',entityType:'newsletter_campaign',entityId:id,summary:`Newsletter send finished: ${counts.sent} sent, ${counts.failed} failed, ${counts.skipped} skipped`,after:{campaign_id:id,...counts,status:terminalStatus}});
  campaign=await campaignById(id);return{campaign,deliveryCounts:counts};
}

async function retryFailed(req,staff,b){
  const id=String(b.campaignId||'');if(!id)fail('Campaign is required.');const campaign=await campaignById(id);if(!campaign)fail('Campaign not found.',404);
  await db(`newsletter_campaign_deliveries?campaign_id=eq.${encodeURIComponent(id)}&status=eq.failed`,{method:'PATCH',body:{status:'queued',failure_code:null,attempted_at:null,updated_at:new Date().toISOString()}});
  await db(`newsletter_campaigns?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:{status:'sending',sent_at:null,updated_at:new Date().toISOString()}});
  await auditLog(req,staff,{action:'newsletter.send.retry',entityType:'newsletter_campaign',entityId:id,summary:'Queued failed newsletter deliveries for retry'});return progress(id);
}

async function deleteDraft(req,staff,b){
  const id=String(b.campaignId||'');const campaign=await campaignById(id);if(!campaign)fail('Campaign not found.',404);if(campaign.status!=='draft')fail('Only drafts can be deleted.');
  await db(`newsletter_campaigns?id=eq.${encodeURIComponent(id)}`,{method:'DELETE'});await auditLog(req,staff,{action:'newsletter.draft.delete',entityType:'newsletter_campaign',entityId:id,summary:'Deleted newsletter draft'});return{ok:true};
}

module.exports=async function(req,res){try{
  const staff=await requireStaff(req,'newsletter');
  if(req.method==='GET')return json(res,200,{ok:true,...await dashboard()});
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
  const b=parseBody(req),action=String(b.action||'');
  if(action==='save_draft')return json(res,200,{ok:true,campaign:await saveDraft(req,staff,b)});
  if(action==='test')return json(res,200,await sendTest(req,staff,b));
  if(action==='start_send')return json(res,200,{ok:true,...await startSend(req,staff,b)});
  if(action==='process_send')return json(res,200,{ok:true,...await processSend(req,staff,b)});
  if(action==='retry_failed')return json(res,200,{ok:true,...await retryFailed(req,staff,b)});
  if(action==='delete_draft')return json(res,200,await deleteDraft(req,staff,b));
  return json(res,400,{ok:false,error:'Unknown newsletter action.'});
}catch(e){return safeError(res,e)}};
