const { json, db, requireStaff, safeError } = require('../lib/server');

const SERVICE_LABELS={windows:'Window cleaning',gutters:'Gutter cleaning',roof:'Roof cleaning',jetwash:'Jet washing',handyman:'Handyman',tour3d:'3D property tour'};

module.exports=async function handler(req,res){
  try{
    if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
    const {user,profile,jobTitle}=await requireStaff(req,'bookings');
    const now=Date.now(),from=new Date(now-14*86400000).toISOString(),to=new Date(now+90*86400000).toISOString();
    const bookings=await db(`bookings?assigned_staff_id=eq.${encodeURIComponent(user.id)}&starts_at=gte.${encodeURIComponent(from)}&starts_at=lte.${encodeURIComponent(to)}&status=neq.cancelled&select=*&order=starts_at.asc&limit=300`);
    const quoteIds=[...new Set((bookings||[]).map(b=>b.quote_id).filter(Boolean))];
    const customerIds=[...new Set((bookings||[]).map(b=>b.customer_id).filter(Boolean))];
    let quotes=[],customers=[];
    if(quoteIds.length)quotes=await db(`quotes?id=in.(${quoteIds.map(x=>encodeURIComponent(x)).join(',')})&select=id,customer_id,customer_name,email,phone,postcode,service_key,final_price,automatic_estimate,inputs`);
    if(customerIds.length)customers=await db(`profiles?id=in.(${customerIds.map(x=>encodeURIComponent(x)).join(',')})&select=id,full_name,email,phone,postcode,address_line1,address_line2,city,district,region,latitude,longitude`);
    const quoteMap=Object.fromEntries((quotes||[]).map(q=>[q.id,q]));
    const customerMap=Object.fromEntries((customers||[]).map(p=>[p.id,p]));
    const jobs=(bookings||[]).map(b=>{
      const q=quoteMap[b.quote_id]||{},p=customerMap[b.customer_id]||{};
      return {
        id:b.id,quoteId:b.quote_id||null,customerId:b.customer_id||q.customer_id||null,
        startsAt:b.starts_at,endsAt:b.ends_at,address:b.address,status:b.status,paymentStatus:b.payment_status,
        workStatus:b.work_status||'scheduled',onMyWayAt:b.on_my_way_at||null,startedAt:b.started_at||null,completedAt:b.completed_at||null,
        beforeImages:Array.isArray(b.before_images)?b.before_images:[],afterImages:Array.isArray(b.after_images)?b.after_images:[],staffNotes:b.staff_notes||'',customerNote:b.customer_note||'',
        customer:{name:q.customer_name||p.full_name||'Customer',email:q.email||p.email||'',phone:q.phone||p.phone||'',postcode:q.postcode||p.postcode||'',latitude:p.latitude==null?null:Number(p.latitude),longitude:p.longitude==null?null:Number(p.longitude)},
        serviceKey:q.service_key||'',serviceLabel:SERVICE_LABELS[q.service_key]||q.service_key||'Namdar service',
        price:q.final_price!=null?Number(q.final_price):(q.automatic_estimate!=null?Number(q.automatic_estimate):null),inputs:q.inputs||{}
      };
    });
    return json(res,200,{ok:true,staff:{id:user.id,name:profile.full_name||user.email,email:user.email,role:profile.role,jobTitle:jobTitle||profile.role},jobs});
  }catch(e){return safeError(res,e)}
};
