const {json,db,requireStaff,queryParam,safeError}=require('../lib/server');
const n=v=>Number(v||0),round=v=>Number(n(v).toFixed(2));
function rangeInfo(key){const now=new Date(),end=new Date(now.getTime()+1000);let start=null,label='All time';if(key==='30d'){start=new Date(now.getTime()-30*864e5);label='Last 30 days'}else if(key==='90d'){start=new Date(now.getTime()-90*864e5);label='Last 90 days'}else if(key==='ytd'){start=new Date(Date.UTC(now.getUTCFullYear(),0,1));label='Year to date'}else key='all';return{key,start,end,label}}
function inRange(v,r){if(!v)return false;const t=new Date(v).getTime();return Number.isFinite(t)&&(!r.start||t>=r.start.getTime())&&t<r.end.getTime()}
function ratio(a,b){return b?round(a/b*100):0}
function costsTotal(c){return round(n(c?.consumables_cost)+n(c?.parking_cost)+n(c?.travel_cost)+n(c?.other_cost))}
function durationHours(b){if(!b?.started_at||!b?.completed_at)return null;const h=(new Date(b.completed_at)-new Date(b.started_at))/36e5;return Number.isFinite(h)&&h>0&&h<=24?round(h):null}
function stage(key,label,count,previous,start){return{key,label,count,fromPreviousRate:ratio(count,previous),fromStartRate:ratio(count,start)}}
function processorState(rows=[]){
  const stripe=rows.filter(p=>p.method==='stripe');let fee=0,known=0,pending=0,nonGbp=0;
  for(const p of stripe){const currency=String(p.provider_fee_currency||'').toLowerCase();if(p.provider_fee===null||p.provider_fee===undefined||currency===''){pending++;continue}if(currency!=='gbp'){nonGbp++;continue}fee+=n(p.provider_fee);known++}
  return{fee:round(fee),complete:pending===0&&nonGbp===0,total:stripe.length,known,pending,nonGbp};
}
module.exports=async function handler(req,res){
  try{
    const staff=await requireStaff(req,'analytics');
    if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
    const range=rangeInfo(String(queryParam(req,'range','30d')).toLowerCase());
    const [events,links,quotes,bookings,invoices,payments,costs]=await Promise.all([
      db('conversion_events?event_type=eq.postcode_checked&service_key=eq.windows&select=visitor_id,postcode_area,covered,created_at&order=created_at.asc&limit=5000'),
      db('quote_funnel_links?select=quote_id,visitor_id,created_at&order=created_at.asc&limit=5000'),
      db('quotes?service_key=eq.windows&select=id,customer_name,postcode,status,automatic_estimate,final_price,created_at,sent_at,customer_response,customer_responded_at&order=created_at.asc&limit=5000'),
      db('bookings?select=id,quote_id,status,work_status,starts_at,ends_at,started_at,completed_at,created_at&order=created_at.asc&limit=5000'),
      db('invoices?select=id,booking_id,quote_id,total,status,created_at&limit=5000'),
      db('payment_records?select=id,booking_id,invoice_id,direction,method,amount,provider_fee,provider_fee_currency,paid_at&limit=5000'),
      db('booking_job_costs?select=booking_id,consumables_cost,parking_cost,travel_cost,other_cost,travel_minutes,travel_miles,notes,updated_at&limit=5000')
    ]);
    const firstCovered=new Map();
    for(const e of events||[]){if(e.covered!==true||!inRange(e.created_at,range))continue;if(!firstCovered.has(e.visitor_id))firstCovered.set(e.visitor_id,e)}
    const linkByQuote=new Map((links||[]).map(x=>[x.quote_id,x])),quoteById=new Map((quotes||[]).map(x=>[x.id,x])),bookingByQuote=new Map();
    for(const b of bookings||[]){if(b.quote_id&&b.status!=='cancelled'&&!bookingByQuote.has(b.quote_id))bookingByQuote.set(b.quote_id,b)}
    const trackedQuotes=(quotes||[]).filter(q=>{const l=linkByQuote.get(q.id),e=l&&firstCovered.get(l.visitor_id);return e&&inRange(q.created_at,range)&&new Date(q.created_at)>=new Date(e.created_at)});
    const visitorsFor=predicate=>new Set(trackedQuotes.filter(predicate).map(q=>linkByQuote.get(q.id)?.visitor_id).filter(Boolean)).size;
    const checked=firstCovered.size,quoted=visitorsFor(()=>true),sent=visitorsFor(q=>!!q.sent_at),accepted=visitorsFor(q=>q.customer_response==='accepted'),booked=visitorsFor(q=>bookingByQuote.has(q.id)),completed=visitorsFor(q=>{const b=bookingByQuote.get(q.id);return !!b&&(b.work_status==='completed'||b.status==='completed')});
    const funnel=[stage('postcode','Covered postcode check',checked,checked,checked),stage('quote','Guide quote requested',quoted,checked,checked),stage('final','Final quote sent',sent,quoted,checked),stage('accepted','Final quote accepted',accepted,sent,checked),stage('booked','Appointment booked',booked,accepted,checked),stage('completed','Job completed',completed,booked,checked)];

    const invoiceByBooking=new Map(),invoiceById=new Map();for(const x of invoices||[]){invoiceById.set(x.id,x);if(x.booking_id)invoiceByBooking.set(x.booking_id,x)}
    const paymentsByBooking=new Map();for(const p of payments||[]){const bid=p.booking_id||invoiceById.get(p.invoice_id)?.booking_id;if(!bid)continue;(paymentsByBooking.get(bid)||paymentsByBooking.set(bid,[]).get(bid)).push(p)}
    const costByBooking=new Map((costs||[]).map(x=>[x.booking_id,x]));
    const completedJobs=(bookings||[]).filter(b=>(b.work_status==='completed'||b.status==='completed')&&inRange(b.completed_at||b.ends_at,range)&&quoteById.has(b.quote_id));
    const jobRows=completedJobs.map(b=>{
      const q=quoteById.get(b.quote_id),invoice=invoiceByBooking.get(b.id),cost=costByBooking.get(b.id)||null,jobPayments=paymentsByBooking.get(b.id)||[],jobValue=round(invoice?.total??q?.final_price??q?.automatic_estimate),hours=durationHours(b),processor=processorState(jobPayments);
      const collected=round(jobPayments.reduce((sum,p)=>sum+(p.direction==='refund'?-n(p.amount):n(p.amount)),0));
      const manualDirectCost=cost?costsTotal(cost):null,economicsReady=!!cost&&processor.complete,directCost=economicsReady?round(manualDirectCost+processor.fee):null;
      return{bookingId:b.id,quoteId:b.quote_id,customerName:q?.customer_name||'Customer',postcodeArea:(String(q?.postcode||'').toUpperCase().replace(/\s+/g,'').match(/^[A-Z]{1,2}/)||[])[0]||'',completedAt:b.completed_at||b.ends_at,jobValue,collectedRevenue:collected,workHours:hours,manualDirectCost,paymentProcessingFee:processor.fee,paymentProcessingFeeComplete:processor.complete,stripeTransactions:processor.total,stripeFeeRecordedTransactions:processor.known,stripeFeePendingTransactions:processor.pending,stripeFeeNonGbpTransactions:processor.nonGbp,directCost,directContribution:economicsReady?round(jobValue-directCost):null,consumablesCost:cost?round(cost.consumables_cost):0,parkingCost:cost?round(cost.parking_cost):0,travelCost:cost?round(cost.travel_cost):0,otherCost:cost?round(cost.other_cost):0,travelMinutes:cost?Number(cost.travel_minutes||0):0,travelMiles:cost?round(cost.travel_miles):0,costNotes:cost?.notes||'',costReviewed:!!cost,economicsReady};
    }).sort((a,b)=>new Date(b.completedAt)-new Date(a.completedAt));
    const totalValue=round(jobRows.reduce((a,x)=>a+x.jobValue,0)),collectedRevenue=round(jobRows.reduce((a,x)=>a+x.collectedRevenue,0)),timed=jobRows.filter(x=>x.workHours!=null),actualWorkHours=round(timed.reduce((a,x)=>a+x.workHours,0)),timedValue=round(timed.reduce((a,x)=>a+x.jobValue,0)),costReviewed=jobRows.filter(x=>x.costReviewed),ready=jobRows.filter(x=>x.economicsReady),reviewedValue=round(ready.reduce((a,x)=>a+x.jobValue,0)),directCosts=round(ready.reduce((a,x)=>a+n(x.directCost),0)),directContribution=round(reviewedValue-directCosts),paymentProcessingFees=round(jobRows.reduce((a,x)=>a+n(x.paymentProcessingFee),0)),stripeTransactions=jobRows.reduce((a,x)=>a+Number(x.stripeTransactions||0),0),stripeFeeRecordedTransactions=jobRows.reduce((a,x)=>a+Number(x.stripeFeeRecordedTransactions||0),0),stripeFeePendingTransactions=jobRows.reduce((a,x)=>a+Number(x.stripeFeePendingTransactions||0),0),stripeFeeNonGbpTransactions=jobRows.reduce((a,x)=>a+Number(x.stripeFeeNonGbpTransactions||0),0);
    const economics={completedJobs:jobRows.length,totalJobValue:totalValue,collectedRevenue,averageJobValue:jobRows.length?round(totalValue/jobRows.length):0,actualWorkHours,valuePerWorkHour:actualWorkHours?round(timedValue/actualWorkHours):0,timedJobs:timed.length,costReviewedJobs:costReviewed.length,economicsReadyJobs:ready.length,directCosts,directContribution,directMarginRate:reviewedValue?round(directContribution/reviewedValue*100):0,reviewedJobValue:reviewedValue,paymentProcessingFees,stripeTransactions,stripeFeeRecordedTransactions,stripeFeePendingTransactions,stripeFeeNonGbpTransactions};
    const historicalWindowQuotes=(quotes||[]).filter(q=>inRange(q.created_at,range)).length;
    const trackedQuoteCount=trackedQuotes.length;
    const canEditCosts=staff.profile?.role==='admin'||staff.permissions?.bookings===true||staff.permissions?.all===true;
    return json(res,200,{ok:true,range:{key:range.key,label:range.label,start:range.start?.toISOString()||null,end:range.end.toISOString()},funnel,economics,jobs:jobRows,dataQuality:{trackingStartNote:'Postcode-to-quote visitor tracking begins with the Window Stage 1 performance release. Earlier quotes and bookings remain included in job economics but cannot be retroactively matched to a postcode-check visitor.',windowQuotesInRange:historicalWindowQuotes,trackedWindowQuotesInRange:trackedQuoteCount,coveredPostcodeVisitors:checked,timedCompletedJobs:timed.length,costReviewedCompletedJobs:costReviewed.length,economicsReadyCompletedJobs:ready.length,stripeTransactions,stripeFeeRecordedTransactions,stripeFeePendingTransactions,stripeFeeNonGbpTransactions},canEditCosts,generatedAt:new Date().toISOString()});
  }catch(error){return safeError(res,error)}
};
