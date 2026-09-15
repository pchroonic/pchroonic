(()=>{
  const VERSION='6.4.33-privacy-centre-1';
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const LABELS={access:'Access my personal information',portability:'Data portability',rectification:'Correct my information',erasure:'Erase information',restriction:'Restrict processing',objection:'Object to processing',marketing:'Marketing choices',other:'Other privacy request'};
  let loaded=false;

  function injectStyles(){if(document.querySelector('link[data-privacy-centre]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href=`/privacy-center.css?v=${VERSION}`;l.dataset.privacyCentre='1';document.head.appendChild(l)}
  function cookieChoice(){try{return localStorage.getItem('namdar_cookie_choice')||''}catch{return''}}
  function cookieLabel(v=cookieChoice()){return v==='marketing'?'Optional advertising allowed':v==='essential'?'Essential only':'No choice saved yet'}
  function saveCookieChoice(choice){try{localStorage.setItem('namdar_cookie_choice',choice);localStorage.setItem('namdar_privacy_choice_meta',JSON.stringify({choice,version:2,updatedAt:new Date().toISOString()}))}catch{}const el=$('#privacyCookieState');if(el)el.textContent=cookieLabel(choice)}
  function statusClass(v=''){return ['completed'].includes(v)?'success':['refused','identity_check'].includes(v)?'warning':''}
  function fmt(v){return v?new Date(v).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—'}
  function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  function install(){
    if($('#privacyPanel'))return;
    injectStyles();
    const tabs=$('.portal-tabs'),securityButton=document.querySelector('[data-portal-tab="securityPanel"]');if(!tabs)return;
    const button=document.createElement('button');button.type='button';button.dataset.portalTab='privacyPanel';button.textContent='Privacy & data';tabs.insertBefore(button,securityButton||null);
    const panel=document.createElement('section');panel.id='privacyPanel';panel.className='portal-panel hidden';panel.innerHTML=`
      <div class="privacy-hero">
        <div class="privacy-hero-card"><div class="eyebrow light">Your information</div><h2>Privacy & data</h2><p>See your privacy choices, download a useful copy of the main data linked to your account, and make a UK data-protection request without having to email Namdar separately.</p><div class="privacy-actions"><button id="privacyDownload" class="primary-btn inverted" type="button">Download my account data</button><a class="ghost-btn" href="/privacy" target="_blank" rel="noopener">Privacy Policy</a><a class="ghost-btn" href="/cookies" target="_blank" rel="noopener">Cookie Policy</a></div></div>
        <div class="privacy-status-card"><small>Response target</small><strong>1 month</strong><span>Most rights requests are answered without undue delay and normally within one month. Identity checks or lawful extensions may apply.</span></div>
      </div>
      <div class="privacy-grid">
        <div class="account-card privacy-form"><h2>Make a privacy request</h2><p>Choose the right you want to exercise. Your signed-in account verifies the account identity for this request.</p><form id="privacyRequestForm"><label>Request type<select id="privacyRequestType">${Object.entries(LABELS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label>Details <span class="optional">(optional)</span><textarea id="privacyRequestDetails" rows="5" maxlength="4000" placeholder="Tell us what information or processing your request relates to."></textarea></label><button id="privacyRequestSubmit" class="primary-btn" type="submit">Submit privacy request</button><small id="privacyRequestStatus"></small></form><p class="admin-note">For full account deletion, use <button class="text-link" id="privacyGoDelete" type="button">Security → Delete my account</button>. Some records may still need to be kept where UK law requires it.</p></div>
        <div class="account-card"><h2>Cookie & marketing choices</h2><div class="cookie-choice-box"><small>Website cookie choice</small><strong id="privacyCookieState">${esc(cookieLabel())}</strong><p>Essential storage supports secure account features. Optional advertising is loaded on the public site only when you allow it.</p><div class="privacy-actions"><button id="privacyCookiesEssential" class="ghost-btn small" type="button">Essential only</button><button id="privacyCookiesMarketing" class="ghost-btn small" type="button">Allow optional advertising</button></div></div><p>Newsletter topics and email marketing can be changed from links in Namdar marketing emails. Service, security, quote, booking, invoice and support messages are not marketing.</p></div>
      </div>
      <div class="account-card"><div class="panel-head"><div><h2>My privacy requests</h2><p>Track requests made from this signed-in account.</p></div><button id="privacyRefresh" class="ghost-btn small" type="button">Refresh</button></div><div id="privacyRequestList"><p>Loading…</p></div></div>`;
    const security=$('#securityPanel');(security?.parentNode||$('#portalSection')).insertBefore(panel,security||null);
    PORTAL_TAB_SLUGS.privacyPanel='privacy';PORTAL_SLUG_PANELS.privacy='privacyPanel';
    button.onclick=async()=>{showPortalPanel('privacyPanel',{updateUrl:true});await loadRequests()};
    $('#privacyRequestForm').onsubmit=submitRequest;$('#privacyRefresh').onclick=loadRequests;$('#privacyDownload').onclick=downloadData;
    $('#privacyCookiesEssential').onclick=()=>saveCookieChoice('essential');$('#privacyCookiesMarketing').onclick=()=>saveCookieChoice('marketing');
    $('#privacyGoDelete').onclick=()=>showPortalPanel('securityPanel',{updateUrl:true});
    if(new URLSearchParams(location.search).get('tab')==='privacy'){showPortalPanel('privacyPanel',{updateUrl:false});loadRequests().catch(()=>{})}
  }

  async function loadRequests(){
    const root=$('#privacyRequestList');if(!root)return;root.innerHTML='<p>Loading privacy requests…</p>';
    try{const d=await api('/api/customer-privacy',{method:'GET'}),rows=d.requests||[];loaded=true;root.innerHTML=rows.length?rows.map(r=>{const overdue=!['completed','refused','cancelled'].includes(r.status)&&new Date(r.dueAt).getTime()<Date.now();return `<article class="privacy-request-card"><div class="privacy-request-head"><div><strong>${esc(LABELS[r.requestType]||r.requestType)}</strong><small>Reference ${esc(String(r.id).slice(0,8).toUpperCase())} · requested ${fmt(r.requestedAt)}</small></div><span class="privacy-chip ${statusClass(r.status)}">${esc(String(r.status||'').replaceAll('_',' '))}</span></div><div class="privacy-request-meta"><span class="privacy-chip">Identity: ${esc(String(r.identityStatus||'').replaceAll('_',' '))}</span><span class="privacy-chip ${overdue?'warning':''}">Target: ${fmt(r.dueAt)}</span></div>${r.responseSummary?`<p><strong>Namdar response</strong><br>${esc(r.responseSummary).replace(/\n/g,'<br>')}</p>`:''}${overdue?'<p class="privacy-due-over">This request has passed its target date. Please contact support@namdar.co.uk if you have not heard from us.</p>':''}</article>`}).join(''):'<div class="crm-empty">You have no privacy requests yet.</div>'}catch(e){root.innerHTML=`<p>${esc(e.message)}</p>`}
  }

  async function submitRequest(e){
    e.preventDefault();const btn=$('#privacyRequestSubmit'),status=$('#privacyRequestStatus');setBusy(btn,true,'Submitting…');status.textContent='';
    try{const d=await api('/api/customer-privacy',{method:'POST',body:JSON.stringify({requestType:$('#privacyRequestType').value,details:$('#privacyRequestDetails').value.trim()})});status.textContent=d.message||'Privacy request recorded.';$('#privacyRequestDetails').value='';await loadRequests()}catch(err){status.textContent=err.message}finally{setBusy(btn,false)}
  }

  async function downloadData(){
    const btn=$('#privacyDownload'),label=btn.textContent;btn.disabled=true;btn.textContent='Preparing data…';
    try{const {data:{session}}=await sb.auth.getSession();if(!session)throw new Error('Please sign in again before downloading your data.');const r=await fetch('/api/customer-data-export',{headers:{Authorization:`Bearer ${session.access_token}`}});if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.error||'Could not prepare your data copy.')}const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`namdar-account-data-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}catch(e){alert(e.message)}finally{btn.disabled=false;btn.textContent=label}
  }

  const start=()=>{try{install()}catch(e){console.warn('Privacy centre setup',e)}};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  setTimeout(()=>{if(!$('#privacyPanel'))start();else if(!loaded&&new URLSearchParams(location.search).get('tab')==='privacy')loadRequests().catch(()=>{})},800);
})();
