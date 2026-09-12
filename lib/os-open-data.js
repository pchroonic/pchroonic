'use strict';

const OS_PRODUCTS = Object.freeze({
  codepoint: Object.freeze({
    dataset: 'code-point-open',
    productId: 'CodePointOpen',
    downloadUrl: 'https://api.os.uk/downloads/v1/products/CodePointOpen/downloads?area=GB&format=CSV&redirect',
    expectedRefreshDays: 92
  }),
  uprn: Object.freeze({
    dataset: 'os-open-uprn',
    productId: 'OpenUPRN',
    downloadUrl: 'https://api.os.uk/downloads/v1/products/OpenUPRN/downloads?area=GB&format=CSV&redirect',
    expectedRefreshDays: 42
  })
});

function parseCsvLine(line='') {
  const out=[];
  let value='', quoted=false;
  for(let i=0;i<String(line).length;i++){
    const ch=line[i];
    if(quoted){
      if(ch==='"'&&line[i+1]==='"'){value+='"';i++;}
      else if(ch==='"')quoted=false;
      else value+=ch;
    }else if(ch==='"')quoted=true;
    else if(ch===','){out.push(value);value='';}
    else value+=ch;
  }
  out.push(value);
  return out;
}

function cleanPostcode(value='') {
  const raw=String(value||'').trim().toUpperCase().replace(/\s+/g,'');
  return raw.length>3?`${raw.slice(0,-3)} ${raw.slice(-3)}`:raw;
}
function isFullPostcode(value='') {
  return /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/i.test(cleanPostcode(value));
}
function cleanUprn(value='') {
  const text=String(value||'').trim();
  return /^\d{1,12}$/.test(text)?text:'';
}
function numeric(value) {
  const n=Number(value);
  return Number.isFinite(n)?n:null;
}
function nullableText(value='') {
  const text=String(value??'').trim();
  return text||null;
}

