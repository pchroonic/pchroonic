# Namdar Address & Property Intelligence — product architecture

Last reviewed: 2026-09-12

This document defines how Namdar can grow its address/property-data capabilities without mixing provider-restricted data into a future paid dataset or API. It is a technical/product design record, not legal advice. Provider terms and data licences must be rechecked before launch or redistribution.

## Core rule

Every address row remains tied to a `source_dataset`. Every source has machine-readable rights metadata in `address_dataset_registry`.

A source may be useful operationally without being distributable. Namdar's paid data surfaces must fail closed and only read rows from sources where both:

- `commercial_redistribution_allowed = true`
- `subscription_api_allowed = true`

The server-side view `address_distribution_eligible` enforces this boundary.

## Source classes

### GetAddress — operational / human-initiated only unless written permission changes

Current GetAddress Terms: https://getaddress.io/Terms

Current design decision:
- operational lookup/cache may be used where the provider terms permit it;
- `human_input_required = true`;
- automated bulk ingestion is blocked;
- scheduled harvesting is removed;
- bulk provider-cache export is blocked;
- paid subscription API use and commercial redistribution are blocked;
- never use Namdar as a paid proxy to resell GetAddress responses;
- if GetAddress later grants explicit written automation/resale permission, record the agreement in `permission_reference`, review the terms, then deliberately change the rights flags.

The provider-specific cache must never be treated as Namdar-owned commercial inventory merely because it is stored in Namdar's database.

### OpenStreetMap — useful open source, separate ODbL obligations

Licence/copyright: https://www.openstreetmap.org/copyright
ODbL guidance: https://opendatacommons.org/licenses/odbl/

Current design decision:
- retain for Namdar's operational postcode fallback;
- preserve `source_dataset = osm-postcode-cache` and required attribution;
- commercial use is possible under ODbL, but derived-database/share-alike obligations need a deliberate distribution design;
- do not silently merge OSM-derived address text into a proprietary paid full-address dataset;
- keep `subscription_api_allowed = false` until the product is explicitly designed for ODbL compliance.

### OS Open UPRN — planned commercial-friendly identifier/location foundation

Product: https://www.ordnancesurvey.co.uk/products/os-open-uprn
Licence: Open Government Licence v3.0

Planned use:
- UPRN as Namdar's stable property/entity identifier;
- authoritative property point coordinates;
- linking serviceability, jobs, customer properties and future licensed attributes;
- licence-safe UPRN/location API and enrichment products with required attribution.

Important: OS Open UPRN is not itself a complete postal-address text dataset.

### Code-Point Open — planned postcode intelligence foundation

Product: https://www.ordnancesurvey.co.uk/products/code-point-open
Licence: Open Government Licence v3.0 with required source attribution.

Planned use:
- postcode-unit coordinates;
- service-area and distance intelligence;
- postcode-to-area analytics;
- coverage statistics and business routing features;
- paid API products where the licence requirements are satisfied.

It is not a complete premises/full-address dataset.

### Full postal addresses for resale — obtain a redistribution licence

For a sellable full UK address product, obtain a licence that explicitly covers the intended distribution/subscription model. Potential routes include Ordnance Survey licensed address products/partner arrangements or another provider that grants explicit redistribution rights.

Do not assume a source is resellable just because its address text is publicly visible elsewhere.

### HM Land Registry Price Paid Data — treat address fields cautiously

HMLR Price Paid Data is valuable for transaction/property intelligence, but its address fields include third-party address rights. Do not use those address strings as a shortcut to create a resold full-address database. If Price Paid Data is added later, retain its source provenance and review exactly which transaction facts/fields can be redistributed and how they can be linked to Namdar's UPRN/property entity layer.

## Database architecture

### 1. Source observations remain source-specific

`master_addresses` remains a store of source-specific observations, not proof that Namdar owns redistribution rights to every field.

Critical columns:
- `source_dataset`
- `source_record_id`
- `uprn`
- structured address fields
- coordinates
- `dataset_version`
- `import_batch`

### 2. Rights registry is mandatory

`address_dataset_registry` now carries:
- licence category/name/reference;
- operational-use permission;
- human-input requirement;
- automated-ingest permission;
- commercial-redistribution permission;
- subscription-API permission;
- bulk-export permission;
- share-alike flag;
- attribution text;
- terms/permission references;
- rights review timestamp/notes.

Unknown/new sources default to **deny** for automation and distribution.

### 3. Commercial boundary

