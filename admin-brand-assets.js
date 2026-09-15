(()=>{
  const MAX_BYTES=2*1024*1024;
  const ACCEPTED=new Set(['image/png','image/jpeg','image/webp','image/avif']);
  let previewObjectUrl='';

  function revokePreview(){if(previewObjectUrl){URL.revokeObjectURL(previewObjectUrl);previewObjectUrl=''}}
  function previewLogo(url=''){
    const wrap=document.getElementById('settingLogoPreview');
    if(!wrap)return;
    const value=String(url||'').trim();
    wrap.innerHTML=value?`<div class="crm-context" style="margin-top:10px"><small>Logo preview</small><div style="margin-top:8px;min-height:74px;display:flex;align-items:center;justify-content:center;border:1px solid #dfe5df;border-radius:12px;background:#fff;padding:12px"><img src="${esc(value)}" alt="Current Namdar logo preview" style="display:block;max-width:100%;max-height:86px;object-fit:contain"></div></div>`:'';
  }
  function fileToBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const result=String(reader.result||''),comma=result.indexOf(',');resolve(comma>=0?result.slice(comma+1):result)};reader.onerror=()=>reject(new Error('The logo image could not be read. Please choose it again.'));reader.readAsDataURL(file)})}
  function ensureLogoUpload(){
    const urlInput=document.getElementById('settingLogoUrl');
    if(!urlInput||document.getElementById('settingLogoFile'))return;
    const label=urlInput.closest('label');if(!label)return;
    label.insertAdjacentHTML('beforeend',`<div style="margin-top:10px"><input id="settingLogoFile" type="file" accept="image/png,image/jpeg,image/webp,image/avif" style="width:100%"><div class="admin-actions" style="margin-top:8px"><button id="uploadBrandLogo" class="ghost-btn small" type="button">Upload logo</button></div><small class="admin-note">PNG, JPG, WebP or AVIF · maximum 2 MB. Uploading fills the Logo URL; then save website settings to publish it.</small><p id="settingLogoUploadStatus" role="status" aria-live="polite"></p><div id="settingLogoPreview"></div></div>`);
    const fileInput=document.getElementById('settingLogoFile'),button=document.getElementById('uploadBrandLogo'),status=document.getElementById('settingLogoUploadStatus');
    fileInput.onchange=()=>{revokePreview();const file=fileInput.files?.[0];if(!file){previewLogo(urlInput.value);return}previewObjectUrl=URL.createObjectURL(file);previewLogo(previewObjectUrl);status.textContent='Ready to upload.'};
    urlInput.addEventListener('input',()=>previewLogo(urlInput.value));
    button.onclick=async()=>{
      status.textContent='';const file=fileInput.files?.[0];
      if(!file){status.textContent='Choose a logo image first.';return}
      if(!ACCEPTED.has(file.type)){status.textContent='Use a PNG, JPG, WebP or AVIF image.';return}
      if(file.size>MAX_BYTES){status.textContent='The logo is too large. Please use an image up to 2 MB.';return}
      setBusy(button,true,'Uploading…');
      try{
        const dataBase64=await fileToBase64(file);
        const result=await api('/api/admin-brand-logo',{method:'POST',body:JSON.stringify({fileName:file.name,mimeType:file.type,dataBase64})});
        urlInput.value=result.url||'';revokePreview();previewLogo(urlInput.value);fileInput.value='';
        status.textContent='Logo uploaded. Click “Save website settings” to publish it.';
        document.getElementById('siteSettingsStatus').textContent='Logo uploaded and ready to save.';
      }catch(error){status.textContent=error.message||'Logo upload failed.'}
      finally{setBusy(button,false)}
    };
    previewLogo(urlInput.value);
  }

  const originalWebsiteTools=websiteTools;
  websiteTools=async function(...args){const result=await originalWebsiteTools.apply(this,args);ensureLogoUpload();previewLogo(document.getElementById('settingLogoUrl')?.value||'');return result};
  ensureLogoUpload();
})();
