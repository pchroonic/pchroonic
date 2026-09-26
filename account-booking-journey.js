(()=>{
  const VERSION='6.4.91-booking-calendar-1';
  const PENDING_KEY='namdar_pending_quote_journey';
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const params=new URLSearchParams(location.search),quoteId=params.get('quote')||'';
  let claimInFlight=null,authListenerAttached=false,scheduleDateKey='',scheduleMonthKey='';

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
      if(booking)next.textContent='Appointment requested — track confirmation and job progress in My bookings.';
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

  function safe(v=''){return String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
  function londonDateKey(value){
    const d=new Date(value);if(Number.isNaN(d.getTime()))return'';
    const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }
  function calendarDate(key){const [y,m,d]=String(key).split('-').map(Number);return new Date(Date.UTC(y,m-1,d||1))}
  function humanDate(key){return new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(calendarDate(key))}
  function humanMonth(key){return new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(calendarDate(`${key}-01`))}
  function shortTime(value){return new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value))}
  function scheduleRows(){
    const slots=typeof quoteScheduleSlots!=='undefined'&&Array.isArray(quoteScheduleSlots)?quoteScheduleSlots:[];
    return slots.map((slot,index)=>({slot,index,dateKey:londonDateKey(slot.startsAt)})).filter(x=>x.dateKey);
  }
  function scheduleLabel(slot){return String(slot?.label||`${shortTime(slot?.startsAt)}–${shortTime(slot?.endsAt)}`).trim()}
  function renderSchedulePicker(){
    const picker=$('#quoteSlotPicker'),select=$('#quoteScheduleSlot');if(!picker||!select)return;
    const rows=scheduleRows();
    if(!rows.length){
      const msg=select.options?.[0]?.textContent||'No available appointment windows found.';
      picker.innerHTML=`<div class="booking-slot-empty"><span aria-hidden="true">⌁</span><div><strong>Choose your appointment</strong><small>${safe(msg)}</small></div></div>`;
      return;
    }
    const grouped=new Map();for(const row of rows){if(!grouped.has(row.dateKey))grouped.set(row.dateKey,[]);grouped.get(row.dateKey).push(row)}
    const months=[...new Set(rows.map(x=>x.dateKey.slice(0,7)))].sort();
    const selectedIndex=/^\d+$/.test(select.value)?Number(select.value):-1,selectedRow=rows.find(x=>x.index===selectedIndex)||null;
    if(selectedRow)scheduleDateKey=selectedRow.dateKey;
    if(!scheduleDateKey||!grouped.has(scheduleDateKey))scheduleDateKey=rows[0].dateKey;
    if(!scheduleMonthKey||!months.includes(scheduleMonthKey))scheduleMonthKey=scheduleDateKey.slice(0,7);
    if(!months.includes(scheduleMonthKey))scheduleMonthKey=months[0];
    const monthIndex=months.indexOf(scheduleMonthKey),[year,month]=scheduleMonthKey.split('-').map(Number);
    const firstOffset=(new Date(Date.UTC(year,month-1,1)).getUTCDay()+6)%7,daysInMonth=new Date(Date.UTC(year,month,0)).getUTCDate(),cells=[];
    for(let i=0;i<firstOffset;i++)cells.push('<span class="booking-calendar-spacer" aria-hidden="true"></span>');
    for(let day=1;day<=daysInMonth;day++){
      const key=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,available=grouped.get(key)||[],active=key===scheduleDateKey,next=key===rows[0].dateKey;
      cells.push(`<button type="button" class="booking-calendar-day ${available.length?'available':''} ${active?'selected':''} ${next?'next-available':''}" data-schedule-day="${key}" ${available.length?'':'disabled'} aria-pressed="${active?'true':'false'}" aria-label="${safe(humanDate(key))}${available.length?`, ${available.length} available time window${available.length===1?'':'s'}`:', unavailable'}"><span>${day}</span>${available.length?'<i aria-hidden="true"></i>':''}</button>`);
    }
    const dayRows=grouped.get(scheduleDateKey)||[],selected=selectedRow&&selectedRow.dateKey===scheduleDateKey?selectedRow:null;
    const times=dayRows.map(row=>`<button type="button" class="booking-time-slot ${selected?.index===row.index?'selected':''}" data-schedule-slot="${row.index}" aria-pressed="${selected?.index===row.index?'true':'false'}"><span>${safe(scheduleLabel(row.slot))}</span><small>${row.index===rows[0].index?'Earliest available':'Available'}</small></button>`).join('');
    const summary=selected?`<div class="booking-slot-summary selected" aria-live="polite"><span aria-hidden="true">✓</span><div><small>Selected appointment</small><strong>${safe(humanDate(selected.dateKey))} · ${safe(scheduleLabel(selected.slot))}</strong></div></div>`:`<div class="booking-slot-summary" aria-live="polite"><span aria-hidden="true">→</span><div><small>Next step</small><strong>Choose a time window to continue</strong></div></div>`;
    picker.innerHTML=`<div class="booking-calendar-card"><div class="booking-calendar-head"><div><small>Step 1</small><strong>Select a day</strong></div><div class="booking-calendar-nav"><button type="button" data-schedule-month="-1" aria-label="Previous available month" ${monthIndex<=0?'disabled':''}>‹</button><strong>${safe(humanMonth(scheduleMonthKey))}</strong><button type="button" data-schedule-month="1" aria-label="Next available month" ${monthIndex>=months.length-1?'disabled':''}>›</button></div></div><div class="booking-calendar-weekdays" aria-hidden="true"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div><div class="booking-calendar-grid">${cells.join('')}</div><div class="booking-calendar-legend"><span><i></i> Available</span><small>Only dates with open Namdar windows can be selected.</small></div></div><div class="booking-slot-times"><div class="booking-slot-times-head"><div><small>Step 2</small><strong>Select a time</strong></div>${scheduleDateKey===rows[0].dateKey?'<span>Next available</span>':''}</div><h4>${safe(humanDate(scheduleDateKey))}</h4><div class="booking-time-grid">${times}</div>${summary}<p class="booking-timezone-note">Times shown in London time.</p></div>`;
  }
  function installSchedulePicker(){
    const select=$('#quoteScheduleSlot');if(!select||$('#quoteSlotPicker'))return;
    const label=select.closest('label');if(!label)return;
    label.classList.add('booking-slot-native-label');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
    const picker=document.createElement('section');picker.id='quoteSlotPicker';picker.className='booking-slot-picker';picker.setAttribute('aria-label','Choose an available appointment');label.insertAdjacentElement('beforebegin',picker);
    picker.addEventListener('click',e=>{
      const day=e.target.closest?.('[data-schedule-day]');if(day&&!day.disabled){scheduleDateKey=day.dataset.scheduleDay;scheduleMonthKey=scheduleDateKey.slice(0,7);select.value='';renderSchedulePicker();return}
      const nav=e.target.closest?.('[data-schedule-month]');if(nav&&!nav.disabled){const rows=scheduleRows(),months=[...new Set(rows.map(x=>x.dateKey.slice(0,7)))].sort(),i=months.indexOf(scheduleMonthKey),next=months[i+Number(nav.dataset.scheduleMonth)];if(next){scheduleMonthKey=next;const first=rows.find(x=>x.dateKey.startsWith(next));if(first)scheduleDateKey=first.dateKey;select.value='';renderSchedulePicker()}return}
      const slot=e.target.closest?.('[data-schedule-slot]');if(slot){select.value=slot.dataset.scheduleSlot;select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));renderSchedulePicker()}
    });
    select.addEventListener('change',renderSchedulePicker);renderSchedulePicker();
  }

  function enhanceScheduling(){
    installSchedulePicker();
    if(typeof openQuoteSchedule==='function'&&!openQuoteSchedule.__bookingJourney){
      const base=openQuoteSchedule;
      const wrapped=async id=>{scheduleDateKey='';scheduleMonthKey='';renderSchedulePicker();await base(id);const field=$('#quoteScheduleAddress'),q=(typeof customerQuoteCache!=='undefined'?customerQuoteCache:[]).find(x=>x.id===id),saved=requestedAddress(q);if(field&&!field.value.trim()&&saved)field.value=saved;let note=$('#quoteScheduleJourneyNote');if(!note){note=document.createElement('p');note.id='quoteScheduleJourneyNote';note.className='quote-schedule-journey-note';note.textContent='Your accepted final price stays unchanged unless the job scope changes. The selected slot remains a request until Namdar confirms it.';$('#quoteScheduleDialog .modal-card h3')?.insertAdjacentElement('afterend',note)}renderSchedulePicker()};
      wrapped.__bookingJourney=true;openQuoteSchedule=wrapped;
    }
  }

  injectStyles();authContinuation();observeQuotes();enhanceScheduling();activateQuoteClaim();
})();
