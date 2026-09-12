(()=>{
  let client=null,editable=false;
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function api(path,options={}){
    if(!client){const r=await fetch('/api/config',{cache:'no-store'}),c=await r.json();if(!r.ok||!c.ok)throw new Error(c.error||'Could not load admin configuration.');client=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}})}
    const {data:{session}}=await client.auth.getSession();if(!session?.access_token)throw new Error('Please sign in to Namdar Admin again.');
    const headers={'Content-Type':'application/json',...(options.headers||{}),Authorization:`Bearer ${session.access_token}`};
    const r=await fetch(path,{...options,headers}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Request failed (${r.status})`);return d;
  }
  function panel(){
    const tab=document.getElementById('bookings');if(!tab||document.getElementById('reviewSettingsPanel'))return null;
    const el=document.createElement('div');el.id='reviewSettingsPanel';el.className='admin-panel';
    el.innerHTML=`<div class="panel-head"><div><h2>Post-job review requests</h2><p>After a completed job, Namdar thanks the customer and asks for honest feedback. The Google review option is shown equally to completed customers, regardless of the rating they give Namdar privately.</p></div><span id="reviewSettingsSummary" class="crm-summary">Loading…</span></div>
      <div class="crm-toolbar"><label style="min-width:min(100%,620px);flex:1">Google Business Profile review link<input id="publicReviewUrl" type="url" inputmode="url" placeholder="https://..." autocomplete="off"></label></div>
      <p class="muted">Paste the official review-request link from your Google Business Profile. Leave this blank to keep public review requests disabled. Namdar never offers rewards for reviews.</p>
      <div class="admin-actions"><button id="reviewSettingsSave" class="primary-btn small" type="button">Save review link</button><small id="reviewSettingsStatus"></small></div>`;
    const ops=document.getElementById('bookingOpsPanel');if(ops?.parentNode)ops.insertAdjacentElement('afterend',el);else tab.insertBefore(el,tab.firstElementChild);return el;
  }
  function render(d){
    editable=!!d.canEdit;
    const input=document.getElementById('publicReviewUrl'),save=document.getElementById('reviewSettingsSave'),status=document.getElementById('reviewSettingsStatus');
    input.value=d.publicReviewUrl||'';input.disabled=!editable;save.disabled=!editable;
    document.getElementById('reviewSettingsSummary').textContent=d.publicReviewUrl?'Google reviews enabled':'Private feedback only';
    if(!editable)status.textContent='View only · Settings permission is required to change the review link.';
  }
  async function load(){try{render(await api('/api/admin-review-settings'))}catch(e){document.getElementById('reviewSettingsSummary').textContent='Unavailable';document.getElementById('reviewSettingsStatus').textContent=e.message}}
  async function save(){if(!editable)return;const btn=document.getElementById('reviewSettingsSave'),status=document.getElementById('reviewSettingsStatus');btn.disabled=true;status.textContent='Saving…';try{const d=await api('/api/admin-review-settings',{method:'POST',body:JSON.stringify({publicReviewUrl:document.getElementById('publicReviewUrl').value.trim()})});render(d);status.textContent=d.publicReviewUrl?'Google review link saved ✓':'Public Google review requests disabled ✓'}catch(e){status.textContent=e.message}finally{btn.disabled=!editable}}
  function boot(){if(!window.supabase?.createClient)return setTimeout(boot,200);if(!panel())return;document.getElementById('reviewSettingsSave').addEventListener('click',save);load()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
