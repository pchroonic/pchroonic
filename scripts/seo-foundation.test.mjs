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
  assert.match(html,/"South London"/);
  assert.match(html,/"Lewisham"/);
  assert.match(html,/Window Cleaning in South London/);
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
  assert.doesNotMatch(src,/\/services\/gutter-cleaning/);
});

test('robots advertises the sitemap and leaves public pages crawlable',()=>{
  const robots=read('robots.txt');
  assert.match(robots,/User-agent: \*/);
  assert.match(robots,/Allow: \//);
  assert.match(robots,/Sitemap: https:\/\/namdar\.co\.uk\/sitemap\.xml/);
});
