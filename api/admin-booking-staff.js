const {json,db,requireStaff,safeError}=require('../lib/server');
module.exports=async function handler(req,res){
  try{
    if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
    await requireStaff(req,'bookings');
    const [profiles,access]=await Promise.all([
      db('profiles?role=in.(staff,admin)&select=id,full_name,email,role,account_status&order=full_name.asc'),
      db('staff_access?select=user_id,job_title,permissions,active')
    ]);
    const accessMap=Object.fromEntries((access||[]).map(x=>[x.user_id,x]));
    const staff=(profiles||[]).filter(p=>{
      if((p.account_status||'active')!=='active')return false;
      if(p.role==='admin')return true;
      const a=accessMap[p.id];return !!(a?.active&&a?.permissions?.bookings===true);
    }).map(p=>({id:p.id,full_name:p.full_name,email:p.email,role:p.role,job_title:p.role==='admin'?'Administrator':accessMap[p.id]?.job_title||'Staff'}));
    return json(res,200,{ok:true,staff});
  }catch(e){return safeError(res,e)}
};
