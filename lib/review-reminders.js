const {db,sendEmail,escapeHtml,publicReviewUrl}=require('./server');

function boundedDays(value,fallback=7){const n=Math.round(Number(value));return Number.isFinite(n)?Math.max(2,Math.min(30,n)):fallback}
async function loadReviewSettings(){
  const row=(await db('site_settings?key=eq.reviews&select=value&limit=1').catch(()=>[]))?.[0]||null;
  const value=row?.value&&typeof row.value==='object'?row.value:{};
  const publicReviewUrlValue=await publicReviewUrl();
  return {
    publicReviewUrl:publicReviewUrlValue,
    reviewRequestsEnabled:!!publicReviewUrlValue,
    remindersEnabled:!!publicReviewUrlValue&&value.review_reminders_enabled===true,
    reminderDelayDays:boundedDays(value.review_reminder_delay_days,7)
  };
}
function trackedReviewUrl(token=''){
  const clean=String(token||'').trim();
  return /^fb_[a-f0-9]{48}$/i.test(clean)?`https://namdar.co.uk/api/review-click?token=${encodeURIComponent(clean)}`:'';
}
function reminderEventKey(booking){return `review-reminder:${booking.id}:${booking.completed_at||booking.updated_at||booking.starts_at||'completed'}`}

async function queueReviewReminder({booking,quote,feedback,requestSentAt=new Date().toISOString(),settings=null}){
  if(!booking?.id||!feedback?.id||!feedback?.token)return null;
  const config=settings||await loadReviewSettings();
  if(!config.reviewRequestsEnabled||!config.remindersEnabled)return null;
  const recipient=String(quote?.email||'').trim().toLowerCase();if(!recipient||!recipient.includes('@'))return null;
  const sentAt=new Date(requestSentAt);if(!Number.isFinite(sentAt.getTime()))return null;
  const dueAt=new Date(sentAt.getTime()+config.reminderDelayDays*24*60*60*1000).toISOString();
  const eventKey=reminderEventKey(booking);
  try{
    return (await db('booking_notifications',{method:'POST',prefer:'return=representation',body:{booking_id:booking.id,notification_type:'review_reminder',event_key:eventKey,due_at:dueAt,recipient_email:recipient,status:'pending',attempts:0}}))?.[0]||null;
  }catch(error){
    if(error.status!==409)throw error;
    return (await db(`booking_notifications?booking_id=eq.${encodeURIComponent(booking.id)}&notification_type=eq.review_reminder&event_key=eq.${encodeURIComponent(eventKey)}&select=*&limit=1`))?.[0]||null;
  }
}

