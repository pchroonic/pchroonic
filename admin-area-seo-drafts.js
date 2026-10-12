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
let storedDraft=null;
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
 reset();
 if(typeof sb==='undefined'||!sb){status.textContent='Sign in before loading saved drafts.';return;}
 try{
   const {data,error}=await sb.from('site_settings').select('value').eq('key','area_seo_drafts').maybeSingle();
   if(error)throw error;
   const saved=data?.value?.[location.value];storedDraft=saved||null;
   workflowState.textContent=saved?.status==='approved_for_deployment'?'Approved for deployment · NOT live':saved?.status==='review_requested'?'Review requested · changes are NOT published':saved?.status==='draft'?'Saved draft · not submitted':'No review request';
   if(saved){title.value=String(saved.title||'').slice(0,100);desc.value=String(saved.metaDescription||'').slice(0,300);heading.value=String(saved.heading||heading.value).slice(0,120);intro.value=String(saved.intro||'').slice(0,1200);faqQuestion.value=String(saved.faqQuestion||'').slice(0,200);faqAnswer.value=String(saved.faqAnswer||'').slice(0,1000);render();status.textContent='Saved draft loaded. Nothing published.';markClean('Saved draft · '+(saved.updatedAt?new Date(saved.updatedAt).toLocaleString():'date unknown'));}else{markClean('No saved draft for this area');}
 }catch(e){status.textContent='Could not load private drafts: '+String(e.message||e);}
}
async function saveDraft(){
 if(typeof sb==='undefined'||!sb){status.textContent='Sign in with Settings permission first.';return;}
 const slug=location.value,t=title.value.trim(),d=desc.value.trim();
 if(!areas.includes(slug)||!t||!d){status.textContent='Choose an area and enter both SEO fields.';return;}
 const button=document.getElementById('areaSeoSave');button.disabled=true;
 try{
  const {data,error}=await sb.from('site_settings').select('value').eq('key','area_seo_drafts').maybeSingle();if(error)throw error;
  const value={...(data?.value||{}),[slug]:{title:t,metaDescription:d,heading:heading.value.trim(),intro:intro.value.trim(),faqQuestion:faqQuestion.value.trim(),faqAnswer:faqAnswer.value.trim(),updatedAt:new Date().toISOString(),status:'draft'}};
  const {error:writeError}=await sb.from('site_settings').upsert({key:'area_seo_drafts',value,updated_at:new Date().toISOString()});if(writeError)throw writeError;
  storedDraft=value[slug];workflowState.textContent='Draft saved · not submitted for review';status.textContent='Private SEO draft saved. Public page unchanged.';markClean('Saved draft · '+new Date().toLocaleString());
 }catch(e){status.textContent='Save failed: '+String(e.message||e);}
 finally{button.disabled=false;}
}

async function submitReview(){
 if(dirty){status.textContent='Save your draft before requesting review.';return;}
 const slug=location.value;
 if(!storedDraft||!areas.includes(slug)){status.textContent='Save a draft before requesting review.';return;}
 if(!storedDraft.heading||!storedDraft.intro||Boolean(storedDraft.faqQuestion)!==Boolean(storedDraft.faqAnswer)){
  status.textContent='Add a page heading and local introduction, and either complete both FAQ fields or leave both blank.';return;
 }
 if(!confirm('Submit this saved draft for editorial review? This will not publish the public page.'))return;
 requestReview.disabled=true;
 try{
  const {data,error}=await sb.from('site_settings').select('value').eq('key','area_seo_drafts').maybeSingle();
  if(error)throw error;
  const current=data?.value?.[slug];
  if(!current||current.updatedAt!==storedDraft.updatedAt)throw new Error('Saved draft has changed. Reload before requesting review.');
  const value={...(data.value||{}),[slug]:{...current,status:'review_requested',reviewRequestedAt:new Date().toISOString()}};
  const {error:writeError}=await sb.from('site_settings').upsert({key:'area_seo_drafts',value,updated_at:new Date().toISOString()});
  if(writeError)throw writeError;
  storedDraft=value[slug];workflowState.textContent='Review requested · public page unchanged';status.textContent='Draft marked for review. A code/deployment review is still required to publish.';
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
  const r=await fetch('/api/admin-area-seo-approve',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({area:location.value,expectedUpdatedAt:storedDraft.updatedAt,expectedReviewRequestedAt:storedDraft.reviewRequestedAt})});
  const result=await r.json();if(!r.ok)throw new Error(result.error||'Approval failed');
  status.textContent=result.message;await loadSaved();
 }catch(e){status.textContent='Approval failed: '+String(e.message||e);}
 finally{approveButton.disabled=false;}
});

location.addEventListener('change',async()=>{if(dirty&&!confirm('You have unsaved SEO changes. Switch areas and discard them?')){location.value=loadedArea;return;}loading=true;await loadSaved();loading=false;});
title.addEventListener('input',markDirty);desc.addEventListener('input',markDirty);copyFields.forEach(el=>el.addEventListener('input',markDirty));
document.getElementById('areaSeoReset').addEventListener('click',()=>{if(dirty&&!confirm('Reset this unsaved draft to suggested text?'))return;reset();});
document.getElementById('areaSeoSave').addEventListener('click',saveDraft);
document.getElementById('areaSeoLoad').addEventListener('click',loadSaved);
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
reset();markClean('Suggested copy · not saved');
})();