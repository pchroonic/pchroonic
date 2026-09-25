(()=>{
  const originalRenderState=typeof renderState==='function'?renderState:null;
  if(!originalRenderState)return;
  let challengePromise=null;

  function verifiedFactors(data={}){
    const all=data.all||[...(data.totp||[]),...(data.phone||[])];
    return all.filter(f=>f&&f.status==='verified');
  }
  function factorLabel(f){return f?.factor_type==='phone'?'phone verification code':'authenticator code'}
  function buildDialog(){
    let dialog=document.getElementById('namdarMfaChallengeDialog');
    if(dialog)return dialog;
    dialog=document.createElement('dialog');
    dialog.id='namdarMfaChallengeDialog';
    dialog.className='modal';
    dialog.innerHTML=`<div class="modal-card"><div class="eyebrow">Account security</div><h2>Two-step verification</h2><p id="namdarMfaChallengeText">Enter your authenticator code to continue.</p><label>Security code<input id="namdarMfaChallengeCode" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="6-digit code"></label><button id="namdarMfaChallengeSubmit" class="primary-btn full" type="button">Verify and continue</button><button id="namdarMfaChallengeSignOut" class="ghost-btn full" type="button">Sign out</button><p id="namdarMfaChallengeStatus" class="form-status" role="status" aria-live="polite"></p></div>`;
    dialog.addEventListener('cancel',e=>e.preventDefault());
    document.body.appendChild(dialog);
    return dialog;
  }
  async function requireSecondFactor(session){
    if(!session||!sb?.auth?.mfa)return session;
    const {data:aal,error:aalError}=await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if(aalError)throw aalError;
    if(aal?.currentLevel==='aal2'||aal?.nextLevel!=='aal2')return session;
    const {data:factors,error:factorsError}=await sb.auth.mfa.listFactors();
    if(factorsError)throw factorsError;
    const verified=verifiedFactors(factors);
    if(!verified.length)return session;
    const factor=verified.find(f=>f.factor_type==='totp')||verified[0];
    const dialog=buildDialog(),text=dialog.querySelector('#namdarMfaChallengeText'),input=dialog.querySelector('#namdarMfaChallengeCode'),submit=dialog.querySelector('#namdarMfaChallengeSubmit'),signOut=dialog.querySelector('#namdarMfaChallengeSignOut'),status=dialog.querySelector('#namdarMfaChallengeStatus');
    text.textContent=`This account has two-step verification enabled. Enter your ${factorLabel(factor)} to open My Namdar.`;
    input.value='';status.textContent='';
    document.querySelector('#accountSessionLoading')?.classList.add('hidden');
    document.querySelector('#authSection')?.classList.add('hidden');
    document.querySelector('#portalSection')?.classList.add('hidden');
    if(!dialog.open)dialog.showModal();
    if(factor.factor_type==='phone'){
      status.textContent='Sending a verification code…';
      const {data:challenge,error}=await sb.auth.mfa.challenge({factorId:factor.id});
      if(error)throw error;
      dialog.dataset.challengeId=challenge.id;
      status.textContent='Code sent. Enter it below.';
    }else delete dialog.dataset.challengeId;
    return new Promise((resolve,reject)=>{
      const finish=async()=>{
        const code=input.value.trim();
        if(!/^\d{6,10}$/.test(code)){status.textContent='Enter the code from your authenticator app.';input.focus();return}
        submit.disabled=true;status.textContent='Verifying…';
        try{
          let challengeId=dialog.dataset.challengeId||'';
          if(!challengeId){const {data:challenge,error}=await sb.auth.mfa.challenge({factorId:factor.id});if(error)throw error;challengeId=challenge.id}
          const {error}=await sb.auth.mfa.verify({factorId:factor.id,challengeId,code});
          if(error)throw error;
          const {data:{session:nextSession},error:sessionError}=await sb.auth.getSession();
          if(sessionError)throw sessionError;
          status.textContent='✓ Verified.';dialog.close();resolve(nextSession||session);
        }catch(error){status.textContent=error.message||'That code could not be verified.';input.select()}finally{submit.disabled=false}
      };
      submit.onclick=finish;
      input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();finish()}};
      signOut.onclick=async()=>{submit.disabled=true;signOut.disabled=true;await sb.auth.signOut().catch(()=>null);dialog.close();reject(new Error('Signed out.'))};
      setTimeout(()=>input.focus(),50);
    });
  }

  renderState=async function(session){
    if(!session)return originalRenderState(session);
    if(!challengePromise)challengePromise=requireSecondFactor(session).finally(()=>{challengePromise=null});
    let verifiedSession;
    try{
      verifiedSession=await challengePromise;
    }catch(error){
      if(error?.message==='Signed out.')return originalRenderState(null);
      document.querySelector('#accountSessionLoading')?.classList.add('hidden');
      document.querySelector('#portalSection')?.classList.add('hidden');
      document.querySelector('#authSection')?.classList.remove('hidden');
      if(typeof setAuthStatus==='function')setAuthStatus(`Two-step verification could not be completed: ${error.message}`,'error');
      return;
    }
    return originalRenderState(verifiedSession);
  };
})();
