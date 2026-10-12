#!/usr/bin/env node
'use strict';
// Offline publishing step: generate a reviewable Git diff from an approved draft export.
// Never accept browser-submitted content or publish directly to production.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const allowed=new Set(['lewisham','southwark','lambeth','wandsworth','greenwich']);
const escapeText=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function publish(html,draft){
 assert(allowed.has(draft.area),'Unsupported borough');
 assert(draft.status==='approved_for_deployment','Draft must be approved for deployment');
 assert(draft.approvedAt&&draft.approvedBy&&draft.updatedAt,'Missing approval audit fields');
 for(const [key,max] of [['title',100],['metaDescription',300],['heading',120],['intro',1200]]){
  assert(typeof draft[key]==='string'&&draft[key].trim()&&draft[key].length<=max,'Invalid '+key);
 }
 assert(Boolean(draft.faqQuestion)===Boolean(draft.faqAnswer),'FAQ pair incomplete');
 assert(!draft.faqQuestion||draft.faqQuestion.length<=200,'FAQ question too long');
 assert(!draft.faqAnswer||draft.faqAnswer.length<=1000,'FAQ answer too long');
 assert(!/<script|<iframe|javascript:/i.test(JSON.stringify(draft)),'Unsupported markup');
 const canonical='https://namdar.co.uk/areas/'+draft.area;
 assert(html.includes('<link rel="canonical" href="'+canonical+'">'),'Canonical does not match requested page');
 function once(re,replacement,label){
  let count=0;
  html=html.replace(re,(...args)=>{count++;return typeof replacement==='function'?replacement(...args):replacement;});
  assert.equal(count,1,'Expected one '+label+' replacement; got '+count);
 }
 once(/<title>[^<]*<\/title>/,'<title>'+escapeText(draft.title)+'</title>','title');
 once(/<meta name="description" content="[^"]*">/,'<meta name="description" content="'+escapeText(draft.metaDescription)+'">','description');
 once(/<h1>[^<]*<\/h1>/,'<h1>'+escapeText(draft.heading)+'</h1>','heading');
 const start='<!-- NAMDAR-AREA-CMS-START -->',end='<!-- NAMDAR-AREA-CMS-END -->';
 const section='<section class="section-pad section-light" id="area-editorial-guide"><div class="section-head"><div><div class="eyebrow">Local service guide</div><h2>About window cleaning in '+escapeText(draft.area[0].toUpperCase()+draft.area.slice(1))+'</h2></div></div><p>'+escapeText(draft.intro)+'</p>'+(draft.faqQuestion?'<details><summary>'+escapeText(draft.faqQuestion)+'</summary><p>'+escapeText(draft.faqAnswer)+'</p></details>':'')+'</section>';
 const block=start+section+end;
 if(html.includes(start)){
  const beginning=html.indexOf(start),ending=html.indexOf(end);
  assert(ending>beginning,'Malformed existing editor block');
  assert.equal(html.indexOf(start,beginning+start.length),-1,'Multiple editor blocks');
  html=html.slice(0,beginning)+block+html.slice(ending+end.length);
 }else{
  const anchor='<section class="section-pad conversion-faq-section">';
  assert(html.includes(anchor),'Expected FAQ anchor missing');
  html=html.replace(anchor,block+anchor);
 }
 return html;
}
if(require.main===module){
 const file=process.argv[2];
 if(!file||process.argv.length!==3){console.error('Usage: node scripts/apply-approved-area-seo.cjs approved-draft.json');process.exit(2);}
 const draft=JSON.parse(fs.readFileSync(file,'utf8'));
 const root=path.resolve(__dirname,'..');
 const target=path.join(root,'areas',String(draft.area||'')+'.html');
 assert(allowed.has(draft.area),'Unsupported area');
 const updated=publish(fs.readFileSync(target,'utf8'),draft);
 const crypto=require('node:crypto');
 const hash=content=>crypto.createHash('sha256').update(content).digest('hex');
 const manifestPath=path.join(root,'areas',draft.area+'.publication.json');
 const manifest={schemaVersion:1,area:draft.area,url:'https://namdar.co.uk/areas/'+draft.area,approvedAt:draft.approvedAt,approvedBy:draft.approvedBy,draftRevision:draft.updatedAt,htmlSha256:hash(updated),publishedBy:'reviewed-git-deployment',note:'Build artifact; deployment and live response must be verified independently.'};
 // A manifest is a claim bundled in the same commit, not evidence of completed deployment on its own.
 fs.writeFileSync(target,updated);
 fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 console.log('Updated '+path.relative(root,target)+'; review diff and CI before merging.');
}
module.exports={publish};
