(()=>{
  const VERSION='6.4.34-cancellation-policy-1';
  const POLICY_VERSION='2026-09-15-v1';
  const WINDOW_HOURS=48;
  const $=s=>document.querySelector(s);

  function injectStyles(){
    if(document.querySelector('link[data-booking-policy]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href=`/booking-policy.css?v=${VERSION}`;link.dataset.bookingPolicy='1';document.head.appendChild(link);
  }

  function policyPanel(){
    const dlg=$('#quoteScheduleDialog .modal-card'),submit=$('#submitQuoteSchedule');if(!dlg||!submit)return null;
    let panel=$('#bookingPolicyPanel');if(panel)return panel;
    panel=document.createElement('section');panel.id='bookingPolicyPanel';panel.className='booking-policy-panel';
    panel.innerHTML=`<div class="booking-policy-head"><div><strong>Cancellation & deposit policy</strong><small>Shown before you request the appointment.</small></div><a href="/terms" target="_blank" rel="noopener">Read full Terms</a></div>
      <ul>
        <li><strong>More than ${WINDOW_HOURS} hours:</strong> a booking deposit is normally refunded or can be moved to a replacement appointment.</li>
        <li><strong>Within ${WINDOW_HOURS} hours, no-show or no agreed access:</strong> Namdar may retain some or all of a deposit only to cover a reasonable direct loss, taking account of savings and whether the slot can be filled.</li>
        <li><strong>If Namdar cancels:</strong> if no replacement appointment is agreed, payments for the unprovided service are refunded.</li>
      </ul>
      <p class="booking-policy-statutory">Your statutory consumer rights, including any applicable 14-day cancellation right for an online service contract, are not replaced by this policy.</p>
      <label class="consent required-consent booking-policy-consent"><input id="bookingPolicyAccept" type="checkbox"><span>I have read and agree to Namdar's <a href="/terms" target="_blank" rel="noopener">Terms & Conditions</a>, including the ${WINDOW_HOURS}-hour cancellation and deposit policy.</span></label>
      <label class="consent required-consent booking-policy-consent"><input id="bookingEarlyServiceRequest" type="checkbox"><span>If my agreed appointment falls within an applicable 14-day statutory cancellation period, I expressly request Namdar to provide the service on that date. I understand that if the service is fully performed after that request, my statutory cancellation right may end once it is fully performed, and if I cancel after performance has begun I may have to pay a proportionate amount for work already supplied.</span></label>`;
    submit.insertAdjacentElement('beforebegin',panel);return panel;
  }

  function cancellationNotice(){
    const panel=$('#bookingCancelPanel');if(!panel||$('#bookingCancellationPolicyNotice'))return;
    const note=document.createElement('div');note.id='bookingCancellationPolicyNotice';note.className='booking-cancellation-note';note.innerHTML=`<strong>${WINDOW_HOURS}-hour cancellation policy</strong><p>More than ${WINDOW_HOURS} hours before the appointment, a deposit is normally refundable or transferable. Within ${WINDOW_HOURS} hours, or for a no-show/no agreed access, Namdar may retain only the amount reasonably needed to cover the direct loss caused by the cancellation. Statutory rights are unaffected.</p><a href="/terms" target="_blank" rel="noopener">Read the full cancellation terms</a>`;
    panel.appendChild(note);
  }

  function resetConsent(){const a=$('#bookingPolicyAccept'),b=$('#bookingEarlyServiceRequest');if(a)a.checked=false;if(b)b.checked=false;}

  async function submitAppointment(){
    const raw=$('#quoteScheduleSlot')?.value||'',idx=raw===''?-1:Number(raw),slot=idx>=0?quoteScheduleSlots[idx]:null,address=$('#quoteScheduleAddress')?.value.trim()||'',btn=$('#submitQuoteSchedule'),status=$('#quoteScheduleStatus'),accepted=$('#bookingPolicyAccept')?.checked===true,earlyRequested=$('#bookingEarlyServiceRequest')?.checked===true;
    if(!slot){status.textContent='Choose an available appointment slot.';return}
    if(!address){status.textContent='Enter the service address.';return}
    if(!accepted){status.textContent='Please accept the Terms and cancellation/deposit policy before requesting the appointment.';$('#bookingPolicyAccept')?.focus();return}
    if(!earlyRequested){status.textContent='Please confirm the service-start request for any appointment that may fall within the statutory cancellation period.';$('#bookingEarlyServiceRequest')?.focus();return}
    setBusy(btn,true,'Sending request…');
    try{
      const d=await api('/api/booking',{method:'POST',body:JSON.stringify({quoteId:activeQuoteScheduleId,address,startsAt:slot.startsAt,endsAt:slot.endsAt,bookingPolicyAccepted:true,bookingPolicyVersion:POLICY_VERSION,earlyServiceRequested:true})});
      status.textContent='Booking request sent. Namdar will confirm the appointment.';
      const session=(await sb.auth.getSession()).data.session;if(session)await loadPortal(session);
      if(d.booking?.id){history.replaceState({},'',`/account?tab=bookings&booking=${encodeURIComponent(d.booking.id)}`);applyAccountDestination()}
      setTimeout(()=>$('#quoteScheduleDialog')?.close(),500);
    }catch(e){status.textContent=e.message}finally{setBusy(btn,false)}
  }

  function install(){
    if(!$('#quoteScheduleDialog')||!$('#submitQuoteSchedule'))return setTimeout(install,150);
    injectStyles();policyPanel();cancellationNotice();
    $('#submitQuoteSchedule').onclick=submitAppointment;
    const dlg=$('#quoteScheduleDialog');if(!dlg.dataset.bookingPolicyReset){dlg.dataset.bookingPolicyReset='1';dlg.addEventListener('close',resetConsent)}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
