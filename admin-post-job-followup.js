(()=>{
  const VERSION='6.4.43-google-reviews-1';
  let client=null,editable=false,currentDays=90;
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=v=>v?new Date(v).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—';
  async function api(path,options={}){
    if(!client){const r=await fetch('/api/config',{cache:'no-store'}),c=await r.json();if(!r.ok||!c.ok)throw new Error(c.error||'Could not load admin configuration.');client=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}})}
    const {data:{session}}=await client.auth.getSession();if(!session?.access_token)throw new Error('Please sign in to Namdar Admin again.');
    const headers={'Content-Type':'application/json',...(options.headers||{}),Authorization:`Bearer ${session.access_token}`};
    const r=await fetch(path,{...options,headers}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Request failed (${r.status})`);return d;
  }
  function panel(){
    const tab=document.getElementById('bookings');if(!tab||document.getElementById('reviewSettingsPanel'))return null;
    const el=document.createElement('div');el.id='reviewSettingsPanel';el.className='admin-panel';
    el.innerHTML=`<div class="panel-head"><div><h2>Google reviews & post-job feedback</h2><p>Invite every completed customer to leave honest feedback. Public Google reviews are never gated by a private rating, and Namdar never offers rewards for reviews.</p></div><span id="reviewSettingsSummary" class="crm-summary">Loading…</span></div>
      <div class="review-settings-grid">
        <label>Google Business Profile review link<input id="publicReviewUrl" type="url" inputmode="url" placeholder="https://..." autocomplete="off"></label>
        <label class="review-toggle"><input id="reviewRequestsEnabled" type="checkbox"><span><strong>Public review requests</strong><small>Show/send the Google review option to completed customers.</small></span></label>
        <label class="review-toggle"><input id="reviewRemindersEnabled" type="checkbox"><span><strong>One reminder</strong><small>Only if the customer has not submitted private feedback or clicked Google review.</small></span></label>
        <label>Reminder timing<select id="reviewReminderDays"><option value="3">3 days</option><option value="5">5 days</option><option value="7">7 days</option><option value="10">10 days</option><option value="14">14 days</option></select></label>
      </div>
      <p class="muted">Paste the official review-request link from your Google Business Profile. Leave the link blank, or switch public requests off, to keep Google review requests disabled.</p>
      <div id="reviewDisabledNote" class="review-disabled-note hidden">Google review requests are currently off. Private post-job feedback still remains available.</div>
      <div class="review-preview"><strong>Customer message preview</strong><p>“Thank you for choosing Namdar. We welcome honest feedback from every completed customer. You can tell Namdar privately, or share your experience publicly on Google.”</p><p id="reviewReminderPreview">The optional reminder is off.</p></div>
      <div class="admin-actions"><button id="reviewSettingsSave" class="primary-btn small" type="button">Save review settings</button><small id="reviewSettingsStatus" class="review-settings-status"></small></div>
      <div class="review-dashboard">
        <div class="review-history-head"><div><h3>Review performance</h3><p class="muted">Tracked from completed Namdar jobs and the existing private-feedback record.</p></div><label class="review-period">Period<select id="reviewPeriod"><option value="30">30 days</option><option value="90" selected>90 days</option><option value="365">12 months</option></select></label></div>
        <div id="reviewMetrics" class="review-metrics"><div class="review-empty">Loading review performance…</div></div>
        <div><h3>Recent completed-job review history</h3><div id="reviewHistory" class="review-history-wrap"><div class="review-empty">Loading…</div></div></div>
      </div>`;
    const ops=document.getElementById('bookingOpsPanel');if(ops?.parentNode)ops.insertAdjacentElement('afterend',el);else tab.insertBefore(el,tab.firstElementChild);return el;
  }
  function syncControls(){
    const enabled=document.getElementById('reviewRequestsEnabled').checked,reminders=document.getElementById('reviewRemindersEnabled');
    document.getElementById('publicReviewUrl').disabled=!editable;
    document.getElementById('reviewRequestsEnabled').disabled=!editable;
    reminders.disabled=!editable||!enabled;if(!enabled)reminders.checked=false;
    document.getElementById('reviewReminderDays').disabled=!editable||!enabled||!reminders.checked;
    document.getElementById('reviewSettingsSave').disabled=!editable;
    document.getElementById('reviewDisabledNote').classList.toggle('hidden',enabled);
    document.getElementById('reviewReminderPreview').textContent=enabled&&reminders.checked?`If there is no interaction, Namdar sends one polite reminder after ${document.getElementById('reviewReminderDays').value} days. No further automatic Google-review reminders are sent.`:'The optional reminder is off.';
  }
  function renderSettings(d){
    editable=!!d.canEdit;
    document.getElementById('publicReviewUrl').value=d.publicReviewUrl||'';
    document.getElementById('reviewRequestsEnabled').checked=!!d.reviewRequestsEnabled;
    document.getElementById('reviewRemindersEnabled').checked=!!d.remindersEnabled;
    const days=String(d.reminderDelayDays||7),select=document.getElementById('reviewReminderDays');if([...select.options].some(o=>o.value===days))select.value=days;else select.value='7';
    document.getElementById('reviewSettingsSummary').textContent=d.reviewRequestsEnabled?(d.remindersEnabled?'Google reviews + one reminder':'Google reviews enabled'):(d.publicReviewUrl?'Google reviews paused':'Private feedback only');
    const status=document.getElementById('reviewSettingsStatus');if(!editable)status.textContent='View only · Settings permission is required to change review controls.';syncControls();
  }
  function metric(label,value,note='',attention=false){return `<div class="review-metric${attention?' attention':''}"><small>${esc(label)}</small><strong>${esc(value)}</strong>${note?`<span>${esc(note)}</span>`:''}</div>`}
  function renderDashboard(d){
    const m=d.metrics||{};
    document.getElementById('reviewMetrics').innerHTML=[
      metric('Completed jobs',m.completedJobs||0,`${d.days} day period`),
      metric('Review requests sent',m.reviewRequests||0,'Tracked email requests'),
      metric('Google clicks',m.googleClicks||0,`${m.clickThroughRate||0}% tracked email CTR`),
      metric('Private feedback',m.privateFeedback||0,`${m.feedbackRate||0}% response rate`),
      metric('Average private rating',m.averagePrivateRating==null?'—':`${m.averagePrivateRating}/5`,`${m.remindersSent||0} reminder${Number(m.remindersSent||0)===1?'':'s'} sent`),
      metric('Needs attention',m.needsAttention||0,'Open low/private feedback',Number(m.needsAttention||0)>0)
    ].join('');
    const rows=d.recent||[];if(!rows.length){document.getElementById('reviewHistory').innerHTML='<div class="review-empty">No completed jobs in this period yet.</div>';return}
    document.getElementById('reviewHistory').innerHTML=`<table class="review-history"><thead><tr><th>Customer</th><th>Completed</th><th>Private feedback</th><th>Google request</th><th>Google click</th><th>Reminder</th></tr></thead><tbody>${rows.map(row=>{
      const feedback=row.feedbackSubmittedAt?`<span class="review-state ${row.feedbackStatus==='needs_attention'?'attention':'yes'}">${row.rating==null?'Submitted':`${row.rating}/5`}</span>`:'<span class="review-state">Not submitted</span>';
      return `<tr><td><strong>${esc(row.customerName||'Customer')}</strong><small>${esc(row.service||'')}</small><small>${esc(row.postcode||'')}${row.email?` · ${esc(row.email)}`:''}</small></td><td>${esc(date(row.completedAt))}</td><td>${feedback}</td><td>${row.reviewRequestedAt?`<span class="review-state yes">Sent</span><small>${esc(date(row.reviewRequestedAt))}</small>`:'<span class="review-state">—</span>'}</td><td>${row.reviewClickedAt?`<span class="review-state yes">Clicked</span><small>${esc(date(row.reviewClickedAt))}</small>`:'<span class="review-state">—</span>'}</td><td>${row.reviewReminderSentAt?`<span class="review-state yes">Sent once</span><small>${esc(date(row.reviewReminderSentAt))}</small>`:'<span class="review-state">—</span>'}</td></tr>`
    }).join('')}</tbody></table>`;
  }
  async function loadSettings(){try{renderSettings(await api('/api/admin-review-settings'))}catch(e){document.getElementById('reviewSettingsSummary').textContent='Unavailable';document.getElementById('reviewSettingsStatus').textContent=e.message}}
  async function loadDashboard(){const box=document.getElementById('reviewMetrics');try{const d=await api(`/api/admin-review-dashboard?days=${encodeURIComponent(currentDays)}`);renderDashboard(d)}catch(e){box.innerHTML=`<div class="review-empty">${esc(e.message)}</div>`;document.getElementById('reviewHistory').innerHTML='<div class="review-empty">Review history is unavailable.</div>'}}
  async function save(){
    if(!editable)return;const btn=document.getElementById('reviewSettingsSave'),status=document.getElementById('reviewSettingsStatus');btn.disabled=true;status.textContent='Saving…';
    try{const d=await api('/api/admin-review-settings',{method:'POST',body:JSON.stringify({publicReviewUrl:document.getElementById('publicReviewUrl').value.trim(),reviewRequestsEnabled:document.getElementById('reviewRequestsEnabled').checked,remindersEnabled:document.getElementById('reviewRemindersEnabled').checked,reminderDelayDays:Number(document.getElementById('reviewReminderDays').value)})});renderSettings(d);status.textContent=d.reviewRequestsEnabled?'Google review settings saved ✓':'Public Google review requests disabled ✓';await loadDashboard()}
    catch(e){status.textContent=e.message}finally{btn.disabled=!editable}
  }
  function boot(){
    if(!window.supabase?.createClient)return setTimeout(boot,200);if(!panel())return;
    document.getElementById('reviewSettingsSave').addEventListener('click',save);
    ['reviewRequestsEnabled','reviewRemindersEnabled','reviewReminderDays'].forEach(id=>document.getElementById(id).addEventListener('change',syncControls));
    document.getElementById('reviewPeriod').addEventListener('change',e=>{currentDays=Number(e.target.value)||90;loadDashboard()});
    Promise.all([loadSettings(),loadDashboard()]);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.NamdarReviewDashboard={version:VERSION,refresh:loadDashboard};
})();
