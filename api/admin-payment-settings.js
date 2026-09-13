const {json,parseBody,db,env,requireStaff,auditLog,safeError}=require('../lib/server');
const {DEFAULT_PAYMENT_POLICY,normalizePaymentPolicy,providerReadiness}=require('../lib/payment-policy');

async function currentRow(){return (await db('site_settings?key=eq.payments&select=*&limit=1').catch(()=>[]))?.[0]||null}
function view(row,provider,canEdit=false){
  const policy=normalizePaymentPolicy(row?.value||DEFAULT_PAYMENT_POLICY);
  return{ok:true,canEdit,policy:{...policy,effectiveActive:policy.active&&provider.ready},stripeConfigured:provider.stripeConfigured,webhookConfigured:provider.webhookConfigured,providerReady:provider.ready};
}
module.exports=async function handler(req,res){
  try{
    if(req.method==='GET'){
      const staff=await requireStaff(req,'payments'),row=await currentRow(),provider=providerReadiness(env);
      const canEdit=staff?.profile?.role==='admin'||staff?.permissions?.all===true||staff?.permissions?.settings===true;
      return json(res,200,view(row,provider,canEdit));
    }
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const staff=await requireStaff(req,'settings'),body=parseBody(req),before=await currentRow(),provider=providerReadiness(env);
    const policy=normalizePaymentPolicy({active:body.active,mode:body.mode,depositPercent:body.depositPercent,minimumDeposit:body.minimumDeposit,allowFullPayment:body.allowFullPayment,headlineAllowanceActive:body.headlineAllowanceActive,headlineAllowancePercent:body.headlineAllowancePercent,headlineAllowanceFixed:body.headlineAllowanceFixed});
    if(body.active===true&&!provider.ready)return json(res,409,{ok:false,error:'Connect Stripe and configure the verified webhook before enabling online payments.'});
    const now=new Date().toISOString();
    await db('site_settings?on_conflict=key',{method:'POST',prefer:'resolution=merge-duplicates,return=representation',body:{key:'payments',value:{active:policy.active,mode:policy.mode,deposit_percent:policy.depositPercent,minimum_deposit:policy.minimumDeposit,allow_full_payment:policy.allowFullPayment,headline_allowance_active:policy.headlineAllowanceActive,headline_allowance_percent:policy.headlineAllowancePercent,headline_allowance_fixed:policy.headlineAllowanceFixed},updated_by:staff.user.id,updated_at:now}});
    const after=await currentRow();
    await auditLog(req,staff,{action:'payments.settings_update',entityType:'site_settings',entityId:'payments',summary:policy.active?`Updated online payment policy (${policy.mode})`:'Kept online payments disabled',before,after,metadata:{providerReady:provider.ready,headlineAllowanceActive:policy.headlineAllowanceActive,headlineAllowancePercent:policy.headlineAllowancePercent,headlineAllowanceFixed:policy.headlineAllowanceFixed}});
    return json(res,200,view(after,provider,true));
  }catch(error){return safeError(res,error)}
};
