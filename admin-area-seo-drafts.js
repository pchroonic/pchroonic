(()=>{
'use strict';
const areas=['lewisham','southwark','lambeth','wandsworth','greenwich'];
const location=document.getElementById('areaSeoLocation');
if(!location)return;
const title=document.getElementById('areaSeoTitle'),desc=document.getElementById('areaSeoDescription');
const status=document.getElementById('areaSeoDraftStatus'),count=document.getElementById('areaSeoLength');
const heading=document.getElementById('areaSeoHeading'),intro=document.getElementById('areaSeoIntro'),faqQuestion=document.getElementById('areaSeoFaqQuestion'),faqAnswer=document.getElementById('areaSeoFaqAnswer');
const copyFields=[heading,intro,faqQuestion,faqAnswer];
let dirty=false,loading=false,loadedArea=location.value;
const savedState=document.getElementById('areaSeoSavedState');
const workflowState=document.getElementById('areaSeoWorkflowState');
const requestReview=document.getElementById('areaSeoRequestReview');
const approveButton=document.getElementById('areaSeoApprove');
let storedDraft=null,storedVersion=null,revisions=[];
const revisionSelect=document.getElementById('areaSeoRevisionSelect'),revisionComparison=document.getElementById('areaSeoRevisionComparison');
const revisionFields={title,metaDescription:desc,heading,intro,faqQuestion,faqAnswer};
function currentFields(){return Object.fromEntries(Object.entries(revisionFields).map(([key,node])=>[key,node.value]));}
function chosenRevision(){return revisionSelect.value===''?null:revisions[Number(revisionSelect.value)]||null;}
function showHistory(all,slug){revisions=(Array.isArray(all)?all:[]).filter(x=>x?.area===slug&&x.snapshot).slice(-20).reverse();revisionSelect.replaceChildren(new Option('Select an older saved version',''));revisions.forEach((r,i)=>revisionSelect.add(new Option((r.timestamp||'Unknown date')+' · '+(r.previousStatus||'draft'),String(i))));revisionComparison.textContent='';}

function markClean(message){dirty=false;loadedArea=location.value;savedState.textContent=message;}
function markDirty(){workflowState.textContent='Editing — not submitted for review';dirty=true;savedState.textContent='Unsaved changes — save before leaving this area';render();}
const defaults=slug=>({title:'Window Cleaning in '+slug[0].toUpperCase()+slug.slice(1)+' | Namdar',description:'Exterior window cleaning for homes, flats and commercial properties in '+slug[0].toUpperCase()+slug.slice(1)+'. Check your postcode and request a reviewed quote.'});
function render(){
 const slug=location.value;
 document.getElementById('areaSeoPreviewTitle').textContent=title.value||'Untitled area page';
 document.getElementById('areaSeoPreviewUrl').textContent='https://namdar.co.uk/areas/'+slug;
 document.getElementById('areaSeoPreviewDescription').textContent=desc.value;
 const t=title.value.length,d=desc.value.length;
 count.textContent='Title: '+t+'/100 characters · Description: '+d+'/300 characters. Suggested title: roughly 45–65; description: roughly 120–160 (not Google limits).';
 document.getElementById('areaSeoQuality').textContent=(t<25?'Title could be more descriptive. ':t>65?'Title may be truncated in search. ':'')+(d<90?'Description could explain more customer benefits. ':d>160?'Description may be shortened by Google. ':'')+'Google may choose its own snippet.';
}
function reset(){const v=defaults(location.value);title.value=v.title;desc.value=v.description;heading.value='Window Cleaning in '+location.value[0].toUpperCase()+location.value.slice(1);intro.value='';faqQuestion.value='';faqAnswer.value='';status.textContent='Suggested draft loaded; live website unchanged.';render();markDirty();}

async function loadSaved(){
 const slug=location.value;
 const previous={title:title.value,desc:desc.value,heading:heading.value,intro:intro.value,faqQuestion:faqQuestion.value,faqAnswer:faqAnswer.value};

 if(typeof sb==='undefined'||!sb){status.textContent='Sign in before loading saved drafts.';return;}
 try{
   const {data,error}=await sb.from('site_settings').select('value,updated_at').eq('key','area_seo_drafts').maybeSingle();
   if(error)throw error;
   if(slug!==location.value)return;
   const saved=data?.value?.[slug];storedDraft=saved||null;storedVersion=data?.updated_at||null;showHistory(data?.value?._revisions,slug);
   const suggested=defaults(slug);
   title.value=suggested.title;desc.value=suggested.description;heading.value='Window Cleaning in '+slug[0].toUpperCase()+slug.slice(1);intro.value='';faqQuestion.value='';faqAnswer.value='';
   workflowState.textContent=saved?.status==='approved_for_deployment'?'Approved for deployment · NOT live':saved?.status==='review_requested'?'Review requested · changes are NOT published':saved?.status==='draft'?'Saved draft · not submitted':'No review request';
   if(saved){title.value=String(saved.title||'').slice(0,100);desc.value=String(saved.metaDescription||'').slice(0,300);heading.value=String(saved.heading||heading.value).slice(0,120);intro.value=String(saved.intro||'').slice(0,1200);faqQuestion.value=String(saved.faqQuestion||'').slice(0,200);faqAnswer.value=String(saved.faqAnswer||'').slice(0,1000);render();status.textContent='Saved draft loaded. Nothing published.';markClean('Saved draft · '+(saved.updatedAt?new Date(saved.updatedAt).toLocaleString():'date unknown'));}else{render();workflowState.textContent='No saved draft';markClean('No saved draft for this area');status.textContent='No saved draft; suggested copy displayed.';}
 }catch(e){title.value=previous.title;desc.value=previous.desc;heading.value=previous.heading;intro.value=previous.intro;faqQuestion.value=previous.faqQuestion;faqAnswer.value=previous.faqAnswer;render();status.textContent='Could not load private drafts. Existing editor fields preserved: '+String(e.message||e);}
}
async function saveDraft(){
 if(typeof sb==='undefined'||!sb){status.textContent='Sign in with Settings permission first.';return;}
 const slug=location.value;
 if(!areas.includes(slug)||!title.value.trim()||!desc.value.trim()){status.textContent='Choose an area and enter both SEO fields.';return;}
 const button=document.getElementById('areaSeoSave');button.disabled=true;
 try{
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.access_token)throw new Error('Sign in before saving');
  const response=await fetch('/api/admin-area-seo-save',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({area:slug,expectedVersion:storedVersion,draft:{title:title.value,metaDescription:desc.value,heading:heading.value,intro:intro.value,faqQuestion:faqQuestion.value,faqAnswer:faqAnswer.value}})});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||'Save unsuccessful');
  storedDraft=result.draft;storedVersion=result.version;
  // Refresh private revision history after the successful version-locked save.
  const {data:historyData}=await sb.from('site_settings').select('value').eq('key','area_seo_drafts').maybeSingle();
  showHistory(historyData?.value?._revisions,slug);
  workflowState.textContent='Draft saved · not submitted for review';
  status.textContent='Private draft saved with revision protection. Public page unchanged.';
  markClean('Saved · '+new Date().toLocaleString());
 }catch(e){status.textContent='Save failed: '+String(e.message||e);}
 finally{button.disabled=false;}
}

