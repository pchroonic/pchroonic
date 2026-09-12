'use strict';

const VALID_STATUSES = new Set(['planned','coming_soon','live','paused','retired']);

const SERVICE_DEFINITIONS = Object.freeze([
  Object.freeze({ service_key:'windows', name:'Window Cleaning', short_name:'Windows', slug:'window-cleaning', status:'live', stage_number:1, display_order:10, description:'Exterior window, frame and sill cleaning for homes and commercial properties.' }),
  Object.freeze({ service_key:'gutters', name:'Gutter Cleaning', short_name:'Gutters', slug:'gutter-cleaning', status:'planned', stage_number:2, display_order:20, description:'Gutter clearing and cleaning, ready to launch when Namdar reaches the next service stage.' }),
  Object.freeze({ service_key:'jetwash', name:'Patio & Jet Washing', short_name:'Jet wash', slug:'jet-washing', status:'planned', stage_number:3, display_order:30, description:'Patio, paving, driveway and exterior surface cleaning for a future Namdar stage.' }),
  Object.freeze({ service_key:'roof', name:'Roof Cleaning', short_name:'Roof', slug:'roof-cleaning', status:'planned', stage_number:4, display_order:40, description:'Roof and moss cleaning subject to safe access, planned for a later Namdar stage.' }),
  Object.freeze({ service_key:'handyman', name:'Handyman Services', short_name:'Handyman', slug:'handyman', status:'planned', stage_number:5, display_order:50, description:'Small repairs, fitting and practical property maintenance for a future Namdar stage.' }),
  Object.freeze({ service_key:'tour3d', name:'3D Property Tours', short_name:'3D tour', slug:'3d-property-tours', status:'planned', stage_number:6, display_order:60, description:'Immersive property walkthroughs for a later Namdar service stage.' })
]);

const BY_KEY = new Map(SERVICE_DEFINITIONS.map(x=>[x.service_key,x]));
const BY_SLUG = new Map(SERVICE_DEFINITIONS.map(x=>[x.slug,x]));

function cleanRow(row={}, fallback={}) {
  const status=VALID_STATUSES.has(String(row.status||''))?String(row.status):fallback.status||'planned';
  return {
    service_key:String(row.service_key||fallback.service_key||''),
    name:String(row.name||fallback.name||''),
    short_name:String(row.short_name||fallback.short_name||row.name||fallback.name||''),
    slug:String(row.slug||fallback.slug||''),
    status,
    stage_number:Number(row.stage_number??fallback.stage_number??0),
    display_order:Number(row.display_order??fallback.display_order??999),
    description:String(row.description||fallback.description||''),
    live_since:row.live_since||null,
    updated_at:row.updated_at||null
  };
}

function mergeCatalog(rows=[]) {
  const dbRows=new Map((rows||[]).map(row=>[String(row.service_key||''),row]));
  const merged=SERVICE_DEFINITIONS.map(def=>cleanRow(dbRows.get(def.service_key)||{},def));
  for(const row of rows||[]){
    const key=String(row.service_key||'');
    if(key&&!BY_KEY.has(key))merged.push(cleanRow(row,{status:'planned'}));
  }
  return merged.sort((a,b)=>a.display_order-b.display_order||a.name.localeCompare(b.name));
}

async function loadServiceCatalog(db) {
  try {
    const rows=await db('service_catalog?select=service_key,name,short_name,slug,status,stage_number,display_order,description,live_since,updated_at&order=display_order.asc,name.asc');
    return mergeCatalog(rows||[]);
  } catch (error) {
    console.warn('Service catalog unavailable; using safe window-only fallback:',error.message);
    return mergeCatalog([]);
  }
}

async function serviceByKey(db,key) {
  const catalog=await loadServiceCatalog(db);
  return catalog.find(x=>x.service_key===String(key||''))||null;
}

function serviceBySlug(catalog,slug) {
  const value=String(slug||'').replace(/^\/+|\/+$/g,'');
  return (catalog||[]).find(x=>x.slug===value)||BY_SLUG.get(value)||null;
}

function isLive(service) { return service?.status==='live'; }
function isPubliclyVisible(service) { return service?.status==='live'||service?.status==='coming_soon'||service?.status==='paused'; }
function publicService(service={}) {
  return {
    serviceKey:service.service_key||'',
    name:service.name||'',
    shortName:service.short_name||service.name||'',
    slug:service.slug||'',
    status:service.status||'planned',
    stage:Number(service.stage_number||0),
    displayOrder:Number(service.display_order||999),
    description:service.description||'',
    liveSince:service.live_since||null,
    live:service.status==='live',
    quotable:service.status==='live',
    public: isPubliclyVisible(service)
  };
}
function unavailableMessage(service) {
  if(!service)return 'Choose a valid Namdar service.';
  if(service.status==='coming_soon')return `${service.name} is coming soon but is not available for quotes yet.`;
  if(service.status==='paused')return `${service.name} is temporarily unavailable for new quotes.`;
  if(service.status==='retired')return `${service.name} is no longer available for new quotes.`;
  return `${service.name} is planned for a future Namdar stage and is not available yet.`;
}

module.exports={VALID_STATUSES,SERVICE_DEFINITIONS,mergeCatalog,loadServiceCatalog,serviceByKey,serviceBySlug,isLive,isPubliclyVisible,publicService,unavailableMessage};
