(()=>{
  const SUPABASE_VERSION='2.116.0';
  const SUPABASE_SRC=`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${SUPABASE_VERSION}`;
  let recoveryPromise=null,recoveredAuthListener=false,manualSignIn=false;
  const login=()=>document.querySelector('#staffLogin');
  const status=message=>{const el=document.querySelector('#staffLoginStatus');if(el)el.textContent=message||''};
  const authReady=()=>typeof sb!=='undefined'&&!!sb?.auth;

  async function waitForAuthClient(timeoutMs=1200){
    const started=Date.now();
    while(Date.now()-started<timeoutMs){
      if(authReady())return sb.auth;
      await new Promise(resolve=>setTimeout(resolve,80));
    }
    return authReady()?sb.auth:null;
  }

  async function ensureSupabaseLibrary(){
    if(window.supabase?.createClient)return;
    await new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      const timer=setTimeout(()=>{script.remove();reject(new Error('The secure sign-in library took too long to load.'))},12000);
      script.src=SUPABASE_SRC;
      script.async=true;
      script.dataset.namdarStaffRecovery='1';
      script.onload=()=>{clearTimeout(timer);window.supabase?.createClient?resolve():reject(new Error('The secure sign-in library did not initialise.'))};
      script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('The secure sign-in library could not load. Check your connection and try again.'))};
      document.head.appendChild(script);
    });
  }

  function attachRecoveredAuthListener(){
    if(recoveredAuthListener||!authReady())return;
    recoveredAuthListener=true;
    sb.auth.onAuthStateChange(async(_event,sessionNow)=>{
      currentSession=sessionNow;
      if(!sessionNow){
        currentStaff=null;jobs=[];offlineMode=false;lastSyncAt=null;
        showLogin();renderConnectivity();return;
      }
      if(manualSignIn)return;
      try{await loadJobs();showApp()}catch(error){showLogin(error.message)}
    });
  }

  async function recoverAuthClient(){
    const existing=await waitForAuthClient();
    if(existing)return existing;
    if(!recoveryPromise){
      recoveryPromise=(async()=>{
        status('Finishing secure sign-in setup…');
        await ensureSupabaseLibrary();
        if(typeof loadPublicConfig!=='function')throw new Error('The staff app did not finish loading. Please reopen My jobs.');
        const config=await loadPublicConfig();
        window.NamdarPrivilegedCaptcha?.configure(config.turnstileSiteKey,'staffLoginTurnstile');
        if(!authReady()){
          sb=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
          const {data,error}=await sb.auth.getSession();
          if(error)throw error;
          currentSession=data?.session||null;
          attachRecoveredAuthListener();
        }
        return sb.auth;
      })().finally(()=>{recoveryPromise=null});
    }
    return recoveryPromise;
  }

  async function recoverVisibleLogin(){
    if(!login()||login().classList.contains('hidden')||authReady())return;
    try{
      await recoverAuthClient();
      if(currentSession){await loadJobs();showApp();status('')}
      else{showLogin();status('Secure sign-in is ready.')}
    }catch(error){status(`Secure sign-in setup could not finish: ${error.message}`)}
  }

  const form=document.querySelector('#staffLoginForm');
  if(form){
    form.onsubmit=async event=>{
      event.preventDefault();
      if(!navigator.onLine){status('Connect to the internet to sign in.');return}
      const button=document.querySelector('#staffLoginBtn');
      setBusy(button,true,'Signing in…');status('');
      try{
        const auth=await recoverAuthClient();
        manualSignIn=true;
        const {data,error}=await window.NamdarPrivilegedCaptcha.signIn(auth,{email:document.querySelector('#staffEmail').value.trim(),password:document.querySelector('#staffPassword').value});
        if(error)throw error;
        currentSession=data.session;
        await loadJobs();showApp();
      }catch(error){status(error.message||'Sign in could not be completed.')}
      finally{manualSignIn=false;setBusy(button,false)}
    };
  }

  if(login()){
    const observer=new MutationObserver(()=>{recoverVisibleLogin()});
    observer.observe(login(),{attributes:true,attributeFilter:['class']});
    queueMicrotask(recoverVisibleLogin);
  }
})();
