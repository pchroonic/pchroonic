(()=>{
  const PATCHED=Symbol.for('namdar.auth.captcha-readiness');
  let loginWidgetId=null;
  let registerWidgetId=null;

  const captchaConfigured=()=>{
    try{return !!config?.turnstileSiteKey}catch{return false}
  };

  const tokenFor=kind=>kind==='register'?registerCaptchaToken:loginCaptchaToken;

  function requireCaptchaToken(kind){
    if(!captchaConfigured())return '';
    const token=tokenFor(kind);
    if(!token)throw new Error('Please complete the anti-bot check first.');
    return token;
  }

  function resetCaptcha(kind){
    try{
      if(kind==='register')registerCaptchaToken='';
      else loginCaptchaToken='';
    }catch{}
    const widgetId=kind==='register'?registerWidgetId:loginWidgetId;
    try{
      if(widgetId!=null&&window.turnstile?.reset)window.turnstile.reset(widgetId);
    }catch(error){console.warn(`Namdar ${kind} Turnstile reset skipped`,error)}
  }

  async function runWithReset(kind,fn){
    try{return await fn()}
    finally{resetCaptcha(kind)}
  }

  // Preserve the existing UI while retaining widget IDs so one-time Turnstile
  // tokens can be refreshed after every Supabase Auth request.
  if(typeof initTurnstile==='function'){
    initTurnstile=async function(){
      if(!config.turnstileSiteKey||turnstileRendered)return;
      try{
        await ensureTurnstileLibrary();
        turnstileRendered=true;
        const registerSlot=$('#registerTurnstile');
        const loginSlot=$('#loginTurnstile');
        if(registerSlot){
          registerSlot.classList.remove('hidden');
          registerWidgetId=window.turnstile.render(registerSlot,{
            sitekey:config.turnstileSiteKey,
            callback:token=>{registerCaptchaToken=token},
            'expired-callback':()=>{registerCaptchaToken=''},
            'error-callback':()=>{registerCaptchaToken=''}
          });
        }
        if(loginSlot){
          loginSlot.classList.remove('hidden');
          loginWidgetId=window.turnstile.render(loginSlot,{
            sitekey:config.turnstileSiteKey,
            callback:token=>{loginCaptchaToken=token},
            'expired-callback':()=>{loginCaptchaToken=''},
            'error-callback':()=>{loginCaptchaToken=''}
          });
        }
      }catch(error){
        turnstileRendered=false;
        setAuthStatus(error.message,'error');
      }
    };
  }

  function patchClient(client){
    if(!client?.auth||client.auth[PATCHED])return client;
    const auth=client.auth;
    auth[PATCHED]=true;

    const signInWithPassword=auth.signInWithPassword.bind(auth);
    auth.signInWithPassword=credentials=>{
      const token=requireCaptchaToken('login');
      const next={...credentials,options:{...(credentials?.options||{}),...(token?{captchaToken:token}:{})}};
      return runWithReset('login',()=>signInWithPassword(next));
    };

    const signInWithOtp=auth.signInWithOtp.bind(auth);
    auth.signInWithOtp=credentials=>{
      const token=requireCaptchaToken('login');
      const next={...credentials,options:{...(credentials?.options||{}),...(token?{captchaToken:token}:{})}};
      return runWithReset('login',()=>signInWithOtp(next));
    };

    const signInWithIdToken=auth.signInWithIdToken.bind(auth);
    auth.signInWithIdToken=credentials=>{
      const token=requireCaptchaToken('login');
      const next={...credentials,options:{...(credentials?.options||{}),...(token?{captchaToken:token}:{})}};
      return runWithReset('login',()=>signInWithIdToken(next));
    };

    const signUp=auth.signUp.bind(auth);
    auth.signUp=credentials=>{
      const token=requireCaptchaToken('register');
      const next={...credentials,options:{...(credentials?.options||{}),...(token?{captchaToken:token}:{})}};
      return runWithReset('register',()=>signUp(next));
    };

    const resetPasswordForEmail=auth.resetPasswordForEmail.bind(auth);
    auth.resetPasswordForEmail=(email,options={})=>{
      const token=requireCaptchaToken('login');
      const next={...options,...(token?{captchaToken:token}:{})};
      return runWithReset('login',()=>resetPasswordForEmail(email,next));
    };

    const resend=auth.resend.bind(auth);
    auth.resend=params=>{
      const token=requireCaptchaToken('login');
      const next={...params,options:{...(params?.options||{}),...(token?{captchaToken:token}:{})}};
      return runWithReset('login',()=>resend(next));
    };

    return client;
  }

  const originalCreate=window.supabase?.createClient;
  if(typeof originalCreate==='function'){
    window.supabase.createClient=(...args)=>patchClient(originalCreate(...args));
  }
  try{if(typeof sb!=='undefined'&&sb)patchClient(sb)}catch(error){console.warn('Namdar existing CAPTCHA client patch skipped',error)}
})();
