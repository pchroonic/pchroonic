import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('homepage targets the live Window Cleaning offer',()=>{
  const html=read('index.html');
  assert.match(html,/<title>Window Cleaning in South London & Lewisham \| Namdar<\/title>/);
  assert.match(html,/Window cleaning, quoted online/);
  assert.match(html,/Window Cleaning in Lewisham/);
  assert.match(html,/Window Cleaning in South London/);
  assert.match(html,/"serviceType":"Exterior window cleaning"/);
  assert.doesNotMatch(html,/Get a guide estimate for window, gutter and roof cleaning/);
});

test('live Window Cleaning service has local schema and internal area links',()=>{
  const html=read('services/window-cleaning.html');
  assert.match(html,/<title>Exterior Window Cleaning in London \| Namdar<\/title>/);
  assert.match(html,/<h1>Exterior Window Cleaning in London<\/h1>/);
  assert.match(html,/BreadcrumbList/);
  for(const borough of ['Lewisham','Southwark','Lambeth','Wandsworth','Greenwich']) assert.match(html,new RegExp(`\"name\":\"${borough}\"`));
  assert.match(html,/South London coverage/);
  assert.match(html,/Window Cleaning in Lewisham/);
});

test('local landing pages describe only the live Window Cleaning service',()=>{
  for(const path of ['areas/london.html','areas/south-london.html','areas/lewisham.html']){
    const html=read(path);
    assert.match(html,/<h1>Window Cleaning in /);
    assert.match(html,/"serviceType":"Exterior window cleaning"/);
    assert.match(html,/BreadcrumbList/);
    for(const future of ['Gutter Cleaning','Roof Cleaning','Handyman Services','3D Property Tours']){
      assert.doesNotMatch(html,new RegExp(future));
    }
  }
});

test('planned service landing pages are statically noindex until launch',()=>{
  for(const path of ['services/gutter-cleaning.html','services/roof-cleaning.html','services/jet-washing.html','services/handyman.html','services/3d-property-tours.html']){
    const html=read(path);
    assert.match(html,/<meta name="robots" content="noindex,follow">/);
  }
});

test('sitemap contains only live service catalog entries and SEO lastmod signals',()=>{
  const src=read('api/sitemap.js');
  assert.match(src,/services\.filter\(s=>s\.status==='live'\)/);
  assert.match(src,/\/areas\/london/);
  assert.match(src,/\/areas\/south-london/);
  assert.match(src,/\/areas\/lewisham/);
  assert.match(src,/<lastmod>/);
  assert.match(src,/PAGE_LASTMOD=Object\.freeze\(\{'window-cleaning':'2026-09-25'\}\)/);
  assert.match(src,/const publicJobs=\(jobs\|\|\[\]\)\.filter\(j=>liveKeys\.has\(j\.service_key\)\)/);
  assert.match(src,/publicJobs\.length\?\[\{path:'\/work'/);
  assert.doesNotMatch(src,/\/services\/gutter-cleaning/);
});

test('robots advertises the sitemap and leaves public pages crawlable',()=>{
  const robots=read('robots.txt');
  assert.match(robots,/User-agent: \*/);
  assert.match(robots,/Allow: \//);
  assert.match(robots,/Sitemap: https:\/\/namdar\.co\.uk\/sitemap\.xml/);
});

test('rendered homepage keeps local SEO and future services hidden until launch',()=>{
  const html=read('index.html'),runtime=read('conversion.js');
  assert.match(html,/<a hidden href="#3d">3D tours<\/a>/);
  assert.match(html,/<section class="section-pad three-d-section" hidden id="3d">/);
  assert.match(html,/<article class="service-card" hidden><div class="service-icon">⌁/);
  assert.match(html,/<label hidden><input disabled name="service" type="radio" value="gutters"/);
  assert.match(runtime,/document\.title='Window Cleaning in South London & Lewisham \| Namdar'/);
  assert.match(runtime,/Book exterior window cleaning across Lewisham, Southwark, Lambeth, Wandsworth and Greenwich/);
  assert.doesNotMatch(runtime,/Namdar \| Window Cleaning in London — Quote Online/);
});

test('SEO uses the production borough coverage without creating doorway pages',()=>{
  const home=read('index.html'),south=read('areas/south-london.html'),london=read('areas/london.html');
  for(const borough of ['Lewisham','Southwark','Lambeth','Wandsworth','Greenwich']){
    assert.match(home,new RegExp(borough));
    assert.match(south,new RegExp(borough));
    assert.match(london,new RegExp(borough));
  }
  assert.doesNotMatch(home,/Window Cleaning in Southwark<\/a>/);
  assert.doesNotMatch(home,/Window Cleaning in Lambeth<\/a>/);
});


test('portfolio SEO fails closed until genuine live-service work is published',()=>{
  const handler=read('api/public-work-page.js');
  const vercel=read('vercel.json');
  const home=read('index.html');
  const app=read('app.js');
  const seo=read('seo-page.js');
  const legacy=read('work.html');
  assert.match(vercel,/"source": "\/work", "destination": "\/api\/public-work-page"/);
  assert.match(handler,/filter\(j=>liveKeys\.has\(j\.service_key\)\)/);
  assert.match(handler,/if\(!publicJobs\.length\)/);
  assert.match(handler,/res\.statusCode=404/);
  assert.match(handler,/X-Robots-Tag','noindex, follow'/);
  assert.match(handler,/Window Cleaning Case Studies \| Namdar/);
  assert.match(handler,/CollectionPage/);
  assert.match(home,/data-real-work-link hidden href="#work"/);
  assert.match(app,/\[data-real-work-link\]/);
  assert.match(seo,/setPublishedWorkAvailability/);
  assert.match(legacy,/<meta name="robots" content="noindex,follow">/);
});

test('indexable SEO pages hide portfolio links in raw HTML until public work exists',()=>{
  for(const path of ['services/window-cleaning.html','areas/london.html','areas/south-london.html','areas/lewisham.html']){
    const html=read(path);
    assert.match(html,/data-real-work-link hidden href="\/work">Our work<\/a>/);
  }
});
