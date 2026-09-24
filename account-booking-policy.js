(()=>{
  const VERSION='6.4.35-payment-policy-engine-1';
  const POLICY_VERSION='2026-09-15-v1';
  const WINDOW_HOURS=48;
  const $=s=>document.querySelector(s);
  const money=v=>Number(v||0).toLocaleString('en-GB',{style:'currency',currency:'GBP'});
  let presentedPaymentRevision=null,paymentTermsLoading=false;

  function injectStyles(){
    if(document.querySelector('link[data-booking-policy]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href=`/booking-policy.css?v=${VERSION}`;link.dataset.bookingPolicy='1';document.head.appendChild(link);
  }

  function policyPanel(){
    const dlg=$('#quoteScheduleDialog .modal-card'),submit=$('#submitQuoteSchedule');if(!dlg||!submit)return null;
    let panel=$('#bookingPolicyPanel');if(panel)return panel;
    panel=document.createElement('section');panel.id='bookingPolicyPanel';panel.className='booking-policy-panel';
    panel.innerHTML=`<div class="booking-policy-head"><div><strong>Booking, cancellation & payment terms</strong><small>Shown before you request the appointment.</small></div><a href="/terms" target="_blank" rel="noopener">Read full Terms</a></div>
      <div id="bookingPaymentCommitment" class="booking-payment-commitment" aria-live="polite"><strong>Payment terms</strong><p>Choose an accepted quote to load the payment terms for this booking.</p></div>
      <ul>
        <li><strong>More than ${WINDOW_HOURS} hours:</strong> a booking deposit is normally refunded or can be moved to a replacement appointment.</li>
        <li><strong>Within ${WINDOW_HOURS} hours, no-show or no agreed access:</strong> Namdar may retain some or all of a deposit only to cover a reasonable direct loss, taking account of savings and whether the slot can be filled.</li>
        <li><strong>If Namdar cancels:</strong> if no replacement appointment is agreed, payments for the unprovided service are refunded.</li>
      </ul>
      <p class="booking-policy-statutory">Your statutory consumer rights, including any applicable 14-day cancellation right for an online service contract, are not replaced by this policy.</p>
      <label class="consent required-consent booking-policy-consent"><input id="bookingPolicyAccept" type="checkbox"><span>I have read and agree to Namdar's <a href="/terms" target="_blank" rel="noopener">Terms & Conditions</a>, including the ${WINDOW_HOURS}-hour cancellation/deposit policy and the payment terms shown above.</span></label>
      <label class="consent required-consent booking-policy-consent"><input id="bookingEarlyServiceRequest" type="checkbox"><span>If my agreed appointment falls within an applicable 14-day statutory cancellation period, I expressly request Namdar to provide the service on that date. I understand that if the service is fully performed after that request, my statutory cancellation right may end once it is fully performed, and if I cancel after performance has begun I may have to pay a proportionate amount for work already supplied.</span></label>`;
    submit.insertAdjacentElement('beforebegin',panel);return panel;
  }

  function cancellationNotice(){
    const panel=$('#bookingCancelPanel');if(!panel||$('#bookingCancellationPolicyNotice'))return;
    const note=document.createElement('div');note.id='bookingCancellationPolicyNotice';note.className='booking-cancellation-note';note.innerHTML=`<strong>${WINDOW_HOURS}-hour cancellation policy</strong><p>More than ${WINDOW_HOURS} hours before the appointment, a deposit is normally refundable or transferable. Within ${WINDOW_HOURS} hours, or for a no-show/no agreed access, Namdar may retain only the amount reasonably needed to cover the direct loss caused by the cancellation. Statutory rights are unaffected.</p><a href="/terms" target="_blank" rel="noopener">Read the full cancellation terms</a>`;
    panel.appendChild(note);
  }

  function balanceText(hours){const n=Math.max(0,Number(hours)||0);return n===0?'at completion':`${n} hour${n===1?'':'s'} after the scheduled job end`}
  function renderPaymentCommitment(c){
    const box=$('#bookingPaymentCommitment');if(!box)return;
    if(!c){box.innerHTML='<strong>Payment terms unavailable</strong><p>Refresh My Namdar before requesting this appointment.</p>';return}
    const revision=Number(c.revision);presentedPaymentRevision=Number.isInteger(revision)?revision:null;
    if(!c.active){box.innerHTML=`<strong>Payment terms · revision ${presentedPaymentRevision??0}</strong><p><b>No online payment is currently required for this booking.</b> The payment policy recorded when you request the appointment is frozen to this booking, so a later Namdar settings change will not retrospectively increase your deposit.</p>`;return}
    let first='';
    if(c.mode==='full_required')first=`Full payment of <strong>${money(c.initialPaymentAmount)}</strong> is required before Namdar confirms the appointment.`;
    else if(c.mode==='deposit_required')first=`A <strong>${money(c.initialPaymentAmount)}</strong> deposit is required before Namdar confirms the appointment.${c.allowFullPayment?' You may choose to pay the full amount instead.':''}`;
    else first=`Online payment is optional. If you choose an initial deposit, the current amount for this job is <strong>${money(c.depositAmount)}</strong>${c.allowFullPayment?' or you can pay in full':''}.`;
    const hold=Number(c.overdue?.bookingHoldAfterDays??7),review=Number(c.overdue?.finalReviewAfterDays??21);
    box.innerHTML=`<strong>Payment terms · revision ${presentedPaymentRevision??0}</strong><p>${first} The remaining balance is due <strong>${balanceText(c.balanceDueHours)}</strong>.</p><p class="booking-payment-safeguard">If a consumer balance becomes overdue, Namdar may send reminders and may pause another appointment after ${hold} day${hold===1?'':'s'} overdue; a recovery review can follow after ${review} days. <strong>No automatic consumer penalty, compounding fee or interest is added by this policy engine.</strong></p>`;
    if(!c.onlinePaymentsAvailable)box.insertAdjacentHTML('beforeend','<p class="booking-payment-warning">Secure online payment is temporarily unavailable, so a required-payment booking cannot be completed until it is restored.</p>');
  }
  async function refreshPaymentCommitment(id){
    const box=$('#bookingPaymentCommitment');presentedPaymentRevision=null;paymentTermsLoading=true;if(box)box.innerHTML='<strong>Payment terms</strong><p>Loading the exact terms for this quote…</p>';
    try{const d=await api(`/api/customer-quote-action?quoteId=${encodeURIComponent(id)}`);renderPaymentCommitment(d.paymentCommitment||null)}catch(e){if(box)box.innerHTML=`<strong>Payment terms could not be loaded</strong><p>${String(e.message||'Refresh My Namdar and try again.')}</p>`}finally{paymentTermsLoading=false}
  }

  function resetConsent(){const a=$('#bookingPolicyAccept'),b=$('#bookingEarlyServiceRequest');if(a)a.checked=false;if(b)b.checked=false;presentedPaymentRevision=null;paymentTermsLoading=false}

  async function submitAppointment(){
    const raw=$('#quoteScheduleSlot')?.value||'',idx=raw===''?-1:Number(raw),slot=idx>=0?quoteScheduleSlots[idx]:null,address=$('#quoteScheduleAddress')?.value.trim()||'',btn=$('#submitQuoteSchedule'),status=$('#quoteScheduleStatus'),accepted=$('#bookingPolicyAccept')?.checked===true,earlyRequested=$('#bookingEarlyServiceRequest')?.checked===true;
    if(!slot){status.textContent='Choose an available appointment slot.';return}
    if(!address){status.textContent='Enter the service address.';return}
    if(paymentTermsLoading||!Number.isInteger(presentedPaymentRevision)){status.textContent='Please wait for the current payment terms to load, then review them before requesting the appointment.';return}
    if(!accepted){status.textContent='Please accept the Terms, cancellation/deposit policy and payment terms before requesting the appointment.';$('#bookingPolicyAccept')?.focus();return}
    if(!earlyRequested){status.textContent='Please confirm the service-start request for any appointment that may fall within the statutory cancellation period.';$('#bookingEarlyServiceRequest')?.focus();return}
    setBusy(btn,true,'Sending request…');
    try{
      const d=await api('/api/booking',{method:'POST',body:JSON.stringify({quoteId:activeQuoteScheduleId,address,startsAt:slot.startsAt,endsAt:slot.endsAt,bookingPolicyAccepted:true,bookingPolicyVersion:POLICY_VERSION,earlyServiceRequested:true,paymentPolicyRevision:presentedPaymentRevision})});
      status.textContent='Booking request sent. Namdar will confirm the appointment.';
      window.NamdarAnalytics?.track?.('booking_submitted',{quoteId:activeQuoteScheduleId,bookingId:d.booking?.id||undefined});
      const session=(await sb.auth.getSession()).data.session;if(session)await loadPortal(session);
      if(d.booking?.id){history.replaceState({},'',`/account?tab=bookings&booking=${encodeURIComponent(d.booking.id)}`);applyAccountDestination()}
      setTimeout(()=>$('#quoteScheduleDialog')?.close(),500);
    }catch(e){status.textContent=e.message}finally{setBusy(btn,false)}
  }

  function wrapSchedule(){
    const original=window.openQuoteSchedule;if(typeof original!=='function'||original.__namdarPaymentWrapped)return;
    const wrapped=async function(id){presentedPaymentRevision=null;const result=original.apply(this,arguments);refreshPaymentCommitment(id).catch(()=>null);return result};wrapped.__namdarPaymentWrapped=true;window.openQuoteSchedule=wrapped;
  }
  function install(){
    if(!$('#quoteScheduleDialog')||!$('#submitQuoteSchedule'))return setTimeout(install,150);
    injectStyles();policyPanel();cancellationNotice();wrapSchedule();
    $('#submitQuoteSchedule').onclick=submitAppointment;
    document.addEventListener('click',e=>{const b=e.target.closest?.('[data-quote-schedule]');if(b?.dataset?.quoteSchedule)setTimeout(()=>refreshPaymentCommitment(b.dataset.quoteSchedule),0)},{capture:true});
    const dlg=$('#quoteScheduleDialog');if(!dlg.dataset.bookingPolicyReset){dlg.dataset.bookingPolicyReset='1';dlg.addEventListener('close',resetConsent)}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
