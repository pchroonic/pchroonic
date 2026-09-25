import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {extractReceipt,merchantKey}=require('../lib/receipt-intelligence');
const {dbSafeText}=require('../lib/db-safe-text');

test('reads UK receipt supplier date total VAT and card payment',()=>{
  const text=`SCREWFIX\nCroydon Trade Counter\nReceipt 7812-ABCD\n13/09/2026 14:22\nCleaning cloths £12.00\nSqueegee £8.00\nVAT £3.33\nTOTAL £20.00\nVISA CONTACTLESS`;
  const x=extractReceipt(text);
  assert.equal(x.supplier,'SCREWFIX');
  assert.equal(x.expenseDate,'2026-09-13');
  assert.equal(x.amount,20);
  assert.equal(x.vatAmount,3.33);
  assert.equal(x.category,'materials');
  assert.equal(x.paymentMethod,'card');
  assert.equal(x.reference,'7812-ABCD');
  assert.ok(x.overallConfidence>.7);
});

test('recognises parking and warns on mixed-use sensitive categories',()=>{
  const x=extractReceipt(`RINGGO\nParking receipt\n12 Sep 2026\nTOTAL GBP 6.50\nCard payment`);
  assert.equal(x.category,'parking');
  assert.equal(x.amount,6.5);
  assert.equal(x.expenseDate,'2026-09-12');
});

test('flags fines as non-allowable',()=>{
  const x=extractReceipt(`Council Parking Charge Notice\n13/09/2026\nPenalty £80.00\nTOTAL £80.00`);
  assert.equal(x.taxTreatment,'non_allowable');
  assert.ok(x.warnings.some(w=>/fine|penalty/i.test(w)));
});

test('learned merchant rule overrides generic category safely',()=>{
  const first=extractReceipt(`ACME SUPPLIES\n13/09/2026\nTOTAL £24.00`);
  const rule={merchant_key:merchantKey(first.supplier),category:'uniform_ppe',tax_treatment:'allowable',business_use_percent:85,payment_method:'card'};
  const learned=extractReceipt(`ACME SUPPLIES\n14/09/2026\nTOTAL £18.00`,rule);
  assert.equal(learned.category,'uniform_ppe');
  assert.equal(learned.businessUsePercent,85);
  assert.equal(learned.paymentMethod,'card');
  assert.equal(learned.learnedRuleApplied,true);
});

test('merchant keys are stable and strip common company suffixes',()=>{
  assert.equal(merchantKey('Example Cleaning Supplies Ltd UK'),'example cleaning supplies');
});


test('sanitizes Vercel PDF NUL characters and keeps the foreign invoice out of GBP amount fields',()=>{
  const raw=`Page 1 of 1
Invoice
Invoice number YYVCYYP4\u00000004
Date of issue September 24, 2026
Date due September 24, 2026
Vercel Inc. @vercel
$24.00 USD due September 24, 2026
Vercel VAT ID\u0000 519803086
VAT\u0000Code: GBSL200D
Pro
Sep 24\u0000Oct 23, 2026
1 $20.00 20% $20.00
Subtotal $20.00
Standard Rate - UNITED KINGDOM (20% on $20.00) $4.00
Total $24.00
Amount due $24.00 USD`;
  const cleaned=dbSafeText(raw);
  assert.equal(cleaned.includes('\u0000'),false);
  const x=extractReceipt(cleaned);
  assert.equal(x.supplier,'Vercel Inc. @vercel');
  assert.equal(x.expenseDate,'2026-09-24');
  assert.equal(x.reference,'YYVCYYP4-0004');
  assert.equal(x.currency,'USD');
  assert.equal(x.originalAmount,24);
  assert.equal(x.originalVatAmount,4);
  assert.equal(x.amount,null);
  assert.equal(x.vatAmount,null);
  assert.equal(x.category,'software');
  assert.ok(x.warnings.some(w=>/historical GBP reference|actual GBP card or bank charge/i.test(w)));
});

test('database-safe text repairs NUL separators and lone surrogate characters',()=>{
  const cleaned=dbSafeText('ABC\u0000123\u0000 text '+String.fromCharCode(0xD800));
  assert.equal(cleaned.includes('\u0000'),false);
  assert.match(cleaned,/ABC-123\s+text/);
  assert.ok(cleaned.includes('�'));
});


