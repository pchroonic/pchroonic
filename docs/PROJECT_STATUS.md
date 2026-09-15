# Namdar project status

Last updated: 2026-09-15 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main: `3b7f46fa15bbe386f00de32529529763cb19f307` (PR #89, docs-only).
- Current live product merge: `6c2ec57473d0d2f581c4eb70e76fe30d0add07dc` (PR #88).
- Admin base JavaScript v`6.4.37-admin-website-crash-fix-1`; modal CSS v`6.4.38-admin-wide-modal-fix-1`; customer loader v`6.4.35-payment-policy-engine-1`.
- Current production deployment `dpl_7Dg4UQH3MHR1HbjURanFgcTafJSb`, READY and aliased to `namdar.co.uk`.
- Production health HTTP 200 / `ok:true` at `2026-09-15T14:33:46.185Z`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Stripe customer payment policy OFF; no commercial deposit bands approved/enabled.
- Ask Namdar provider AI disabled.

## Owner & custom access roles — RELEASE CANDIDATE
Branch `feature/custom-access-roles-20260915` adds a reusable role/permission system without changing the existing coarse profile-role security boundary.

Candidate behavior:
- protected system roles: **Owner** and **Administrator**;
- existing unambiguous single active Admin becomes the initial Owner when the migration is applied;
- Owner is the only role that can create/edit/delete custom roles, manage Administrator accounts, or grant Owner access;
- Administrator keeps full normal Admin operations but cannot control the Owner hierarchy;
- Owner can create reusable Staff roles (for example Scheduler, Operations Manager, Finance) and select dashboard permissions;
- Staff can be assigned a reusable role or keep Individual permissions;
- custom role edits propagate to assigned staff;
- assigned roles cannot be deleted;
- Owner/Administrator definitions cannot be edited or deleted;
- current account, last Owner and last Administrator lockout protections apply;
- secure invitations, account-owner email changes, CAPTCHA and MFA remain unchanged.

Implementation:
- migration `20260915144500_staff_role_management.sql` creates private `staff_roles`, adds `staff_access.role_key`, seeds system roles and performs safe initial Owner mapping;
- `lib/access-roles.js` centralizes permission/Owner logic;
- `api/admin-roles.js` provides Owner-protected role management;
- `api/admin-users.js` enforces the hierarchy on user lifecycle and assignments;
- `admin-role-management.js` adds Access roles UI under Staff & access;
- `admin.js` cache-loads the extension as `6.4.39-access-roles-1`;
- regression coverage is in `scripts/access-roles.test.mjs` plus updated security tests/CI.

Release status: code/documentation are prepared on the feature branch. Migration, exact-head CI, preview verification, product merge and production verification still need to be completed before marking LIVE.

## Admin Edit booking horizontal overflow — LIVE
PR #88 fixed the Edit booking dialog clipping/horizontal scrollbar. The Admin-only responsive wide-modal guard is live and production health/build verification passed.

## Admin Website & legal / logo — LIVE
PR #86 fixed the Website & legal null-field crash and MFA error boundary. PR #84 secure logo upload remains live.

## Flexible Payment & Deposit Policy Engine — LIVE
PR #82 remains live. It supports revisioned flat/tiered deposits, frozen booking-specific payment terms, configurable balance timing and operational overdue handling. Consumer late monetary penalties are not automatic; B2B statutory recovery remains manual/preview only.

Commercial invariants:
- customer Stripe remains OFF;
- fallback payment values are inactive defaults only;
- Window Cleaning remains the only live service.

## Privacy / security / operations stable
- Fair 48-hour cancellation/deposit terms live.
- Privacy/Cookie and customer/Admin privacy centres live.
- Security Hardening and Staff My Jobs auth recovery live.
- Business Finance and Smart Receipts private/sole-trader-first.
- Newsletter Centre consent-aware/resumable.
- Ask Namdar guided assistant live; provider AI off.
- Support tickets customer-only/private.

## Open roadmap
- Finish and verify Owner/custom access roles release.
- Commercial Stripe decision and actual deposit policy remain owner decisions.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Node `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
