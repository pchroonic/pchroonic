const {json,db,requireStaff,queryParam,safeError}=require('../lib/server');
const {taxYearFor,taxYearBounds,estimateSoleTrader,mtdThresholds,rulesFor}=require('../lib/uk-tax');
const n=v=>Number(v||0),round=v=>Number(n(v).toFixed(2));
const DEFAULT_SETTINGS={business_type:'sole_trader',accounting_basis:'cash',tax_region:'england_wales_ni',sole_trader_started_on:null,incorporation_date:null,other_taxable_income:0,tax_reserved:0,vat_registered:false,vat_registration_date:null};
function inRange(v,start,end){if(!v)return false;const t=new Date(v).getTime();return Number.isFinite(t)&&t>=start.getTime()&&t<end.getTime()}
function effectiveExpense(x){return round(n(x.amount)*Math.max(0,Math.min(100,n(x.business_use_percent??100)))/100)}
function monthKey(value){const d=new Date(value);return Number.isFinite(d.getTime())?`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`:null}
function monthLabel(key){const [y,m]=key.split('-').map(Number);return new Date(Date.UTC(y,m-1,1)).toLocaleDateString('en-GB',{month:'short',year:'numeric',timeZone:'UTC'})}
function settingsFrom(row){return{...DEFAULT_SETTINGS,...(row?.value||{})}}
function taxDeadlines(taxYear){const startYear=Number(String(taxYear).slice(0,4)),dueYear=startYear+2;return{onlineReturnAndBalancingPayment:`${dueYear}-01-31`,secondPaymentOnAccount:`${dueYear}-07-31`}}
function isRealFinancePayment(row){return row?.method!=='stripe'||row?.provider_livemode===true}
module.exports=async function handler(req,res){
  try{
    const staff=await requireStaff(req,'analytics');
    if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
    const now=new Date(),requested=String(queryParam(req,'taxYear',taxYearFor(now))),taxYear=requested==='current'?taxYearFor(now):requested;
    const bounds=taxYearBounds(taxYear),rules=rulesFor(taxYear);
    const [settingsRows,payments,invoices,expenses,jobCosts]=await Promise.all([
      db('site_settings?key=eq.finance_private&select=key,value,updated_at&limit=1').catch(()=>[]),
      db('payment_records?select=id,booking_id,invoice_id,direction,payment_kind,method,amount,provider_fee,provider_fee_currency,provider_livemode,paid_at,created_at&order=paid_at.asc&limit=10000'),
      db('invoices?select=id,booking_id,total,amount_paid,status,issued_at,due_at,created_at&order=created_at.asc&limit=10000'),
      db('business_expenses?select=id,expense_date,category,description,supplier,amount,vat_amount,business_use_percent,tax_treatment,payment_method,booking_id,reference,receipt_reference,notes,source,created_at,updated_at&order=expense_date.asc,created_at.asc&limit=10000').catch(()=>[]),
      db('booking_job_costs?select=booking_id,consumables_cost,parking_cost,travel_cost,other_cost,updated_at&limit=10000').catch(()=>[])
    ]);
    const settings=settingsFrom(settingsRows?.[0]);
    const excludedSandboxStripeRows=(payments||[]).filter(x=>x.method==='stripe'&&x.provider_livemode!==true).length;
    const financePayments=(payments||[]).filter(isRealFinancePayment);
    const yearPayments=financePayments.filter(x=>inRange(x.paid_at||x.created_at,bounds.start,bounds.end));
    const grossReceipts=round(yearPayments.filter(x=>x.direction==='payment').reduce((a,x)=>a+n(x.amount),0));
    const refunds=round(yearPayments.filter(x=>x.direction==='refund').reduce((a,x)=>a+n(x.amount),0));
    const netReceipts=round(grossReceipts-refunds);
    let processorFees=0,processorFeePending=0,processorFeeNonGbp=0;
    for(const p of yearPayments.filter(x=>x.direction==='payment'&&x.method==='stripe')){
      if(p.provider_fee===null||p.provider_fee===undefined||!p.provider_fee_currency){processorFeePending++;continue}
      if(String(p.provider_fee_currency).toLowerCase()!=='gbp'){processorFeeNonGbp++;continue}
      processorFees+=n(p.provider_fee);
    }
    processorFees=round(processorFees);
    const yearExpenses=(expenses||[]).filter(x=>inRange(`${x.expense_date}T12:00:00Z`,bounds.start,bounds.end));
    let expenseCash=0,allowableExpenses=0,capitalAllowanceItems=0,nonAllowableExpenses=0;
    const byCategory=new Map();
    for(const x of yearExpenses){
      const effective=effectiveExpense(x);expenseCash+=effective;byCategory.set(x.category,round(n(byCategory.get(x.category))+effective));
      if(x.tax_treatment==='allowable')allowableExpenses+=effective;
      else if(x.tax_treatment==='capital_allowance')capitalAllowanceItems+=effective;
      else nonAllowableExpenses+=effective;
    }
    expenseCash=round(expenseCash);allowableExpenses=round(allowableExpenses);capitalAllowanceItems=round(capitalAllowanceItems);nonAllowableExpenses=round(nonAllowableExpenses);
    const estimatedTradingProfit=round(netReceipts-allowableExpenses-processorFees);
    const cashSurplus=round(netReceipts-expenseCash-processorFees);
    let taxEstimate=null,taxWarning=null;
    if(settings.business_type==='sole_trader'&&settings.accounting_basis==='cash'&&settings.tax_region==='england_wales_ni'){
      taxEstimate=estimateSoleTrader({taxYear,businessProfit:estimatedTradingProfit,otherTaxableIncome:n(settings.other_taxable_income),taxReserved:n(settings.tax_reserved)});
      taxEstimate.estimatedJanuaryCashNeed=round(taxEstimate.estimatedLiability+taxEstimate.potentialPaymentOnAccount);
      taxEstimate.otherIncomeEntered=n(settings.other_taxable_income)>0;
    }else if(settings.business_type==='limited_company')taxWarning='Limited-company Corporation Tax mode is intentionally not activated yet. Sole-trader history remains preserved; refresh tax rules when Namdar incorporates.';
    else if(settings.tax_region==='scotland')taxWarning='Scottish Income Tax bands are not included in this first estimator. Keep the dashboard for records, but use an accountant/HMRC calculation for tax.';
    else if(settings.accounting_basis!=='cash')taxWarning='Traditional-accounting tax adjustments are not included in this first estimator. The cash ledger remains visible but the taxable-profit estimate is withheld.';

    const outstanding=round((invoices||[]).filter(x=>['issued','part_paid'].includes(x.status)).reduce((a,x)=>a+Math.max(0,n(x.total)-n(x.amount_paid)),0));
    const invoicedThisTaxYear=round((invoices||[]).filter(x=>inRange(x.issued_at||x.created_at,bounds.start,bounds.end)&&!['draft','void'].includes(x.status)).reduce((a,x)=>a+n(x.total),0));
    const rollingStart=new Date(now.getTime()-365*864e5);
    const vatTurnover=round((invoices||[]).filter(x=>inRange(x.issued_at||x.created_at,rollingStart,new Date(now.getTime()+1000))&&!['draft','void','refunded'].includes(x.status)).reduce((a,x)=>a+n(x.total),0));
    const vatThreshold=rules.vatRegistrationThreshold,vatRemaining=round(Math.max(0,vatThreshold-vatTurnover));
    const vatPercent=round(vatThreshold?vatTurnover/vatThreshold*100:0);

    const bucketKeys=[];let cursor=new Date(Date.UTC(bounds.start.getUTCFullYear(),bounds.start.getUTCMonth(),1));
    for(let i=0;i<12;i++){bucketKeys.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth()+1).padStart(2,'0')}`);cursor=new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth()+1,1))}
    const monthly=Object.fromEntries(bucketKeys.map(k=>[k,{month:k,label:monthLabel(k),receipts:0,refunds:0,expenses:0,processorFees:0,net:0}]));
    for(const p of yearPayments){const k=monthKey(p.paid_at||p.created_at),b=monthly[k];if(!b)continue;if(p.direction==='payment')b.receipts+=n(p.amount);else b.refunds+=n(p.amount);if(p.direction==='payment'&&p.method==='stripe'&&String(p.provider_fee_currency||'').toLowerCase()==='gbp')b.processorFees+=n(p.provider_fee)}
    for(const x of yearExpenses){const k=String(x.expense_date||'').slice(0,7),b=monthly[k];if(b)b.expenses+=effectiveExpense(x)}
    const monthlyRows=bucketKeys.map(k=>{const b=monthly[k];b.receipts=round(b.receipts);b.refunds=round(b.refunds);b.expenses=round(b.expenses);b.processorFees=round(b.processorFees);b.net=round(b.receipts-b.refunds-b.expenses-b.processorFees);return b});

    const operationalJobCosts=round((jobCosts||[]).filter(x=>inRange(x.updated_at,bounds.start,bounds.end)).reduce((a,x)=>a+n(x.consumables_cost)+n(x.parking_cost)+n(x.travel_cost)+n(x.other_cost),0));
    const canEdit=staff?.profile?.role==='admin'||staff?.permissions?.all===true||staff?.permissions?.settings===true;
    return json(res,200,{ok:true,generatedAt:now.toISOString(),taxYear:{label:taxYear,start:bounds.start.toISOString(),end:bounds.end.toISOString(),deadlines:taxDeadlines(taxYear)},settings:{businessType:settings.business_type,accountingBasis:settings.accounting_basis,taxRegion:settings.tax_region,soleTraderStartedOn:settings.sole_trader_started_on,incorporationDate:settings.incorporation_date,otherTaxableIncome:n(settings.other_taxable_income),taxReserved:n(settings.tax_reserved),vatRegistered:settings.vat_registered===true,vatRegistrationDate:settings.vat_registration_date},canEdit,summary:{grossReceipts,refunds,netReceipts,invoicedThisTaxYear,outstandingInvoices:outstanding,recordedExpenseCash:expenseCash,allowableExpenses,capitalAllowanceItems,nonAllowableExpenses,processorFees,processorFeePending,processorFeeNonGbp,excludedSandboxStripeRows,estimatedTradingProfit,cashSurplus,expenseCount:yearExpenses.length,paymentCount:yearPayments.length,operationalJobCostsReference:operationalJobCosts},tax:{estimate:taxEstimate,warning:taxWarning,disclaimer:'Management estimate only, not an HMRC assessment. It excludes personal reliefs/adjustments not entered here, loss relief, student loans, pension adjustments, savings/dividend tax and combined-employment National Insurance interactions.'},vat:{rolling12MonthInvoiceTurnover:vatTurnover,threshold:vatThreshold,remaining:vatRemaining,percentOfThreshold:vatPercent,registered:settings.vat_registered===true,note:'Indicative rolling 12-month taxable-turnover monitor using non-draft, non-void, non-refunded Namdar invoices. Confirm VAT treatment with an accountant/HMRC before relying on it for registration.'},mtd:{currentCashBasisTurnover:netReceipts,thresholds:mtdThresholds(),note:'Current turnover is a record-keeping indicator only. MTD start dates depend on qualifying income reported on the relevant previous Self Assessment return.'},expenseCategories:[...byCategory.entries()].map(([category,amount])=>({category,amount})).sort((a,b)=>b.amount-a.amount),monthly:monthlyRows,recentExpenses:[...yearExpenses].sort((a,b)=>String(b.expense_date).localeCompare(String(a.expense_date))).slice(0,50)});
  }catch(error){return safeError(res,error)}
};
