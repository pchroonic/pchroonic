'use strict';

const DEFAULT_PAYMENT_POLICY=Object.freeze({
  active:false,
  mode:'optional',
  depositPercent:20,
  minimumDeposit:10,
  allowFullPayment:true,
  headlineAllowanceActive:false,
  headlineAllowancePercent:1.5,
  headlineAllowanceFixed:.20
});
const MODES=new Set(['optional','deposit_required','full_required']);

function clamp(value,min,max,fallback){
  const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function normalizePaymentPolicy(value={}){
  const mode=MODES.has(String(value?.mode||''))?String(value.mode):DEFAULT_PAYMENT_POLICY.mode;
  return{
    active:value?.active===true,
    mode,
    depositPercent:clamp(value?.depositPercent??value?.deposit_percent,1,100,DEFAULT_PAYMENT_POLICY.depositPercent),
    minimumDeposit:clamp(value?.minimumDeposit??value?.minimum_deposit,.5,100000,DEFAULT_PAYMENT_POLICY.minimumDeposit),
    allowFullPayment:value?.allowFullPayment===undefined&&value?.allow_full_payment===undefined?DEFAULT_PAYMENT_POLICY.allowFullPayment:(value?.allowFullPayment??value?.allow_full_payment)===true,
    headlineAllowanceActive:(value?.headlineAllowanceActive??value?.headline_allowance_active)===true,
    headlineAllowancePercent:clamp(value?.headlineAllowancePercent??value?.headline_allowance_percent,0,15,DEFAULT_PAYMENT_POLICY.headlineAllowancePercent),
    headlineAllowanceFixed:clamp(value?.headlineAllowanceFixed??value?.headline_allowance_fixed,0,25,DEFAULT_PAYMENT_POLICY.headlineAllowanceFixed)
  };
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
function paymentRequirementMet(policy,paymentStatus='unpaid'){
  if(!policy?.effectiveActive||policy.mode==='optional')return true;
  if(policy.mode==='full_required')return paymentStatus==='paid';
  return paymentStatus==='deposit_paid'||paymentStatus==='paid';
}
function checkoutPlan({policy,total=0,net=0,outstanding=0,preferFull=false}){
  const invoiceTotal=Math.max(0,Number(total)||0),paid=Math.max(0,Number(net)||0),due=Math.max(0,Number(outstanding)||0);
  if(!policy?.effectiveActive||due<.005)return null;
  if(paid>.004)return{kind:'balance',amount:Number(due.toFixed(2)),required:policy.mode!=='optional'};
  if(policy.mode==='full_required'||(preferFull&&policy.allowFullPayment))return{kind:'full',amount:Number(due.toFixed(2)),required:policy.mode==='full_required'};
  const percent=clamp(policy.depositPercent,1,100,DEFAULT_PAYMENT_POLICY.depositPercent);
  const minimum=clamp(policy.minimumDeposit,.5,100000,DEFAULT_PAYMENT_POLICY.minimumDeposit);
  const deposit=Math.min(due,Math.max(minimum,invoiceTotal*percent/100));
  if(deposit>=due-.004)return{kind:'full',amount:Number(due.toFixed(2)),required:policy.mode==='deposit_required'};
  return{kind:'deposit',amount:Number(deposit.toFixed(2)),required:policy.mode==='deposit_required'};
}
function headlinePriceWithAllowance(amount,policy={}){
  const base=Math.max(0,Number(amount)||0),p=normalizePaymentPolicy(policy);
  if(!p.headlineAllowanceActive||base<=0)return base;
  const rate=Math.min(.15,Math.max(0,p.headlineAllowancePercent/100)),fixed=Math.max(0,p.headlineAllowanceFixed);
  return Number(((base+fixed)/(1-rate)).toFixed(2));
}

module.exports={DEFAULT_PAYMENT_POLICY,normalizePaymentPolicy,providerReadiness,loadPaymentPolicy,paymentRequirementMet,checkoutPlan,headlinePriceWithAllowance};
