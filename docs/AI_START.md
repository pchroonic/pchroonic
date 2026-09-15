# Namdar AI fast resume

Last verified: 2026-09-15 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product merge: `d4686b34851e9bf659e872a4f06609b70dfa56d4` (PR #90, Owner/custom access roles).
- Admin base JavaScript remains v`6.4.37-admin-website-crash-fix-1`; modal CSS v`6.4.38-admin-wide-modal-fix-1`; access-role extension v`6.4.39-access-roles-1`.
- Customer loader remains v`6.4.35-payment-policy-engine-1`.
- Production deployment: `dpl_GFYggUDm33USwygrhPfzLcdDFiqp`, READY and aliased to `namdar.co.uk`.
- `/api/health` HTTP 200 / `ok:true` at `2026-09-15T14:57:54.408Z`.
- Window Cleaning only live.
- Customer Stripe payment policy remains OFF; no commercial deposit policy was activated.
- Ask Namdar provider AI remains OFF.
- Privileged Staff/Admin access requires CAPTCHA + AAL2/TOTP MFA.

## Owner & custom access roles — LIVE
Product PR: #90 `Add Owner and custom Admin access roles`.
Exact tested head: `50a6995c2d01b3684a23bbb1f8a8e5babd7bcc46`.
GitHub CI: run `34984977855` SUCCESS.
Exact-head Vercel preview: `dpl_3VpLtjizfxLe8dVJXBzLc5SmvScJ`, READY; errors-only build log clean.
Production migration: `20260915145635` / `staff_role_management`, applied successfully before merge.
Merge/main: `d4686b34851e9bf659e872a4f06609b70dfa56d4`.
Production deployment: `dpl_GFYggUDm33USwygrhPfzLcdDFiqp`, READY; errors-only build log clean.

Live hierarchy:
- **Owner** is the highest access role;
- **Administrator** keeps full operational Admin access but cannot control Owner-only hierarchy functions;
- Owner can create/edit/delete reusable custom Staff roles and choose dashboard permissions;
- Staff can use a reusable custom role or Individual permissions;
- Owner alone can invite/manage Administrator accounts and grant Owner access;
- system Owner/Administrator definitions cannot be edited or deleted;
- assigned custom roles cannot be deleted;
- custom role permission changes propagate to assigned Staff accounts;
- current-account, last-Owner and last-Administrator safeguards prevent privilege lockout.

Security architecture:
- `profiles.role` remains the coarse `customer` / `staff` / `admin` boundary, preserving existing RLS/server authorization compatibility;
- `staff_roles` + `staff_access.role_key` provide the access-role hierarchy;
- `staff_roles` is RLS-enabled and has no anon/authenticated table grants;
- secure invitations, account-owner email changes, CAPTCHA and AAL2/TOTP remain unchanged.

Initial Owner verification:
- production contains the protected Owner and Administrator system roles;
- the single active Admin was mapped to `role_key='owner'` by state, without hard-coding an account id;
- RLS on `staff_roles` verified enabled.

Production verification:
- live `/admin.js` HTTP 200 and loads `/admin-role-management.js?v=6.4.39-access-roles-1`;
- live `/admin-role-management.js` HTTP 200;
- unauthenticated `/api/admin-roles` fails closed with HTTP 401;
- `/api/health` returned HTTP 200 / `ok:true`;
- production 5xx runtime scan returned no matching logs;
- no customer, booking or payment test data was created and Stripe was not activated.

Owner visual verification: hard-refresh Admin, open **Staff & access**, confirm **Access roles** appears and your signed-in access shows **Owner**. Create/delete a harmless custom role only if you want an interactive smoke test; do not create a real staff account just for testing.

## Other live systems
- PR #88 Admin Edit booking responsive modal fix remains live.
- PR #86 Website & legal crash fix remains live.
- PR #84 secure Admin logo upload remains live.
- PR #82 flexible payment/deposit policy engine remains live while commercial Stripe remains OFF.
- Privacy Centre, Security Hardening, Staff My Jobs auth recovery, Business Finance, Smart Receipts, Newsletter Centre and guided Ask Namdar remain live/stable.

## Open manual/commercial items
- Visually confirm Staff & access → Access roles on production.
- Commercial Stripe activation and actual deposit amounts/bands remain OFF/unapproved until a separate owner decision.
- ICO data-protection fee self-assessment, Supabase Leaked Password Protection, Google review URL, real-job pricing calibration, SMS/legal checks and Node `url.parse()` cleanup remain open.
