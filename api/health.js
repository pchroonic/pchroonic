const {json,db,env,safeError}=require('../lib/server');
module.exports=async function handler(req,res){
  try{
    if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
    const pricing=await db('pricing_rules?select=service_key&limit=1'),stripeSecret=Boolean(env('STRIPE_SECRET_KEY')),stripeWebhook=Boolean(env('STRIPE_WEBHOOK_SECRET'));
    return json(res,200,{ok:true,database:Array.isArray(pricing),stripe:stripeSecret&&stripeWebhook,stripeSecret,stripeWebhook,email:Boolean(env('RESEND_API_KEY')&&env('NAMDAR_FROM_EMAIL')),reminders:Boolean(env('RESEND_API_KEY')&&env('NAMDAR_FROM_EMAIL')&&env('CRON_SECRET')),followups:Boolean(env('RESEND_API_KEY')&&env('NAMDAR_FROM_EMAIL')&&env('CRON_SECRET')),timestamp:new Date().toISOString()});
  }catch(e){return safeError(res,e)}
};
