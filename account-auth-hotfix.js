(()=>{
  const SESSION_TIMEOUT_MS=5000;
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

  function timeoutResult(){
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
    loading.classList.add('hidden');
    document.querySelector('#portalSection')?.classList.add('hidden');
    document.querySelector('#authSection')?.classList.remove('hidden');
    const status=document.querySelector('#authStatus');
    if(status){
      status.textContent='Your secure session is taking longer than expected. Refresh this page. If it repeats, close any other Namdar tabs and try again.';
      status.classList.add('error');
      status.classList.remove('success');
    }
  },SESSION_TIMEOUT_MS+750);
})();
