const {json,parseBody,db,requireStaff,auditLog,safeError}=require('../lib/server');
module.exports=async function handler(req,res){try{
  const staff=await requireStaff(req,'tickets');
  if(req.method==='GET'){
    const rows=await db('booking_feedback?rating=not.is.null&select=*&order=submitted_at.desc&limit=300');
    const bookingIds=[...new Set((rows||[]).map(x=>x.booking_id).filter(Boolean))],quoteIds=[...new Set((rows||[]).map(x=>x.quote_id).filter(Boolean))];
    const bookings=bookingIds.length?await db(`bookings?id=in.(${bookingIds.join(',')})&select=id,address,starts_at,completed_at,status,work_status`):[];
    const quotes=quoteIds.length?await db(`quotes?id=in.(${quoteIds.join(',')})&select=id,customer_name,email,phone,postcode,service_key`):[];
    const bm=Object.fromEntries((bookings||[]).map(x=>[x.id,x])),qm=Object.fromEntries((quotes||[]).map(x=>[x.id,x]));
    return json(res,200,{ok:true,feedback:(rows||[]).map(x=>{const {token,...safe}=x;return {...safe,booking:bm[x.booking_id]||null,quote:qm[x.quote_id]||null}})});
  }
  if(req.method!=='PATCH')return json(res,405,{ok:false,error:'Method not allowed'});
  const b=parseBody(req),id=String(b.id||'').trim();if(!id)return json(res,400,{ok:false,error:'Feedback ID is required.'});
  const row=(await db(`booking_feedback?id=eq.${encodeURIComponent(id)}&select=*&limit=1`))?.[0];if(!row)return json(res,404,{ok:false,error:'Feedback not found.'});
  const patch={updated_at:new Date().toISOString()};
  if(b.action==='resolve'){patch.status='resolved';patch.resolved_at=new Date().toISOString();}
  else if(b.action==='reopen'){patch.status=Number(row.rating)<=3?'needs_attention':'positive';patch.resolved_at=null;}
  else if(b.action==='note'){patch.admin_notes=String(b.adminNotes||'').trim().slice(0,4000)||null;}
  else return json(res,400,{ok:false,error:'Unknown feedback action.'});
  const updated=(await db(`booking_feedback?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=representation',body:patch}))?.[0]||row;
  await auditLog(req,staff,{action:`feedback.${String(b.action||'update')}`,entityType:'booking_feedback',entityId:id,summary:`${String(b.action||'Updated')} customer feedback`,before:row,after:updated});
  return json(res,200,{ok:true,feedback:updated});
}catch(e){return safeError(res,e)}};
