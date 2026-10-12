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
function markClean(message){dirty=false;loadedArea=location.value;savedState.textContent=message;}
function markDirty(){dirty=true;savedState.textContent='Unsaved changes — save before leaving this area';render();}
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
   const saved=data?.value?.[location.value];
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
  status.textContent='Private SEO draft saved. Public page unchanged.';markClean('Saved draft · '+new Date().toLocaleString());
 }catch(e){status.textContent='Save failed: '+String(e.message||e);}
 finally{button.disabled=false;}
}

location.addEventListener('change',async()=>{if(dirty&&!confirm('You have unsaved SEO changes. Switch areas and discard them?')){location.value=loadedArea;return;}loading=true;await loadSaved();loading=false;});
title.addEventListener('input',markDirty);desc.addEventListener('input',markDirty);copyFields.forEach(el=>el.addEventListener('input',markDirty));
document.getElementById('areaSeoReset').addEventListener('click',()=>{if(dirty&&!confirm('Reset this unsaved draft to suggested text?'))return;reset();});
document.getElementById('areaSeoSave').addEventListener('click',saveDraft);
document.getElementById('areaSeoLoad').addEventListener('click',loadSaved);
document.getElementById('areaSeoExport').addEventListener('click',()=>{
 if(!areas.includes(location.value))return;
 const data={schemaVersion:1,status:'draft-only',area:location.value,url:'https://namdar.co.uk/areas/'+location.value,title:title.value.trim(),metaDescription:desc.value.trim(),heading:heading.value.trim(),intro:intro.value.trim(),faqQuestion:faqQuestion.value.trim(),faqAnswer:faqAnswer.value.trim(),note:'Not published. Requires editorial review and deployment.'};
 if(!data.title||!data.metaDescription){status.textContent='Enter both a title and description before exporting.';return;}
 const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='namdar-'+data.area+'-seo-draft.json';document.body.append(a);a.click();a.remove();
 URL.revokeObjectURL(url);status.textContent='Draft downloaded. No live changes were made.';
});
reset();markClean('Suggested copy · not saved');
})();