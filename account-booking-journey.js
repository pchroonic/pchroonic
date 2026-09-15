(()=>{
  const VERSION='6.4.32-booking-journey-1';
  const PENDING_KEY='namdar_pending_quote_journey';
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const params=new URLSearchParams(location.search),quoteId=params.get('quote')||'';
  let claimInFlight=null,authListenerAttached=false;

  function pending(){try{const d=JSON.parse(sessionStorage.getItem(PENDING_KEY)||'null');return d&&d.quoteId===quoteId?d:null}catch{return null}}
  function masked(email=''){const [name,domain]=String(email).split('@');if(!domain)return'';return `${(name||'').slice(0,2)}•••@${domain}`}
  function injectStyles(){if(document.querySelector('link[data-booking-journey]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href=`/booking-journey.css?v=${VERSION}`;link.dataset.bookingJourney='1';document.head.appendChild(link)}

  function authContinuation(){
    const d=pending(),auth=$('#authSection .account-card');if(!d||!auth||$('#accountJourneyBanner'))return;
    const banner=document.createElement('div');banner.id='accountJourneyBanner';banner.className='account-journey-banner';banner.innerHTML=`<strong>Continue your Window Cleaning quote</strong><span>Sign in or create an account with ${masked(d.email)||'the same email used for the estimate'} so Namdar can attach the saved request securely.</span>`;auth.prepend(banner);
    if(d.email){const login=$('#loginEmail'),reg=$('#regEmail');if(login&&!login.value)login.value=d.email;if(reg&&!reg.value)reg.value=d.email;}
  }

  async function waitForAuth(timeoutMs=10000){
    const start=Date.now();
    while(Date.now()-start<timeoutMs){
      try{if(typeof sb!=='undefined'&&sb?.auth)return sb.auth}catch{}
      await new Promise(r=>setTimeout(r,150));
    }
    return null;
  }

  async function claimQuoteForSession(session){
    if(!quoteId||params.get('journey')!=='quote'||!session)return;
    const key=`namdar_quote_claimed_${quoteId}`;if(sessionStorage.getItem(key)==='1')return;
    if(claimInFlight)return claimInFlight;
    claimInFlight=(async()=>{
      try{
        const result=await api('/api/customer-quote-claim',{method:'POST',body:JSON.stringify({quoteId})});
        sessionStorage.setItem(key,'1');
        if(result.claimed||result.alreadyOwned){
          try{sessionStorage.removeItem(PENDING_KEY)}catch{}
          if(typeof loadPortal==='function')await loadPortal(session);
          if(typeof applyAccountDestination==='function')applyAccountDestination();
          const alert=$('#accountAlert');if(alert){alert.classList.remove('hidden');alert.textContent=result.claimed?'✓ Your saved quote is now linked to this Namdar account.':'✓ Your quote is ready in My Namdar.';}
        }
      }catch(error){
        const alert=$('#accountAlert');if(alert&&/same email/i.test(error.message||'')){alert.classList.remove('hidden');alert.textContent=error.message;}
      }finally{claimInFlight=null}
    })();
    return claimInFlight;
  }

  async function activateQuoteClaim(){
    if(!quoteId||params.get('journey')!=='quote')return;
    const auth=await waitForAuth();if(!auth)return;
    const {data}=await auth.getSession().catch(()=>({data:{session:null}}));if(data?.session)await claimQuoteForSession(data.session);
    if(!authListenerAttached){authListenerAttached=true;auth.onAuthStateChange((_event,session)=>{if(session)claimQuoteForSession(session).catch(()=>{})});}
  }

  function quoteStages(q,booking){
    const response=q.customer_response||'pending',finalReady=q.final_price!=null&&['sent','approved'].includes(q.status),accepted=response==='accepted';
    const levels=[1,finalReady?2:1,response!=='pending'?3:(finalReady?2:1),booking?4:(accepted?3:(response!=='pending'?3:(finalReady?2:1)))];
    const active=booking?0:accepted?4:finalReady&&response==='pending'?3:2;
    return {levels,active,finalReady,accepted,response};
  }

  function decorateQuotes(){
    for(const card of $$('[data-quote-card]')){
      if(card.querySelector('.customer-quote-journey'))continue;
      const id=card.dataset.quoteCard,q=(typeof customerQuoteCache!=='undefined'?customerQuoteCache:[]).find(x=>x.id===id);if(!q)continue;
      const booking=(typeof customerJobCache!=='undefined'?customerJobCache:[]).find(x=>x.quoteId===id&&!['cancelled'].includes(x.status));
      const state=quoteStages(q,booking),track=document.createElement('div');track.className='customer-quote-journey';
      const labels=['Request','Final quote','Decision','Appointment'];
      track.innerHTML=labels.map((label,i)=>`<span class="${booking||state.levels[i]>=i+1?'complete':state.active===i+1?'active':''}">${label}</span>`).join('');
      const next=document.createElement('p');next.className='customer-quote-next';
      if(booking)next.textContent=booking.status==='confirmed'?'Appointment confirmed — track your job in My bookings.':booking.status==='completed'?'Job completed — view the details in My bookings.':'Appointment requested — track confirmation in My bookings.';
      else if(state.accepted)next.textContent='Next: choose one of the available appointment windows.';
      else if(state.finalReady&&state.response==='pending')next.textContent='Next: review the final price, then accept or decline it.';
      else if(state.response==='declined')next.textContent='This quote was declined. Request a new quote if the scope changes.';
      else next.textContent='Namdar is reviewing your request. You do not need to do anything yet.';
      const price=card.querySelector('.customer-quote-price');if(price){price.insertAdjacentElement('afterend',track);track.insertAdjacentElement('afterend',next)}else card.append(track,next);
    }
  }

  function observeQuotes(){const root=$('#accountQuotes');if(!root)return;new MutationObserver(decorateQuotes).observe(root,{childList:true,subtree:true});decorateQuotes()}

  function requestedAddress(q){
    const direct=String(q?.inputs?.requestedAddress||'').trim();if(direct)return direct;
    const notes=String(q?.inputs?.notes||''),match=notes.match(/\[Requested address\]\s*\n([^\n]+)/i);return match?.[1]?.trim()||'';
  }

  function enhanceScheduling(){
    if(typeof openQuoteSchedule==='function'&&!openQuoteSchedule.__bookingJourney){
      const base=openQuoteSchedule;
      const wrapped=async id=>{const field=$('#quoteScheduleAddress'),q=(typeof customerQuoteCache!=='undefined'?customerQuoteCache:[]).find(x=>x.id===id),saved=requestedAddress(q);if(field&&!field.value.trim()&&saved)field.value=saved;let note=$('#quoteScheduleJourneyNote');if(!note){note=document.createElement('p');note.id='quoteScheduleJourneyNote';note.className='quote-schedule-journey-note';note.textContent='Your accepted final price stays unchanged unless the job scope changes. The confirmation status will be shown when you submit your appointment.';$('#quoteScheduleDialog .modal-card h3')?.insertAdjacentElement('afterend',note)}await base(id);if(field&&!field.value.trim()&&saved)field.value=saved};
      wrapped.__bookingJourney=true;openQuoteSchedule=wrapped;
    }
  }

  injectStyles();authContinuation();observeQuotes();enhanceScheduling();activateQuoteClaim();
})();
