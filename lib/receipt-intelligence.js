const CATEGORY_RULES=[
  ['parking',/\b(parking|ringgo|ringo|paybyphone|ncp|q[- ]?park|justpark|apcoa)\b/i],
  ['travel',/\b(petrol|diesel|fuel|shell|esso|texaco|bp\b|motor fuel|trainline|tfl|uber|bolt)\b/i],
  ['phone_internet',/\b(vodafone|o2\b|ee\b|three\b|broadband|internet|mobile phone|bt\b)\b/i],
  ['software',/\b(adobe|microsoft 365|office 365|google workspace|canva|dropbox|vercel|hosting|web hosting|cloud hosting|domain|software|saas|subscription)\b/i],
  ['advertising',/\b(google ads|meta ads|facebook ads|advertis|marketing|print.*flyer|flyer|leaflet)\b/i],
  ['insurance',/\b(insurance|aviva|axa|direct line|admiral|hiscox|simply business)\b/i],
  ['professional_fees',/\b(accountant|accounting|bookkeep|solicitor|legal fee|professional fee)\b/i],
  ['training',/\b(training|course|qualification|exam fee|certification)\b/i],
  ['uniform_ppe',/\b(ppe|workwear|hi[- ]?vis|safety boot|glove|goggle|uniform)\b/i],
  ['premises',/\b(rent|storage unit|self storage|workspace|premises)\b/i],
  ['bank_finance',/\b(bank fee|bank charge|finance charge|interest charge|merchant fee)\b/i],
  ['staff_subcontractors',/\b(subcontract|sub-contractor|labour|wages|payroll)\b/i],
  ['equipment',/\b(pressure washer|vacuum|ladder|drill|tool kit|machine|equipment|water fed pole|purifier|generator)\b/i],
  ['materials',/\b(screwfix|toolstation|wickes|b&q|homebase|selco|cleaning chemical|detergent|soap|cloth|microfibre|squeegee|sealant|consumable|materials?)\b/i],
  ['office',/\b(staples|stationery|printer|ink|paper|office supplies?)\b/i],
  ['vehicle',/\b(vehicle repair|garage|mot\b|tyre|car part|van part|service centre|autocentre)\b/i]
];
const MONTHS={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};
const money=n=>{const x=Number(String(n??'').replace(/[^0-9.-]/g,''));return Number.isFinite(x)?Number(x.toFixed(2)):null};
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
function merchantKey(value=''){return clean(value).toLowerCase().replace(/\b(ltd|limited|plc|llp|uk)\b/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim().slice(0,160)}
function validDate(y,m,d){const dt=new Date(Date.UTC(y,m-1,d));return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d}
function isoDate(y,m,d){if(y<100)y+=y>=70?1900:2000;if(!validDate(y,m,d))return null;return `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function extractDates(text){
  const out=[];let m;
  const ymd=/(20\d{2})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/g;
  while((m=ymd.exec(text)))out.push({value:isoDate(+m[1],+m[2],+m[3]),index:m.index,raw:m[0]});
  const dmy=/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/g;
  while((m=dmy.exec(text)))out.push({value:isoDate(+m[3],+m[2],+m[1]),index:m.index,raw:m[0]});
  const words=/(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(20\d{2}|\d{2})/gi;
  while((m=words.exec(text))){const mm=MONTHS[m[2].toLowerCase()];out.push({value:isoDate(+m[3],mm,+m[1]),index:m.index,raw:m[0]})}
  const wordsMonthFirst=/(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(20\d{2}|\d{2})/gi;
  while((m=wordsMonthFirst.exec(text))){const mm=MONTHS[m[1].toLowerCase()];out.push({value:isoDate(+m[3],mm,+m[2]),index:m.index,raw:m[0]})}
  return out.filter(x=>x.value);
}
function parseValue(line){
  const matches=[...String(line).matchAll(/(?:£|GBP\s*)?(-?\d{1,6}(?:[,.]\d{3})*[.,]\d{2})\b/gi)];
  if(!matches.length)return null;
  const raw=matches.at(-1)[1].replace(/,/g,'');
  return money(raw);
}
function supplierFrom(lines){
  for(const line of lines.slice(0,10)){
    const l=clean(line);if(l.length<2||l.length>80)continue;
    if(/^page\s+\d+\s+of\s+\d+$/i.test(l))continue;
    if(/^\d+$/.test(l)||/[£$€]\s*\d/.test(l))continue;
    if(/\b(receipt|invoice|tax invoice|vat receipt|order|date|time|tel|phone|www\.|http|thank you|welcome|subtotal|total|cash|card|visa|mastercard)\b/i.test(l))continue;
    if(/^\d{1,4}\s+\w+\s+(road|rd|street|st|lane|ln|avenue|ave|way|drive|dr)\b/i.test(l))continue;
    return l;
  }
  return '';
}
function categoryFor(text,amount){
  for(const [category,re] of CATEGORY_RULES)if(re.test(text))return{category,confidence:.78};
  if(amount&&amount>500&&/\b(machine|washer|vacuum|ladder|tool|equipment)\b/i.test(text))return{category:'equipment',confidence:.72};
  return{category:'other',confidence:.35};
}
function taxTreatmentFor(text,category){
  if(/\b(fine|penalty|parking charge notice|pcn|speeding)\b/i.test(text))return{value:'non_allowable',confidence:.95,warning:'Possible fine or penalty: normally review as non-allowable.'};
  if(category==='equipment'&&/\b(vehicle|car|van|capital asset|finance agreement)\b/i.test(text))return{value:'capital_allowance',confidence:.72,warning:'Possible capital item: review capital-allowance treatment before relying on the tax estimate.'};
  return{value:'allowable',confidence:.68,warning:category==='equipment'?'Review durable equipment/capital treatment if this is a long-life asset.':''};
}
function paymentMethodFor(text){
  if(/\b(contactless|visa|mastercard|amex|card payment|debit card|credit card)\b/i.test(text))return{value:'card',confidence:.9};
  if(/\b(cash|cash tendered|change due)\b/i.test(text))return{value:'cash',confidence:.85};
  if(/\b(direct debit)\b/i.test(text))return{value:'direct_debit',confidence:.9};
  if(/\b(bank transfer|faster payment|bacs)\b/i.test(text))return{value:'bank_transfer',confidence:.85};
  return{value:'other',confidence:.35};
}
function findLabeledAmount(lines,include,exclude=/\b(subtotal|change|tender|cash given|discount|saving)\b/i){
  const hits=[];
  lines.forEach((line,i)=>{if(include.test(line)&&!exclude.test(line)){const value=parseValue(line);if(value!==null)hits.push({value,line,i})}});
  return hits.length?hits.at(-1):null;
}
function extractReference(lines){
  for(const line of lines){
    const m=line.match(/\b(?:receipt|invoice|order|transaction|txn|ref(?:erence)?)\s*(?:no\.?|number|#|:)?\s*([A-Z0-9][A-Z0-9\-\/ ]{3,40})\b/i);
    if(m)return m[1].trim().replace(/\s+/g,'-').replace(/-+$/,'');
  }
  return '';
}
function detectCurrency(text=''){
  const explicit=String(text).match(/\b(GBP|USD|EUR|CAD|AUD|NZD)\b/i);
  if(explicit)return explicit[1].toUpperCase();
  if(/£/.test(text))return 'GBP';
  if(/€/.test(text))return 'EUR';
  if(/\$\s*\d/.test(text))return 'USD';
  return 'GBP';
}
function extractReceipt(text='',rule=null){
  const normalized=String(text||'').replace(/\r/g,'\n').replace(/[\t ]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
  const lines=normalized.split(/\n+/).map(clean).filter(Boolean);
  const supplier=supplierFrom(lines),key=merchantKey(supplier),dates=extractDates(normalized);
  const dateHit=dates[0]||null;
  let total=findLabeledAmount(lines,/\b(grand total|amount due|amount paid|total due|total)\b/i);
  if(!total){const vals=lines.map((line,i)=>({value:parseValue(line),line,i})).filter(x=>x.value!==null&&x.value>=0);if(vals.length)total=vals.sort((a,b)=>b.value-a.value)[0]}
  const vat=findLabeledAmount(lines,/\b(vat|tax|standard rate)\b/i,/\b(vat no|vat number|subtotal|total)\b/i);
  const currency=detectCurrency(normalized),foreignCurrency=currency!=='GBP';
  const originalAmount=total?.value??null,originalVatAmount=vat?.value??0;
  const baseCategory=categoryFor(normalized,originalAmount),tax=taxTreatmentFor(normalized,baseCategory.category),method=paymentMethodFor(normalized);
  const learned=rule&&rule.merchant_key===key;
  const category=learned&&rule.category?rule.category:baseCategory.category;
  const taxTreatment=learned&&rule.tax_treatment?rule.tax_treatment:tax.value;
  const businessUsePercent=learned&&Number.isFinite(Number(rule.business_use_percent))?Number(rule.business_use_percent):100;
  const paymentMethod=learned&&rule.payment_method?rule.payment_method:method.value;
  const warnings=[];
  if(!supplier)warnings.push('Supplier could not be read confidently.');
  if(!dateHit)warnings.push('Receipt date could not be read confidently.');
  if(!total)warnings.push('Receipt total could not be read confidently.');
  if(foreignCurrency)warnings.push(`Foreign-currency receipt (${currency}): enter the actual GBP amount charged by your card or bank. Namdar will not convert it automatically.`);
  if(['phone_internet','vehicle','travel'].includes(category))warnings.push('Confirm the business-use percentage if this cost has any personal use.');
  if(tax.warning)warnings.push(tax.warning);
  const confidence={supplier:supplier?.length?0.72:0.1,date:dateHit?0.86:0.1,amount:foreignCurrency?0.5:(originalAmount!==null?(/total|amount/i.test(total.line)?0.93:0.62):0.1),vat:vat?0.82:0.4,category:learned?0.98:baseCategory.confidence,paymentMethod:learned?0.98:method.confidence};
  const core=[confidence.supplier,confidence.date,confidence.amount,confidence.category];
  const overall=Number((core.reduce((a,b)=>a+b,0)/core.length).toFixed(4));
  return{
    supplier:supplier||'',merchantKey:key,expenseDate:dateHit?.value||'',currency,originalAmount,originalVatAmount,
    amount:foreignCurrency?null:originalAmount,vatAmount:foreignCurrency?null:originalVatAmount,
    reference:extractReference(lines),paymentMethod,category,taxTreatment,businessUsePercent,
    description:supplier?`${supplier} receipt`:'Receipt expense',confidence,overallConfidence:overall,
    learnedRuleApplied:Boolean(learned),warnings,ocrPreview:normalized.slice(0,1200)
  };
}
module.exports={extractReceipt,merchantKey};
