# Namdar AI handoff

Last verified: 2026-09-11 UTC

This is the first file every AI should read after opening the repository. Keep it concise, factual and current. Never store secret values or personal customer data here.

## Source of truth

- Product: Namdar, a UK exterior-cleaning and handyman service platform.
- Repository: `pchroonic/pchroonic`, default branch `main`.
- Hosting: Vercel project `namdar-website-starter-1`.
- Canonical domain: `https://namdar.co.uk`.
- Backend: Supabase project `namdar-production`.
- Current documented release heading: Namdar v6.4.16.

Repository plus verified provider state are the source of truth.

## Live baseline

Customer support tickets remain private to signed-in customers with an existing quote, booking, subscription or project. Public visitors use quote/chat/email paths. External inbound email remains in Admin → Email inbox and does not become a customer support ticket.

The homepage/support-routing fixes, My Namdar session-bootstrap fix, Email inbox spam protection and Inbox Security v2 are live.

## Phase 7 — Launch Security & Readiness

**Stage 1 staged MFA is live in production.**

Production was checked immediately before and after deployment: `auth.mfa_factors` contains **zero verified MFA factors**, so no existing user was disrupted by an already-enrolled factor.

Live Stage 1 behavior:

- **Customers:** MFA remains optional. Once a customer has a verified factor, an `aal1` session must complete the second factor before My Namdar portal data loads.
- **Admin/Staff dashboard:** a verified MFA factor is challenged before privileged dashboard data loads. Privileged accounts without MFA receive a TOTP authenticator-enrollment prompt. During rollout there is a visible **Continue for now** escape path to prevent accidental lockout; the prompt returns on a later session until MFA is enrolled.
- **Staff PWA:** uses the same staged privileged MFA behavior while online. Existing privacy-limited offline snapshots remain unchanged. `staff.js` is now a small loader; the former source is preserved byte-for-byte as `staff-original.js`.
- Staff service-worker cache `namdar-staff-v6.4.16-security-mfa-1` includes the loader/original/guard assets and activates immediately after its security assets are cached.

Important limitation: Stage 1 is an application/browser gate. Full API/database AAL2 enforcement is **not** complete yet. Admin, Staff and My Namdar still combine protected server APIs with some direct Supabase browser queries, so server/RLS enforcement must be audited as a separate change before being described as complete.

## Supabase/Auth security state

Applied production inbox/security migrations remain:

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`

No database migration and no new environment variable were required for MFA Stage 1.

Supabase Security Advisor no longer reports the prior mutable-search-path warning. Remaining RLS-with-no-policy findings are intentional server-only operational tables.

One hosted Auth warning remains: **Leaked Password Protection is disabled**. Supabase documentation says this feature rejects known breached passwords and is available on Pro plans and above. The current connector cannot mutate that hosted Auth dashboard setting; do not claim it is enabled until verified in the dashboard.

## Deployment and verification state

GitHub `main` automatically deploys to Vercel production.

MFA Stage 1:
- PR #7 exact feature commit `4e69b6da60f43724fd013e7fc0583ce983ca3823` passed the expanded JavaScript/handoff CI.
- Exact Vercel preview `dpl_6vGV4fWwcNVVJJpnW92CNyaXqP8X` reached READY and cloned that exact commit.
- PR #7 was rebased into `main` as `6cb1926b3da29d49a475f53e9dc07ddc0af915b9`.
- Production Vercel deployment `dpl_6qMAURUKHJqbiY4ngZcHP3YaZtD2` reached READY, built the exact main SHA, attached `namdar.co.uk`, and reported no alias error.
- Canonical live HTTP 200 verified for `account.js`, `account-mfa-guard.js`, `admin.js`, `admin-mfa-guard.js`, `staff.js`, `staff-mfa-guard.js`, and `staff-sw.js`.
- The real administrator TOTP enrollment + next-session AAL2 challenge has **not yet been exercised**. Do not claim that interactive step is complete until the user performs it.

## Known launch checks and cautions

- Next, have the administrator enroll TOTP from the live Admin security prompt; preferably enroll a backup factor too.
- After a successful next-login AAL2 challenge is demonstrated, remove the temporary privileged-user bypass in a separate change.
- Then audit and add AAL2 enforcement to privileged server APIs and direct-data/RLS paths.
- Enable Supabase Auth Leaked Password Protection in hosted Auth settings.
- Verify Stripe, Turnstile, OAuth providers, SMS provider, Resend configuration and legal content before public advertising.
- Confirm Supabase Auth Site URL/redirect allowlist for `https://namdar.co.uk`.
- Verify booking-notification and account-purge cron jobs.
- Confirm database/application double-booking protections.

## Required workflow for future AI sessions

1. Read this file, `docs/PROJECT_STATUS.md` and `AGENTS.md`.
2. Inspect source and live provider state before changing anything.
3. Make the smallest safe change.
4. Test adjacent customer/admin/staff paths.
5. Update this file and `docs/PROJECT_STATUS.md` in the same substantial-change commit.
6. State DB/migration impact, env-var impact, deployment status and remaining verification accurately.

## Next recommended step

Open the live Admin dashboard and complete the new TOTP authenticator enrollment. Sign out and sign back in to verify the AAL2 challenge appears before Admin data loads. Only after that verified recovery-safe enrollment should the temporary **Continue for now** bypass be removed.
