const {json,parseBody,db,requireStaff,auditLog,safeError}=require('../lib/server');

const DEFAULTS={
  businessType:'sole_trader',
  accountingBasis:'cash',
  taxRegion:'england_wales_ni',
  soleTraderStartedOn:null,
  incorporationDate:null,
  otherTaxableIncome:0,
  taxReserved:0,
  vatRegistered:false,
  vatRegistrationDate:null
};
const money=(v,max=10000000)=>{const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(0,Number(n.toFixed(2)))):0};
const dateOrNull=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))?String(v):null;
function normalize(v={}){
  return{
    businessType:['sole_trader','limited_company'].includes(v.businessType||v.business_type)?(v.businessType||v.business_type):DEFAULTS.businessType,
    accountingBasis:['cash','traditional'].includes(v.accountingBasis||v.accounting_basis)?(v.accountingBasis||v.accounting_basis):DEFAULTS.accountingBasis,
    taxRegion:['england_wales_ni','scotland'].includes(v.taxRegion||v.tax_region)?(v.taxRegion||v.tax_region):DEFAULTS.taxRegion,
    soleTraderStartedOn:dateOrNull(v.soleTraderStartedOn||v.sole_trader_started_on),
    incorporationDate:dateOrNull(v.incorporationDate||v.incorporation_date),
    otherTaxableIncome:money(v.otherTaxableIncome??v.other_taxable_income),
    taxReserved:money(v.taxReserved??v.tax_reserved),
    vatRegistered:v.vatRegistered===true||v.vat_registered===true,
    vatRegistrationDate:dateOrNull(v.vatRegistrationDate||v.vat_registration_date)
  };
}
async function currentRow(){return (await db('site_settings?key=eq.finance_private&select=*&limit=1').catch(()=>[]))?.[0]||null}
function apiView(row,canEdit){return{ok:true,canEdit,settings:normalize({...DEFAULTS,...(row?.value||{})})}}
module.exports=async function handler(req,res){
  try{
    if(req.method==='GET'){
      const staff=await requireStaff(req,'analytics');
      const canEdit=staff?.profile?.role==='admin'||staff?.permissions?.all===true||staff?.permissions?.settings===true;
      return json(res,200,apiView(await currentRow(),canEdit));
    }
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const staff=await requireStaff(req,'settings'),body=parseBody(req),before=await currentRow(),settings=normalize(body);
    if(settings.businessType==='limited_company'&&!settings.incorporationDate)return json(res,400,{ok:false,error:'Set the incorporation date before switching the finance mode to limited company.'});
    const now=new Date().toISOString();
    const value={business_type:settings.businessType,accounting_basis:settings.accountingBasis,tax_region:settings.taxRegion,sole_trader_started_on:settings.soleTraderStartedOn,incorporation_date:settings.incorporationDate,other_taxable_income:settings.otherTaxableIncome,tax_reserved:settings.taxReserved,vat_registered:settings.vatRegistered,vat_registration_date:settings.vatRegistrationDate};
    await db('site_settings?on_conflict=key',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{key:'finance_private',value,updated_by:staff.user.id,updated_at:now}});
    const after=await currentRow();
    await auditLog(req,staff,{action:'finance.settings_update',entityType:'site_settings',entityId:'finance_private',summary:`Updated private finance settings (${settings.businessType}, ${settings.accountingBasis})`,before:{business_type:before?.value?.business_type||'sole_trader',accounting_basis:before?.value?.accounting_basis||'cash'},after:{business_type:value.business_type,accounting_basis:value.accounting_basis,incorporation_date:value.incorporation_date,vat_registered:value.vat_registered},metadata:{privateFinancialValuesRedacted:true}});
    return json(res,200,apiView(after,true));
  }catch(error){return safeError(res,error)}
};
