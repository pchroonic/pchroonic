(()=>{
  const VERSION='6.4.42-post-job-experience-1';
  let statePromise=null;

  function completed(job){return job&&(job.workStatus==='completed'||job.status==='completed')}
  function addWeeks(value,weeks){const d=new Date(value);if(!Number.isFinite(d.getTime())||!weeks)return null;d.setDate(d.getDate()+Number(weeks)*7);return d}
  function dateLabel(value){return value?new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):''}
  function feedbackFor(state,id){return state?.feedback?.[id]||null}

  async function loadState(){
    if(!statePromise)statePromise=api('/api/customer-post-job',{method:'GET'}).catch(error=>{console.warn('post-job state',error);return {reviewAvailable:false,feedback:{}}});
    return statePromise;
  }

  async function repeatQuote(job,button){
    if(!job?.rebookTemplate?.inputs){alert('This completed job cannot be reused as a new quote yet.');return}
    const label=job.serviceLabel||'Window cleaning';
    if(!confirm(`Request a fresh ${label} quote for ${job.postcode||'this property'} using the previous job details? Namdar will recalculate current coverage and pricing before anything is booked.`))return;
    setBusy(button,true,'Preparing quote…');
    try{
      const session=(await sb.auth.getSession()).data.session;if(!session)throw new Error('Please sign in again.');
      const result=await api('/api/quote',{method:'POST',body:JSON.stringify({
        serviceKey:job.serviceKey,
        customerName:profileCache?.full_name||'',
        email:session.user.email||'',
        phone:profileCache?.phone||'',
        postcode:job.postcode||profileCache?.postcode||'',
        inputs:job.rebookTemplate.inputs
      })});
      if(!result?.quote?.id)throw new Error('The repeat quote could not be created.');
      location.href=`/account?tab=quotes&quote=${encodeURIComponent(result.quote.id)}`;
    }catch(error){alert(error.message||'The repeat quote could not be created.')}
    finally{setBusy(button,false)}
  }

  async function openPrivateFeedback(job,button){
    setBusy(button,true,'Opening…');
    try{const result=await api('/api/customer-post-job',{method:'POST',body:JSON.stringify({action:'feedback_link',bookingId:job.id})});location.href=result.url}
    catch(error){alert(error.message||'Private feedback is temporarily unavailable.');setBusy(button,false)}
  }

  async function openPublicReview(job,button){
    const tab=window.open('about:blank','_blank');
    setBusy(button,true,'Opening…');
    try{
      const result=await api('/api/customer-post-job',{method:'POST',body:JSON.stringify({action:'public_review_click',bookingId:job.id})});
      if(tab)tab.location=result.url;else location.href=result.url;
      button.textContent='Google review opened';
    }catch(error){if(tab)tab.close();alert(error.message||'The Google review link is temporarily unavailable.');setBusy(button,false)}
  }

  function panelHtml(job,state){
    const feedback=feedbackFor(state,job.id),due=addWeeks(job.completedAt||job.endsAt,job.recurringWeeks),review=state?.reviewAvailable;
    const dueText=due?`<p class="post-job-next"><strong>Next clean guide:</strong> around ${esc(dateLabel(due))}. This is only a reminder — nothing is booked automatically.</p>`:'';
    const feedbackText=feedback?.submitted?`<span class="post-job-feedback-done">✓ Private feedback sent${feedback.rating?` · ${esc(feedback.rating)}/5`:''}</span>`:'<span>Tell us privately if anything could have been better.</span>';
    const reviewButton=review?`<button class="ghost-btn" type="button" data-post-job-review="${esc(job.id)}">${feedback?.publicReviewClicked?'Open Google review again':'Leave an honest Google review'}</button>`:'';
    const rebook=job.rebookTemplate?.inputs?`<button class="primary-btn" type="button" data-post-job-rebook="${esc(job.id)}">Book again</button>`:'';
    return `<section class="customer-post-job" data-post-job-for="${esc(job.id)}"><div class="post-job-copy"><span class="post-job-kicker">Job complete ✓</span><h4>Thanks for choosing Namdar</h4><p>Your completed-job photos, activity and billing stay with this booking in My Namdar.</p>${dueText}</div><div class="post-job-feedback">${feedbackText}</div><div class="post-job-actions">${rebook}<button class="ghost-btn" type="button" data-post-job-feedback="${esc(job.id)}">${feedback?.submitted?'View private feedback':'Private feedback'}</button>${reviewButton}</div></section>`;
  }

  async function decorate(rows){
    const state=await loadState();
    for(const job of rows||[]){
      if(!completed(job))continue;
      const card=document.querySelector(`[data-booking-card="${CSS.escape(job.id)}"]`);if(!card||card.querySelector(`[data-post-job-for="${CSS.escape(job.id)}"]`))continue;
      card.insertAdjacentHTML('beforeend',panelHtml(job,state));
    }
    document.querySelectorAll('[data-post-job-rebook]').forEach(button=>button.onclick=()=>repeatQuote((rows||[]).find(job=>job.id===button.dataset.postJobRebook),button));
    document.querySelectorAll('[data-post-job-feedback]').forEach(button=>button.onclick=()=>openPrivateFeedback((rows||[]).find(job=>job.id===button.dataset.postJobFeedback),button));
    document.querySelectorAll('[data-post-job-review]').forEach(button=>button.onclick=()=>openPublicReview((rows||[]).find(job=>job.id===button.dataset.postJobReview),button));
  }

  if(typeof renderBookings==='function'&&!renderBookings.__postJobExperience){
    const base=renderBookings;
    const wrapped=async rows=>{const result=await base(rows);await decorate(rows);return result};
    wrapped.__postJobExperience=true;renderBookings=wrapped;
  }
  if(Array.isArray(window.customerJobCache)&&window.customerJobCache.length)decorate(window.customerJobCache).catch(()=>{});
  window.NamdarPostJobExperience={version:VERSION,decorate};
})();
