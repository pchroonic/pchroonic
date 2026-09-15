(()=>{
  const PERMISSION_LABELS={
    quotes:'Quotes',bookings:'Bookings',payments:'Payments',tickets:'Support tickets',inbox:'Email inbox',pricing:'Pricing',content:'Offers & jobs',customers:'Customers',staff:'Staff & access',loyalty:'Rewards & promo',newsletter:'Newsletter',analytics:'Reporting & analytics',settings:'Service areas & settings',legal:'Website & legal',chat:'AI & live chat'
  };
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  let roles=[],actorRoleKey=null,canManageRoles=false,loadingRoles=null;

  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const roleByKey=key=>roles.find(role=>role.key===key)||null;
  const permissionSummary=p=>Object.entries(p||{}).filter(([,enabled])=>enabled===true).map(([key])=>PERMISSION_LABELS[key]||key).join(', ')||'No dashboard permissions';

  async function loadRoles(force=false){
    if(loadingRoles&&!force)return loadingRoles;
    loadingRoles=(async()=>{
      const data=await api('/api/admin-roles');
      roles=data.roles||[];actorRoleKey=data.actorRoleKey||null;canManageRoles=data.canManageRoles===true;
      renderRoleManager();updateSignedInRole();
      return roles;
    })();
    try{return await loadingRoles}finally{loadingRoles=null}
  }

  function updateSignedInRole(){
    if(!currentProfile)return;
    const line=$('#staffRoleLine');if(!line)return;
    if(currentProfile.role==='admin')line.textContent=roleByKey(actorRoleKey)?.name||(actorRoleKey==='owner'?'Owner':'Administrator');
  }

  function ensureRoleManager(){
    const section=$('#staff');if(!section||$('#roleManagerPanel'))return;
    const panel=document.createElement('div');panel.id='roleManagerPanel';panel.className='admin-panel';
    panel.innerHTML=`<div class="panel-head"><div><h2>Access roles</h2><p>Create reusable staff roles and choose exactly which Admin sections each role can use. Owner and Administrator are protected system roles.</p></div><button id="newAccessRole" class="primary-btn small" type="button">Create role</button></div><div id="roleManagerStatus" class="crm-summary"></div><div id="roleManagerTable"></div>`;
    section.prepend(panel);
    $('#newAccessRole').onclick=()=>openRoleEditor();
  }

  function ensureRoleDialog(){
    if($('#accessRoleEditor'))return;
    const dialog=document.createElement('dialog');dialog.id='accessRoleEditor';dialog.className='modal';
    dialog.innerHTML=`<div class="modal-card wide"><button class="modal-close" type="button" data-role-close>×</button><div class="eyebrow">Staff access</div><h2 id="accessRoleEditorTitle">Create role</h2><input id="accessRoleKey" type="hidden"><div class="admin-form-grid"><label>Role name<input id="accessRoleName" maxlength="80" placeholder="e.g. Operations Manager"></label><label>Description<input id="accessRoleDescription" maxlength="300" placeholder="What this role is for"></label></div><h3>Dashboard permissions</h3><div id="accessRolePermissionGrid" class="permission-grid"></div><div class="modal-actions"><button id="saveAccessRole" class="primary-btn" type="button">Save role</button><button id="deleteAccessRole" class="danger-btn hidden" type="button">Delete role</button></div><p id="accessRoleEditorStatus"></p></div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('[data-role-close]').onclick=()=>dialog.close();
    $('#saveAccessRole').onclick=saveRole;
    $('#deleteAccessRole').onclick=deleteRole;
    $('#accessRolePermissionGrid').innerHTML=Object.entries(PERMISSION_LABELS).map(([key,label])=>`<label><input type="checkbox" data-role-perm="${key}"> ${escape(label)}</label>`).join('');
  }

  function renderRoleManager(){
    ensureRoleManager();ensureRoleDialog();
    const button=$('#newAccessRole');if(button)button.classList.toggle('hidden',!canManageRoles);
    const status=$('#roleManagerStatus');if(status)status.textContent=canManageRoles?'You are signed in as Owner. You can create, edit and delete unassigned custom roles.':'Role definitions are read-only. Only an Owner can create or edit roles.';
    const table=$('#roleManagerTable');if(!table)return;
    table.innerHTML=roles.length?`<div class="table-scroll"><table class="admin-table"><thead><tr><th>Role</th><th>Type</th><th>Permissions</th><th></th></tr></thead><tbody>${roles.map(role=>`<tr><td><strong>${escape(role.name)}</strong>${role.description?`<br><small>${escape(role.description)}</small>`:''}</td><td>${role.system_role?'Protected':'Custom'}</td><td><small>${escape(permissionSummary(role.permissions))}</small></td><td>${!role.system_role&&canManageRoles?`<button class="ghost-btn small" type="button" data-edit-access-role="${escape(role.key)}">Edit</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<p>No access roles found.</p>';
    $$('[data-edit-access-role]').forEach(button=>button.onclick=()=>openRoleEditor(button.dataset.editAccessRole));
  }

  function openRoleEditor(key=''){
    if(!canManageRoles)return;
    ensureRoleDialog();
    const role=key?roleByKey(key):null;if(role?.system_role)return;
    $('#accessRoleKey').value=role?.key||'';
    $('#accessRoleName').value=role?.name||'';
    $('#accessRoleDescription').value=role?.description||'';
    $('#accessRoleEditorTitle').textContent=role?'Edit role':'Create role';
    $('#deleteAccessRole').classList.toggle('hidden',!role);
    $('#accessRoleEditorStatus').textContent='';
    $$('[data-role-perm]').forEach(input=>input.checked=role?.permissions?.[input.dataset.rolePerm]===true);
    $('#accessRoleEditor').showModal();
  }

  async function saveRole(){
    const button=$('#saveAccessRole'),key=$('#accessRoleKey').value,name=$('#accessRoleName').value.trim(),description=$('#accessRoleDescription').value.trim(),permissions=Object.fromEntries($$('[data-role-perm]').map(input=>[input.dataset.rolePerm,input.checked]));
    if(!name){$('#accessRoleEditorStatus').textContent='Enter a role name.';return}
    setBusy(button,true,'Saving…');
    try{
      await api('/api/admin-roles',{method:key?'PATCH':'POST',body:JSON.stringify({key:key||undefined,name,description,permissions})});
      $('#accessRoleEditorStatus').textContent='Saved.';await loadRoles(true);await staffTools();setTimeout(()=>$('#accessRoleEditor').close(),500);
    }catch(error){$('#accessRoleEditorStatus').textContent=error.message}
    finally{setBusy(button,false)}
  }

  async function deleteRole(){
    const key=$('#accessRoleKey').value,role=roleByKey(key);if(!key||!role||!confirm(`Delete the ${role.name} role?`))return;
    const button=$('#deleteAccessRole');setBusy(button,true,'Deleting…');
    try{await api('/api/admin-roles',{method:'DELETE',body:JSON.stringify({key})});$('#accessRoleEditor').close();await loadRoles(true);await staffTools()}catch(error){$('#accessRoleEditorStatus').textContent=error.message}finally{setBusy(button,false)}
  }

  function ensureUserAccessRoleField(){
    const job=$('#editJobTitle')?.closest('label'),grid=$('#permissionGrid');if(!job||!grid||$('#editAccessRoleWrap'))return;
    const wrap=document.createElement('label');wrap.id='editAccessRoleWrap';wrap.innerHTML=`Access role<select id="editAccessRoleKey"></select><small id="editAccessRoleHint" class="optional"></small>`;job.insertAdjacentElement('afterend',wrap);
    $('#editAccessRoleKey').onchange=applyUserRolePermissions;
    const roleSelect=$('#editUserRole');if(roleSelect){roleSelect.closest('label').childNodes[0].textContent='Account type';roleSelect.addEventListener('change',syncUserRoleEditor)}
    const note=document.createElement('p');note.id='accessRolePermissionNote';note.className='crm-summary';grid.insertAdjacentElement('beforebegin',note);
  }

  function currentEditedUser(){const id=$('#editUserId')?.value||'';return staffAdminCache?.find?.(user=>user.id===id)||null}

  function syncUserRoleEditor(){
    ensureUserAccessRoleField();
    const accountType=$('#editUserRole')?.value||'customer',wrap=$('#editAccessRoleWrap'),select=$('#editAccessRoleKey'),grid=$('#permissionGrid'),note=$('#accessRolePermissionNote');if(!wrap||!select||!grid)return;
    const user=currentEditedUser(),savedKey=user?.staff_access?.role_key||'',self=!!user&&user.id===currentSession?.user?.id;
    if(accountType==='customer'){
      wrap.classList.add('hidden');grid.classList.add('hidden');if(note)note.textContent='';return;
    }
    wrap.classList.remove('hidden');grid.classList.remove('hidden');
    if(accountType==='admin'){
      const adminRoles=roles.filter(role=>['administrator','owner'].includes(role.key));
      select.innerHTML=adminRoles.map(role=>`<option value="${escape(role.key)}">${escape(role.name)}</option>`).join('');
      select.value=['administrator','owner'].includes(savedKey)?savedKey:'administrator';
      if(self&&savedKey)select.value=savedKey;
      select.disabled=self;
      if(note)note.textContent=self&&savedKey==='owner'?'Your Owner access role is protected while you are signed in.':'Admin accounts receive all operational dashboard permissions. Owner additionally controls access roles and Administrator accounts.';
    }else{
      const custom=roles.filter(role=>!role.system_role&&role.active!==false);
      select.innerHTML=`<option value="">Individual permissions</option>${custom.map(role=>`<option value="${escape(role.key)}">${escape(role.name)}</option>`).join('')}`;
      select.value=savedKey&&!['owner','administrator'].includes(savedKey)?savedKey:'';
      select.disabled=false;
      if(note)note.textContent=select.value?'Permissions are controlled by the selected role. Choose Individual permissions to manage this person separately.':'Individual permissions apply only to this staff account.';
    }
    applyUserRolePermissions();
  }

  function applyUserRolePermissions(){
    const accountType=$('#editUserRole')?.value||'customer',select=$('#editAccessRoleKey'),note=$('#accessRolePermissionNote');if(accountType==='customer')return;
    if(accountType==='admin'){
      $$('[data-perm]').forEach(input=>{input.checked=true;input.disabled=true});return;
    }
    const role=roleByKey(select?.value||'');
    $$('[data-perm]').forEach(input=>{if(role)input.checked=role.permissions?.[input.dataset.perm]===true;input.disabled=!!role});
    if(note)note.textContent=role?`Permissions come from ${role.name}. Edit the role once to update everyone assigned to it.`:'Individual permissions apply only to this staff account.';
  }

  async function saveUserWithRoles(){
    const button=$('#saveUser'),id=$('#editUserId')?.value||'',role=$('#editUserRole')?.value||'customer',permissions=Object.fromEntries($$('[data-perm]').map(input=>[input.dataset.perm,input.checked]));
    const body={id:id||undefined,fullName:$('#editUserName')?.value.trim()||'',phone:$('#editUserPhone')?.value.trim()||'',postcode:$('#editUserPostcode')?.value.trim()||'',address1:$('#editUserAddress1')?.value.trim()||'',address2:$('#editUserAddress2')?.value.trim()||'',city:$('#editUserCity')?.value.trim()||'',district:$('#editUserDistrict')?.value.trim()||'',region:$('#editUserRegion')?.value.trim()||'',countryCode:$('#editUserCountry')?.value||'GB',propertyType:$('#editUserPropertyType')?.value||'house',role,accountStatus:$('#editUserStatus')?.value||'active'};
    if(!id)body.email=$('#editUserEmail')?.value.trim()||'';
    if(role==='staff'||role==='admin'){
      body.jobTitle=$('#editJobTitle')?.value.trim()||'';
      body.accessRoleKey=$('#editAccessRoleKey')?.value||null;
      body.permissions=permissions;
    }
    setBusy(button,true,id?'Saving…':'Sending invite…');
    try{
      await api('/api/admin-users',{method:id?'PATCH':'POST',body:JSON.stringify(body)});
      const status=$('#userEditorStatus');if(status)status.textContent=id?'Saved securely.':'Secure invitation sent. The user will choose their own password.';
      try{if(typeof customerTools==='function')await customerTools();if(typeof staffTools==='function')await staffTools()}catch{}
      if(id)setTimeout(()=>$('#userEditor')?.close(),700);else setTimeout(()=>$('#userEditor')?.close(),1300);
    }catch(error){const status=$('#userEditorStatus');if(status)status.textContent=error.message||'The user could not be saved.'}
    finally{setBusy(button,false)}
  }

  async function enhancedStaffTools(){
    if(!allowed('staff'))return;
    try{
      await loadRoles();
      const data=await api('/api/admin-users?scope=staff');staffAdminCache=data.users||[];
      const rows=staffAdminCache.filter(user=>['staff','admin'].includes(user.role)),table=$('#staffTable');
      table.innerHTML=rows.length?`<div class="table-scroll"><table class="admin-table"><thead><tr><th>Staff</th><th>Access role</th><th>Account type</th><th>Job title</th><th>Permissions</th><th></th></tr></thead><tbody>${rows.map(user=>{const accessKey=user.staff_access?.role_key||'',accessRole=roleByKey(accessKey),roleName=accessRole?.name||(user.role==='admin'?'Administrator':'Individual permissions'),perms=user.role==='admin'?'All operational permissions':permissionSummary(accessRole?.permissions||user.staff_access?.permissions||{});return `<tr><td><strong>${escape(user.full_name||user.email)}</strong><br><small>${escape(user.email||'')}</small></td><td><strong>${escape(roleName)}</strong>${accessKey==='owner'?'<br><small>Protected highest access</small>':''}</td><td>${escape(user.role==='admin'?'Admin':'Staff')}</td><td>${escape(user.staff_access?.job_title||'—')}</td><td><small>${escape(perms)}</small></td><td><button class="ghost-btn small" type="button" data-edit-staff-role="${escape(user.id)}">Edit</button></td></tr>`}).join('')}</tbody></table></div>`:'<p>No staff users.</p>';
      $$('[data-edit-staff-role]').forEach(button=>button.onclick=()=>openUserEditor(staffAdminCache.find(user=>user.id===button.dataset.editStaffRole),'staff'));
      if(allowed('bookings'))await loadBookingStaff(true);
    }catch(error){const table=$('#staffTable');if(table)table.innerHTML=`<p>${escape(error.message)}</p>`}
  }

  const previousEnter=enter;
  enter=async function(session){const result=await previousEnter(session);if(currentProfile){try{await loadRoles(true)}catch(error){console.warn('Could not load access roles',error)}}return result};
  staffTools=enhancedStaffTools;

  function install(){
    ensureRoleManager();ensureRoleDialog();ensureUserAccessRoleField();
    const save=$('#saveUser');if(save)save.onclick=saveUserWithRoles;
    const dialog=$('#userEditor');if(dialog&&!dialog.dataset.roleObserver){dialog.dataset.roleObserver='1';new MutationObserver(()=>{if(dialog.open){loadRoles().then(syncUserRoleEditor).catch(()=>syncUserRoleEditor());if(save)save.onclick=saveUserWithRoles}}).observe(dialog,{attributes:true,attributeFilter:['open']})}
    if(currentProfile)loadRoles(true).catch(()=>null);
  }
  install();
})();
