(()=>{
  const originalEnter=typeof enter==='function'?enter:null;
  if(!originalEnter)return;
  let gatePromise=null,deferredForPage=false;

  function factorsFrom(data={}){return (data.all||[...(data.totp||[]),...(data.phone||[])]).filter(Boolean)}
  function ensureDialog(){
    let dialog=document.getElementById('namdarPrivilegedMfaDialog');if(dialog)return dialog;
    dialog=document.createElement('dialog');dialog.id='namdarPrivilegedMfaDialog';dialog.className='modal';
    dialog.innerHTML=`<div class="modal-card"><div class="eyebrow">Namdar security</div><h2 id="namdarPrivilegedMfaTitle">Secure your staff account</h2><p id="namdarPrivilegedMfaText"></p><div id="namdarPrivilegedMfaSetup" class="hidden"><div class="account-card"><img id="namdarPrivilegedMfaQr" alt="Authenticator QR code" style="max-width:220px;width:100%;height:auto"><p><strong>Manual setup key</strong><br><code id="namdarPrivilegedMfaSecret"></code></p></div></div><label id="namdarPrivilegedMfaCodeWrap" class="hidden">Authenticator code<input id="namdarPrivilegedMfaCode" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="6-digit code"></label><button id="namdarPrivilegedMfaPrimary" class="primary-btn full" type="button">Set up authenticator</button><button id="namdarPrivilegedMfaLater" class="ghost-btn full" type="button">Continue for now</button><button id="namdarPrivilegedMfaSignOut" class="text-link" type="button">Sign out</button><p id="namdarPrivilegedMfaStatus" class="form-status" role="status" aria-live="polite"></p></div>`;
    dialog.addEventListener('cancel',e=>e.preventDefault());document.body.appendChild(dialog);return dialog;
  }
  async function latestSession(fallback){const {data:{session},error}=await sb.auth.getSession();if(error)throw error;currentSession=session||fallback;return currentSession}
  async function challengeVerified(session,factor,dialog){
    const text=dialog.querySelector('#namdarPrivilegedMfaText'),setup=dialog.querySelector('#namdarPrivilegedMfaSetup'),codeWrap=dialog.querySelector('#namdarPrivilegedMfaCodeWrap'),code=dialog.querySelector('#namdarPrivilegedMfaCode'),primary=dialog.querySelector('#namdarPrivilegedMfaPrimary'),later=dialog.querySelector('#namdarPrivilegedMfaLater'),status=dialog.querySelector('#namdarPrivilegedMfaStatus');
    setup.classList.add('hidden');codeWrap.classList.remove('hidden');later.classList.add('hidden');primary.textContent='Verify and open dashboard';text.textContent='Two-step verification is enabled for this account. Enter your authenticator code before privileged Namdar data is loaded.';code.value='';status.textContent='';
    return new Promise((resolve,reject)=>{
      const verify=async()=>{const value=code.value.trim();if(!/^\d{6,10}$/.test(value)){status.textContent='Enter the current authenticator code.';return}primary.disabled=true;status.textContent='Verifying…';try{const {error}=await sb.auth.mfa.challengeAndVerify({factorId:factor.id,code:value});if(error)throw error;dialog.close();resolve(await latestSession(session))}catch(error){status.textContent=error.message||'Verification failed.';code.select()}finally{primary.disabled=false}};
      primary.onclick=verify;code.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();verify()}};dialog.querySelector('#namdarPrivilegedMfaSignOut').onclick=async()=>{await sb.auth.signOut().catch(()=>null);dialog.close();reject(new Error('Signed out.'))};setTimeout(()=>code.focus(),60);
    });
  }
  async function offerEnrollment(session,role,allFactors,dialog){
    const title=dialog.querySelector('#namdarPrivilegedMfaTitle'),text=dialog.querySelector('#namdarPrivilegedMfaText'),setup=dialog.querySelector('#namdarPrivilegedMfaSetup'),codeWrap=dialog.querySelector('#namdarPrivilegedMfaCodeWrap'),code=dialog.querySelector('#namdarPrivilegedMfaCode'),primary=dialog.querySelector('#namdarPrivilegedMfaPrimary'),later=dialog.querySelector('#namdarPrivilegedMfaLater'),status=dialog.querySelector('#namdarPrivilegedMfaStatus'),qr=dialog.querySelector('#namdarPrivilegedMfaQr'),secret=dialog.querySelector('#namdarPrivilegedMfaSecret');
    title.textContent=role==='admin'?'Protect your administrator account':'Protect your staff account';text.textContent='Namdar is moving privileged accounts to mandatory two-step verification. Set up an authenticator now. During this rollout you can continue once without it, but you will be asked again on your next session.';setup.classList.add('hidden');codeWrap.classList.add('hidden');later.classList.remove('hidden');primary.textContent='Set up authenticator';status.textContent='';
    return new Promise((resolve,reject)=>{
      let factorId='';
      primary.onclick=async()=>{primary.disabled=true;later.disabled=true;status.textContent='Preparing authenticator setup…';try{for(const f of allFactors.filter(x=>x.status!=='verified'))await sb.auth.mfa.unenroll({factorId:f.id}).catch(()=>null);const {data,error}=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'Namdar staff authenticator'});if(error)throw error;factorId=data.id;qr.src=data.totp.qr_code;secret.textContent=data.totp.secret;setup.classList.remove('hidden');codeWrap.classList.remove('hidden');primary.textContent='Verify authenticator';primary.disabled=false;later.disabled=false;status.textContent='Scan the QR code with Google Authenticator, Microsoft Authenticator, Authy, 1Password or another TOTP app, then enter the code below.';primary.onclick=async()=>{const value=code.value.trim();if(!/^\d{6,10}$/.test(value)){status.textContent='Enter the current code from your authenticator app.';return}primary.disabled=true;status.textContent='Verifying…';try{const {error:verifyError}=await sb.auth.mfa.challengeAndVerify({factorId,code:value});if(verifyError)throw verifyError;dialog.close();resolve(await latestSession(session))}catch(error){status.textContent=error.message||'Verification failed.';code.select()}finally{primary.disabled=false}};setTimeout(()=>code.focus(),60)}catch(error){status.textContent=error.message||'Authenticator setup could not start.';primary.disabled=false;later.disabled=false}};
      later.onclick=()=>{deferredForPage=true;dialog.close();resolve(session)};
      dialog.querySelector('#namdarPrivilegedMfaSignOut').onclick=async()=>{await sb.auth.signOut().catch(()=>null);dialog.close();reject(new Error('Signed out.'))};
    });
  }
  async function secureSession(session){
    if(!session||!sb?.auth?.mfa||deferredForPage)return session;
    const {data:profile,error:profileError}=await sb.from('profiles').select('id,role').eq('id',session.user.id).maybeSingle();
    if(profileError)throw profileError;if(!profile||!['admin','staff'].includes(profile.role))return session;
    const [{data:aal,error:aalError},{data:factors,error:factorsError}]=await Promise.all([sb.auth.mfa.getAuthenticatorAssuranceLevel(),sb.auth.mfa.listFactors()]);
    if(aalError)throw aalError;if(factorsError)throw factorsError;
    const all=factorsFrom(factors),verified=all.filter(f=>f.status==='verified'),dialog=ensureDialog();if(!dialog.open)dialog.showModal();
    if(verified.length&&aal?.currentLevel!=='aal2')return challengeVerified(session,verified.find(f=>f.factor_type==='totp')||verified[0],dialog);
    if(verified.length){dialog.close();return session}
    return offerEnrollment(session,profile.role,all,dialog);
  }
  enter=async function(session){
    if(!gatePromise)gatePromise=secureSession(session).finally(()=>{gatePromise=null});
    try{return await originalEnter(await gatePromise)}catch(error){if(error?.message==='Signed out.')return showLogin('Signed out.');showLogin(`Two-step verification could not be completed: ${error.message}`)}
  };
})();
