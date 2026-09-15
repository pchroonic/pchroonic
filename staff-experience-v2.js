(()=>{
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  let refreshTimer=null,installed=false;

  const esc2=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const time2=value=>value?new Date(value).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'—';
  const isDone=j=>(j?.workStatus==='completed'||j?.status==='completed');
  const todayRows=()=>jobs.filter(j=>dateKey(j.startsAt)===todayKey()&&j.status!=='cancelled').sort((a,b)=>new Date(a.startsAt)-new Date(b.startsAt));
  const workLabel=j=>statusLabel[j?.workStatus]||pretty(j?.workStatus||j?.status||'scheduled');

  function ensureOverview(){
    const intro=$('.staff-job-intro');
    if(!intro||$('#staffTodayOverview'))return;
    const panel=document.createElement('section');
    panel.id='staffTodayOverview';panel.className='staff-v2-overview';panel.setAttribute('aria-live','polite');
    intro.insertAdjacentElement('afterend',panel);
  }

  function pickFocusJob(rows){
    if(!rows.length)return null;
    const now=Date.now();
    return rows.find(j=>j.workStatus==='started')
      ||rows.find(j=>j.workStatus==='on_my_way')
      ||rows.find(j=>!isDone(j)&&new Date(j.startsAt).getTime()>=now)
      ||rows.find(j=>!isDone(j))
      ||rows.at(-1);
  }

  function renderOverview(){
    ensureOverview();
    const panel=$('#staffTodayOverview');if(!panel)return;
    const visible=['today','route'].includes(jobFilter)&&!!currentStaff;
    panel.classList.toggle('hidden',!visible);if(!visible)return;
    const rows=todayRows(),done=rows.filter(isDone).length,remaining=Math.max(0,rows.length-done),focus=pickFocusJob(rows),pct=rows.length?Math.round(done/rows.length*100):0;
    if(!rows.length){
      panel.innerHTML='<div class="staff-v2-empty-day"><div><span class="staff-v2-kicker">Today</span><strong>No assigned jobs yet</strong><small>Your schedule will update here automatically when work is assigned.</small></div><span class="staff-v2-done-mark">✓</span></div>';
      return;
    }
    const overdue=focus&&!isDone(focus)&&focus.workStatus==='scheduled'&&new Date(focus.startsAt).getTime()<Date.now();
    const focusLabel=focus?(focus.workStatus==='started'?'In progress':focus.workStatus==='on_my_way'?'Current job':overdue?'Needs attention':'Next job'):'Day complete';
    const call=focus?.customer?.phone?`<a class="ghost-btn small" href="tel:${esc2(focus.customer.phone)}">☎ Call</a>`:'';
    const nav=focus&&!isDone(focus)?`<a class="ghost-btn small" href="${esc2(navigationUrl(focus))}" target="_blank" rel="noopener">↗ Navigate</a>`:'';
    panel.innerHTML=`<div class="staff-v2-summary-row"><div class="staff-v2-progress-copy"><span class="staff-v2-kicker">Today progress</span><strong>${done} of ${rows.length} completed</strong><small>${remaining?`${remaining} ${remaining===1?'job':'jobs'} remaining`:'All assigned work complete'}</small></div><div class="staff-v2-progress-ring" style="--staff-progress:${pct}%"><span>${pct}%</span></div></div><div class="staff-v2-progress-track"><span style="width:${pct}%"></span></div>${focus?`<div class="staff-v2-focus ${overdue?'attention':''}"><div class="staff-v2-focus-time"><span>${esc2(focusLabel)}</span><strong>${esc2(time2(focus.startsAt))}</strong></div><div class="staff-v2-focus-copy"><strong>${esc2(focus.serviceLabel)}</strong><span>${esc2(focus.customer?.name||'Customer')}</span><small>${esc2(focus.address||focus.customer?.postcode||'')}</small></div><span class="staff-work-chip ${esc2(focus.workStatus||'scheduled')}">${esc2(workLabel(focus))}</span><div class="staff-v2-focus-actions">${call}${nav}<button class="primary-btn small" type="button" data-v2-focus-open="${esc2(focus.id)}">${isDone(focus)?'View job':'Open job'}</button></div></div>`:''}`;
    const open=panel.querySelector('[data-v2-focus-open]');if(open)open.onclick=()=>openJob(open.dataset.v2FocusOpen);
  }

  function enhanceJobCards(){
    $$('.staff-job-card').forEach(card=>{
      if(card.dataset.staffV2==='1')return;
      const open=card.querySelector('[data-open-staff-job]');if(!open)return;
      const job=jobs.find(j=>j.id===open.dataset.openStaffJob);if(!job)return;
      card.dataset.staffV2='1';
      open.textContent=isDone(job)?'View job':(['started','on_my_way'].includes(job.workStatus)?'Continue job':'Open job');
      const row=document.createElement('div');row.className='staff-v2-card-actions';
      row.innerHTML=`${job.customer?.phone?`<a href="tel:${esc2(job.customer.phone)}" aria-label="Call ${esc2(job.customer.name||'customer')}">☎ <span>Call</span></a>`:''}<a href="${esc2(navigationUrl(job))}" target="_blank" rel="noopener" aria-label="Navigate to job">↗ <span>Navigate</span></a><span class="staff-v2-photo-count">▣ ${job.beforeImages?.length||0}/${job.afterImages?.length||0}</span>`;
      open.insertAdjacentElement('beforebegin',row);
    });
  }

  function workflowStep(status){return ({scheduled:0,on_my_way:1,started:2,completed:3})[status]??0}
  function briefItems(job){
    const i=job?.inputs||{},items=[];
    if(i.propertyType)items.push(['Property',pretty(i.propertyType)]);
    if(i.floors)items.push(['Floors',String(i.floors)]);
    if(i.access)items.push(['Access',pretty(i.access)]);
    if(i.frequency)items.push(['Frequency',pretty(i.frequency)]);
    if(i.units!=null&&i.units!=='')items.push(['Size / units',String(i.units)]);
    if(i.urgency)items.push(['Priority',pretty(i.urgency)]);
    return items;
  }

  function enhanceJobDetail(job){
    const root=$('#staffJobDetail');if(!root||!job||root.dataset.staffV2Job===job.id)return;
    root.dataset.staffV2Job=job.id;
    const head=root.querySelector('.staff-detail-head');
    if(head){
      const step=workflowStep(job.workStatus||'scheduled'),progress=document.createElement('div');progress.className='staff-v2-workflow';
      const labels=['Assigned','On the way','In progress','Complete'];
      progress.innerHTML=labels.map((label,index)=>`<div class="${index<=step?'done':''} ${index===step?'current':''}"><i>${index<step?'✓':index+1}</i><span>${label}</span></div>`).join('');
      head.insertAdjacentElement('afterend',progress);
    }
    const firstSection=root.querySelector('.staff-detail-section');
    const items=briefItems(job),notes=String(job?.inputs?.notes||'').trim();
    if(firstSection&&(items.length||notes)){
      const brief=document.createElement('div');brief.className='staff-detail-section staff-v2-brief';
      brief.innerHTML=`<h3>Job brief</h3>${items.length?`<div class="staff-v2-brief-grid">${items.map(([k,v])=>`<div><small>${esc2(k)}</small><strong>${esc2(v)}</strong></div>`).join('')}</div>`:''}${notes?`<div class="staff-v2-customer-instruction"><small>Customer / quote note</small><p>${esc2(notes)}</p></div>`:''}`;
      firstSection.insertAdjacentElement('beforebegin',brief);
    }
    const action=root.querySelector('.staff-action-zone');
    if(action){
      const readiness=document.createElement('div');readiness.className='staff-v2-readiness';
      readiness.innerHTML=`<span><b>${job.beforeImages?.length||0}</b> before photo${(job.beforeImages?.length||0)===1?'':'s'}</span><span><b>${job.afterImages?.length||0}</b> after photo${(job.afterImages?.length||0)===1?'':'s'}</span><span class="${job.staffNotes?'ready':''}">${job.staffNotes?'✓ Notes saved':'No internal notes'}</span>`;
      action.insertAdjacentElement('beforebegin',readiness);
    }
  }

  function installWrappers(){
    if(installed||typeof renderJobs!=='function'||typeof openJob!=='function')return false;
    installed=true;
    const baseRender=renderJobs,baseOpen=openJob;
    renderJobs=async function(){const result=await baseRender();renderOverview();enhanceJobCards();return result};
    openJob=async function(id,keepOpen=false){const result=await baseOpen(id,keepOpen);enhanceJobDetail(jobs.find(j=>j.id===id));return result};
    ensureOverview();renderOverview();enhanceJobCards();
    return true;
  }

  function startAutoRefresh(){
    if(refreshTimer)return;
    refreshTimer=setInterval(async()=>{
      if(document.visibilityState!=='visible'||!navigator.onLine||!currentSession||offlineMode||$('#staffJobDialog')?.open)return;
      try{await loadJobs()}catch{}
    },180000);
  }

  function install(){
    if(!installWrappers()){setTimeout(install,80);return}
    startAutoRefresh();
    window.addEventListener('focus',()=>{renderOverview();enhanceJobCards()});
  }
  install();
})();
