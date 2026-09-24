const {json,db,requireStaff,queryParam,safeError}=require('../lib/server');

const SERVICES={windows:'Windows',gutters:'Gutters',roof:'Roof',jetwash:'Jet wash',handyman:'Handyman',tour3d:'3D tour'};
const n=v=>Number(v||0);
const round=v=>Number(n(v).toFixed(2));
const iso=v=>{const d=new Date(v);return Number.isFinite(d.getTime())?d.toISOString():null};
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
function weekStartKey(value){
  const d=new Date(value);if(!Number.isFinite(d.getTime()))return'';
  const local=londonDay(d);const [y,m,day]=local.split('-').map(Number);const x=new Date(Date.UTC(y,m-1,day));const dow=(x.getUTCDay()+6)%7;x.setUTCDate(x.getUTCDate()-dow);return x.toISOString().slice(0,10);
}
function prettyBucket(key,granularity){
  if(granularity==='day')return new Date(`${key}T12:00:00Z`).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'Europe/London'});
  if(granularity==='week')return `w/c ${new Date(`${key}T12:00:00Z`).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'Europe/London'})}`;
  const [y,m]=key.split('-').map(Number);return new Date(Date.UTC(y,m-1,1)).toLocaleDateString('en-GB',{month:'short',year:'2-digit',timeZone:'Europe/London'});
}
function trendRows(payments,range){
  const map=new Map();
  for(const p of payments){if(!inRange(p.paid_at,range.start,range.end))continue;const key=range.granularity==='day'?londonDay(p.paid_at):range.granularity==='week'?weekStartKey(p.paid_at):londonMonth(p.paid_at);if(!key)continue;const row=map.get(key)||{key,revenue:0,refunds:0};if(p.direction==='refund')row.refunds+=n(p.amount);else row.revenue+=n(p.amount);map.set(key,row)}
  let rows=[...map.values()].sort((a,b)=>a.key.localeCompare(b.key));
  if(range.key==='all'&&rows.length>24)rows=rows.slice(-24);
  return rows.map(r=>({label:prettyBucket(r.key,range.granularity),revenue:round(r.revenue-r.refunds),gross:round(r.revenue),refunds:round(r.refunds)}));
}

