const { json, parseBody, db, safeError } = require('../lib/server');

const VISITOR=/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[0-9a-f]{24,64})$/i;
const safe=(v,max)=>{const x=String(v||'').trim();return x?x.slice(0,max):null};
function visitorId(v=''){const x=String(v||'').trim();return x.length<=96&&VISITOR.test(x)?x:null}
function productionHost(req){const h=String(req.headers?.host||'').split(':')[0].toLowerCase();return h==='namdar.co.uk'||h==='www.namdar.co.uk'}

module.exports = async function handler(req,res){
  try{
    if(req.method!=='POST') return json(res,405,{ok:false,error:'Method not allowed'});
    if(!productionHost(req)) return json(res,202,{ok:true,recorded:false,reason:'non_production_host'});
    const b=parseBody(req);
    const path=safe(b.path||'/',300)||'/';
    const referrer=safe(b.referrer,300);
    const session=visitorId(b.sessionId||b.visitorId);
    const campaign=b.campaign&&typeof b.campaign==='object'?b.campaign:{};
    await db('page_views',{
      method:'POST',
      prefer:'return=minimal',
      body:{
        path,
        referrer_host:referrer||null,
        session_id:session,
        utm_source:safe(campaign.source,100),
        utm_medium:safe(campaign.medium,100),
        utm_campaign:safe(campaign.campaign,160)
      }
    });
    return json(res,201,{ok:true,recorded:true});
  }catch(e){return safeError(res,e)}
};
