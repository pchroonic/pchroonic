(()=>{
  const SESSION_TIMEOUT_MS=8000;
  const PATCHED=Symbol.for('namdar.auth.session-hotfix');
  const originalCreate=window.supabase?.createClient;
  if(typeof originalCreate!=='function')return;

  function timeoutResult(){
    return new Promise(resolve=>setTimeout(()=>resolve({data:{session:null},error:new Error('Session restore timed out')}),SESSION_TIMEOUT_MS));
  }

  function patchClient(client){
    if(!client?.auth||client.auth[PATCHED])return client;
    const auth=client.auth;
    auth[PATCHED]=true;
    const originalGetSession=auth.getSession.bind(auth);
    const originalOnAuthStateChange=auth.onAuthStateChange.bind(auth);

    auth.getSession=(...args)=>Promise.race([originalGetSession(...args),timeoutResult()]);
    auth.onAuthStateChange=(callback)=>originalOnAuthStateChange((event,session)=>{
      setTimeout(()=>{
        Promise.resolve(callback(event,session)).catch(error=>console.error('Namdar auth-state handler failed',error));
      },0);
    });
    return client;
  }

  window.supabase.createClient=(...args)=>patchClient(originalCreate(...args));
  try{if(typeof sb!=='undefined'&&sb)patchClient(sb)}catch(error){console.warn('Namdar existing auth client patch skipped',error)}

  setTimeout(()=>{
    const loading=document.querySelector('#accountSessionLoading');
    if(!loading||loading.classList.contains('hidden'))return;
    loading.classList.add('hidden');
    document.querySelector('#portalSection')?.classList.add('hidden');
    document.querySelector('#authSection')?.classList.remove('hidden');
    const status=document.querySelector('#authStatus');
    if(status){
      status.textContent='Your secure session is taking longer than expected. Refresh this page. If it repeats, close any other Namdar tabs and try again.';
      status.classList.add('error');
      status.classList.remove('success');
    }
  },SESSION_TIMEOUT_MS+500);
})();
