# Namdar AI handoff

Last verified: 2026-09-12 UTC

Read `docs/AI_START.md` first for compact state. Use this file for detailed technical continuity. Never store secrets or private customer data here.

## Source of truth

- Product: Namdar, UK exterior-cleaning and handyman service platform.
- Repository: `pchroonic/pchroonic`, default branch `main`.
- Current `main` before branded-email branch: `f9192284d2f2844d3b2940408fb3cda363758b9c`.
- Current live product code SHA: `72d52d06a09852de8ee5c329adf57f5934e5dcc1`.
- Hosting: Vercel project `namdar-website-starter-1`, canonical `https://namdar.co.uk`.
- Backend/Auth: Supabase `namdar-production` (`qjigldxjcpnrlyxgmlqq`), organization plan Free.
- Email provider: Resend, verified domain `namdar.co.uk`, sending + receiving enabled, eu-west-1.
- Current documented release heading: v6.4.16.

Repository plus verified provider/deployment state are the source of truth. If older notes conflict with code/live state, correct them.

## Continuity model

- `docs/AI_START.md`: fast resume + exact next action.
- `docs/AI_HANDOFF.md`: detailed technical continuity.
- `docs/PROJECT_STATUS.md`: broader roadmap/status.

CI requires all three for substantial product-source changes.

## Support model — unchanged

Customer support tickets are private to signed-in customers with an existing quote, booking, subscription or project. Public visitors use quote/chat/email. Public inbound email remains Admin → Email inbox and does not become a customer support ticket.

## Phase 7 — Launch Security & Readiness

### MFA Stage 2 — LIVE AND USER-VERIFIED

MFA Stage 2 is enforced at browser/Admin/Staff, Vercel API and Supabase RLS layers. Applied migration: `20260911230055 require_aal2_for_staff_permissions`.

Verified production path on 2026-09-12: Admin sign-out → fresh sign-in → authenticator challenge → Admin Inbox loaded normally.

References: PR #8, CI `34656209581` success, preview `dpl_2bfBkHgR4k8SY4hL4AcUrn3NWzzT` READY, main code SHA `ece88931bd5e05b26173b25ff7fa75c46b6b4e63`, production `dpl_Jkb8ZavhqrBD6PLpqjAPnEdiGAsW` READY.

## Homepage horizontal overflow — LIVE

PR #16 implemented all-width document containment and x=0 restoration after the issue was reproduced on both iPhone and Windows/Edge desktop.

Owner verification: Windows/Edge desktop confirmed fixed on 2026-09-12. Same-iPhone final check remains pending.

## Supabase Auth URL Configuration — COMPLETE

Owner saved:
- Site URL `https://namdar.co.uk`
- Redirect allowlist `https://namdar.co.uk/**`

Four unnecessary Vercel exact/wildcard redirect entries were removed.

## Supabase Sign In / Providers — REVIEWED

Intended production state:
- new user signup + confirm email enabled;
- Email provider enabled;
- Google provider enabled and intentional;
- Phone, anonymous sign-in, manual linking, all other shown social/custom providers disabled.

Important: Namdar uses Google Identity Services and Supabase `signInWithIdToken`; production has at least one customer identity that relies on Google without a separate email/password identity. Do not disable Google without a recovery/migration plan.

## Supabase Attack Protection / CAPTCHA — ENABLED

Owner-confirmed Supabase Attack Protection is ON using Cloudflare Turnstile. Existing Namdar Turnstile secret was copied directly from Cloudflare into Supabase; no secret was shared or stored in repo/chat.

PR #19 `Prepare customer Auth for Supabase CAPTCHA` is live:
- feature head `cecab9d0236a8ef804c7b52f6f78741f46a93001`;
- CI `34688813723`: success;
- preview `dpl_2rb4eyRExRTMiG1dxgdrf6xv4XHv`: READY;
- production code SHA `72d52d06a09852de8ee5c329adf57f5934e5dcc1`;
- production deployment `dpl_DSmsBZ9DTxg9Dtw9tbyYHWWtpxYw`: READY.

Live guard sends Turnstile tokens for password login, Magic Link, Google ID-token login, signup, password reset and confirmation resend, then resets the challenge/token after each request.

### CAPTCHA/Auth smoke-test progress

Passed:
- fresh/private-session real customer login after CAPTCHA enablement → My Namdar opened normally;
- password-reset request after CAPTCHA enablement → reset email delivered successfully through Resend to the owner.

Do not store or quote the live reset URL/token returned in provider inspection. Treat one-time Auth links as secrets.

Still pending:
- Magic Link request + delivered email;
- alternate live login method if practical;
- confirmation resend/safe signup only with a disposable account if needed.

## Auth email branding — FEATURE SOURCE PREPARED, HOSTED TEMPLATES NOT LIVE YET

The delivered password-reset email exposed that Supabase hosted Auth emails still use plain default HTML. Resend inspection also showed the SMTP display name currently renders as lowercase `namdar` from `accounts@namdar.co.uk`.