module.exports=async function handler(req,res){try{
  await requireStaff(req,'analytics');
  if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
  const range=rangeInfo(String(queryParam(req,'range','30d')).toLowerCase());
  const [quotes,bookings,invoices,payments,feedback,staff]=await Promise.all([
    db('quotes?select=id,customer_id,customer_name,service_key,status,automatic_estimate,final_price,created_at,updated_at&order=created_at.asc&limit=5000'),
    db('bookings?select=id,quote_id,customer_id,starts_at,ends_at,status,payment_status,assigned_staff_id,work_status,completed_at,created_at&order=starts_at.asc&limit=5000'),
    db('invoices?select=id,booking_id,quote_id,total,amount_paid,status,issued_at,due_at,paid_at,created_at&order=created_at.asc&limit=5000'),
    db('payment_records?select=id,booking_id,invoice_id,direction,payment_kind,method,amount,paid_at&order=paid_at.asc&limit=5000'),
    db('booking_feedback?rating=not.is.null&select=id,booking_id,quote_id,rating,status,submitted_at,public_review_clicked_at&order=submitted_at.asc&limit=5000'),
    db('profiles?role=in.(admin,staff)&select=id,full_name,email,role,account_status&order=full_name.asc&limit=500')
  ]);

  const bookingByQuote=new Map(),bookingById=new Map((bookings||[]).map(b=>[b.id,b])),quoteById=new Map((quotes||[]).map(q=>[q.id,q])),invoiceByBooking=new Map(),invoiceById=new Map();
  for(const b of bookings||[]){if(b.quote_id&&b.status!=='cancelled')bookingByQuote.set(b.quote_id,b)}
  for(const i of invoices||[]){invoiceById.set(i.id,i);if(i.booking_id)invoiceByBooking.set(i.booking_id,i)}

  const selectedQuotes=(quotes||[]).filter(q=>inRange(q.created_at,range.start,range.end));
  const selectedAppointments=(bookings||[]).filter(b=>inRange(b.starts_at,range.start,range.end));
  const selectedCompleted=(bookings||[]).filter(b=>(b.work_status==='completed'||b.status==='completed')&&inRange(b.completed_at||b.ends_at,range.start,range.end));
  const selectedPayments=(payments||[]).filter(p=>inRange(p.paid_at,range.start,range.end));
  const selectedFeedback=(feedback||[]).filter(f=>inRange(f.submitted_at,range.start,range.end));
  const selectedInvoices=(invoices||[]).filter(i=>inRange(i.issued_at||i.created_at,range.start,range.end));

  const grossCollected=selectedPayments.filter(p=>p.direction==='payment').reduce((a,p)=>a+n(p.amount),0),refunds=selectedPayments.filter(p=>p.direction==='refund').reduce((a,p)=>a+n(p.amount),0),revenue=round(grossCollected-refunds);
  const invoiced=round(selectedInvoices.filter(i=>i.status!=='void').reduce((a,i)=>a+n(i.total),0));
  const currentOutstanding=round((invoices||[]).filter(i=>i.status!=='void').reduce((a,i)=>a+Math.max(0,n(i.total)-n(i.amount_paid)),0));
  const now=Date.now(),overdue=(invoices||[]).filter(i=>i.status!=='void'&&i.due_at&&new Date(i.due_at).getTime()<now&&n(i.total)-n(i.amount_paid)>.004);const overdueAmount=round(overdue.reduce((a,i)=>a+Math.max(0,n(i.total)-n(i.amount_paid)),0));
  const converted=selectedQuotes.filter(q=>bookingByQuote.has(q.id)).length,conversion=selectedQuotes.length?converted/selectedQuotes.length*100:0;
  const completionInvoiceTotal=selectedCompleted.reduce((a,b)=>a+n(invoiceByBooking.get(b.id)?.total||quoteById.get(b.quote_id)?.final_price||quoteById.get(b.quote_id)?.automatic_estimate),0);
  const rated=selectedFeedback.filter(f=>n(f.rating)>0),avgRating=rated.length?rated.reduce((a,f)=>a+n(f.rating),0)/rated.length:0;

  const serviceKeys=[...new Set([...(quotes||[]).map(q=>q.service_key),...Object.keys(SERVICES)].filter(Boolean))];
  const services=serviceKeys.map(key=>{
    const qs=selectedQuotes.filter(q=>q.service_key===key),qids=new Set(qs.map(q=>q.id)),conv=qs.filter(q=>bookingByQuote.has(q.id)).length;
    const appts=selectedAppointments.filter(b=>quoteById.get(b.quote_id)?.service_key===key),done=selectedCompleted.filter(b=>quoteById.get(b.quote_id)?.service_key===key);
    const rev=selectedPayments.reduce((sum,p)=>{const b=bookingById.get(p.booking_id||invoiceById.get(p.invoice_id)?.booking_id),q=b?quoteById.get(b.quote_id):null;if(q?.service_key!==key)return sum;return sum+(p.direction==='refund'?-n(p.amount):n(p.amount))},0);
    return {key,label:SERVICES[key]||key,quotes:qs.length,converted:conv,conversionRate:qs.length?round(conv/qs.length*100):0,appointments:appts.length,completed:done.length,revenue:round(rev),averageJobValue:done.length?round(done.reduce((a,b)=>a+n(invoiceByBooking.get(b.id)?.total||quoteById.get(b.quote_id)?.final_price||quoteById.get(b.quote_id)?.automatic_estimate),0)/done.length):0};
  }).filter(x=>x.quotes||x.appointments||x.completed||Math.abs(x.revenue)>.004).sort((a,b)=>b.revenue-a.revenue||b.completed-a.completed||b.quotes-a.quotes);

  const staffRows=(staff||[]).filter(s=>!s.account_status||s.account_status==='active').map(s=>{
    const jobs=selectedAppointments.filter(b=>b.assigned_staff_id===s.id),done=jobs.filter(b=>b.work_status==='completed'||b.status==='completed'),hours=jobs.reduce((a,b)=>a+Math.max(0,(new Date(b.ends_at)-new Date(b.starts_at))/36e5),0),completedHours=done.reduce((a,b)=>a+Math.max(0,(new Date(b.ends_at)-new Date(b.starts_at))/36e5),0);
    return {id:s.id,name:s.full_name||s.email||'Team member',role:s.role,jobs:jobs.length,completed:done.length,hours:round(hours),completedHours:round(completedHours),completionRate:jobs.length?round(done.length/jobs.length*100):0};
  }).filter(x=>x.jobs>0).sort((a,b)=>b.hours-a.hours||b.jobs-a.jobs);
  const unassigned=selectedAppointments.filter(b=>!b.assigned_staff_id);if(unassigned.length)staffRows.push({id:null,name:'Unassigned',role:'',jobs:unassigned.length,completed:unassigned.filter(b=>b.work_status==='completed'||b.status==='completed').length,hours:round(unassigned.reduce((a,b)=>a+Math.max(0,(new Date(b.ends_at)-new Date(b.starts_at))/36e5),0)),completedHours:0,completionRate:0});

  const quoteStatuses=['new','reviewing','sent','approved','declined','expired'];const quoteFunnel=quoteStatuses.map(status=>({status,count:selectedQuotes.filter(q=>q.status===status).length}));
  const paymentMethods=['bank_transfer','cash','card','stripe','other'].map(method=>({method,amount:round(selectedPayments.filter(p=>p.direction==='payment'&&p.method===method).reduce((a,p)=>a+n(p.amount),0))})).filter(x=>x.amount>0);
  const feedbackBreakdown=[1,2,3,4,5].map(rating=>({rating,count:rated.filter(f=>n(f.rating)===rating).length}));

  return json(res,200,{ok:true,range:{key:range.key,label:range.label,start:range.start?range.start.toISOString():null,end:range.end.toISOString()},summary:{revenue,invoiced,currentOutstanding,overdueAmount,overdueCount:overdue.length,quotes:selectedQuotes.length,converted,conversionRate:round(conversion),appointments:selectedAppointments.length,completedJobs:selectedCompleted.length,averageJobValue:selectedCompleted.length?round(completionInvoiceTotal/selectedCompleted.length):0,averageRating:round(avgRating),feedbackCount:rated.length,refunds:round(refunds)},trend:trendRows(payments||[],range),quoteFunnel,paymentMethods,feedbackBreakdown,services,staff:staffRows,generatedAt:new Date().toISOString()});
}catch(e){return safeError(res,e)}};
