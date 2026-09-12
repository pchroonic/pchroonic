const {json,parseBody,queryParam,db,requireStaff,auditLog,safeError}=require('../lib/server');

const n=v=>Number(v||0),round=v=>Number(n(v).toFixed(2));
const inRange=(value,start,end)=>{if(!value)return false;const t=new Date(value).getTime();return Number.isFinite(t)&&(!start||t>=start.getTime())&&(!end||t<end.getTime())};
function rangeInfo(key){const now=new Date(),end=new Date(now.getTime()+1000);let start=null,label='All time';if(key==='30d'){start=new Date(now.getTime()-30*864e5);label='Last 30 days'}else if(key==='90d'){start=new Date(now.getTime()-90*864e5);label='Last 90 days'}else if(key==='ytd'){start=new Date(Date.UTC(now.getUTCFullYear(),0,1));label='Year to date'}else key='all';return{key,start,end,label}}
function pct(a,b){return b?round(a/b*100):0}
function money(v){return Math.max(0,round(v))}
function bounded(v,min,max,fallback=0){const x=Number(v);return Number.isFinite(x)?Math.max(min,Math.min(max,x)):fallback}

async function loadData(range){
  const [events,links,quotes,bookings,invoices,costs,settings]=await Promise.all([
    db('conversion_events?service_key=eq.windows&select=event_type,visitor_id,postcode_area,covered,created_at&order=created_at.asc&limit=10000').catch(()=>[]),
    db('quote_funnel_links?select=quote_id,visitor_id,created_at&order=created_at.asc&limit=10000').catch(()=>[]),
    db('quotes?service_key=eq.windows&select=id,status,created_at,sent_at,customer_response,customer_responded_at,final_price,automatic_estimate&order=created_at.asc&limit=10000').catch(()=>[]),
    db('bookings?select=id,quote_id,status,work_status,starts_at,ends_at,started_at,completed_at,created_at&order=created_at.asc&limit=10000').catch(()=>[]),
    db('invoices?select=id,booking_id,total,status,created_at&limit=10000').catch(()=>[]),
    db('booking_job_costs?select=booking_id,consumables_cost,parking_cost,travel_cost,other_cost,travel_minutes,travel_miles,notes,updated_at&limit=10000').catch(()=>[]),
    db('site_settings?key=eq.window_profitability&select=value&limit=1').catch(()=>[])
  ]);
  const quoteMap=new Map((quotes||[]).map(q=>[q.id,q])),bookingMap=new Map((bookings||[]).map(b=>[b.id,b])),invoiceByBooking=new Map(),costByBooking=new Map((costs||[]).map(c=>[c.booking_id,c]));
  for(const i of invoices||[]){if(i.booking_id&&i.status!=='void')invoiceByBooking.set(i.booking_id,i)}
  const periodEvents=(events||[]).filter(e=>inRange(e.created_at,range.start,range.end));
  const postcodeVisitors=new Set(periodEvents.map(e=>e.visitor_id)),coveredVisitors=new Set(periodEvents.filter(e=>e.covered===true).map(e=>e.visitor_id));
  const linkedQuoteIds=new Set((links||[]).filter(l=>coveredVisitors.has(l.visitor_id)&&quoteMap.has(l.quote_id)).map(l=>l.quote_id));
  const guide=[...linkedQuoteIds].map(id=>quoteMap.get(id)).filter(Boolean),final=guide.filter(q=>q.sent_at||['sent','approved'].includes(q.status)),accepted=guide.filter(q=>q.customer_response==='accepted');
  const bookingsForGuide=(bookings||[]).filter(b=>linkedQuoteIds.has(b.quote_id)&&b.status!=='cancelled'),completedForGuide=bookingsForGuide.filter(b=>b.work_status==='completed'||b.status==='completed');
  const steps=[
    {key:'postcode',label:'Postcode checks',count:postcodeVisitors.size},
    {key:'covered',label:'Covered checks',count:coveredVisitors.size},
    {key:'estimate',label:'Guide estimates',count:guide.length},
    {key:'final',label:'Final quotes sent',count:final.length},
    {key:'accepted',label:'Quotes accepted',count:accepted.length},
    {key:'booked',label:'Appointments booked',count:bookingsForGuide.length},
    {key:'completed',label:'Jobs completed',count:completedForGuide.length}
  ].map((s,i,a)=>({...s,fromPrevious:i?pct(s.count,a[i-1].count):100,fromTop:pct(s.count,a[0].count)}));

  const completed=(bookings||[]).filter(b=>{const q=quoteMap.get(b.quote_id);return q&&(b.work_status==='completed'||b.status==='completed')&&inRange(b.completed_at||b.ends_at,range.start,range.end)});
  const labourRate=bounded(settings?.[0]?.value?.labourCostPerHour,0,500,0),jobs=completed.map(b=>{
    const q=quoteMap.get(b.quote_id)||{},invoice=invoiceByBooking.get(b.id),c=costByBooking.get(b.id)||null;
    const jobValue=money(invoice?.total??q.final_price??q.automatic_estimate),direct=money(n(c?.consumables_cost)+n(c?.parking_cost)+n(c?.travel_cost)+n(c?.other_cost));
    const start=new Date(b.started_at||0),finish=new Date(b.completed_at||0),actualMinutes=Number.isFinite(start.getTime())&&Number.isFinite(finish.getTime())&&finish>start?Math.round((finish-start)/60000):0;
    const labour=labourRate>0&&actualMinutes>0?round(actualMinutes/60*labourRate):null;
    return {bookingId:b.id,quoteId:b.quote_id,completedAt:b.completed_at||b.ends_at,jobValue,directCosts:direct,contributionBeforeLabour:round(jobValue-direct),actualMinutes,labourCost:labour,estimatedProfit:labour==null?null:round(jobValue-direct-labour),travelMinutes:Number(c?.travel_minutes||0),travelMiles:round(c?.travel_miles||0),costCaptured:!!c,costs:c||{consumables_cost:0,parking_cost:0,travel_cost:0,other_cost:0,travel_minutes:0,travel_miles:0,notes:''}};
  });
  const totalValue=round(jobs.reduce((a,x)=>a+x.jobValue,0)),directCosts=round(jobs.reduce((a,x)=>a+x.directCosts,0)),actualMinutes=jobs.reduce((a,x)=>a+x.actualMinutes,0),captured=jobs.filter(x=>x.costCaptured).length,timed=jobs.filter(x=>x.actualMinutes>0).length;
  const labourReady=labourRate>0&&jobs.length>0&&timed===jobs.length,labourCost=labourReady?round(jobs.reduce((a,x)=>a+(x.labourCost||0),0)):null,estimatedProfit=labourReady?round(totalValue-directCosts-labourCost):null;
  return {range:{key:range.key,label:range.label,start:range.start?.toISOString()||null,end:range.end.toISOString()},funnel:{trackingStarted:true,steps},profitability:{labourCostPerHour:labourRate,labourConfigured:labourRate>0,completedJobs:jobs.length,totalJobValue:totalValue,averageJobValue:jobs.length?round(totalValue/jobs.length):0,directCosts,averageDirectCost:jobs.length?round(directCosts/jobs.length):0,contributionBeforeLabour:round(totalValue-directCosts),actualHours:round(actualMinutes/60),averageJobMinutes:timed?round(actualMinutes/timed):0,costCaptureRate:pct(captured,jobs.length),timeCaptureRate:pct(timed,jobs.length),labourReady,labourCost,estimatedProfit,marginPercent:labourReady&&totalValue?pct(estimatedProfit,totalValue):null},jobs:jobs.sort((a,b)=>new Date(b.completedAt)-new Date(a.completedAt)).slice(0,40)};
}

