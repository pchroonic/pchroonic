'use strict';
const crypto=require('node:crypto');
const {identity}=require('./area-seo-publication');
const fields=['title','metaDescription','heading','intro','faqQuestion','faqAnswer'];
function validateExport(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||data.schemaVersion!==1||data.status!=='approved_for_deployment')throw Error('Expected approved SEO export');
 const allowed=new Set(['lambeth','lewisham','southwark','wandsworth','greenwich']);
 if(!allowed.has(data.area)||!data.updatedAt||!data.approvedAt||!data.approvedBy)throw Error('Incomplete approval identity');
 for(const field of fields)if(typeof data[field]!=='string')throw Error('Invalid '+field);
 if(!data.title||!data.metaDescription||!data.heading||!data.intro||Boolean(data.faqQuestion)!==Boolean(data.faqAnswer))throw Error('Incomplete approved content');
 const {fingerprint,...rest}=data;
 if(!/^[a-f0-9]{64}$/.test(fingerprint||''))throw Error('Missing valid export checksum');
 const expected=crypto.createHash('sha256').update(JSON.stringify(rest)).digest('hex');
 if(fingerprint!==expected)throw Error('Export checksum mismatch');
 const approval=identity(data.area,{...data,updatedAt:data.updatedAt});
 return {area:data.area,revision:data.updatedAt,contentSha256:approval.contentSha256};
}
module.exports={validateExport};
