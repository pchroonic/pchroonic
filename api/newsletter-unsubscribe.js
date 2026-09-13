const {json,db,safeError}=require('../lib/server');
module.exports=async function(req,res){
  try{
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const url=new URL(req.url,'https://namdar.co.uk'),token=String(url.searchParams.get('token')||'').trim().slice(0,160);
    if(!token||!token.startsWith('u_'))return json(res,400,{ok:false,error:'This unsubscribe link is invalid.'});
    const now=new Date().toISOString();
    await db(`newsletter_subscribers?unsubscribe_token=eq.${encodeURIComponent(token)}`,{method:'PATCH',prefer:'return=minimal',body:{status:'unsubscribed',unsubscribed_at:now,updated_at:now}});
    return json(res,200,{ok:true,message:'Your Namdar marketing preference has been updated.'});
  }catch(e){return safeError(res,e)}
};
