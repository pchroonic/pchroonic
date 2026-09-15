# Namdar AI handoff

Last verified: 2026-09-15 UTC

Read `docs/AI_START.md` first. Use `docs/PROJECT_STATUS.md` for the broader roadmap.

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main: `3b7f46fa15bbe386f00de32529529763cb19f307` (PR #89 docs-only).
- Current live product merge: `6c2ec57473d0d2f581c4eb70e76fe30d0add07dc` (PR #88).
- Admin base JS release `6.4.37-admin-website-crash-fix-1`; modal CSS `6.4.38-admin-wide-modal-fix-1`; customer loader `6.4.35-payment-policy-engine-1`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Vercel project: `prj_4fILo0pCaLGUSUIMWrBIVGzeWVDC`; team: `team_8Az8WtWcnfwtYRdhR8vGqC3L`.
- Current production deployment: `dpl_7Dg4UQH3MHR1HbjURanFgcTafJSb`, READY on `namdar.co.uk`.
- Health HTTP 200 / `ok:true` at `2026-09-15T14:33:46.185Z`.
- Window Cleaning only live. Customer Stripe remains OFF. Provider AI remains OFF. Privileged access requires CAPTCHA + AAL2/TOTP.

# Owner & custom access roles — RELEASE CANDIDATE

## User request
Allow Admin to create additional reusable roles and make the existing top-level Admin the **Owner**.

## Architecture decision
Do **not** add `owner` to `profiles.role`. Existing authorization and database policies use the coarse `customer` / `staff` / `admin` model, so changing that security boundary would create unnecessary regression risk.

Instead, keep `profiles.role='admin'` for privileged Admin accounts and add a second access-role layer:
- `staff_roles`: reusable role definitions;
- `staff_access.role_key`: assignment to Owner, Administrator or a custom Staff role.

This preserves existing Admin authorization and AAL2/TOTP while giving Namdar a safe hierarchy.

## Files in the candidate
### `supabase/migrations/20260915144500_staff_role_management.sql`
- creates private/RLS-enabled `staff_roles` with no anon/authenticated table grants;
- adds `staff_access.role_key` FK + index;
- seeds protected `owner` and `administrator` roles with the current full operational permission set;
- backfills existing Admin accounts into `staff_access` as Administrator;
- if exactly one active Admin exists, promotes that unambiguous account to Owner without hard-coding a generated user id.

### `lib/access-roles.js`
- authoritative permission catalogue;
- normalizes role permissions to known keys only;
- resolves assigned roles;
- `isOwner()` / `requireOwner()` helpers;
- validates that Owner/Administrator can only be assigned to coarse Admin accounts and custom roles only to Staff.

### `api/admin-roles.js`
- GET is available to Staff users with `staff` permission;
- POST/PATCH/DELETE are Owner-only;
- protected system roles cannot be edited/deleted;
- role names are duplicate-checked;
- changing a custom role propagates the new permission map to all assigned Staff accounts;
- deleting an assigned role is blocked;
- all mutations are audit logged.

### `api/admin-users.js`
- Admin invitations/promotions/demotions/deletion are now Owner-only;
- Owner role grants are Owner-only;
- custom role assignment is supported for Staff;
- Admin defaults to Administrator unless Owner is explicitly granted;
- last active Owner is protected, in addition to the existing last active Administrator protection;
- current signed-in privileged account cannot change its own account type/access role/status;
- secure invitations and account-owner-controlled email changes remain intact.

### `admin-role-management.js`
- injects **Access roles** into Staff & access;
- Owner can create/edit/delete custom roles and tick dashboard permissions;
- non-Owner staff managers see definitions read-only;
- user editor distinguishes Account type from Access role;
- Admin access roles: Administrator / Owner;
- Staff access: custom reusable role or Individual permissions;
- role-managed checkboxes become read-only and show effective permissions;
- staff table shows access role, account type, job title and permission summary;
- preserves the secure invitation flow rather than restoring temporary passwords.

### `admin.js`
Loads the extension with independent cache token `6.4.39-access-roles-1`; older module version pins remain unchanged.

### Regression / CI
- `scripts/access-roles.test.mjs` covers permission bounding, private schema, initial Owner migration, Owner-only mutations, lockout safeguards and UI loader;
- `scripts/security-hardening.test.mjs` updated for Owner hierarchy while preserving original security assertions;
- workflow adds syntax checks for new server/browser files and runs access-role tests.

## Release constraints
- Migration must be applied and verified before product merge because the new APIs/UI depend on `staff_roles` and `staff_access.role_key`.
- The migration is additive/backward-compatible with the current production code.
- Production currently has exactly one active Admin, so the migration can safely identify the initial Owner by state rather than identity.
- Do not create test customers, real payments or activate Stripe as part of this release.
- Do not relax CAPTCHA or AAL2/TOTP.

## Verification sequence
1. Update all continuity docs in the product PR.
2. Open PR and wait for exact-head GitHub CI.
3. Verify exact-head Vercel preview/build logs.
4. Apply `staff_role_management` migration to production.
5. Verify `staff_roles` has Owner + Administrator and exactly one active Admin is assigned Owner.
6. Merge exact tested head.
7. Verify production deployment READY, health 200, live Admin loader includes `6.4.39-access-roles-1`, and runtime logs have no new errors.
8. Record release evidence in a docs-only follow-up PR.

# Existing live systems
- PR #88 Admin booking editor overflow fix is live.
- PR #86 Website & legal crash fix is live.
- PR #84 secure Admin logo upload is live.
- PR #82 flexible payment/deposit policy engine is live, while commercial Stripe activation remains OFF.
- Privacy Centre, Security Hardening, Staff My Jobs auth recovery, Business Finance, Smart Receipts, Newsletter Centre and guided Ask Namdar remain live/stable.

# Open tech/commercial items
Commercial Stripe policy remains unapproved/off. ICO self-assessment, Leaked Password Protection, Google review URL, real-job pricing calibration, SMS/legal checks, Node `url.parse()` cleanup and the parked address-data pilot remain open.
