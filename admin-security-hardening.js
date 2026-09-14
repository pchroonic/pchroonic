(()=>{
  const IDLE_MS=30*60*1000;
  let lastActivity=Date.now();
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const activeAdmin=()=>{try{return currentProfile?.role==='admin'}catch{return false}};
  const busy=(button,on,label='Please wait…')=>{if(!button)return;if(on){button.dataset.securityLabel=button.textContent;button.disabled=true;button.textContent=label}else{button.disabled=false;button.textContent=button.dataset.securityLabel||button.textContent;delete button.dataset.securityLabel}};
  function hardenUserDialog(){
    const dialog=$('#userEditor');if(!dialog?.hasAttribute('open'))return;
    const id=$('#editUserId')?.value||'',email=$('#editUserEmail'),passwordWrap=$('#tempPasswordWrap'),password=$('#editTempPassword'),role=$('#editUserRole');
    if(passwordWrap)passwordWrap.style.display='none';if(password)password.disabled=true;
    let note=$('#secureUserInviteNote');
    if(!note){note=document.createElement('p');note.id='secureUserInviteNote';note.className='account-alert';passwordWrap?.insertAdjacentElement('afterend',note)}
    if(note)note.innerHTML=id?'<strong>Email identity is protected.</strong><br>Email changes must be confirmed by the account owner in My Namdar → Security.':'<strong>Secure invitation.</strong><br>No temporary password is created or shown. Namdar sends an invitation and the user chooses their own password.';
    if(email){email.disabled=!!id;email.title=id?'Email changes must be confirmed by the account owner in My Namdar Security.':''}
    const adminOption=role?.querySelector('option[value="admin"]');if(adminOption)adminOption.disabled=!activeAdmin();
  }
  async function secureSaveUser(){
    const button=$('#saveUser'),id=$('#editUserId')?.value||'',role=$('#editUserRole')?.value||'customer',permissions=Object.fromEntries($$('[data-perm]').map(x=>[x.dataset.perm,x.checked]));
    const body={id:id||undefined,fullName:$('#editUserName')?.value.trim()||'',phone:$('#editUserPhone')?.value.trim()||'',postcode:$('#editUserPostcode')?.value.trim()||'',address1:$('#editUserAddress1')?.value.trim()||'',address2:$('#editUserAddress2')?.value.trim()||'',city:$('#editUserCity')?.value.trim()||'',district:$('#editUserDistrict')?.value.trim()||'',region:$('#editUserRegion')?.value.trim()||'',countryCode:$('#editUserCountry')?.value||'GB',propertyType:$('#editUserPropertyType')?.value||'house',role,accountStatus:$('#editUserStatus')?.value||'active'};
    if(!id)body.email=$('#editUserEmail')?.value.trim()||'';
    if(role==='staff'||role==='admin'){body.jobTitle=$('#editJobTitle')?.value.trim()||'';body.permissions=permissions}
    busy(button,true,id?'Saving…':'Sending invite…');
    try{
      const data=await api('/api/admin-users',{method:id?'PATCH':'POST',body:JSON.stringify(body)}),status=$('#userEditorStatus');
      if(status)status.textContent=id?'Saved securely.':'Secure invitation sent. The user will choose their own password.';
      try{if(typeof customerTools==='function')await customerTools();if(typeof staffTools==='function')await staffTools()}catch{}
      if(id)setTimeout(()=>$('#userEditor')?.close(),700);else setTimeout(()=>$('#userEditor')?.close(),1300);
      return data;
    }catch(error){const status=$('#userEditorStatus');if(status)status.textContent=error.message||'The user could not be saved.'}
    finally{busy(button,false)}
  }
  function installUserGuard(){
    const dialog=$('#userEditor'),button=$('#saveUser');if(!dialog||!button)return false;
    button.onclick=secureSaveUser;
    const observer=new MutationObserver(()=>hardenUserDialog());observer.observe(dialog,{attributes:true,attributeFilter:['open']});
    hardenUserDialog();return true;
  }
  function installIdleGuard(){
    const mark=()=>{lastActivity=Date.now()};
    for(const event of ['pointerdown','keydown','touchstart','scroll'])document.addEventListener(event,mark,{passive:true,capture:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkIdle()});
    setInterval(checkIdle,60000);
  }
  function checkIdle(){
    const app=$('#adminApp');if(!app||app.classList.contains('hidden')){lastActivity=Date.now();return}
    if(Date.now()-lastActivity<IDLE_MS)return;
    lastActivity=Date.now();sessionStorage.setItem('namdar_admin_idle_signout','1');$('#adminSignOut')?.click();
    setTimeout(()=>{const status=$('#adminLoginStatus');if(status)status.textContent='For security, your Admin session was signed out after 30 minutes of inactivity.'},250);
  }
  const start=()=>{if(!installUserGuard())setTimeout(start,100)};start();installIdleGuard();
})();
