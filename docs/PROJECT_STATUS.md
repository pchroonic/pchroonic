# Namdar project status

Last updated: 2026-09-12 UTC

## Baseline

- Source: `pchroonic/pchroonic`, default branch `main`.
- Current verified product commit: `6c898735b58c03922d6ce24b97598af466242e85` from PR #32.
- PR #32 CI `34708390739` passed.
- PR #32 preview `dpl_GTEsv7CqMkqKgGqRMMXTVw68XPkg` READY.
- Production deployment `dpl_81uZqzB2LA1efMcSXMXv4hs1kSHN` READY on `https://namdar.co.uk`.
- Supabase production migration: `20260912173038 address_data_rights_and_distribution_guard`.
- Supabase project: `namdar-production` (`qjigldxjcpnrlyxgmlqq`).

## Main product areas

| Area | Status |
| --- | --- |
| Public website | Live; Windows/Edge overflow fixed, same-iPhone final confirmation pending |
| Customer portal | Email + Google auth, customer MFA option, Turnstile/Supabase CAPTCHA live |
| Auth email branding | Reset Password live/verified; remaining templates pending |
| Admin/Staff security | Mandatory AAL2/MFA live; fresh password + CAPTCHA + MFA completion still pending |
| Email inbox | Spam controls + Inbox Security v2 live |
| Address system | Rights-aware source registry, exact counts and commercial firewall LIVE; GetAddress automated harvesting BLOCKED |
| Future Address API | Foundation LIVE but disabled; 0 clients, 0 keys, 0 eligible rows |
| Support tickets | Customer-only; public inbound email stays Admin Email inbox |

## GetAddress audit outcome

The old harvesting roadmap is cancelled under current provider terms unless explicit written automation/resale permission is obtained.

Live protections:
- scheduled GetAddress harvest removed from Vercel;
- Admin cannot enable/run provider automation when source rights block it;
- compliance guard runs before priority Typeahead/provider worker;
- full provider cache/run-backup export blocked;
- current GetAddress source is human-input-required, non-redistributable and non-subscription under machine-readable policy.

Production state remains:
- Automatic OFF;
- zero harvest runs;
- zero queue rows;
- zero GetAddress cached rows;
- no harvest lookup consumed.

## Bugs fixed in PR #32

1. **Missing licence controls:** provider rights are now stored/checked in `address_dataset_registry`.
2. **Unsafe full export:** source policy now gates provider cache/backups.
3. **Too-late provider block:** compliance check now happens before Typeahead priority discovery.
4. **Obsolete scheduled job:** `/api/address-harvest-cron` removed from Vercel cron config.
5. **Registry row-count drift:** OSM registry said 0 while actual was 1; repaired to 1 and exact statement-level source count triggers now keep counts synced.

All registered source counts currently report `count_in_sync=true`.

## Live source-rights model

- GetAddress: restricted provider; operational/human-triggered only; automation/redistribution/subscription/export false.
- OpenStreetMap: ODbL/share-alike; operational true; excluded from proprietary subscription/export by default.
- OS Open UPRN: inactive planned OGL source; eligible in principle after import/verification.
- Code-Point Open: inactive planned OGL source; eligible in principle after import/verification.

New/unreviewed sources fail closed.

## Commercial distribution boundary

`address_distribution_eligible` is service-role-only and includes only active sources approved for both commercial redistribution and subscription API use.

Current eligible rows: **0**.

This prevents restricted or share-alike observations from leaking into a proprietary paid product simply because the rows exist in `master_addresses`.

## Future Address API foundation

Live server-only schema:
- `address_api_clients`
- `address_api_keys` — SHA-256 hash only
- `address_api_usage_daily`
- `consume_address_api_request(...)` quota/metering function

Production verification:
- 0 API clients;
- 0 API keys;
- 0 usage rows;
- anon/auth cannot select API tables or distribution view;
- anon/auth cannot execute quota function;
- quota test at monthly limit 2 passed twice and blocked the third request.

`/api/address-data-v1` is deployed but disabled and returns HTTP 503. It must remain disabled until licence-safe datasets, customer/key tooling, billing/terms and security/load testing are ready.

## Commercial data roadmap

See `docs/ADDRESS_DATA_PRODUCT.md`.

Next address milestone:
1. Import OS Open UPRN with versioning/update metadata.
2. Import Code-Point Open with versioning/update metadata.
3. Build UPRN-keyed `property_entities`.
4. Build source/field-level `property_field_observations` with confidence, freshness and rights.
5. Add quality/coverage dashboard and contradiction detection.
6. Offer licence-safe UPRN/postcode/serviceability/geospatial intelligence products first.
7. Obtain an explicit redistribution licence before selling full postal-address text.
8. Add API management/billing/rate limits/terms/SLA/enterprise delivery only after the data-rights layer is ready.

Do not use HMLR Price Paid address fields as a shortcut to full-address resale because third-party Royal Mail/OS rights apply. Treat OSM separately for ODbL share-alike compliance.

## GetAddress operational opportunities

GetAddress can still benefit Namdar where human input initiates the request:
- Validate/correct customer-entered addresses;
- postcode/address search while the customer types/selects;
- Private Addresses to surface Namdar-specific verified addresses;
- usage/cost monitoring and appropriate browser/domain-token patterns.

These are future operational enhancements, not data-harvesting/resale sources.

## Database/security verification

- production migration live;
- OSM registry count corrected to 1 and all counts synced;
- exact insert/delete count triggers tested transactionally;
- quota enforcement tested transactionally;
- distribution view/API tables locked from anon/auth;
- Supabase advisor has only expected server-only `RLS enabled, no policy` INFO for the new tables, no new exposed-data warning;
- no new missing-FK-index warning from the address subscription schema.

## Immediate next address work

Start the **OS Open UPRN + Code-Point Open import/versioning design**, not GetAddress harvesting.

The future Address API stays disabled until enough licence-safe data and launch controls exist.

## Auth/security

- canonical Site URL/redirect allowlist hardened;
- Email + Google intentionally enabled;
- Cloudflare Turnstile/Supabase CAPTCHA live;
- customer login/password-reset request smoke-tested;
- privileged fresh password/CAPTCHA/MFA completion pending;
- privileged browser/API/RLS access requires AAL2.

## Other open issues

- recurring `/api/booking-notifications` 504 investigation;
- remaining Auth templates + Magic Link;
- DMARC/BIMI;
- same-iPhone overflow confirmation;
- Stripe, SMS, legal and remaining launch checks.

## Handoff rule

Every substantial provider/data-product change updates `docs/AI_START.md`, `docs/AI_HANDOFF.md`, and this file together. Never store credentials, raw API keys, customer secrets, TOTP codes or one-time Auth links. Data-source rights must be reviewed before automation or distribution.