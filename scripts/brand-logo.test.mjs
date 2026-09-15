import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const { MAX_LOGO_BYTES, detectLogoImageType, decodeLogoBase64 }=require('../lib/brand-logo');

test('detects supported logo image signatures',()=>{
  assert.equal(detectLogoImageType(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))?.mimeType,'image/png');
  assert.equal(detectLogoImageType(Buffer.from([0xff,0xd8,0xff,0xe0]))?.mimeType,'image/jpeg');
  assert.equal(detectLogoImageType(Buffer.from('RIFFxxxxWEBP','ascii'))?.mimeType,'image/webp');
  const avif=Buffer.alloc(20);avif.write('ftyp',4,'ascii');avif.write('avif',8,'ascii');
  assert.equal(detectLogoImageType(avif)?.mimeType,'image/avif');
});

test('rejects unsupported content even when base64 is valid',()=>{
  assert.throws(()=>decodeLogoBase64(Buffer.from('<svg></svg>').toString('base64')),/PNG, JPG, WebP or AVIF/);
});

test('rejects logo payloads over the 2 MB limit',()=>{
  const tooLarge=Buffer.alloc(MAX_LOGO_BYTES+1,0);tooLarge.set([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a],0);
  assert.throws(()=>decodeLogoBase64(tooLarge.toString('base64')),/too large/);
});

test('decodes a valid PNG payload',()=>{
  const png=Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0]);
  const result=decodeLogoBase64(png.toString('base64'));
  assert.equal(result.mimeType,'image/png');
  assert.equal(result.extension,'png');
  assert.deepEqual(result.buffer,png);
});