// EPSG:27700 British National Grid -> WGS84 using the standard Airy 1830
// inverse projection followed by the OSGB36/WGS84 Helmert transform.
function bngToWgs84(easting,northing) {
  const E=Number(easting),N=Number(northing);
  if(!Number.isFinite(E)||!Number.isFinite(N)||E<=0||N<=0)return{latitude:null,longitude:null};
  const a=6377563.396,b=6356256.909,F0=0.9996012717;
  const lat0=49*Math.PI/180,lon0=-2*Math.PI/180,N0=-100000,E0=400000;
  const e2=1-(b*b)/(a*a),n=(a-b)/(a+b);
  let lat=lat0,M=0;
  do{
    lat=(N-N0-M)/(a*F0)+lat;
    const Ma=(1+n+(5/4)*n*n+(5/4)*n*n*n)*(lat-lat0);
    const Mb=(3*n+3*n*n+(21/8)*n*n*n)*Math.sin(lat-lat0)*Math.cos(lat+lat0);
    const Mc=((15/8)*n*n+(15/8)*n*n*n)*Math.sin(2*(lat-lat0))*Math.cos(2*(lat+lat0));
    const Md=(35/24)*n*n*n*Math.sin(3*(lat-lat0))*Math.cos(3*(lat+lat0));
    M=b*F0*(Ma-Mb+Mc-Md);
  }while(N-N0-M>=0.00001);
  const sinLat=Math.sin(lat),cosLat=Math.cos(lat),tanLat=Math.tan(lat);
  const nu=a*F0/Math.sqrt(1-e2*sinLat*sinLat);
  const rho=a*F0*(1-e2)/Math.pow(1-e2*sinLat*sinLat,1.5);
  const eta2=nu/rho-1,dE=E-E0;
  const VII=tanLat/(2*rho*nu);
  const VIII=tanLat/(24*rho*Math.pow(nu,3))*(5+3*tanLat*tanLat+eta2-9*tanLat*tanLat*eta2);
  const IX=tanLat/(720*rho*Math.pow(nu,5))*(61+90*tanLat*tanLat+45*Math.pow(tanLat,4));
  const X=1/(cosLat*nu);
  const XI=1/(cosLat*6*Math.pow(nu,3))*(nu/rho+2*tanLat*tanLat);
  const XII=1/(cosLat*120*Math.pow(nu,5))*(5+28*tanLat*tanLat+24*Math.pow(tanLat,4));
  const XIIA=1/(cosLat*5040*Math.pow(nu,7))*(61+662*tanLat*tanLat+1320*Math.pow(tanLat,4)+720*Math.pow(tanLat,6));
  const latO=lat-VII*dE*dE+VIII*Math.pow(dE,4)-IX*Math.pow(dE,6);
  const lonO=lon0+X*dE-XI*Math.pow(dE,3)+XII*Math.pow(dE,5)-XIIA*Math.pow(dE,7);

  const nuO=a/Math.sqrt(1-e2*Math.sin(latO)**2);
  const x1=nuO*Math.cos(latO)*Math.cos(lonO);
  const y1=nuO*Math.cos(latO)*Math.sin(lonO);
  const z1=(1-e2)*nuO*Math.sin(latO);
  const tx=446.448,ty=-125.157,tz=542.060,s=20.4894e-6;
  const rx=0.1502/3600*Math.PI/180,ry=0.2470/3600*Math.PI/180,rz=0.8421/3600*Math.PI/180;
  const x2=tx+(1+s)*x1-rz*y1+ry*z1;
  const y2=ty+rz*x1+(1+s)*y1-rx*z1;
  const z2=tz-ry*x1+rx*y1+(1+s)*z1;
  const a2=6378137,b2=6356752.3141,e22=1-(b2*b2)/(a2*a2);
  const p=Math.sqrt(x2*x2+y2*y2);
  let latW=Math.atan2(z2,p*(1-e22)),previous;
  do{
    previous=latW;
    const nuW=a2/Math.sqrt(1-e22*Math.sin(latW)**2);
    latW=Math.atan2(z2+e22*nuW*Math.sin(latW),p);
  }while(Math.abs(latW-previous)>1e-12);
  return{latitude:latW*180/Math.PI,longitude:Math.atan2(y2,x2)*180/Math.PI};
}

function codePointRecord(line,{datasetVersion,coverageScope='GB',importRunId=null}={}) {
  const fields=Array.isArray(line)?line:parseCsvLine(line);
  if(fields.length<10)return null;
  const postcode=cleanPostcode(fields[0]);
  if(!isFullPostcode(postcode))return null;
  const pqi=numeric(fields[1]),easting=numeric(fields[2]),northing=numeric(fields[3]);
  const geo=pqi===90?{latitude:null,longitude:null}:bngToWgs84(easting,northing);
  return{
    postcode,
    source_dataset:'code-point-open',
    positional_quality_indicator:pqi,
    easting,
    northing,
    latitude:geo.latitude,
    longitude:geo.longitude,
    country_code:nullableText(fields[4]),
    nhs_regional_ha_code:nullableText(fields[5]),
    nhs_ha_code:nullableText(fields[6]),
    admin_county_code:nullableText(fields[7]),
    admin_district_code:nullableText(fields[8]),
    admin_ward_code:nullableText(fields[9]),
    dataset_version:String(datasetVersion||'unknown'),
    coverage_scope:String(coverageScope||'GB'),
    import_run_id:importRunId||null,
    active:true,
    last_seen_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  };
}

