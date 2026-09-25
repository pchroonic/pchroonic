(()=>{
  const SESSION_TIMEOUT_MS=12000;
  const PATCHED=Symbol.for('namdar.auth.session-hotfix');
  const FACTORY_PATCHED=Symbol.for('namdar.auth.factory-hotfix');
  const TIMEOUT=Symbol('namdar.auth.session-timeout');

  function loadingStillVisible(){
    const loading=document.querySelector('#accountSessionLoading');
    return !!loading&&!loading.classList.contains('hidden');
  }

  function tryStripeReturnReload(){
    if(!loadingStillVisible())return false;
    let url;
    try{url=new URL(location.href)}catch{return false}
    if(url.searchParams.get('payment')!=='success')return false;
    const sessionId=url.searchParams.get('session_id');
    if(!sessionId)return false;
    const key=`namdar.stripe-return-retry:${sessionId}`;
    try{
      if(sessionStorage.getItem(key)==='1')return false;
      sessionStorage.setItem(key,'1');
    }catch{}
    if(typeof location.reload==='function'){
      location.reload();
      return true;
    }
    return false;
  }

  function cachedSession(){
    try{
      const keys=[];
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(key&&/^sb-.*-auth-token$/.test(key))keys.push(key);
      }
      for(const key of keys){
        const raw=localStorage.getItem(key);
        if(!raw)continue;
        const parsed=JSON.parse(raw);
        const session=parsed?.currentSession||parsed;
        const expiresAt=Number(session?.expires_at||0);
        if(session?.access_token&&session?.refresh_token&&session?.user&&expiresAt>Date.now()/1000+15)return session;
      }
    }catch(error){
      console.warn('Namdar cached session recovery skipped',error);
    }
    return null;
  }

  function timeoutResult(){
    const session=cachedSession();
    if(session)return {data:{session},error:null,recovered:true};
    return {data:{session:null},error:new Error('Session restore timed out')};
  }

  function patchClient(client){
    if(!client?.auth||client.auth[PATCHED])return client;
    const auth=client.auth;
    auth[PATCHED]=true;
    const originalGetSession=auth.getSession.bind(auth);
    const originalOnAuthStateChange=auth.onAuthStateChange.bind(auth);

    auth.getSession=async(...args)=>{
      let timer;
      try{
        const result=await Promise.race([
          Promise.resolve().then(()=>originalGetSession(...args)),
          new Promise(resolve=>{timer=setTimeout(()=>resolve(TIMEOUT),SESSION_TIMEOUT_MS)})
        ]);
        if(result===TIMEOUT){
          tryStripeReturnReload();
          return timeoutResult();
        }
        return result;
      }finally{
        if(timer)clearTimeout(timer);
      }
    };

    auth.onAuthStateChange=(callback)=>originalOnAuthStateChange((event,session)=>{
      setTimeout(()=>{
        Promise.resolve(callback(event,session)).catch(error=>console.error('Namdar auth-state handler failed',error));
      },0);
    });
    return client;
  }

  function patchFactory(){
    const originalCreate=window.supabase?.createClient;
    if(typeof originalCreate!=='function')return false;
    if(originalCreate[FACTORY_PATCHED])return true;
    const patchedCreate=(...args)=>patchClient(originalCreate(...args));
    Object.defineProperty(patchedCreate,FACTORY_PATCHED,{value:true});
    window.supabase.createClient=patchedCreate;
    try{if(typeof sb!=='undefined'&&sb)patchClient(sb)}catch(error){console.warn('Namdar existing auth client patch skipped',error)}
    return true;
  }

  window.NamdarAuthHotfix={patchClient,patchFactory,sessionTimeoutMs:SESSION_TIMEOUT_MS};

  if(!patchFactory()){
    let attempts=0;
    const poll=setInterval(()=>{
      attempts++;
      if(patchFactory()||attempts>=100)clearInterval(poll);
    },50);
  }

  setTimeout(()=>{
    const loading=document.querySelector('#accountSessionLoading');
    if(!loading||loading.classList.contains('hidden'))return;
    if(tryStripeReturnReload())return;
    const recovered=cachedSession();
    if(recovered)return;
    loading.classList.add('hidden');
    document.querySelector('#portalSection')?.classList.add('hidden');
    document.querySelector('#authSection')?.classList.remove('hidden');
    const status=document.querySelector('#authStatus');
    if(status){
      status.textContent='We could not restore your secure session. Try signing in again. Your saved Namdar data has not been changed.';
      status.classList.add('error');
      status.classList.remove('success');
    }
  },SESSION_TIMEOUT_MS+1500);
})();
