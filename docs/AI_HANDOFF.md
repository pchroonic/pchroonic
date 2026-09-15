# Namdar AI handoff

Last verified: 2026-09-15 UTC

Read `docs/AI_START.md` first. Use `docs/PROJECT_STATUS.md` for the broader roadmap.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product merge: `d4686b34851e9bf659e872a4f06609b70dfa56d4` (PR #90).
- Admin base JS `6.4.37-admin-website-crash-fix-1`; modal CSS `6.4.38-admin-wide-modal-fix-1`; access-role extension `6.4.39-access-roles-1`; customer loader `6.4.35-payment-policy-engine-1`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Vercel project: `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`; team: `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Production deployment: `dpl_GFYggUDm33USwygrhPfzLcdDFiqp`, READY on `namdar.co.uk`.
- Health HTTP 200 / `ok:true` at `2026-09-15T14:57:54.408Z`.
- Window Cleaning only live. Customer Stripe OFF. Provider AI OFF. Privileged access requires CAPTCHA + AAL2/TOTP.

# Owner & custom access roles — LIVE

## Architecture
Owner was deliberately implemented as a second access-role layer rather than a new `profiles.role` value. Coarse `profiles.role` stays `customer` / `staff` / `admin`, preserving current authorization/RLS behavior. `staff_roles` and `staff_access.role_key` supply the hierarchy.

System roles:
- **Owner** — highest role; can manage role definitions, Administrator accounts and Owner grants.
- **Administrator** — full normal Admin operations, but no Owner-only hierarchy control.

Custom Staff roles:
- reusable permission templates such as Scheduler, Operations Manager or Finance;
- can be assigned to multiple Staff accounts;
- editing a role propagates its permission map to assigned Staff;
- an assigned role cannot be deleted;
- system roles cannot be edited or deleted;
- Staff may instead keep Individual permissions.

## Server/security implementation
`supabase/migrations/20260915144500_staff_role_management.sql`:
- creates private RLS-enabled `staff_roles`;
- revokes direct anon/authenticated table access;
- adds indexed FK `staff_access.role_key`;
- seeds Owner/Administrator;
- preserves all existing Admin operational access;
- when exactly one active Admin exists, maps that account to Owner without hard-coded identity.

`lib/access-roles.js` centralizes permission normalization, access-role lookup, Owner checks and assignment validation.

`api/admin-roles.js`:
- GET requires Staff `staff` permission;
- create/update/delete are Owner-only;
- mutations audit logged;
- system roles protected and assigned custom-role deletion blocked.

`api/admin-users.js`:
- Administrator invitation/promotion/demotion/deletion is Owner-only;
- Owner grants are Owner-only;
- current privileged account cannot change its own account type/access role/status;
- last active Owner and last active Administrator protections prevent lockout;
- secure invitations and account-owner-controlled email changes remain intact.

## Admin UI
`admin-role-management.js` adds:
- **Access roles** panel under Staff & access;
- Create role / edit role / permission checklist for Owner;
- separate **Account type** and **Access role** controls in user editor;
- Administrator/Owner choices for Admin accounts;
- custom role or Individual permissions for Staff;
- effective access role and permissions in the Staff table.

`admin.js` loads the extension with `6.4.39-access-roles-1`.

## Release evidence
- PR #90 exact tested head: `50a6995c2d01b3684a23bbb1f8a8e5babd7bcc46`;
- GitHub CI run `34984977855`: SUCCESS;
- exact-head preview `dpl_3VpLtjizfxLe8dVJXBzLc5SmvScJ`: READY, errors-only build log clean;
- production migration `20260915145635` / `staff_role_management`: applied successfully before merge;
- migration verification: protected Owner + Administrator rows exist, `staff_roles` RLS enabled, exactly one active Admin mapped to Owner;
- merge: `d4686b34851e9bf659e872a4f06609b70dfa56d4`;
- production deployment `dpl_GFYggUDm33USwygrhPfzLcdDFiqp`: READY on `namdar.co.uk`, build log clean;
- production `/api/health`: HTTP 200 / `ok:true` at `2026-09-15T14:57:54.408Z`;
- live `/admin.js` serves the access-role cache token and module;
- live `/admin-role-management.js` HTTP 200;
- unauthenticated `/api/admin-roles` HTTP 401, confirming fail-closed behavior;
- production 5xx scan found no logs.

The runtime error scan did show the expected 401 events caused by explicit unauthenticated security verification; those are not application failures.

No real staff/customer account, booking or payment was created for release verification. Stripe remains OFF and MFA remains mandatory.

## Owner action now
Hard-refresh Admin and open **Staff & access**. Confirm:
- signed-in access displays **Owner**;
- **Access roles** panel is visible;
- Owner and Administrator appear as protected roles;
- **Create role** opens the reusable permission editor.

A harmless temporary custom role can be created/deleted to smoke-test the UI, but there is no need to invite a real staff user merely for testing.

# Existing live systems
PR #88 booking-editor modal fix, PR #86 Website & legal crash repair, PR #84 secure logo upload and PR #82 flexible payment/deposit policy engine remain live. Commercial Stripe remains OFF. Privacy, Security Hardening, Staff My Jobs recovery, Business Finance, Smart Receipts, Newsletter Centre and guided Ask Namdar remain stable.

# Open tech/commercial items
ICO self-assessment, Leaked Password Protection, Google review URL, real-job pricing calibration, SMS/legal checks, Node `url.parse()` cleanup and the parked address-data pilot remain open. Commercial Stripe policy remains an owner decision.
