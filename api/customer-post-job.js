const {json,parseBody,db,requireCustomer,ensureBookingFeedbackInvite,publicReviewUrl,safeError}=require('../lib/server');

function isComplete(booking){return booking&&(booking.work_status==='completed'||booking.status==='completed')}

async function ownedBooking(userId,bookingId){
  const id=String(bookingId||'').trim();
  if(!id)throw Object.assign(new Error('Choose a completed booking.'),{status:400});
  const booking=(await db(`bookings?id=eq.${encodeURIComponent(id)}&customer_id=eq.${encodeURIComponent(userId)}&select=id,quote_id,customer_id,status,work_status,completed_at,starts_at,address,payment_status&limit=1`))?.[0]||null;
  if(!booking)throw Object.assign(new Error('Booking not found.'),{status:404});
  if(!isComplete(booking))throw Object.assign(new Error('Post-job actions are available after the job is completed.'),{status:409});
  return booking;
}

async function quoteFor(booking){
  if(!booking?.quote_id)return null;
  return (await db(`quotes?id=eq.${encodeURIComponent(booking.quote_id)}&select=id,customer_id,customer_name,email,postcode,service_key&limit=1`))?.[0]||null;
}

async function feedbackState(userId,bookingIds=[]){
  if(!bookingIds.length)return {};
  const rows=await db(`booking_feedback?customer_id=eq.${encodeURIComponent(userId)}&booking_id=in.(${bookingIds.map(x=>encodeURIComponent(x)).join(',')})&select=booking_id,submitted_at,rating,status,public_review_clicked_at`);
  return Object.fromEntries((rows||[]).map(row=>[row.booking_id,{submitted:!!row.submitted_at,rating:row.rating==null?null:Number(row.rating),status:row.status||'pending',publicReviewClicked:!!row.public_review_clicked_at}]));
}

module.exports=async function handler(req,res){
  try{
    const {user}=await requireCustomer(req);
    if(req.method==='GET'){
      const bookings=await db(`bookings?customer_id=eq.${encodeURIComponent(user.id)}&select=id,status,work_status&order=starts_at.desc&limit=300`);
      const completed=(bookings||[]).filter(isComplete),ids=completed.map(b=>b.id);
      const feedback=await feedbackState(user.id,ids),reviewUrl=await publicReviewUrl();
      return json(res,200,{ok:true,reviewAvailable:!!reviewUrl,feedback});
    }
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const body=parseBody(req),action=String(body.action||''),booking=await ownedBooking(user.id,body.bookingId),quote=await quoteFor(booking);
    if(action==='feedback_link'){
      const row=await ensureBookingFeedbackInvite(booking,quote);
      if(!row?.token)throw Object.assign(new Error('Private feedback is temporarily unavailable.'),{status:503});
      return json(res,200,{ok:true,url:`/feedback?token=${encodeURIComponent(row.token)}`,submitted:!!row.submitted_at,rating:row.rating==null?null:Number(row.rating)});
    }
    if(action==='public_review_click'){
      const url=await publicReviewUrl();
      if(!url)return json(res,404,{ok:false,error:'The Google review link has not been configured yet.'});
      const row=await ensureBookingFeedbackInvite(booking,quote);
      if(row?.id)await db(`booking_feedback?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{public_review_clicked_at:new Date().toISOString(),updated_at:new Date().toISOString()}});
      return json(res,200,{ok:true,url});
    }
    return json(res,400,{ok:false,error:'Choose a valid post-job action.'});
  }catch(error){return safeError(res,error)}
};
