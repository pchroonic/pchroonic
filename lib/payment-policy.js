'use strict';

const DEFAULT_OVERDUE_POLICY=Object.freeze({
  reminderDays:[1,3,7,14],
  bookingHoldAfterDays:7,
  finalReviewAfterDays:21,
  consumerMonetaryLateFees:false,
  commercialRecoveryMode:'manual_review'
});
const DEFAULT_PAYMENT_POLICY=Object.freeze({
  revision:0,
  active:false,
  mode:'optional',
  depositStrategy:'flat',
  depositPercent:20,
  minimumDeposit:10,
  depositBands:[],
  allowFullPayment:true,
  balanceDueHours:0,
  overdue:DEFAULT_OVERDUE_POLICY,
  headlineAllowanceActive:false,
  headlineAllowancePercent:1.5,
  headlineAllowanceFixed:.20
});
const MODES=new Set(['optional','deposit_required','full_required']);
const DEPOSIT_STRATEGIES=new Set(['flat','tiered']);

function clamp(value,min,max,fallback){
  const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function intClamp(value,min,max,fallback){return Math.round(clamp(value,min,max,fallback))}
function bool(value,fallback=false){return value===undefined?fallback:value===true}
function normalizeReminderDays(value){
  const raw=Array.isArray(value)?value:String(value??'').split(',');
  const out=[...new Set(raw.map(v=>intClamp(v,1,90,NaN)).filter(Number.isFinite))].sort((a,b)=>a-b).slice(0,8);
  return out.length?out:[...DEFAULT_OVERDUE_POLICY.reminderDays];
}
function normalizeDepositBands(value){
  const rows=Array.isArray(value)?value:[];
  return rows.slice(0,12).map((row,index)=>{
    const minAmount=Number(Math.max(0,Number(row?.minAmount??row?.min_amount??0)||0).toFixed(2));
    const rawMax=row?.maxAmount??row?.max_amount;
    const maxAmount=rawMax===null||rawMax===undefined||rawMax===''?null:Number(Math.max(0,Number(rawMax)||0).toFixed(2));
    return{
      index,
      minAmount,
      maxAmount,
      percent:clamp(row?.percent,1,100,DEFAULT_PAYMENT_POLICY.depositPercent),
      minimumDeposit:clamp(row?.minimumDeposit??row?.minimum_deposit,.5,100000,DEFAULT_PAYMENT_POLICY.minimumDeposit)
    };
  }).sort((a,b)=>a.minAmount-b.minAmount).map(({index,...row})=>row);
}
function validateDepositBands(value){
  const bands=normalizeDepositBands(value),errors=[];
  if(!bands.length)return{ok:false,bands,errors:['Add at least one deposit band.']};
  if(Math.abs(bands[0].minAmount)>0.004)errors.push('The first deposit band must start at £0.');
  for(let i=0;i<bands.length;i++){
    const row=bands[i],next=bands[i+1];
    if(row.maxAmount!==null&&row.maxAmount<=row.minAmount)errors.push(`Band ${i+1} must end above its starting amount.`);
    if(i<bands.length-1){
      if(row.maxAmount===null)errors.push(`Only the final deposit band can have no upper limit.`);
      else if(Math.abs(row.maxAmount-next.minAmount)>.004)errors.push(`Bands ${i+1} and ${i+2} must meet without a gap or overlap.`);
      if(next.percent+1e-9<row.percent)errors.push('Deposit percentages cannot decrease as job value increases.');
      if(next.minimumDeposit+1e-9<row.minimumDeposit)errors.push('Minimum deposits cannot decrease as job value increases.');
    }else if(row.maxAmount!==null)errors.push('The final deposit band must have no upper limit.');
  }
  return{ok:errors.length===0,bands,errors};
}
function normalizePaymentPolicy(value={}){
  const mode=MODES.has(String(value?.mode||''))?String(value.mode):DEFAULT_PAYMENT_POLICY.mode;
  const depositStrategy=DEPOSIT_STRATEGIES.has(String(value?.depositStrategy??value?.deposit_strategy??''))?String(value.depositStrategy??value.deposit_strategy):DEFAULT_PAYMENT_POLICY.depositStrategy;
  const overdueValue=value?.overdue||{};
  const reminderInput=overdueValue.reminderDays??overdueValue.reminder_days??value?.overdueReminderDays??value?.overdue_reminder_days;
  return{
    revision:intClamp(value?.revision??value?.policy_revision,0,1000000,DEFAULT_PAYMENT_POLICY.revision),
    active:value?.active===true,
    mode,
    depositStrategy,
    depositPercent:clamp(value?.depositPercent??value?.deposit_percent,1,100,DEFAULT_PAYMENT_POLICY.depositPercent),
    minimumDeposit:clamp(value?.minimumDeposit??value?.minimum_deposit,.5,100000,DEFAULT_PAYMENT_POLICY.minimumDeposit),
    depositBands:normalizeDepositBands(value?.depositBands??value?.deposit_bands),
    allowFullPayment:value?.allowFullPayment===undefined&&value?.allow_full_payment===undefined?DEFAULT_PAYMENT_POLICY.allowFullPayment:(value?.allowFullPayment??value?.allow_full_payment)===true,
    balanceDueHours:intClamp(value?.balanceDueHours??value?.balance_due_hours,0,168,DEFAULT_PAYMENT_POLICY.balanceDueHours),
    overdue:{
      reminderDays:normalizeReminderDays(reminderInput),
      bookingHoldAfterDays:intClamp(overdueValue.bookingHoldAfterDays??overdueValue.booking_hold_after_days??value?.bookingHoldAfterDays??value?.booking_hold_after_days,0,90,DEFAULT_OVERDUE_POLICY.bookingHoldAfterDays),
      finalReviewAfterDays:intClamp(overdueValue.finalReviewAfterDays??overdueValue.final_review_after_days??value?.finalReviewAfterDays??value?.final_review_after_days,1,180,DEFAULT_OVERDUE_POLICY.finalReviewAfterDays),
      consumerMonetaryLateFees:false,
      commercialRecoveryMode:'manual_review'
    },
    headlineAllowanceActive:(value?.headlineAllowanceActive??value?.headline_allowance_active)===true,
    headlineAllowancePercent:clamp(value?.headlineAllowancePercent??value?.headline_allowance_percent,0,15,DEFAULT_PAYMENT_POLICY.headlineAllowancePercent),
    headlineAllowanceFixed:clamp(value?.headlineAllowanceFixed??value?.headline_allowance_fixed,0,25,DEFAULT_PAYMENT_POLICY.headlineAllowanceFixed)
  };
}
function validatePaymentPolicy(value={}){
  const policy=normalizePaymentPolicy(value),errors=[];
  if(policy.depositStrategy==='tiered'){
    const bandValidation=validateDepositBands(value?.depositBands??value?.deposit_bands);
    policy.depositBands=bandValidation.bands;
    errors.push(...bandValidation.errors);
  }
  if(policy.overdue.finalReviewAfterDays<policy.overdue.bookingHoldAfterDays)errors.push('Final recovery review cannot happen before the booking-hold stage.');
  return{ok:errors.length===0,policy,errors};
}
function providerReadiness(env){
  const stripeConfigured=Boolean(String(env('STRIPE_SECRET_KEY','')||'').trim());
  const webhookConfigured=Boolean(String(env('STRIPE_WEBHOOK_SECRET','')||'').trim());
  return{stripeConfigured,webhookConfigured,ready:stripeConfigured&&webhookConfigured};
}
async function loadPaymentPolicy({db,env}){
  let stored={};
  try{stored=((await db('site_settings?key=eq.payments&select=value&limit=1'))?.[0]?.value)||{}}catch{}
  const policy=normalizePaymentPolicy(stored),provider=providerReadiness(env);
  return{...policy,...provider,effectiveActive:policy.active&&provider.ready};
}
function resolveDepositRule(policyValue,total=0){
  const policy=normalizePaymentPolicy(policyValue),invoiceTotal=Math.max(0,Number(total)||0);
  let percent=policy.depositPercent,minimumDeposit=policy.minimumDeposit,bandMin=null,bandMax=null,strategy=policy.depositStrategy;
  if(strategy==='tiered'&&policy.depositBands.length){
    const band=policy.depositBands.find(row=>invoiceTotal+1e-9>=row.minAmount&&(row.maxAmount===null||invoiceTotal<row.maxAmount-1e-9))||policy.depositBands.at(-1);
    if(band){percent=band.percent;minimumDeposit=band.minimumDeposit;bandMin=band.minAmount;bandMax=band.maxAmount}
  }else strategy='flat';
  const amount=invoiceTotal<=0?0:Math.min(invoiceTotal,Math.max(minimumDeposit,invoiceTotal*percent/100));
  return{strategy,percent,minimumDeposit,bandMin,bandMax,amount:Number(amount.toFixed(2))};
}
function snapshotPaymentPolicy(policyValue,total=0){
  const policy=normalizePaymentPolicy(policyValue),deposit=resolveDepositRule(policy,total),invoiceTotal=Math.max(0,Number(total)||0);
  const initialPaymentAmount=!policy.active?0:policy.mode==='full_required'?invoiceTotal:deposit.amount;
  return{
    revision:policy.revision,
    active:policy.active,
    mode:policy.mode,
    depositStrategy:deposit.strategy,
    depositRule:{percent:deposit.percent,minimumDeposit:deposit.minimumDeposit,bandMin:deposit.bandMin,bandMax:deposit.bandMax},
    depositAmount:deposit.amount,
    initialPaymentRequired:policy.active&&policy.mode!=='optional',
    initialPaymentAmount:Number(initialPaymentAmount.toFixed(2)),
    allowFullPayment:policy.allowFullPayment,
    balanceDueHours:policy.balanceDueHours,
    overdue:{...policy.overdue,reminderDays:[...policy.overdue.reminderDays]},
    consumerMonetaryLateFees:false,
    commercialRecoveryMode:'manual_review'
  };
}
function paymentPolicyFromSnapshot(livePolicyValue,snapshot){
  const live=normalizePaymentPolicy(livePolicyValue);
  if(!snapshot||typeof snapshot!=='object')return{...live,mode:'optional',allowFullPayment:true,lockedDepositAmount:null,contractActive:false,legacyBooking:true,effectiveActive:live.effectiveActive===true};
  const active=snapshot.active===true;
  return{
    ...live,
    revision:intClamp(snapshot.revision,0,1000000,live.revision),
    mode:active&&MODES.has(String(snapshot.mode||''))?String(snapshot.mode):'optional',
    allowFullPayment:snapshot.allowFullPayment!==false,
    balanceDueHours:intClamp(snapshot.balanceDueHours,0,168,live.balanceDueHours),
    overdue:{...live.overdue,...(snapshot.overdue||{}),reminderDays:normalizeReminderDays(snapshot?.overdue?.reminderDays)},
    lockedDepositAmount:Number.isFinite(Number(snapshot.depositAmount))?Math.max(0,Number(snapshot.depositAmount)):null,
    contractActive:active,
    legacyBooking:false,
    effectiveActive:live.effectiveActive===true
  };
}
function paymentRequirementMet(policy,paymentStatus='unpaid',state={}){
  if(!policy?.effectiveActive||policy.mode==='optional')return true;
  const total=Math.max(0,Number(state.total)||0),net=Math.max(0,Number(state.net)||0);
  if(policy.mode==='full_required')return total>0?net>=total-.004:paymentStatus==='paid';
  const required=Number.isFinite(Number(policy.lockedDepositAmount))?Math.max(0,Number(policy.lockedDepositAmount)):Math.min(total||Infinity,Math.max(Number(policy.minimumDeposit||0),total*Number(policy.depositPercent||0)/100));
  if(Number.isFinite(required)&&required>0&&Number.isFinite(net))return net>=required-.004;
  return paymentStatus==='deposit_paid'||paymentStatus==='paid';
}
function checkoutPlan({policy,total=0,net=0,outstanding=0,preferFull=false,forceBalance=false}){
  const invoiceTotal=Math.max(0,Number(total)||0),paid=Math.max(0,Number(net)||0),due=Math.max(0,Number(outstanding)||0);
  if(!policy?.effectiveActive||due<.005)return null;
  if(forceBalance||paid>.004)return{kind:'balance',amount:Number(due.toFixed(2)),required:forceBalance||policy.mode!=='optional'};
  if(policy.mode==='full_required'||(preferFull&&policy.allowFullPayment))return{kind:'full',amount:Number(due.toFixed(2)),required:policy.mode==='full_required'};
  const percent=clamp(policy.depositPercent,1,100,DEFAULT_PAYMENT_POLICY.depositPercent);
  const minimum=clamp(policy.minimumDeposit,.5,100000,DEFAULT_PAYMENT_POLICY.minimumDeposit);
  const locked=Number(policy.lockedDepositAmount);
  const deposit=Number.isFinite(locked)&&locked>=0?Math.min(due,locked):Math.min(due,Math.max(minimum,invoiceTotal*percent/100));
  if(deposit>=due-.004)return{kind:'full',amount:Number(due.toFixed(2)),required:policy.mode==='deposit_required'};
  return{kind:'deposit',amount:Number(deposit.toFixed(2)),required:policy.mode==='deposit_required'};
}
function balanceDueAt(booking,snapshot){
  if(!snapshot?.active||!booking?.ends_at)return null;
  const end=new Date(booking.ends_at);if(!Number.isFinite(end.getTime()))return null;
  return new Date(end.getTime()+intClamp(snapshot.balanceDueHours,0,168,0)*3600000).toISOString();
}
function overdueStage({dueAt,snapshot,now=new Date()}){
  const due=new Date(dueAt);if(!Number.isFinite(due.getTime())||due>=now)return{overdue:false,daysOverdue:0,bookingHold:false,recoveryReview:false};
  const days=Math.floor((now.getTime()-due.getTime())/86400000),overdue=snapshot?.overdue||{};
  const hold=intClamp(overdue.bookingHoldAfterDays,0,90,DEFAULT_OVERDUE_POLICY.bookingHoldAfterDays),review=intClamp(overdue.finalReviewAfterDays,1,180,DEFAULT_OVERDUE_POLICY.finalReviewAfterDays);
  return{overdue:true,daysOverdue:days,bookingHold:days>=hold,recoveryReview:days>=review,bookingHoldAfterDays:hold,finalReviewAfterDays:review};
}
function commercialLatePaymentPreview({principal=0,daysLate=0,baseRatePercent=0}){
  const amount=Math.max(0,Number(principal)||0),days=Math.max(0,Math.floor(Number(daysLate)||0)),base=Math.max(0,Number(baseRatePercent)||0),annualRate=base+8;
  const interest=amount*(annualRate/100)*(days/365);
  const recoveryCost=amount<1000?40:amount<10000?70:100;
  return{principal:Number(amount.toFixed(2)),daysLate:days,baseRatePercent:base,statutoryMarginPercent:8,annualRatePercent:Number(annualRate.toFixed(4)),interest:Number(interest.toFixed(2)),recoveryCost,automatic:false,reviewRequired:true};
}
function headlinePriceWithAllowance(amount,policy={}){
  const base=Math.max(0,Number(amount)||0),p=normalizePaymentPolicy(policy);
  if(!p.headlineAllowanceActive||base<=0)return base;
  const rate=Math.min(.15,Math.max(0,p.headlineAllowancePercent/100)),fixed=Math.max(0,p.headlineAllowanceFixed);
  return Number(((base+fixed)/(1-rate)).toFixed(2));
}

module.exports={DEFAULT_OVERDUE_POLICY,DEFAULT_PAYMENT_POLICY,normalizePaymentPolicy,validatePaymentPolicy,normalizeDepositBands,validateDepositBands,normalizeReminderDays,providerReadiness,loadPaymentPolicy,resolveDepositRule,snapshotPaymentPolicy,paymentPolicyFromSnapshot,paymentRequirementMet,checkoutPlan,balanceDueAt,overdueStage,commercialLatePaymentPreview,headlinePriceWithAllowance};
