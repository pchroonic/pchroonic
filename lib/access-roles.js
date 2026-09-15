const {db,requireStaff}=require('./server');

const PERMISSIONS=['quotes','bookings','payments','tickets','inbox','pricing','content','customers','staff','loyalty','newsletter','analytics','settings','legal','chat'];
const SYSTEM_ROLE_KEYS=['owner','administrator'];

function normalizePermissions(input={}){
  const source=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
  return Object.fromEntries(PERMISSIONS.map(key=>[key,source[key]===true]));
}
function allPermissions(){return Object.fromEntries(PERMISSIONS.map(key=>[key,true]))}
function cleanRoleKey(value=''){return String(value||'').trim().toLowerCase()}

async function accessForUser(userId){
  if(!userId)return null;
  return (await db(`staff_access?user_id=eq.${encodeURIComponent(userId)}&select=user_id,permissions,job_title,active,role_key&limit=1`).catch(()=>[]))?.[0]||null;
}

async function roleByKey(key){
  const roleKey=cleanRoleKey(key);if(!roleKey)return null;
  return (await db(`staff_roles?key=eq.${encodeURIComponent(roleKey)}&select=key,name,description,permissions,system_role,active,created_at,updated_at&limit=1`).catch(()=>[]))?.[0]||null;
}

async function actorRoleKey(staff){
  const access=await accessForUser(staff?.user?.id);
  if(access?.role_key)return access.role_key;
  return staff?.profile?.role==='admin'?'administrator':null;
}

async function isOwner(staff){
  if(staff?.profile?.role!=='admin')return false;
  return (await actorRoleKey(staff))==='owner';
}

async function requireOwner(req){
  const staff=await requireStaff(req,'staff');
  if(!(await isOwner(staff))){
    const error=new Error('Owner access is required to manage Namdar access roles.');
    error.status=403;
    throw error;
  }
  return staff;
}

async function roleForAssignment(roleKey,profileRole){
  const key=cleanRoleKey(roleKey);
  if(!key)return null;
  const role=await roleByKey(key);
  if(!role||role.active===false){const error=new Error('The selected access role is not available.');error.status=400;throw error}
  if(profileRole==='admin'&&!SYSTEM_ROLE_KEYS.includes(key)){
    const error=new Error('Admin accounts can only use the Owner or Administrator access role.');error.status=400;throw error;
  }
  if(profileRole==='staff'&&SYSTEM_ROLE_KEYS.includes(key)){
    const error=new Error('Owner and Administrator access roles require an Admin account type.');error.status=400;throw error;
  }
  return role;
}

module.exports={PERMISSIONS,SYSTEM_ROLE_KEYS,normalizePermissions,allPermissions,cleanRoleKey,accessForUser,roleByKey,actorRoleKey,isOwner,requireOwner,roleForAssignment};
