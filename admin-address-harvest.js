(()=>{
  const PANEL_ID='addressHarvestPanel';
  const escH=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const when=v=>v?new Date(v).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'—';
  const yesNo=v=>v?'Allowed':'Blocked';
  function inject(){
    if(document.getElementById(PANEL_ID))return true;
    const anchor=document.getElementById('masterAddressPostcode')?.closest('.admin-panel');
    if(!anchor)return false;
    anchor.insertAdjacentHTML('beforebegin',`<div class="admin-panel" id="${PANEL_ID}">
      <div class="panel-head"><div><h2>Address data sources & growth</h2><p>Namdar tracks provider rights before address data can be automated, exported or used in a future paid data product. Restricted sources remain available only for the uses their licence permits.</p></div><span id="harvestState" class="crm-summary">Loading…</span></div>
      <div class="stat-grid"><div class="stat-card"><small>Provider-cache rows</small><strong id="harvestTotal">—</strong></div><div class="stat-card"><small>Today used</small><strong id="harvestUsed">—</strong></div><div class="stat-card"><small>Today remaining</small><strong id="harvestRemaining">—</strong></div><div class="stat-card"><small>Covered-area queue</small><strong id="harvestServiceQueue">—</strong></div><div class="stat-card"><small>Last success</small><strong id="harvestLast">—</strong></div></div>
      <div id="addressRights" class="admin-note"><strong>Data-rights check:</strong> Loading…</div>
      <div class="admin-form-grid"><label>Automatic provider harvest<select id="harvestEnabled"><option value="false">Off</option><option value="true">On</option></select></label><label>Prioritise active service areas<select id="harvestPrioritize"><option value="true">On — recommended</option><option value="false">Off</option></select></label><label>Maximum postcode lookups per day<input id="harvestCap" type="number" min="1" max="20" step="1" value="20"></label><label>Manual run postcode limit<input id="harvestRunLimit" type="number" min="1" max="20" step="1" value="1"></label></div>
      <div class="admin-note"><strong>Commercial architecture:</strong> only sources explicitly marked for commercial redistribution and subscription API use can enter Namdar's future distributable dataset. Provider-restricted and share-alike sources stay separated by provenance.</div>
      <div class="admin-actions"><button id="harvestSave" class="primary-btn" type="button">Save safe settings</button><button id="harvestRun" class="ghost-btn" type="button">Run provider harvest</button><button id="harvestRefresh" class="ghost-btn" type="button">Refresh</button><button id="harvestDownloadCsv" class="ghost-btn" type="button">Download provider CSV</button><button id="harvestDownloadJson" class="ghost-btn" type="button">Download provider JSON</button></div>
      <p id="harvestConfig" class="admin-note"></p><p id="harvestPriorityInfo" class="admin-note"></p><p id="harvestMessage" class="admin-note" aria-live="polite"></p><div id="harvestRuns"></div>
    </div>`);
    document.getElementById('harvestSave').onclick=save;
    document.getElementById('harvestRun').onclick=runNow;
    document.getElementById('harvestRefresh').onclick=load;
    document.getElementById('harvestDownloadCsv').onclick=()=>download('/api/admin-address-harvest-export?format=csv','namdar-addresses.csv');
    document.getElementById('harvestDownloadJson').onclick=()=>download('/api/admin-address-harvest-export?format=json','namdar-addresses.json');
    return true;
  }
  function message(text=''){const el=document.getElementById('harvestMessage');if(el)el.textContent=text}
  async function download(url,fallback){
    message('Preparing secure download…');
    try{
      const {data:{session}}=await sb.auth.getSession();
      const r=await fetch(url,{headers:{Authorization:`Bearer ${session?.access_token||''}`}});
      if(!r.ok){let text=await r.text();try{text=JSON.parse(text).error||text}catch{}throw new Error(text||`Download failed (${r.status})`)}
      const blob=await r.blob(),a=document.createElement('a');a.href=URL.createObjectURL(blob);
      const cd=r.headers.get('content-disposition')||'',m=cd.match(/filename="([^"]+)"/i);a.download=m?.[1]||fallback;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);message('Download ready ✓');
    }catch(e){message(e.message)}
  }
  function applyRights(c={}){
    const auto=c.automatedBulkIngestAllowed===true,bulk=c.bulkExportAllowed===true;
    const enabled=document.getElementById('harvestEnabled'),run=document.getElementById('harvestRun');
    const csv=document.getElementById('harvestDownloadCsv'),json=document.getElementById('harvestDownloadJson');
    if(!auto&&enabled){enabled.value='false';enabled.disabled=true}else if(enabled)enabled.disabled=false;
    if(run)run.disabled=!auto;
    if(csv)csv.disabled=!bulk;
    if(json)json.disabled=!bulk;
    const rights=document.getElementById('addressRights');
    if(rights)rights.innerHTML=`<strong>Data-rights check:</strong> ${escH(c.provider||'Source')} · ${escH(c.licenceName||c.licenceCategory||'unreviewed')}<br><small>Operational use: ${yesNo(c.operationalUseAllowed)} · Human input required: ${c.humanInputRequired?'Yes':'No'} · Automated ingestion: ${yesNo(auto)} · Paid subscription API: ${yesNo(c.subscriptionApiAllowed)} · Commercial redistribution: ${yesNo(c.commercialRedistributionAllowed)} · Bulk export: ${yesNo(bulk)}${c.blockedReason?`<br>Protection active: ${escH(c.blockedReason)}`:''}${c.termsReference?`<br>Terms: ${escH(c.termsReference)}`:''}</small>`;
    return{auto,bulk};
  }
  function render(d){
    const s=d.settings||{},dataset=d.dataset||{},provider=d.providerUsage,p=d.priority||{},c=d.compliance||{};
    const rights=applyRights(c);
    document.getElementById('harvestEnabled').value=rights.auto&&s.enabled?'true':'false';
    document.getElementById('harvestPrioritize').value=s.prioritize_service_areas===false?'false':'true';
    document.getElementById('harvestCap').value=s.daily_lookup_cap||20;
    const manualLimit=document.getElementById('harvestRunLimit');
    if(manualLimit){manualLimit.max=String(Math.max(1,Math.min(20,Number(s.daily_lookup_cap||20))));manualLimit.disabled=!rights.auto}
    document.getElementById('harvestState').textContent=rights.auto?(s.enabled?'Automatic: ON':'Automatic: OFF'):'Automation: RIGHTS BLOCKED';
    document.getElementById('harvestTotal').textContent=Number(dataset.row_count||0).toLocaleString('en-GB');
    const providerUsed=provider?.usageToday,localUsed=Number(d.localUsedToday||0),used=Number.isFinite(providerUsed)?providerUsed:localUsed;
    document.getElementById('harvestUsed').textContent=used;
    const remaining=provider&&Number.isFinite(provider.dailyLimit)?Math.max(0,provider.dailyLimit-provider.usageToday):Number(d.localRemainingToday||0);
    document.getElementById('harvestRemaining').textContent=remaining;
    document.getElementById('harvestServiceQueue').textContent=Number(p.pendingServicePostcodes||0).toLocaleString('en-GB');
    document.getElementById('harvestLast').textContent=s.last_success_at?new Date(s.last_success_at).toLocaleDateString('en-GB'):'—';
    document.getElementById('harvestConfig').textContent=`GetAddress key: ${d.apiKeyConfigured?'configured':'not configured'} · Usage key: ${d.adminKeyConfigured?'configured':'optional / not configured'} · Daily cap: ${s.daily_lookup_cap||20} · Last run: ${when(s.last_run_at)}${s.last_error?` · Last issue: ${s.last_error}`:''}`;
    const areas=(p.activeAreas||[]).join(', ');
    document.getElementById('harvestPriorityInfo').textContent=`Service-area priority: ${p.enabled?'ON':'OFF'}${areas?` · Active coverage: ${areas}`:''} · Covered postcodes harvested: ${Number(p.harvestedServicePostcodes||0).toLocaleString('en-GB')} · Covered addresses saved: ${Number(p.harvestedServiceAddresses||0).toLocaleString('en-GB')}`;
    const runs=d.runs||[];
    document.getElementById('harvestRuns').innerHTML=runs.length?`<div class="table-scroll"><table class="admin-table"><thead><tr><th>Run</th><th>Status</th><th>Lookups</th><th>Postcodes</th><th>Addresses</th><th>Covered area</th><th>Backup</th></tr></thead><tbody>${runs.map(r=>`<tr><td>${when(r.started_at)}<br><small>${escH(r.trigger)}</small></td><td>${escH(r.status)}${r.error_text?`<br><small>${escH(r.error_text)}</small>`:''}</td><td>${Number(r.lookups_succeeded||0)} / ${Number(r.lookups_attempted||0)}</td><td>${Number(r.postcodes_harvested||0)}</td><td>${Number(r.addresses_collected||0)}</td><td>${Number(r.service_area_postcodes_harvested||0)} postcodes<br><small>${Number(r.service_area_addresses_collected||0)} addresses</small></td><td>${rights.bulk&&r.backup_csv_path?`<button class="text-action" data-harvest-backup="${escH(r.backup_csv_path)}">CSV</button>`:'—'} ${rights.bulk&&r.backup_json_path?`<button class="text-action" data-harvest-backup="${escH(r.backup_json_path)}">JSON</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<p>No provider harvest runs yet.</p>';
    document.querySelectorAll('[data-harvest-backup]').forEach(b=>b.onclick=()=>download(`/api/admin-address-harvest-export?path=${encodeURIComponent(b.dataset.harvestBackup)}`,'namdar-address-backup'));
  }
  async function load(){
    if(!inject()||typeof allowed!=='function'||!allowed('settings'))return;
    try{const d=await api('/api/admin-address-harvest');render(d);message('')}catch(e){message(e.message)}
  }
  async function save(){
    const btn=document.getElementById('harvestSave');btn.disabled=true;message('Saving…');
    try{const enabled=document.getElementById('harvestEnabled');const d=await api('/api/admin-address-harvest',{method:'POST',body:JSON.stringify({action:'settings',enabled:!enabled.disabled&&enabled.value==='true',prioritizeServiceAreas:document.getElementById('harvestPrioritize').value==='true',dailyLookupCap:Number(document.getElementById('harvestCap').value)})});render(d);message('Safe settings saved ✓')}catch(e){message(e.message)}finally{btn.disabled=false}
  }
  async function runNow(){
    const btn=document.getElementById('harvestRun');if(btn.disabled){message('Provider automation is blocked by the current data-rights policy.');return}
    const input=document.getElementById('harvestRunLimit'),limit=Math.round(Number(input?.value||1)),max=Math.max(1,Number(input?.max||20));
    if(!Number.isFinite(limit)||limit<1||limit>max){message(`Manual run limit must be between 1 and ${max}.`);input?.focus();return}
    if(!confirm(`Run the permitted address process now for up to ${limit} postcode${limit===1?'':'s'}?`))return;
    btn.disabled=true;message(`Processing up to ${limit} postcode${limit===1?'':'s'}…`);
    try{const d=await api('/api/admin-address-harvest',{method:'POST',body:JSON.stringify({action:'run-now',limit})});render(d);const r=d.result||{};message(r.skipped?`Skipped: ${r.error||r.reason||'not permitted'}`:`Run ${r.status||'finished'} · ${r.postcodesHarvested||0} postcodes · ${r.addressesCollected||0} addresses`)}catch(e){message(e.message)}finally{btn.disabled=false}
  }
  document.addEventListener('click',e=>{if(e.target?.matches?.('[data-tab="areas"]'))setTimeout(load,80)});
  const boot=()=>{inject();setTimeout(()=>{if(document.querySelector('[data-tab="areas"]')?.classList.contains('active'))load()},500)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();