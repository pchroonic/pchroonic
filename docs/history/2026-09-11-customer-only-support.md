# 2026-09-11 — Customer-only support tickets

## Decision

Public visitors do not create support tickets. They can request a quote, use general chat guidance or email Namdar. Support tickets are a private after-enquiry/after-booking service for signed-in customers with an existing quote, booking, subscription or project.

## Implementation

- Removed the public support-ticket form and public chat-to-ticket creation path.
- Added clear public routes to request a quote, email Namdar or sign in to My Namdar.
- Enforced authentication, active customer role and a Namdar relationship in `api/ticket-create.js`.
- Removed Turnstile from authenticated customer ticket creation while retaining it for public sign-in, registration and guest chat.
- Added matching eligibility guidance and disabled-state behaviour in My Namdar.
- Bumped the documented release and browser asset versions to v6.4.16.

## Data and deployment

- Supabase schema: unchanged.
- Migration: none.
- Environment variables: unchanged.
- Existing email/ticket separation: preserved.
- Production deployment: automatic from GitHub `main`; verify the resulting Vercel deployment before declaring the release live.
