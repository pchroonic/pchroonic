const {db}=require('./server');

const enc=value=>encodeURIComponent(String(value??''));
const nowIso=()=>new Date().toISOString();

function statusFromFailures(failed,total){
  const f=Math.max(0,Number(failed)||0),t=Math.max(0,Number(total)||0);
  if(!t||f===0)return'healthy';
  return f>=t?'failing':'warning';
}

function freshnessStatus(lastSeen,warningAfterMs,failingAfterMs,now=Date.now()){
  const when=new Date(lastSeen||0).getTime();
  if(!Number.isFinite(when)||when<=0)return{status:'warning',ageMs:null,reason:'no_history'};
  const ageMs=Math.max(0,now-when);
  if(ageMs>failingAfterMs)return{status:'failing',ageMs,reason:'stale'};
  if(ageMs>warningAfterMs)return{status:'warning',ageMs,reason:'late'};
  return{status:'healthy',ageMs,reason:'fresh'};
}

async function createStaffIncidentAlert(incident){
  if(!incident?.id)return;
  const dedupeKey=`system-health:${incident.id}`;
  try{
    const existing=(await db(`staff_notifications?dedupe_key=eq.${enc(dedupeKey)}&select=id&limit=1`))?.[0];
    if(existing)return;
    await db('staff_notifications',{method:'POST',prefer:'return=minimal',body:{
      notification_type:'system_health',
      title:incident.title,
      body:incident.message||'Namdar detected an operational reliability issue.',
      target_path:'/admin?tab=health',
      permission_key:'settings',
      target_user_id:null,
      entity_type:'system_health_incident',
      entity_id:incident.id,
      priority:incident.severity==='failing'?'urgent':'high',
      dedupe_key:dedupeKey
    }});
  }catch(error){
    console.error('Could not queue system health alert',error?.status||'',error?.message||error);
  }
}

async function resolveOpenIncident(fingerprint,runId,details={}){
  if(!fingerprint)return null;
  const rows=await db(`system_health_incidents?fingerprint=eq.${enc(fingerprint)}&status=eq.open&select=id&limit=10`).catch(()=>[]);
  if(!rows?.length)return null;
  const stamp=nowIso();
  await db(`system_health_incidents?fingerprint=eq.${enc(fingerprint)}&status=eq.open`,{method:'PATCH',prefer:'return=minimal',body:{status:'resolved',resolved_at:stamp,last_seen_at:stamp,latest_run_id:runId||null,details,updated_at:stamp}});
  return rows[0];
}

async function openOrTouchIncident({fingerprint,component,severity,title,message,runId,details={}}){
  if(!fingerprint)return null;
  const open=(await db(`system_health_incidents?fingerprint=eq.${enc(fingerprint)}&status=eq.open&select=*&limit=1`).catch(()=>[]))?.[0]||null;
  const stamp=nowIso();
  if(open){
    const updated=(await db(`system_health_incidents?id=eq.${enc(open.id)}`,{method:'PATCH',prefer:'return=representation',body:{severity,title,message,occurrence_count:Number(open.occurrence_count||1)+1,last_seen_at:stamp,latest_run_id:runId||null,details,updated_at:stamp}}))?.[0]||open;
    return{incident:updated,created:false};
  }
  try{
    const created=(await db('system_health_incidents',{method:'POST',prefer:'return=representation',body:{fingerprint,component,severity,title,message,status:'open',occurrence_count:1,first_seen_at:stamp,last_seen_at:stamp,latest_run_id:runId||null,details,created_at:stamp,updated_at:stamp}}))?.[0]||null;
    if(created)await createStaffIncidentAlert(created);
    return{incident:created,created:true};
  }catch(error){
    if(error?.status!==409)throw error;
    const retry=(await db(`system_health_incidents?fingerprint=eq.${enc(fingerprint)}&status=eq.open&select=*&limit=1`))?.[0]||null;
    return{incident:retry,created:false};
  }
}

async function recordHealthState({component,status,summary,source='runtime',startedAt=null,durationMs=null,details={},fingerprint=null,title=null,message=null}){
  if(!component||!['healthy','warning','failing'].includes(status))throw Object.assign(new Error('Valid system health state is required.'),{status:400});
  const finishedAt=nowIso();
  const run=(await db('system_health_runs',{method:'POST',prefer:'return=representation',body:{component,status,summary:String(summary||''),source,started_at:startedAt||null,finished_at:finishedAt,duration_ms:Number.isFinite(Number(durationMs))?Math.max(0,Math.round(Number(durationMs))):null,details}}))?.[0]||null;
  if(fingerprint){
    if(status==='healthy')await resolveOpenIncident(fingerprint,run?.id,details);
    else await openOrTouchIncident({fingerprint,component,severity:status,title:title||summary||'Namdar system warning',message:message||summary||'',runId:run?.id,details});
  }
  return run;
}

module.exports={statusFromFailures,freshnessStatus,recordHealthState,resolveOpenIncident,openOrTouchIncident};