`address_distribution_eligible` exposes only rows from active datasets explicitly approved for both commercial redistribution and subscription API use.

Future paid APIs and data exports must query this view (or another equally strict rights-aware surface), not `master_addresses` directly.

### 4. Exact coverage metrics

Registry row counts are maintained from actual `master_addresses` rows rather than incrementing counters based on attempted/upserted batches. `address_dataset_health` also exposes the live actual count and whether the stored registry count is in sync.

This prevents duplicate imports/upserts from inflating coverage metrics used for product reporting or billing.

### 5. Future canonical property layer

When UPRN data is imported, add a canonical property/entity layer rather than destructively merging every provider into one address row.

Recommended next schema:
- `property_entities` — one record per UPRN/property entity;
- `property_field_observations` — one value per source/field with source record, observed time and confidence;
- field-level redistribution flag inherited from the source rights policy;
- canonical-value selection based on source authority, freshness and agreement;
- contradiction/anomaly records when sources disagree.

This allows Namdar to become more intelligent without contaminating licence-safe fields with restricted-source values.

## Intelligent quality model

Future enrichment should score, not merely store, data. Recommended dimensions:
- stable UPRN match confidence;
- postcode/property coordinate confidence;
- source authority ranking;
- number of independent agreeing sources;
- freshness / last observed date;
- address completeness score;
- serviceability status;
- anomaly/contradiction flag;
- retired/replaced address status;
- provenance for every material field.

The goal is a property intelligence graph, not just a pile of address strings.

## Subscription API foundation

Server-only tables:
- `address_api_clients` — customer/plan/status/monthly quota/product entitlement;
- `address_api_keys` — only SHA-256 key hashes are stored; raw API keys must never be stored after issuance;
- `address_api_usage_daily` — requests, matched rows and bytes served.

`consume_address_api_request(...)` atomically enforces an active client and monthly request allowance before a request is delivered.

Initial endpoint: `/api/address-data-v1`

Safety defaults:
- disabled unless `ADDRESS_DATA_API_ENABLED=true`;
- bearer API key required;
- active client required;
- client must explicitly include product `address-v1`;
- maximum 100 rows per request;
- only `address_distribution_eligible` can be queried;
- source/licence/attribution metadata travels with returned rows;
- response caching is disabled by default.

No API customer or key is created by the migration. The endpoint therefore remains unusable until Namdar deliberately creates a paid/sandbox client and enables it.

## Commercial product roadmap

### Phase A — licence-safe data foundation
- import OS Open UPRN;
- import Code-Point Open;
- build UPRN/property entity model;
- coverage/quality dashboard;
- automate licence/attribution checks in CI and Admin.

### Phase B — useful products before full postal-address resale
Possible products based on properly licensed/open data and Namdar-derived intelligence:
- UPRN lookup/enrichment API;
- postcode coordinates/area intelligence;
- serviceability and coverage API;
- property-to-service-area matching;
- route/territory analytics;
- data quality/normalisation tools;
- change/coverage statistics.

### Phase C — full address subscription
Before launch:
- obtain explicit full-address redistribution/subscription rights;
- import licensed full-address data with versioning/deltas;
- build canonical UPRN-based address resolution;
- add API key issuance/rotation UI;
- add per-minute throttling and abuse protection;
- connect plan entitlements/usage to Stripe or the chosen billing provider;
- publish API terms, privacy policy, attribution and SLA;
- version API responses and change feeds.

### Phase D — higher-value property intelligence
After licences are clear:
- property transaction attributes;
- building/property classifications;
- energy/property attributes where permitted;
- change notifications/webhooks;
- confidence-scored property profiles;
- bulk data snapshots/delta feeds for enterprise customers.

## Pricing architecture (future, not live)

Keep billing independent of data-source cost:
- Developer — low monthly request limit, postcode/UPRN basics;
- Business — higher quota, enrichment, serviceability and batch jobs;
- Enterprise — contracted quota, bulk/delta delivery, SLA and custom licensed fields.

Never price or sell a field unless its source rights explicitly permit the delivery method offered by that plan.

## Provider permission upgrade procedure

If a restricted provider grants additional rights:
1. save the contract/permission reference outside public Git history;
2. record a non-secret reference in `permission_reference`;
3. re-review the exact permitted automation, caching, API and export scope;
4. update only the relevant rights flags;
5. add regression tests for the new permission boundary;
6. run a controlled provider test;
7. update this document and all AI handoff files.

The default remains fail closed.