const {json,parseBody,db,env,requireStaff,auditLog,safeError}=require('../lib/server');
const {DEFAULT_PAYMENT_POLICY,normalizePaymentPolicy,validatePaymentPolicy,providerReadiness}=require('../lib/payment-policy');

async function currentRow(){return (await db('site_settings?key=eq.payments&select=*&limit=1').catch(()=>[]))?.[0]||null}
function view(row,provider,canEdit=false){
  const policy=normalizePaymentPolicy(row?.value||DEFAULT_PAYMENT_POLICY),validation=validatePaymentPolicy(row?.value||policy);
  return{ok:true,canEdit,policy:{...policy,effectiveActive:policy.active&&provider.ready},validationErrors:validation.errors,stripeConfigured:provider.stripeConfigured,webhookConfigured:provider.webhookConfigured,providerReady:provider.ready,stripeMode:provider.stripeMode,production:provider.production,liveReady:provider.liveReady,testReady:provider.testReady,activationBlockReason:provider.activationBlockReason};
}
module.exports=async function handler(req,res){
  try{
    if(req.method==='GET'){
      const staff=await requireStaff(req,'payments'),row=await currentRow(),provider=providerReadiness(env);
      const canEdit=staff?.profile?.role==='admin'||staff?.permissions?.all===true||staff?.permissions?.settings===true;
      return json(res,200,view(row,provider,canEdit));
    }
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const staff=await requireStaff(req,'settings'),body=parseBody(req),before=await currentRow(),provider=providerReadiness(env),beforePolicy=normalizePaymentPolicy(before?.value||{});
    const validation=validatePaymentPolicy({
      active:body.active,mode:body.mode,depositStrategy:body.depositStrategy,depositPercent:body.depositPercent,minimumDeposit:body.minimumDeposit,depositBands:body.depositBands,
      allowFullPayment:body.allowFullPayment,balanceDueHours:body.balanceDueHours,
      overdue:{reminderDays:body.overdueReminderDays,bookingHoldAfterDays:body.bookingHoldAfterDays,finalReviewAfterDays:body.finalReviewAfterDays},
      headlineAllowanceActive:body.headlineAllowanceActive,headlineAllowancePercent:body.headlineAllowancePercent,headlineAllowanceFixed:body.headlineAllowanceFixed
    });
    if(body.active===true&&!validation.ok)return json(res,400,{ok:false,error:validation.errors.join(' ')});
    if(body.active===true&&!provider.ready)return json(res,409,{ok:false,error:provider.activationBlockReason||'Connect Stripe and configure the verified webhook before enabling online payments.'});
    const policy={...validation.policy,revision:Math.max(1,Number(beforePolicy.revision||0)+1)},now=new Date().toISOString();
    await db('site_settings?on_conflict=key',{method:'POST',prefer:'resolution=merge-duplicates,return=representation',body:{key:'payments',value:{
      policy_revision:policy.revision,active:policy.active,mode:policy.mode,deposit_strategy:policy.depositStrategy,deposit_percent:policy.depositPercent,minimum_deposit:policy.minimumDeposit,deposit_bands:policy.depositBands,allow_full_payment:policy.allowFullPayment,balance_due_hours:policy.balanceDueHours,
      overdue:{reminder_days:policy.overdue.reminderDays,booking_hold_after_days:policy.overdue.bookingHoldAfterDays,final_review_after_days:policy.overdue.finalReviewAfterDays,consumer_monetary_late_fees:false,commercial_recovery_mode:'manual_review'},
      headline_allowance_active:policy.headlineAllowanceActive,headline_allowance_percent:policy.headlineAllowancePercent,headline_allowance_fixed:policy.headlineAllowanceFixed
    },updated_by:staff.user.id,updated_at:now}});
    const after=await currentRow();
    await auditLog(req,staff,{action:'payments.settings_update',entityType:'site_settings',entityId:'payments',summary:policy.active?`Updated online payment policy revision ${policy.revision} (${policy.mode})`:`Saved payment policy revision ${policy.revision}; online payments remain disabled`,before,after,metadata:{providerReady:provider.ready,stripeMode:provider.stripeMode,production:provider.production,revision:policy.revision,depositStrategy:policy.depositStrategy,depositBands:policy.depositBands.length,balanceDueHours:policy.balanceDueHours,bookingHoldAfterDays:policy.overdue.bookingHoldAfterDays,finalReviewAfterDays:policy.overdue.finalReviewAfterDays,consumerMonetaryLateFees:false,headlineAllowanceActive:policy.headlineAllowanceActive,headlineAllowancePercent:policy.headlineAllowancePercent,headlineAllowanceFixed:policy.headlineAllowanceFixed}});
    return json(res,200,view(after,provider,true));
  }catch(error){return safeError(res,error)}
};
