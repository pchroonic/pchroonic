# Namdar project status

Last updated: 2026-09-15 UTC

## Production baseline
- Repo `pchroonic/pchroonic`, default `main`.
- Current live product merge: `6c2ec57473d0d2f581c4eb70e76fe30d0add07dc` (PR #88).
- Current Admin JavaScript release remains v`6.4.37-admin-website-crash-fix-1`; Admin modal-layout CSS is cache-pinned separately as `6.4.38-admin-wide-modal-fix-1`.
- Customer loader remains v`6.4.35-payment-policy-engine-1`.
- Current production deployment `dpl_HfwhiUCgHa3KCuJPg8nZ8bDade2e`, READY and aliased to `namdar.co.uk`.
- Production health HTTP 200 / `ok:true` verified at `2026-09-15T14:30:31.829Z`.
- Supabase production: `qjigldxjcpnrlyxgmlqq`.
- Window Cleaning only live.
- Privileged Staff/Admin requires CAPTCHA + AAL2/TOTP MFA.
- Stripe customer payment policy OFF; production has `0` `site_settings.payments` rows and no commercial deposit bands have been approved/enabled.
- Ask Namdar provider AI disabled (`aiEnabled:false`).

## Admin Edit booking horizontal overflow — LIVE
PR #88 fixes the production **Edit booking** dialog shown by the owner with a horizontal scrollbar and clipped right-hand fields.

Root cause: the shared `.modal` style was capped at `max-width:520px`, while `#bookingEditor` uses `.modal-card.wide`. The previous wide-dialog rule did not override the inherited 520px maximum, so the child card overflowed the dialog.

Live behavior now:
- `admin-modal-layout.css` allows direct wide-card dialogs to grow responsively up to 980px while remaining inside the viewport;
- the wide card itself is constrained to the dialog width;
- form controls can shrink without forcing the grid wider;
- long booking context text wraps;
- <=700px layouts collapse to a single column;
- `admin.js` loads the stylesheet with cache token `6.4.38-admin-wide-modal-fix-1` while keeping the existing JavaScript module release pin unchanged.

Release evidence:
- exact tested head `00fe836c22cadb26391c92ff0f53cfd75b2fd77f`;
- final CI run `34981891259` SUCCESS;
- exact-head preview `dpl_DVMCKoGbxWdwu2vDn8AfCb8uJut2` READY and clean;
- merge/main `6c2ec57473d0d2f581c4eb70e76fe30d0add07dc`;
- production deployment `dpl_HfwhiUCgHa3KCuJPg8nZ8bDade2e` READY and clean;
- live `/admin.js` serves the modal-layout CSS cache token;
- live `/admin-modal-layout.css` serves the viewport/overflow guard;
- `/api/health` HTTP 200 / `ok:true` at `2026-09-15T14:30:31.829Z`;
- runtime scan showed no new application exception; only the previously known Node `url.parse()` deprecation warning remains.

No database, payment, booking-data, environment or security changes were made.

## Admin Website & legal crash fix — LIVE
PR #86 remains live. It repairs the missing **Public review URL** field before legacy website settings load and separates true MFA/session errors from post-MFA dashboard-load errors. Admin JavaScript loader remains `6.4.37-admin-website-crash-fix-1` and AAL2/TOTP remains required.

Release evidence: exact head `370ec326f5d5d462de34a4140f667d7d25acba81`, CI `34976265435` SUCCESS, preview `dpl_4SaDLWtHnfrmDr7QwoCcjZQXaDrW` READY/clean, merge `3e41cb5837d6394688d1ab5dbef11d9bdf8e5781`.

## Admin logo upload — LIVE
PR #84 introduced secure logo upload. Website & legal supports PNG/JPG/WebP/AVIF up to 2 MB, server-side signature validation, dedicated public `brand-assets` Storage, audit logging, and explicit **Save website settings** publishing. Upload remains protected by Staff/Admin `settings` permission plus AAL2/TOTP MFA.

## Flexible Payment & Deposit Policy Engine — LIVE
PR #82 remains live under the newer Admin release.

Live capabilities include revisioned flat/tiered deposits, frozen booking-specific payment policy revision/snapshot/deposit amount, configurable balance timing, overdue reminders/booking hold/manual recovery review, exact-money enforcement, and full outstanding balance after completion/due date.

Consumer safeguards remain: no automatic late-payment penalty, compounding fee or interest. B2B statutory interest/recovery is preview/manual only.

Commercial invariants:
- customer Stripe payments remain OFF;
- production has `0` `site_settings` rows with key `payments`;
- fallback 20% / £10 values are inactive code defaults only, not an approved commercial policy;
- Window Cleaning remains the only live payment-capable service.

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
- Owner should hard-refresh Admin and verify the live **Edit booking** dialog has no horizontal scrollbar/clipping.
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