async function cancelNotification(id,reason){
  await db(`booking_notifications?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:{status:'cancelled',error:String(reason||'Review reminder cancelled.').slice(0,1000),updated_at:new Date().toISOString()}});
}
async function processOne(row,settings){
  const now=new Date(),attempts=Number(row.attempts||0)+1;
  const claimed=(await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}&status=eq.pending`,{method:'PATCH',prefer:'return=representation',body:{status:'sending',attempts,last_attempt_at:now.toISOString(),updated_at:now.toISOString()}}))?.[0];
  if(!claimed)return {skipped:true};
  try{
    if(!settings.reviewRequestsEnabled||!settings.remindersEnabled){await cancelNotification(row.id,'Google review reminders are disabled.');return {skipped:true}}
    const booking=(await db(`bookings?id=eq.${encodeURIComponent(row.booking_id)}&select=id,quote_id,customer_id,status,work_status,completed_at,starts_at,address&limit=1`))?.[0]||null;
    if(!booking){await cancelNotification(row.id,'Booking no longer exists.');return {skipped:true}}
    if((booking.work_status||'scheduled')!=='completed'&&booking.status!=='completed'){await cancelNotification(row.id,'Booking is no longer completed.');return {skipped:true}}
    const feedback=(await db(`booking_feedback?booking_id=eq.${encodeURIComponent(booking.id)}&select=*&limit=1`))?.[0]||null;
    if(!feedback){await cancelNotification(row.id,'Feedback invitation no longer exists.');return {skipped:true}}
    if(feedback.public_review_clicked_at||feedback.submitted_at){await cancelNotification(row.id,'Customer has already interacted with the post-job request.');return {skipped:true}}
    const quote=booking.quote_id?(await db(`quotes?id=eq.${encodeURIComponent(booking.quote_id)}&select=id,customer_id,customer_name,email,service_key&limit=1`))?.[0]||null:null;
    const recipient=String(row.recipient_email||quote?.email||'').trim().toLowerCase();if(!recipient||!recipient.includes('@')){await cancelNotification(row.id,'No customer email is available.');return {skipped:true}}
    const reviewLink=trackedReviewUrl(feedback.token);if(!reviewLink){await cancelNotification(row.id,'Review tracking link is unavailable.');return {skipped:true}}
    const privateLink=`https://namdar.co.uk/feedback?token=${encodeURIComponent(feedback.token)}`;
    const name=escapeHtml(quote?.customer_name||'there');
    const sent=await sendEmail({
      to:recipient,
      subject:'A quick follow-up from Namdar',
      html:`<p>Hi ${name},</p><p>Just one quick follow-up after your completed Namdar visit. If you have not had a chance yet, we would value an honest Google review about your experience.</p><p><a href="${escapeHtml(reviewLink)}" style="display:inline-block;background:#173c32;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Leave an honest Google review</a></p><p style="font-size:13px;color:#68736f">Positive, neutral and negative experiences are all welcome. Namdar does not offer rewards for reviews.</p><p>If you would rather tell us privately, <a href="${escapeHtml(privateLink)}">send private feedback to Namdar</a>.</p><p>This is the only automatic Google-review reminder for this completed job.</p>`,
      archiveForCustomer:true,customerId:feedback.customer_id||quote?.customer_id||booking.customer_id||null,messageCategory:'booking',targetPath:`/account?tab=bookings&booking=${encodeURIComponent(booking.id)}`,messageKey:`booking-review-reminder:${row.event_key||row.id}`
    });
    if(sent?.ok){
      const sentAt=new Date().toISOString();
      await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:'sent',provider_id:sent.data?.id||null,sent_at:sentAt,error:null,updated_at:sentAt}});
      await db(`booking_feedback?id=eq.${encodeURIComponent(feedback.id)}&public_review_reminder_sent_at=is.null`,{method:'PATCH',body:{public_review_reminder_sent_at:sentAt,updated_at:sentAt}}).catch(()=>null);
      return {sent:true};
    }
    const failed=attempts>=5;await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:failed?'failed':'pending',error:String(sent?.error||'Review reminder email was not sent.').slice(0,1000),updated_at:new Date().toISOString()}});return {failed,retry:!failed};
  }catch(error){
    const failed=attempts>=5;await db(`booking_notifications?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{status:failed?'failed':'pending',error:String(error?.message||'Review reminder failed.').slice(0,1000),updated_at:new Date().toISOString()}}).catch(()=>null);return {failed,retry:!failed};
  }
}

async function processReviewReminders(limit=10){
  const cap=Math.max(1,Math.min(25,Number(limit)||10)),settings=await loadReviewSettings();
  const stale=new Date(Date.now()-20*60*1000).toISOString();
  await db(`booking_notifications?notification_type=eq.review_reminder&status=eq.sending&last_attempt_at=lt.${encodeURIComponent(stale)}`,{method:'PATCH',body:{status:'pending',updated_at:new Date().toISOString()}}).catch(()=>null);
  const now=new Date().toISOString();
  const rows=await db(`booking_notifications?notification_type=eq.review_reminder&status=eq.pending&due_at=lte.${encodeURIComponent(now)}&attempts=lt.5&select=*&order=due_at.asc&limit=${cap}`);
  let sent=0,skipped=0,failed=0,retry=0;
  for(const row of rows||[]){const result=await processOne(row,settings);if(result.sent)sent++;else if(result.retry)retry++;else if(result.failed)failed++;else skipped++}
  return {checked:(rows||[]).length,sent,skipped,failed,retry,enabled:settings.remindersEnabled};
}

module.exports={boundedDays,loadReviewSettings,trackedReviewUrl,queueReviewReminder,processReviewReminders};
