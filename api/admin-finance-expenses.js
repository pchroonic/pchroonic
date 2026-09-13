const {json,parseBody,db,requireStaff,auditLog,queryParam,safeError}=require('../lib/server');

const CATEGORIES=new Set(['materials','travel','parking','vehicle','office','phone_internet','software','advertising','insurance','professional_fees','training','uniform_ppe','premises','staff_subcontractors','equipment','bank_finance','other']);
const TAX_TREATMENTS=new Set(['allowable','capital_allowance','non_allowable']);
const METHODS=new Set(['cash','bank_transfer','card','direct_debit','other']);
const clean=(v,max=500)=>String(v||'').trim().slice(0,max);
const money=(v,max=1000000)=>{const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(0,Number(n.toFixed(2)))):0};
const pct=v=>{const n=Number(v);return Number.isFinite(n)?Math.min(100,Math.max(0,Number(n.toFixed(2)))):100};
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
  return{expense_date:expenseDate,category,description,supplier:clean(body.supplier??existing?.supplier,160)||null,amount,vat_amount:vat,business_use_percent:pct(body.businessUsePercent??body.business_use_percent??existing?.business_use_percent),tax_treatment:treatment,payment_method:method,booking_id:clean(body.bookingId||body.booking_id||existing?.booking_id,80)||null,reference:clean(body.reference??existing?.reference,160)||null,receipt_reference:clean(body.receiptReference||body.receipt_reference||existing?.receipt_reference,500)||null,notes:clean(body.notes??existing?.notes,1500)||null,source:existing?.source||'manual',updated_by:staff.user.id,updated_at:new Date().toISOString()};
}
async function getOne(id){return (await db(`business_expenses?id=eq.${encodeURIComponent(id)}&select=*&limit=1`).catch(()=>[]))?.[0]||null}
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
      const row={...normalize(body,staff),created_by:staff.user.id,created_at:new Date().toISOString()};
      const created=(await db('business_expenses',{method:'POST',prefer:'return=representation',body:row}))?.[0];
      await auditLog(req,staff,{action:'finance.expense_create',entityType:'business_expense',entityId:created?.id||null,summary:`Added ${row.category} expense`,after:{expense_date:row.expense_date,category:row.category,amount:row.amount,business_use_percent:row.business_use_percent,tax_treatment:row.tax_treatment},metadata:{description:row.description}});
      return json(res,201,{ok:true,expense:created});
    }
    const id=clean(body.id,80);if(!id)return json(res,400,{ok:false,error:'Expense ID is required.'});
    const before=await getOne(id);if(!before)return json(res,404,{ok:false,error:'Expense not found.'});
    if(req.method==='PATCH'){
      const row=normalize(body,staff,before);
      const updated=(await db(`business_expenses?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=representation',body:row}))?.[0];
      await auditLog(req,staff,{action:'finance.expense_update',entityType:'business_expense',entityId:id,summary:`Updated ${row.category} expense`,before:{expense_date:before.expense_date,category:before.category,amount:before.amount,business_use_percent:before.business_use_percent,tax_treatment:before.tax_treatment},after:{expense_date:row.expense_date,category:row.category,amount:row.amount,business_use_percent:row.business_use_percent,tax_treatment:row.tax_treatment}});
      return json(res,200,{ok:true,expense:updated});
    }
    if(req.method==='DELETE'){
      await db(`business_expenses?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',prefer:'return=minimal'});
      await auditLog(req,staff,{action:'finance.expense_delete',entityType:'business_expense',entityId:id,summary:'Deleted business expense',before:{expense_date:before.expense_date,category:before.category,amount:before.amount,business_use_percent:before.business_use_percent,tax_treatment:before.tax_treatment}});
      return json(res,200,{ok:true});
    }
    return json(res,405,{ok:false,error:'Method not allowed'});
  }catch(error){return safeError(res,error)}
};
