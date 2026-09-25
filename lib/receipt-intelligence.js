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
  return out.filter(x=>x.value).sort((a,b)=>a.index-b.index);
}
function labeledDate(text=''){
  const source=String(text||'');
  const month='(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
  const formats=[
    new RegExp('\\b(?:date of issue|invoice date|receipt date|transaction date|date paid)\\s*:?\\s*('+month+'\\s+\\d{1,2},?\\s+(?:20\\d{2}|\\d{2}))','i'),
    new RegExp('\\b(?:date of issue|invoice date|receipt date|transaction date|date paid)\\s*:?\\s*(\\d{1,2}\\s+'+month+'\\s+(?:20\\d{2}|\\d{2}))','i'),
    /\b(?:date of issue|invoice date|receipt date|transaction date|date paid)\s*:?\s*((?:20\d{2})[\/.\-]\d{1,2}[\/.\-]\d{1,2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i
  ];
  formats.unshift(
    new RegExp('\\binvoice\\s+date(?:\\s*\\/\\s*delivery\\s+date)?\\s*:?\\s*('+month+'\\s+\\d{1,2},?\\s+(?:20\\d{2}|\\d{2}))','i'),
    new RegExp('\\binvoice\\s+date(?:\\s*\\/\\s*delivery\\s+date)?\\s*:?\\s*(\\d{1,2}\\s+'+month+'\\s+(?:20\\d{2}|\\d{2}))','i')
  );
  for(const re of formats){const m=source.match(re);if(m){const d=extractDates(m[1])[0];if(d)return d}}
  return null;
}
function parseValue(line){
  const matches=[...String(line).matchAll(/(?:£|GBP\s*)?(-?\d{1,6}(?:[,.]\d{3})*[.,]\d{2})\b/gi)];
  if(!matches.length)return null;
  const raw=matches.at(-1)[1].replace(/,/g,'');
  return money(raw);
}
function legalEntitySupplier(text=''){
  const vercel=String(text).match(/\bVercel\s+Inc\.?\b/i);if(vercel)return 'Vercel Inc.';
  const m=String(text).match(/\b([A-Z][A-Za-z0-9&.'’()\- ]{1,55}\s(?:Ltd\.?|Limited|LLP|PLC|Inc\.?|LLC))\b/);
  return m?clean(m[1]):'';
}
function supplierFrom(lines,text=''){
  const source=String(text||'');
  const legal=legalEntitySupplier(source);
  if(legal)return legal;
  const soldBy=source.match(/\bsold\s+by[ \t]*:?\s*([^\n]{2,100})/i);
  if(soldBy){
    const candidate=clean(soldBy[1]).replace(/\s+(?:VAT\s*#|VAT\s+number|invoice\s+date|invoice\s*#|total\s+payable).*$/i,'').trim();
    if(candidate&&candidate.length<=100&&!/^(?:billing|delivery|address|invoice|paid)$/i.test(candidate))return candidate;
  }
  for(const line of lines.slice(0,14)){
    const l=clean(line);if(l.length<2||l.length>80)continue;
    if(/^page\s+\d+\s+of\s+\d+$/i.test(l))continue;
    if(/^\d+$/.test(l)||/[£$€]\s*\d/.test(l))continue;
    if(/\b(receipt|invoice|tax invoice|vat receipt|order|date|time|tel|phone|www\.|http|thank you|welcome|subtotal|total|cash|card|visa|mastercard|paid|payment reference|billing address|delivery address|sold by|order information|invoice details|description|qty|unit price|vat rate|item subtotal|shipping charges|incl\.? vat|excl\.? vat)\b/i.test(l))continue;
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
function specificTotal(text=''){
  const pats=[/\bamount\s+due\s*(?:[:\-]\s*)?(?:£|\$|€|GBP\s*|USD\s*|EUR\s*)?(-?\d{1,6}(?:[,.]\d{3})*[.,]\d{2})\b/i,/\bgrand\s+total\s*(?:[:\-]\s*)?(?:£|\$|€|GBP\s*|USD\s*|EUR\s*)?(-?\d{1,6}(?:[,.]\d{3})*[.,]\d{2})\b/i];
  for(const re of pats){const m=String(text).match(re);if(m)return{value:money(m[1]),line:m[0],i:-1}}return null;
}
function vatSummaryFromLines(lines=[]){
  for(let i=0;i<lines.length;i++){
    if(!/\bvat\s+rate\b/i.test(lines[i])||!/\bvat\s+subtotal\b/i.test(lines[i]))continue;
    for(let j=i+1;j<Math.min(lines.length,i+6);j++){
      const line=String(lines[j]);
      if(!/%/.test(line))continue;
      const values=[...line.matchAll(/(?:£|GBP\s*)?(-?\d{1,6}(?:[,.]\d{3})*[.,]\d{2})\b/gi)].map(m=>money(m[1]));
      if(values.length>=2&&values.at(-1)!==null)return{value:values.at(-1),line,i:j};
    }
  }
  return null;
}
function specificVat(text=''){
  const pats=[/\bstandard\s+rate\b[^\n]{0,120}?\([^)]*\)\s*(?:£|\$|€|GBP\s*|USD\s*|EUR\s*)?(-?\d{1,6}(?:[,.]\d{3})*[.,]\d{2})\b/i,/\b(?:vat|tax)\s+(?:amount|total)\s*(?:[:\-]\s*)?(?:£|\$|€|GBP\s*|USD\s*|EUR\s*)?(-?\d{1,6}(?:[,.]\d{3})*[.,]\d{2})\b/i];
  for(const re of pats){const m=String(text).match(re);if(m)return{value:money(m[1]),line:m[0],i:-1}}return null;
}
function findLabeledAmount(lines,include,exclude=/\b(subtotal|change|tender|cash given|discount|saving)\b/i){
  const hits=[];
  lines.forEach((line,i)=>{if(include.test(line)&&!exclude.test(line)){const value=parseValue(line);if(value!==null)hits.push({value,line,i})}});
  return hits.length?hits.at(-1):null;
}
function extractReference(lines){
  const text=lines.join(' ');
  const precise=[
    /\binvoice\s*(?:#|no\.?|number|id)\s*:?\s*#?\s*([A-Z0-9][A-Z0-9\-\/]{2,40}(?:\s+[0-9]{2,10})?)\b/i,
    /\breceipt\s*(?:#|no\.?|number|id)\s*:?\s*#?\s*([A-Z0-9][A-Z0-9\-\/]{2,40})\b/i,
    /\bpayment\s+reference\s+(?:id|#|no\.?|number)\s*:?\s*#?\s*([A-Z0-9][A-Z0-9\-\/]{2,60})\b/i,
    /\border\s*(?:#|no\.?|number|id)\s*:?\s*#?\s*([A-Z0-9][A-Z0-9\-\/]{2,40})\b/i,
    /\b(?:transaction|txn)\s*(?:#|no\.?|number|id)\s*:?\s*#?\s*([A-Z0-9][A-Z0-9\-\/]{2,40})\b/i
  ];
  for(const re of precise){
    const m=text.match(re);
    if(m){
      const v=m[1].trim().replace(/\s+/g,'-');
      if(!/^(?:date|details|total|information|paid)$/i.test(v))return v;
    }
  }
  return '';
}
function extractDescription(lines=[],supplier=''){
  const asinIndex=lines.findIndex(x=>/\b(?:ASIN|SKU)\s*:/i.test(x));
  if(asinIndex>0){
    const parts=[];
    for(let i=asinIndex-1;i>=0&&parts.length<4;i--){
      const line=clean(lines[i]);
      if(!line)continue;
      if(/\b(?:invoice details|description\s+qty|shipping charges|invoice total|order information|billing address|delivery address|sold by)\b/i.test(line))break;
      if(/^\(?(?:incl\.?|excl\.?)\s*VAT\)?$/i.test(line))continue;
      parts.unshift(line);
    }
    let value=clean(parts.join(' '));
    value=value.replace(/\s+\d+\s+(?:£|\$|€)\s*\d+(?:[.,]\d{2})\s+\d+(?:[.,]\d+)?%\s+(?:£|\$|€)\s*\d+(?:[.,]\d{2})\s+(?:£|\$|€)\s*\d+(?:[.,]\d{2})\s*$/i,'');
    value=value.replace(/\s+\d+\s+GBP\s*\d+(?:[.,]\d{2}).*$/i,'');
    if(value&&value.length>=4&&!/^(?:total|subtotal|paid)$/i.test(value))return value.slice(0,240);
  }
  return supplier?(supplier+' receipt'):'Receipt expense';
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
  const supplier=supplierFrom(lines,normalized),key=merchantKey(supplier),dates=extractDates(normalized);
  const dateHit=labeledDate(normalized)||dates[0]||null;
  let total=specificTotal(normalized)||findLabeledAmount(lines,/\b(grand total|amount due|amount paid|total due|total)\b/i);
  if(!total){const vals=lines.map((line,i)=>({value:parseValue(line),line,i})).filter(x=>x.value!==null&&x.value>=0);if(vals.length)total=vals.sort((a,b)=>b.value-a.value)[0]}
  const vat=specificVat(normalized)||vatSummaryFromLines(lines)||findLabeledAmount(lines,/\b(vat|tax|standard rate)\b/i,/\b(vat no|vat number|subtotal|total)\b/i);
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
  if(foreignCurrency)warnings.push(`Foreign-currency receipt (${currency}): Namdar can calculate a historical GBP reference amount automatically. Compare it with the actual GBP card or bank charge and override it if needed.`);
  if(/\bpaid\b/i.test(normalized)&&!/(?:date paid|payment date)\s*:?\s*(?:\d|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(normalized))warnings.push('Invoice is marked paid, but no payment date is stated. Confirm Date paid against the bank/card transaction if it differs from the invoice date.');
  if(['phone_internet','vehicle','travel'].includes(category))warnings.push('Confirm the business-use percentage if this cost has any personal use.');
  if(tax.warning)warnings.push(tax.warning);
  const confidence={supplier:supplier?.length?0.72:0.1,date:dateHit?0.86:0.1,amount:foreignCurrency?0.5:(originalAmount!==null?(/total|amount/i.test(total.line)?0.93:0.62):0.1),vat:vat?0.82:0.4,category:learned?0.98:baseCategory.confidence,paymentMethod:learned?0.98:method.confidence};
  const core=[confidence.supplier,confidence.date,confidence.amount,confidence.category];
  const overall=Number((core.reduce((a,b)=>a+b,0)/core.length).toFixed(4));
  return{
    supplier:supplier||'',merchantKey:key,expenseDate:dateHit?.value||'',currency,originalAmount,originalVatAmount,
    amount:foreignCurrency?null:originalAmount,vatAmount:foreignCurrency?null:originalVatAmount,
    reference:extractReference(lines),paymentMethod,category,taxTreatment,businessUsePercent,
    description:extractDescription(lines,supplier),confidence,overallConfidence:overall,
    learnedRuleApplied:Boolean(learned),warnings,ocrPreview:normalized.slice(0,1200)
  };
}
module.exports={extractReceipt,merchantKey};
