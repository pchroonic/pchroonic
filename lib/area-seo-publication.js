'use strict';
const crypto=require('node:crypto');
const fields=['title','metaDescription','heading','intro','faqQuestion','faqAnswer'];
const areas=new Set(['lambeth','lewisham','southwark','wandsworth','greenwich']);
const sha256=s=>crypto.createHash('sha256').update(s).digest('hex');
function identity(area,draft){
 if(!areas.has(area)||draft?.status!=='approved_for_deployment')throw Error('Approved borough draft required');
 if(!draft.approvedAt||!draft.approvedBy||!draft.updatedAt)throw Error('Approval fields missing');
 const snapshot=Object.fromEntries(fields.map(k=>[k,String(draft[k]||'')]));
 if(!snapshot.title||!snapshot.metaDescription||!snapshot.heading||!snapshot.intro)throw Error('Incomplete approved content');
 return {area,draftRevision:draft.updatedAt,approvedAt:draft.approvedAt,approvedBy:draft.approvedBy,contentSha256:sha256(JSON.stringify(snapshot))};
}
function verified(manifest,html,area){
 return !!(manifest&&areas.has(area)&&manifest.area===area&&manifest.url==='https://namdar.co.uk/areas/'+area&&/^[a-f0-9]{64}$/.test(manifest.htmlSha256||'')&&sha256(html)===manifest.htmlSha256);
}
module.exports={identity,verified,sha256};
