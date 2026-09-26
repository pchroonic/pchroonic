const {json,env,requireStaff,safeError}=require('../lib/server');

async function getJson(path,adminKey){
  const url=new URL(path,'https://api.getAddress.io');
  url.searchParams.set('api-key',adminKey);
  const response=await fetch(url,{headers:{Accept:'application/json'}});
  const text=await response.text();
  let body=null;
  try{body=text?JSON.parse(text):null}catch{body={message:text||''}}
  if(!response.ok){const error=new Error(String(body?.message||body?.error||('GetAddress returned '+response.status)));error.status=response.status;throw error}
  return body;
}

function safeSubscription(body){
  const plan=body?.plan||{};
  return {status:body?.status||null,name:body?.name||null,startDate:body?.start_date||null,nextBillingDate:body?.next_billing_date||null,paymentMethod:body?.payment_method||null,plan:{term:plan?.term||null,dailyLookupLimit1:plan?.daily_lookup_limit_1??null,dailyLookupLimit2:plan?.daily_lookup_limit_2??null,amount:plan?.amount??null,multiApplication:plan?.multi_application??null}};
}
function safeUsage(body){return {usageToday:body?.usage_today??null,dailyLimit:body?.daily_limit??null,monthlyBuffer:body?.monthly_buffer??null,monthlyBufferUsed:body?.monthly_buffer_used??null}}

module.exports=async function handler(req,res){
  try{
    if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
    await requireStaff(req,'settings');
    const adminKey=String(env('GETADDRESS_ADMIN_KEY','')||'').trim();
    if(!adminKey)return json(res,200,{ok:true,configured:false,provider:'getAddress.io',message:'GETADDRESS_ADMIN_KEY is not configured'});
    const [subscription,usage]=await Promise.all([getJson('/v2/subscription',adminKey),getJson('/v3/usage',adminKey)]);
    return json(res,200,{ok:true,configured:true,authorized:true,provider:'getAddress.io',subscription:safeSubscription(subscription),usage:safeUsage(usage),checkedAt:new Date().toISOString()});
  }catch(error){
    if(Number(error?.status)===401)return json(res,200,{ok:true,configured:true,authorized:false,provider:'getAddress.io',message:'GetAddress rejected the Administration Key'});
    return safeError(res,error);
  }
};
