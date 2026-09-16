(()=>{
  const VERSION='6.4.41-staff-operations-v3-1';
  const WINDOW_CHECKLIST=[
    ['access_checked','Safe access and working area checked'],
    ['before_condition_recorded','Starting condition reviewed / recorded'],
    ['service_complete','All agreed window-cleaning work completed'],
    ['frames_sills_checked','Frames and sills checked'],
    ['after_condition_recorded','Finished condition reviewed / recorded'],
    ['final_area_check','Final quality check · area left tidy']
  ];
  const INCIDENT_LABELS={no_access:'No access / customer unavailable',safety:'Safety concern',weather:'Weather problem',equipment:'Equipment problem',damage:'Damage / breakage',complaint:'Customer complaint',extra_work:'Extra work required',other:'Other'};
  let installed=false;

  const escapeOps=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statusMessage=()=>document.querySelector('#staffJobMessage');
  const qualityFor=job=>job?.quality?.checklist&&typeof job.quality.checklist==='object'?job.quality.checklist:{};
  const missingQuality=job=>job?.serviceKey==='windows'?WINDOW_CHECKLIST.filter(([key])=>qualityFor(job)[key]!==true):[];
  const openIncidents=job=>(job?.incidents||[]).filter(x=>x.status==='open');

  function nearestEta(value){
    const options=[10,15,20,30,45,60,90],n=Number(value);
    if(!Number.isFinite(n))return 20;
    return options.reduce((best,x)=>Math.abs(x-n)<Math.abs(best-n)?x:best,options[0]);
  }
  function suggestedEta(job){
    if(job?.onMyWayEtaMinutes)return nearestEta(job.onMyWayEtaMinutes);
    try{
      if(typeof currentRoutePosition!=='undefined'&&currentRoutePosition&&typeof pointFor==='function'&&typeof driveEstimate==='function'){
        const p=pointFor(job),estimate=p?driveEstimate(currentRoutePosition,p):null;
        if(estimate?.minutes)return nearestEta(estimate.minutes);
      }
    }catch{}
    return 20;
  }

  function ensureEtaDialog(){
    let dialog=document.querySelector('#staffEtaDialog');if(dialog)return dialog;
    dialog=document.createElement('dialog');dialog.id='staffEtaDialog';dialog.className='modal staff-ops-dialog';
    dialog.innerHTML='<div class="modal-card staff-ops-modal-card"><button class="modal-close" type="button" data-close-eta>×</button><div class="eyebrow">Customer arrival update</div><h2>On my way</h2><p class="staff-ops-help">Choose a realistic ETA. Namdar will mark the job on the way and send the normal customer arrival notification.</p><label>Approximate arrival<select id="staffEtaMinutes"><option value="10">About 10 minutes</option><option value="15">About 15 minutes</option><option value="20">About 20 minutes</option><option value="30">About 30 minutes</option><option value="45">About 45 minutes</option><option value="60">About 1 hour</option><option value="90">About 1½ hours</option></select></label><div id="staffEtaPreview" class="staff-ops-eta-preview"></div><button id="confirmStaffEta" class="primary-btn full" type="button">🚐 Confirm on my way</button><p id="staffEtaStatus" class="form-status"></p></div>';
    document.body.appendChild(dialog);dialog.querySelector('[data-close-eta]').onclick=()=>dialog.close();
    return dialog;
  }
  function etaPreview(minutes){
    const d=new Date(Date.now()+Number(minutes||0)*60000);
    return `Expected around ${d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`;
  }
  function openEtaDialog(job,sourceButton){
    const dialog=ensureEtaDialog(),select=dialog.querySelector('#staffEtaMinutes'),confirmButton=dialog.querySelector('#confirmStaffEta'),status=dialog.querySelector('#staffEtaStatus'),preview=dialog.querySelector('#staffEtaPreview');
    select.value=String(suggestedEta(job));status.textContent='';const update=()=>preview.textContent=etaPreview(select.value);select.onchange=update;update();
    confirmButton.onclick=async()=>{
      if(offlineMode){status.textContent='Reconnect before updating this job.';return}
      setBusy(confirmButton,true,'Updating…');if(sourceButton)setBusy(sourceButton,true,'Updating…');
      try{
        const etaMinutes=Number(select.value),d=await api('/api/staff-job-action',{method:'PATCH',body:JSON.stringify({id:job.id,action:'on_my_way',etaMinutes})});
        status.textContent=d.customerNotification?.error?`${d.message} The customer notification will retry automatically.`:`${d.message} Customer arrival notification sent/queued.`;
        const message=statusMessage();if(message)message.textContent=status.textContent;
        await loadJobs();setTimeout(()=>dialog.close(),350);
      }catch(e){status.textContent=e.message}
      finally{setBusy(confirmButton,false);if(sourceButton)setBusy(sourceButton,false)}
    };
    dialog.showModal();
  }

  function checklistHtml(job){
    const data=qualityFor(job),done=WINDOW_CHECKLIST.filter(([key])=>data[key]===true).length,locked=(job.workStatus==='completed'||job.status==='completed');
    return `<div class="staff-ops-section staff-ops-quality" data-v3-quality><div class="staff-ops-section-head"><div><span class="staff-v3-kicker">Quality control</span><h3>Window-cleaning checklist</h3></div><strong>${done}/${WINDOW_CHECKLIST.length}</strong></div><div class="staff-ops-progress"><span style="width:${Math.round(done/WINDOW_CHECKLIST.length*100)}%"></span></div><div class="staff-ops-checks">${WINDOW_CHECKLIST.map(([key,label])=>`<label class="staff-ops-check ${data[key]===true?'done':''}"><input type="checkbox" data-v3-quality-key="${key}" ${data[key]===true?'checked':''} ${locked?'disabled':''}><span><b>${data[key]===true?'✓':'○'}</b>${escapeOps(label)}</span></label>`).join('')}</div>${locked?'<p class="staff-ops-help">This completed-job checklist is locked.</p>':'<button class="ghost-btn full" type="button" data-v3-save-quality>Save checklist</button>'}<p class="form-status" data-v3-quality-status></p></div>`;
  }

  function incidentHtml(job){
    const incidents=job.incidents||[],open=openIncidents(job),recent=incidents.slice(0,4);
    return `<div class="staff-ops-section staff-ops-incidents" data-v3-incidents><div class="staff-ops-section-head"><div><span class="staff-v3-kicker">Field support</span><h3>Problems & incidents</h3></div>${open.length?`<span class="staff-ops-alert-count">${open.length} open</span>`:'<span class="staff-ops-clear">No open issues</span>'}</div>${recent.length?`<div class="staff-ops-incident-list">${recent.map(x=>`<article class="staff-ops-incident ${escapeOps(x.severity)} ${x.status==='resolved'?'resolved':''}"><div><span>${escapeOps(INCIDENT_LABELS[x.type]||x.type)}</span><strong>${escapeOps(x.summary)}</strong>${x.details?`<small>${escapeOps(x.details)}</small>`:''}</div><div class="staff-ops-incident-meta"><b>${escapeOps(x.severity)}</b><span>${x.evidenceCount||0} photo${Number(x.evidenceCount||0)===1?'':'s'}</span><span>${escapeOps(x.status)}</span></div></article>`).join('')}</div>`:'<p class="staff-ops-help">No problems have been reported for this job.</p>'}<button class="staff-ops-report-btn" type="button" data-v3-report-incident>⚠ Report a problem</button></div>`;
  }

  function ensureIncidentDialog(){
    let dialog=document.querySelector('#staffIncidentDialog');if(dialog)return dialog;
    dialog=document.createElement('dialog');dialog.id='staffIncidentDialog';dialog.className='modal staff-ops-dialog';
    dialog.innerHTML=`<div class="modal-card staff-ops-modal-card"><button class="modal-close" type="button" data-close-incident>×</button><div class="eyebrow">Field support</div><h2>Report a problem</h2><p class="staff-ops-help">This sends an internal alert to the Namdar office and keeps the report attached to the booking.</p><label>Problem type<select id="staffIncidentType">${Object.entries(INCIDENT_LABELS).map(([value,label])=>`<option value="${value}">${escapeOps(label)}</option>`).join('')}</select></label><label>Priority<select id="staffIncidentSeverity"><option value="info">Info · office should know</option><option value="attention" selected>Attention · needs follow-up</option><option value="urgent">Urgent · safety/damage/immediate help</option></select></label><label>Short summary<input id="staffIncidentSummary" maxlength="180" placeholder="Example: Rear gate locked · no access"></label><label>Details<textarea id="staffIncidentDetails" rows="4" maxlength="2000" placeholder="What happened, what you did, and what the office needs to know…"></textarea></label><div id="staffIncidentPhotoSlot"></div><button id="submitStaffIncident" class="primary-btn full" type="button">Send report to office</button><p id="staffIncidentStatus" class="form-status"></p></div>`;
    document.body.appendChild(dialog);dialog.querySelector('[data-close-incident]').onclick=()=>dialog.close();
    return dialog;
  }

  async function uploadIncidentEvidence(job,incidentId,files,status){
    if(!files.length||!job.customerId)return 0;
    let saved=0;
    for(const original of files.slice(0,5)){
      if(!['image/jpeg','image/png','image/webp','image/avif'].includes(original.type))throw new Error(`${original.name||'A file'} is not a supported image.`);
      const file=typeof prepareImage==='function'?await prepareImage(original):original;if(file.size>10*1024*1024)throw new Error(`${original.name||'A photo'} is larger than 10 MB.`);
      const safe=(file.name||'incident-photo.jpg').replace(/[^a-zA-Z0-9._-]/g,'-'),path=`${job.customerId}/${job.id}/incident/${incidentId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`;
      status.textContent=`Uploading ${original.name||'incident photo'}…`;
      const {error}=await sb.storage.from('customer-project-files').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;
      try{await api('/api/staff-job-action',{method:'PATCH',body:JSON.stringify({id:job.id,action:'incident_photo',incidentId,path})});saved++}
      catch(e){await sb.storage.from('customer-project-files').remove([path]).catch(()=>null);throw e}
    }
    return saved;
  }

  function openIncidentDialog(job){
    const dialog=ensureIncidentDialog(),status=dialog.querySelector('#staffIncidentStatus'),submit=dialog.querySelector('#submitStaffIncident'),slot=dialog.querySelector('#staffIncidentPhotoSlot');
    status.textContent='';dialog.querySelector('#staffIncidentType').value='no_access';dialog.querySelector('#staffIncidentSeverity').value='attention';dialog.querySelector('#staffIncidentSummary').value='';dialog.querySelector('#staffIncidentDetails').value='';
    slot.innerHTML=job.customerId?'<label>Optional evidence photos<input id="staffIncidentPhotos" type="file" accept="image/jpeg,image/png,image/webp,image/avif" capture="environment" multiple><small class="staff-ops-help">Up to 5 photos for this report.</small></label>':'<p class="staff-ops-help">Photo evidence is unavailable because this booking is not linked to a customer record.</p>';
    submit.onclick=async()=>{
      if(offlineMode){status.textContent='Reconnect before reporting a problem.';return}
      const incidentType=dialog.querySelector('#staffIncidentType').value,severity=dialog.querySelector('#staffIncidentSeverity').value,summary=dialog.querySelector('#staffIncidentSummary').value.trim(),details=dialog.querySelector('#staffIncidentDetails').value.trim(),files=[...(dialog.querySelector('#staffIncidentPhotos')?.files||[])];
      if(summary.length<3){status.textContent='Add a short summary of the problem.';return}if(files.length>5){status.textContent='Choose no more than 5 evidence photos.';return}
      setBusy(submit,true,'Sending…');
      try{
        const d=await api('/api/staff-job-action',{method:'PATCH',body:JSON.stringify({id:job.id,action:'incident',incidentType,severity,summary,details})});
        let uploaded=0;try{uploaded=await uploadIncidentEvidence(job,d.incident.id,files,status)}catch(e){status.textContent=`Problem saved, but a photo could not be uploaded: ${e.message}`;await loadJobs();return}
        status.textContent=`Problem reported to the office${uploaded?` · ${uploaded} photo${uploaded===1?'':'s'} attached`:''}.`;await loadJobs();setTimeout(()=>dialog.close(),450);
      }catch(e){status.textContent=e.message}
      finally{setBusy(submit,false)}
    };
    dialog.showModal();
  }

  async function saveChecklist(job,button){
    const root=document.querySelector('#staffJobDetail'),status=root?.querySelector('[data-v3-quality-status]');if(!root||!status)return;
    if(offlineMode){status.textContent='Reconnect before saving the checklist.';return}
    const checklist={};root.querySelectorAll('[data-v3-quality-key]').forEach(input=>checklist[input.dataset.v3QualityKey]=input.checked);
    setBusy(button,true,'Saving…');
    try{const d=await api('/api/staff-job-action',{method:'PATCH',body:JSON.stringify({id:job.id,action:'checklist',checklist})});job.quality=d.quality;status.textContent=d.message;await loadJobs()}
    catch(e){status.textContent=e.message}
    finally{setBusy(button,false)}
  }

  function renderEta(job,root){
    root.querySelector('[data-v3-eta]')?.remove();
    if(job.workStatus!=='on_my_way'||!job.estimatedArrivalAt)return;
    const el=document.createElement('div');el.dataset.v3Eta='1';el.className='staff-ops-eta-live';
    const arrival=new Date(job.estimatedArrivalAt);el.innerHTML=`<span>🚐 Customer arrival update</span><strong>Expected around ${escapeOps(arrival.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}))}</strong><small>${job.onMyWayEtaMinutes?`About ${escapeOps(job.onMyWayEtaMinutes)} minutes from the on-my-way update.`:'Approximate ETA.'}</small>`;
    const workflow=root.querySelector('.staff-v2-workflow')||root.querySelector('.staff-action-zone');workflow?.insertAdjacentElement('afterend',el);
  }

  function enhanceJobDetail(job){
    const root=document.querySelector('#staffJobDetail');if(!root||!job||offlineMode)return;
    root.querySelector('[data-v3-quality]')?.remove();root.querySelector('[data-v3-incidents]')?.remove();
    renderEta(job,root);
    const anchor=root.querySelector('.staff-v2-readiness')||root.querySelector('.staff-action-zone');if(!anchor)return;
    if(job.serviceKey==='windows')anchor.insertAdjacentHTML('beforebegin',checklistHtml(job));
    anchor.insertAdjacentHTML('beforebegin',incidentHtml(job));
    const save=root.querySelector('[data-v3-save-quality]');if(save)save.onclick=()=>saveChecklist(job,save);
    const report=root.querySelector('[data-v3-report-incident]');if(report)report.onclick=()=>openIncidentDialog(job);
  }

  function enhanceCards(){
    document.querySelectorAll('.staff-job-card').forEach(card=>{
      card.querySelector('[data-v3-incident-chip]')?.remove();const open=card.querySelector('[data-open-staff-job]');if(!open)return;const job=jobs.find(x=>x.id===open.dataset.openStaffJob),count=openIncidents(job).length;if(!count)return;
      const chip=document.createElement('span');chip.dataset.v3IncidentChip='1';chip.className='staff-v3-card-incident';chip.textContent=`⚠ ${count} open ${count===1?'issue':'issues'}`;open.insertAdjacentElement('beforebegin',chip);
    });
  }

  function install(){
    if(installed||typeof openJob!=='function'||typeof renderJobs!=='function'||typeof runAction!=='function'){setTimeout(install,60);return}
    installed=true;
    const baseOpen=openJob,baseRender=renderJobs,baseRun=runAction;
    openJob=async function(id,keepOpen=false){const result=await baseOpen(id,keepOpen),job=jobs.find(x=>x.id===id);enhanceJobDetail(job);return result};
    renderJobs=async function(){const result=await baseRender();enhanceCards();return result};
    runAction=async function(id,action,button){
      const job=jobs.find(x=>x.id===id);if(action==='on_my_way'&&job){openEtaDialog(job,button);return}
      if(action==='completed'&&job?.serviceKey==='windows'){
        const missing=missingQuality(job);if(missing.length){const msg=statusMessage();if(msg)msg.textContent=`Complete the field quality checklist first (${missing.length} item${missing.length===1?'':'s'} remaining).`;document.querySelector('[data-v3-quality]')?.scrollIntoView({behavior:'smooth',block:'center'});return}
      }
      return baseRun(id,action,button);
    };
    enhanceCards();
  }
  install();
})();
