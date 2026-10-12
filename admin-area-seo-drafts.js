(()=>{
'use strict';
const areas=['lewisham','southwark','lambeth','wandsworth','greenwich'];
const location=document.getElementById('areaSeoLocation');
if(!location)return;
const title=document.getElementById('areaSeoTitle'),desc=document.getElementById('areaSeoDescription');
const status=document.getElementById('areaSeoDraftStatus'),count=document.getElementById('areaSeoLength');
const defaults=slug=>({title:'Window Cleaning in '+slug[0].toUpperCase()+slug.slice(1)+' | Namdar',description:'Exterior window cleaning for homes, flats and commercial properties in '+slug[0].toUpperCase()+slug.slice(1)+'. Check your postcode and request a reviewed quote.'});
function render(){
 const slug=location.value;
 document.getElementById('areaSeoPreviewTitle').textContent=title.value||'Untitled area page';
 document.getElementById('areaSeoPreviewUrl').textContent='https://namdar.co.uk/areas/'+slug;
 document.getElementById('areaSeoPreviewDescription').textContent=desc.value;
 count.textContent='Title: '+title.value.length+' characters · Description: '+desc.value.length+' characters (Google may display different snippets).';
}
function reset(){const v=defaults(location.value);title.value=v.title;desc.value=v.description;status.textContent='Editable draft loaded; live website unchanged.';render();}

async function loadSaved(){
 reset();
 if(typeof sb==='undefined'||!sb){status.textContent='Sign in before loading saved drafts.';return;}
 try{
   const {data,error}=await sb.from('site_settings').select('value').eq('key','area_seo_drafts').maybeSingle();
   if(error)throw error;
   const saved=data?.value?.[location.value];
   if(saved){title.value=String(saved.title||'').slice(0,100);desc.value=String(saved.metaDescription||'').slice(0,300);render();status.textContent='Saved draft loaded. Nothing published.';}
 }catch(e){status.textContent='Could not load private drafts: '+String(e.message||e);}
}
async function saveDraft(){
 if(typeof sb==='undefined'||!sb){status.textContent='Sign in with Settings permission first.';return;}
 const slug=location.value,t=title.value.trim(),d=desc.value.trim();
 if(!areas.includes(slug)||!t||!d){status.textContent='Choose an area and enter both SEO fields.';return;}
 const button=document.getElementById('areaSeoSave');button.disabled=true;
 try{
  const {data,error}=await sb.from('site_settings').select('value').eq('key','area_seo_drafts').maybeSingle();if(error)throw error;
  const value={...(data?.value||{}),[slug]:{title:t,metaDescription:d,updatedAt:new Date().toISOString(),status:'draft'}};
  const {error:writeError}=await sb.from('site_settings').upsert({key:'area_seo_drafts',value,updated_at:new Date().toISOString()});if(writeError)throw writeError;
  status.textContent='Private SEO draft saved. Public page unchanged.';
 }catch(e){status.textContent='Save failed: '+String(e.message||e);}
 finally{button.disabled=false;}
}

location.addEventListener('change',loadSaved);
title.addEventListener('input',render);desc.addEventListener('input',render);
document.getElementById('areaSeoReset').addEventListener('click',reset);
document.getElementById('areaSeoSave').addEventListener('click',saveDraft);
document.getElementById('areaSeoLoad').addEventListener('click',loadSaved);
document.getElementById('areaSeoExport').addEventListener('click',()=>{
 if(!areas.includes(location.value))return;
 const data={schemaVersion:1,status:'draft-only',area:location.value,url:'https://namdar.co.uk/areas/'+location.value,title:title.value.trim(),metaDescription:desc.value.trim(),note:'Not published. Requires editorial review and deployment.'};
 if(!data.title||!data.metaDescription){status.textContent='Enter both a title and description before exporting.';return;}
 const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='namdar-'+data.area+'-seo-draft.json';document.body.append(a);a.click();a.remove();
 URL.revokeObjectURL(url);status.textContent='Draft downloaded. No live changes were made.';
});
reset();
})();