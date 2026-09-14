const {json,parseBody,db,requireCustomer,safeError}=require('../lib/server');

module.exports=async function handler(req,res){
  try{
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const {user}=await requireCustomer(req),body=parseBody(req),quoteId=String(body.quoteId||'').trim();
    if(!quoteId)return json(res,400,{ok:false,error:'Quote ID is required.'});
    const quote=(await db(`quotes?id=eq.${encodeURIComponent(quoteId)}&select=id,email,customer_id,service_key,status&limit=1`))?.[0];
    if(!quote)return json(res,404,{ok:false,error:'Quote not found.'});
    if(quote.customer_id===user.id)return json(res,200,{ok:true,quoteId:quote.id,claimed:false,alreadyOwned:true});
    if(quote.customer_id)return json(res,409,{ok:false,error:'This quote is already linked to another Namdar account.'});
    const accountEmail=String(user.email||'').trim().toLowerCase(),quoteEmail=String(quote.email||'').trim().toLowerCase();
    if(!accountEmail||accountEmail!==quoteEmail)return json(res,403,{ok:false,error:'Sign in with the same email address used for this quote.'});
    await db(`quotes?id=eq.${encodeURIComponent(quote.id)}&customer_id=is.null`,{method:'PATCH',prefer:'return=minimal',body:{customer_id:user.id,updated_at:new Date().toISOString()}});
    const targetPath=`/account?tab=quotes&quote=${quote.id}`;
    await db(`customer_messages?customer_id=is.null&recipient_email=eq.${encodeURIComponent(accountEmail)}&target_path=eq.${encodeURIComponent(targetPath)}`,{method:'PATCH',prefer:'return=minimal',body:{customer_id:user.id}}).catch(()=>null);
    return json(res,200,{ok:true,quoteId:quote.id,claimed:true,alreadyOwned:false});
  }catch(error){return safeError(res,error)}
};
