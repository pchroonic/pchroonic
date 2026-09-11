const crypto=require('crypto');
const { json, requireCustomer, db, safeError } = require('../lib/server');
function cleanPostcode(value=''){const raw=String(value).trim().toUpperCase().replace(/\s+/g,'');return raw.length>3?`${raw.slice(0,-3)} ${raw.slice(-3)}`:raw}
function norm(value=''){return String(value).trim().replace(/\s+/g,' ').toLowerCase()}
function keyFor(p){return crypto.createHash('sha256').update(`${cleanPostcode(p.postcode).replace(/\s/g,'')}|${norm(p.address_line1)}|${norm(p.address_line2)}`).digest('hex')}
module.exports=async function handler(req,res){try{
  if(req.method!=='POST')return json(res,405,{ok:false,error:'Method not allowed'});
  const {user,profile}=await requireCustomer(req);
  if(!profile.postcode_verified||!profile.postcode||!profile.address_line1)return json(res,400,{ok:false,error:'Save a verified postcode and address first.'});
  const addressKey=keyFor(profile),now=new Date().toISOString();
  const existing=(await db(`address_directory?address_key=eq.${encodeURIComponent(addressKey)}&select=*&limit=1`))?.[0];
  if(existing){
    const rows=await db(`address_directory?id=eq.${encodeURIComponent(existing.id)}`,{method:'PATCH',prefer:'return=representation',body:{postcode:cleanPostcode(profile.postcode),use_count:Number(existing.use_count||0)+1,last_used_at:now,updated_at:now}});
    const row=rows?.[0]||existing;
    return json(res,200,{ok:true,addressId:row.id,status:row.active&&row.verified?'approved':'pending'});
  }
  const rows=await db('address_directory',{method:'POST',prefer:'return=representation',body:{
    address_key:addressKey,postcode:cleanPostcode(profile.postcode),house_unit:profile.house_unit||null,street:profile.street||null,
    address_line1:String(profile.address_line1).trim(),address_line2:String(profile.address_line2||'').trim()||null,city:profile.city||null,district:profile.district||null,region:profile.region||null,country_code:profile.country_code||'GB',
    latitude:profile.latitude,longitude:profile.longitude,source:'customer-profile',active:false,verified:false,submitted_by:user.id,use_count:1,last_used_at:now,updated_at:now
  }});
  return json(res,201,{ok:true,addressId:rows?.[0]?.id,status:'pending'});
}catch(e){return safeError(res,e)}};
