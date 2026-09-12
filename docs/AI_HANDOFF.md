# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first for the compact current state and immediate next action. Use this file for detailed technical continuity. Never store secret values or private customer data here.

## Source of truth

- Product: Namdar, UK exterior-cleaning and handyman service platform.
- Repository: `pchroonic/pchroonic`, default branch `main`.
- Hosting: Vercel project `namdar-website-starter-1`.
- Canonical domain: `https://namdar.co.uk`.
- Backend: Supabase project `namdar-production` (`qjigldxjcpnrlyxgmlqq`).
- Supabase organization plan: **Free**.
- Current documented release heading: Namdar v6.4.16.

Repository plus verified provider state are the source of truth.

## Fast-resume continuity model

Namdar uses three continuity layers:
- `docs/AI_START.md` — compact current state, exact next action, blockers and do-not-repeat notes.
- `docs/AI_HANDOFF.md` — detailed technical continuity, migrations, deployment checks and implementation decisions.
- `docs/PROJECT_STATUS.md` — broader roadmap and launch status.

CI requires all three to be updated with any product-source change. This is designed so a new ChatGPT/Claude session can resume quickly without rereading the full history unless the task is substantial.

## Support model — unchanged

Customer support tickets remain private to signed-in customers with an existing quote, booking, subscription or project. Public visitors use quote/chat/email. External inbound email remains in Admin → Email inbox and does not become a customer support ticket.

## Phase 7 — Launch Security & Readiness

### MFA Stage 2 — LIVE AND USER-VERIFIED

The administrator successfully enrolled TOTP before Stage 2. Production has 1 verified MFA factor for 1 admin user.

Stage 2 is enforced in three layers:

1. **Browser/Admin/Staff**
   - Admin/Staff no longer have a `Continue for now` bypass.
   - Privileged users with a verified factor must complete the second-factor challenge before privileged UI data loads.
   - Privileged users without a factor must enroll and verify TOTP before continuing.
   - Staff offline mode only accepts an unexpired cached session whose JWT already carries `aal2`; an old `aal1` session must reconnect and verify first.

2. **Vercel server APIs**
   - `lib/server.js` is a small AAL2 wrapper around byte-for-byte preserved `lib/server-original.js`.
   - Wrapped `requireStaff()` first performs the original authenticated user/role/permission check, then requires the already-validated bearer token to carry `aal = aal2`; otherwise privileged server APIs return 403.
   - No new environment variable was required.

3. **Supabase direct-client / RLS**
   - Applied production migration: `20260911230055 require_aal2_for_staff_permissions`.
   - `private.has_staff_permission(...)` requires `(auth.jwt()->>'aal') = 'aal2'` before granting privileged permission.
   - `Staff read own access` on `public.staff_access` also requires AAL2.
   - Customer/public RLS behavior was not changed.

## Stage 2 deployment and smoke-test verification

- Feature commit: `d203c64d9e5da3cca049bcb43e988f7432e2864c`.
- PR: #8, `Enforce AAL2 for privileged Namdar access`.
- GitHub CI run `34656209581`: success.
- Vercel preview: `dpl_2bfBkHgR4k8SY4hL4AcUrn3NWzzT`, READY on exact feature SHA.
- Main Stage 2 code SHA: `ece88931bd5e05b26173b25ff7fa75c46b6b4e63`.
- Production deployment: `dpl_Jkb8ZavhqrBD6PLpqjAPnEdiGAsW`, READY on exact main SHA with `namdar.co.uk` and no alias error.
- Canonical `admin.js` serves `6.4.16-security-mfa-2` and live `admin-mfa-guard.js` has no bypass.
- Database definition checks confirmed both central staff-permission function and staff self-access policy require AAL2.
- Controlled database test using the same active admin identity internally: `aal1` denied, `aal2` allowed.
- **User production smoke test passed on 2026-09-12:** full Admin sign-out, fresh sign-in, authenticator challenge completed, and Admin → Inbox loaded normally. Do not repeat unless a future auth change needs regression testing.

## Mobile homepage horizontal-overflow regression — FIX LIVE, IPHONE CONFIRMATION PENDING

On 2026-09-12 the owner supplied an iPhone screenshot of the homepage quote form showing a blank strip on the right. The screenshot also showed the left edge of the page clipped by a similar amount, indicating the whole document had been horizontally panned rather than the quote section simply having extra right padding.

Likely cause was an intrinsic-width mobile form/grid child on iOS Safari. The quote UI used plain `1fr` CSS grid tracks and includes a native multi-file input; native file controls can retain a min-content width that pushes the document beyond the visual viewport on Safari even when the control has `width:100%`.

