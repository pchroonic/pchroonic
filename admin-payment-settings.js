(()=>{
  let client=null,editable=false;
  async function api(path,options={}){
    if(!client){const r=await fetch('/api/config',{cache:'no-store'}),c=await r.json();if(!r.ok||!c.ok)throw new Error(c.error||'Could not load admin configuration.');client=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}})}
    const {data:{session}}=await client.auth.getSession();if(!session?.access_token)throw new Error('Please sign in to Namdar Admin again.');
    const headers={'Content-Type':'application/json',...(options.headers||{}),Authorization:`Bearer ${session.access_token}`};const r=await fetch(path,{...options,headers}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Request failed (${r.status})`);return d;
  }
  function panel(){
    const tab=document.getElementById('payments');if(!tab||document.getElementById('onlinePaymentSettingsPanel'))return null;
    const el=document.createElement('div');el.id='onlinePaymentSettingsPanel';el.className='admin-panel';
    el.innerHTML=`<div class="panel-head"><div><h2>Online payments</h2><p>Window Cleaning only. Stripe Checkout handles card details; Namdar records money only after a verified Stripe webhook.</p></div><span id="onlinePaymentSummary" class="crm-summary">Loading…</span></div>
      <div id="onlinePaymentProviderState" class="crm-context"></div>
      <div class="admin-form-grid"><label>Policy<select id="onlinePaymentMode"><option value="optional">Optional deposit / balance</option><option value="deposit_required">Deposit required before confirmation</option><option value="full_required">Full payment required before confirmation</option></select></label><label>Deposit percentage<input id="onlinePaymentDeposit" type="number" min="1" max="100" step="1"></label><label>Minimum deposit (£)<input id="onlinePaymentMinimum" type="number" min="0.50" max="100000" step="0.50"></label><label>Customer choice<label class="consent"><input id="onlinePaymentAllowFull" type="checkbox"><span>Allow full payment instead of the initial deposit</span></label></label></div>
      <label class="consent"><input id="onlinePaymentActive" type="checkbox"><span>Enable secure online Stripe payments for Window Cleaning</span></label>
      <p class="muted">Enabling is blocked until both the Stripe secret and verified webhook secret are configured. Card details are never stored by Namdar.</p>
      <hr style="margin:22px 0;border:0;border-top:1px solid var(--border,#dfe5e1)">
      <div class="panel-head"><div><h3>Headline price allowance</h3><p>Optionally build expected payment-processing cost into the normal Window Cleaning price. This is part of the service price for everyone, not a card or Stripe surcharge.</p></div></div>
      <div class="admin-form-grid"><label>Allowance percentage<input id="headlineAllowancePercent" type="number" min="0" max="15" step="0.1"></label><label>Fixed allowance (£)<input id="headlineAllowanceFixed" type="number" min="0" max="25" step="0.01"></label></div>
      <label class="consent"><input id="headlineAllowanceActive" type="checkbox"><span>Include this allowance in Window Cleaning guide prices</span></label>
      <p class="muted">When enabled, the same headline price applies regardless of whether the customer later pays by card, bank transfer or another method. The allowance is never itemised to the customer as a payment fee.</p>
      <div class="admin-actions"><button id="onlinePaymentSave" class="primary-btn small" type="button">Save payment policy</button><small id="onlinePaymentStatus"></small></div>`;
    tab.insertBefore(el,tab.firstElementChild);return el;
  }
  function render(d){
    editable=!!d.canEdit;const p=d.policy||{};
    document.getElementById('onlinePaymentMode').value=p.mode||'optional';document.getElementById('onlinePaymentDeposit').value=p.depositPercent??20;document.getElementById('onlinePaymentMinimum').value=p.minimumDeposit??10;document.getElementById('onlinePaymentAllowFull').checked=p.allowFullPayment!==false;document.getElementById('onlinePaymentActive').checked=!!p.active;
    document.getElementById('headlineAllowanceActive').checked=!!p.headlineAllowanceActive;document.getElementById('headlineAllowancePercent').value=p.headlineAllowancePercent??1.5;document.getElementById('headlineAllowanceFixed').value=Number(p.headlineAllowanceFixed??0.2).toFixed(2);
    for(const id of ['onlinePaymentMode','onlinePaymentDeposit','onlinePaymentMinimum','onlinePaymentAllowFull','onlinePaymentActive','headlineAllowanceActive','headlineAllowancePercent','headlineAllowanceFixed','onlinePaymentSave'])document.getElementById(id).disabled=!editable;
    document.getElementById('onlinePaymentProviderState').innerHTML=`<strong>Stripe connection:</strong> ${d.stripeConfigured?'Secret configured ✓':'Not connected'}<br><strong>Verified webhook:</strong> ${d.webhookConfigured?'Configured ✓':'Not configured'}<br><strong>Customer payments:</strong> ${p.effectiveActive?'Enabled':'Disabled'}<br><strong>Headline allowance:</strong> ${p.headlineAllowanceActive?`${Number(p.headlineAllowancePercent||0).toFixed(2)}% + £${Number(p.headlineAllowanceFixed||0).toFixed(2)} applied to all Window guide prices`:'Disabled'}`;
    document.getElementById('onlinePaymentSummary').textContent=p.effectiveActive?'Stripe payments enabled':'Payments safely disabled';
    const status=document.getElementById('onlinePaymentStatus');if(!editable)status.textContent='View only · Settings permission is required to change payment policy.';else if(!d.providerReady)status.textContent='Connect Stripe and its webhook before switching payments on. Headline pricing allowance can remain configured independently.';
  }
  async function load(){try{render(await api('/api/admin-payment-settings'))}catch(e){document.getElementById('onlinePaymentSummary').textContent='Unavailable';document.getElementById('onlinePaymentStatus').textContent=e.message}}
  async function save(){if(!editable)return;const btn=document.getElementById('onlinePaymentSave'),status=document.getElementById('onlinePaymentStatus');btn.disabled=true;status.textContent='Saving…';try{const d=await api('/api/admin-payment-settings',{method:'POST',body:JSON.stringify({active:document.getElementById('onlinePaymentActive').checked,mode:document.getElementById('onlinePaymentMode').value,depositPercent:Number(document.getElementById('onlinePaymentDeposit').value),minimumDeposit:Number(document.getElementById('onlinePaymentMinimum').value),allowFullPayment:document.getElementById('onlinePaymentAllowFull').checked,headlineAllowanceActive:document.getElementById('headlineAllowanceActive').checked,headlineAllowancePercent:Number(document.getElementById('headlineAllowancePercent').value),headlineAllowanceFixed:Number(document.getElementById('headlineAllowanceFixed').value)})});render(d);status.textContent=d.policy?.effectiveActive?'Online payments enabled ✓':'Payment policy saved; online payments remain disabled ✓'}catch(e){status.textContent=e.message}finally{btn.disabled=!editable}}
  function boot(){if(!window.supabase?.createClient)return setTimeout(boot,200);if(!panel())return;document.getElementById('onlinePaymentSave').addEventListener('click',save);load()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
