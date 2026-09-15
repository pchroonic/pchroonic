# Namdar project status

Last updated: 2026-09-15 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current main HEAD before PR #88: `db3715d38e356de8232a92be6909d9781a734ef8` (PR #87, documentation-only release record).
- Current live product merge: `3e41cb5837d6394688d1ab5dbef11d9bdf8e5781` (PR #86).
- Current Admin JavaScript release: v`6.4.37-admin-website-crash-fix-1`; customer loader remains v`6.4.35-payment-policy-engine-1`.
- Current production deployment `dpl_9sHrCSpkN8TWtVPjw3pz5cFd27zH`, READY on current `main` and aliased to `namdar.co.uk`.
- Production health HTTP 200 / `ok:true` verified at `2026-09-15T13:44:22.349Z`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Stripe customer payment policy OFF; production has `0` `site_settings.payments` rows and no commercial deposit bands have been approved/enabled.
- Ask Namdar provider AI disabled (`aiEnabled:false`).

## Admin Edit booking horizontal overflow — PR #88 IN RELEASE CHECKS
The owner supplied a production screenshot showing the **Edit booking** dialog with an internal horizontal scrollbar, clipped right-hand fields and content extending beyond the visible modal.

Root cause: the shared `.modal` style is capped at `max-width:520px`, while `#bookingEditor` uses `.modal-card.wide`. The existing wide-dialog rule changed `width` but did not override the inherited 520px `max-width`, so the wide card overflowed its dialog.

PR #88 changes only Admin presentation:
- new `admin-modal-layout.css` gives dialogs with a direct `.modal-card.wide` a responsive width up to 980px while staying within the viewport;
- the wide card is constrained to the dialog with `width:100%`, `max-width:100%`, `min-width:0`;
- form controls can shrink safely, long booking context text wraps, and small screens use a single-column form;
- `admin.js` loads the stylesheet with independent cache token `6.4.38-admin-wide-modal-fix-1` while retaining JavaScript release pin `6.4.37-admin-website-crash-fix-1`;
- `scripts/booking-operations.test.mjs` contains regression coverage for the layout guard and booking editor structure.

Release-candidate evidence so far:
- product head before continuity updates: `90a8616daf01af50a1006e8ccd5e0a3ebf104e31`;
- exact-head preview `dpl_AdsizaFDw3xf8piEd5UerSaHbXJ2` READY;
- CI run `34981520203` passed the full syntax/test step, including the new booking-modal test, and failed only the mandatory continuity-document check;
- this commit set updates all three required continuity documents.

No database migration, environment-variable change, booking mutation, payment activation or security change is involved. PR #88 is not yet production-live; final-head CI/preview, merge and post-merge production verification are still required.

## Admin Website & legal crash fix — LIVE
PR #86 fixed the post-logo-release Website & legal crash and false MFA error boundary.

Live behavior:
- `admin-brand-assets.js` creates the missing **Public review URL** control before legacy website settings load;
- `admin-mfa-guard.js` separates real MFA/session errors from later dashboard initialization failures;
- Admin JavaScript loader remains `6.4.37-admin-website-crash-fix-1`;
- MFA/AAL2 remains required.

Release evidence:
- exact tested head `370ec326f5d5d462de34a4140f667d7d25acba81`;
- CI run `34976265435` SUCCESS;
- exact preview `dpl_4SaDLWtHnfrmDr7QwoCcjZQXaDrW` READY and clean;
- merge/main `3e41cb5837d6394688d1ab5dbef11d9bdf8e5781`;
- production product deployment `dpl_2GimgSuA1zSDxiLvtA6BGNNPSEjD` READY and clean;
- live source and health verified; release runtime error/fatal scan returned no matching logs.

There was no database migration or environment-variable change. Stripe remains OFF. No real logo/customer/booking/payment data was created for verification.

## Admin logo upload — LIVE
PR #84 introduced secure logo upload; PR #86 fixed the Website-tab crash discovered during use.

Live behavior:
- Website & legal keeps the Logo URL field and has **Upload logo**;
- PNG/JPG/WebP/AVIF up to 2 MB can be selected and previewed;
- successful upload fills the permanent Storage URL;
- **Save website settings** remains the explicit publish step;
- server upload requires `settings` permission and AAL2/TOTP MFA;
- actual file signatures are validated server-side;
- brand files use dedicated public `brand-assets` storage with no direct browser write policy;
- upload is audit logged.

Original release evidence: exact head `9995e8e2a199beee24cabe4d24175f82bd293398`, CI `34973739008` SUCCESS, preview `dpl_Dvu9ctLyXRB16qrH1Q1wJXr8c7KF` READY/clean, Supabase migration `20260915130427` applied.

## Flexible Payment & Deposit Policy Engine — LIVE
PR #82 / customer v`6.4.35-payment-policy-engine-1`; its modules remain loaded under the newer Admin release.

Live capabilities:
- revisioned flat or job-value-tiered deposit policies;
- continuous/non-decreasing tier validation;
- frozen booking-specific payment policy revision, snapshot and deposit amount;
- future Admin policy changes do not rewrite earlier booking terms;
- configurable balance due timing after job end (0–168 hours);
- configurable overdue reminders, future-booking hold and recovery-review thresholds;
- exact-money deposit/full-payment checks before required-payment confirmation;
- completed/due invoices can request the full outstanding balance;
- customer-safe billing/export evidence without processor-private fields.

Consumer safeguards:
- no automatic consumer penalty, compounding fee or interest;
- consumer escalation is reminders, possible new-booking hold, then manual recovery review;
- B2B statutory interest/recovery is preview/manual only and never automatically posted.

Commercial invariants:
- customer Stripe payments remain OFF;
- production has `0` `site_settings` rows with key `payments`;
- fallback 20% / £10 values are inactive code defaults only, not an approved commercial policy;
- Window Cleaning remains the only live payment-capable service.

Release evidence: exact head `54e480a00e93bb780e687d0f59a0f14a2aa3bc29`, CI `34965887792` SUCCESS, preview `dpl_uUHG5oQaiP6gTiV3sFXoxwRisM3F` READY/clean, migration `20260915111500_flexible_payment_policy_engine.sql` applied, Terms v3 live.

## Booking cancellation / deposit policy — LIVE
The fair 48-hour policy remains live and incorporated into current Terms. Statutory consumer rights remain preserved and booking acceptance evidence is recorded.

## Privacy Centre / UK GDPR — LIVE
- Privacy/Cookie and My Namdar/Admin privacy centres live.
- Controller legal name/public postal address publication postponed by owner.
- ICO fee self-assessment still open.

## Security / operations stable
- Security Hardening live.
- Staff My Jobs auth recovery live and user-confirmed.
- Business Finance sole-trader-first/private.
- Smart Receipts private/review-first.
- Newsletter Centre consent-aware/resumable.
- Ask Namdar guided assistant live; provider AI off.
- Support tickets customer-only/private.

## Known technical debt / open roadmap
- Finish PR #88 release checks, merge/verify production, then have the owner hard-refresh Admin and reopen **Edit booking** to confirm the horizontal scrollbar and clipping are gone.
- Owner can retry Admin → Website & legal → **Choose file** → **Upload logo** → **Save website settings**.
- Owner later chooses actual commercial deposit bands/amounts and whether/when to activate Stripe.
- Build explicit business-customer classification before any automated B2B statutory-debt workflow.
- ICO data-protection fee self-assessment.
- Supabase Leaked Password Protection.
- Google review-request URL.
- Window real-job pricing calibration.
- SMS/legal checks.
- Node `url.parse()` deprecation cleanup.
- Address-data pilot remains parked.