Implementation:
- `mobile-overflow-fix.css` contains isolated homepage/quote containment rules;
- quote shell, field rows, service choices and progress grid use shrink-safe `minmax(0,1fr)` tracks;
- grid items and quote controls get `min-width:0`, and controls are capped at `max-width:100%`;
- the native file input is explicitly constrained and clipped inside the form;
- on mobile, `html` and `body.conversion-home` use `overflow-x:clip` plus `overscroll-behavior-x:none`, with `overflow-x:hidden` fallback for engines without `clip`;
- the viewport guard is scoped to the public homepage so internal Admin/Staff table scrolling is not affected;
- existing intentionally horizontally scrollable strips remain locally scrollable;
- homepage-only `conversion.js` loads `/mobile-overflow-fix.css?v=20260912` before conversion interactions start.

Verification and deployment:
- local `node --check` on updated `conversion.js`: passed;
- CSS structural sanity checks: passed;
- 390px Chromium regression test: document `scrollWidth === innerWidth`, native file input remained inside the quote form, and a local horizontally scrollable proof strip retained `scrollWidth > clientWidth`;
- the exact Safari/iPhone symptom was not reproducible in Chromium, so this is not a Safari reproduction claim;
- PR #12: `Fix mobile quote horizontal overflow`;
- feature/PR head: `febd6bbaacee5c08273e4ba7b70d8749dc160313`;
- GitHub CI run `34685321573`: success;
- exact Vercel preview: `dpl_8vbLRZdTAUttgXjhfRw2LBtb8sXq`, READY; build log confirms branch `fix/mobile-quote-overflow-20260912`, commit `febd6bb`;
- main/production merge SHA: `285b7c3da8215dc24e543f9a6143e565d10e61a7`;
- production deployment: `dpl_CkWNqBc8JkMuWh77BWYJXkXwP3oA`, READY on exact merge SHA, target production, aliases include `namdar.co.uk`, `aliasError: null`;
- canonical `https://namdar.co.uk/conversion.js` returned HTTP 200 and contains the stylesheet loader;
- canonical `https://namdar.co.uk/mobile-overflow-fix.css?v=20260912` returned HTTP 200 and contains the expected shrink/viewport rules.

No database migration, Auth change, environment variable, provider configuration or customer-data change was involved.

**Remaining verification:** ask the owner to refresh/reopen the production homepage on the same iPhone and confirm the page no longer slides sideways or exposes the blank right-side gap. Only after that confirmation should this regression be marked fully closed.

## Migration history note

The branch originally contained a pre-named migration file `20260911231500_require_aal2_for_staff_permissions.sql`. Supabase assigned the actual applied migration version `20260911230055`; repository filename is aligned to `20260911230055_require_aal2_for_staff_permissions.sql` so source history matches production.

## Security advisor state

Post-migration Supabase Security Advisor showed no new Stage 2 regression.

Existing findings:
- INFO: eight server-only operational tables have RLS enabled with no authenticated policies; intentional for tables accessed through service-role server code.
- WARN: **Leaked Password Protection is disabled** in hosted Supabase Auth.

Current Supabase docs state leaked-password protection rejects passwords known in HaveIBeenPwned's Pwned Passwords data and is available on **Supabase Pro plan and above**. The actual Namdar Supabase organization was verified on 2026-09-12 to be on the **Free plan**, so this advisor warning cannot be cleared without upgrading the organization.

Treat Leaked Password Protection as a **plan-blocked optional hardening item**, not an active Free-plan blocker. Do not upgrade Supabase or incur a paid plan change without explicit owner approval. Do not repeatedly ask the owner to enable the setting while the organization remains on Free.

The currently connected Supabase tools also do not expose hosted Auth configuration mutation/readback for these settings.

## Applied production migrations relevant to current work

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`
- `20260911230055 require_aal2_for_staff_permissions`

## Remaining launch work

1. Obtain the owner's real-iPhone confirmation that the live mobile quote overflow/right-gap issue is fixed; then mark the regression closed.
2. Verify Supabase Auth Site URL is `https://namdar.co.uk` and review the redirect allowlist for stale/unintended URLs.
3. Finish launch checks for Stripe, Turnstile, OAuth providers, SMS provider, Resend and legal configuration.
4. Verify booking-notification/account-purge cron jobs and intended double-booking protection.
5. Run safe recognized-mailbox/unknown-alias inbound behavior test.
6. Complete controlled authenticated customer-support ticket test when a safe test customer is available.
7. Optional/plan-blocked: enable Supabase Leaked Password Protection only if the owner later chooses a Pro-or-above plan.

## Required workflow

1. Read `docs/AI_START.md` first.
2. For substantial work, read this file, `docs/PROJECT_STATUS.md` and `AGENTS.md` completely.
3. Inspect repository and provider state before changing anything.
4. Use branch → PR → CI → Vercel preview/testing → merge → production verification.
5. Apply database migrations only with verified production intent and record the actual applied migration.
6. Update `docs/AI_START.md`, this file and `docs/PROJECT_STATUS.md` in the same substantial product change.
7. Never include credentials or private customer data.

## Next recommended step

Get the owner's real-iPhone confirmation for the production mobile overflow fix. If confirmed, close that regression in continuity, then resume Supabase Auth Site URL / redirect allowlist verification and the remaining provider launch-readiness checklist. Leaked Password Protection remains optional and plan-blocked while Supabase is on Free.
