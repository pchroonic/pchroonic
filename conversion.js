(()=>{
  const resetHorizontalViewport=()=>{
    if(!document.body?.classList.contains('conversion-home'))return;
    const y=window.scrollY||document.documentElement.scrollTop||0;
    document.documentElement.scrollLeft=0;
    document.body.scrollLeft=0;
    if(window.scrollX!==0)window.scrollTo(0,y);
  };
  resetHorizontalViewport();
  requestAnimationFrame(resetHorizontalViewport);
  window.addEventListener('pageshow',()=>requestAnimationFrame(resetHorizontalViewport));
  window.addEventListener('resize',()=>requestAnimationFrame(resetHorizontalViewport),{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(resetHorizontalViewport,120),{passive:true});

  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const progress=$('#quoteProgress'), labels=$$('#quoteForm .step-label[data-quote-step]');
  if(progress&&labels.length){
    const links=$$('#quoteProgress a');
    const setStep=n=>links.forEach((a,i)=>a.classList.toggle('active',i===n-1));
    labels.forEach((label,i)=>{
      const next=labels[i+1];
      let node=label.nextElementSibling;
      while(node&&node!==next){node.addEventListener?.('focusin',()=>setStep(i+1));node.addEventListener?.('click',()=>setStep(i+1));node=node.nextElementSibling}
    });
    if('IntersectionObserver'in window){
      const obs=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(visible)setStep(Number(visible.target.dataset.quoteStep||1))},{rootMargin:'-20% 0px -65% 0px',threshold:[0,.25,.5]});
      labels.forEach(x=>obs.observe(x));
    }
  }
  const bar=$('#mobileConversionBar'), quote=$('#quote');
  if(bar&&quote&&'IntersectionObserver'in window){
    const obs=new IntersectionObserver(([entry])=>bar.classList.toggle('is-hidden',entry.isIntersecting),{threshold:.05});obs.observe(quote);
  }
  const serviceLabels={windows:'Window cleaning',gutters:'Gutter cleaning',roof:'Roof cleaning',jetwash:'Patio & jet washing',handyman:'Handyman',tour3d:'3D property tour'};
  const serviceKeys=Object.keys(serviceLabels);
  const resultBadge=$('#quoteResult .result-badge');
  $$('input[name="service"]').forEach(r=>r.addEventListener('change',()=>{if(r.checked&&resultBadge)resultBadge.textContent=`${serviceLabels[r.value]||'Namdar'} · GUIDE ESTIMATE`}));

  const safeDefault=serviceKeys.map((key,i)=>({serviceKey:key,name:serviceLabels[key],status:key==='windows'?'live':'planned',live:key==='windows',quotable:key==='windows',public:key==='windows',stage:i+1}));
  const statusText={coming_soon:'Coming soon',paused:'Temporarily paused'};
  function statusMap(services){return new Map((Array.isArray(services)&&services.length?services:safeDefault).map(s=>[s.serviceKey,s]));}
  function statusBadge(card,status){
    card.querySelector('[data-service-status-badge]')?.remove();
    if(!statusText[status])return;
    const badge=document.createElement('span');badge.dataset.serviceStatusBadge='1';badge.className='mini-label';badge.textContent=statusText[status];
    card.prepend(badge);
  }
  function applyServiceAvailability(services){
    const map=statusMap(services),live=[];
    for(const key of serviceKeys){
      const service=map.get(key)||safeDefault.find(x=>x.serviceKey===key),isLive=service?.status==='live',publicCard=isLive||service?.status==='coming_soon'||service?.status==='paused';
      if(isLive)live.push(key);
      const priceLink=document.querySelector(`[data-service-link="${key}"]`),card=priceLink?.closest('.service-card');
      if(card){card.hidden=!publicCard;statusBadge(card,service?.status);}
      if(priceLink){
        if(!priceLink.dataset.liveHref)priceLink.dataset.liveHref=priceLink.getAttribute('href')||'#quote';
        if(!priceLink.dataset.liveText)priceLink.dataset.liveText=priceLink.textContent||'Get quote';
        if(isLive){priceLink.href=priceLink.dataset.liveHref;priceLink.textContent=priceLink.dataset.liveText;priceLink.removeAttribute('aria-disabled');priceLink.onclick=null;}
        else if(publicCard){priceLink.href='#services';priceLink.textContent=statusText[service?.status]||'Not available';priceLink.setAttribute('aria-disabled','true');priceLink.onclick=e=>e.preventDefault();}
      }
      const radio=document.querySelector(`input[name="service"][value="${key}"]`),radioLabel=radio?.closest('label');
      if(radio){radio.disabled=!isLive;if(radioLabel)radioLabel.hidden=!isLive;}
    }
    const checked=document.querySelector('input[name="service"]:checked');
    if(!checked||checked.disabled){
      const first=live.map(k=>document.querySelector(`input[name="service"][value="${k}"]`)).find(Boolean);
      if(first){first.checked=true;first.dispatchEvent(new Event('change',{bubbles:true}));if(typeof renderFields==='function')renderFields();}
    }
    const tour=map.get('tour3d'),show3d=tour?.status==='live'||tour?.status==='coming_soon'||tour?.status==='paused';
    document.querySelectorAll('.nav-links a[href="#3d"]').forEach(x=>x.hidden=!show3d);
    const tourSection=document.getElementById('3d');if(tourSection)tourSection.hidden=!show3d;
    const head=document.querySelector('#services .section-head h2'),copy=document.querySelector('#services .section-head > p');
    if(live.length===1&&live[0]==='windows'){
      if(head)head.textContent='Window cleaning is available now.';
      if(copy)copy.textContent='Namdar is starting with one service and building carefully. Future services are already prepared and will appear here when each stage is ready.';
      const footer=document.querySelector('footer p');if(footer)footer.textContent='Window cleaning · More Namdar services will launch in stages';
      const mobileStrong=document.querySelector('#mobileConversionBar strong'),mobileText=document.querySelector('#mobileConversionBar span');
      if(mobileStrong)mobileStrong.textContent='Need window cleaning?';if(mobileText)mobileText.textContent='Start with a guide estimate.';
      document.title='Namdar | Window Cleaning in London — Quote Online';
      const meta=document.querySelector('meta[name="description"]');if(meta)meta.content='Get a guide estimate for professional window cleaning in Namdar service areas. Final quotes are reviewed before customers book online.';
    }
    if(resultBadge){const active=document.querySelector('input[name="service"]:checked');if(active)resultBadge.textContent=`${serviceLabels[active.value]||'Namdar'} · GUIDE ESTIMATE`;}
    document.documentElement.dataset.liveServices=live.join(',');
  }
  applyServiceAvailability(safeDefault);
  fetch('/api/public-data',{headers:{Accept:'application/json'}}).then(r=>r.ok?r.json():Promise.reject(new Error('service status unavailable'))).then(d=>applyServiceAvailability(d.services||safeDefault)).catch(()=>applyServiceAvailability(safeDefault));
})();
