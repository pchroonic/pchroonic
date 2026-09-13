const {escapeHtml}=require('./server');

const TOPICS=['offers','tips','news'];
const TOPIC_LABELS={all:'All subscribers',offers:'Offers & seasonal savings',tips:'Property-care tips',news:'Namdar service news'};

function normalizeTopic(value='all'){
  const topic=String(value||'all').trim().toLowerCase();
  return topic==='all'||TOPICS.includes(topic)?topic:'all';
}

function normalizePreferences(value){
  const input=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  return Object.fromEntries(TOPICS.map(key=>[key,input[key]!==false]));
}

function subscriberWantsTopic(subscriber={},topic='all'){
  const key=normalizeTopic(topic);
  if(key==='all')return true;
  return normalizePreferences(subscriber.preferences)[key]===true;
}

function cleanText(value='',max=20000){return String(value||'').trim().slice(0,max)}
function firstName(value=''){return cleanText(value,120).split(/\s+/).filter(Boolean)[0]||''}

function safeCampaignUrl(value='',origin='https://namdar.co.uk'){
  const raw=cleanText(value,1000);if(!raw)return'';
  try{
    const base=new URL(origin);
    const url=new URL(raw,base);
    if(url.protocol!=='https:'&&url.origin!==base.origin)return'';
    return url.href;
  }catch{return''}
}

function textToHtml(value=''){
  return cleanText(value,20000).split(/\n{2,}/).filter(Boolean).map(p=>`<p style="margin:0 0 18px">${escapeHtml(p).replace(/\n/g,'<br>')}</p>`).join('');
}

function buildCampaignMessage(campaign={},subscriber={},options={}){
  const origin=options.origin||'https://namdar.co.uk';
  const unsubscribeUrl=options.unsubscribeUrl||'';
  const name=firstName(subscriber.full_name||'');
  const preheader=cleanText(campaign.preheader,220);
  const body=cleanText(campaign.body_text||campaign.body_html,20000);
  const ctaLabel=cleanText(campaign.cta_label,80);
  const ctaUrl=safeCampaignUrl(campaign.cta_url,origin);
  const greeting=name?`<p style="margin:0 0 18px">Hi ${escapeHtml(name)},</p>`:'';
  const preheaderHtml=preheader?`<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${escapeHtml(preheader)}</span>`:'';
  const cta=(ctaLabel&&ctaUrl)?`<p style="margin:26px 0"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#173c32;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">${escapeHtml(ctaLabel)}</a></p>`:'';
  const footer=unsubscribeUrl?`<hr style="border:0;border-top:1px solid #e2e6df;margin:28px 0 18px"><p style="font-size:12px;color:#68736f;line-height:1.55">You are receiving this because you chose to receive Namdar marketing emails. <a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe or change your email preference</a>.</p>`:'';
  const html=`${preheaderHtml}${greeting}${textToHtml(body)}${cta}${footer}`;
  const text=[name?`Hi ${name},`:null,body,(ctaLabel&&ctaUrl)?`${ctaLabel}: ${ctaUrl}`:null,unsubscribeUrl?`Unsubscribe: ${unsubscribeUrl}`:null].filter(Boolean).join('\n\n');
  return{html,text,ctaUrl};
}

function confirmationMessage({name='',confirmUrl=''}){
  const first=firstName(name),hello=first?`Hi ${escapeHtml(first)},`:'Hello,';
  const html=`<p>${hello}</p><h2>Confirm your Namdar updates</h2><p>Please confirm that you want occasional Namdar offers, property-care tips and service news.</p><p><a href="${escapeHtml(confirmUrl)}" style="display:inline-block;background:#173c32;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Confirm subscription</a></p><p style="font-size:13px;color:#68736f">If you did not request this, you can ignore this email. You will not be added to the marketing list unless you confirm.</p>`;
  const text=`${first?`Hi ${first}`:'Hello'},\n\nConfirm your Namdar updates: ${confirmUrl}\n\nIf you did not request this, ignore this email.`;
  return{html,text};
}

function welcomeMessage({name='',preferences={}}){
  const first=firstName(name),selected=TOPICS.filter(k=>normalizePreferences(preferences)[k]).map(k=>TOPIC_LABELS[k]).join(', ');
  return{html:`${first?`<p>Hi ${escapeHtml(first)},</p>`:''}<h2>You're subscribed to Namdar updates</h2><p>Thanks for confirming. We'll keep emails useful and occasional.</p><p><strong>Your selected updates:</strong> ${escapeHtml(selected||'Namdar updates')}</p><p>You can unsubscribe at any time from the link in every marketing email.</p>`,text:`You're subscribed to Namdar updates. Selected updates: ${selected||'Namdar updates'}. You can unsubscribe at any time.`};
}

module.exports={TOPICS,TOPIC_LABELS,normalizeTopic,normalizePreferences,subscriberWantsTopic,safeCampaignUrl,buildCampaignMessage,confirmationMessage,welcomeMessage};
