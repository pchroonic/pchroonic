(()=>{
  const VERSION='6.4.32-booking-journey-1';
  const PENDING_KEY='namdar_pending_quote_journey';
  const $=s=>document.querySelector(s);
  const safeText=v=>String(v??'').trim();

  function injectStyles(){
    if(document.querySelector('link[data-booking-journey]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href=`/booking-journey.css?v=${VERSION}`;link.dataset.bookingJourney='1';document.head.appendChild(link);
  }

  function moveLocationFirst(){
    const form=$('#quoteForm'),propertyStep=$('#quote-step-2'),postcode=$('#postcode');
    if(!form||!propertyStep||!postcode||$('#bookingJourneyLocation'))return;
    const postcodeLabel=postcode.closest('label'),row=postcodeLabel?.parentElement;
    const check=$('#quotePostcodeStatus')?.closest('.quote-postcode-check'),choice=$('#quoteAddressChoiceWrap');
    const box=document.createElement('section');box.id='bookingJourneyLocation';box.className='booking-journey-location';
    box.innerHTML='<div class="booking-journey-location-head"><div><span class="mini-label">FIRST</span><h3>Check your postcode</h3><p>We confirm Window Cleaning coverage before you spend time completing the rest of the request.</p></div><span class="booking-journey-live">Window Cleaning · available now</span></div>';
    if(postcodeLabel)box.appendChild(postcodeLabel);if(check)box.appendChild(check);if(choice)box.appendChild(choice);
    propertyStep.parentNode.insertBefore(box,propertyStep);
    if(row&&!row.querySelector('label'))row.remove();
    const step1=$('#quote-step-1');if(step1)step1.innerHTML='<span>01</span> Location';
    const progress=[...document.querySelectorAll('#quoteProgress a')],labels=['Location','Property','Job','Photos','Details','Extras'];
    progress.forEach((a,i)=>{if(labels[i])a.textContent=labels[i]});
  }

  function collapseExtras(){
    const step=$('#quote-step-6');if(!step||step.closest('details'))return;
    const fields=step.nextElementSibling,status=$('#discountStatus');if(!fields)return;
    const details=document.createElement('details');details.className='booking-journey-extras';
    const summary=document.createElement('summary');summary.textContent='Have a promotion or Namdar reward code?';details.appendChild(summary);
    step.parentNode.insertBefore(details,step);details.appendChild(step);details.appendChild(fields);if(status)details.appendChild(status);
  }

  async function ensureCoverage(){
    const postcode=$('#postcode');if(!postcode)return true;
    if(postcode.dataset.verified!=='true'&&typeof verifyQuotePostcode==='function'){
      const ok=await verifyQuotePostcode();if(!ok){postcode.focus();throw new Error('Check your postcode before calculating the estimate.');}
    }
    if(postcode.dataset.covered==='false'){
      postcode.focus();throw new Error('Window Cleaning is not currently available at this postcode.');
    }
    return true;
  }

  function autoVerifyPostcode(){
    const postcode=$('#postcode');if(!postcode)return;
    let timer=null;
    const run=()=>{if(postcode.value.trim().replace(/\s+/g,'').length<5||postcode.dataset.verified==='true')return;ensureCoverage().catch(()=>{});};
    postcode.addEventListener('blur',run);
    postcode.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(run,650)});
  }

  function wrapApi(){
    if(typeof window.api!=='function'||window.api.__bookingJourney)return;
    const base=window.api;
    const wrapped=async(path,options={})=>{
      if(path==='/api/quote'&&String(options?.method||'GET').toUpperCase()==='POST')await ensureCoverage();
      return base(path,options);
    };
    wrapped.__bookingJourney=true;window.api=wrapped;
  }

  function pendingContext(q){
    const address=(()=>{try{return selectedQuoteAddress?.displayAddress||selectedQuoteAddress?.address||''}catch{return''}})();
    return {quoteId:q?.id||'',email:safeText(q?.email||$('#quoteEmail')?.value),postcode:safeText($('#postcode')?.value),serviceKey:'windows',estimate:Number(q?.estimate||0),address:safeText(address),createdAt:Date.now()};
  }

  function renderResultJourney(q){
    const result=$('#quoteResult'),button=$('#bookEstimate');if(!result||!button||!q?.id)return;
    let journey=$('#quoteResultJourney');
    if(!journey){journey=document.createElement('div');journey.id='quoteResultJourney';journey.className='quote-result-journey';journey.innerHTML='<strong>What happens next</strong><div><span class="complete">1</span><p><b>Estimate saved</b><small>Your request is with Namdar.</small></p></div><div><span>2</span><p><b>Final quote reviewed</b><small>We confirm the price after reviewing access and job details.</small></p></div><div><span>3</span><p><b>Accept & choose a slot</b><small>Booking starts only after you accept the final quote.</small></p></div>';button.parentNode.insertBefore(journey,button);}
    const signedIn=!!(()=>{try{return currentSession}catch{return null}})();
    button.textContent=signedIn?'Continue in My Namdar':'Create / sign in to continue';button.disabled=false;
    try{sessionStorage.setItem(PENDING_KEY,JSON.stringify(pendingContext(q)))}catch{}
  }

  function wrapShowQuote(){
    if(typeof window.showQuote!=='function'||window.showQuote.__bookingJourney)return;
    const base=window.showQuote;
    const wrapped=q=>{base(q);renderResultJourney(q)};wrapped.__bookingJourney=true;window.showQuote=wrapped;
  }

  function ownQuoteButton(){
    const button=$('#bookEstimate');if(!button)return;
    button.addEventListener('click',event=>{
      let quote=null;try{quote=latestQuote}catch{}
      if(!quote?.id)return;
      event.preventDefault();event.stopImmediatePropagation();
      const target=new URL('/account',location.origin);target.searchParams.set('tab','quotes');target.searchParams.set('quote',quote.id);target.searchParams.set('journey','quote');location.href=target.pathname+target.search;
    },true);
  }

  function updateSubmitCopy(){
    const btn=$('#quoteSubmit');if(btn)btn.textContent='Save my guide estimate';
    const top=document.querySelector('.quote-conversion-top span');if(top)top.textContent='Check coverage first, then complete the job details. Photos and codes are optional.';
  }

  injectStyles();moveLocationFirst();collapseExtras();autoVerifyPostcode();wrapApi();wrapShowQuote();ownQuoteButton();updateSubmitCopy();
})();
