(()=>{
  if(window.__NAMDAR_PAGE_ANALYTICS_V2__)return;
  window.__NAMDAR_PAGE_ANALYTICS_V2__=true;

  const baseRenderReporting=renderReporting;
  const nf=new Intl.NumberFormat('en-GB');
  const money=v=>Number(v||0).toLocaleString('en-GB',{style:'currency',currency:'GBP'});

  function ensureOverviewAnalytics(){
    const value=$('#statViews'),card=value?.closest('.stat-card');
    if(!value||!card)return;
    const label=card.querySelector('small');if(label)label.textContent='Website views';
    if(!$('#statViewsContext')){
      const span=document.createElement('span');span.id='statViewsContext';span.textContent='First-party website analytics';card.appendChild(span);
    }
  }

  function ensureWebsiteAnalyticsPanel(){
    const reports=$('#reports'),stats=reports?.querySelector('.report-stat-grid');
    if(!reports||!stats)return null;
    let panel=$('#websiteAnalyticsPanel');
    if(panel)return panel;
    panel=document.createElement('section');
    panel.id='websiteAnalyticsPanel';
    panel.className='admin-panel report-card website-analytics-panel';
    panel.innerHTML=`
      <div class="panel-head website-analytics-head">
        <div>
          <span class="website-analytics-eyebrow">Analytics v2</span>
          <h2>Website sessions, funnel & acquisition</h2>
          <p>See how real website activity turns into Window Cleaning quotes, bookings and payments.</p>
        </div>
        <span id="websiteAnalyticsPeriod" class="crm-summary">Loading…</span>
      </div>

      <div id="websiteAnalyticsStats" class="website-analytics-stats"></div>

      <div class="website-analytics-grid primary">
        <section class="website-analytics-card website-analytics-trend-card">
          <div class="website-analytics-card-head"><div><h3>Traffic trend</h3><p>Page loads and privacy-friendly browser sessions.</p></div><strong id="websiteAnalyticsTotal"></strong></div>
          <div id="websiteAnalyticsTrend" class="website-analytics-trend"></div>
        </section>
        <section class="website-analytics-card">
          <div class="website-analytics-card-head"><div><h3>Customer funnel</h3><p>Distinct sessions reaching each Window Cleaning stage.</p></div></div>
          <div id="websiteAnalyticsFunnel" class="website-analytics-funnel"></div>
        </section>
      </div>

      <section class="website-analytics-card">
        <div class="website-analytics-card-head"><div><h3>Acquisition performance</h3><p>Which sources generate sessions, quotes, bookings and collected revenue.</p></div></div>
        <div id="websiteAnalyticsAcquisition"></div>
      </section>

      <div class="website-analytics-grid">
        <section class="website-analytics-card">
          <div class="website-analytics-card-head"><div><h3>Campaigns</h3><p>UTM-tagged advertising, flyers, social posts and other campaigns.</p></div></div>
          <div id="websiteAnalyticsCampaigns"></div>
        </section>
        <section class="website-analytics-card">
          <div class="website-analytics-card-head"><div><h3>Customer actions</h3><p>Useful engagement signals beyond page views.</p></div></div>
          <div id="websiteAnalyticsEngagement" class="website-analytics-action-grid"></div>
        </section>
      </div>

      <div class="website-analytics-grid">
        <section class="website-analytics-card">
          <div class="website-analytics-card-head"><div><h3>Pages viewed</h3><p>Where tracked page loads happen.</p></div></div>
          <div id="websiteAnalyticsPages" class="website-analytics-bars"></div>
        </section>
        <section class="website-analytics-card">
          <div class="website-analytics-card-head"><div><h3>Referrer hosts</h3><p>Raw referring hosts for diagnostic context.</p></div></div>
          <div id="websiteAnalyticsReferrers" class="website-analytics-bars"></div>
        </section>
      </div>

      <div id="websiteAnalyticsNote" class="website-analytics-note"></div>`;
    stats.insertAdjacentElement('afterend',panel);
    return panel;
  }

  function metric(label,value,detail='',tone=''){
    return `<div class="website-analytics-stat ${tone}"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(detail)}</span></div>`;
  }
  function sessionChange(s){
    if(s.previousSessions===null)return 'No previous-period comparison';
    const change=Number(s.sessionChangePercent||0),arrow=change>0?'↑':change<0?'↓':'→',sign=change>0?'+':'';
    return `${arrow} ${sign}${change.toFixed(1)}% vs previous period · ${nf.format(s.previousSessions)} sessions`;
  }
  function bars(rows,empty='No data in this period.'){
    if(!rows?.length)return `<div class="crm-empty">${esc(empty)}</div>`;
    const max=Math.max(1,...rows.map(x=>Number(x.views||0)));
    return rows.map(x=>`<div class="website-analytics-bar-row"><div class="website-analytics-bar-label"><strong>${esc(x.label)}</strong><span>${nf.format(x.views)} · ${Number(x.share||0).toFixed(1)}%</span></div><div class="website-analytics-bar-track"><i style="--w:${Math.max(2,Number(x.views||0)/max*100).toFixed(2)}%"></i></div></div>`).join('');
  }
  function trend(rows){
    if(!rows?.length)return '<div class="crm-empty">No tracked traffic in this period.</div>';
    const max=Math.max(1,...rows.map(x=>Number(x.views||0))),showEvery=Math.max(1,Math.ceil(rows.length/8));
    return `<div class="website-analytics-trend-bars">${rows.map((x,i)=>`<div class="website-analytics-trend-item" title="${esc(x.label)} · ${nf.format(x.views)} views · ${nf.format(x.sessions||0)} sessions"><div class="website-analytics-trend-value">${x.views}<small>${x.sessions||0}s</small></div><div class="website-analytics-trend-track"><i style="--h:${Math.max(4,Number(x.views||0)/max*100).toFixed(2)}%"></i></div><small>${i%showEvery===0||i===rows.length-1?esc(x.label):''}</small></div>`).join('')}</div>`;
  }
  function funnel(rows){
    if(!rows?.length)return '<div class="crm-empty">Funnel tracking will populate as customers use the website.</div>';
    const max=Math.max(1,Number(rows[0]?.count||0));
    return rows.map((x,i)=>`<div class="website-funnel-row"><div class="website-funnel-label"><span>${i+1}</span><div><strong>${esc(x.label)}</strong><small>${nf.format(x.count)} session${Number(x.count)===1?'':'s'} · ${Number(x.sessionRate||0).toFixed(1)}% of sessions${i? ` · ${Number(x.stepRate||0).toFixed(1)}% from previous`:''}</small></div></div><div class="website-funnel-track"><i style="--w:${Math.max(x.count?4:0,Number(x.count||0)/max*100).toFixed(2)}%"></i></div></div>`).join('');
  }
  function acquisitionTable(rows,empty='No session attribution yet.'){
    if(!rows?.length)return `<div class="crm-empty">${esc(empty)}</div>`;
    return `<div class="table-scroll"><table class="admin-table crm-table website-analytics-table"><thead><tr><th>Source</th><th>Sessions</th><th>Quotes</th><th>Bookings</th><th>Booking rate</th><th>Revenue</th></tr></thead><tbody>${rows.map(x=>`<tr><td><strong>${esc(x.label)}</strong>${x.campaign?`<br><small>${esc(x.campaign)}</small>`:''}</td><td>${nf.format(x.sessions)}</td><td>${nf.format(x.quotes)}</td><td>${nf.format(x.bookings)}</td><td>${Number(x.bookingRate||0).toFixed(1)}%</td><td><strong>${money(x.revenue)}</strong></td></tr>`).join('')}</tbody></table></div>`;
  }
  function engagement(e={}){
    const items=[
      ['Service interest',e.serviceViews||0,'Sessions that selected/viewed Window Cleaning'],
      ['Phone clicks',e.phoneClicks||0,'Tap-to-call actions'],
      ['Email clicks',e.emailClicks||0,'Email contact actions'],
      ['Support clicks',e.supportClicks||0,'Customer-support actions'],
      ['Quote declines',e.quoteDeclines||0,'Sessions declining a final quote']
    ];
    return items.map(([label,value,detail])=>`<div><small>${esc(label)}</small><strong>${nf.format(value)}</strong><span>${esc(detail)}</span></div>`).join('');
  }

  function renderWebsiteAnalytics(d){
    ensureOverviewAnalytics();
    const panel=ensureWebsiteAnalyticsPanel();if(!panel||!d?.ok)return;
    const s=d.summary||{},range=d.range||{},since=d.sessionTrackingSince?new Date(d.sessionTrackingSince):null;
    $('#websiteAnalyticsPeriod').textContent=`${range.label||'Selected period'} · updated ${new Date(d.generatedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`;
    $('#websiteAnalyticsTotal').textContent=`${nf.format(s.views||0)} views · ${nf.format(s.sessions||0)} sessions`;
    $('#websiteAnalyticsStats').innerHTML=[
      metric('Browser sessions',nf.format(s.sessions||0),sessionChange(s),Number(s.sessionChangePercent||0)>0?'positive':Number(s.sessionChangePercent||0)<0?'negative':''),
      metric('Page views',nf.format(s.views||0),`${Number(s.averageViewsPerDay||0).toFixed(1)} average / day`),
      metric('Pages / session',Number(s.averagePagesPerSession||0).toFixed(2),`${nf.format(s.externalSessions||0)} external · ${nf.format(s.internalSessions||0)} internal`),
      metric('Search sessions',`${Number(s.searchShare||0).toFixed(1)}%`,`${nf.format(s.searchSessions||0)} Google/Bing sessions`),
      metric('Sessions → quotes',`${Number(s.sessionToQuoteRate||0).toFixed(1)}%`,`${nf.format(s.quotes||0)} submitted quote session${Number(s.quotes||0)===1?'':'s'}`),
      metric('Sessions → bookings',`${Number(s.sessionToBookingRate||0).toFixed(1)}%`,`${nf.format(s.bookings||0)} booking session${Number(s.bookings||0)===1?'':'s'}`),
      metric('Sessions → paid',`${Number(s.sessionToPaidRate||0).toFixed(1)}%`,`${nf.format(s.payingCustomers||0)} paying session${Number(s.payingCustomers||0)===1?'':'s'}`),
      metric('Attributed revenue',money(s.attributedRevenue||0),`${money(s.totalRevenue||0)} total · ${money(s.unattributedRevenue||0)} not linked to a v2 session`)
    ].join('');
    $('#websiteAnalyticsTrend').innerHTML=trend(d.trend||[]);
    $('#websiteAnalyticsFunnel').innerHTML=funnel(d.funnel||[]);
    $('#websiteAnalyticsAcquisition').innerHTML=acquisitionTable(d.acquisition||[]);
    $('#websiteAnalyticsCampaigns').innerHTML=acquisitionTable(d.campaigns||[],'No UTM-tagged campaign sessions yet. Use tagged links for flyers, social media and ads.');
    $('#websiteAnalyticsEngagement').innerHTML=engagement(d.engagement||{});
    $('#websiteAnalyticsPages').innerHTML=bars(d.pages||[],'No page-view data in this period.');
    $('#websiteAnalyticsReferrers').innerHTML=bars(d.referrers||[],'No referrer data in this period.');
    const sinceText=since?`Session/funnel tracking began ${since.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})}. Older page-view totals remain available but cannot be converted into historical sessions.`:'Session/funnel tracking will begin with the first Analytics v2 customer session.';
    $('#websiteAnalyticsNote').innerHTML=`<strong>Privacy & interpretation</strong><span>${esc(d.privacyNote||'')}</span><span>${esc(sinceText)}</span>`;
    const ctx=$('#statViewsContext');if(ctx)ctx.textContent=`${nf.format(s.allTimeViews||0)} page views all time · ${nf.format(s.sessions||0)} sessions in ${String(range.label||'selected period').toLowerCase()}`;
  }

  async function loadWebsiteAnalytics(){
    if(!allowed('analytics')||!currentSession)return;
    ensureWebsiteAnalyticsPanel();
    const range=$('#reportRange')?.value||'30d';
    try{renderWebsiteAnalytics(await api(`/api/admin-page-analytics?range=${encodeURIComponent(range)}`))}
    catch(e){const panel=ensureWebsiteAnalyticsPanel();if(panel)$('#websiteAnalyticsStats').innerHTML=`<div class="crm-empty">${esc(e.message)}</div>`}
  }

  renderReporting=function(){baseRenderReporting();loadWebsiteAnalytics()};
  ensureOverviewAnalytics();ensureWebsiteAnalyticsPanel();
  if(currentSession&&allowed('analytics'))loadWebsiteAnalytics();
})();