(()=>{
  if(window.NamdarChatExperience)return;
  const SESSION_KEY='namdar_chat_session',TOKEN_KEY='namdar_chat_token';
  const state={
    sessionId:localStorage.getItem(SESSION_KEY)||'',guestToken:localStorage.getItem(TOKEN_KEY)||'',
    mode:'guided',aiEnabled:false,staffOnline:false,open:false,busy:false,pollTimer:null,lastCount:0,
    captchaToken:'',turnstileSiteKey:'',lastFailed:'',actions:[]
  };
  const $=s=>document.querySelector(s);
  const signedIn=()=>{try{return typeof currentSession!=='undefined'&&!!currentSession}catch{return false}};
  const apiCall=(path,options={})=>{
    if(typeof window.api!=='function')throw new Error('Namdar chat is still loading. Please try again.');
    return window.api(path,options);
  };
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const timeLabel=v=>{if(!v)return'';try{return new Date(v).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}catch{return''}};

  function syncLegacy(){
    try{if(typeof chatState!=='undefined'){
      if(chatState.pollTimer){clearInterval(chatState.pollTimer);chatState.pollTimer=null}
      chatState.sessionId=state.sessionId;chatState.guestToken=state.guestToken;
    }}catch{}
  }
  function remember(session){
    if(!session)return;
    state.sessionId=session.id||state.sessionId;state.guestToken=session.guestToken||state.guestToken;
    if(state.sessionId)localStorage.setItem(SESSION_KEY,state.sessionId);if(state.guestToken)localStorage.setItem(TOKEN_KEY,state.guestToken);syncLegacy();
  }
  function clearRemembered(){
    state.sessionId='';state.guestToken='';state.lastCount=0;state.mode=state.aiEnabled?'ai':'guided';state.actions=[];state.lastFailed='';
    localStorage.removeItem(SESSION_KEY);localStorage.removeItem(TOKEN_KEY);syncLegacy();
  }
  function setStatus(text='',kind=''){
    const el=$('#chatStatus');if(!el)return;el.textContent=text;el.className=`chat-status${kind?` ${kind}`:''}`;
  }
  function setMode(mode=state.mode){
    state.mode=mode||state.mode;const badge=$('#chatModeBadge'),presence=$('#chatPresence');if(!badge||!presence)return;
    if(state.mode==='human'){
      badge.textContent='Team chat';badge.dataset.mode='human';presence.textContent='A Namdar team member has joined this conversation';return;
    }
    if(state.mode==='ai'||state.aiEnabled){badge.textContent='AI assistant';badge.dataset.mode='ai';presence.textContent=state.staffOnline?'Namdar team online · AI help available':'Instant AI help for Namdar questions';return}
    badge.textContent='Guided assistant';badge.dataset.mode='guided';presence.textContent=state.staffOnline?'Namdar team online · instant answers available':'Instant help with Window Cleaning and bookings';
  }
  function makeBubble(role,message,createdAt=''){
    const wrap=document.createElement('div'),bubble=document.createElement('div'),meta=document.createElement('div');
    const cleanRole=role==='staff'?'staff':role==='assistant'?'assistant':'customer';
    wrap.className=`chat-message-row ${cleanRole}`;bubble.className=`chat-bubble ${cleanRole}`;bubble.textContent=message;
    meta.className='chat-message-meta';meta.textContent=`${cleanRole==='customer'?'You':cleanRole==='staff'?'Namdar team':'Namdar'}${createdAt?` · ${timeLabel(createdAt)}`:''}`;
    wrap.append(bubble,meta);return wrap;
  }
  function scrollMessages(){const el=$('#chatMessages');if(el)requestAnimationFrame(()=>{el.scrollTop=el.scrollHeight})}
  function welcome(){
    const messages=$('#chatMessages');if(!messages)return;messages.innerHTML='';
    messages.appendChild(makeBubble('assistant','Hi — I can help with Window Cleaning, guide estimates, postcode coverage, booking and customer support. Namdar’s other services will only become available when their launch stage is ready.'));
    renderSuggestions();scrollMessages();
  }
  function renderSuggestions(){
    const host=$('#chatSuggestions');if(!host)return;
    host.innerHTML=[
      ['Window cleaning','Tell me about Window Cleaning'],
      ['Pricing','How does Namdar pricing work?'],
      ['Postcode','How do I check if my postcode is covered?'],
      ['Booking','How does booking work?'],
      ['Support','I need customer support']
    ].map(([label,prompt])=>`<button type="button" data-chat-prompt="${esc(prompt)}">${esc(label)}</button>`).join('');
    host.querySelectorAll('[data-chat-prompt]').forEach(button=>button.onclick=()=>sendMessage(button.dataset.chatPrompt));
  }
  function renderActions(actions=[]){
    state.actions=Array.isArray(actions)?actions:[];const host=$('#chatActions');if(!host)return;
    host.innerHTML=state.actions.map(a=>`<a class="chat-action ${a.kind==='primary'?'primary':''}" href="${esc(a.href)}" data-chat-action="${esc(a.id||'')}">${esc(a.label)}</a>`).join('');
    host.querySelectorAll('a[href^="#"]').forEach(a=>a.onclick=e=>{e.preventDefault();const target=document.querySelector(a.getAttribute('href'));close();target?.scrollIntoView({behavior:'smooth',block:'start'})});
  }
  function renderHistory(messages=[]){
    const host=$('#chatMessages');if(!host)return;host.innerHTML='';
    if(!messages.length){welcome();return}
    for(const message of messages)host.appendChild(makeBubble(message.sender_role,message.message,message.created_at));
    state.lastCount=messages.length;renderActions(state.actions);scrollMessages();
  }
  function showTyping(show){
    const host=$('#chatMessages');if(!host)return;$('#chatTyping')?.remove();if(!show)return;
    const row=document.createElement('div');row.id='chatTyping';row.className='chat-message-row assistant';row.innerHTML='<div class="chat-bubble assistant chat-typing" aria-label="Namdar is typing"><i></i><i></i><i></i></div><div class="chat-message-meta">Namdar</div>';host.appendChild(row);scrollMessages();
  }
  function busy(on){state.busy=on;const button=$('#chatSend'),input=$('#chatInput');if(button){button.disabled=on;button.textContent=on?'…':'Send'}if(input)input.disabled=on}
  function resizeComposer(){const input=$('#chatInput');if(!input)return;input.style.height='auto';input.style.height=`${Math.min(120,Math.max(44,input.scrollHeight))}px`}
  function currentCaptcha(){
    if(state.captchaToken)return state.captchaToken;
    try{if(typeof chatCaptchaToken!=='undefined'&&chatCaptchaToken)return chatCaptchaToken}catch{}
    try{return window.turnstile?.getResponse?.()||''}catch{return''}
  }
  async function ensureTurnstile(){
    const slot=$('#chatTurnstile');if(!slot||signedIn()||!state.turnstileSiteKey)return;
    slot.classList.remove('hidden');
    const attempt=()=>{
      if(!window.turnstile?.render)return setTimeout(attempt,180);if(slot.dataset.rendered)return;
      try{
        window.turnstile.render(slot,{sitekey:state.turnstileSiteKey,callback:token=>{state.captchaToken=token;try{chatCaptchaToken=token}catch{};setStatus('')},'expired-callback':()=>{state.captchaToken='';try{chatCaptchaToken=''}catch{}},'error-callback':()=>setStatus('The security check could not load. Refresh the page and try again.','error')});
        slot.dataset.rendered='1';
      }catch{}
    };attempt();
  }
  async function loadMode(){
    try{
      const [configResponse,publicResponse]=await Promise.all([fetch('/api/config',{cache:'no-store'}),fetch('/api/public-data',{cache:'no-store'})]);
      const configData=await configResponse.json(),publicData=publicResponse.ok?await publicResponse.json():{};
      state.aiEnabled=configData.aiEnabled===true;state.turnstileSiteKey=configData.turnstileSiteKey||'';state.staffOnline=publicData.liveStaffOnline===true;
      if(state.mode!=='human')state.mode=state.aiEnabled?'ai':'guided';setMode();ensureTurnstile();
    }catch{setMode()}
  }
  async function poll(){
    if(!state.open||document.hidden||!state.sessionId||state.busy)return;
    try{
      const data=await apiCall('/api/chat',{method:'POST',body:JSON.stringify({action:'poll',sessionId:state.sessionId,guestToken:state.guestToken})});
      remember(data.session);setMode(data.assistantMode||data.session?.mode||state.mode);
      if(Array.isArray(data.messages)&&data.messages.length!==state.lastCount)renderHistory(data.messages);
    }catch(error){
      if(/session not found/i.test(error.message||'')){clearRemembered();welcome();setStatus('Started a fresh conversation.','')}
    }
  }
  function startPolling(){stopPolling();if(!state.open||!state.sessionId||document.hidden)return;state.pollTimer=setInterval(poll,7000);poll()}
  function stopPolling(){if(state.pollTimer){clearInterval(state.pollTimer);state.pollTimer=null}}
  function open(){
    state.open=true;const widget=$('#chatWidget'),launcher=$('#chatLauncher');widget?.classList.remove('hidden');launcher?.setAttribute('aria-expanded','true');document.body.classList.add('namdar-chat-open');
    startPolling();setTimeout(()=>$('#chatInput')?.focus(),80);
  }
  function close(){
    state.open=false;$('#chatWidget')?.classList.add('hidden');$('#chatLauncher')?.setAttribute('aria-expanded','false');document.body.classList.remove('namdar-chat-open');stopPolling();$('#chatLauncher')?.focus();
  }
  function newConversation(){
    if(state.busy)return;clearRemembered();welcome();renderActions([]);setMode();setStatus('New conversation ready.');
    try{window.turnstile?.reset?.()}catch{}state.captchaToken='';ensureTurnstile();$('#chatInput')?.focus();
  }
  async function sendMessage(forcedMessage='',renderUser=true){
    if(state.busy)return;const input=$('#chatInput'),message=String(forcedMessage||input?.value||'').trim();if(!message)return;
    state.lastFailed='';setStatus('');renderActions([]);if(renderUser){$('#chatSuggestions')?.classList.add('compact');$('#chatMessages')?.appendChild(makeBubble('customer',message));scrollMessages()}
    if(input){input.value='';resizeComposer()}busy(true);if(state.mode!=='human')showTyping(true);
    try{
      const data=await apiCall('/api/chat',{method:'POST',body:JSON.stringify({action:'message',sessionId:state.sessionId,guestToken:state.guestToken,name:$('#chatName')?.value.trim()||'',email:$('#chatEmail')?.value.trim()||'',message,turnstileToken:currentCaptcha()})});
      remember(data.session);state.staffOnline=data.staffOnline===true||state.staffOnline;setMode(data.assistantMode||data.session?.mode||state.mode);showTyping(false);
      state.lastCount+=1;
      if(data.reply){$('#chatMessages')?.appendChild(makeBubble('assistant',data.reply));state.lastCount+=1;renderActions(data.actions||[])}
      else if(state.mode==='human')setStatus('Message sent. A Namdar team member can continue this conversation here.','success');
      if(state.sessionId)$('#chatIdentity')?.classList.add('chat-identity-saved');scrollMessages();startPolling();
    }catch(error){
      showTyping(false);state.lastFailed=message;setStatus(error.message||'The message could not be sent.','error');const retry=$('#chatRetry');if(retry){retry.hidden=false;retry.onclick=()=>{retry.hidden=true;sendMessage(state.lastFailed,false)}}
      if(/security|captcha|verification|turnstile/i.test(error.message||''))ensureTurnstile();
    }finally{busy(false);$('#chatInput')?.focus()}
  }
  function mount(){
    const launcher=$('#chatLauncher'),widget=$('#chatWidget');if(!launcher||!widget)return false;
    const oldName=$('#chatName')?.value||'',oldEmail=$('#chatEmail')?.value||'';syncLegacy();
    launcher.textContent='Ask Namdar';launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-controls','chatWidget');
    widget.setAttribute('role','dialog');widget.setAttribute('aria-label','Ask Namdar');widget.setAttribute('aria-modal','false');
    widget.innerHTML=`<header class="chat-header"><div class="chat-brand"><span class="chat-avatar">N</span><div><strong>Ask Namdar</strong><small id="chatPresence">Instant help with Window Cleaning and bookings</small></div></div><div class="chat-header-actions"><span class="chat-mode-badge" id="chatModeBadge">Guided assistant</span><button id="chatNew" type="button" title="New conversation" aria-label="Start a new conversation">↻</button><button id="chatClose" type="button" aria-label="Close chat">×</button></div></header><div class="chat-messages" id="chatMessages" role="log" aria-live="polite" aria-relevant="additions"></div><div class="chat-suggestions" id="chatSuggestions" aria-label="Suggested questions"></div><div class="chat-actions" id="chatActions"></div><details class="chat-identity" id="chatIdentity"><summary>Optional contact details</summary><div><input id="chatName" autocomplete="name" placeholder="Your name (optional)" value="${esc(oldName)}"><input id="chatEmail" autocomplete="email" placeholder="Email (optional)" type="email" value="${esc(oldEmail)}"></div></details><div class="turnstile-slot hidden" id="chatTurnstile"></div><form id="chatForm"><label class="sr-only" for="chatInput">Message Namdar</label><textarea id="chatInput" rows="1" maxlength="4000" placeholder="Ask Namdar a question…" required></textarea><button class="primary-btn small" id="chatSend" type="submit">Send</button></form><div class="chat-form-foot"><span>Don’t share passwords or card details.</span><button id="chatRetry" class="text-link" type="button" hidden>Try again</button></div><p class="chat-status" id="chatStatus" aria-live="polite"></p><div class="chat-support-row"><span>Existing customer?</span><a href="/account?tab=support">Private support in My Namdar →</a></div>`;
    if(signedIn())$('#chatIdentity')?.classList.add('hidden');
    $('#chatClose').onclick=close;$('#chatNew').onclick=newConversation;launcher.onclick=open;$('#chatForm').onsubmit=e=>{e.preventDefault();sendMessage()};
    $('#chatInput').addEventListener('input',resizeComposer);$('#chatInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.open)close()});
    document.addEventListener('visibilitychange',()=>document.hidden?stopPolling():startPolling());
    welcome();setMode();loadMode();if(state.sessionId)openExisting();return true;
  }
  async function openExisting(){
    try{const data=await apiCall('/api/chat',{method:'POST',body:JSON.stringify({action:'poll',sessionId:state.sessionId,guestToken:state.guestToken})});remember(data.session);setMode(data.assistantMode||data.session?.mode||state.mode);renderHistory(data.messages||[])}catch{clearRemembered();welcome()}
  }
  const start=()=>{if(!mount())setTimeout(start,100)};start();
  window.NamdarChatExperience={open,close,newConversation,poll};
})();
