const {json,parseBody,db,requireStaff,auditLog,safeError,safeHttpsUrl,env}=require('../lib/server');

const BOROUGHS=new Set(['Lewisham','Southwark','Lambeth','Wandsworth','Greenwich']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POSTCODE=/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i;
function synthetic(...values){
  const s=values.filter(Boolean).join(' ');
  return /\b(?:TEST|DEMO|DUMMY|SAMPLE)\s+JOB\b/i.test(s)||/@example\.(?:com|org|net)\b/i.test(s);
}
function cleanText(value,max){return String(value||'').trim().replace(/\s+/g,' ').slice(0,max)}
function privacyLeak(text,booking,quote){
  const value=String(text||'').toLowerCase();
  if(!value)return false;
  if(POSTCODE.test(text))return true;
  const privateValues=[quote?.email,quote?.phone,quote?.postcode,booking?.address,quote?.customer_name]
    .map(v=>String(v||'').trim()).filter(v=>v.length>=4);
  return privateValues.some(v=>value.includes(v.toLowerCase()));
}
function imageUrl(value){
  const href=safeHttpsUrl(value||'');if(!href)return '';
  try{
    const u=new URL(href),supabase=new URL(env('SUPABASE_URL'));
    if(u.hostname!==supabase.hostname)return '';
    if(!u.pathname.includes('/storage/v1/object/public/job-images/'))return '';
    return u.href;
  }catch{return ''}
}
async function quoteFor(booking){
  if(!booking?.quote_id)return null;
  return (await db(`quotes?id=eq.${encodeURIComponent(booking.quote_id)}&select=id,customer_id,customer_name,email,phone,postcode,service_key&limit=1`))?.[0]||null;
}
async function linkedBookingIds(){
  const rows=await db('portfolio_jobs?source_booking_id=not.is.null&select=source_booking_id');
  return new Set((rows||[]).map(x=>x.source_booking_id).filter(Boolean));
}

module.exports=async function handler(req,res){
  try{
    const staff=await requireStaff(req,'content');
    if(req.method==='GET'){
      const [bookings,used]=await Promise.all([
        db('bookings?or=(status.eq.completed,work_status.eq.completed)&select=id,quote_id,customer_id,status,work_status,completed_at,starts_at,address&order=completed_at.desc.nullslast,starts_at.desc&limit=250'),
        linkedBookingIds()
      ]);
      const quoteIds=[...new Set((bookings||[]).map(x=>x.quote_id).filter(Boolean))];
      const quotes=quoteIds.length?await db(`quotes?id=in.(${quoteIds.map(x=>encodeURIComponent(x)).join(',')})&select=id,customer_name,email,phone,postcode,service_key`):[];
      const qm=Object.fromEntries((quotes||[]).map(q=>[q.id,q]));
      const candidates=(bookings||[]).filter(b=>{
        const q=qm[b.quote_id];return q&&q.service_key==='windows'&&!used.has(b.id)&&!synthetic(b.address,q.customer_name,q.email);
      }).map(b=>{const q=qm[b.quote_id];return {
        bookingId:b.id,customerName:q.customer_name||'Customer',postcode:q.postcode||'',serviceKey:q.service_key,
        completedAt:b.completed_at||b.starts_at,address:b.address||''
      }});
      return json(res,200,{ok:true,candidates});
    }
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const body=parseBody(req),bookingId=String(body.bookingId||'').trim();
    if(!UUID.test(bookingId))return json(res,400,{ok:false,error:'Choose a genuine completed booking.'});
    const booking=(await db(`bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,quote_id,customer_id,status,work_status,completed_at,starts_at,address&limit=1`))?.[0]||null;
    if(!booking||!(booking.status==='completed'||booking.work_status==='completed'))return json(res,409,{ok:false,error:'Only completed bookings can become public work.'});
    const quote=await quoteFor(booking);if(!quote)return json(res,409,{ok:false,error:'The completed booking has no linked quote.'});
    if(quote.service_key!=='windows')return json(res,409,{ok:false,error:'Only the live Window Cleaning service can be published right now.'});
    if(synthetic(booking.address,quote.customer_name,quote.email))return json(res,409,{ok:false,error:'Test/demo bookings cannot be published as real work.'});
    const existing=(await db(`portfolio_jobs?source_booking_id=eq.${encodeURIComponent(bookingId)}&select=id&limit=1`))?.[0];
    if(existing)return json(res,409,{ok:false,error:'This completed booking is already linked to a portfolio item.'});

    const title=cleanText(body.title,120),description=cleanText(body.description,1200),location=cleanText(body.location,60);
    if(title.length<8)return json(res,400,{ok:false,error:'Add a clear public case-study title.'});
    if(description.length<40)return json(res,400,{ok:false,error:'Add a useful public description of at least 40 characters.'});
    if(!BOROUGHS.has(location))return json(res,400,{ok:false,error:'Choose one of Namdar’s live boroughs as the public location.'});
    if(privacyLeak(title,booking,quote)||privacyLeak(description,booking,quote))return json(res,400,{ok:false,error:'Remove the customer name, address, email, phone or postcode from the public case study.'});

    const images=[...new Set((Array.isArray(body.imageUrls)?body.imageUrls:[]).map(imageUrl).filter(Boolean))].slice(0,8);
    const published=body.published===true,consent=body.consentConfirmed===true,now=new Date().toISOString();
    if(published&&!consent)return json(res,400,{ok:false,error:'Confirm publication permission before publishing.'});
    if(published&&!images.length)return json(res,400,{ok:false,error:'Attach at least one genuine work photo before publishing.'});
    const completedAt=String(booking.completed_at||booking.starts_at||'').slice(0,10)||null;
    const row=(await db('portfolio_jobs',{method:'POST',prefer:'return=representation',body:{
      title,service_key:'windows',description,location_label:location,image_urls:images,tour_url:null,published,
      completed_at:completedAt,source_booking_id:booking.id,
      publication_consent_at:consent?now:null,publication_consent_by:consent?staff.user.id:null,published_at:published?now:null
    }}))?.[0];
    await auditLog(req,staff,{action:published?'portfolio.publish':'portfolio.draft_create',entityType:'portfolio_job',entityId:row?.id||null,summary:`${published?'Published':'Created draft'} real-work case study from completed booking ${booking.id}`});
    return json(res,201,{ok:true,job:row});
  }catch(error){return safeError(res,error)}
};

module.exports.synthetic=synthetic;
module.exports.privacyLeak=privacyLeak;
