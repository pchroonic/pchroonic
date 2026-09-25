const {db,safeError,safeHttpsUrl}=require('../lib/server');
const {loadServiceCatalog}=require('../lib/service-catalog');

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cleanDate=v=>/^\d{4}-\d{2}-\d{2}/.test(String(v||''))?String(v).slice(0,10):'';

function shell({title,description,body,robots='',ogImage=''}) {
  const robotsMeta=robots?`<meta name="robots" content="${esc(robots)}">`:'';
  const imageMeta=ogImage?`<meta property="og:image" content="${esc(ogImage)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(ogImage)}">`:'<meta name="twitter:card" content="summary">';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${robotsMeta}<title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="https://namdar.co.uk/work"><meta property="og:type" content="website"><meta property="og:site_name" content="Namdar"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="https://namdar.co.uk/work">${imageMeta}<link rel="stylesheet" href="/styles.css"></head><body class="seo-page"><header class="site-header"><a class="brand" href="/" aria-label="Namdar home"><span class="brand-mark">N</span><span>NAMDAR</span></a><button class="mobile-menu" type="button" aria-label="Open navigation" aria-expanded="false">☰</button><nav class="nav-links"><a href="/#services">Window Cleaning</a><a href="/areas/london">Areas</a><a href="/work">Our work</a><a href="/#contact">Contact</a></nav><div class="header-actions"><a class="ghost-btn" href="/account">Customer login</a><a class="primary-btn small" href="/?service=windows#quote">Get a quote</a></div></header><main>${body}</main><footer><a class="brand" href="/"><span class="brand-mark">N</span><span>NAMDAR</span></a><p>Window Cleaning · More Namdar services will launch in stages</p><div><a href="/services/window-cleaning">Window Cleaning</a><a href="/areas/london">Service areas</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div></footer><script src="/seo-page.js"></script></body></html>`;
}

module.exports=async function handler(req,res){try{
  if(req.method!=='GET'){res.statusCode=405;return res.end('Method not allowed')}
  const [services,jobs]=await Promise.all([
    loadServiceCatalog(db),
    db('portfolio_jobs?published=eq.true&select=id,title,service_key,description,location_label,image_urls,tour_url,completed_at&order=completed_at.desc.nullslast,created_at.desc&limit=100').catch(()=>[])
  ]);
  const liveKeys=new Set((services||[]).filter(s=>s.status==='live').map(s=>s.service_key));
  const publicJobs=(jobs||[]).filter(j=>liveKeys.has(j.service_key)).map(j=>({
    ...j,
    image_urls:(j.image_urls||[]).map(safeHttpsUrl).filter(Boolean),
    tour_url:safeHttpsUrl(j.tour_url||'')||null
  }));
  res.setHeader('Content-Type','text/html; charset=utf-8');
  if(!publicJobs.length){
    res.statusCode=404;
    res.setHeader('X-Robots-Tag','noindex, follow');
    res.setHeader('Cache-Control','public, max-age=30, s-maxage=60');
    return res.end(shell({
      title:'Published Work Coming Soon | Namdar',
      description:'Namdar only publishes completed Window Cleaning case studies after genuine work has been reviewed and approved for public display.',
      robots:'noindex,follow',
      body:'<section class="seo-hero section-pad"><div class="seo-breadcrumbs"><a href="/">Home</a><span>›</span><span>Our work</span></div><div class="eyebrow">Real work only</div><h1>No public case studies yet.</h1><p>Namdar only publishes genuine completed Window Cleaning work after it has been deliberately approved for public display.</p><div class="hero-actions"><a class="primary-btn" href="/?service=windows#quote">Get a Window Cleaning estimate</a><a class="ghost-btn" href="/services/window-cleaning">View Window Cleaning</a></div></section>'
    }));
  }
  const cards=publicJobs.map(j=>{
    const image=j.image_urls?.[0]?`<img src="${esc(j.image_urls[0])}" alt="${esc(j.title)}" loading="lazy">`:'';
    return `<article class="job-card">${image}<div class="job-body"><small>${esc(j.location_label||'')}</small><h2><a href="/work/${encodeURIComponent(j.id)}">${esc(j.title)}</a></h2><p>${esc(j.description||'Completed by Namdar.')}</p><a class="text-link" href="/work/${encodeURIComponent(j.id)}">View project →</a></div></article>`;
  }).join('');
  const firstImage=publicJobs.flatMap(j=>j.image_urls||[])[0]||'';
  const itemList=publicJobs.map((j,i)=>({"@type":"ListItem",position:i+1,url:`https://namdar.co.uk/work/${encodeURIComponent(j.id)}`,name:String(j.title||'Namdar Window Cleaning project')}));
  const schema=JSON.stringify({"@context":"https://schema.org","@graph":[{"@type":"CollectionPage","@id":"https://namdar.co.uk/work#page","url":"https://namdar.co.uk/work","name":"Window Cleaning Case Studies | Namdar","description":"Genuine completed Window Cleaning work published by Namdar."},{"@type":"ItemList","itemListElement":itemList},{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://namdar.co.uk/"},{"@type":"ListItem","position":2,"name":"Our work","item":"https://namdar.co.uk/work"}]}]}).replace(/</g,'\\u003c');
  res.statusCode=200;
  res.setHeader('Cache-Control','public, max-age=60, s-maxage=120');
  return res.end(shell({
    title:'Window Cleaning Case Studies | Namdar',
    description:'See genuine completed Namdar Window Cleaning work from our live London service area, published only after the team approves it for public display.',
    ogImage:firstImage,
    body:`<script type="application/ld+json">${schema}</script><section class="seo-hero section-pad"><div class="seo-breadcrumbs"><a href="/">Home</a><span>›</span><span>Our work</span></div><div class="eyebrow">Genuine completed work</div><h1>Window Cleaning case studies.</h1><p>These are real completed Namdar jobs that the team has deliberately published.</p></section><section class="section-pad section-light"><div class="gallery-grid">${cards}</div></section><section class="section-pad"><div class="section-head"><div><div class="eyebrow">Need something similar?</div><h2>Start with a Window Cleaning guide estimate.</h2></div></div><a class="primary-btn" href="/?service=windows#quote">Get a quote</a></section>`
  }));
}catch(e){return safeError(res,e)}};