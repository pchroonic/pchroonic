(()=>{
  const num=v=>v==null||v===''?'':String(Number(v));
  const value=(obj,key)=>obj&&obj[key]!=null?num(obj[key]):'';
  function closeoutHtml(job){
    if(job.serviceKey!=='windows'||job.workStatus!=='completed')return '';
    const e=job.economics||null,reviewed=!!e;
    return `<div class="staff-detail-section" id="staffJobCloseout">
      <h3>Job close-out ${reviewed?'<span>Reviewed</span>':'<span>Needed</span>'}</h3>
      <p class="staff-note-help">Record the direct costs and travel from this completed Window Cleaning job. This feeds Stage 1 direct-contribution reporting; it is not net profit.</p>
      <div class="staff-detail-grid">
        <label><small>Consumables (£)</small><input id="closeoutConsumables" type="number" min="0" max="100000" step="0.01" value="${esc(value(e,'consumablesCost'))}"></label>
        <label><small>Parking (£)</small><input id="closeoutParking" type="number" min="0" max="100000" step="0.01" value="${esc(value(e,'parkingCost'))}"></label>
        <label><small>Travel cost (£)</small><input id="closeoutTravelCost" type="number" min="0" max="100000" step="0.01" value="${esc(value(e,'travelCost'))}"></label>
        <label><small>Other direct cost (£)</small><input id="closeoutOther" type="number" min="0" max="100000" step="0.01" value="${esc(value(e,'otherCost'))}"></label>
        <label><small>Travel minutes</small><input id="closeoutTravelMinutes" type="number" min="0" max="1440" step="1" value="${esc(value(e,'travelMinutes'))}"></label>
        <label><small>Travel miles</small><input id="closeoutTravelMiles" type="number" min="0" max="10000" step="0.1" value="${esc(value(e,'travelMiles'))}"></label>
      </div>
      <label style="display:block;margin-top:12px"><small>Private cost/travel note</small><textarea id="closeoutNotes" rows="3" placeholder="Parking, materials, route notes…">${esc(e?.notes||'')}</textarea></label>
      <button id="saveJobCloseout" class="primary-btn full" type="button">${reviewed?'Update direct-cost review':'Save direct-cost review'}</button>
      <p id="jobCloseoutStatus" class="form-status">${reviewed?'This job is included in reviewed direct-cost reporting.':'Save this after every completed job, including jobs with £0 direct costs.'}</p>
    </div>`;
  }
  function augment(id){
    const job=jobs.find(x=>x.id===id);if(!job||job.serviceKey!=='windows'||job.workStatus!=='completed')return;
    const detail=document.getElementById('staffJobDetail');if(!detail||document.getElementById('staffJobCloseout'))return;
    detail.insertAdjacentHTML('beforeend',closeoutHtml(job));
    const btn=document.getElementById('saveJobCloseout');if(btn)btn.onclick=()=>save(job.id,btn);
  }
  async function save(id,btn){
    const status=document.getElementById('jobCloseoutStatus');setBusy(btn,true,'Saving close-out…');
    try{
      const d=await api('/api/staff-job-action',{method:'PATCH',body:JSON.stringify({
        id,action:'economics',
        consumablesCost:document.getElementById('closeoutConsumables').value,
        parkingCost:document.getElementById('closeoutParking').value,
        travelCost:document.getElementById('closeoutTravelCost').value,
        otherCost:document.getElementById('closeoutOther').value,
        travelMinutes:document.getElementById('closeoutTravelMinutes').value,
        travelMiles:document.getElementById('closeoutTravelMiles').value,
        notes:document.getElementById('closeoutNotes').value
      })});
      if(status)status.textContent=d.message||'Direct-cost review saved ✓';
      await loadJobs();
    }catch(e){if(status)status.textContent=e.message}
    finally{setBusy(btn,false)}
  }
  const baseOpenJob=openJob;
  openJob=async function(id,keepOpen=false){await baseOpenJob(id,keepOpen);augment(id)};
})();
