const {json,db,requireStaff,auditLog,safeError,queryParam,parseBody}=require('../lib/server');
function cleanPostcode(value=''){const raw=String(value).trim().toUpperCase().replace(/\s+/g,'');return raw.length>3?`${raw.slice(0,-3)} ${raw.slice(-3)}`:raw}
module.exports=async function handler(req,res){try{
  const staff=await requireStaff(req,'settings');
  if(req.method==='GET'){
    const postcode=cleanPostcode(queryParam(req,'postcode')||'');
    const datasets=await db('address_dataset_registry?select=*&order=updated_at.desc').catch(()=>[]);
    let sample=[];
    if(postcode)sample=await db(`master_addresses?postcode=eq.${encodeURIComponent(postcode)}&active=eq.true&select=id,display_address,postcode,uprn,udprn,source_dataset,dataset_version&order=display_address.asc&limit=200`).catch(()=>[]);
    return json(res,200,{ok:true,datasets:datasets||[],postcode,rows:sample||[],count:(sample||[]).length});
  }
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
  const b=parseBody(req),action=String(b.action||'');
  if(action==='dataset-status'){
    const key=String(b.sourceDataset||'').trim();
    if(!key)return json(res,400,{ok:false,error:'Dataset key required.'});
    const before=(await db(`address_dataset_registry?source_dataset=eq.${encodeURIComponent(key)}&select=*&limit=1`))?.[0]||null;
    await db(`address_dataset_registry?source_dataset=eq.${encodeURIComponent(key)}`,{method:'PATCH',body:{active:!!b.active,updated_at:new Date().toISOString()}});
    await db(`master_addresses?source_dataset=eq.${encodeURIComponent(key)}`,{method:'PATCH',body:{active:!!b.active,updated_at:new Date().toISOString()}});
    const after=(await db(`address_dataset_registry?source_dataset=eq.${encodeURIComponent(key)}&select=*&limit=1`))?.[0]||null;await auditLog(req,staff,{action:'address_dataset.status',entityType:'address_dataset_registry',entityId:key,summary:`${b.active?'Enabled':'Disabled'} master address dataset ${key}`,before,after});
    return json(res,200,{ok:true});
  }
  return json(res,400,{ok:false,error:'Unknown master address action.'});
}catch(e){return safeError(res,e)}};