Feature branch: `feature/branded-auth-emails-20260912`.

Prepared source-controlled templates under `supabase/email-templates/`:
- `README.md` — subjects, sender presentation, apply/test workflow and avatar/BIMI notes;
- `reset-password.html`;
- `magic-link.html`;
- `confirm-signup.html`;
- `change-email.html`;
- `reauthentication.html`;
- `invite.html`.

### Design decisions

- Uses existing Namdar palette: ink `#0d1715`, green `#173c32`, lime `#c8ff64`, mint `#d7f7e7`, paper `#f4f5ef`.
- Uses table-based email layout with inline styles for broad client compatibility.
- Brand header is an HTML/CSS `N` tile + `NAMDAR` wordmark rather than a remote image, so branding remains visible even with remote images blocked.
- Consistent security copy, clear CTA, support link and Namdar footer.
- Uses official Supabase Go-template variables such as `{{ .ConfirmationURL }}`, `{{ .Token }}` and `{{ .NewEmail }}`; no real one-time links/codes are committed.
- Recommended sender display: `Namdar <accounts@namdar.co.uk>` rather than lowercase `namdar`.
- Recommended subjects are recorded in the template README.

Supabase hosted projects require these templates to be copied into Dashboard → Authentication → Emails / Email Templates (or changed through the Management API with a user-owned access token). Current connected Supabase tooling does not expose hosted Auth-template mutation, so **do not ask the user to paste an access token into chat**. Prefer dashboard application.

No database migration or runtime code/environment-variable change is required for the template source itself.

### Email provider state

Resend domain `namdar.co.uk` is verified; sending and receiving are enabled. Resend reports DKIM and SPF sending records verified. Open Tracking and Click Tracking are currently disabled, which is desirable for Supabase one-time Auth links because link rewriting can break them.

## Gmail sender avatar / BIMI — SEPARATE TASK

The generic Gmail sender avatar is not controlled by Supabase email HTML. A durable cross-client logo is a sender-identity configuration task using DMARC + BIMI; Gmail brand-logo display may require an eligible CMC/VMC certificate path.

Do not promise Gmail will show the logo merely because an image is placed in the email template. Do not tighten DMARC to `p=quarantine` or `p=reject` until legitimate Namdar senders are audited for SPF/DKIM alignment. Resend is known aligned at the provider domain level, but all possible senders must be checked before enforcement.

## Branded email promotion/apply plan

1. Complete branch review/CI/merge so templates are durably backed up in GitHub.
2. Apply **Reset password** first in Supabase hosted Email Templates and update sender display name to `Namdar` if still lowercase.
3. Trigger one controlled password reset and verify delivered rendering/sender in Gmail + Resend.
4. If good, apply the remaining five auth templates and test non-destructive flows one at a time.
5. Then audit DNS/DMARC + all legitimate senders before deciding on BIMI/certificate setup for the inbox avatar.

Do not claim the branded templates are live until the Supabase dashboard has been saved and a delivered message is verified.

## Leaked Password Protection — PLAN-BLOCKED

Supabase Auth leaked-password protection remains disabled. Namdar is on Supabase Free and the feature requires Pro or above. Treat as optional/plan-blocked; do not upgrade or incur cost without explicit owner approval.

## Applied recent production migrations

- `20260911213820 inbox_spam_controls`
- `20260911213842 inbox_spam_blocklist_fk_index`
- `20260911220343 inbox_security_indexes`
- `20260911220415 harden_invoice_number_function_search_path`
- `20260911230055 require_aal2_for_staff_permissions`

## Remaining launch work

1. Finish branded Auth-email branch promotion, apply/reset-test hosted templates and then complete remaining auth-email set.
2. Complete Magic Link/remaining CAPTCHA Auth smoke tests.
3. Audit DMARC/sender alignment and decide BIMI/avatar path.
4. Recheck same iPhone for homepage overflow and close cross-device regression if it passes.
5. Finish Stripe, SMS, Resend/legal launch configuration.
6. Verify production cron jobs and intended double-booking protections.
7. Run safe recognized-mailbox/unknown-alias inbound behavior test.
8. Complete controlled authenticated customer-support journey when a safe eligible test customer is available.
9. Optional/plan-blocked: leaked-password protection only if owner later chooses Pro or above.

## Required workflow

For substantial work: read `AGENTS.md`, `docs/AI_START.md`, this file, `docs/PROJECT_STATUS.md` and relevant source. Use branch → PR → CI → preview/testing → merge → production verification. Update all three continuity files in the same substantial change. Never include credentials, private customer data, TOTP codes, SMTP secrets, CAPTCHA secrets or one-time Auth links.

## Next recommended step

Finish CI/merge for `feature/branded-auth-emails-20260912`, then apply and test the branded Reset password template first before rolling the complete set into hosted Supabase Auth.
