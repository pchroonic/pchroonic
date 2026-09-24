(()=>{
  if(window.__NAMDAR_PAGE_ANALYTICS__)return;
  window.__NAMDAR_PAGE_ANALYTICS__=true;

  const baseRenderReporting=renderReporting;
  const nf=new Intl.NumberFormat('en-GB');

  function ensureOverviewAnalytics(){
    const value=$('#statViews'),card=value?.closest('.stat-card');
    if(!value||!card)return;
    const label=card.querySelector('small');if(label)label.textContent='Website views';
    if(!$('#statViewsContext')){
      const span=document.createElement('span');span.id='statViewsContext';span.textContent='Tracked page loads · privacy-friendly';card.appendChild(span);
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
          <span class="website-analytics-eyebrow">Website analytics</span>
          <h2>Page views & lead activity</h2>
          <p>Understand traffic volume, where visits come from and how website activity relates to quote requests and bookings.</p>
        </div>
        <span id="websiteAnalyticsPeriod" class="crm-summary">Loading…</span>
      </div>
      <div id="websiteAnalyticsStats" class="website-analytics-stats"></div>
      <div class="website-analytics-grid">
        <section class="website-analytics-card website-analytics-trend-card">
          <div class="website-analytics-card-head"><div><h3>Traffic trend</h3><p>Tracked page loads over the selected reporting period.</p></div><strong id="websiteAnalyticsTotal"></strong></div>
          <div id="websiteAnalyticsTrend" class="website-analytics-trend"></div>
        </section>
        <section class="website-analytics-card">
          <div class="website-analytics-card-head"><div><h3>Traffic sources</h3><p>Referrer categories for tracked views.</p></div></div>
          <div id="websiteAnalyticsSources" class="website-analytics-bars"></div>
        </section>
      </div>
      <div class="website-analytics-grid">
        <section class="website-analytics-card">
          <div class="website-analytics-card-head"><div><h3>Landing pages</h3><p>Pages receiving tracked views.</p></div></div>
          <div id="websiteAnalyticsPages" class="website-analytics-bars"></div>
        </section>
        <section class="website-analytics-card">
          <div class="website-analytics-card-head"><div><h3>Top referrers</h3><p>Hosts that sent traffic to Namdar.</p></div></div>
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

  function changeText(summary,range){
    if(summary.previousViews===null)return 'No previous-period comparison';
    const change=Number(summary.changePercent||0),arrow=change>0?'↑':change<0?'↓':'→',sign=change>0?'+':'';
    return `${arrow} ${sign}${change.toFixed(1)}% vs previous period (${nf.format(summary.previousViews)} views)`;
  }

  function barRows(rows,empty='No data in this period.'){
    if(!rows?.length)return `<div class="crm-empty">${esc(empty)}</div>`;
    const max=Math.max(1,...rows.map(x=>Number(x.views||0)));
    return rows.map(x=>`<div class="website-analytics-bar-row"><div class="website-analytics-bar-label"><strong>${esc(x.label)}</strong><span>${nf.format(x.views)} · ${Number(x.share||0).toFixed(1)}%</span></div><div class="website-analytics-bar-track"><i style="--w:${Math.max(2,Number(x.views||0)/max*100).toFixed(2)}%"></i></div></div>`).join('');
  }

  function trendRows(rows){
    if(!rows?.length)return '<div class="crm-empty">No tracked views in this period.</div>';
    const max=Math.max(1,...rows.map(x=>Number(x.views||0))),showEvery=Math.max(1,Math.ceil(rows.length/8));
    return `<div class="website-analytics-trend-bars">${rows.map((x,i)=>`<div class="website-analytics-trend-item" title="${esc(x.label)} · ${nf.format(x.views)} views" aria-label="${esc(x.label)}: ${nf.format(x.views)} views"><div class="website-analytics-trend-value">${x.views}</div><div class="website-analytics-trend-track"><i style="--h:${Math.max(4,Number(x.views||0)/max*100).toFixed(2)}%"></i></div><small>${i%showEvery===0||i===rows.length-1?esc(x.label):''}</small></div>`).join('')}</div>`;
  }

  function renderWebsiteAnalytics(d){
    ensureOverviewAnalytics();
    const panel=ensureWebsiteAnalyticsPanel();if(!panel||!d?.ok)return;
    const s=d.summary||{},range=d.range||{};
    $('#websiteAnalyticsPeriod').textContent=`${range.label||'Selected period'} · updated ${new Date(d.generatedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`;
    $('#websiteAnalyticsTotal').textContent=`${nf.format(s.views||0)} views`;
    $('#websiteAnalyticsStats').innerHTML=[
      metric('Page views',nf.format(s.views||0),changeText(s,range),Number(s.changePercent||0)>0?'positive':Number(s.changePercent||0)<0?'negative':''),
      metric('Average / day',Number(s.averagePerDay||0).toFixed(1),`${nf.format(s.allTimeViews||0)} tracked all time`),
      metric('Search traffic',`${Number(s.searchShare||0).toFixed(1)}%`,`${nf.format(s.searchViews||0)} Google / Bing views`),
      metric('Direct / unknown',`${Number(s.directShare||0).toFixed(1)}%`,`${nf.format(s.directViews||0)} views`),
      metric('Views → quotes',`${Number(s.viewsToQuotesRate||0).toFixed(1)}%`,`${nf.format(s.quotes||0)} quote request${Number(s.quotes||0)===1?'':'s'}`),
      metric('Views → bookings',`${Number(s.viewsToBookingsRate||0).toFixed(1)}%`,`${nf.format(s.bookings||0)} booking${Number(s.bookings||0)===1?'':'s'} created`)
    ].join('');
    $('#websiteAnalyticsTrend').innerHTML=trendRows(d.trend||[]);
    $('#websiteAnalyticsSources').innerHTML=barRows(d.sources||[],'No traffic-source data in this period.');
    $('#websiteAnalyticsPages').innerHTML=barRows(d.pages||[],'No landing-page data in this period.');
    $('#websiteAnalyticsReferrers').innerHTML=barRows(d.referrers||[],'No referrer data in this period.');
    $('#websiteAnalyticsNote').innerHTML=`<strong>Privacy note</strong><span>${esc(d.privacyNote||'')}</span><span>Views-to-quotes/bookings are business ratios based on page loads, not individual-user attribution.</span>`;
    const ctx=$('#statViewsContext');
    if(ctx)ctx.textContent=`${nf.format(s.allTimeViews||0)} total · ${nf.format(s.views||0)} ${String(range.label||'selected period').toLowerCase()}`;
  }

  async function loadWebsiteAnalytics(){
    if(!allowed('analytics')||!currentSession)return;
    ensureWebsiteAnalyticsPanel();
    const range=$('#reportRange')?.value||'30d';
    try{
      const d=await api(`/api/admin-page-analytics?range=${encodeURIComponent(range)}`);
      renderWebsiteAnalytics(d);
    }catch(e){
      const panel=ensureWebsiteAnalyticsPanel();
      if(panel)$('#websiteAnalyticsStats').innerHTML=`<div class="crm-empty">${esc(e.message)}</div>`;
    }
  }

  renderReporting=function(){
    baseRenderReporting();
    loadWebsiteAnalytics();
  };

  ensureOverviewAnalytics();
  ensureWebsiteAnalyticsPanel();
  if(currentSession&&allowed('analytics'))loadWebsiteAnalytics();
})();