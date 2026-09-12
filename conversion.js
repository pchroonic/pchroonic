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
  const resultBadge=$('#quoteResult .result-badge');
  $$('input[name="service"]').forEach(r=>r.addEventListener('change',()=>{if(r.checked&&resultBadge)resultBadge.textContent=`${serviceLabels[r.value]||'Namdar'} · GUIDE ESTIMATE`}));
})();
