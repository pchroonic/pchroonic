(()=>{
  const DAYS=[['0','Sun'],['1','Mon'],['2','Tue'],['3','Wed'],['4','Thu'],['5','Fri'],['6','Sat']];
  const WINDOWS=[['08-11','08:00–11:00'],['11-14','11:00–14:00'],['14-17','14:00–17:00']];
  let client=null;
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function api(path,options={}){
    if(!client){const r=await fetch('/api/config',{cache:'no-store'}),c=await r.json();if(!r.ok||!c.ok)throw new Error(c.error||'Could not load admin configuration.');client=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}})}
    const {data:{session}}=await client.auth.getSession();if(!session?.access_token)throw new Error('Please sign in to Namdar Admin again.');
    const headers={'Content-Type':'application/json',...(options.headers||{}),Authorization:`Bearer ${session.access_token}`};
    const r=await fetch(path,{...options,headers}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Request failed (${r.status})`);return d;
  }
  function panel(){
    const tab=document.getElementById('bookings');if(!tab||document.getElementById('bookingOpsPanel'))return null;
    const el=document.createElement('div');el.id='bookingOpsPanel';el.className='admin-panel';el.innerHTML=`<div class="panel-head"><div><h2>Booking operations</h2><p>Control which appointments customers can request. Route density keeps an operating day in one postcode area (SE or SW) once its first booking is placed.</p></div><span class="crm-summary" id="bookingOpsSummary">Loading…</span></div>
      <div class="crm-toolbar booking-ops-toolbar">
        <label>Booking horizon<input id="bookingOpsHorizon" type="number" min="7" max="21" step="1"></label>
        <label>Minimum notice (hours)<input id="bookingOpsNotice" type="number" min="0" max="168" step="1"></label>
        <label>Max jobs per day<input id="bookingOpsCapacity" type="number" min="1" max="12" step="1"></label>
        <label class="consent"><input id="bookingOpsRoute" type="checkbox"><span>Keep each day within one SE/SW route zone</span></label>
      </div>
      <div class="report-grid two"><div><strong>Operating days</strong><div id="bookingOpsDays" class="choice-grid compact-choice-grid">${DAYS.map(([v,l])=>`<label><input type="checkbox" value="${v}"><span>${l}</span></label>`).join('')}</div></div><div><strong>Customer booking windows</strong><div id="bookingOpsWindows" class="choice-grid compact-choice-grid">${WINDOWS.map(([v,l])=>`<label><input type="checkbox" value="${v}"><span>${l}</span></label>`).join('')}</div></div></div>
      <div class="admin-actions" style="margin-top:14px"><button id="bookingOpsSave" class="primary-btn small" type="button">Save booking rules</button><small id="bookingOpsStatus"></small></div>
      <div style="margin-top:18px"><div class="panel-head"><div><h3>Next 14 days</h3><p>Booked load and the route zone already established by pending/confirmed jobs.</p></div></div><div id="bookingOpsPreview" class="report-bars"></div></div>`;
    tab.insertBefore(el,tab.firstElementChild);return el;
  }
  function render(d){
    document.getElementById('bookingOpsHorizon').value=d.rules.horizonDays;
    document.getElementById('bookingOpsNotice').value=d.rules.minimumNoticeHours;
    document.getElementById('bookingOpsCapacity').value=d.rules.maxJobsPerDay;
    document.getElementById('bookingOpsRoute').checked=!!d.rules.routeDensityEnabled;
    document.querySelectorAll('#bookingOpsDays input').forEach(x=>x.checked=d.rules.operatingDays.includes(Number(x.value)));
    document.querySelectorAll('#bookingOpsWindows input').forEach(x=>x.checked=d.rules.enabledWindows.includes(x.value));
    document.getElementById('bookingOpsSummary').textContent=`${d.rules.operatingDays.length} days · ${d.rules.enabledWindows.length} windows · ${d.rules.maxJobsPerDay}/day`;
    document.getElementById('bookingOpsPreview').innerHTML=(d.days||[]).map(x=>`<div class="report-bar-row"><div><strong>${esc(new Date(`${x.date}T12:00:00`).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}))}</strong><small>${x.operating?`${x.booked}/${x.capacity} booked${x.routeZones?.length?` · route ${esc(x.routeZones.join(' + '))}`:' · route open'}`:'Closed to customer booking'}</small></div><div class="report-bar-track"><span style="width:${x.operating?Math.min(100,Math.round((x.booked/Math.max(1,x.capacity))*100)):0}%"></span></div></div>`).join('')||'<p>No schedule preview available.</p>';
  }
  function rulesFromForm(){return {horizonDays:Number(document.getElementById('bookingOpsHorizon').value),minimumNoticeHours:Number(document.getElementById('bookingOpsNotice').value),maxJobsPerDay:Number(document.getElementById('bookingOpsCapacity').value),routeDensityEnabled:document.getElementById('bookingOpsRoute').checked,operatingDays:[...document.querySelectorAll('#bookingOpsDays input:checked')].map(x=>Number(x.value)),enabledWindows:[...document.querySelectorAll('#bookingOpsWindows input:checked')].map(x=>x.value)}}
  async function load(){const status=document.getElementById('bookingOpsStatus');try{render(await api('/api/admin-booking-operations'))}catch(e){document.getElementById('bookingOpsSummary').textContent='Unavailable';if(status)status.textContent=e.message}}
  async function save(){const btn=document.getElementById('bookingOpsSave'),status=document.getElementById('bookingOpsStatus');btn.disabled=true;status.textContent='Saving…';try{const d=await api('/api/admin-booking-operations',{method:'POST',body:JSON.stringify({action:'save',rules:rulesFromForm()})});render(d);status.textContent='Booking operations saved ✓'}catch(e){status.textContent=e.message}finally{btn.disabled=false}}
  function boot(){if(!window.supabase?.createClient)return setTimeout(boot,200);if(!panel())return;document.getElementById('bookingOpsSave').addEventListener('click',save);load()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
