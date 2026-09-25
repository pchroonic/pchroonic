const ISO=/^[A-Z]{3}$/;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const API='https://api.frankfurter.dev/v2';

function dayOffset(date,days){
  const d=new Date(`${date}T12:00:00Z`);
  if(!Number.isFinite(d.getTime()))return null;
  d.setUTCDate(d.getUTCDate()+days);
  return d.toISOString().slice(0,10);
}
async function fetchJson(url,timeoutMs=6000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const r=await fetch(url,{headers:{accept:'application/json','user-agent':'Namdar-Finance/1.0'},signal:controller.signal});
    if(!r.ok)throw new Error(`FX provider HTTP ${r.status}`);
    return await r.json();
  }finally{clearTimeout(timer)}
}
async function tryRate(from,to,date,provider){
  const suffix=provider?`&providers=${encodeURIComponent(provider)}`:'';
  const url=`${API}/rate/${encodeURIComponent(from.toLowerCase())}/${encodeURIComponent(to.toLowerCase())}?date=${encodeURIComponent(date)}${suffix}`;
  const data=await fetchJson(url);
  const rate=Number(data?.rate);
  if(!Number.isFinite(rate)||rate<=0)throw new Error('FX provider returned an invalid rate.');
  return {
    rate:Number(rate.toFixed(8)),
    rateDate:DATE.test(String(data?.date||''))?String(data.date):date,
    provider:provider==='ecb'?'ECB via Frankfurter':'Frankfurter reference blend',
    providerKey:provider||'blend'
  };
}
async function referenceRate({from,to='GBP',date}={}){
  from=String(from||'').trim().toUpperCase();
  to=String(to||'GBP').trim().toUpperCase();
  date=String(date||'').trim();
  if(!ISO.test(from)||!ISO.test(to))throw Object.assign(new Error('Use a valid three-letter currency code.'),{status:400});
  if(!DATE.test(date))throw Object.assign(new Error('A valid FX date is required.'),{status:400});
  if(from===to)return{rate:1,rateDate:date,provider:'No conversion required',providerKey:'same_currency',requestedDate:date};
  let lastError=null;
  for(let back=0;back<=7;back++){
    const candidate=dayOffset(date,-back);
    for(const provider of ['ecb',null]){
      try{
        const result=await tryRate(from,to,candidate,provider);
        return{...result,requestedDate:date};
      }catch(e){lastError=e}
    }
  }
  throw Object.assign(new Error('Exchange rate is temporarily unavailable. You can still enter the actual GBP amount from your bank/card statement.'),{status:503,cause:lastError});
}
function convert(amount,rate){
  const a=Number(amount),r=Number(rate);
  if(!Number.isFinite(a)||a<0||!Number.isFinite(r)||r<=0)return null;
  return Number((a*r).toFixed(2));
}
module.exports={referenceRate,convert};
