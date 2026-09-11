const { json, parseBody, db, safeError } = require('../lib/server');
module.exports = async function handler(req,res){
  try{
    if(req.method!=='POST') return json(res,405,{ok:false,error:'Method not allowed'});
    const b=parseBody(req);
    const path=String(b.path||'/').slice(0,300);
    const referrer=String(b.referrer||'').slice(0,300);
    await db('page_views',{method:'POST',prefer:'return=minimal',body:{path,referrer_host:referrer||null}});
    return json(res,201,{ok:true});
  }catch(e){return safeError(res,e)}
};
