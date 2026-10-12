const test=require('node:test');
const assert=require('node:assert/strict');
const {publish}=require('./apply-approved-area-seo.cjs');
const original='<html><head><title>Old</title><meta name="description" content="Old description"><link rel="canonical" href="https://namdar.co.uk/areas/lambeth"></head><body><h1>Old</h1><section class="section-pad conversion-faq-section">Existing FAQ</section></body></html>';
const approved={area:'lambeth',status:'approved_for_deployment',approvedAt:'2026-10-12T17:00:00Z',approvedBy:'admin-id',updatedAt:'2026-10-12T16:00:00Z',title:'Window Cleaning in Lambeth | Namdar',metaDescription:'Exterior cleaning across Lambeth.',heading:'Window Cleaning in Lambeth',intro:'Helpful local guidance.',faqQuestion:'Can you clean flats?',faqAnswer:'Subject to safe exterior access.'};
test('approved content is escaped and existing FAQ preserved',()=>{const output=publish(original,{...approved,intro:'Care < safely & clearly'});assert.match(output,/Care &lt; safely &amp; clearly/);assert.match(output,/Existing FAQ/);assert.match(output,/NAMDAR-AREA-CMS-START/);assert.equal(output.match(/<h1>/g).length,1);assert.equal(publish(output,{...approved,intro:'Updated'}).match(/NAMDAR-AREA-CMS-START/g).length,1);});
test('unapproved and out-of-area drafts rejected',()=>{assert.throws(()=>publish(original,{...approved,status:'draft'}));assert.throws(()=>publish(original,{...approved,area:'hack'}));});
test('different canonical rejected',()=>{assert.throws(()=>publish(original.replace('areas/lambeth','areas/southwark'),approved));});
test('incomplete FAQ rejected',()=>{assert.throws(()=>publish(original,{...approved,faqAnswer:''}));});