module.exports=async function handler(req,res){
  try{
    if(req.method==='GET'){
      await requireStaff(req,'analytics');const range=rangeInfo(String(queryParam(req,'range','30d')).toLowerCase());return json(res,200,{ok:true,...await loadData(range),generatedAt:new Date().toISOString()});
    }
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const body=parseBody(req),action=String(body.action||'');
    if(action==='save-cost'){
      const staff=await requireStaff(req,'bookings'),bookingId=String(body.bookingId||'').trim();if(!bookingId)return json(res,400,{ok:false,error:'Booking ID is required.'});
      const booking=(await db(`bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,quote_id&limit=1`))?.[0],quote=booking?.quote_id?(await db(`quotes?id=eq.${encodeURIComponent(booking.quote_id)}&select=id,service_key&limit=1`))?.[0]:null;if(!booking||quote?.service_key!=='windows')return json(res,404,{ok:false,error:'Window Cleaning booking not found.'});
      const row={booking_id:bookingId,consumables_cost:bounded(body.consumablesCost,0,100000),parking_cost:bounded(body.parkingCost,0,100000),travel_cost:bounded(body.travelCost,0,100000),other_cost:bounded(body.otherCost,0,100000),travel_minutes:Math.round(bounded(body.travelMinutes,0,1440)),travel_miles:bounded(body.travelMiles,0,10000),notes:String(body.notes||'').trim().slice(0,1000)||null,updated_by:staff.user.id,updated_at:new Date().toISOString()};
      const before=(await db(`booking_job_costs?booking_id=eq.${encodeURIComponent(bookingId)}&select=*&limit=1`).catch(()=>[]))?.[0]||null;await db('booking_job_costs?on_conflict=booking_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:row});await auditLog(req,staff,{action:'window_job_costs.update',entityType:'booking',entityId:bookingId,summary:'Window Cleaning direct job costs updated',before,after:row});return json(res,200,{ok:true});
    }
    if(action==='save-labour-rate'){
      const staff=await requireStaff(req,'settings'),rate=bounded(body.labourCostPerHour,0,500),now=new Date().toISOString(),before=(await db('site_settings?key=eq.window_profitability&select=*&limit=1').catch(()=>[]))?.[0]||null,value={labourCostPerHour:round(rate)};await db('site_settings?on_conflict=key',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{key:'window_profitability',value,updated_by:staff.user.id,updated_at:now}});await auditLog(req,staff,{action:'window_profitability.labour_rate',entityType:'site_settings',entityId:'window_profitability',summary:`Window labour cost set to £${round(rate)}/hour`,before,after:{key:'window_profitability',value,updated_at:now}});return json(res,200,{ok:true,value});
    }
    return json(res,400,{ok:false,error:'Unknown performance action.'});
  }catch(error){return safeError(res,error)}
};
