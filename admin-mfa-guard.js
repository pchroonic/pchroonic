(()=>{
  const originalEnter=typeof enter==='function'?enter:null;
  if(!originalEnter)return;
  let gatePromise=null;

  const factorsFrom=data=>(data?.all||[...(data?.totp||[]),...(data?.phone||[])]).filter(Boolean);
  function ensureDialog(){
    let d=document.getElementById('namdarPrivilegedMfaDialog');
    if(d)return d;
    d=document.createElement('dialog');d.id='namdarPrivilegedMfaDialog';d.className='modal';
    d.innerHTML=`<div class="modal-card"><div class="eyebrow">Namdar security</div><h2 id="namdarPrivilegedMfaTitle">Two-step verification required</h2><p id="namdarPrivilegedMfaText"></p><div id="namdarPrivilegedMfaSetup" class="hidden"><div class="account-card"><img id="namdarPrivilegedMfaQr" alt="Authenticator QR code" style="max-width:220px;width:100%;height:auto"><p><strong>Manual setup key</strong><br><code id="namdarPrivilegedMfaSecret"></code></p></div></div><label id="namdarPrivilegedMfaCodeWrap" class="hidden">Authenticator code<input id="namdarPrivilegedMfaCode" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="6-digit code"></label><button id="namdarPrivilegedMfaPrimary" class="primary-btn full" type="button">Verify and continue</button><button id="namdarPrivilegedMfaSignOut" class="ghost-btn full" type="button">Sign out</button><p id="namdarPrivilegedMfaStatus" class="form-status" role="status" aria-live="polite"></p></div>`;
    d.addEventListener('cancel',e=>e.preventDefault());document.body.appendChild(d);return d;
  }
  async function latestSession(fallback){const {data:{session},error}=await sb.auth.getSession();if(error)throw error;currentSession=session||fallback;return currentSession}
  function prepare(d,{title,text,setup=false}={}){d.querySelector('#namdarPrivilegedMfaTitle').textContent=title||'Two-step verification required';d.querySelector('#namdarPrivilegedMfaText').textContent=text||'';d.querySelector('#namdarPrivilegedMfaSetup').classList.toggle('hidden',!setup);d.querySelector('#namdarPrivilegedMfaCodeWrap').classList.remove('hidden');d.querySelector('#namdarPrivilegedMfaCode').value='';d.querySelector('#namdarPrivilegedMfaStatus').textContent='';if(!d.open)d.showModal()}
  async function challenge(session,factor,d){
    prepare(d,{title:'Verify your administrator account',text:'Enter the current code from your authenticator app before privileged Namdar data is loaded.'});
    const code=d.querySelector('#namdarPrivilegedMfaCode'),primary=d.querySelector('#namdarPrivilegedMfaPrimary'),status=d.querySelector('#namdarPrivilegedMfaStatus');primary.textContent='Verify and open dashboard';
    return new Promise((resolve,reject)=>{const verify=async()=>{const value=code.value.trim();if(!/^\d{6,10}$/.test(value)){status.textContent='Enter the current authenticator code.';return}primary.disabled=true;status.textContent='Verifying…';try{const {error}=await sb.auth.mfa.challengeAndVerify({factorId:factor.id,code:value});if(error)throw error;d.close();resolve(await latestSession(session))}catch(error){status.textContent=error.message||'Verification failed.';code.select()}finally{primary.disabled=false}};primary.onclick=verify;code.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();verify()}};d.querySelector('#namdarPrivilegedMfaSignOut').onclick=async()=>{await sb.auth.signOut().catch(()=>null);d.close();reject(new Error('Signed out.'))};setTimeout(()=>code.focus(),60)})
  }
  async function enroll(session,role,all,d){
    const title=role==='admin'?'Protect your administrator account':'Protect your staff account';
    prepare(d,{title,text:'Two-step verification is required for privileged Namdar access. Scan the QR code in an authenticator app, then enter the generated code.',setup:false});
    const setup=d.querySelector('#namdarPrivilegedMfaSetup'),code=d.querySelector('#namdarPrivilegedMfaCode'),primary=d.querySelector('#namdarPrivilegedMfaPrimary'),status=d.querySelector('#namdarPrivilegedMfaStatus'),qr=d.querySelector('#namdarPrivilegedMfaQr'),secret=d.querySelector('#namdarPrivilegedMfaSecret');primary.textContent='Set up authenticator';
    return new Promise((resolve,reject)=>{let factorId='';primary.onclick=async()=>{primary.disabled=true;status.textContent='Preparing authenticator setup…';try{for(const f of all.filter(x=>x.status!=='verified'))await sb.auth.mfa.unenroll({factorId:f.id}).catch(()=>null);const {data,error}=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'Namdar staff authenticator'});if(error)throw error;factorId=data.id;qr.src=data.totp.qr_code;secret.textContent=data.totp.secret;setup.classList.remove('hidden');primary.textContent='Verify authenticator';primary.disabled=false;status.textContent='Scan the QR code, then enter the current code below.';primary.onclick=async()=>{const value=code.value.trim();if(!/^\d{6,10}$/.test(value)){status.textContent='Enter the current authenticator code.';return}primary.disabled=true;status.textContent='Verifying…';try{const {error:verifyError}=await sb.auth.mfa.challengeAndVerify({factorId,code:value});if(verifyError)throw verifyError;d.close();resolve(await latestSession(session))}catch(error){status.textContent=error.message||'Verification failed.';code.select()}finally{primary.disabled=false}};setTimeout(()=>code.focus(),60)}catch(error){status.textContent=error.message||'Authenticator setup could not start.';primary.disabled=false}};d.querySelector('#namdarPrivilegedMfaSignOut').onclick=async()=>{await sb.auth.signOut().catch(()=>null);d.close();reject(new Error('Signed out.'))}})
  }
  async function secureSession(session){
    if(!session||!sb?.auth?.mfa)return session;
    const {data:profile,error:profileError}=await sb.from('profiles').select('id,role').eq('id',session.user.id).maybeSingle();
    if(profileError)throw profileError;if(!profile||!['admin','staff'].includes(profile.role))return session;
    const [{data:aal,error:aalError},{data:factors,error:factorsError}]=await Promise.all([sb.auth.mfa.getAuthenticatorAssuranceLevel(),sb.auth.mfa.listFactors()]);
    if(aalError)throw aalError;if(factorsError)throw factorsError;
    const all=factorsFrom(factors),verified=all.filter(f=>f.status==='verified');
    if(verified.length&&aal?.currentLevel==='aal2')return session;
    const d=ensureDialog();
    if(verified.length)return challenge(session,verified.find(f=>f.factor_type==='totp')||verified[0],d);
    return enroll(session,profile.role,all,d);
  }
  enter=async function(session){
    let securedSession;
    if(!gatePromise)gatePromise=secureSession(session).finally(()=>{gatePromise=null});
    try{securedSession=await gatePromise}catch(error){if(error?.message==='Signed out.')return showLogin('Signed out.');return showLogin(`Two-step verification could not be completed: ${error?.message||'Unknown verification error.'}`)}
    try{return await originalEnter(securedSession)}catch(error){console.error('Namdar Admin dashboard failed to load',error);return showLogin(`Admin dashboard could not be loaded: ${error?.message||'Unknown dashboard error.'}`)}
  };
})();
