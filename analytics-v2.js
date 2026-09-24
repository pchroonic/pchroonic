(()=>{
  if(window.NamdarAnalytics)return;

  const SESSION_KEY='namdar_analytics_session_v2';
  const CAMPAIGN_KEY='namdar_analytics_campaign_v2';
  const EVENT_TYPES=new Set([
    'service_viewed','quote_started','postcode_checked','quote_submitted','quote_continue',
    'quote_accepted','quote_declined','booking_started','booking_submitted','checkout_started',
    'payment_confirmed','phone_clicked','email_clicked','support_clicked'
  ]);
  const isProduction=()=>['namdar.co.uk','www.namdar.co.uk'].includes(location.hostname.toLowerCase());
  const privacyChoice=()=>{try{return localStorage.getItem('namdar_cookie_choice')||''}catch{return''}};
  const analyticsAllowed=()=>privacyChoice()!=='essential';
  const marketingAllowed=()=>privacyChoice()==='marketing';
  const safe=(v,max=160)=>String(v||'').trim().slice(0,max);

  function randomId(){
    if(crypto?.randomUUID)return crypto.randomUUID();
    const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
    bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    const h=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  }
  function sessionId(){
    if(!analyticsAllowed())return'';
    try{
      let id=sessionStorage.getItem(SESSION_KEY);
      if(!id){id=randomId();sessionStorage.setItem(SESSION_KEY,id)}
      return id;
    }catch{return randomId()}
  }
  function captureCampaign(){
    if(!marketingAllowed())return {source:'',medium:'',campaign:''};
    try{
      const existing=JSON.parse(sessionStorage.getItem(CAMPAIGN_KEY)||'null');
      if(existing&&typeof existing==='object')return existing;
    }catch{}
    const p=new URLSearchParams(location.search);
    let source=safe(p.get('utm_source'),100),medium=safe(p.get('utm_medium'),100),campaign=safe(p.get('utm_campaign'),160);
    if(!source&&p.has('gclid')){source='google';medium='cpc';campaign=campaign||'Google Ads'}
    if(!source&&p.has('msclkid')){source='bing';medium='cpc';campaign=campaign||'Microsoft Ads'}
    const result={source,medium,campaign};
    try{sessionStorage.setItem(CAMPAIGN_KEY,JSON.stringify(result))}catch{}
    return result;
  }
  function referrerHost(){
    try{return document.referrer?new URL(document.referrer).hostname.toLowerCase():''}catch{return''}
  }
  function send(url,payload){
    if(!isProduction()||!analyticsAllowed())return Promise.resolve({ok:true,recorded:false});
    try{
      return fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true})
        .then(r=>r.json().catch(()=>({ok:r.ok}))).catch(()=>({ok:false}));
    }catch{return Promise.resolve({ok:false})}
  }
  function trackView(){
    if(!analyticsAllowed())return Promise.resolve();
    if(window.__NAMDAR_ANALYTICS_V2_VIEW__)return Promise.resolve();
    window.__NAMDAR_ANALYTICS_V2_VIEW__=true;
    return send('/api/track-view',{
      path:location.pathname||'/',
      referrer:referrerHost(),
      sessionId:sessionId(),
      campaign:captureCampaign()
    });
  }
  function track(eventType,extra={}){
    if(!analyticsAllowed()||!EVENT_TYPES.has(eventType))return Promise.resolve({ok:false});
    return send('/api/funnel-event',{
      eventType,
      visitorId:sessionId(),
      serviceKey:'windows',
      path:location.pathname||'/',
      ...extra
    });
  }
  function once(key,fn){
    const k=`namdar_analytics_once_${key}`;
    try{if(sessionStorage.getItem(k)==='1')return;sessionStorage.setItem(k,'1')}catch{}
    fn();
  }
  function installInteractions(){
    const form=document.querySelector('#quoteForm');
    if(form&&!form.dataset.analyticsV2){
      form.dataset.analyticsV2='1';
      form.addEventListener('focusin',()=>once('quote_started',()=>track('quote_started')),{once:true});
      form.addEventListener('input',()=>once('quote_started',()=>track('quote_started')),{once:true});
    }
    document.addEventListener('change',e=>{
      const service=e.target?.closest?.('input[name="service"]');
      if(service?.checked)track('service_viewed');
    },true);
    document.addEventListener('click',e=>{
      const target=e.target?.closest?.('a,button');
      if(!target)return;
      const href=target.getAttribute?.('href')||'';
      if(/^tel:/i.test(href))track('phone_clicked');
      else if(/^mailto:/i.test(href))track('email_clicked');
      else if(/\/account\?tab=(?:tickets|support)/i.test(href)||target.id==='chatTicket')track('support_clicked');
      if(target.matches?.('[data-service-link]'))track('service_viewed');
      if(target.id==='bookEstimate')track('quote_continue');
      if(target.matches?.('[data-quote-schedule]'))track('booking_started',{quoteId:target.dataset.quoteSchedule||undefined});
      if(target.matches?.('[data-stripe-pay],[data-stripe-pay-full]')){
        const bookingId=target.dataset.stripePay||target.dataset.stripePayFull||undefined;
        track('checkout_started',{bookingId});
      }
    },true);
  }

  async function optOutCurrentSession(){
    let id='';try{id=sessionStorage.getItem(SESSION_KEY)||''}catch{}
    if(id&&isProduction()){
      try{await fetch('/api/analytics-opt-out',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:id}),keepalive:true})}catch{}
    }
    try{sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(CAMPAIGN_KEY);Object.keys(sessionStorage).filter(k=>k.startsWith('namdar_analytics_once_')).forEach(k=>sessionStorage.removeItem(k))}catch{}
    window.__NAMDAR_ANALYTICS_V2_VIEW__=false;
  }
  function installPrivacyChoiceHooks(){
    const essential=document.querySelector('#essentialOnly');
    if(essential&&!essential.dataset.analyticsV2){essential.dataset.analyticsV2='1';essential.addEventListener('click',()=>{optOutCurrentSession().catch(()=>{})},{capture:true})}
    const marketing=document.querySelector('#allowMarketing');
    if(marketing&&!marketing.dataset.analyticsV2){marketing.dataset.analyticsV2='1';marketing.addEventListener('click',()=>{setTimeout(()=>{captureCampaign();trackView()},0)},{capture:true})}
  }

  window.NamdarAnalytics={
    version:'6.4.50-analytics-v2-1',
    sessionId:sessionId(),
    campaign:captureCampaign(),
    trackView,
    track,
    optOutCurrentSession
  };

  const init=()=>{trackView();installInteractions();installPrivacyChoiceHooks()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();