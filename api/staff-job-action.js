const { json, parseBody, db, requireStaff, sendBookingNotificationNow, scheduleBookingFollowUp, createStaffNotification, auditLog, safeError } = require('../lib/server');

async function assignedBooking(userId,id){
  return (await db(`bookings?id=eq.${encodeURIComponent(id)}&assigned_staff_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`))?.[0]||null;
}
async function quoteFor(id){return id?(await db(`quotes?id=eq.${encodeURIComponent(id)}&select=id,customer_id,customer_name,email,service_key&limit=1`))?.[0]||null:null}
function safePhotoPath(value,customerId,bookingId,kind){
  const p=String(value||'').trim();
  if(!customerId||!p||p.length>700)return'';
  const prefix=`${customerId}/${bookingId}/${kind}/`;
  return p.startsWith(prefix)&&!p.includes('..')?p:'';
}
module.exports=async function handler(req,res){
  try{
    if(!['POST','PATCH'].includes(req.method))return json(res,405,{ok:false,error:'Method not allowed'});
    const staff=await requireStaff(req,'bookings'),{user}=staff;const b=parseBody(req),id=String(b.id||'').trim(),action=String(b.action||'').trim();
    if(!id)return json(res,400,{ok:false,error:'Job ID is required.'});
    const current=await assignedBooking(user.id,id);if(!current)return json(res,404,{ok:false,error:'This job is not assigned to you.'});
    const now=new Date().toISOString();let patch={},message='Job updated.';
    if(action==='on_my_way'){
      if(!['scheduled','on_my_way'].includes(current.work_status||'scheduled'))return json(res,409,{ok:false,error:'This job has already been started or completed.'});
      patch={work_status:'on_my_way',on_my_way_at:current.on_my_way_at||now};message='Marked as on the way.';
    }else if(action==='started'){
      if((current.work_status||'scheduled')==='completed')return json(res,409,{ok:false,error:'This job is already completed.'});
      patch={work_status:'started',started_at:current.started_at||now};message='Job started.';
    }else if(action==='completed'){
      if((current.work_status||'scheduled')!=='started')return json(res,409,{ok:false,error:'Start the job before marking it complete.'});
      patch={work_status:'completed',status:'completed',completed_at:current.completed_at||now};message='Job completed.';
    }else if(action==='notes'){
      patch={staff_notes:String(b.notes||'').trim().slice(0,2000),customer_note:String(b.customerNote||'').trim().slice(0,1200)};message='Notes saved.';
    }else if(action==='photo'){
      const kind=b.kind==='after'?'after':'before';let customerId=current.customer_id;
      if(!customerId&&current.quote_id)customerId=(await quoteFor(current.quote_id))?.customer_id||null;
      const path=safePhotoPath(b.path,customerId,current.id,kind);if(!path)return json(res,400,{ok:false,error:'Invalid job photo path.'});
      const field=kind==='after'?'after_images':'before_images',items=Array.isArray(current[field])?current[field]:[];if(items.length>=30)return json(res,400,{ok:false,error:`Maximum ${kind} photo limit reached.`});
      patch={[field]:items.includes(path)?items:[...items,path]};message=`${kind==='after'?'After':'Before'} photo saved.`;
    }else return json(res,400,{ok:false,error:'Choose a valid job action.'});
    const rows=await db(`bookings?id=eq.${encodeURIComponent(id)}&assigned_staff_id=eq.${encodeURIComponent(user.id)}`,{method:'PATCH',prefer:'return=representation',body:patch});const booking=rows?.[0];if(!booking)return json(res,409,{ok:false,error:'Job could not be updated.'});
    if(['on_my_way','started','completed'].includes(action))await db(`booking_change_requests?booking_id=eq.${encodeURIComponent(booking.id)}&status=eq.pending`,{method:'PATCH',body:{status:'superseded',admin_note:'The field job has already started.',reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}}).catch(()=>null);
    if(action==='on_my_way'){const q=await quoteFor(booking.quote_id);if(q)await sendBookingNotificationNow({booking,quote:q,type:'on_my_way'})}
    if(action==='completed'){const q=await quoteFor(booking.quote_id);if(q){await sendBookingNotificationNow({booking,quote:q,type:'completion'});await scheduleBookingFollowUp(booking,q);await createStaffNotification({type:'job_completed',title:'Field job completed',body:`${q.customer_name||'Customer'} · ${q.service_key||'service'}`,targetPath:`/admin?tab=bookings&booking=${encodeURIComponent(booking.id)}`,permissionKey:'bookings',entityType:'booking',entityId:booking.id,priority:'normal',dedupeKey:`job-completed:${booking.id}`})}}
    await auditLog(req,staff,{action:`job.${action}`,entityType:'booking',entityId:booking.id,summary:`Field job: ${message}`,before:current,after:booking,metadata:{assignedStaffId:user.id}});
    return json(res,200,{ok:true,message,booking});
  }catch(e){return safeError(res,e)}
};
