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
  if(key==='30d'){start=new Date(now.getTime()-30*864e5);label='Last 30 days';granularity='day'}
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
function sourceGroup(host=''){
  const h=String(host||'').toLowerCase();
  if(!h)return'Direct / unknown';
  if(h==='namdar.co.uk'||h==='www.namdar.co.uk'||h.includes('namdar-website-starter-1'))return'Namdar internal';
  if(h.includes('google.'))return'Google Search';
  if(h==='bing.com'||h.endsWith('.bing.com'))return'Bing Search';
  return'Other external';
}
function pageLabel(path=''){
  const p=String(path||'/');
  if(p==='/'||p==='/index.html')return'Homepage';
  return p;
}
function trendRows(views,range){
  const map=new Map();
  for(const v of views){
    const key=bucketKey(v.created_at,range.granularity);if(!key)continue;
    map.set(key,(map.get(key)||0)+1);
  }
  let rows=[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([key,views])=>({key,label:prettyBucket(key,range.granularity),views}));
  if(range.key==='all'&&rows.length>24)rows=rows.slice(-24);
  return rows;
}

module.exports=async function handler(req,res){try{
  await requireStaff(req,'analytics');
  if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
  const range=rangeInfo(String(queryParam(req,'range','30d')).toLowerCase()),prev=previousRange(range);

  const [views,quotes,bookings]=await Promise.all([
    db('page_views?select=id,path,referrer_host,created_at&order=created_at.asc&limit=20000'),
    db('quotes?select=id,created_at&order=created_at.asc&limit=5000'),
    db('bookings?select=id,created_at,status&order=created_at.asc&limit=5000')
  ]);

  const allViews=views||[],selected=allViews.filter(v=>inRange(v.created_at,range.start,range.end));
  const previous=prev?allViews.filter(v=>inRange(v.created_at,prev.start,prev.end)):[];
  const selectedQuotes=(quotes||[]).filter(q=>inRange(q.created_at,range.start,range.end));
  const selectedBookings=(bookings||[]).filter(b=>b.status!=='cancelled'&&inRange(b.created_at,range.start,range.end));

  const sourceMap=new Map(),hostMap=new Map(),pageMap=new Map();
  for(const v of selected){
    const source=sourceGroup(v.referrer_host),host=String(v.referrer_host||'').trim().toLowerCase()||'Direct / unknown',page=pageLabel(v.path);
    sourceMap.set(source,(sourceMap.get(source)||0)+1);
    hostMap.set(host,(hostMap.get(host)||0)+1);
    pageMap.set(page,(pageMap.get(page)||0)+1);
  }
  const sortRows=map=>[...map.entries()].map(([label,views])=>({label,views,share:pct(views,selected.length)})).sort((a,b)=>b.views-a.views||a.label.localeCompare(b.label));
  const sources=sortRows(sourceMap),referrers=sortRows(hostMap).slice(0,8),pages=sortRows(pageMap).slice(0,10);
  const searchViews=(sourceMap.get('Google Search')||0)+(sourceMap.get('Bing Search')||0);
  const directViews=sourceMap.get('Direct / unknown')||0;
  const internalViews=sourceMap.get('Namdar internal')||0;
  const externalViews=Math.max(0,selected.length-internalViews);
  const days=range.start?Math.max(1,(range.end-range.start)/864e5):allViews.length?Math.max(1,(range.end-new Date(allViews[0].created_at))/864e5):1;
  const changePercent=prev?(previous.length?round((selected.length-previous.length)/previous.length*100):(selected.length?100:0)):null;

  return json(res,200,{
    ok:true,
    range:{key:range.key,label:range.label,start:range.start?range.start.toISOString():null,end:range.end.toISOString()},
    summary:{
      views:selected.length,
      allTimeViews:allViews.length,
      previousViews:prev?previous.length:null,
      changePercent,
      averagePerDay:round(selected.length/days),
      searchViews,
      searchShare:pct(searchViews,selected.length),
      directViews,
      directShare:pct(directViews,selected.length),
      internalViews,
      externalViews,
      quotes:selectedQuotes.length,
      bookings:selectedBookings.length,
      viewsToQuotesRate:pct(selectedQuotes.length,selected.length),
      viewsToBookingsRate:pct(selectedBookings.length,selected.length)
    },
    trend:trendRows(selected,range),
    sources,
    referrers,
    pages,
    firstTrackedAt:allViews[0]?.created_at||null,
    lastTrackedAt:allViews[allViews.length-1]?.created_at||null,
    privacyNote:'Page views are page loads, not unique people. Namdar does not currently store a persistent visitor or device identifier in this analytics table.',
    generatedAt:new Date().toISOString()
  });
}catch(e){return safeError(res,e)}};
