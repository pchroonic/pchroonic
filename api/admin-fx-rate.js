const {json,requireStaff,queryParam,safeError}=require('../lib/server');
const {referenceRate,convert}=require('../lib/fx-rates');

module.exports=async function handler(req,res){
  try{
    if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
    await requireStaff(req,'settings');
    const from=String(queryParam(req,'from','GBP')).trim().toUpperCase();
    const to=String(queryParam(req,'to','GBP')).trim().toUpperCase();
    const date=String(queryParam(req,'date','')).trim();
    const amount=Number(queryParam(req,'amount','0'));
    if(!Number.isFinite(amount)||amount<=0)return json(res,400,{ok:false,error:'Enter an amount greater than zero.'});
    const fx=await referenceRate({from,to,date});
    return json(res,200,{
      ok:true,from,to,amount,
      rate:fx.rate,
      requestedDate:fx.requestedDate,
      rateDate:fx.rateDate,
      provider:fx.provider,
      providerKey:fx.providerKey,
      convertedAmount:convert(amount,fx.rate)
    });
  }catch(e){return safeError(res,e)}
};
