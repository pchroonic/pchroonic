(()=>{
  const SITE='https://namdar.co.uk';
  function mount(){
    const grid=document.querySelector('#securityPanel .security-grid');if(!grid||document.getElementById('emailSecurityCard'))return false;
    const card=document.createElement('div');card.className='account-card';card.id='emailSecurityCard';
    card.innerHTML='<h2>Change email address</h2><p>For security, email changes are confirmed through your own inbox rather than being changed by Namdar staff.</p><label>New email address<input id="securityNewEmail" type="email" autocomplete="email" placeholder="you@example.com"></label><button id="securityChangeEmail" class="ghost-btn" type="button">Send confirmation</button><small id="securityEmailStatus" role="status" aria-live="polite"></small>';
    const passwordCard=grid.querySelector('.account-card');passwordCard?.insertAdjacentElement('afterend',card)||grid.prepend(card);
    const button=card.querySelector('#securityChangeEmail'),input=card.querySelector('#securityNewEmail'),status=card.querySelector('#securityEmailStatus');
    button.onclick=async()=>{
      const next=String(input.value||'').trim().toLowerCase();
      if(!next||!input.checkValidity()){status.textContent='Enter a valid email address.';return}
      button.disabled=true;const old=button.textContent;button.textContent='Sending…';status.textContent='';
      try{
        if(typeof sb==='undefined'||!sb?.auth)throw new Error('Secure account access is still loading.');
        const {data:{session}}=await sb.auth.getSession();if(!session)throw new Error('Please sign in again before changing your email address.');
        if(String(session.user?.email||'').toLowerCase()===next){status.textContent='That is already your account email address.';return}
        const {error}=await sb.auth.updateUser({email:next},{emailRedirectTo:`${SITE}/account?tab=security&email=confirmed`});if(error)throw error;
        input.value='';status.textContent='Confirmation sent. Your current email remains active until the required confirmation step is completed.';
      }catch(error){status.textContent=error.message||'The confirmation email could not be sent.'}
      finally{button.disabled=false;button.textContent=old}
    };
    const params=new URLSearchParams(location.search);
    if(params.get('invited')==='1'){
      const alert=document.getElementById('accountAlert');if(alert){alert.classList.remove('hidden');alert.textContent='Secure invitation accepted. Choose your own password in Security before continuing.'}
    }else if(params.get('email')==='confirmed'){
      const alert=document.getElementById('accountAlert');if(alert){alert.classList.remove('hidden');alert.textContent='Email confirmation received. Your account will use the verified address once Supabase completes the change.'}
    }
    return true;
  }
  const start=()=>{if(!mount())setTimeout(start,120)};start();
})();
