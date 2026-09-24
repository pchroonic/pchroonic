const {json,db,requireStaff,queryParam,safeError}=require('../lib/server');

const n=v=>Number(v||0);
const round=v=>Number(n(v).toFixed(2));
const pct=(part,total)=>total>0?round(part/total*100):0;
const inRange=(value,start,end)=>{if(!value)return false;const t=new Date(value).getTime();return Number.isFinite(t)&&(!start||t>=start.getTime())&&(!end||t<end.getTime())};
const londonDay=value=>{
  const d=new Date(value);if(!Number.isFinite(d.getTime()))return'';
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
  const get=t=>parts.find(p=>p.type===t)?.value||'';return `${get('year')}-${get('month')}-${get('day')}`;
};
const londonMonth=value=>{
  const d=new Date(value);if(!Number.isFinite(d.getTime()))return'';
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit'}).formatToParts(d);
  const get=t=>parts.find(p=>p.type===t)?.value||'';return `${get('year')}-${get('month')}`;
};
function rangeInfo(key){
  const now=new Date(),end=new Date(now.getTime()+1000);let start=null,label='All time',granularity='month';
  if(key==='7d'){start=new Date(now.getTime()-7*864e5);label='Last 7 days';granularity='day'}
  else if(key==='30d'){start=new Date(now.getTime()-30*864e5);label='Last 30 days';granularity='day'}
  else if(key==='90d'){start=new Date(now.getTime()-90*864e5);label='Last 90 days';granularity='week'}
  else if(key==='ytd'){start=new Date(Date.UTC(now.getUTCFullYear(),0,1));label='Year to date';granularity='month'}
  else key='all';
  return {key,start,end,label,granularity};
}
function previousRange(range){
  if(!range.start)return null;
  const duration=range.end.getTime()-range.start.getTime();
  return {start:new Date(range.start.getTime()-duration),end:new Date(range.start.getTime())};
}
function weekStartKey(value){
  const local=londonDay(value);if(!local)return'';
  const [y,m,d]=local.split('-').map(Number),x=new Date(Date.UTC(y,m-1,d)),dow=(x.getUTCDay()+6)%7;
  x.setUTCDate(x.getUTCDate()-dow);return x.toISOString().slice(0,10);
}
function bucketKey(value,granularity){
  return granularity==='day'?londonDay(value):granularity==='week'?weekStartKey(value):londonMonth(value);
}
function prettyBucket(key,granularity){
  if(granularity==='day')return new Date(`${key}T12:00:00Z`).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'Europe/London'});
  if(granularity==='week')return `w/c ${new Date(`${key}T12:00:00Z`).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'Europe/London'})}`;
  const [y,m]=key.split('-').map(Number);return new Date(Date.UTC(y,m-1,1)).toLocaleDateString('en-GB',{month:'short',year:'2-digit',timeZone:'Europe/London'});
}
function sourceInfo(view={}){
  const utmSource=String(view.utm_source||'').trim(),utmMedium=String(view.utm_medium||'').trim(),campaign=String(view.utm_campaign||'').trim();
  if(utmSource)return {key:`utm:${utmSource.toLowerCase()}|${utmMedium.toLowerCase()}|${campaign.toLowerCase()}`,label:utmMedium?`${utmSource} / ${utmMedium}`:utmSource,campaign,kind:'campaign'};
  const h=String(view.referrer_host||'').toLowerCase();
  if(!h)return {key:'direct',label:'Direct / unknown',campaign:'',kind:'direct'};
  if(h==='namdar.co.uk'||h==='www.namdar.co.uk'||h.includes('namdar-website-starter-1'))return {key:'internal',label:'Namdar internal',campaign:'',kind:'internal'};
  if(h.includes('google.'))return {key:'google-organic',label:'Google Search',campaign:'',kind:'search'};
  if(h==='bing.com'||h.endsWith('.bing.com'))return {key:'bing-organic',label:'Bing Search',campaign:'',kind:'search'};
  return {key:`ref:${h}`,label:h,campaign:'',kind:'referral'};
}
function pageLabel(path=''){
  const p=String(path||'/');if(p==='/'||p==='/index.html')return'Homepage';if(p==='/account')return'My Namdar';return p;
}
function viewTrend(views,range){
  const map=new Map();
  for(const v of views){const key=bucketKey(v.created_at,range.granularity);if(!key)continue;const row=map.get(key)||{key,views:0,sessions:new Set()};row.views++;if(v.session_id)row.sessions.add(v.session_id);map.set(key,row)}
  let rows=[...map.values()].sort((a,b)=>a.key.localeCompare(b.key));
  if(range.key==='all'&&rows.length>24)rows=rows.slice(-24);
  return rows.map(r=>({label:prettyBucket(r.key,range.granularity),views:r.views,sessions:r.sessions.size}));
}
function uniqueVisitors(events,type,extra=()=>true){return new Set(events.filter(e=>e.event_type===type&&extra(e)&&e.visitor_id).map(e=>e.visitor_id))}
function stage(id,label,count,sessions){return {id,label,count,sessionRate:pct(count,sessions)}}

