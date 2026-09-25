(()=>{const h=document.querySelector('.site-header'),b=document.querySelector('.mobile-menu');if(h&&b){const close=()=>{h.classList.remove('nav-open');b.setAttribute('aria-expanded','false');b.textContent='☰'};b.addEventListener('click',()=>{const o=!h.classList.contains('nav-open');h.classList.toggle('nav-open',o);b.setAttribute('aria-expanded',String(o));b.textContent=o?'×':'☰'});h.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));document.addEventListener('keydown',e=>{if(e.key==='Escape')close()})}})();

function initConversionProof(){
  if(!document.body.classList.contains('seo-page'))return;
  const hero=document.querySelector('.seo-hero');
  if(hero&&!document.querySelector('.seo-conversion-proof'))hero.insertAdjacentHTML('afterend','<div class="seo-conversion-proof"><span>✓ Postcode checked</span><span>✓ Final quote reviewed</span><span>✓ Accept online</span><span>✓ Choose an available slot</span></div>');
  if(!document.querySelector('#mobileConversionBar'))document.body.insertAdjacentHTML('beforeend','<aside id="mobileConversionBar" class="mobile-conversion-bar"><div><strong>Ready to price the job?</strong><span>Start with a guide estimate.</span></div><a class="primary-btn small" href="/#quote">Get estimate</a></aside>');
}
initConversionProof();

(()=>{
  if(!document.body.classList.contains('seo-page'))return;
  const path=location.pathname.replace(/\/+$/,'');
  const slug=path.startsWith('/services/')?path.slice('/services/'.length):'';
  if(!slug)return;
  const names={
    'window-cleaning':'Window Cleaning','gutter-cleaning':'Gutter Cleaning','jet-washing':'Patio & Jet Washing',
    'roof-cleaning':'Roof Cleaning','handyman':'Handyman Services','3d-property-tours':'3D Property Tours'
  };
  const safeDefault=Object.keys(names).map((s,i)=>({slug:s,name:names[s],status:s==='window-cleaning'?'live':'planned',live:s==='window-cleaning',public:s==='window-cleaning',stage:i+1}));
  const statusCopy={
    planned:['Future Namdar service','This service is prepared for a future Namdar stage, but we are not offering it yet.'],
    coming_soon:['Coming soon','This service is being prepared for launch. New quotes are not open yet.'],
    paused:['Temporarily unavailable','This service is currently paused for new work. Existing agreed work is not affected.'],
    retired:['No longer available','Namdar is not accepting new work for this service.']
  };
  function robots(block){
    let meta=document.querySelector('meta[data-service-gate-robots]');
    if(block&&!meta){meta=document.createElement('meta');meta.name='robots';meta.dataset.serviceGateRobots='1';document.head.appendChild(meta)}
    if(meta){if(block)meta.content='noindex,follow';else meta.remove();}
  }
  function current(services){return (services||[]).find(s=>s.slug===slug)||safeDefault.find(s=>s.slug===slug)||{slug,name:names[slug]||'This service',status:'planned'};}
  function related(services){
    const bySlug=new Map((services||safeDefault).map(s=>[s.slug,s]));
    document.querySelectorAll('.seo-link-card').forEach(a=>{
      const target=(a.getAttribute('href')||'').match(/^\/services\/([^?#]+)/)?.[1],service=target?bySlug.get(target):null;
      a.hidden=Boolean(service)&&!['live','coming_soon','paused'].includes(service.status);
      if(service?.status==='coming_soon'){const span=a.querySelector('span');if(span)span.textContent='Coming soon →'}
      if(service?.status==='paused'){const span=a.querySelector('span');if(span)span.textContent='Temporarily paused →'}
    });
  }
  function setPublishedWorkAvailability(jobs){document.querySelectorAll('[data-real-work-link]').forEach(a=>a.hidden=!(Array.isArray(jobs)&&jobs.length));}\n  function apply(services){
    const service=current(services),live=service.status==='live';
    robots(!live);
    const old=document.getElementById('serviceAvailabilityNotice');if(old)old.remove();
    if(!live){
      const [title,copy]=statusCopy[service.status]||statusCopy.planned,hero=document.querySelector('.seo-hero');
      if(hero){
        const notice=document.createElement('aside');notice.id='serviceAvailabilityNotice';notice.className='seo-callout';
        notice.innerHTML=`<strong>${title}</strong><p>${copy}</p><a class="primary-btn" href="/?service=windows#quote">Window cleaning is available now</a>`;
        hero.appendChild(notice);
        const eyebrow=hero.querySelector('.eyebrow');if(eyebrow)eyebrow.textContent=title;
        hero.querySelectorAll('.hero-actions .primary-btn').forEach(a=>{a.href='/?service=windows#quote';a.textContent='Get a window cleaning quote'});
      }
      document.querySelectorAll('.seo-callout .primary-btn').forEach(a=>{if(a.closest('#serviceAvailabilityNotice'))return;a.href='/?service=windows#quote';a.textContent='Window cleaning is available now'});
      const bar=document.querySelector('#mobileConversionBar');if(bar){const strong=bar.querySelector('strong'),span=bar.querySelector('span'),a=bar.querySelector('a');if(strong)strong.textContent='Window cleaning is live now';if(span)span.textContent=`${service.name} is not accepting new quotes.`;if(a){a.href='/?service=windows#quote';a.textContent='Quote windows'}}
    }
    related(services);
    const footer=document.querySelector('footer p');if(footer)footer.textContent='Window cleaning · More Namdar services will launch in stages';
    document.documentElement.dataset.serviceStatus=service.status;
  }
  apply(safeDefault);
  setPublishedWorkAvailability([]);
  fetch('/api/public-data',{headers:{Accept:'application/json'}}).then(r=>r.ok?r.json():Promise.reject(new Error('service status unavailable'))).then(d=>{apply(d.services||safeDefault);setPublishedWorkAvailability(d.jobs||[])}).catch(()=>{apply(safeDefault);setPublishedWorkAvailability([])});
})();
