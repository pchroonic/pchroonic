(()=>{
  const VERSION=2,KEY='namdar_cookie_choice',META='namdar_privacy_choice_meta';
  const get=()=>{try{return localStorage.getItem(KEY)||''}catch{return''}};
  function save(choice){const previous=get();try{localStorage.setItem(KEY,choice);localStorage.setItem(META,JSON.stringify({choice,version:VERSION,updatedAt:new Date().toISOString()}))}catch{}close();if(choice==='marketing'&&typeof enableAds==='function')enableAds();if(previous==='marketing'&&choice==='essential')location.reload()}
  function close(){document.getElementById('namdarCookieSettings')?.classList.add('hidden')}
  function open(){const box=document.getElementById('namdarCookieSettings');if(!box)return;const choice=get(),state=box.querySelector('[data-cookie-current]');if(state)state.textContent=choice==='marketing'?'Optional advertising allowed':choice==='essential'?'Essential only':'No choice saved yet';box.classList.remove('hidden');box.querySelector('button[data-cookie-choice="essential"]')?.focus()}
  function install(){
    if(document.getElementById('namdarCookieSettings'))return;
    const footer=document.querySelector('footer');if(footer){const links=footer.querySelector('div')||footer;const b=document.createElement('button');b.type='button';b.className='cookie-settings-link';b.textContent='Cookie settings';b.onclick=open;links.appendChild(b)}
    const box=document.createElement('section');box.id='namdarCookieSettings';box.className='cookie-banner hidden';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Cookie settings');box.innerHTML='<div><strong>Cookie settings</strong><p>Essential storage keeps secure account and requested features working. Optional advertising is only loaded when you allow it.</p><small>Current choice: <b data-cookie-current></b></small></div><div class="cookie-actions"><button class="ghost-btn" type="button" data-cookie-choice="essential">Essential only</button><button class="primary-btn small" type="button" data-cookie-choice="marketing">Allow optional advertising</button><button class="text-link" type="button" data-cookie-close>Close</button><a href="/cookies">Cookie Policy</a></div>';document.body.appendChild(box);
    box.querySelector('[data-cookie-choice="essential"]').onclick=()=>save('essential');box.querySelector('[data-cookie-choice="marketing"]').onclick=()=>save('marketing');box.querySelector('[data-cookie-close]').onclick=close;
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
    document.getElementById('essentialOnly')?.addEventListener('click',()=>{try{localStorage.setItem(META,JSON.stringify({choice:'essential',version:VERSION,updatedAt:new Date().toISOString()}))}catch{}});
    document.getElementById('allowMarketing')?.addEventListener('click',()=>{try{localStorage.setItem(META,JSON.stringify({choice:'marketing',version:VERSION,updatedAt:new Date().toISOString()}))}catch{}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.NamdarPrivacyChoices={open,get,save};
})();
