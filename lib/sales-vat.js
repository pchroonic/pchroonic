'use strict';

const MONEY=v=>Number(Number(v||0).toFixed(2));
const DEFAULT_SALES_VAT_SETTINGS=Object.freeze({
  revision:0,
  vatRegistered:false,
  vatRegistrationDate:null,
  vatRegistrationNumber:'',
  vatRatePercent:20
});

function clamp(value,min,max,fallback){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function dateOrNull(value){
  const v=String(value||'').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v)?v:null;
}
function cleanVatNumber(value=''){
  return String(value||'').toUpperCase().replace(/\s+/g,' ').trim().slice(0,40);
}
function normalizeSalesVatSettings(value={}){
  return{
    revision:Math.max(0,Math.round(Number(value?.revision??value?.vat_policy_revision??DEFAULT_SALES_VAT_SETTINGS.revision)||0)),
    vatRegistered:(value?.vatRegistered??value?.vat_registered)===true,
    vatRegistrationDate:dateOrNull(value?.vatRegistrationDate??value?.vat_registration_date),
    vatRegistrationNumber:cleanVatNumber(value?.vatRegistrationNumber??value?.vat_registration_number),
    vatRatePercent:clamp(value?.vatRatePercent??value?.vat_rate_percent,0,100,DEFAULT_SALES_VAT_SETTINGS.vatRatePercent)
  };
}
function validateSalesVatSettings(value={}){
  const settings=normalizeSalesVatSettings(value),errors=[];
  if(settings.vatRegistered){
    if(!settings.vatRegistrationDate)errors.push('Enter the VAT registration date before enabling customer VAT.');
    if(!settings.vatRegistrationNumber)errors.push('Enter the VAT registration number before enabling customer VAT.');
    else if(!/^[A-Z0-9 .-]{4,40}$/.test(settings.vatRegistrationNumber))errors.push('Enter a valid VAT registration number.');
  }
  return{ok:errors.length===0,settings,errors};
}
function salesVatEffective(value={},at=new Date()){
  const settings=normalizeSalesVatSettings(value);
  if(!settings.vatRegistered||!settings.vatRegistrationDate||!settings.vatRegistrationNumber)return false;
  const when=at instanceof Date?at:new Date(at);
  if(!Number.isFinite(when.getTime()))return false;
  const effectiveAt=new Date(`${settings.vatRegistrationDate}T00:00:00.000Z`);
  return when.getTime()>=effectiveAt.getTime();
}
async function loadSalesVatSettings({db,at=new Date()}={}){
  let stored={};
  try{stored=((await db('site_settings?key=eq.finance_private&select=value&limit=1'))?.[0]?.value)||{}}catch{}
  const settings=normalizeSalesVatSettings(stored);
  return{...settings,effective:salesVatEffective(settings,at)};
}
function snapshotFromNet(amount,policy={},at=new Date()){
  const settings=normalizeSalesVatSettings(policy),netAmount=MONEY(Math.max(0,Number(amount)||0)),active=policy?.effective===true||salesVatEffective(settings,at);
  if(!active)return{active:false,revision:settings.revision,ratePercent:settings.vatRatePercent,registrationDate:settings.vatRegistrationDate,registrationNumber:settings.vatRegistrationNumber,netAmount,vatAmount:0,grossAmount:netAmount};
  const vatAmount=MONEY(netAmount*settings.vatRatePercent/100),grossAmount=MONEY(netAmount+vatAmount);
  return{active:true,revision:settings.revision,ratePercent:settings.vatRatePercent,registrationDate:settings.vatRegistrationDate,registrationNumber:settings.vatRegistrationNumber,netAmount,vatAmount,grossAmount};
}
function snapshotFromGross(amount,snapshot={}){
  const grossAmount=MONEY(Math.max(0,Number(amount)||0)),ratePercent=clamp(snapshot?.ratePercent??snapshot?.vatRatePercent??snapshot?.vat_rate_percent,0,100,DEFAULT_SALES_VAT_SETTINGS.vatRatePercent);
  if(snapshot?.active!==true)return{active:false,revision:Math.max(0,Math.round(Number(snapshot?.revision||0)||0)),ratePercent,registrationDate:dateOrNull(snapshot?.registrationDate??snapshot?.vatRegistrationDate),registrationNumber:cleanVatNumber(snapshot?.registrationNumber??snapshot?.vatRegistrationNumber),netAmount:grossAmount,vatAmount:0,grossAmount};
  const netAmount=MONEY(ratePercent<=0?grossAmount:grossAmount/(1+ratePercent/100)),vatAmount=MONEY(grossAmount-netAmount);
  return{active:true,revision:Math.max(0,Math.round(Number(snapshot?.revision||0)||0)),ratePercent,registrationDate:dateOrNull(snapshot?.registrationDate??snapshot?.vatRegistrationDate),registrationNumber:cleanVatNumber(snapshot?.registrationNumber??snapshot?.vatRegistrationNumber),netAmount,vatAmount,grossAmount};
}

module.exports={DEFAULT_SALES_VAT_SETTINGS,normalizeSalesVatSettings,validateSalesVatSettings,salesVatEffective,loadSalesVatSettings,snapshotFromNet,snapshotFromGross,cleanVatNumber};
