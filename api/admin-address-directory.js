const crypto=require('crypto');
const {json,parseBody,db,requireStaff,randomId,auditLog,safeError,queryParam}=require('../lib/server');
function cleanPostcode(value=''){const raw=String(value).trim().toUpperCase().replace(/\s+/g,'');return raw.length>3?`${raw.slice(0,-3)} ${raw.slice(-3)}`:raw}
function clean(value='',max=240){return String(value??'').trim().replace(/\s+/g,' ').slice(0,max)}
function norm(value=''){return clean(value,500).toLowerCase()}
function keyFor(postcode,line1,line2){return crypto.createHash('sha256').update(`${cleanPostcode(postcode).replace(/\s/g,'')}|${norm(line1)}|${norm(line2)}`).digest('hex')}
function num(v){if(v===''||v==null)return null;const n=Number(v);return Number.isFinite(n)?n:null}
function mapRow(r,batch){
  const postcode=cleanPostcode(r.postcode||r.postal_code||r.postalcode||'');
  const houseUnit=clean(r.house_unit||r.house||r.number||r.unit||'',120);
  const street=clean(r.street||r.road||'',180);
  const line1=clean(r.address_line1||r.line1||[houseUnit,street].filter(Boolean).join(' '),240);
  const line2=clean(r.address_line2||r.line2||'',240);
  if(!postcode||!line1)return null;
  return {address_key:keyFor(postcode,line1,line2),postcode,house_unit:houseUnit||null,street:street||null,address_line1:line1,address_line2:line2||null,city:clean(r.city||r.town||'',160)||null,district:clean(r.district||r.borough||'',160)||null,region:clean(r.region||r.county||'',160)||null,country_code:clean(r.country_code||'GB',2).toUpperCase()||'GB',latitude:num(r.latitude),longitude:num(r.longitude),source:'admin-import',active:true,verified:true,submitted_by:null,import_batch:batch,updated_at:new Date().toISOString()};
}
module.exports=async function handler(req,res){try{
  const staff=await requireStaff(req,'settings');
  if(req.method==='GET'){
    const postcode=cleanPostcode(queryParam(req,'postcode')||'');
    const state=String(queryParam(req,'state','all')||'all');
    let path='address_directory?select=id,postcode,house_unit,street,address_line1,address_line2,city,district,region,country_code,latitude,longitude,source,active,verified,use_count,created_at,updated_at&order=created_at.desc&limit=200';
    if(postcode)path+=`&postcode=eq.${encodeURIComponent(postcode)}`;
    if(state==='pending')path+='&verified=eq.false';
    if(state==='approved')path+='&verified=eq.true&active=eq.true';
    const rows=await db(path);
    return json(res,200,{ok:true,rows:rows||[]});
  }
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
  const b=parseBody(req),action=String(b.action||'import');
  if(action==='import'){
    const input=Array.isArray(b.rows)?b.rows:[];
    if(!input.length)return json(res,400,{ok:false,error:'No address rows supplied.'});
    if(input.length>500)return json(res,400,{ok:false,error:'Import a maximum of 500 addresses per batch.'});
    const batch=randomId('addr_'),rows=input.map(r=>mapRow(r,batch)).filter(Boolean);
    if(!rows.length)return json(res,400,{ok:false,error:'No valid address rows found. Each row needs postcode and address_line1, or house_unit + street.'});
    await db('address_directory?on_conflict=address_key',{method:'POST',prefer:'resolution=merge-duplicates',body:rows});
    await auditLog(req,staff,{action:'address.import',entityType:'address_directory',entityId:batch,summary:`Imported ${rows.length} approved address${rows.length===1?'':'es'}`,after:{batch,imported:rows.length,skipped:input.length-rows.length}});
    return json(res,200,{ok:true,imported:rows.length,skipped:input.length-rows.length,batch});
  }
  const id=String(b.id||'');
  if(!/^[0-9a-f-]{36}$/i.test(id))return json(res,400,{ok:false,error:'Address ID required.'});
  const before=(await db(`address_directory?id=eq.${encodeURIComponent(id)}&select=*&limit=1`))?.[0]||null;
  if(action==='approve'){const row=(await db(`address_directory?id=eq.${encodeURIComponent(id)}&select=postcode&limit=1`))?.[0];await db(`address_directory?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:{postcode:cleanPostcode(row?.postcode||''),active:true,verified:true,updated_at:new Date().toISOString()}});}
  else if(action==='update'){
    const postcode=cleanPostcode(b.postcode||''),houseUnit=clean(b.houseUnit||'',120),street=clean(b.street||'',180),line1=clean(b.addressLine1||[houseUnit,street].filter(Boolean).join(' '),240),line2=clean(b.addressLine2||'',240),state=String(b.state||'pending');
    if(!postcode||!line1)return json(res,400,{ok:false,error:'Postcode and address line 1 are required.'});
    if(!['pending','approved','disabled'].includes(state))return json(res,400,{ok:false,error:'Invalid address status.'});
    await db(`address_directory?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:{address_key:keyFor(postcode,line1,line2),postcode,house_unit:houseUnit||null,street:street||null,address_line1:line1,address_line2:line2||null,city:clean(b.city||'',160)||null,district:clean(b.district||'',160)||null,region:clean(b.region||'',160)||null,country_code:'GB',latitude:num(b.latitude),longitude:num(b.longitude),verified:state!=='pending',active:state==='approved',updated_at:new Date().toISOString()}});
  }
  else if(action==='disable')await db(`address_directory?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:{active:false,updated_at:new Date().toISOString()}});
  else if(action==='delete')await db(`address_directory?id=eq.${encodeURIComponent(id)}`,{method:'DELETE'});
  else return json(res,400,{ok:false,error:'Unknown address action.'});
  const after=action==='delete'?null:(await db(`address_directory?id=eq.${encodeURIComponent(id)}&select=*&limit=1`))?.[0]||null;
  await auditLog(req,staff,{action:`address.${action}`,entityType:'address_directory',entityId:id,summary:`${String(action).replace('_',' ')} address directory record`,before,after});
  return json(res,200,{ok:true});
}catch(e){return safeError(res,e)}};
