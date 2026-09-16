const { json, parseBody, db, requireStaff, sendBookingNotificationNow, scheduleBookingFollowUp, createStaffNotification, auditLog, safeError } = require('../lib/server');

const WINDOW_CHECKLIST_KEYS=['access_checked','before_condition_recorded','service_complete','frames_sills_checked','after_condition_recorded','final_area_check'];
const INCIDENT_TYPES=new Set(['no_access','safety','weather','equipment','damage','complaint','extra_work','other']);
const INCIDENT_SEVERITIES=new Set(['info','attention','urgent']);

async function assignedBooking(userId,id){
  return (await db(`bookings?id=eq.${encodeURIComponent(id)}&assigned_staff_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`))?.[0]||null;
}
async function quoteFor(id){return id?(await db(`quotes?id=eq.${encodeURIComponent(id)}&select=id,customer_id,customer_name,email,service_key&limit=1`))?.[0]||null:null}
async function qualityFor(id){return (await db(`booking_field_quality?booking_id=eq.${encodeURIComponent(id)}&select=*&limit=1`))?.[0]||null}
function safePhotoPath(value,customerId,bookingId,kind){
  const p=String(value||'').trim();
  if(!customerId||!p||p.length>700)return'';
  const prefix=`${customerId}/${bookingId}/${kind}/`;
  return p.startsWith(prefix)&&!p.includes('..')?p:'';
}
function safeIncidentPhotoPath(value,customerId,bookingId,incidentId){
  const p=String(value||'').trim();
  if(!customerId||!incidentId||!p||p.length>700)return'';
  const prefix=`${customerId}/${bookingId}/incident/${incidentId}/`;
  return p.startsWith(prefix)&&!p.includes('..')?p:'';
}
function money(v,max=100000){const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(0,Number(n.toFixed(2)))):0}
function integer(v,min=0,max=1440){const n=Math.round(Number(v));return Number.isFinite(n)?Math.min(max,Math.max(min,n)):min}
function etaMinutes(v){if(v===null||v===undefined||v==='')return null;const n=Math.round(Number(v));return Number.isFinite(n)?Math.min(120,Math.max(5,n)):null}
function cleanChecklist(value){
  const src=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  return Object.fromEntries(WINDOW_CHECKLIST_KEYS.map(key=>[key,src[key]===true]));
}
function missingWindowChecklist(row){
  const checklist=row?.checklist&&typeof row.checklist==='object'?row.checklist:{};
  return WINDOW_CHECKLIST_KEYS.filter(key=>checklist[key]!==true);
}