module.exports=async function handler(req,res){try{
  await requireStaff(req,'analytics');
  if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
  const range=rangeInfo(String(queryParam(req,'range','30d')).toLowerCase()),prev=previousRange(range);

  const [views,events,links,quotes,bookings,invoices,payments]=await Promise.all([
    db('page_views?select=id,path,referrer_host,session_id,utm_source,utm_medium,utm_campaign,created_at&order=created_at.asc&limit=20000'),
    db('conversion_events?select=id,event_type,visitor_id,service_key,postcode_area,covered,path,quote_id,booking_id,created_at&order=created_at.asc&limit=20000'),
    db('quote_funnel_links?select=quote_id,visitor_id,created_at&order=created_at.asc&limit=10000'),
    db('quotes?select=id,created_at&order=created_at.asc&limit=10000'),
    db('bookings?select=id,quote_id,status,created_at&order=created_at.asc&limit=10000'),
    db('invoices?select=id,booking_id&limit=10000'),
    db('payment_records?select=id,booking_id,invoice_id,direction,amount,paid_at&order=paid_at.asc&limit=10000')
  ]);

  const allViews=views||[],selectedViews=allViews.filter(v=>inRange(v.created_at,range.start,range.end)),previousViews=prev?allViews.filter(v=>inRange(v.created_at,prev.start,prev.end)):[];
  const selectedEvents=(events||[]).filter(e=>inRange(e.created_at,range.start,range.end));
  const selectedQuotes=(quotes||[]).filter(q=>inRange(q.created_at,range.start,range.end));
  const selectedBookings=(bookings||[]).filter(b=>b.status!=='cancelled'&&inRange(b.created_at,range.start,range.end));
  const selectedPayments=(payments||[]).filter(p=>inRange(p.paid_at,range.start,range.end));

  const selectedSessionIds=new Set(selectedViews.map(v=>v.session_id).filter(Boolean)),previousSessionIds=new Set(previousViews.map(v=>v.session_id).filter(Boolean));
  const sessionTrackingSince=(allViews||[]).find(v=>v.session_id)?.created_at||null;

  const firstViewBySession=new Map();
  for(const v of allViews){if(v.session_id&&!firstViewBySession.has(v.session_id))firstViewBySession.set(v.session_id,v)}
  const sourceBySession=new Map([...firstViewBySession.entries()].map(([id,v])=>[id,sourceInfo(v)]));

  const quoteById=new Map((quotes||[]).map(q=>[q.id,q]));
  const visitorByQuote=new Map((links||[]).map(x=>[x.quote_id,x.visitor_id]));
  const bookingById=new Map((bookings||[]).map(b=>[b.id,b]));
  const invoiceBooking=new Map((invoices||[]).map(i=>[i.id,i.booking_id]));
  const visitorForBooking=b=>b?visitorByQuote.get(b.quote_id)||null:null;
  const visitorForPayment=p=>visitorForBooking(bookingById.get(p.booking_id||invoiceBooking.get(p.invoice_id)))||null;

  const linkedQuoteVisitors=new Set(selectedQuotes.map(q=>visitorByQuote.get(q.id)).filter(Boolean));
  const bookedVisitors=new Set(selectedBookings.map(visitorForBooking).filter(Boolean));
  const paidVisitors=new Set(selectedPayments.filter(p=>p.direction==='payment').map(visitorForPayment).filter(Boolean));
  const quoteStarted=uniqueVisitors(selectedEvents,'quote_started');
  const coveragePassed=uniqueVisitors(selectedEvents,'postcode_checked',e=>e.covered===true);
  const quoteAccepted=uniqueVisitors(selectedEvents,'quote_accepted');
  const checkoutStarted=uniqueVisitors(selectedEvents,'checkout_started');

  const funnel=[
    stage('sessions','Sessions',selectedSessionIds.size,selectedSessionIds.size),
    stage('quote_started','Quote started',quoteStarted.size,selectedSessionIds.size),
    stage('coverage','Coverage passed',coveragePassed.size,selectedSessionIds.size),
    stage('quote_submitted','Quote submitted',linkedQuoteVisitors.size,selectedSessionIds.size),
    stage('quote_accepted','Quote accepted',quoteAccepted.size,selectedSessionIds.size),
    stage('booking_submitted','Booking submitted',bookedVisitors.size,selectedSessionIds.size),
    stage('checkout_started','Checkout started',checkoutStarted.size,selectedSessionIds.size),
    stage('paid','Paid customer',paidVisitors.size,selectedSessionIds.size)
  ].map((x,i,a)=>({...x,stepRate:i===0?100:pct(x.count,a[i-1].count)}));

  const sourceRows=new Map();
  function rowFor(visitor){
    const source=sourceBySession.get(visitor)||{key:'unattributed',label:'Unattributed',campaign:'',kind:'unknown'};
    if(!sourceRows.has(source.key))sourceRows.set(source.key,{...source,sessions:new Set(),quotes:new Set(),bookings:new Set(),revenue:0});
    return sourceRows.get(source.key);
  }
  for(const visitor of selectedSessionIds)rowFor(visitor).sessions.add(visitor);
  for(const q of selectedQuotes){const visitor=visitorByQuote.get(q.id);if(visitor)rowFor(visitor).quotes.add(q.id)}
  for(const b of selectedBookings){const visitor=visitorForBooking(b);if(visitor)rowFor(visitor).bookings.add(b.id)}
  for(const p of selectedPayments){const visitor=visitorForPayment(p);if(visitor)rowFor(visitor).revenue+=p.direction==='refund'?-n(p.amount):n(p.amount)}
  const acquisition=[...sourceRows.values()].map(r=>({key:r.key,label:r.label,campaign:r.campaign,kind:r.kind,sessions:r.sessions.size,quotes:r.quotes.size,bookings:r.bookings.size,revenue:round(r.revenue),bookingRate:pct(r.bookings.size,r.sessions.size),share:pct(r.sessions.size,selectedSessionIds.size)})).sort((a,b)=>b.sessions-a.sessions||b.revenue-a.revenue);
  const campaigns=acquisition.filter(x=>x.kind==='campaign');

  const pageMap=new Map(),referrerMap=new Map();
  for(const v of selectedViews){
    const page=pageLabel(v.path);pageMap.set(page,(pageMap.get(page)||0)+1);
    const ref=String(v.referrer_host||'').trim().toLowerCase()||'Direct / unknown';referrerMap.set(ref,(referrerMap.get(ref)||0)+1);
  }
  const sortViewRows=map=>[...map.entries()].map(([label,views])=>({label,views,share:pct(views,selectedViews.length)})).sort((a,b)=>b.views-a.views||a.label.localeCompare(b.label));
  const pages=sortViewRows(pageMap).slice(0,10),referrers=sortViewRows(referrerMap).slice(0,10);

  const searchSessions=acquisition.filter(x=>x.kind==='search'||(x.kind==='campaign'&&/^(google|bing)$/i.test(x.label.split('/')[0].trim()))).reduce((a,x)=>a+x.sessions,0);
  const directSessions=acquisition.filter(x=>x.kind==='direct').reduce((a,x)=>a+x.sessions,0);
  const internalSessions=acquisition.filter(x=>x.kind==='internal').reduce((a,x)=>a+x.sessions,0);
  const externalSessions=Math.max(0,selectedSessionIds.size-internalSessions);
  const durationDays=range.start?Math.max(1,(range.end-range.start)/864e5):selectedViews.length&&selectedViews[0]?.created_at?Math.max(1,(range.end-new Date(selectedViews[0].created_at))/864e5):1;
  const sessionChange=prev?(previousSessionIds.size?round((selectedSessionIds.size-previousSessionIds.size)/previousSessionIds.size*100):(selectedSessionIds.size?100:0)):null;

  const engagement={
    serviceViews:uniqueVisitors(selectedEvents,'service_viewed').size,
    phoneClicks:uniqueVisitors(selectedEvents,'phone_clicked').size,
    emailClicks:uniqueVisitors(selectedEvents,'email_clicked').size,
    supportClicks:uniqueVisitors(selectedEvents,'support_clicked').size,
    quoteDeclines:uniqueVisitors(selectedEvents,'quote_declined').size
  };

  return json(res,200,{
    ok:true,
    version:'analytics-v2',
    range:{key:range.key,label:range.label,start:range.start?range.start.toISOString():null,end:range.end.toISOString()},
    summary:{
      views:selectedViews.length,
      allTimeViews:allViews.length,
      sessions:selectedSessionIds.size,
      previousSessions:prev?previousSessionIds.size:null,
      sessionChangePercent:sessionChange,
      externalSessions,
      internalSessions,
      averageViewsPerDay:round(selectedViews.length/durationDays),
      averagePagesPerSession:selectedSessionIds.size?round(selectedViews.filter(v=>v.session_id).length/selectedSessionIds.size):0,
      searchSessions,
      searchShare:pct(searchSessions,selectedSessionIds.size),
      directSessions,
      directShare:pct(directSessions,selectedSessionIds.size),
      quotes:linkedQuoteVisitors.size,
      bookings:bookedVisitors.size,
      payingCustomers:paidVisitors.size,
      sessionToQuoteRate:pct(linkedQuoteVisitors.size,selectedSessionIds.size),
      sessionToBookingRate:pct(bookedVisitors.size,selectedSessionIds.size),
      sessionToPaidRate:pct(paidVisitors.size,selectedSessionIds.size),
      revenue:round(selectedPayments.reduce((a,p)=>a+(p.direction==='refund'?-n(p.amount):n(p.amount)),0))
    },
    trend:viewTrend(selectedViews,range),
    funnel,
    acquisition,
    campaigns,
    pages,
    referrers,
    engagement,
    sessionTrackingSince,
    firstTrackedAt:allViews[0]?.created_at||null,
    lastTrackedAt:allViews[allViews.length-1]?.created_at||null,
    privacyNote:'Sessions use a temporary first-party sessionStorage identifier. Namdar does not use this analytics layer to fingerprint a device or identify a unique person across browser sessions.',
    generatedAt:new Date().toISOString()
  });
}catch(e){return safeError(res,e)}};
