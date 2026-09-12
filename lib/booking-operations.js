const SLOT_WINDOWS={
  '08-11':{key:'08-11',start:'08:00',end:'11:00',label:'08:00–11:00'},
  '11-14':{key:'11-14',start:'11:00',end:'14:00',label:'11:00–14:00'},
  '14-17':{key:'14-17',start:'14:00',end:'17:00',label:'14:00–17:00'}
};

const DEFAULT_RULES=Object.freeze({
  horizonDays:21,
  minimumNoticeHours:24,
  operatingDays:[1,2,3,4,5,6],
  enabledWindows:['08-11','11-14','14-17'],
  maxJobsPerDay:3,
  routeDensityEnabled:true,
  routeZoneMode:'postcode_area'
});

function int(v,min,max,fallback){const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback}
function uniqueInts(values,min,max,fallback){const list=[...new Set((Array.isArray(values)?values:[]).map(Number).filter(Number.isInteger).filter(x=>x>=min&&x<=max))].sort((a,b)=>a-b);return list.length?list:[...fallback]}
function sanitizeRules(value={}){
  const v=value&&typeof value==='object'?value:{};
  const windows=[...new Set((Array.isArray(v.enabledWindows)?v.enabledWindows:DEFAULT_RULES.enabledWindows).map(String).filter(x=>SLOT_WINDOWS[x]))];
  return {
    horizonDays:int(v.horizonDays,7,60,DEFAULT_RULES.horizonDays),
    minimumNoticeHours:int(v.minimumNoticeHours,0,168,DEFAULT_RULES.minimumNoticeHours),
    operatingDays:uniqueInts(v.operatingDays,0,6,DEFAULT_RULES.operatingDays),
    enabledWindows:windows.length?windows:[...DEFAULT_RULES.enabledWindows],
    maxJobsPerDay:int(v.maxJobsPerDay,1,12,DEFAULT_RULES.maxJobsPerDay),
    routeDensityEnabled:v.routeDensityEnabled!==false,
    routeZoneMode:'postcode_area'
  };
}

async function loadRules(db){
  const rows=await db('site_settings?key=eq.booking_operations&select=value&limit=1').catch(()=>[]);
  return sanitizeRules(rows?.[0]?.value||DEFAULT_RULES);
}

function londonParts(value){return Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(value).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]))}
function londonDateString(value=new Date()){const p=londonParts(value);return `${p.year}-${p.month}-${p.day}`}
function addDays(dateStr,n){const [y,m,d]=String(dateStr).split('-').map(Number);return new Date(Date.UTC(y,m-1,d+n,12)).toISOString().slice(0,10)}
function londonLocalToUtc(dateStr,timeStr){
  const [y,m,d]=String(dateStr||'').split('-').map(Number),[hh,mm]=String(timeStr||'').split(':').map(Number);
  if(!y||!m||!d||!Number.isFinite(hh)||!Number.isFinite(mm))return null;
  let guess=new Date(Date.UTC(y,m-1,d,hh,mm,0));
  const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  for(let i=0;i<2;i++){
    const p=Object.fromEntries(fmt.formatToParts(guess).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
    const shown=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour),Number(p.minute)),wanted=Date.UTC(y,m-1,d,hh,mm);
    guess=new Date(guess.getTime()+(wanted-shown));
  }
  return guess;
}
function weekday(dateStr){const [y,m,d]=String(dateStr).split('-').map(Number);return new Date(Date.UTC(y,m-1,d,12)).getUTCDay()}
function postcodeZone(postcode=''){
  const clean=String(postcode||'').trim().toUpperCase().replace(/\s+/g,' '),outward=clean.split(' ')[0]||'';
  const area=(outward.match(/^[A-Z]{1,2}/)||[])[0]||'';
  return area||null;
}
function sameWindow(start,end,date,window){const a=londonLocalToUtc(date,window.start),z=londonLocalToUtc(date,window.end);return Boolean(a&&z&&Math.abs(a-start)<60000&&Math.abs(z-end)<60000)}

async function quoteMapForBookings(db,bookings){
  const ids=[...new Set((bookings||[]).map(x=>x.quote_id).filter(Boolean))];if(!ids.length)return new Map();
  const rows=await db(`quotes?id=in.(${ids.join(',')})&select=id,postcode,service_key`).catch(()=>[]);
  return new Map((rows||[]).map(q=>[q.id,q]));
}

