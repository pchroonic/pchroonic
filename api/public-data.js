const { json, db, safeError, safeHttpsUrl } = require('../lib/server');
module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') return json(res, 405, { ok:false, error:'Method not allowed' });
    const [pricing, offers, jobs, settingsRows, areas, presence] = await Promise.all([
      db('pricing_rules?select=service_key,base_price,unit_price,configuration&order=service_key.asc'),
      db('offers?active=eq.true&select=id,title,body,discount_type,discount_value,starts_at,ends_at&order=starts_at.desc.nullslast'),
      db('portfolio_jobs?published=eq.true&select=id,title,service_key,description,location_label,image_urls,tour_url,completed_at&order=completed_at.desc.nullslast,created_at.desc&limit=12'),
      db('site_settings?select=key,value'),
      db('service_areas?active=eq.true&select=id,label,country_code,region,city,district,latitude,longitude,radius_km,geojson,coverage_mode,include_postcodes,exclude_postcodes,admin_area_codes,admin_area_names,service_keys,priority&order=priority.desc,label.asc'),
      db('staff_presence?online=eq.true&select=user_id,display_name,last_seen_at&limit=20')
    ]);
    const now = Date.now();
    const activeOffers = (offers || []).filter(o => (!o.starts_at || new Date(o.starts_at).getTime() <= now) && (!o.ends_at || new Date(o.ends_at).getTime() >= now));
    const publicKeys=new Set(['brand','appearance','maintenance','advertising','contact']);
    const settings = Object.fromEntries((settingsRows||[]).filter(x=>publicKeys.has(x.key)).map(x=>[x.key,x.value]));
    if(settings.brand?.logo_url)settings.brand={...settings.brand,logo_url:safeHttpsUrl(settings.brand.logo_url)};
    const publicJobs=(jobs||[]).map(j=>({...j,image_urls:(j.image_urls||[]).map(safeHttpsUrl).filter(Boolean),tour_url:safeHttpsUrl(j.tour_url||'')||null}));
    res.setHeader('Cache-Control', 'public, max-age=20, s-maxage=45');
    const publicAreas=(areas||[]).filter(a=>{const lat=Number(a.latitude),lng=Number(a.longitude),r=Number(a.radius_km||0);return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&Number.isFinite(r)&&r>0});
    return json(res, 200, { ok:true, pricing, offers:activeOffers, jobs:publicJobs, settings, serviceAreas:publicAreas, liveStaffOnline:(presence||[]).length>0 });
  } catch (e) { return safeError(res, e); }
};
