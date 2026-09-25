const {db,safeError}=require('../lib/server');
const {loadServiceCatalog}=require('../lib/service-catalog');
const cleanDate=v=>/^\d{4}-\d{2}-\d{2}/.test(String(v||''))?String(v).slice(0,10):null;
const PAGE_LASTMOD=Object.freeze({'window-cleaning':'2026-09-25'});
module.exports=async function handler(req,res){try{
  if(req.method!=='GET'){res.statusCode=405;return res.end('Method not allowed')}
  const [services,jobs]=await Promise.all([
    loadServiceCatalog(db),
    db('portfolio_jobs?published=eq.true&select=id,service_key,completed_at&order=completed_at.desc.nullslast&limit=500').catch(()=>[])
  ]);
  const live=services.filter(s=>s.status==='live'),liveKeys=new Set(live.map(s=>s.service_key));
  const urls=[
    {path:'',lastmod:'2026-09-25'},
    ...live.map(s=>({path:`/services/${s.slug}`,lastmod:PAGE_LASTMOD[s.slug]||cleanDate(s.updated_at)||cleanDate(s.live_since)||'2026-09-25'})),
    {path:'/areas/london',lastmod:'2026-09-25'},
    {path:'/areas/south-london',lastmod:'2026-09-25'},
    {path:'/areas/lewisham',lastmod:'2026-09-25'},
    {path:'/work'},
    {path:'/privacy'},
    {path:'/terms'},
    {path:'/cookies'}
  ];
  for(const j of jobs||[])if(liveKeys.has(j.service_key))urls.push({path:'/work/'+encodeURIComponent(j.id),lastmod:cleanDate(j.completed_at)});
  const body='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(x=>`  <url><loc>https://namdar.co.uk${x.path}</loc>${x.lastmod?`<lastmod>${x.lastmod}</lastmod>`:''}</url>`).join('\n')+'\n</urlset>';
  res.statusCode=200;res.setHeader('Content-Type','application/xml; charset=utf-8');res.setHeader('Cache-Control','public, max-age=120, s-maxage=300');res.end(body)
}catch(e){return safeError(res,e)}};
