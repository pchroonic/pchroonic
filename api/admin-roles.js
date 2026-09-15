const {json,parseBody,db,requireStaff,auditLog,safeError,queryParam}=require('../lib/server');
const {normalizePermissions,actorRoleKey,requireOwner,roleByKey}=require('../lib/access-roles');

function cleanText(value,max=200){return String(value||'').trim().slice(0,max)}
function roleKeyFromName(name=''){
  return String(name||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50);
}
async function allRoles(){return await db('staff_roles?select=key,name,description,permissions,system_role,active,created_at,updated_at&order=system_role.desc,name.asc')||[]}
async function roleUsage(key){return await db(`staff_access?role_key=eq.${encodeURIComponent(key)}&select=user_id`)||[]}

module.exports=async function(req,res){try{
  if(req.method==='GET'){
    const staff=await requireStaff(req,'staff');
    const currentRoleKey=await actorRoleKey(staff);
    return json(res,200,{ok:true,roles:await allRoles(),actorRoleKey:currentRoleKey,canManageRoles:currentRoleKey==='owner'});
  }

  if(req.method==='POST'){
    const staff=await requireOwner(req),b=parseBody(req),name=cleanText(b.name,80),description=cleanText(b.description,300),permissions=normalizePermissions(b.permissions);
    if(name.length<2)return json(res,400,{ok:false,error:'Role name must contain at least 2 characters.'});
    const key=roleKeyFromName(name);
    if(key.length<2||['owner','administrator'].includes(key))return json(res,400,{ok:false,error:'Choose a different role name.'});
    const duplicate=(await allRoles()).some(role=>role.key===key||String(role.name||'').toLowerCase()===name.toLowerCase());
    if(duplicate)return json(res,409,{ok:false,error:'A role with this name already exists.'});
    const created=(await db('staff_roles',{method:'POST',prefer:'return=representation',body:{key,name,description:description||null,permissions,system_role:false,active:true,created_by:staff.user.id}}))?.[0];
    await auditLog(req,staff,{action:'access_role.create',entityType:'staff_role',entityId:key,summary:`Created staff access role ${name}`,after:created});
    return json(res,201,{ok:true,role:created});
  }

  if(req.method==='PATCH'){
    const staff=await requireOwner(req),b=parseBody(req),key=String(b.key||'').trim().toLowerCase();
    if(!key)return json(res,400,{ok:false,error:'Role key is required.'});
    const existing=await roleByKey(key);if(!existing)return json(res,404,{ok:false,error:'Role not found.'});
    if(existing.system_role)return json(res,403,{ok:false,error:'Owner and Administrator are protected system roles and cannot be edited.'});
    const name=b.name===undefined?existing.name:cleanText(b.name,80),description=b.description===undefined?(existing.description||''):cleanText(b.description,300),permissions=b.permissions===undefined?normalizePermissions(existing.permissions):normalizePermissions(b.permissions);
    if(name.length<2)return json(res,400,{ok:false,error:'Role name must contain at least 2 characters.'});
    const duplicate=(await allRoles()).some(role=>role.key!==key&&String(role.name||'').toLowerCase()===name.toLowerCase());
    if(duplicate)return json(res,409,{ok:false,error:'Another role already uses this name.'});
    const updated=(await db(`staff_roles?key=eq.${encodeURIComponent(key)}`,{method:'PATCH',prefer:'return=representation',body:{name,description:description||null,permissions,updated_at:new Date().toISOString()}}))?.[0]||existing;
    await db(`staff_access?role_key=eq.${encodeURIComponent(key)}`,{method:'PATCH',body:{permissions,updated_at:new Date().toISOString()}}).catch(()=>null);
    await auditLog(req,staff,{action:'access_role.update',entityType:'staff_role',entityId:key,summary:`Updated staff access role ${name}`,before:existing,after:updated});
    return json(res,200,{ok:true,role:updated});
  }

  if(req.method==='DELETE'){
    const staff=await requireOwner(req),b=parseBody(req),key=String(b.key||queryParam(req,'key')||'').trim().toLowerCase();
    if(!key)return json(res,400,{ok:false,error:'Role key is required.'});
    const existing=await roleByKey(key);if(!existing)return json(res,404,{ok:false,error:'Role not found.'});
    if(existing.system_role)return json(res,403,{ok:false,error:'Owner and Administrator are protected system roles and cannot be deleted.'});
    const usage=await roleUsage(key);
    if(usage.length)return json(res,409,{ok:false,error:`This role is assigned to ${usage.length} staff account${usage.length===1?'':'s'}. Reassign them before deleting it.`});
    await db(`staff_roles?key=eq.${encodeURIComponent(key)}`,{method:'DELETE'});
    await auditLog(req,staff,{action:'access_role.delete',entityType:'staff_role',entityId:key,summary:`Deleted staff access role ${existing.name}`,before:existing});
    return json(res,200,{ok:true,deleted:true});
  }

  return json(res,405,{ok:false,error:'Method not allowed'});
}catch(error){return safeError(res,error)}};