async function submitReview(){
 if(dirty||!storedDraft){status.textContent='Save and load your draft before requesting review.';return;}
 if(!storedDraft.heading||!storedDraft.intro||Boolean(storedDraft.faqQuestion)!==Boolean(storedDraft.faqAnswer)){status.textContent='Complete heading, introduction and any FAQ pair first.';return;}
 if(!confirm('Request editorial review? The public page will not change.'))return;
 requestReview.disabled=true;
 try{
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.access_token)throw new Error('Sign in required');
  const response=await fetch('/api/admin-area-seo-review',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({area:location.value,expectedVersion:storedVersion})});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Request failed');
  storedDraft=result.draft;storedVersion=result.version;
  workflowState.textContent='Review requested · not published';status.textContent=result.message;
 }catch(e){status.textContent='Review request failed: '+String(e.message||e);}
 finally{requestReview.disabled=false;}
}
requestReview.addEventListener('click',submitReview);
approveButton.addEventListener('click',async()=>{
 if(dirty||!storedDraft||storedDraft.status!=='review_requested'){status.textContent='Load an unchanged, review-requested draft before approval.';return;}
 if(!confirm('Approve this exact SEO draft for later deployment review? This will NOT publish it.'))return;
 approveButton.disabled=true;
 try{
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.access_token)throw new Error('Staff sign-in required');
  const r=await fetch('/api/admin-area-seo-approve',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({area:location.value,expectedVersion:storedVersion,expectedUpdatedAt:storedDraft.updatedAt,expectedReviewRequestedAt:storedDraft.reviewRequestedAt})});
  const result=await r.json();if(!r.ok)throw new Error(result.error||'Approval failed');
  status.textContent=result.message;await loadSaved();
 }catch(e){status.textContent='Approval failed: '+String(e.message||e);}
 finally{approveButton.disabled=false;}
});