test('reads Vercel invoice correctly when PDF.js flattens the page into one line',()=>{
  const flat='Page 1 of 1 Invoice Invoice number YYVCYYP4-0004 Date of issue September 24, 2026 Date due September 24, 2026 Vercel Inc. @vercel $24.00 USD due September 24, 2026 Vercel VAT ID 519803086 VAT Code: GBSL200D Pro Sep 24-Oct 23, 2026 1 $20.00 20% $20.00 Subtotal $20.00 Standard Rate - UNITED KINGDOM (20% on $20.00) $4.00 Total $24.00 Amount due $24.00 USD';
  const x=extractReceipt(flat);
  assert.equal(x.supplier,'Vercel Inc.');
  assert.equal(x.expenseDate,'2026-09-24');
  assert.equal(x.reference,'YYVCYYP4-0004');
  assert.equal(x.currency,'USD');
  assert.equal(x.originalAmount,24);
  assert.equal(x.originalVatAmount,4);
  assert.equal(x.category,'software');
});


test('normalizes a spaced Vercel invoice reference from PDF.js text',()=>{
  const flat='Invoice Invoice number YYVCYYP4 0004 Date of issue September 24, 2026 Vercel Inc. @vercel Amount due $24.00 USD';
  const x=extractReceipt(flat);
  assert.equal(x.reference,'YYVCYYP4-0004');
  assert.equal(x.supplier,'Vercel Inc.');
  assert.equal(x.expenseDate,'2026-09-24');
});


test('reads the Equipmart Amazon VAT invoice completely',()=>{
  const text=`Invoice
Paid
Payment reference ID 3YWhkgCAxMAir9FW3GfG
Sold by Equipmart Ltd
VAT # GB985642081
Invoice date / Delivery date 20 July 2026
POOYA MOHAMMADI
Invoice # GB6001L14F5R3I
FLAT 2 ROWAN HOUSE, ERLANGER ROAD
Total payable £24.95
LONDON, LEWISHAM, SE14 5TD
GB
For questions about your order, visit www.amazon.co.uk/contact-us
Billing address Delivery address Sold by
Pooya Mohammadi pooya mohammadi Equipmart Ltd
Flat 2 Rowan House, Erlanger Road FLAT 2 ROWAN HOUSE, ERLANGER ROAD KIAM HOUSE
London, Lewisham, SE14 5TD LONDON, SE14 5TD BIRCHILL ROAD
GB GB KNOWSLEY INDUSTRIAL PARK, MERSEYSIDE,
L33 7TD
GB
VAT # GB985642081
Order information
Order date 17 July 2026
Order # 205-0985158-6739532
Invoice details
Description Qty Unit price VAT rate Unit price Item subtotal
(excl. VAT) (incl. VAT) (incl. VAT)
Equip2clean Inline Water Filter for Valeting & Window Cleaning | Mixed-Bed 1 £20.79 20% £24.95 £24.95
Resin Water Purifier Canister | Compatible with Water Filter Cartridges | Spot-Free Rinse for Cars and Glass | 30 cm
ASIN: B0D2J351BT
Shipping Charges £0.00 £0.00 £0.00
Invoice total £24.95
VAT rate Item subtotal VAT subtotal
(excl. VAT)
20% £20.79 £4.16
Total £20.79 £4.16`;
  const x=extractReceipt(text);
  assert.equal(x.supplier,'Equipmart Ltd');
  assert.equal(x.expenseDate,'2026-07-20');
  assert.equal(x.reference,'GB6001L14F5R3I');
  assert.equal(x.currency,'GBP');
  assert.equal(x.originalAmount,24.95);
  assert.equal(x.amount,24.95);
  assert.equal(x.originalVatAmount,4.16);
  assert.equal(x.vatAmount,4.16);
  assert.equal(x.category,'equipment');
  assert.match(x.description,/Equip2clean Inline Water Filter/i);
  assert.doesNotMatch(x.description,/excl\.? VAT/i);
  assert.ok(x.warnings.some(w=>/no payment date is stated/i.test(w)));
});
