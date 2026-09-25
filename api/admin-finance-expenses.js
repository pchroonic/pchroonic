const {json,parseBody,db,requireStaff,auditLog,queryParam,safeError}=require('../lib/server');
const {merchantKey}=require('../lib/receipt-intelligence');
const {referenceRate,convert}=require('../lib/fx-rates');

const CATEGORIES=new Set(['materials','travel','parking','vehicle','office','phone_internet','software','advertising','insurance','professional_fees','training','uniform_ppe','premises','staff_subcontractors','equipment','bank_finance','other']);
const TAX_TREATMENTS=new Set(['allowable','capital_allowance','non_allowable']);
const METHODS=new Set(['cash','bank_transfer','card','direct_debit','other']);
const FX_METHODS=new Set(['auto_reference','actual_override','manual']);
const clean=(v,max=500)=>String(v||'').trim().slice(0,max);
const money=(v,max=1000000)=>{const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(0,Number(n.toFixed(2)))):0};
const pct=v=>{const n=Number(v);return Number.isFinite(n)?Math.min(100,Math.max(0,Number(n.toFixed(2)))):100};
const fxNumber=(v,max=100000000)=>{const n=Number(v);return Number.isFinite(n)&&n>=0?Math.min(max,n):null};
const currency=v=>{const s=String(v||'').trim().toUpperCase();return /^[A-Z]{3}$/.test(s)?s:null};
function date(v){const s=String(v||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;const d=new Date(`${s}T00:00:00Z`);return Number.isFinite(d.getTime())?s:null}
function badRequest(message){return Object.assign(new Error(message),{status:400})}
function normalize(body,staff,existing=null){
  const category=CATEGORIES.has(body.category)?body.category:(existing?.category||'other');
  const treatment=TAX_TREATMENTS.has(body.taxTreatment||body.tax_treatment)?(body.taxTreatment||body.tax_treatment):(existing?.tax_treatment||'allowable');
  const method=METHODS.has(body.paymentMethod||body.payment_method)?(body.paymentMethod||body.payment_method):(existing?.payment_method||'other');
  const amount=money(body.amount??existing?.amount);
  const description=clean(body.description??existing?.description,240);
  const expenseDate=date(body.expenseDate||body.expense_date||existing?.expense_date);
  if(!expenseDate)throw badRequest('A valid expense date is required.');
  if(!description)throw badRequest('Expense description is required.');
  if(amount<=0)throw badRequest('Expense amount must be greater than £0.');
  const vat=Math.min(amount,money(body.vatAmount??body.vat_amount??existing?.vat_amount));
  const originalCurrency=currency(body.originalCurrency??body.original_currency??existing?.original_currency);
  const originalAmount=fxNumber(body.originalAmount??body.original_amount??existing?.original_amount);
  const originalVatAmount=fxNumber(body.originalVatAmount??body.original_vat_amount??existing?.original_vat_amount);
  const fxRate=fxNumber(body.fxRate??body.fx_rate??existing?.fx_rate,1000000);
  const fxRateDate=date(body.fxRateDate||body.fx_rate_date||existing?.fx_rate_date);
  const fxProvider=clean(body.fxProvider??body.fx_provider??existing?.fx_provider,160)||null;
  const fxReferenceGbp=fxNumber(body.fxReferenceGbp??body.fx_reference_gbp??existing?.fx_reference_gbp);
  const requestedFxMethod=FX_METHODS.has(body.fxMethod||body.fx_method)?(body.fxMethod||body.fx_method):null;
  let fxMethod=requestedFxMethod||(existing?.fx_method||null);
  if(originalCurrency&&originalCurrency!=='GBP'&&originalAmount!==null){
    if(requestedFxMethod==='actual_override')fxMethod='actual_override';
    else if(fxRate&&fxReferenceGbp!==null)fxMethod=Math.abs(amount-fxReferenceGbp)>0.01?'actual_override':'auto_reference';
    else if(!fxMethod)fxMethod='manual';
  }else fxMethod=null;
  return{expense_date:expenseDate,category,description,supplier:clean(body.supplier??existing?.supplier,160)||null,amount,vat_amount:vat,business_use_percent:pct(body.businessUsePercent??body.business_use_percent??existing?.business_use_percent),tax_treatment:treatment,payment_method:method,booking_id:clean(body.bookingId||body.booking_id||existing?.booking_id,80)||null,reference:clean(body.reference??existing?.reference,160)||null,receipt_reference:clean(body.receiptReference||body.receipt_reference||existing?.receipt_reference,500)||null,notes:clean(body.notes??existing?.notes,1500)||null,source:existing?.source||'manual',original_currency:originalCurrency,original_amount:originalAmount,original_vat_amount:originalVatAmount,fx_rate:fxRate,fx_rate_date:fxRateDate,fx_provider:fxProvider,fx_reference_gbp:fxReferenceGbp,fx_method:fxMethod,updated_by:staff.user.id,updated_at:new Date().toISOString()};
}
async function verifyAuthoritativeFx(row){
  if(!row.original_currency||row.original_currency==='GBP'||row.original_amount===null){
    row.fx_rate=null;row.fx_rate_date=null;row.fx_provider=null;row.fx_reference_gbp=null;row.fx_method=null;
    return row;
  }
  const clientMethod=row.fx_method;
  try{
    const fx=await referenceRate({from:row.original_currency,to:'GBP',date:row.expense_date});
    const reference=convert(row.original_amount,fx.rate);
    row.fx_rate=fx.rate;
    row.fx_rate_date=fx.rateDate;
    row.fx_provider=fx.provider;
    row.fx_reference_gbp=reference;
    if(clientMethod==='auto_reference'){
      row.amount=reference;
      if(row.original_vat_amount!==null){const verifiedVat=convert(row.original_vat_amount,fx.rate);if(verifiedVat!==null)row.vat_amount=Math.min(reference,verifiedVat)}
      row.fx_method='auto_reference';
    }else row.fx_method='actual_override';
    return row;
  }catch(error){
    row.fx_rate=null;row.fx_rate_date=null;row.fx_provider=null;row.fx_reference_gbp=null;
    if(clientMethod==='auto_reference')throw Object.assign(new Error('Could not verify the ECB exchange rate before saving. Retry shortly, or enter the actual GBP amount charged by your bank/card.'),{status:503,cause:error});
    row.fx_method='manual';
    return row;
  }
}
async function getOne(id){return (await db(`business_expenses?id=eq.${encodeURIComponent(id)}&select=*&limit=1`).catch(()=>[]))?.[0]||null}
async function getReceipt(id){return (await db(`business_expense_receipts?id=eq.${encodeURIComponent(id)}&select=*&limit=1`).catch(()=>[]))?.[0]||null}
async function learnMerchant(expense,staff){
  const key=merchantKey(expense?.supplier||'');if(!key)return;
  const now=new Date().toISOString(),existing=(await db(`business_expense_merchant_rules?merchant_key=eq.${encodeURIComponent(key)}&select=*&limit=1`).catch(()=>[]))?.[0]||null;
  const payload={merchant_key:key,merchant_name:expense.supplier||null,category:expense.category,tax_treatment:expense.tax_treatment,business_use_percent:expense.business_use_percent,payment_method:expense.payment_method,use_count:Number(existing?.use_count||0)+1,last_used_at:now,updated_by:staff.user.id,updated_at:now};
  if(existing?.id)await db(`business_expense_merchant_rules?id=eq.${encodeURIComponent(existing.id)}`,{method:'PATCH',prefer:'return=minimal',body:payload});
  else await db('business_expense_merchant_rules',{method:'POST',prefer:'return=minimal',body:{...payload,created_by:staff.user.id,created_at:now}});
}
module.exports=async function handler(req,res){
  try{
    if(req.method==='GET'){
      const staff=await requireStaff(req,'analytics'),limit=Math.min(500,Math.max(1,Number(queryParam(req,'limit','200'))||200));
      const rows=await db(`business_expenses?select=*&order=expense_date.desc,created_at.desc&limit=${limit}`);
      const canEdit=staff?.profile?.role==='admin'||staff?.permissions?.all===true||staff?.permissions?.settings===true;
      return json(res,200,{ok:true,canEdit,expenses:rows||[],categories:[...CATEGORIES],taxTreatments:[...TAX_TREATMENTS],paymentMethods:[...METHODS]});
    }
    const staff=await requireStaff(req,'settings'),body=parseBody(req);
    if(req.method==='POST'){
      const receiptId=clean(body.receiptId,80),receipt=receiptId?await getReceipt(receiptId):null;
      if(receiptId&&!receipt)return json(res,404,{ok:false,error:'Receipt draft not found.'});
      if(receipt?.expense_id)return json(res,409,{ok:false,error:'This receipt is already attached to another expense.'});
      if(receipt&&receipt.status!=='review')return json(res,409,{ok:false,error:'Read and review the receipt before saving the expense.'});
      const row={...(await verifyAuthoritativeFx(normalize(body,staff))),created_by:staff.user.id,created_at:new Date().toISOString()};
      if(receipt){row.receipt_reference=receipt.id;row.source='receipt'}
      const created=(await db('business_expenses',{method:'POST',prefer:'return=representation',body:row}))?.[0];
      if(receipt&&created?.id){
        await db(`business_expense_receipts?id=eq.${encodeURIComponent(receipt.id)}`,{method:'PATCH',prefer:'return=minimal',body:{expense_id:created.id,status:'attached',updated_by:staff.user.id,updated_at:new Date().toISOString()}});
        await learnMerchant(created,staff);
      }
      await auditLog(req,staff,{action:'finance.expense_create',entityType:'business_expense',entityId:created?.id||null,summary:`Added ${row.category} expense`,after:{expense_date:row.expense_date,category:row.category,amount:row.amount,business_use_percent:row.business_use_percent,tax_treatment:row.tax_treatment},metadata:{description:row.description,receiptAttached:Boolean(receipt)}});
      return json(res,201,{ok:true,expense:created,receiptAttached:Boolean(receipt)});
    }
    const id=clean(body.id,80);if(!id)return json(res,400,{ok:false,error:'Expense ID is required.'});
    const before=await getOne(id);if(!before)return json(res,404,{ok:false,error:'Expense not found.'});
    if(req.method==='PATCH'){
      const row=await verifyAuthoritativeFx(normalize(body,staff,before));
      const updated=(await db(`business_expenses?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=representation',body:row}))?.[0];
      if(updated?.source==='receipt'||updated?.receipt_reference)await learnMerchant(updated,staff);
      await auditLog(req,staff,{action:'finance.expense_update',entityType:'business_expense',entityId:id,summary:`Updated ${row.category} expense`,before:{expense_date:before.expense_date,category:before.category,amount:before.amount,business_use_percent:before.business_use_percent,tax_treatment:before.tax_treatment},after:{expense_date:row.expense_date,category:row.category,amount:row.amount,business_use_percent:row.business_use_percent,tax_treatment:row.tax_treatment}});
      return json(res,200,{ok:true,expense:updated});
    }
    if(req.method==='DELETE'){
      await db(`business_expense_receipts?expense_id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=minimal',body:{expense_id:null,status:'review',updated_by:staff.user.id,updated_at:new Date().toISOString()}}).catch(()=>null);
      await db(`business_expenses?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',prefer:'return=minimal'});
      await auditLog(req,staff,{action:'finance.expense_delete',entityType:'business_expense',entityId:id,summary:'Deleted business expense',before:{expense_date:before.expense_date,category:before.category,amount:before.amount,business_use_percent:before.business_use_percent,tax_treatment:before.tax_treatment}});
      return json(res,200,{ok:true});
    }
    return json(res,405,{ok:false,error:'Method not allowed'});
  }catch(error){return safeError(res,error)}
};
