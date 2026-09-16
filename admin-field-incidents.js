(()=>{
  let installed=false;
  const esc2=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={no_access:'No access / customer unavailable',safety:'Safety concern',weather:'Weather problem',equipment:'Equipment problem',damage:'Damage / breakage',complaint:'Customer complaint',extra_work:'Extra work required',other:'Other'};
  async function loadIncidents(bookingId){
    const host=document.querySelector('#bookingEditorCustomer');if(!host)return;
    let box=host.querySelector('#adminBookingIncidents');if(!box){box=document.createElement('div');box.id='adminBookingIncidents';box.className='admin-field-incidents';host.appendChild(box)}
    box.innerHTML='<small>Loading field incidents…</small>';
    try{
      const d=await api(`/api/admin-booking-incidents?booking=${encodeURIComponent(bookingId)}`),rows=d.incidents||[];
      if(!rows.length){box.innerHTML='<div class="admin-field-incidents-head"><strong>Field incidents</strong><span class="clear">None reported</span></div>';return}
      box.innerHTML=`<div class="admin-field-incidents-head"><strong>Field incidents</strong><span>${rows.filter(x=>x.status==='open').length} open</span></div><div class="admin-field-incident-list">${rows.map(x=>`<article class="admin-field-incident ${esc2(x.severity)} ${x.status==='resolved'?'resolved':''}" data-admin-incident="${esc2(x.id)}"><div class="admin-field-incident-title"><div><small>${esc2(labels[x.incident_type]||x.incident_type)} · ${esc2(new Date(x.created_at).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}))}</small><strong>${esc2(x.summary)}</strong></div><span>${esc2(x.status)}</span></div>${x.details?`<p>${esc2(x.details)}</p>`:''}<div class="admin-field-incident-meta"><span>${esc2(x.severity)} priority</span><span>${Number(x.evidence_count||0)} evidence photo${Number(x.evidence_count||0)===1?'':'s'}</span>${x.resolution_note?`<span>Resolution: ${esc2(x.resolution_note)}</span>`:''}</div><button class="ghost-btn small" type="button" data-incident-action="${x.status==='open'?'resolve':'reopen'}" data-incident-id="${esc2(x.id)}">${x.status==='open'?'Resolve':'Reopen'}</button></article>`).join('')}</div>`;
      box.querySelectorAll('[data-incident-action]').forEach(btn=>btn.onclick=()=>changeIncident(bookingId,btn.dataset.incidentId,btn.dataset.incidentAction,btn));
    }catch(e){box.innerHTML=`<small class="form-status">Could not load field incidents: ${esc2(e.message)}</small>`}
  }
  async function changeIncident(bookingId,incidentId,action,button){
    let note='';if(action==='resolve'){note=prompt('Optional resolution note for this incident:','')||''}
    setBusy(button,true,action==='resolve'?'Resolving…':'Reopening…');
    try{await api('/api/admin-booking-incidents',{method:'PATCH',body:JSON.stringify({incidentId,action,resolutionNote:note})});await loadIncidents(bookingId)}catch(e){alert(e.message)}finally{setBusy(button,false)}
  }
  function install(){
    if(installed||typeof openBookingEditor!=='function'){setTimeout(install,60);return}
    installed=true;const base=openBookingEditor;
    openBookingEditor=async function(id){const result=await base(id);loadIncidents(id);return result};
  }
  install();
})();
