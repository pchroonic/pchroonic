const { json, parseBody, queryParam, db, requireStaff, auditLog, safeError } = require('../lib/server');

module.exports=async function handler(req,res){
  try{
    const staff=await requireStaff(req,'bookings');
    if(req.method==='GET'){
      const bookingId=String(queryParam(req,'booking','')||'').trim();
      if(!bookingId)return json(res,400,{ok:false,error:'Booking ID is required.'});
      const booking=(await db(`bookings?id=eq.${encodeURIComponent(bookingId)}&select=id&limit=1`))?.[0];
      if(!booking)return json(res,404,{ok:false,error:'Booking not found.'});
      const incidents=await db(`booking_field_incidents?booking_id=eq.${encodeURIComponent(bookingId)}&select=id,booking_id,reported_by,incident_type,severity,summary,details,status,evidence_paths,resolution_note,resolved_by,resolved_at,created_at,updated_at&order=created_at.desc`);
      return json(res,200,{ok:true,incidents:(incidents||[]).map(x=>({...x,evidence_count:Array.isArray(x.evidence_paths)?x.evidence_paths.length:0,evidence_paths:undefined}))});
    }
    if(req.method==='PATCH'){
      const body=parseBody(req),incidentId=String(body.incidentId||'').trim(),action=String(body.action||'').trim();
      if(!incidentId)return json(res,400,{ok:false,error:'Incident ID is required.'});
      if(!['resolve','reopen'].includes(action))return json(res,400,{ok:false,error:'Choose resolve or reopen.'});
      const before=(await db(`booking_field_incidents?id=eq.${encodeURIComponent(incidentId)}&select=*&limit=1`))?.[0];
      if(!before)return json(res,404,{ok:false,error:'Incident not found.'});
      const now=new Date().toISOString(),resolutionNote=String(body.resolutionNote||'').trim().slice(0,1500)||null;
      const patch=action==='resolve'?{status:'resolved',resolution_note:resolutionNote,resolved_by:staff.user.id,resolved_at:now,updated_at:now}:{status:'open',resolution_note:null,resolved_by:null,resolved_at:null,updated_at:now};
      const after=(await db(`booking_field_incidents?id=eq.${encodeURIComponent(incidentId)}`,{method:'PATCH',prefer:'return=representation',body:patch}))?.[0];
      await auditLog(req,staff,{action:`booking.incident_${action}`,entityType:'booking_incident',entityId:incidentId,summary:action==='resolve'?'Resolved field incident':'Reopened field incident',before,after,metadata:{bookingId:before.booking_id}});
      return json(res,200,{ok:true,message:action==='resolve'?'Incident resolved.':'Incident reopened.',incident:after});
    }
    return json(res,405,{ok:false,error:'Method not allowed'});
  }catch(e){return safeError(res,e)}
};
