const {db,sendEmail,ensureBookingFeedbackInvite,publicReviewUrl,bookingNotificationKey,escapeHtml}=require('./server');
const {trackedReviewUrl,queueReviewReminder}=require('./review-reminders');

const SERVICE_LABELS={windows:'window cleaning',gutters:'gutter cleaning',roof:'roof cleaning',jetwash:'jet washing',handyman:'handyman service',tour3d:'3D property tour'};

async function quoteFor(booking){
  if(!booking?.quote_id)return null;
  return (await db(`quotes?id=eq.${encodeURIComponent(booking.quote_id)}&select=id,customer_id,customer_name,email,service_key&limit=1`))?.[0]||null;
}

function followUpEmail(booking,quote,feedbackUrl,reviewClickUrl){
  const name=escapeHtml(quote?.customer_name||'there');
  const service=escapeHtml(SERVICE_LABELS[quote?.service_key]||'Namdar service');
  const privateButton=feedbackUrl?`<p><a href="${escapeHtml(feedbackUrl)}" style="display:inline-block;background:#173c32;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Give private feedback to Namdar</a></p>`:'';
  const publicButton=reviewClickUrl?`<p><a href="${escapeHtml(reviewClickUrl)}" style="display:inline-block;border:2px solid #173c32;color:#173c32;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:700">Leave an honest Google review</a></p><p style="font-size:13px;color:#68736f">Please describe your experience as it was — positive, neutral or negative. Namdar does not offer rewards for reviews.</p>`:'';
  const account=`<p><a href="https://namdar.co.uk/account?tab=bookings&booking=${encodeURIComponent(booking.id)}">Open this booking in My Namdar</a> to see your completed job details, photos and billing.</p>`;
  return {
    subject:'Thank you for choosing Namdar — how did we do?',
    html:`<p>Hi ${name},</p><p>Thank you again for choosing Namdar for your <strong>${service}</strong>.</p><p>We welcome honest feedback from every completed customer. You can send feedback privately to Namdar, and if you wish, you can also share your experience publicly on Google.</p>${privateButton}${publicButton}${account}`
  };
}

async function processOne(row){
  const now=new Date(),attempts=Number(row.attempts||0)+1;
  const claimed=(await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}&status=eq.pending`,{
    method:'PATCH',prefer:'return=representation',
    body:{status:'sending',attempts,last_attempt_at:now.toISOString(),updated_at:now.toISOString()}
  }))?.[0];
  if(!claimed)return {skipped:true};

  try{
    const booking=(await db(`bookings?id=eq.${encodeURIComponent(row.booking_id)}&select=*&limit=1`))?.[0];
    if(!booking){
      await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:'cancelled',error:'Booking no longer exists.',updated_at:new Date().toISOString()}});
      return {skipped:true};
    }
    if((booking.work_status||'scheduled')!=='completed'&&booking.status!=='completed'){
      await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:'cancelled',error:'Booking is not completed.',updated_at:new Date().toISOString()}});
      return {skipped:true};
    }
    if(bookingNotificationKey('follow_up',booking)!==row.event_key){
      await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:'cancelled',error:'Completion event changed.',updated_at:new Date().toISOString()}});
      return {skipped:true};
    }
    const quote=await quoteFor(booking);
    const recipient=String(row.recipient_email||quote?.email||'').trim().toLowerCase();
    if(!recipient||!recipient.includes('@')){
      await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:'cancelled',error:'No customer email is available.',updated_at:new Date().toISOString()}});
      return {skipped:true};
    }

    const feedback=await ensureBookingFeedbackInvite(booking,quote);
    const feedbackUrl=feedback?.token?`https://namdar.co.uk/feedback?token=${encodeURIComponent(feedback.token)}`:'';
    const reviewUrl=await publicReviewUrl();
    const reviewClickUrl=reviewUrl&&feedback?.token?trackedReviewUrl(feedback.token):'';
    const content=followUpEmail(booking,quote,feedbackUrl,reviewClickUrl);
    const sent=await sendEmail({
      to:recipient,subject:content.subject,html:content.html,
      archiveForCustomer:true,customerId:quote?.customer_id||booking.customer_id||null,
      messageCategory:'booking',
      targetPath:`/account?tab=bookings&booking=${encodeURIComponent(booking.id)}`,
      messageKey:`booking-post-job-followup:${row.event_key||row.id}`
    });
    if(sent?.ok){
      const sentAt=new Date().toISOString();
      await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:'sent',provider_id:sent.data?.id||null,sent_at:sentAt,error:null,updated_at:sentAt}});
      if(reviewClickUrl&&feedback?.id){
        await db(`booking_feedback?id=eq.${encodeURIComponent(feedback.id)}&public_review_requested_at=is.null`,{method:'PATCH',body:{public_review_requested_at:sentAt,updated_at:sentAt}}).catch(error=>console.error('Could not mark Google review request',error?.message||error));
        await queueReviewReminder({booking,quote,feedback,requestSentAt:sentAt}).catch(error=>console.error('Could not queue Google review reminder',error?.message||error));
      }
      return {sent:true};
    }
    const failed=attempts>=5;
    await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:failed?'failed':'pending',error:String(sent?.error||'Email provider did not send the message.').slice(0,1000),updated_at:new Date().toISOString()}});
    return {failed:failed,retry:!failed};
  }catch(error){
    const failed=attempts>=5;
    await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:failed?'failed':'pending',error:String(error?.message||'Post-job follow-up failed.').slice(0,1000),updated_at:new Date().toISOString()}}).catch(()=>null);
    return {failed,retry:!failed};
  }
}

async function processPostJobFollowUps(limit=25){
  const cap=Math.max(1,Math.min(50,Number(limit)||25));
  const stale=new Date(Date.now()-20*60*1000).toISOString();
  await db(`booking_notifications?notification_type=eq.follow_up&status=eq.sending&last_attempt_at=lt.${encodeURIComponent(stale)}`,{
    method:'PATCH',body:{status:'pending',updated_at:new Date().toISOString()}
  }).catch(()=>null);
  const now=new Date().toISOString();
  const rows=await db(`booking_notifications?notification_type=eq.follow_up&status=eq.pending&due_at=lte.${encodeURIComponent(now)}&attempts=lt.5&select=*&order=due_at.asc&limit=${cap}`);
  let sent=0,skipped=0,failed=0,retry=0;
  for(const row of rows||[]){
    const result=await processOne(row);
    if(result.sent)sent++;
    else if(result.retry)retry++;
    else if(result.failed)failed++;
    else skipped++;
  }
  return {checked:(rows||[]).length,sent,skipped,failed,retry};
}

module.exports={followUpEmail,processPostJobFollowUps};
