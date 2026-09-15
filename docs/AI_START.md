# Namdar AI fast resume

Last verified: 2026-09-15 UTC

Read this first. Use `docs/AI_HANDOFF.md` for implementation detail and `docs/PROJECT_STATUS.md` for roadmap/status.

## Production source of truth
- Repo `pchroonic/pchroonic`, default `main`.
- Current `main`: `3b7f46fa15bbe386f00de32529529763cb19f307` (PR #89, docs-only release record).
- Current live product merge: `6c2ec57473d0d2f581c4eb70e76fe30d0add07dc` (PR #88, Admin booking editor overflow fix).
- Current Admin JavaScript release remains v`6.4.37-admin-website-crash-fix-1`; Admin modal-layout CSS is cache-pinned separately as `6.4.38-admin-wide-modal-fix-1`.
- Customer loader remains v`6.4.35-payment-policy-engine-1`.
- Current production deployment: `dpl_7Dg4UQH3MHR1HbjURanFgcTafJSb`, READY and aliased to `namdar.co.uk`; product code remains PR #88 plus later documentation.
- `/api/health` returned HTTP 200 / `ok:true` at `2026-09-15T14:33:46.185Z`.
- Window Cleaning is the only live/quotable/bookable service.
- Stripe commercial customer payment policy is OFF. Production has `0` `site_settings` rows with key `payments`.
- Ask Namdar provider AI remains disabled (`aiEnabled:false`).
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.

## Owner & custom access roles — RELEASE CANDIDATE
Branch: `feature/custom-access-roles-20260915`.
Admin extension cache token: `6.4.39-access-roles-1`.
Migration file: `supabase/migrations/20260915144500_staff_role_management.sql`.

Goal: allow Namdar to create reusable staff roles with selected permissions while promoting the existing top-level Admin account to a protected **Owner** role.

Security design:
- `profiles.role` remains the coarse `customer` / `staff` / `admin` security boundary so existing RLS, server authorization and MFA behavior are not weakened;
- a separate `staff_roles` + `staff_access.role_key` layer provides **Owner**, **Administrator** and reusable custom staff roles;
- **Owner** is the highest role and is the only role allowed to create/edit/delete custom access roles, invite/manage Administrator accounts, or grant Owner access;
- **Administrator** keeps full operational Admin access but cannot change the Owner hierarchy or role definitions;
- custom staff roles use the existing permission catalogue and can be assigned to multiple Staff accounts;
- editing a custom role updates the permissions of every Staff account assigned to it;
- protected Owner/Administrator role definitions cannot be edited or deleted;
- a custom role cannot be deleted while assigned;
- the current signed-in privileged account cannot change its own account type/access role/status;
- the last active Owner and last active Administrator safeguards prevent lockout;
- secure invitations, account-owner email changes, CAPTCHA and AAL2/TOTP MFA remain unchanged.

Initial Owner migration:
- production currently has one unambiguous active Admin account;
- the migration does **not** hard-code a user id;
- when exactly one active Admin exists at migration time, that account becomes the initial Owner automatically;
- other pre-existing Admin accounts, if present in a different environment, default to Administrator until explicitly changed by an Owner.

Admin UI candidate:
- **Staff & access** gains an **Access roles** panel;
- Owner can create a role such as Operations Manager, Scheduler or Finance and tick the dashboard permissions that role receives;
- user editing distinguishes **Account type** (Customer / Staff / Admin) from **Access role**;
- Staff can use a reusable custom role or retain Individual permissions;
- Admin accounts can use Administrator or Owner only;
- staff table displays Access role, account type, job title and effective permissions.

Release state:
- code and regression coverage are on the feature branch;
- production migration is not yet recorded as applied in this handoff section;
- do not merge/release until GitHub CI, Vercel preview and migration verification are complete;
- this feature does not activate Stripe, create customer/payment data, or change booking/payment policy.

## Admin Edit booking modal overflow — LIVE
PR #88 fixed the production Edit booking dialog horizontal scrollbar/clipping. `admin-modal-layout.css` lets direct wide-card dialogs grow responsively up to 980px, constrains form controls, wraps long context and collapses to one column on narrow screens. Production verification passed.

## Admin Website & legal / logo — LIVE
PR #86 repaired the Website & legal null-field crash and false MFA error boundary. PR #84 provides secure Admin logo upload with server-side validation, dedicated Storage and an explicit Save website settings publish step.

## Flexible Payment & Deposit Policy Engine — LIVE
PR #82 remains live with revisioned flat/tiered deposits, frozen booking-specific terms, configurable balance timing and operational overdue escalation. There is no automatic consumer late fee/interest. B2B statutory recovery is preview/manual only.

Commercial invariant: customer Stripe payments remain OFF; fallback 20% / £10 values are inactive defaults only, not an approved commercial policy.

## Stable live systems
- Fair 48-hour cancellation/deposit policy remains live.
- Privacy Centre / UK GDPR operations remain live; controller legal name/public postal address publication is postponed by owner.
- Security Hardening and Staff My Jobs auth recovery remain live.
- Business Finance and Smart Receipts remain private/sole-trader-first.
- Newsletter Centre remains consent-aware/resumable.
- Ask Namdar guided assistant remains live; provider AI remains off.
- Support tickets remain customer-only/private.

## Open manual/commercial items
- Complete and verify the Owner/custom-role release candidate.
- Owner can retry Website & legal logo upload/publish flow.
- Commercial Stripe activation and actual deposit amounts/bands remain OFF/unapproved until a separate owner decision.
- ICO data-protection fee self-assessment, Supabase Leaked Password Protection, Google review URL, real-job pricing calibration, SMS/legal checks and Node `url.parse()` cleanup remain open.
