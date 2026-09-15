# Namdar project status

Last updated: 2026-09-15 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product merge: `d4686b34851e9bf659e872a4f06609b70dfa56d4` (PR #90, Owner/custom access roles).
- Admin base JS v`6.4.37-admin-website-crash-fix-1`; modal CSS v`6.4.38-admin-wide-modal-fix-1`; access-role extension v`6.4.39-access-roles-1`; customer loader v`6.4.35-payment-policy-engine-1`.
- Production deployment `dpl_GFYggUDm33USwygrhPfzLcdDFiqp`, READY and aliased to `namdar.co.uk`.
- Production health HTTP 200 / `ok:true` at `2026-09-15T14:57:54.408Z`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Customer Stripe remains OFF; no commercial deposit bands were activated.
- Ask Namdar provider AI disabled.

## Owner & custom access roles — LIVE
PR #90 adds the requested reusable Admin/Staff access-role hierarchy while preserving the existing coarse profile security model.

Live behavior:
- protected **Owner** and **Administrator** system roles;
- existing single active top-level Admin mapped to Owner by migration without hard-coded identity;
- Owner can create/edit/delete reusable custom Staff roles and choose dashboard permissions;
- Owner alone can invite/manage Administrator accounts and grant Owner access;
- Administrator retains full normal operational Admin access but cannot control Owner-only hierarchy functions;
- Staff can use a reusable custom role or Individual permissions;
- custom role permission edits propagate to assigned Staff;
- assigned custom roles cannot be deleted;
- Owner/Administrator definitions cannot be edited or deleted;
- current-account, last-Owner and last-Administrator safeguards prevent lockout;
- secure invitations, account-owner email changes, CAPTCHA and MFA remain unchanged.

Implementation:
- migration `20260915144500_staff_role_management.sql` / production migration `20260915145635 staff_role_management`;
- `staff_roles` private RLS-enabled table + `staff_access.role_key` FK;
- `lib/access-roles.js` hierarchy/permission helpers;
- Owner-protected `api/admin-roles.js`;
- hierarchy-aware `api/admin-users.js`;
- `admin-role-management.js` Access roles UI under Staff & access;
- `admin.js` loads extension with `6.4.39-access-roles-1`;
- regression coverage in access-role and security tests.

Release evidence:
- exact tested head `50a6995c2d01b3684a23bbb1f8a8e5babd7bcc46`;
- GitHub CI run `34984977855` SUCCESS;
- exact-head preview `dpl_3VpLtjizfxLe8dVJXBzLc5SmvScJ` READY/clean;
- production migration applied and verified before merge;
- protected Owner + Administrator rows present, RLS enabled, exactly one active Admin mapped Owner;
- merge/main `d4686b34851e9bf659e872a4f06609b70dfa56d4`;
- production deployment `dpl_GFYggUDm33USwygrhPfzLcdDFiqp` READY/clean;
- live Admin loader and role-management module HTTP 200;
- unauthenticated role API fails closed HTTP 401;
- production 5xx scan returned no logs;
- `/api/health` HTTP 200 / `ok:true` at `2026-09-15T14:57:54.408Z`.

Owner visual smoke test remains: hard-refresh Admin → Staff & access, confirm Owner label, Access roles panel and Create role editor.

## Other live product systems
- PR #88 responsive Admin Edit booking modal fix.
- PR #86 Website & legal crash/MFA-boundary fix.
- PR #84 secure logo upload.
- PR #82 flexible payment/deposit policy engine; commercial Stripe activation remains OFF.
- Fair cancellation terms, Privacy Centre, Security Hardening, Staff My Jobs recovery, Business Finance, Smart Receipts, Newsletter Centre and guided Ask Namdar remain live/stable.

## Open roadmap
- Owner visual smoke-test of Access roles.
- Commercial Stripe decision and actual deposit policy.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Node `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
