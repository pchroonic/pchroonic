(()=>{
  const PANEL_ID='serviceActivationPanel';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label={planned:'Planned',coming_soon:'Coming soon',live:'Live',paused:'Paused',retired:'Retired'};
  let current=[];
  function inject(){
    if(document.getElementById(PANEL_ID))return true;
    const host=document.getElementById('pricing');
    if(!host)return false;
    host.insertAdjacentHTML('afterbegin',`<div class="admin-panel" id="${PANEL_ID}">
      <div class="panel-head"><div><h2>Service launch stages</h2><p>Keep future Namdar services built and ready, but only make them bookable when the business reaches that stage.</p></div><span id="serviceActivationSummary" class="crm-summary">Loading…</span></div>
      <div class="admin-note"><strong>How this works:</strong> Planned services are hidden from customers. Coming soon can be shown without accepting quotes. Live services are public and quotable. Paused blocks new work without deleting the service. Existing accepted quotes and bookings are preserved.</div>
      <div id="serviceActivationList"></div>
      <p id="serviceActivationMessage" class="admin-note" aria-live="polite"></p>
    </div>`);
    return true;
  }
  function message(text=''){const el=document.getElementById('serviceActivationMessage');if(el)el.textContent=text}
  function render(services=[]){
    current=services;
    const live=services.filter(s=>s.status==='live').length;
    const summary=document.getElementById('serviceActivationSummary');if(summary)summary.textContent=`${live} live · ${services.length-live} future/paused`;
    const list=document.getElementById('serviceActivationList');if(!list)return;
    list.innerHTML=`<div class="table-scroll"><table class="admin-table"><thead><tr><th>Stage</th><th>Service</th><th>Status</th><th>Launch readiness</th><th>Action</th></tr></thead><tbody>${services.map(s=>{
      const r=s.readiness||{},ready=r.pricingConfigured&&r.coverageConfigured;
      return `<tr><td>${Number(s.stage_number||0)||'—'}</td><td><strong>${esc(s.name)}</strong><br><small>/${esc(s.slug)}</small></td><td><select data-service-status="${esc(s.service_key)}">${['planned','coming_soon','live','paused','retired'].map(x=>`<option value="${x}"${s.status===x?' selected':''}>${label[x]}</option>`).join('')}</select></td><td><small>Pricing: ${r.pricingConfigured?'✓':'✕'} · Coverage: ${r.coverageConfigured?'✓':'✕'}${r.coverageAreas?.length?`<br>${esc(r.coverageAreas.join(', '))}`:''}</small></td><td><button class="ghost-btn small" data-service-save="${esc(s.service_key)}" type="button"${ready||s.status==='live'?'':' title="Live requires pricing and coverage"'}>Save status</button></td></tr>`;
    }).join('')}</tbody></table></div>`;
    list.querySelectorAll('[data-service-save]').forEach(btn=>btn.onclick=()=>save(btn.dataset.serviceSave));
  }
  async function load(){
    if(!inject()||typeof allowed!=='function'||!allowed('settings'))return;
    try{const d=await api('/api/admin-services');render(d.services||[]);message('')}catch(e){message(e.message)}
  }
  async function save(key){
    const select=document.querySelector(`[data-service-status="${CSS.escape(key)}"]`),status=select?.value;
    const before=current.find(x=>x.service_key===key);
    if(!before||!status||status===before.status){message('No service status change to save.');return}
    if(status==='live'&&!confirm(`Make ${before.name} LIVE now? Customers will be able to see it and request quotes immediately.`)){select.value=before.status;return}
    if(before.status==='live'&&status!=='live'&&!confirm(`${before.name} is live now. Change it to ${label[status]} and stop new quotes? Existing accepted work will remain.`)){select.value=before.status;return}
    message(`Saving ${before.name}…`);
    try{const d=await api('/api/admin-services',{method:'POST',body:JSON.stringify({action:'set-status',serviceKey:key,status})});render(d.services||[]);message(`${before.name} is now ${label[status]}. ✓`)}catch(e){select.value=before.status;message(e.message)}
  }
  document.addEventListener('click',e=>{if(e.target?.matches?.('[data-tab="pricing"]'))setTimeout(load,80)});
  const boot=()=>{inject();setTimeout(()=>{if(document.querySelector('[data-tab="pricing"]')?.classList.contains('active'))load()},500)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