function normaliseHeader(value='') {
  return String(value||'').trim().toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'');
}
function headerMap(headerLine) {
  const fields=Array.isArray(headerLine)?headerLine:parseCsvLine(headerLine);
  const map={};
  fields.forEach((field,index)=>{map[normaliseHeader(field)]=index;});
  return map;
}
function openUprnRecord(line,headers,{datasetVersion,coverageScope='GB',importRunId=null}={}) {
  const fields=Array.isArray(line)?line:parseCsvLine(line),h=headers||{};
  const get=(...names)=>{
    for(const name of names){const idx=h[normaliseHeader(name)];if(idx!==undefined)return fields[idx];}
    return '';
  };
  const uprn=cleanUprn(get('UPRN'));
  if(!uprn)return null;
  const easting=numeric(get('X_COORDINATE','X COORDINATE','EASTING'));
  const northing=numeric(get('Y_COORDINATE','Y COORDINATE','NORTHING'));
  let latitude=numeric(get('LATITUDE')),longitude=numeric(get('LONGITUDE'));
  if((latitude===null||longitude===null)&&easting&&northing){const geo=bngToWgs84(easting,northing);latitude=geo.latitude;longitude=geo.longitude;}
  return{
    uprn,
    location_source_dataset:'os-open-uprn',
    source_record_id:uprn,
    easting,
    northing,
    latitude,
    longitude,
    dataset_version:String(datasetVersion||'unknown'),
    coverage_scope:String(coverageScope||'GB'),
    import_run_id:importRunId||null,
    active:true,
    last_seen_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  };
}

function pointInRing(lon,lat,ring=[]) {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const xi=Number(ring[i]?.[0]),yi=Number(ring[i]?.[1]);
    const xj=Number(ring[j]?.[0]),yj=Number(ring[j]?.[1]);
    if(![xi,yi,xj,yj].every(Number.isFinite))continue;
    const intersects=((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/((yj-yi)||Number.EPSILON)+xi);
    if(intersects)inside=!inside;
  }
  return inside;
}
function pointInPolygon(lon,lat,polygon=[]) {
  let inside=false;
  for(const ring of polygon){if(pointInRing(lon,lat,ring))inside=!inside;}
  return inside;
}
function pointInGeoJson(lon,lat,input) {
  lon=Number(lon);lat=Number(lat);
  if(!Number.isFinite(lon)||!Number.isFinite(lat)||!input)return false;
  const geo=typeof input==='string'?JSON.parse(input):input;
  if(geo.type==='Feature')return pointInGeoJson(lon,lat,geo.geometry);
  if(geo.type==='FeatureCollection')return (geo.features||[]).some(feature=>pointInGeoJson(lon,lat,feature));
  if(geo.type==='Polygon')return pointInPolygon(lon,lat,geo.coordinates||[]);
  if(geo.type==='MultiPolygon')return (geo.coordinates||[]).some(polygon=>pointInPolygon(lon,lat,polygon));
  return false;
}
function haversineKm(lat1,lon1,lat2,lon2) {
  const values=[lat1,lon1,lat2,lon2].map(Number);if(!values.every(Number.isFinite))return Infinity;
  const [a,b,c,d]=values.map(v=>v*Math.PI/180),dLat=c-a,dLon=d-b;
  const h=Math.sin(dLat/2)**2+Math.cos(a)*Math.cos(c)*Math.sin(dLon/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
function inServiceArea(latitude,longitude,areas=[]) {
  for(const area of areas||[]){
    if(area?.geojson&&pointInGeoJson(longitude,latitude,area.geojson))return true;
    const radius=Number(area?.radius_km),lat=Number(area?.latitude),lon=Number(area?.longitude);
    if(Number.isFinite(radius)&&radius>0&&haversineKm(latitude,longitude,lat,lon)<=radius)return true;
  }
  return false;
}
function productVersion(product={}) {
  return String(product.version||product.versionDate||product.version_date||product.releaseDate||product.release_date||'').trim();
}

module.exports={
  OS_PRODUCTS,parseCsvLine,cleanPostcode,isFullPostcode,cleanUprn,bngToWgs84,
  codePointRecord,headerMap,openUprnRecord,pointInGeoJson,haversineKm,inServiceArea,productVersion
};
