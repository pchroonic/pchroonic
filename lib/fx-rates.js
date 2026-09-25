const ISO=/^[A-Z]{3}$/;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const API='https://api.frankfurter.dev/v2';

function dayOffset(date,days){
  const d=new Date(`${date}T12:00:00Z`);
  if(!Number.isFinite(d.getTime()))return null;
  d.setUTCDate(d.getUTCDate()+days);
  return d.toISOString().slice(0,10);
}
function dayDistance(from,to){
  const a=new Date(`${from}T12:00:00Z`),b=new Date(`${to}T12:00:00Z`);
  if(!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime()))return null;
  return Math.round((b-a)/86400000);
}
async function fetchJson(url,timeoutMs=6000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const r=await fetch(url,{
      cache:'no-store',
      headers:{accept:'application/json','cache-control':'no-cache','user-agent':'Namdar-Finance/1.1'},
      signal:controller.signal
    });
    if(!r.ok)throw new Error(`ECB FX provider HTTP ${r.status}`);
    return await r.json();
  }finally{clearTimeout(timer)}
}
async function tryEcbRate(from,to,date){
  const url=`${API}/providers/ecb/rate/${encodeURIComponent(from.toLowerCase())}/${encodeURIComponent(to.toLowerCase())}?date=${encodeURIComponent(date)}`;
  const data=await fetchJson(url);
  const rate=Number(data?.rate),rateDate=DATE.test(String(data?.date||''))?String(data.date):date;
  if(!Number.isFinite(rate)||rate<=0)throw new Error('ECB returned an invalid exchange rate.');
  const lag=dayDistance(rateDate,date);
  if(lag===null||lag<0||lag>7)throw new Error('ECB returned a rate outside the permitted date window.');
  return{
    rate:Number(rate.toFixed(8)),
    rateDate,
    provider:'European Central Bank (ECB) via Frankfurter',
    providerKey:'ecb',
    sourceType:'official_reference'
  };
}
async function referenceRate({from,to='GBP',date}={}){
  from=String(from||'').trim().toUpperCase();
  to=String(to||'GBP').trim().toUpperCase();
  date=String(date||'').trim();
  if(!ISO.test(from)||!ISO.test(to))throw Object.assign(new Error('Use a valid three-letter currency code.'),{status:400});
  if(!DATE.test(date))throw Object.assign(new Error('A valid FX date is required.'),{status:400});
  if(from===to)return{rate:1,rateDate:date,provider:'No conversion required',providerKey:'same_currency',sourceType:'same_currency',requestedDate:date,fallbackDays:0};
  let lastError=null;
  for(let back=0;back<=7;back++){
    const candidate=dayOffset(date,-back);
    try{
      const result=await tryEcbRate(from,to,candidate);
      const fallbackDays=Math.max(0,dayDistance(result.rateDate,date)||0);
      if(fallbackDays>7)throw new Error('ECB reference rate is too old for this transaction date.');
      return{...result,requestedDate:date,fallbackDays};
    }catch(e){lastError=e}
  }
  throw Object.assign(new Error('ECB reference rate is temporarily unavailable. Retry later or enter the actual GBP amount from your bank/card statement.'),{status:503,cause:lastError});
}
function convert(amount,rate){
  const a=Number(amount),r=Number(rate);
  if(!Number.isFinite(a)||a<0||!Number.isFinite(r)||r<=0)return null;
  return Number((a*r).toFixed(2));
}
module.exports={referenceRate,convert};
