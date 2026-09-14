const {json,parseBody,db,requireStaff,authAdmin,auditLog,safeError,queryParam}=require('../lib/server');
const {consumeRateLimit}=require('../lib/security');
const {inviteUserByEmail}=require('../lib/auth-invite');

async function targetProfile(id){return (await db(`profiles?id=eq.${encodeURIComponent(id)}&select=*&limit=1`))?.[0]||null}
async function targetStaffAccess(id){return (await db(`staff_access?user_id=eq.${encodeURIComponent(id)}&select=permissions,job_title,active&limit=1`).catch(()=>[]))?.[0]||null}
async function otherActiveAdmins(id){const rows=await db('profiles?role=eq.admin&select=id,account_status');return (rows||[]).filter(x=>x.id!==id&&(!x.account_status||x.account_status==='active'))}
function postcode(value=''){const compact=String(value||'').toUpperCase().replace(/\s+/g,'');return compact.length>3?`${compact.slice(0,-3)} ${compact.slice(-3)}`:compact}
function accountStatus(value,fallback='active'){return ['active','suspended','archived','pending_deletion'].includes(String(value||''))?String(value):fallback}
function validRole(value,fallback='customer'){return ['customer','staff','admin'].includes(String(value||''))?String(value):fallback}

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
    const b=parseBody(req),email=String(b.email||'').trim().toLowerCase(),fullName=String(b.fullName||'').trim(),role=validRole(b.role,'customer');
    const staff=await requireStaff(req,role==='customer'?'customers':'staff');
    if(role==='admin'&&staff.profile.role!=='admin')return json(res,403,{ok:false,error:'Only an administrator can invite another administrator.'});
    if(!email.includes('@')||!fullName)return json(res,400,{ok:false,error:'Name and valid email are required.'});
    await consumeRateLimit(req,res,{scope:'admin.user_invite.actor',limit:30,windowSeconds:3600,identity:`staff:${staff.user.id}`,message:'Too many account invitations were requested in a short time. Please wait and review the recent activity before trying again.'});
    let user=null;
    try{
      const invited=await inviteUserByEmail(req,email,{data:{full_name:fullName,phone:String(b.phone||'').slice(0,40),country_code:'GB'}});user=invited.user;
      const status=accountStatus(b.accountStatus,'active');
      await db(`profiles?id=eq.${encodeURIComponent(user.id)}`,{method:'PATCH',body:{email,full_name:fullName,phone:b.phone||null,postcode:b.postcode?postcode(b.postcode):null,address_line1:b.address1||null,address_line2:b.address2||null,city:b.city||null,district:b.district||null,region:b.region||null,country_code:b.countryCode||'GB',property_type:b.propertyType||null,role,account_status:status,updated_at:new Date().toISOString()}});
      if(role==='staff')await db('staff_access',{method:'POST',prefer:'resolution=merge-duplicates',body:{user_id:user.id,permissions:b.permissions||{},job_title:b.jobTitle||'Staff',active:true,created_by:staff.user.id}});
      await auditLog(req,staff,{action:'user.invite',entityType:'profile',entityId:user.id,summary:`Invited ${role} account for ${fullName}`,after:{email,full_name:fullName,phone:b.phone||null,postcode:b.postcode?postcode(b.postcode):null,role,account_status:status,job_title:role==='staff'?(b.jobTitle||'Staff'):null,permissions:role==='staff'?(b.permissions||{}):null},metadata:{credentialDelivery:'supabase_invitation',temporaryPassword:false}});
      return json(res,201,{ok:true,userId:user.id,invited:true});
    }catch(error){
      if(user?.id)await authAdmin(`users/${encodeURIComponent(user.id)}`,{method:'DELETE'}).catch(()=>null);
      throw error;
    }
  }
  if(req.method==='PATCH'){
    const b=parseBody(req),id=String(b.id||'');if(!id)return json(res,400,{ok:false,error:'User id required.'});
    const existing=await targetProfile(id);if(!existing)return json(res,404,{ok:false,error:'User not found.'});
    const existingAccess=await targetStaffAccess(id),desiredRole=b.role===undefined?existing.role:validRole(b.role,existing.role),desiredStatus=b.accountStatus===undefined?(existing.account_status||'active'):accountStatus(b.accountStatus,existing.account_status||'active');
    const roleOrPermissionChange=desiredRole!==existing.role||b.permissions!==undefined||b.jobTitle!==undefined||b.staffActive!==undefined;
    const staff=await requireStaff(req,(['staff','admin'].includes(existing.role)||['staff','admin'].includes(desiredRole)||roleOrPermissionChange)?'staff':'customers');
    if(existing.role==='admin'&&staff.profile.role!=='admin')return json(res,403,{ok:false,error:'Only an administrator can modify another administrator.'});
    if(desiredRole==='admin'&&staff.profile.role!=='admin')return json(res,403,{ok:false,error:'Only an administrator can promote another administrator.'});
    if(id===staff.user.id&&(desiredRole!==existing.role||desiredStatus!==(existing.account_status||'active')))return json(res,400,{ok:false,error:'For safety, you cannot change the role or account status of the administrator account you are currently using.'});
    if(existing.role==='admin'&&(!existing.account_status||existing.account_status==='active')&&(desiredRole!=='admin'||desiredStatus!=='active')){
      if(!(await otherActiveAdmins(id)).length)return json(res,409,{ok:false,error:'Namdar must keep at least one other active administrator before this administrator can be demoted or suspended.'});
    }
    const patch={updated_at:new Date().toISOString(),role:desiredRole,account_status:desiredStatus};
    for(const [k,v] of Object.entries({full_name:b.fullName,phone:b.phone,email:b.email,address_line1:b.address1,address_line2:b.address2,city:b.city,postcode:b.postcode===undefined?undefined:postcode(b.postcode),country_code:b.countryCode,region:b.region,district:b.district,property_type:b.propertyType}))if(v!==undefined)patch[k]=v===''?null:v;
    await db(`profiles?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:patch});
    if(b.email&&String(b.email).trim().toLowerCase()!==String(existing.email||'').trim().toLowerCase()){
      if(['staff','admin'].includes(existing.role)&&staff.profile.role!=='admin')return json(res,403,{ok:false,error:'Only an administrator can change a privileged account email address.'});
      await authAdmin(`users/${encodeURIComponent(id)}`,{method:'PUT',body:{email:String(b.email).trim().toLowerCase(),email_confirm:true}});
    }
    if(desiredRole==='staff'){
      await db('staff_access',{method:'POST',prefer:'resolution=merge-duplicates',body:{user_id:id,permissions:b.permissions===undefined?(existingAccess?.permissions||{}):(b.permissions||{}),job_title:b.jobTitle===undefined?(existingAccess?.job_title||'Staff'):(b.jobTitle||'Staff'),active:b.staffActive===undefined?(existingAccess?.active!==false):b.staffActive!==false,created_by:staff.user.id,updated_at:new Date().toISOString()}});
    }else if(existingAccess){await db(`staff_access?user_id=eq.${encodeURIComponent(id)}`,{method:'DELETE'}).catch(()=>null)}
    const updatedProfile=await targetProfile(id),updatedAccess=desiredRole==='staff'?await targetStaffAccess(id):null;
    await auditLog(req,staff,{action:'user.update',entityType:'profile',entityId:id,summary:`Updated ${updatedProfile?.full_name||existing.full_name||'user'} account`,before:{...existing,staff_access:existingAccess},after:{...updatedProfile,staff_access:updatedAccess},metadata:{roleOrPermissionChange}});
    return json(res,200,{ok:true});
  }
  if(req.method==='DELETE'){
    const b=parseBody(req),id=String(b.id||queryParam(req,'id')||'');if(!id)return json(res,400,{ok:false,error:'User id required.'});
    const p=await targetProfile(id);if(!p)return json(res,404,{ok:false,error:'User not found.'});
    const staff=await requireStaff(req,['staff','admin'].includes(p.role)?'staff':'customers');
    if(p.role==='admin'&&staff.profile.role!=='admin')return json(res,403,{ok:false,error:'Only an administrator can delete another administrator.'});
    if(id===staff.user.id)return json(res,400,{ok:false,error:'You cannot delete the account you are currently using.'});
    if(p.role==='admin'&&(!p.account_status||p.account_status==='active')&&!(await otherActiveAdmins(id)).length)return json(res,409,{ok:false,error:'Namdar must keep at least one active administrator. Add and verify another administrator before deleting this account.'});
    const access=await targetStaffAccess(id);
    await authAdmin(`users/${encodeURIComponent(id)}`,{method:'DELETE'});
    await auditLog(req,staff,{action:'user.delete',entityType:'profile',entityId:id,summary:`Permanently deleted ${p.full_name||p.email||p.role||'user'} account`,before:{...p,staff_access:access},metadata:{targetRole:p.role}});
    return json(res,200,{ok:true,deleted:true});
  }
  return json(res,405,{ok:false,error:'Method not allowed'});
}catch(e){return safeError(res,e)}};
