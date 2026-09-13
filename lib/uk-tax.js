'use strict';

const MONEY=v=>Number(Number(v||0).toFixed(2));

const TAX_RULES={
  '2026-27':{
    personalAllowance:12570,
    allowanceTaperStarts:100000,
    allowanceZeroAt:125140,
    basicRateBand:37700,
    higherRateUpper:125140,
    basicRate:0.20,
    higherRate:0.40,
    additionalRate:0.45,
    class4Lower:12570,
    class4Upper:50270,
    class4MainRate:0.06,
    class4AdditionalRate:0.02,
    class2SmallProfitsThreshold:7105,
    class2VoluntaryWeekly:3.65,
    vatRegistrationThreshold:90000
  }
};

function taxYearFor(value=new Date()){
  const d=value instanceof Date?value:new Date(value);
  if(!Number.isFinite(d.getTime()))throw new Error('Invalid date');
  const y=d.getUTCFullYear();
  const start=Date.UTC(y,3,6);
  const startYear=d.getTime()>=start?y:y-1;
  return `${startYear}-${String(startYear+1).slice(-2)}`;
}

function taxYearBounds(label){
  const m=String(label||'').match(/^(\d{4})-(\d{2})$/);
  if(!m)throw new Error('Invalid tax year');
  const startYear=Number(m[1]);
  return{
    start:new Date(Date.UTC(startYear,3,6,0,0,0,0)),
    end:new Date(Date.UTC(startYear+1,3,6,0,0,0,0))
  };
}

function rulesFor(label){
  const rules=TAX_RULES[label];
  if(!rules)throw new Error(`Tax rules unavailable for ${label}`);
  return rules;
}

function personalAllowance(totalIncome,rules){
  const income=Math.max(0,Number(totalIncome||0));
  if(income<=rules.allowanceTaperStarts)return rules.personalAllowance;
  if(income>=rules.allowanceZeroAt)return 0;
  return Math.max(0,rules.personalAllowance-Math.floor((income-rules.allowanceTaperStarts)/2));
}

function incomeTaxEnglandWalesNI(totalIncome,rules){
  const income=Math.max(0,Number(totalIncome||0));
  const allowance=personalAllowance(income,rules);
  const taxable=Math.max(0,income-allowance);
  const basic=Math.min(taxable,rules.basicRateBand);
  const higher=Math.min(Math.max(0,taxable-rules.basicRateBand),rules.higherRateUpper-rules.basicRateBand);
  const additional=Math.max(0,taxable-rules.higherRateUpper);
  return MONEY(basic*rules.basicRate+higher*rules.higherRate+additional*rules.additionalRate);
}

function class4NI(profit,rules){
  const p=Math.max(0,Number(profit||0));
  const main=Math.min(Math.max(0,p-rules.class4Lower),rules.class4Upper-rules.class4Lower);
  const additional=Math.max(0,p-rules.class4Upper);
  return MONEY(main*rules.class4MainRate+additional*rules.class4AdditionalRate);
}

function estimateSoleTrader({taxYear,businessProfit=0,otherTaxableIncome=0,taxReserved=0}={}){
  const year=taxYear||taxYearFor(new Date());
  const rules=rulesFor(year);
  const tradingProfit=MONEY(Number(businessProfit||0));
  const taxableBusinessProfit=Math.max(0,tradingProfit);
  const other=Math.max(0,Number(otherTaxableIncome||0));
  const taxWithoutBusiness=incomeTaxEnglandWalesNI(other,rules);
  const taxWithBusiness=incomeTaxEnglandWalesNI(other+taxableBusinessProfit,rules);
  const incomeTaxFromBusiness=MONEY(Math.max(0,taxWithBusiness-taxWithoutBusiness));
  const nationalInsurance=class4NI(taxableBusinessProfit,rules);
  const estimatedLiability=MONEY(incomeTaxFromBusiness+nationalInsurance);
  const reserved=Math.max(0,MONEY(taxReserved));
  const reserveGap=MONEY(Math.max(0,estimatedLiability-reserved));
  const paymentsOnAccountMayApply=estimatedLiability>=1000;
  const potentialPaymentOnAccount=MONEY(paymentsOnAccountMayApply?estimatedLiability/2:0);
  return{
    taxYear:year,
    assumptions:{region:'England/Wales/Northern Ireland',accountingBasis:'cash',otherTaxableIncome:MONEY(other)},
    tradingProfit,
    taxableBusinessProfit:MONEY(taxableBusinessProfit),
    lossNotModelled:tradingProfit<0,
    personalAllowance:MONEY(personalAllowance(other+taxableBusinessProfit,rules)),
    incomeTaxFromBusiness,
    class4NationalInsurance:nationalInsurance,
    estimatedLiability,
    taxReserved:MONEY(reserved),
    reserveGap,
    paymentsOnAccountMayApply,
    potentialPaymentOnAccount,
    vatRegistrationThreshold:rules.vatRegistrationThreshold,
    class2:{smallProfitsThreshold:rules.class2SmallProfitsThreshold,voluntaryWeeklyRate:rules.class2VoluntaryWeekly}
  };
}

function mtdThresholds(){
  return[
    {startDate:'2026-04-06',qualifyingIncomeOver:50000},
    {startDate:'2027-04-06',qualifyingIncomeOver:30000},
    {startDate:'2028-04-06',qualifyingIncomeOver:20000}
  ];
}

module.exports={TAX_RULES,taxYearFor,taxYearBounds,rulesFor,personalAllowance,incomeTaxEnglandWalesNI,class4NI,estimateSoleTrader,mtdThresholds};