location.addEventListener('change',async()=>{if(dirty&&!confirm('You have unsaved SEO changes. Switch areas and discard them?')){location.value=loadedArea;return;}loading=true;await loadSaved();loading=false;});
title.addEventListener('input',markDirty);desc.addEventListener('input',markDirty);copyFields.forEach(el=>el.addEventListener('input',markDirty));
document.getElementById('areaSeoReset').addEventListener('click',()=>{if(dirty&&!confirm('Reset this unsaved draft to suggested text?'))return;reset();});
document.getElementById('areaSeoSave').addEventListener('click',saveDraft);
document.getElementById('areaSeoLoad').addEventListener('click',()=>{if(dirty&&!confirm('Discard unsaved changes and reload the stored draft?'))return;loadSaved();});
window.addEventListener('beforeunload',event=>{if(!dirty)return;event.preventDefault();event.returnValue='';});
document.getElementById('areaSeoExport').addEventListener('click',()=>{
 if(!areas.includes(location.value))return;
 const approved=!dirty&&storedDraft?.status==='approved_for_deployment';
 const data={schemaVersion:1,status:approved?'approved_for_deployment':'draft-only',area:location.value,url:'https://namdar.co.uk/areas/'+location.value,title:title.value.trim(),metaDescription:desc.value.trim(),heading:heading.value.trim(),intro:intro.value.trim(),faqQuestion:faqQuestion.value.trim(),faqAnswer:faqAnswer.value.trim(),...(approved?{approvedAt:storedDraft.approvedAt,approvedBy:storedDraft.approvedBy,updatedAt:storedDraft.updatedAt}:{}),note:approved?'Approved export for offline code review; not yet published.':'Not published. Requires editorial review and deployment.'};
 if(!data.title||!data.metaDescription){status.textContent='Enter both a title and description before exporting.';return;}
 const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='namdar-'+data.area+'-seo-draft.json';document.body.append(a);a.click();a.remove();
 URL.revokeObjectURL(url);status.textContent='Draft downloaded. No live changes were made.';
});
document.getElementById('areaSeoVerifiedExport').addEventListener('click',async()=>{
 const button=document.getElementById('areaSeoVerifiedExport');button.disabled=true;
 try{
  if(dirty)throw new Error('Save and reload this draft before exporting');
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.access_token)throw new Error('Administrator sign-in required');
  const response=await fetch('/api/admin-area-seo-export?area='+encodeURIComponent(location.value),{headers:{Authorization:'Bearer '+session.access_token}});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Export not available');
  const blob=new Blob([JSON.stringify(result.export,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='namdar-'+location.value+'-approved-seo.json';document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
  status.textContent='Server-verified approved export downloaded. This does NOT publish the page.';
 }catch(e){status.textContent='Verified export unavailable: '+String(e.message||e);}
 finally{button.disabled=false;}
});
document.getElementById('areaSeoCompare').addEventListener('click',()=>{const selected=chosenRevision();if(!selected){revisionComparison.textContent='Choose an older version first.';return;}const current=currentFields();revisionComparison.replaceChildren();
 const table=document.createElement('table');table.className='admin-table';const head=document.createElement('thead');const hr=document.createElement('tr');['Field','Older version','Current editor'].forEach(label=>{const th=document.createElement('th');th.textContent=label;hr.append(th);});head.append(hr);table.append(head);
 const body=document.createElement('tbody');let changed=0;
 Object.keys(revisionFields).forEach(key=>{const before=String(selected.snapshot[key]||''),after=current[key];const row=document.createElement('tr');if(before!==after){changed++;row.style.background='rgba(245,158,11,.12)';}
 [key,before,after].forEach((value,index)=>{const cell=document.createElement('td');cell.style.whiteSpace='pre-wrap';cell.style.overflowWrap='anywhere';cell.textContent=value;row.append(cell);});body.append(row);});
 table.append(body);const summary=document.createElement('p');summary.textContent=changed+' of '+Object.keys(revisionFields).length+' fields changed since the older version.';revisionComparison.append(summary,table);});
document.getElementById('areaSeoRestore').addEventListener('click',()=>{const selected=chosenRevision();if(!selected){status.textContent='Select an older version to restore.';return;}if(!confirm('Load this older revision into your editor? Unsaved edits will be replaced. This does not save or publish.'))return;Object.entries(revisionFields).forEach(([key,node])=>{node.value=String(selected.snapshot[key]||'');});markDirty();status.textContent='Older revision loaded as unsaved draft. Click Save private draft to save it.';});
const publicStatus=document.getElementById('areaSeoPublicStatus'),publicLink=document.getElementById('areaSeoPublicLink');
function updatePublicLink(){publicLink.href='/areas/'+location.value;publicStatus.textContent='Not checked for this area';}
location.addEventListener('change',updatePublicLink);
document.getElementById('areaSeoCheckPublic').addEventListener('click',async()=>{
 const slug=location.value;publicStatus.textContent='Checking published page…';
 try{
  const response=await fetch('/areas/'+encodeURIComponent(slug),{cache:'no-store'});
  if(!response.ok)throw new Error('Public page returned HTTP '+response.status);
  const html=await response.text(),doc=new DOMParser().parseFromString(html,'text/html');
  const canonical=doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
  if(canonical!=='https://namdar.co.uk/areas/'+slug)throw new Error('Public page canonical mismatch');
  const publishedTitle=doc.querySelector('title')?.textContent||'',publishedDescription=doc.querySelector('meta[name="description"]')?.getAttribute('content')||'';
  let publicationProof='No verified publication manifest';
  try{
   const manifestResponse=await fetch('/areas/'+encodeURIComponent(slug)+'.publication.json',{cache:'no-store'});
   if(manifestResponse.ok&&globalThis.crypto?.subtle){
    const manifest=await manifestResponse.json();
    const bytes=new TextEncoder().encode(html),digest=await crypto.subtle.digest('SHA-256',bytes);
    const actual=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
    publicationProof=manifest.area===slug&&manifest.url==='https://namdar.co.uk/areas/'+slug&&actual===manifest.htmlSha256
     ?'Verified: public HTML matches the publication manifest for approved revision '+manifest.draftRevision+'. This does not prove Google indexing.'
     :'Publication manifest mismatch — verify deployed files before any rollback.';
   }else if(manifestResponse.ok){publicationProof='Manifest available, but browser could not verify HTML fingerprint';}
  }catch(e){publicationProof='Publication manifest could not be verified';}
  const draftTitle=storedDraft?.title||'',draftDescription=storedDraft?.metaDescription||'';
  if(!storedDraft){publicStatus.textContent='Public page responds correctly. '+publicationProof+' No saved draft loaded for comparison.';return;}
  const sameTitle=publishedTitle===draftTitle,sameDescription=publishedDescription===draftDescription;
  publicStatus.textContent='Public page verified (HTTP '+response.status+'). Title '+(sameTitle?'matches':'differs from')+' saved draft; description '+(sameDescription?'matches':'differs from')+' saved draft. '+publicationProof+' Metadata comparison alone does not establish indexing.';
 }catch(e){publicStatus.textContent='Public check unsuccessful: '+String(e.message||e);}
});
const deploymentStatus=document.getElementById('areaSeoDeploymentStatus'),deploymentHistory=document.getElementById('areaSeoDeploymentHistory');
document.getElementById('areaSeoDeploymentRefresh').addEventListener('click',async()=>{
 const button=document.getElementById('areaSeoDeploymentRefresh');button.disabled=true;deploymentStatus.textContent='Checking deployment records…';deploymentHistory.replaceChildren();
 try{
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.access_token)throw new Error('Administrator sign-in required');
  const response=await fetch('/api/admin-area-seo-deployments',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Deployment lookup failed');
  deploymentStatus.textContent=data.message||'Deployment records loaded';
  if(!data.configured||!data.deployments?.length)return;
  const table=document.createElement('table');table.className='admin-table';const thead=document.createElement('thead');const headings=document.createElement('tr');
  ['Deployment','Created','Status','Git revision','Rollback eligibility'].forEach(label=>{const th=document.createElement('th');th.textContent=label;headings.append(th);});thead.append(headings);table.append(thead);
  const tbody=document.createElement('tbody');
  data.deployments.forEach(item=>{
   const tr=document.createElement('tr');const values=[item.id,new Date(item.created).toLocaleString(),item.state,item.sha?.slice(0,10)||'Unknown',item.rollbackCandidate?'Vercel candidate — review required':'Not marked eligible'];
   values.forEach((value,i)=>{const td=document.createElement('td');td.textContent=value;if(i===0&&item.url){const link=document.createElement('a');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=value;td.replaceChildren(link);}tr.append(td);});tbody.append(tr);
  });table.append(tbody);deploymentHistory.append(table);
 }catch(e){deploymentStatus.textContent='Deployment history unavailable: '+String(e.message||e);}
 finally{button.disabled=false;}
});
document.getElementById('areaSeoRollbackRequest').addEventListener('click',async()=>{
 const selected=chosenRevision();
 if(!selected||!storedVersion||dirty){status.textContent='Load an unchanged saved area draft and select a historical revision first.';return;}
 if(!confirm('Request a manual rollback review for this borough revision? This will NOT change the public website.'))return;
 const button=document.getElementById('areaSeoRollbackRequest');button.disabled=true;
 try{
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.access_token)throw new Error('Administrator sign-in required');
  const response=await fetch('/api/admin-area-seo-rollback-request',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({area:location.value,revision:selected.timestamp,expectedVersion:storedVersion})});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Request unsuccessful');
  storedVersion=result.version;
  status.textContent='Manual rollback review recorded: '+result.request.id+'. Nothing deployed or restored.';
 }catch(e){status.textContent='Rollback review request failed: '+String(e.message||e);}
 finally{button.disabled=false;}
});
document.getElementById('areaSeoEvidenceRefresh').addEventListener('click',async()=>{
 const button=document.getElementById('areaSeoEvidenceRefresh'),statusNode=document.getElementById('areaSeoEvidenceStatus'),results=document.getElementById('areaSeoEvidenceResults');
 button.disabled=true;statusNode.textContent='Checking rollback evidence…';results.replaceChildren();
 try{
  const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)throw Error('Administrator sign-in required');
  const response=await fetch('/api/admin-area-seo-rollback-evidence',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Evidence check failed');
  statusNode.textContent=data.evidenceStatus+'; rollback remains disabled.';
  const list=document.createElement('ul');
  (data.requests||[]).forEach(item=>{const li=document.createElement('li');li.textContent=item.area+' · '+item.revision+' · '+item.verification+' — '+item.reason;list.append(li);});
  if(!list.childElementCount){const note=document.createElement('p');note.textContent='No rollback requests have been recorded.';results.append(note);}else results.append(list);
 }catch(e){statusNode.textContent='Unable to check evidence: '+String(e.message||e);}
 finally{button.disabled=false;}
});
document.getElementById('areaSeoVerifyPublication').addEventListener('click',async()=>{
 const button=document.getElementById('areaSeoVerifyPublication'),message=document.getElementById('areaSeoVerifiedPublicationStatus');button.disabled=true;message.textContent='Checking approved publication provenance…';
 try{
  const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)throw Error('Administrator sign-in required');
  const response=await fetch('/api/admin-area-seo-publication-verify?area='+encodeURIComponent(location.value),{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Verification failed');
  message.textContent=result.verified?'Verified revision '+result.draftRevision+' at GitHub '+result.commitSha.slice(0,12)+' and Vercel '+result.deploymentId+'. '+result.reason:'Not verified: '+result.reason+'. Production rollback remains disabled.';
 }catch(e){message.textContent='Could not verify publication: '+String(e.message||e);}
 finally{button.disabled=false;}
});
reset();markClean('Suggested copy · not saved');
})();