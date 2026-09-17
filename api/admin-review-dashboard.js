const {json,queryParam,db,requireStaff,safeError}=require('../lib/server');
const {loadReviewSettings}=require('../lib/review-reminders');

const SERVICE_LABELS={windows:'Window cleaning',gutters:'Gutter cleaning',roof:'Roof cleaning',jetwash:'Jet washing',handyman:'Handyman',tour3d:'3D property tour'};
function periodDays(value){const n=Number(value);return [30,90,365].includes(n)?n:90}
function chunks(values,size=100){const out=[];for(let i=0;i<values.length;i+=size)out.push(values.slice(i,i+size));return out}
async function rowsByIds(table,field,ids,select){
  const out=[];for(const part of chunks(ids)){if(!part.length)continue;const rows=await db(`${table}?${field}=in.(${part.map(x=>encodeURIComponent(x)).join(',')})&select=${encodeURIComponent(select)}`);out.push(...(rows||[]))}return out;
}
function pct(a,b){return b?Number((a*100/b).toFixed(1)):0}

module.exports=async function handler(req,res){
  try{
    if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
    const staff=await requireStaff(req,'bookings'),days=periodDays(queryParam(req,'days','90')),since=new Date(Date.now()-days*24*60*60*1000).toISOString();
    const bookings=await db(`bookings?completed_at=gte.${encodeURIComponent(since)}&select=id,quote_id,customer_id,completed_at,starts_at,address,status,work_status&order=completed_at.desc&limit=500`);
    const bookingIds=(bookings||[]).map(x=>x.id),quoteIds=[...new Set((bookings||[]).map(x=>x.quote_id).filter(Boolean))];
    const [feedback,quotes,settings]=await Promise.all([
      rowsByIds('booking_feedback','booking_id',bookingIds,'id,booking_id,customer_id,rating,status,submitted_at,public_review_requested_at,public_review_clicked_at,public_review_reminder_sent_at,resolved_at'),
      rowsByIds('quotes','id',quoteIds,'id,customer_id,customer_name,email,postcode,service_key'),
      loadReviewSettings()
    ]);
    const feedbackMap=Object.fromEntries((feedback||[]).map(x=>[x.booking_id,x])),quoteMap=Object.fromEntries((quotes||[]).map(x=>[x.id,x]));
    const requested=(feedback||[]).filter(x=>x.public_review_requested_at).length,clicks=(feedback||[]).filter(x=>x.public_review_clicked_at).length,trackedEmailClicks=(feedback||[]).filter(x=>x.public_review_requested_at&&x.public_review_clicked_at).length,submitted=(feedback||[]).filter(x=>x.submitted_at).length,reminders=(feedback||[]).filter(x=>x.public_review_reminder_sent_at).length,ratings=(feedback||[]).filter(x=>x.submitted_at&&Number.isFinite(Number(x.rating))).map(x=>Number(x.rating)),attention=(feedback||[]).filter(x=>x.status==='needs_attention'&&!x.resolved_at).length;
    const recent=(bookings||[]).slice(0,100).map(booking=>{const f=feedbackMap[booking.id]||null,q=quoteMap[booking.quote_id]||{};return {bookingId:booking.id,completedAt:booking.completed_at,customerName:q.customer_name||'Customer',email:q.email||'',postcode:q.postcode||'',service:SERVICE_LABELS[q.service_key]||q.service_key||'Namdar service',rating:f?.rating==null?null:Number(f.rating),feedbackStatus:f?.status||'not_requested',feedbackSubmittedAt:f?.submitted_at||null,reviewRequestedAt:f?.public_review_requested_at||null,reviewClickedAt:f?.public_review_clicked_at||null,reviewReminderSentAt:f?.public_review_reminder_sent_at||null}});
    const canEdit=staff?.profile?.role==='admin'||staff?.permissions?.all===true||staff?.permissions?.settings===true;
    return json(res,200,{ok:true,days,canEdit,settings:{reviewRequestsEnabled:settings.reviewRequestsEnabled,remindersEnabled:settings.remindersEnabled,reminderDelayDays:settings.reminderDelayDays},metrics:{completedJobs:(bookings||[]).length,reviewRequests:requested,googleClicks:clicks,trackedEmailClicks,clickThroughRate:pct(trackedEmailClicks,requested),privateFeedback:submitted,feedbackRate:pct(submitted,(bookings||[]).length),averagePrivateRating:ratings.length?Number((ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1)):null,remindersSent:reminders,needsAttention:attention},recent});
  }catch(error){return safeError(res,error)}
};

module.exports.periodDays=periodDays;
