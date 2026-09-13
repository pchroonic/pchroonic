const TOPICS=new Set(['all','offers','tips','news']);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));

function topic(value='all'){const v=String(value||'all').toLowerCase();return TOPICS.has(v)?v:'all'}
function validEmail(value=''){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||'').trim())}
function safeCampaignUrl(value='',origin='https://namdar.co.uk'){
  const raw=String(value||'').trim();if(!raw)return'';
  try{const u=new URL(raw,origin);if(u.protocol!=='https:')return'';return u.href}catch{return''}
}
function subscriberWantsTopic(subscriber={},audience='all'){
  if(subscriber.status!=='subscribed')return false;
  const t=topic(audience);if(t==='all')return true;
  const prefs=subscriber.preferences&&typeof subscriber.preferences==='object'?subscriber.preferences:{};
  return prefs[t]!==false;
}
function paragraphs(text=''){
  return String(text||'').trim().split(/\n{2,}/).filter(Boolean).map(p=>`<p style="margin:0 0 16px">${escapeHtml(p).replace(/\n/g,'<br>')}</p>`).join('');
}
function cleanCampaignInput(input={},origin='https://namdar.co.uk'){
  const subject=String(input.subject||'').trim().slice(0,160);
  const preheader=String(input.preheader||'').trim().slice(0,240);
  const bodyText=String(input.bodyText??input.body??'').trim().slice(0,20000);
  const ctaLabel=String(input.ctaLabel||'').trim().slice(0,80);
  const ctaUrl=safeCampaignUrl(input.ctaUrl||'',origin);
  const audienceTopic=topic(input.audienceTopic||'all');
  if(!subject||!bodyText){const e=new Error('Subject and message are required.');e.status=400;throw e}
  if((ctaLabel&&!ctaUrl)||(!ctaLabel&&String(input.ctaUrl||'').trim())){const e=new Error('Add both a valid HTTPS button link and button label, or leave both blank.');e.status=400;throw e}
  return{subject,preheader:preheader||null,bodyText,bodyHtml:paragraphs(bodyText),ctaLabel:ctaLabel||null,ctaUrl:ctaUrl||null,audienceTopic};
}
function campaignEmail({campaign={},subscriber={},origin='https://namdar.co.uk',test=false}={}){
  const subject=String(campaign.subject||'Namdar update');
  const preheader=String(campaign.preheader||'').trim();
  const name=String(subscriber.full_name||'').trim().split(/\s+/)[0]||'';
  const greeting=name?`Hi ${escapeHtml(name)},`:'Hello,';
  const ctaUrl=safeCampaignUrl(campaign.cta_url||campaign.ctaUrl||'',origin);
  const ctaLabel=String(campaign.cta_label||campaign.ctaLabel||'').trim();
  const token=String(subscriber.unsubscribe_token||'');
  const manage=token?`${origin}/unsubscribe?token=${encodeURIComponent(token)}`:'';
  const unsub=token?`${origin}/unsubscribe?token=${encodeURIComponent(token)}&action=unsubscribe`:'';
  const hidden=preheader?`<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}</div>`:'';
  const cta=ctaUrl&&ctaLabel?`<p style="margin:24px 0"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#173c32;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">${escapeHtml(ctaLabel)}</a></p>`:'';
  const footer=test?'<p style="font-size:12px;color:#68736f;margin:0">This is a Namdar newsletter test email. No subscriber record was changed.</p>':`<p style="font-size:12px;color:#68736f;margin:0">You received this because you subscribed to Namdar marketing updates.${manage?` <a href="${escapeHtml(manage)}">Manage preferences</a>`:''}${unsub?` · <a href="${escapeHtml(unsub)}">Unsubscribe</a>`:''}</p>`;
  const html=`<!doctype html><html><body style="margin:0;background:#f4f5ef;font-family:Arial,Helvetica,sans-serif;color:#0d1715">${hidden}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f5ef;padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#fff;border-radius:20px;overflow:hidden"><tr><td style="background:#173c32;padding:22px 28px;color:#fff"><strong style="font-size:18px;letter-spacing:.16em">NAMDAR</strong></td></tr><tr><td style="padding:30px 28px;font-size:15px;line-height:1.65"><p style="margin:0 0 16px">${greeting}</p>${paragraphs(campaign.body_text||campaign.bodyText||'')}${cta}</td></tr><tr><td style="padding:20px 28px;border-top:1px solid #e2e6df">${footer}</td></tr></table></td></tr></table></body></html>`;
  const plain=[greeting,'',String(campaign.body_text||campaign.bodyText||'').trim(),ctaUrl&&ctaLabel?`\n${ctaLabel}: ${ctaUrl}`:'',test?'\nThis is a Namdar newsletter test email.':manage?`\nManage preferences: ${manage}\nUnsubscribe: ${unsub}`:''].filter(Boolean).join('\n');
  return{subject:test?`[TEST] ${subject}`:subject,html,text:plain};
}
function deliveryCounts(rows=[]){const out={queued:0,processing:0,sent:0,failed:0,skipped:0,total:0};for(const row of rows||[]){if(out[row.status]!==undefined)out[row.status]++;out.total++}return out}

module.exports={TOPICS,topic,validEmail,safeCampaignUrl,subscriberWantsTopic,cleanCampaignInput,campaignEmail,deliveryCounts};
