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
  function funnelVisitorId(){
    try{
      if(localStorage.getItem('namdar_cookie_choice')!=='marketing')return'';
      const key='namdar_stage1_funnel_visitor';let id=sessionStorage.getItem(key)||'';
      if(!id){id=crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');sessionStorage.setItem(key,id)}
      return id;
    }catch{return''}
  }
  const baseApi=window.api;
  if(typeof baseApi==='function')window.api=async function(path,options={}){
    const visitorId=funnelVisitorId(),method=String(options?.method||'GET').toUpperCase();let next=options;
    if(visitorId&&path==='/api/quote'&&method==='POST'){
      try{const body=typeof options.body==='string'?JSON.parse(options.body):(options.body||{});next={...options,body:JSON.stringify({...body,visitorId})}}catch{}
    }
    const data=await baseApi(path,next);
    if(visitorId&&String(path).startsWith('/api/postcode?')&&data?.ok){
      const serviceKey=document.querySelector('input[name="service"]:checked')?.value||'windows';
      fetch('/api/funnel-event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventType:'postcode_checked',visitorId,serviceKey,postcode:data.postcode||'',covered:data.coverage?.covered===true})}).catch(()=>{});
    }
    return data;
  };

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
  function windowQuoteEnhancements(){
    const form=$('#quoteForm'),dynamic=$('#dynamicFields'),frequency=$('#frequency'),extra=$('#extra'),notes=$('#quoteNotes');
    if(!form||!dynamic||!frequency||!extra||!notes)return;
    if(!dynamic.dataset.windowStage1){
      dynamic.innerHTML=`<div class="field-row"><label>Number of exterior windows<input id="units" type="number" min="1" max="5000" value="12"></label><label>Window style<select id="detail"><option value="1">Mostly standard windows</option><option value="1.15">Several large / bay windows</option><option value="1.28">Mixed shapes / difficult windows</option></select></label></div><div class="field-row"><label>Current condition<select id="windowCleanCondition"><option value="maintenance">Regularly cleaned / maintenance clean</option><option value="first_clean" selected>First clean with Namdar</option><option value="heavy">Not cleaned for a long time / heavy build-up</option></select></label><label>Access at the property<select id="windowAccessDetail"><option value="clear">Clear access around the windows</option><option value="gate">Side gate / locked access</option><option value="extension">Conservatory / extension below windows</option><option value="mixed">Several access complications</option></select></label></div>`;
      dynamic.dataset.windowStage1='1';
    }
    frequency.innerHTML='<option value="once">One-off / first clean</option><option value="4_weekly">Regular every 4 weeks</option><option value="8_weekly">Regular every 8 weeks</option><option value="12_weekly">Regular every 12 weeks</option>';
    extra.innerHTML='<option value="1">No additional glass</option><option value="1.12">Doors / a few extra glass panels</option><option value="1.28">Conservatory sides / roof lights / several extras</option><option value="1.5">Large conservatory or unusual extra glass</option>';
    const frequencyLabel=frequency.closest('label');if(frequencyLabel)frequencyLabel.childNodes[0].textContent='How often?';
    const extraLabel=extra.closest('label');if(extraLabel)extraLabel.childNodes[0].textContent='Extra glass to include';
    notes.placeholder='Parking or gate access, fragile areas, windows above conservatories/extensions, preferred days, anything else we should know...';
    let help=$('#windowQuoteHelp');
    if(!help){help=document.createElement('small');help.id='windowQuoteHelp';help.className='lookup-status';help.textContent='Frames and exterior sills are included in the request. First cleans, heavy build-up and unusual access are reviewed before the final price is confirmed.';notes.parentElement.insertBefore(help,notes);}
    const serviceStep=$('#quote-step-1');if(serviceStep)serviceStep.innerHTML='<span>01</span> Window cleaning';
    const serviceChoices=$('#serviceChoices');if(serviceChoices)serviceChoices.setAttribute('aria-label','Window Cleaning selected');
  }
  function appendWindowOperationsToNotes(){
    if(document.querySelector('input[name="service"]:checked')?.value!=='windows')return;
    const notes=$('#quoteNotes');if(!notes)return;
    const base=(notes.dataset.customerText??notes.value).replace(/\n?\[Window details\][\s\S]*$/,'').trim();
    notes.dataset.customerText=base;
    const condition=$('#windowCleanCondition')?.selectedOptions?.[0]?.textContent||'';
    const access=$('#windowAccessDetail')?.selectedOptions?.[0]?.textContent||'';
    const extra=$('#extra')?.selectedOptions?.[0]?.textContent||'';
    const frequency=$('#frequency')?.selectedOptions?.[0]?.textContent||'';
    const summary=`[Window details]\nCondition: ${condition}\nProperty access: ${access}\nFrequency: ${frequency}\nExtra glass: ${extra}`;
    notes.value=base?`${base}\n\n${summary}`:summary;
    setTimeout(()=>{if(notes.dataset.customerText!==undefined)notes.value=notes.dataset.customerText;},0);
  }
  $('#quoteForm')?.addEventListener('submit',appendWindowOperationsToNotes,true);

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
      if(copy)copy.textContent='Exterior glass, frames and sills with one-off or regular cleaning. Future Namdar services will appear here only when each stage is ready.';
      const heroEyebrow=document.querySelector('.hero .eyebrow');if(heroEyebrow)heroEyebrow.textContent='Window cleaning without the back-and-forth.';
      const heroTitle=document.querySelector('.hero h1');if(heroTitle)heroTitle.innerHTML='Clear windows.<br><em>A clearer booking process.</em>';
      const heroCopy=document.querySelector('.hero-copy > p');if(heroCopy)heroCopy.textContent='Check your postcode, get a guide estimate for exterior window cleaning, then receive a reviewed final quote before choosing an appointment.';
      const footer=document.querySelector('footer p');if(footer)footer.textContent='Window cleaning · More Namdar services will launch in stages';
      const mobileStrong=document.querySelector('#mobileConversionBar strong'),mobileText=document.querySelector('#mobileConversionBar span');
      if(mobileStrong)mobileStrong.textContent='Need window cleaning?';if(mobileText)mobileText.textContent='Check your postcode and get a guide estimate.';
      document.title='Namdar | Window Cleaning in London — Quote Online';
      const meta=document.querySelector('meta[name="description"]');if(meta)meta.content='Get a guide estimate for exterior window cleaning in Namdar service areas. Frames and exterior sills included in the request; final quotes are reviewed before booking.';
      windowQuoteEnhancements();
    }
    if(resultBadge){const active=document.querySelector('input[name="service"]:checked');if(active)resultBadge.textContent=`${serviceLabels[active.value]||'Namdar'} · GUIDE ESTIMATE`;}
    document.documentElement.dataset.liveServices=live.join(',');
  }
  applyServiceAvailability(safeDefault);
  fetch('/api/public-data',{headers:{Accept:'application/json'}}).then(r=>r.ok?r.json():Promise.reject(new Error('service status unavailable'))).then(d=>applyServiceAvailability(d.services||safeDefault)).catch(()=>applyServiceAvailability(safeDefault));
})();