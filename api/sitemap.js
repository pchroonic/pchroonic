const {db,safeError}=require('../lib/server');
const {loadServiceCatalog}=require('../lib/service-catalog');
module.exports=async function handler(req,res){try{
  if(req.method!=='GET'){res.statusCode=405;return res.end('Method not allowed')}
  const [services,jobs]=await Promise.all([
    loadServiceCatalog(db),
    db('portfolio_jobs?published=eq.true&select=id,service_key,completed_at&order=completed_at.desc.nullslast&limit=500').catch(()=>[])
  ]);
  const live=services.filter(s=>s.status==='live'),liveKeys=new Set(live.map(s=>s.service_key));
  const urls=['',...live.map(s=>`/services/${s.slug}`),'/areas/london','/areas/south-london','/areas/lewisham','/work','/privacy','/terms','/cookies'];
  for(const j of jobs||[])if(liveKeys.has(j.service_key))urls.push('/work/'+encodeURIComponent(j.id));
  const body='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(u=>'  <url><loc>https://namdar.co.uk'+u+'</loc></url>').join('\n')+'\n</urlset>';
  res.statusCode=200;res.setHeader('Content-Type','application/xml; charset=utf-8');res.setHeader('Cache-Control','public, max-age=120, s-maxage=300');res.end(body)
}catch(e){return safeError(res,e)}};
