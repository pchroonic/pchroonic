(()=>{
  if(window.__NAMDAR_REPORT_HUB__)return;
  window.__NAMDAR_REPORT_HUB__=true;

  const REPORTS={
    overview:{title:'Business overview',short:'Overview',mark:'OV',description:'Key revenue, invoicing, conversion, jobs and customer-rating indicators in one place.',period:true,export:true},
    revenue:{title:'Revenue & payments',short:'Revenue',mark:'£',description:'Revenue trend and payment-method performance for the selected period.',period:true,export:true},
    quotes:{title:'Quotes & conversion',short:'Quotes',mark:'Q',description:'See how quote requests move through the conversion funnel.',period:true,export:true},
    services:{title:'Service performance',short:'Services',mark:'SV',description:'Compare lead volume, completed work, conversion and collected revenue by service.',period:true,export:true},
    staff:{title:'Staff workload',short:'Staff',mark:'ST',description:'Review scheduled jobs and operational hours across the team.',period:true,export:true},
    feedback:{title:'Customer feedback',short:'Feedback',mark:'★',description:'Understand customer ratings and feedback distribution for the selected period.',period:true,export:true},
    website:{title:'Website analytics',short:'Website',mark:'WA',description:'Sessions, traffic trends, acquisition, campaigns and the customer journey from visit to payment.',period:true,export:false},
    window:{title:'Window Cleaning performance',short:'Windows',mark:'WC',description:'Window Cleaning funnel, completed-job economics, work time and reviewed direct costs.',period:true,export:false},
    finance:{title:'Business Finance',short:'Finance',mark:'BF',description:'Private management accounts, tax reserve, VAT/MTD monitoring, expenses and Smart Receipts.',period:false,export:false,refresh:true}
  };
  const CORE=new Set(['overview','revenue','quotes','services','staff','feedback']);
  const initialParam=new URLSearchParams(location.search).get('report');
  const initialReport=REPORTS[initialParam]?initialParam:'hub';
  let initialPending=initialReport!=='hub';
  let setupDone=false,activatedOnce=false,current='hub',adoptQueued=false;

  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const root=()=>document.getElementById('reports');
  const page=id=>document.getElementById('reportPage-'+id);

  function pageShell(id){
    const el=document.createElement('section');
    el.id='reportPage-'+id;
    el.className='report-subpage';
    el.dataset.reportPage=id;
    el.hidden=true;
    const body=document.createElement('div');
    body.className='report-subpage-content';
    body.id='reportPageContent-'+id;
    el.appendChild(body);
    return el;
  }
  function moveNode(node,id){
    if(!node)return;
    const body=document.getElementById('reportPageContent-'+id);
    if(body&&node.parentElement!==body)body.appendChild(node);
  }
  function cleanupEmptyGrids(){
    const r=root();if(!r)return;
    r.querySelectorAll('.report-grid').forEach(grid=>{if(!grid.children.length)grid.remove()});
  }
  function adoptStatic(){
    moveNode(document.getElementById('reportRevenue')?.closest('.report-stat-grid'),'overview');
    moveNode(document.getElementById('reportRevenueChart')?.closest('.report-card'),'revenue');
    moveNode(document.getElementById('reportPaymentMethods')?.closest('.report-card'),'revenue');
    moveNode(document.getElementById('reportQuoteFunnel')?.closest('.report-card'),'quotes');
    moveNode(document.getElementById('reportServiceTable')?.closest('.report-card'),'services');
    moveNode(document.getElementById('reportStaffTable')?.closest('.report-card'),'staff');
    moveNode(document.getElementById('reportFeedbackBreakdown')?.closest('.report-card'),'feedback');
    cleanupEmptyGrids();
  }
  function adoptDynamic(){
    moveNode(document.getElementById('websiteAnalyticsPanel'),'website');
    moveNode(document.getElementById('windowPerformancePanel'),'window');
    moveNode(document.getElementById('businessFinancePanel'),'finance');
  }
  function queueAdopt(){
    if(adoptQueued)return;
    adoptQueued=true;
    requestAnimationFrame(()=>{adoptQueued=false;adoptStatic();adoptDynamic()});
  }
  function cards(){
    return Object.entries(REPORTS).map(([id,x])=>`
      <button type="button" class="report-hub-card" data-report-open="${esc(id)}">
        <span class="report-hub-mark" aria-hidden="true">${esc(x.mark)}</span>
        <span class="report-hub-copy">
          <small>${esc(x.short)} report</small>
          <strong>${esc(x.title)}</strong>
          <span>${esc(x.description)}</span>
        </span>
        <span class="report-hub-open">View report <b aria-hidden="true">→</b></span>
      </button>`).join('');
  }
  function setHeader(id){
    const meta=id==='hub'?{title:'Reporting',description:'Choose the area you want to review. Each report now has its own workspace and URL.'}:REPORTS[id];
    const title=document.getElementById('reportHubTitle');
    const desc=document.getElementById('reportHubDescription');
    const crumb=document.getElementById('reportHubBreadcrumb');
    const back=document.getElementById('reportHubBack');
    const generated=document.getElementById('reportGenerated');
    const actions=document.querySelector('#reports .report-actions');
    const range=document.getElementById('reportRange')?.closest('label');
    const refresh=document.getElementById('reportRefresh');
    const exportBtn=document.getElementById('reportExport');
    if(title)title.textContent=meta.title;
    if(desc)desc.textContent=meta.description;
    if(crumb)crumb.innerHTML=id==='hub'?'<strong>Reporting</strong>':`<button type="button" data-report-home>Reporting</button><span>/</span><strong>${esc(meta.title)}</strong>`;
    if(back)back.hidden=id==='hub';
    if(actions)actions.hidden=id==='hub';
    if(range)range.hidden=id!=='hub'&&!meta.period;
    if(refresh)refresh.hidden=id!=='hub'&&meta.refresh===false;
    if(exportBtn)exportBtn.hidden=id==='hub'||!meta.export;
    if(generated)generated.hidden=id==='hub'||!CORE.has(id);
    const adminTitle=document.getElementById('adminTitle');
    if(adminTitle)adminTitle.textContent=id==='hub'?'Reporting':`Reporting — ${meta.short}`;
  }
  function setUrl(id,mode='push'){
    const u=new URL(location.href);
    u.pathname='/admin';
    u.searchParams.set('tab','reports');
    if(id==='hub')u.searchParams.delete('report');else u.searchParams.set('report',id);
    const next=u.pathname+u.search;
    if(mode==='replace')history.replaceState({report:id},'',next);
    else if(mode==='push')history.pushState({report:id},'',next);
  }
  function open(id,{historyMode='push',scroll=true}={}){
    if(id!=='hub'&&!REPORTS[id])id='hub';
    current=id;
    const hub=document.getElementById('reportHubHome');
    if(hub)hub.hidden=id!=='hub';
    for(const key of Object.keys(REPORTS)){const p=page(key);if(p)p.hidden=id!==key}
    setHeader(id);
    if(historyMode)setUrl(id,historyMode);
    if(scroll)root()?.scrollIntoView({behavior:'smooth',block:'start'});
    window.dispatchEvent(new CustomEvent('namdar:report-view',{detail:{report:id}}));
    if(CORE.has(id)&&typeof reportingTools==='function')Promise.resolve(reportingTools()).catch(()=>{});
    queueAdopt();
  }
  function bind(){
    const r=root();if(!r)return;
    r.addEventListener('click',e=>{
      const openBtn=e.target.closest('[data-report-open]');
      if(openBtn){open(openBtn.dataset.reportOpen,{historyMode:'push'});return}
      if(e.target.closest('[data-report-home]')||e.target.closest('#reportHubBack'))open('hub',{historyMode:'push'});
    });
    const tab=document.querySelector('[data-tab="reports"]');
    if(tab&&!tab.dataset.reportHubBound){
      tab.dataset.reportHubBound='1';
      tab.addEventListener('click',()=>setTimeout(()=>{if(!root()?.classList.contains('hidden'))open('hub',{historyMode:'replace',scroll:false})},0));
    }
    window.addEventListener('popstate',()=>{
      const p=new URLSearchParams(location.search);
      if(p.get('tab')!=='reports')return;
      open(REPORTS[p.get('report')]?p.get('report'):'hub',{historyMode:false,scroll:false});
    });
  }
  function activateWhenVisible(){
    const r=root();if(!r)return;
    const activate=()=>{
      if(r.classList.contains('hidden'))return;
      if(initialPending){initialPending=false;activatedOnce=true;open(initialReport,{historyMode:'replace',scroll:false})}
      else if(!activatedOnce){activatedOnce=true;open('hub',{historyMode:'replace',scroll:false})}
    };
    new MutationObserver(activate).observe(r,{attributes:true,attributeFilter:['class']});
    activate();
  }
  function setup(){
    const r=root();if(!r||document.getElementById('reportHubHome'))return;
    setupDone=true;
    const head=r.querySelector('.reporting-head');
    if(!head)return;
    head.classList.add('report-hub-header');
    const headCopy=head.querySelector('.panel-head > div:first-child');
    if(headCopy){
      const oldTitle=headCopy.querySelector('h2'),oldDesc=headCopy.querySelector('p');
      const crumb=document.createElement('div');crumb.id='reportHubBreadcrumb';crumb.className='report-breadcrumb';crumb.innerHTML='<strong>Reporting</strong>';
      headCopy.insertBefore(crumb,headCopy.firstChild);
      if(oldTitle)oldTitle.id='reportHubTitle';
      if(oldDesc)oldDesc.id='reportHubDescription';
    }
    const actionWrap=head.querySelector('.report-actions');
    if(actionWrap){
      const back=document.createElement('button');back.id='reportHubBack';back.type='button';back.className='ghost-btn small report-hub-back';back.textContent='← All reports';back.hidden=true;
      actionWrap.insertBefore(back,actionWrap.firstChild);
    }
    const hub=document.createElement('div');
    hub.id='reportHubHome';
    hub.className='report-hub-home';
    hub.innerHTML=`<div class="report-hub-intro"><div><span class="website-analytics-eyebrow">Report centre</span><h2>Choose what you want to review</h2><p>Open one focused report at a time. Your Finance workspace, website analytics and operating reports are now separated.</p></div><span class="report-hub-count">${Object.keys(REPORTS).length} reports</span></div><div class="report-hub-grid">${cards()}</div>`;

    const pages=document.createElement('div');pages.id='reportPages';pages.className='report-pages';
    for(const id of Object.keys(REPORTS))pages.appendChild(pageShell(id));
    head.insertAdjacentElement('afterend',hub);hub.insertAdjacentElement('afterend',pages);
    adoptStatic();adoptDynamic();bind();

    new MutationObserver(queueAdopt).observe(r,{childList:true,subtree:true});
    activateWhenVisible();
  }

  window.NamdarReportHub={open,current:()=>current,reports:REPORTS};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();