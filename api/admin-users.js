const {json,parseBody,db,requireStaff,authAdmin,sendEmail,escapeHtml,randomId,auditLog,safeError,queryParam}=require('../lib/server');
async function targetProfile(id){return (await db(`profiles?id=eq.${encodeURIComponent(id)}&select=*&limit=1`))?.[0]||null}
function postcode(value=''){const compact=String(value||'').toUpperCase().replace(/\s+/g,'');return compact.length>3?`${compact.slice(0,-3)} ${compact.slice(-3)}`:compact}
module.exports=async function(req,res){try{
  if(req.method==='GET'){
    const scope=String(queryParam(req,'scope','customers')||'customers');
    await requireStaff(req,scope==='staff'?'staff':'customers');
    const profiles=await db('profiles?select=*&order=created_at.desc');
    const filtered=(profiles||[]).filter(p=>scope==='staff'?['staff','admin'].includes(p.role):p.role==='customer');
    const access=scope==='staff'?await db('staff_access?select=user_id,permissions,job_title,active'):[];
    const map=Object.fromEntries((access||[]).map(x=>[x.user_id,x]));
    return json(res,200,{ok:true,users:filtered.map(p=>({...p,staff_access:map[p.id]||null}))});
  }
  if(req.method==='POST'){
    const b=parseBody(req); const email=String(b.email||'').trim().toLowerCase(); const fullName=String(b.fullName||'').trim(); const role=['customer','staff'].includes(b.role)?b.role:'customer';
    const staff=await requireStaff(req,role==='customer'?'customers':'staff');
    if(!email.includes('@')||!fullName)return json(res,400,{ok:false,error:'Name and valid email are required.'});
    const password=String(b.password||`${randomId('Nd!')}aA9`).slice(0,72);
    const created=await authAdmin('users',{method:'POST',body:{email,password,email_confirm:true,user_metadata:{full_name:fullName,phone:b.phone||'',country_code:'GB'}}});
    const user=created?.user||created;
    await db(`profiles?id=eq.${encodeURIComponent(user.id)}`,{method:'PATCH',body:{email,full_name:fullName,phone:b.phone||null,postcode:b.postcode?postcode(b.postcode):null,address_line1:b.address1||null,address_line2:b.address2||null,city:b.city||null,district:b.district||null,region:b.region||null,country_code:b.countryCode||'GB',property_type:b.propertyType||null,role,account_status:b.accountStatus||'active',updated_at:new Date().toISOString()}});
    if(role==='staff')await db('staff_access',{method:'POST',prefer:'resolution=merge-duplicates',body:{user_id:user.id,permissions:b.permissions||{},job_title:b.jobTitle||'Staff',active:true,created_by:staff.user.id}});
    await sendEmail({to:email,subject:'Your Namdar account has been created',html:`<p>Hi ${escapeHtml(fullName)},</p><p>A Namdar account has been created for you.</p><p>Temporary password: <strong>${escapeHtml(password)}</strong></p><p>Please sign in at <a href="https://namdar.co.uk/account?tab=security">My Namdar Security</a> and change your password.</p>`});
    await auditLog(req,staff,{action:'user.create',entityType:'profile',entityId:user.id,summary:`Created ${role} account for ${fullName}`,after:{email,full_name:fullName,phone:b.phone||null,postcode:b.postcode?postcode(b.postcode):null,role,account_status:b.accountStatus||'active',job_title:role==='staff'?(b.jobTitle||'Staff'):null,permissions:role==='staff'?(b.permissions||{}):null}});
    return json(res,201,{ok:true,userId:user.id,temporaryPassword:password});
  }
  if(req.method==='PATCH'){
    const b=parseBody(req); const id=String(b.id||''); if(!id)return json(res,400,{ok:false,error:'User id required.'});
    const existing=await targetProfile(id); if(!existing)return json(res,404,{ok:false,error:'User not found.'});
    const desiredRole=b.role===undefined?existing.role:b.role;
    const roleOrPermissionChange=desiredRole!==existing.role||b.permissions!==undefined||b.jobTitle!==undefined||b.staffActive!==undefined;
    const staff=await requireStaff(req,(['staff','admin'].includes(existing.role)||['staff','admin'].includes(desiredRole)||roleOrPermissionChange)?'staff':'customers');
    if(existing.role==='admin'&&staff.profile.role!=='admin')return json(res,403,{ok:false,error:'Only an administrator can modify another administrator.'});
    if(desiredRole==='admin'&&staff.profile.role!=='admin')return json(res,403,{ok:false,error:'Only an admin can promote another admin.'});
    if(!['customer','staff','admin'].includes(desiredRole))return json(res,400,{ok:false,error:'Invalid role.'});
    const patch={updated_at:new Date().toISOString()};
    for(const [k,v] of Object.entries({full_name:b.fullName,phone:b.phone,email:b.email,address_line1:b.address1,address_line2:b.address2,city:b.city,postcode:b.postcode===undefined?undefined:postcode(b.postcode),country_code:b.countryCode,region:b.region,district:b.district,account_status:b.accountStatus,property_type:b.propertyType}))if(v!==undefined)patch[k]=v===''?null:v;
    patch.role=desiredRole;
    await db(`profiles?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:patch});
    if(b.email)await authAdmin(`users/${encodeURIComponent(id)}`,{method:'PUT',body:{email:String(b.email).toLowerCase(),email_confirm:true}});
    if(desiredRole==='staff'||b.permissions!==undefined||b.jobTitle!==undefined||b.staffActive!==undefined){
      await db('staff_access',{method:'POST',prefer:'resolution=merge-duplicates',body:{user_id:id,permissions:b.permissions||existing.staff_access?.permissions||{},job_title:b.jobTitle||'Staff',active:b.staffActive!==false,created_by:staff.user.id,updated_at:new Date().toISOString()}})
    }
    if(desiredRole==='customer'&&existing.role==='staff')await db(`staff_access?user_id=eq.${encodeURIComponent(id)}`,{method:'DELETE'}).catch(()=>null);
    const updatedProfile=await targetProfile(id);const updatedAccess=['staff','admin'].includes(desiredRole)?(await db(`staff_access?user_id=eq.${encodeURIComponent(id)}&select=permissions,job_title,active&limit=1`).catch(()=>[]))?.[0]||null:null;
    await auditLog(req,staff,{action:'user.update',entityType:'profile',entityId:id,summary:`Updated ${updatedProfile?.full_name||existing.full_name||'user'} account`,before:existing,after:{...updatedProfile,staff_access:updatedAccess},metadata:{roleOrPermissionChange}});
    return json(res,200,{ok:true});
  }
  if(req.method==='DELETE'){
    const b=parseBody(req); const id=String(b.id||queryParam(req,'id')||''); if(!id)return json(res,400,{ok:false,error:'User id required.'});
    const p=await targetProfile(id); if(!p)return json(res,404,{ok:false,error:'User not found.'});
    const staff=await requireStaff(req,['staff','admin'].includes(p.role)?'staff':'customers');
    if(p.role==='admin'&&staff.profile.role!=='admin')return json(res,403,{ok:false,error:'Only an admin can delete another admin.'});
    if(id===staff.user.id)return json(res,400,{ok:false,error:'You cannot delete the account you are currently using.'});
    await authAdmin(`users/${encodeURIComponent(id)}`,{method:'DELETE'});await auditLog(req,staff,{action:'user.delete',entityType:'profile',entityId:id,summary:`Permanently deleted ${p.full_name||p.email||p.role||'user'} account`,before:p,metadata:{targetRole:p.role}}); return json(res,200,{ok:true,deleted:true});
  }
  return json(res,405,{ok:false,error:'Method not allowed'});
}catch(e){return safeError(res,e)}};
