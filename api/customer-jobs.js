const { json, db, requireCustomer, safeError } = require('../lib/server');

const SERVICE_LABELS={windows:'Window cleaning',gutters:'Gutter cleaning',roof:'Roof cleaning',jetwash:'Jet washing',handyman:'Handyman',tour3d:'3D property tour'};

module.exports=async function handler(req,res){
  try{
    if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
    const {user}=await requireCustomer(req);
    const bookings=await db(`bookings?customer_id=eq.${encodeURIComponent(user.id)}&select=*&order=starts_at.desc&limit=300`);
    const quoteIds=[...new Set((bookings||[]).map(b=>b.quote_id).filter(Boolean))];
    const staffIds=[...new Set((bookings||[]).map(b=>b.assigned_staff_id).filter(Boolean))];
    let quotes=[],staff=[],access=[],changes=[];
    if(quoteIds.length)quotes=await db(`quotes?id=in.(${quoteIds.map(x=>encodeURIComponent(x)).join(',')})&select=id,service_key,final_price,automatic_estimate,postcode`);
    if(staffIds.length){
      staff=await db(`profiles?id=in.(${staffIds.map(x=>encodeURIComponent(x)).join(',')})&select=id,full_name,role`);
      access=await db(`staff_access?user_id=in.(${staffIds.map(x=>encodeURIComponent(x)).join(',')})&select=user_id,job_title,active`);
    }
    const bookingIds=[...new Set((bookings||[]).map(b=>b.id).filter(Boolean))];
    if(bookingIds.length)changes=await db(`booking_change_requests?booking_id=in.(${bookingIds.map(x=>encodeURIComponent(x)).join(',')})&select=id,booking_id,request_type,requested_starts_at,requested_ends_at,reason,status,admin_note,created_at,reviewed_at&order=created_at.desc`);
    const quoteMap=Object.fromEntries((quotes||[]).map(q=>[q.id,q]));
    const accessMap=Object.fromEntries((access||[]).map(a=>[a.user_id,a]));
    const staffMap=Object.fromEntries((staff||[]).map(p=>{const a=accessMap[p.id]||{};return[p.id,{name:String(p.full_name||'').trim()||String(a.job_title||'').trim()||'Namdar team',jobTitle:String(a.job_title||'').trim()}]}));
    const changeMap={};for(const c of changes||[]){if(!changeMap[c.booking_id]||c.status==='pending')changeMap[c.booking_id]=c}
    const jobs=(bookings||[]).map(b=>{
      const q=quoteMap[b.quote_id]||{},s=staffMap[b.assigned_staff_id]||null,complete=(b.work_status==='completed'||b.status==='completed');
      return {
        id:b.id,quoteId:b.quote_id||null,startsAt:b.starts_at,endsAt:b.ends_at,address:b.address,status:b.status,paymentStatus:b.payment_status,
        workStatus:b.work_status||'scheduled',onMyWayAt:b.on_my_way_at||null,startedAt:b.started_at||null,completedAt:b.completed_at||null,
        serviceKey:q.service_key||'',serviceLabel:SERVICE_LABELS[q.service_key]||q.service_key||'Namdar service',
        price:q.final_price!=null?Number(q.final_price):(q.automatic_estimate!=null?Number(q.automatic_estimate):null),postcode:q.postcode||'',
        assignedStaff:s,customerNote:String(b.customer_note||'').trim(),
        changeRequest:changeMap[b.id]?{id:changeMap[b.id].id,type:changeMap[b.id].request_type,requestedStartsAt:changeMap[b.id].requested_starts_at,requestedEndsAt:changeMap[b.id].requested_ends_at,reason:changeMap[b.id].reason||'',status:changeMap[b.id].status,adminNote:changeMap[b.id].admin_note||'',createdAt:changeMap[b.id].created_at,reviewedAt:changeMap[b.id].reviewed_at}:null,
        beforeImages:complete&&Array.isArray(b.before_images)?b.before_images:[],afterImages:complete&&Array.isArray(b.after_images)?b.after_images:[]
      };
    });
    return json(res,200,{ok:true,jobs});
  }catch(e){return safeError(res,e)}
};
