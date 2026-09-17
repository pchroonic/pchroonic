const {json,parseBody,db,requireStaff,auditLog,safeError}=require('../lib/server');

function normalizeReviewUrl(value=''){
  const raw=String(value||'').trim();
  if(!raw)return '';
  let url;
  try{url=new URL(raw)}catch{return null}
  if(url.protocol!=='https:')return null;
  const host=url.hostname.toLowerCase();
  const googleHost=host==='google.com'||host.endsWith('.google.com')||host==='g.page'||host==='goo.gl'||host.endsWith('.goo.gl');
  return googleHost?url.href:null;
}
function boundedDays(value,fallback=7){const n=Math.round(Number(value));return Number.isFinite(n)?Math.max(2,Math.min(30,n)):fallback}
async function currentRow(){return (await db('site_settings?key=eq.reviews&select=*&limit=1').catch(()=>[]))?.[0]||null}
function canEdit(staff){return staff?.profile?.role==='admin'||staff?.permissions?.all===true||staff?.permissions?.settings===true}
function payload(row,staff){
  const value=row?.value&&typeof row.value==='object'?row.value:{},url=String(value.public_review_url||'');
  return {ok:true,canEdit:canEdit(staff),publicReviewUrl:url,reviewRequestsEnabled:!!url&&value.review_requests_enabled!==false,remindersEnabled:!!url&&value.review_requests_enabled!==false&&value.review_reminders_enabled===true,reminderDelayDays:boundedDays(value.review_reminder_delay_days,7)};
}

module.exports=async function handler(req,res){
  try{
    if(req.method==='GET'){
      const staff=await requireStaff(req,'bookings');
      return json(res,200,payload(await currentRow(),staff));
    }
    if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
    const staff=await requireStaff(req,'settings'),body=parseBody(req),before=await currentRow(),previous=before?.value&&typeof before.value==='object'?before.value:{};
    const publicReviewUrl=normalizeReviewUrl(body.publicReviewUrl);
    if(publicReviewUrl===null)return json(res,400,{ok:false,error:'Use an official HTTPS Google review link.'});
    const reviewRequestsEnabled=body.reviewRequestsEnabled===undefined?(!!publicReviewUrl&&previous.review_requests_enabled!==false):body.reviewRequestsEnabled===true;
    if(reviewRequestsEnabled&&!publicReviewUrl)return json(res,400,{ok:false,error:'Add the official Google Business Profile review link before enabling public review requests.'});
    const remindersEnabled=reviewRequestsEnabled&&(body.remindersEnabled===undefined?previous.review_reminders_enabled===true:body.remindersEnabled===true);
    const reminderDelayDays=boundedDays(body.reminderDelayDays,previous.review_reminder_delay_days==null?7:boundedDays(previous.review_reminder_delay_days,7));
    const now=new Date().toISOString();
    await db('site_settings?on_conflict=key',{method:'POST',prefer:'resolution=merge-duplicates,return=representation',body:{
      key:'reviews',
      value:{...previous,public_review_url:publicReviewUrl,review_requests_enabled:reviewRequestsEnabled,review_reminders_enabled:remindersEnabled,review_reminder_delay_days:reminderDelayDays},
      updated_by:staff.user.id,updated_at:now
    }});
    const after=await currentRow();
    await auditLog(req,staff,{action:'reviews.settings_update',entityType:'site_settings',entityId:'reviews',summary:reviewRequestsEnabled?`Updated Google review requests${remindersEnabled?` with one reminder after ${reminderDelayDays} days`:''}`:'Disabled public Google review requests',before,after});
    return json(res,200,payload(after,staff));
  }catch(error){return safeError(res,error)}
};

module.exports.normalizeReviewUrl=normalizeReviewUrl;
module.exports.boundedDays=boundedDays;
