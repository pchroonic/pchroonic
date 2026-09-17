const {json,queryParam,db,publicReviewUrl,safeError}=require('../lib/server');

function cleanToken(value=''){const token=String(value||'').trim();return /^fb_[a-f0-9]{48}$/i.test(token)?token:''}

module.exports=async function handler(req,res){
  try{
    if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
    const token=cleanToken(queryParam(req,'token'));if(!token)return json(res,400,{ok:false,error:'This review link is invalid.'});
    const row=(await db(`booking_feedback?token=eq.${encodeURIComponent(token)}&select=id,booking_id,public_review_clicked_at&limit=1`))?.[0]||null;
    if(!row)return json(res,404,{ok:false,error:'This review link could not be found.'});
    const url=await publicReviewUrl();if(!url)return json(res,404,{ok:false,error:'Google review requests are not currently enabled.'});
    if(!row.public_review_clicked_at){const now=new Date().toISOString();await db(`booking_feedback?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{public_review_clicked_at:now,updated_at:now}})}
    res.statusCode=302;res.setHeader('Location',url);res.setHeader('Cache-Control','no-store');res.end();
  }catch(error){return safeError(res,error)}
};

module.exports.cleanToken=cleanToken;