module.exports=async function handler(req,res){
  try{
    if(!['POST','PATCH'].includes(req.method))return json(res,405,{ok:false,error:'Method not allowed'});
    const staff=await requireStaff(req,'bookings'),{user}=staff;const b=parseBody(req),id=String(b.id||'').trim(),action=String(b.action||'').trim();
    if(!id)return json(res,400,{ok:false,error:'Job ID is required.'});
    const current=await assignedBooking(user.id,id);if(!current)return json(res,404,{ok:false,error:'This job is not assigned to you.'});

    if(action==='economics'){
      if((current.work_status||'scheduled')!=='completed'&&current.status!=='completed')return json(res,409,{ok:false,error:'Complete the job before saving its direct-cost review.'});
      const quote=await quoteFor(current.quote_id);
      if(!quote||quote.service_key!=='windows')return json(res,409,{ok:false,error:'Stage 1 job economics are currently available for Window Cleaning only.'});
      const before=(await db(`booking_job_costs?booking_id=eq.${encodeURIComponent(id)}&select=*&limit=1`))?.[0]||null;
      const row={booking_id:id,consumables_cost:money(b.consumablesCost),parking_cost:money(b.parkingCost),travel_cost:money(b.travelCost),other_cost:money(b.otherCost),travel_minutes:integer(b.travelMinutes),travel_miles:money(b.travelMiles,10000),notes:String(b.notes||'').trim().slice(0,1500)||null,updated_by:user.id,updated_at:new Date().toISOString()};
      await db('booking_job_costs?on_conflict=booking_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:row});
      const after=(await db(`booking_job_costs?booking_id=eq.${encodeURIComponent(id)}&select=*&limit=1`))?.[0]||row;
      await auditLog(req,staff,{action:'booking.economics',entityType:'booking',entityId:id,summary:'Updated Window Cleaning direct job costs and travel from Staff',before,after,metadata:{quoteId:current.quote_id||null,serviceKey:'windows',assignedStaffId:user.id}});
      return json(res,200,{ok:true,message:'Direct-cost review saved.',costs:after});
    }

    if(action==='checklist'){
      if((current.work_status||'scheduled')==='completed'||current.status==='completed')return json(res,409,{ok:false,error:'A completed job checklist is locked.'});
      const quote=await quoteFor(current.quote_id);
      if(!quote||quote.service_key!=='windows')return json(res,409,{ok:false,error:'The field quality checklist is currently available for Window Cleaning only.'});
      const before=await qualityFor(id),checklist=cleanChecklist(b.checklist),row={booking_id:id,checklist_version:'windows_v1',checklist,updated_by:user.id,updated_at:new Date().toISOString()};
      await db('booking_field_quality?on_conflict=booking_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:row});
      const after=await qualityFor(id)||row;
      await auditLog(req,staff,{action:'job.checklist',entityType:'booking',entityId:id,summary:'Updated field quality checklist',before,after,metadata:{assignedStaffId:user.id,serviceKey:'windows'}});
      return json(res,200,{ok:true,message:'Quality checklist saved.',quality:{version:after.checklist_version,checklist:after.checklist,updatedAt:after.updated_at}});
    }

    if(action==='incident'){
      const type=String(b.incidentType||'').trim(),severity=String(b.severity||'attention').trim(),summary=String(b.summary||'').trim().slice(0,180),details=String(b.details||'').trim().slice(0,2000)||null;
      if(!INCIDENT_TYPES.has(type))return json(res,400,{ok:false,error:'Choose a valid problem type.'});
      if(!INCIDENT_SEVERITIES.has(severity))return json(res,400,{ok:false,error:'Choose a valid problem priority.'});
      if(summary.length<3)return json(res,400,{ok:false,error:'Add a short summary of the problem.'});
      const rows=await db('booking_field_incidents',{method:'POST',prefer:'return=representation',body:{booking_id:id,reported_by:user.id,incident_type:type,severity,summary,details,status:'open'}}),incident=rows?.[0];
      if(!incident)return json(res,409,{ok:false,error:'The problem report could not be saved.'});
      const priority=severity==='urgent'?'urgent':severity==='attention'?'high':'normal';
      await createStaffNotification({type:'field_incident',title:severity==='urgent'?'Urgent field incident':'Field problem reported',body:`${String(type).replaceAll('_',' ')} · ${summary}`,targetPath:`/admin?tab=bookings&booking=${encodeURIComponent(id)}`,permissionKey:'bookings',entityType:'booking_incident',entityId:incident.id,priority,dedupeKey:`field-incident:${incident.id}`});
      await auditLog(req,staff,{action:'job.incident_reported',entityType:'booking_incident',entityId:incident.id,summary:'Reported a field incident from Staff',before:null,after:incident,metadata:{bookingId:id,assignedStaffId:user.id}});
      return json(res,200,{ok:true,message:'Problem reported to the office.',incident:{id:incident.id,type:incident.incident_type,severity:incident.severity,summary:incident.summary,details:incident.details||'',status:incident.status,createdAt:incident.created_at,evidenceCount:0}});
    }

    if(action==='incident_photo'){
      const incidentId=String(b.incidentId||'').trim();if(!incidentId)return json(res,400,{ok:false,error:'Incident ID is required.'});
      const incident=(await db(`booking_field_incidents?id=eq.${encodeURIComponent(incidentId)}&booking_id=eq.${encodeURIComponent(id)}&select=*&limit=1`))?.[0];
      if(!incident)return json(res,404,{ok:false,error:'Problem report not found for this job.'});
      let customerId=current.customer_id;if(!customerId&&current.quote_id)customerId=(await quoteFor(current.quote_id))?.customer_id||null;
      const path=safeIncidentPhotoPath(b.path,customerId,id,incidentId);if(!path)return json(res,400,{ok:false,error:'Invalid incident photo path.'});
      const items=Array.isArray(incident.evidence_paths)?incident.evidence_paths:[];if(items.length>=10)return json(res,400,{ok:false,error:'Maximum incident photo limit reached.'});
      const evidencePaths=items.includes(path)?items:[...items,path],after=(await db(`booking_field_incidents?id=eq.${encodeURIComponent(incidentId)}&booking_id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=representation',body:{evidence_paths:evidencePaths,updated_at:new Date().toISOString()}}))?.[0];
      await auditLog(req,staff,{action:'job.incident_photo',entityType:'booking_incident',entityId:incidentId,summary:'Added field incident evidence photo',before:incident,after,metadata:{bookingId:id,assignedStaffId:user.id}});
      return json(res,200,{ok:true,message:'Incident photo saved.',evidenceCount:evidencePaths.length});
    }

    const now=new Date().toISOString();let patch={},message='Job updated.',eta=null;
    if(action==='on_my_way'){
      if(!['scheduled','on_my_way'].includes(current.work_status||'scheduled'))return json(res,409,{ok:false,error:'This job has already been started or completed.'});
      eta=etaMinutes(b.etaMinutes);patch={work_status:'on_my_way',on_my_way_at:current.on_my_way_at||now,on_my_way_eta_minutes:eta,estimated_arrival_at:eta?new Date(Date.now()+eta*60000).toISOString():null};message=eta?`Marked as on the way · about ${eta} min ETA.`:'Marked as on the way.';
    }else if(action==='started'){
      if((current.work_status||'scheduled')==='completed')return json(res,409,{ok:false,error:'This job is already completed.'});
      patch={work_status:'started',started_at:current.started_at||now};message='Job started.';
    }else if(action==='completed'){
      if((current.work_status||'scheduled')!=='started')return json(res,409,{ok:false,error:'Start the job before marking it complete.'});
      const quote=await quoteFor(current.quote_id);
      if(quote?.service_key==='windows'){
        const quality=await qualityFor(id),missing=missingWindowChecklist(quality);
        if(missing.length)return json(res,409,{ok:false,error:`Complete the field quality checklist first (${missing.length} item${missing.length===1?'':'s'} remaining).`});
      }
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
    let customerNotification=null;
    if(action==='on_my_way'){
      const q=await quoteFor(booking.quote_id);
      if(q){try{customerNotification=await sendBookingNotificationNow({booking,quote:q,type:'on_my_way'})}catch(e){console.error('On-my-way customer notification:',e.message);customerNotification={ok:false,error:true}}}
    }
    if(action==='completed'){const q=await quoteFor(booking.quote_id);if(q){await sendBookingNotificationNow({booking,quote:q,type:'completion'});await scheduleBookingFollowUp(booking,q);await createStaffNotification({type:'job_completed',title:'Field job completed',body:`${q.customer_name||'Customer'} · ${q.service_key||'service'}`,targetPath:`/admin?tab=bookings&booking=${encodeURIComponent(booking.id)}`,permissionKey:'bookings',entityType:'booking',entityId:booking.id,priority:'normal',dedupeKey:`job-completed:${booking.id}`})}}
    await auditLog(req,staff,{action:`job.${action}`,entityType:'booking',entityId:booking.id,summary:`Field job: ${message}`,before:current,after:booking,metadata:{assignedStaffId:user.id,etaMinutes:eta}});
    return json(res,200,{ok:true,message,booking,customerNotification});
  }catch(e){return safeError(res,e)}
};
