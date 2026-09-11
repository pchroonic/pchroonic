const { json, queryParam, db, requireStaff, safeError } = require('../lib/server');

const SAFE_LIMIT=500;
function text(v=''){return String(v??'').trim()}
function changedFields(before,after){
  const a=before&&typeof before==='object'&&!Array.isArray(before)?before:{},b=after&&typeof after==='object'&&!Array.isArray(after)?after:{};
  const keys=[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>!['updated_at','created_at'].includes(k));
  return keys.filter(k=>JSON.stringify(a[k]??null)!==JSON.stringify(b[k]??null)).slice(0,80);
}
module.exports=async function handler(req,res){
  try{
    if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
    const staff=await requireStaff(req);
    if(staff.profile.role!=='admin')return json(res,403,{ok:false,error:'Only Namdar administrators can view the activity log.'});
    const q=text(queryParam(req,'q')).toLowerCase().slice(0,120),action=text(queryParam(req,'action','all')),entity=text(queryParam(req,'entity','all')),actor=text(queryParam(req,'actor','all'));
    const all=await db(`audit_logs?select=*&order=created_at.desc&limit=${SAFE_LIMIT}`);
    let rows=all||[];
    if(action!=='all')rows=rows.filter(x=>x.action===action);
    if(entity!=='all')rows=rows.filter(x=>x.entity_type===entity);
    if(actor!=='all')rows=rows.filter(x=>x.actor_user_id===actor);
    if(q)rows=rows.filter(x=>[x.summary,x.action,x.entity_type,x.entity_id,x.actor_name,x.actor_email].join(' ').toLowerCase().includes(q));
    const now=Date.now(),day=86400000;
    const stats={total:(all||[]).length,today:0,last7Days:0,staffActors:new Set(),system:0};
    for(const r of all||[]){const t=new Date(r.created_at).getTime();if(t>=now-day)stats.today++;if(t>=now-7*day)stats.last7Days++;if(r.actor_user_id)stats.staffActors.add(r.actor_user_id);else stats.system++}
    const actors=[...new Map((all||[]).filter(x=>x.actor_user_id).map(x=>[x.actor_user_id,{id:x.actor_user_id,name:x.actor_name||x.actor_email||'Namdar staff',email:x.actor_email||''}])).values()].sort((a,b)=>a.name.localeCompare(b.name));
    const actions=[...new Set((all||[]).map(x=>x.action).filter(Boolean))].sort();
    const entities=[...new Set((all||[]).map(x=>x.entity_type).filter(Boolean))].sort();
    return json(res,200,{ok:true,rows:rows.slice(0,300).map(r=>({...r,changed_fields:changedFields(r.before_data,r.after_data)})),stats:{...stats,staffActors:stats.staffActors.size},actors,actions,entities,retentionNote:'Audit records are server/admin-only and are not exposed through browser RLS policies.'});
  }catch(e){return safeError(res,e)}
};
