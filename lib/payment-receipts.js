function receiptNumber(paymentOrId=''){
  const raw=typeof paymentOrId==='object'?paymentOrId?.id:paymentOrId;
  const compact=String(raw||'').replace(/[^a-f0-9]/gi,'').toUpperCase();
  if(compact.length<16)return compact?`RCP-${compact}`:'';
  return `RCP-${compact.slice(0,8)}-${compact.slice(8,16)}`;
}

function paymentReferenceSummary(payment={}){
  return{
    receiptNumber:receiptNumber(payment),
    customerReference:String(payment.reference||'').slice(0,240),
    providerReference:String(payment.provider_reference||'').slice(0,240),
    providerPaymentId:String(payment.provider_payment_id||'').slice(0,180)
  };
}

module.exports={receiptNumber,paymentReferenceSummary};
