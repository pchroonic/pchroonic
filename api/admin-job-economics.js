const {json,parseBody,db,requireStaff,auditLog,safeError}=require('../lib/server');
function money(v,max=100000){const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(0,Number(n.toFixed(2)))):0}
function integer(v,min=0,max=1440){const n=Math.round(Number(v));return Number.isFinite(n)?Math.min(max,Math.max(min,n)):min}
module.exports=async function handler(req,res){
  try{
    if(!['POST','PATCH'].includes(req.method))return json(res,405,{ok:false,error:'Method not allowed'});
    const staff=await requireStaff(req,'bookings'),b=parseBody(req),bookingId=String(b.bookingId||'').trim();
    if(!bookingId)return json(res,400,{ok:false,error:'Booking ID is required.'});
    const booking=(await db(`bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,quote_id,status,work_status&limit=1`))?.[0];
    if(!booking)return json(res,404,{ok:false,error:'Booking not found.'});
    const quote=booking.quote_id?(await db(`quotes?id=eq.${encodeURIComponent(booking.quote_id)}&select=id,service_key&limit=1`))?.[0]:null;
    if(!quote||quote.service_key!=='windows')return json(res,409,{ok:false,error:'Stage 1 job economics are currently available for Window Cleaning only.'});
    const before=(await db(`booking_job_costs?booking_id=eq.${encodeURIComponent(bookingId)}&select=*&limit=1`))?.[0]||null;
    const row={booking_id:bookingId,consumables_cost:money(b.consumablesCost),parking_cost:money(b.parkingCost),travel_cost:money(b.travelCost),other_cost:money(b.otherCost),travel_minutes:integer(b.travelMinutes),travel_miles:money(b.travelMiles,10000),notes:String(b.notes||'').trim().slice(0,1500)||null,updated_by:staff.user.id,updated_at:new Date().toISOString()};
    await db('booking_job_costs?on_conflict=booking_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:row});
    const after=(await db(`booking_job_costs?booking_id=eq.${encodeURIComponent(bookingId)}&select=*&limit=1`))?.[0]||row;
    await auditLog(req,staff,{action:'booking.economics',entityType:'booking',entityId:bookingId,summary:'Updated Window Cleaning direct job costs and travel',before,after,metadata:{quoteId:booking.quote_id||null,serviceKey:'windows'}});
    return json(res,200,{ok:true,costs:after});
  }catch(error){return safeError(res,error)}
};