async function loadActiveBookings(db,rangeStart,rangeEnd){
  return db(`bookings?starts_at=lt.${encodeURIComponent(rangeEnd.toISOString())}&ends_at=gt.${encodeURIComponent(rangeStart.toISOString())}&status=in.(pending,confirmed)&select=id,quote_id,starts_at,ends_at,status&limit=1000`).catch(()=>[]);
}

function enrichBookings(bookings,quoteMap){return (bookings||[]).map(b=>{const q=quoteMap.get(b.quote_id)||{};return {...b,postcode:q.postcode||'',routeZone:postcodeZone(q.postcode)}})}

async function scheduleContext(db,rules,now=new Date(),days=rules.horizonDays){
  const today=londonDateString(now),rangeStart=londonLocalToUtc(today,'00:00'),rangeEnd=londonLocalToUtc(addDays(today,days),'00:00');
  const bookings=await loadActiveBookings(db,rangeStart,rangeEnd),quoteMap=await quoteMapForBookings(db,bookings);
  return {today,bookings:enrichBookings(bookings,quoteMap)};
}

function dayBookings(bookings,date){return bookings.filter(b=>londonDateString(new Date(b.starts_at))===date)}
function routeZones(rows){return [...new Set(rows.map(x=>x.routeZone).filter(Boolean))]}

async function availabilityForQuote(db,quote,now=new Date()){
  const rules=await loadRules(db),ctx=await scheduleContext(db,rules,now,rules.horizonDays),zone=postcodeZone(quote?.postcode),slots=[],noticeAt=now.getTime()+rules.minimumNoticeHours*3600000;
  for(let offset=0;offset<rules.horizonDays;offset++){
    const date=addDays(ctx.today,offset);if(!rules.operatingDays.includes(weekday(date)))continue;
    const existing=dayBookings(ctx.bookings,date);if(existing.length>=rules.maxJobsPerDay)continue;
    const zones=routeZones(existing);
    if(rules.routeDensityEnabled&&zone&&zones.length&&!zones.includes(zone))continue;
    for(const key of rules.enabledWindows){
      const w=SLOT_WINDOWS[key],start=londonLocalToUtc(date,w.start),end=londonLocalToUtc(date,w.end);if(!start||!end||start.getTime()<noticeAt)continue;
      const conflict=existing.some(x=>new Date(x.starts_at)<end&&new Date(x.ends_at)>start);if(conflict)continue;
      slots.push({date,windowKey:key,label:w.label,startsAt:start.toISOString(),endsAt:end.toISOString(),routeZone:zone,dayBooked:existing.length,dayCapacity:rules.maxJobsPerDay});
    }
  }
  return {rules,routeZone:zone,slots};
}

async function validateSlotForQuote(db,quote,startsAt,endsAt,now=new Date()){
  const start=new Date(startsAt),end=new Date(endsAt);if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)return {ok:false,error:'Choose a valid booking window.'};
  const result=await availabilityForQuote(db,quote,now),match=result.slots.find(s=>Math.abs(new Date(s.startsAt).getTime()-start.getTime())<60000&&Math.abs(new Date(s.endsAt).getTime()-end.getTime())<60000);
  if(match)return {ok:true,slot:match,rules:result.rules,routeZone:result.routeZone};
  return {ok:false,error:'That appointment is no longer available under Namdar’s current operating schedule. Please choose another available slot.',rules:result.rules,routeZone:result.routeZone};
}

async function operationsPreview(db,now=new Date(),days=14){
  const rules=await loadRules(db),ctx=await scheduleContext(db,rules,now,Math.min(days,rules.horizonDays)),out=[];
  for(let offset=0;offset<Math.min(days,rules.horizonDays);offset++){
    const date=addDays(ctx.today,offset),rows=dayBookings(ctx.bookings,date),zones=routeZones(rows);
    out.push({date,operating:rules.operatingDays.includes(weekday(date)),booked:rows.length,capacity:rules.maxJobsPerDay,routeZones:zones,openWindows:Math.max(0,rules.enabledWindows.length-rows.length)});
  }
  return {rules,days:out};
}

module.exports={SLOT_WINDOWS,DEFAULT_RULES,sanitizeRules,loadRules,londonParts,londonDateString,londonLocalToUtc,addDays,weekday,postcodeZone,availabilityForQuote,validateSlotForQuote,operationsPreview,sameWindow};
