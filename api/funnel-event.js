const {json,parseBody,db,safeError}=require('../lib/server');

const VISITOR=/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[0-9a-f]{24,64})$/i;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENTS=new Set([
  'service_viewed','quote_started','postcode_checked','quote_submitted','quote_continue',
  'quote_accepted','quote_declined','booking_started','booking_submitted','checkout_started',
  'payment_confirmed','phone_clicked','email_clicked','support_clicked'
]);
function visitorId(v=''){const x=String(v||'').trim();return x.length<=96&&VISITOR.test(x)?x:''}
function postcodeArea(v=''){const x=String(v||'').trim().toUpperCase().replace(/\s+/g,'');return (x.match(/^[A-Z]{1,2}/)||[])[0]||null}
function uuid(v=''){const x=String(v||'').trim();return UUID.test(x)?x:null}
function safePath(v=''){const x=String(v||'').trim();return x?x.slice(0,300):null}
function productionHost(req){const h=String(req.headers?.host||'').split(':')[0].toLowerCase();return h==='namdar.co.uk'||h==='www.namdar.co.uk'}

module.exports=async function handler(req,res){
  try{
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    if(!productionHost(req))return json(res,202,{ok:true,recorded:false,reason:'non_production_host'});
    const b=parseBody(req),eventType=String(b.eventType||'').trim(),visitor=visitorId(b.sessionId||b.visitorId),serviceKey=String(b.serviceKey||'windows').trim();
    if(!EVENTS.has(eventType)||!visitor||serviceKey!=='windows')return json(res,400,{ok:false,error:'Invalid Window Cleaning funnel event.'});

    const area=eventType==='postcode_checked'?postcodeArea(b.postcode):null;
    const covered=eventType==='postcode_checked'?b.covered===true:null;
    if(eventType==='postcode_checked'&&!area)return json(res,400,{ok:false,error:'A valid postcode area is required for this event.'});

    const quoteId=uuid(b.quoteId),bookingId=uuid(b.bookingId),path=safePath(b.path);
    const since=new Date(Date.now()-(eventType==='postcode_checked'?30:10)*60*1000).toISOString();
    const filters=[
      `event_type=eq.${encodeURIComponent(eventType)}`,
      `visitor_id=eq.${encodeURIComponent(visitor)}`,
      `service_key=eq.windows`,
      `created_at=gte.${encodeURIComponent(since)}`
    ];
    if(area)filters.push(`postcode_area=eq.${encodeURIComponent(area)}`);
    if(eventType==='postcode_checked')filters.push(`covered=eq.${covered?'true':'false'}`);
    if(quoteId)filters.push(`quote_id=eq.${encodeURIComponent(quoteId)}`);
    if(bookingId)filters.push(`booking_id=eq.${encodeURIComponent(bookingId)}`);

    const duplicate=(await db(`conversion_events?${filters.join('&')}&select=id&limit=1`).catch(()=>[]))?.[0];
    if(!duplicate){
      await db('conversion_events',{
        method:'POST',
        prefer:'return=minimal',
        body:{
          event_type:eventType,
          visitor_id:visitor,
          service_key:'windows',
          postcode_area:area,
          covered:eventType==='postcode_checked'?covered:null,
          path,
          quote_id:quoteId,
          booking_id:bookingId
        }
      });
    }
    return json(res,201,{ok:true,recorded:!duplicate});
  }catch(error){return safeError(res,error)}
};
