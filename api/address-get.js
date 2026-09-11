const { json, requireCustomer, db, safeError, queryParam } = require('../lib/server');
function premise(a){return [a.sub_building_name,a.building_name,a.building_number].filter(Boolean).join(', ')}
function street(a){return [a.dependent_thoroughfare,a.thoroughfare].filter(Boolean).join(', ')}
module.exports=async function handler(req,res){try{
  if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
  const id=String(queryParam(req,'id')||'').trim();
  if(id==='saved-profile'){
    const {profile}=await requireCustomer(req);
    return json(res,200,{ok:true,address:{
      postcode:profile.postcode||'',line1:profile.address_line1||'',line2:profile.address_line2||'',city:profile.city||'',
      district:profile.district||'',region:profile.region||'',country:profile.country_code==='GB'?'United Kingdom':'',countryCode:profile.country_code||'GB',latitude:profile.latitude,longitude:profile.longitude,
      houseUnit:profile.house_unit||'',street:profile.street||'',source:'saved-profile'
    }});
  }
  if(id.startsWith('master:')){
    const numeric=id.slice('master:'.length);
    if(!/^\d+$/.test(numeric))return json(res,404,{ok:false,error:'Saved address not found.'});
    const rows=await db(`master_addresses?id=eq.${encodeURIComponent(numeric)}&active=eq.true&select=id,postcode,organisation_name,department_name,po_box_number,sub_building_name,building_name,building_number,dependent_thoroughfare,thoroughfare,double_dependent_locality,dependent_locality,post_town,address_line1,address_line2,address_line3,display_address,city,district,region,country_code,latitude,longitude,uprn,udprn,source_dataset&limit=1`);
    const a=rows?.[0];
    if(!a)return json(res,404,{ok:false,error:'Saved address not found.'});
    return json(res,200,{ok:true,address:{
      postcode:a.postcode,line1:a.address_line1,line2:a.address_line2||'',line3:a.address_line3||'',city:a.city||a.post_town||'',district:a.district||'',region:a.region||'',country:a.country_code==='GB'?'United Kingdom':'',countryCode:a.country_code||'GB',latitude:a.latitude,longitude:a.longitude,
      houseUnit:premise(a),street:street(a),displayAddress:a.display_address,uprn:a.uprn||'',udprn:a.udprn||'',source:'namdar-master',dataset:a.source_dataset
    }});
  }
  if(!id.startsWith('directory:'))return json(res,404,{ok:false,error:'Saved address not found.'});
  const uuid=id.slice('directory:'.length);
  if(!/^[0-9a-f-]{36}$/i.test(uuid))return json(res,404,{ok:false,error:'Saved address not found.'});
  const rows=await db(`address_directory?id=eq.${encodeURIComponent(uuid)}&active=eq.true&verified=eq.true&select=id,postcode,house_unit,street,address_line1,address_line2,city,district,region,country_code,latitude,longitude&limit=1`);
  const a=rows?.[0];
  if(!a)return json(res,404,{ok:false,error:'Saved address not found.'});
  return json(res,200,{ok:true,address:{postcode:a.postcode,line1:a.address_line1,line2:a.address_line2||'',city:a.city||'',district:a.district||'',region:a.region||'',country:a.country_code==='GB'?'United Kingdom':'',countryCode:a.country_code||'GB',latitude:a.latitude,longitude:a.longitude,houseUnit:a.house_unit||'',street:a.street||'',source:'namdar-directory'}});
}catch(e){return safeError(res,e)}};
