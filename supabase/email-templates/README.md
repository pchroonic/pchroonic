# Namdar Supabase Auth email templates

These files are the source-controlled Namdar versions of the hosted Supabase Auth email templates.

## Production sender

Recommended SMTP sender presentation:

- Sender name: `Namdar`
- Sender email: `accounts@namdar.co.uk`
- Support contact shown in emails: `support@namdar.co.uk`

The delivered sender currently appears as lowercase `namdar`; change the hosted Supabase SMTP sender name to `Namdar` when applying these templates.

## Brand system

The email designs intentionally use HTML text/shapes rather than a remote logo image so the Namdar identity is visible even when an email client blocks images.

- Ink: `#0d1715`
- Green: `#173c32`
- Lime: `#c8ff64`
- Mint: `#d7f7e7`
- Paper: `#f4f5ef`
- Muted: `#68736f`

## Hosted Supabase templates

Apply these from Supabase Dashboard → Authentication → Emails / Email Templates.

| Supabase template | Recommended subject | Source file |
| --- | --- | --- |
| Reset password | `Reset your Namdar password` | `reset-password.html` |
| Magic Link | `Your secure Namdar sign-in link` | `magic-link.html` |
| Confirm signup | `Confirm your Namdar account` | `confirm-signup.html` |
| Change email address | `Confirm your new Namdar email address` | `change-email.html` |
| Reauthentication | `{{ .Token }} is your Namdar verification code` | `reauthentication.html` |
| Invite user | `You're invited to Namdar` | `invite.html` |

These templates use Supabase-supported variables such as `{{ .ConfirmationURL }}`, `{{ .Token }}` and `{{ .NewEmail }}`. Do not replace those variables with real one-time links or codes in source control.

## Production workflow

1. Open the matching hosted Supabase email template.
2. Update the subject to the recommended subject above.
3. Replace the HTML body with the matching source file.
4. Save the template.
5. Send one controlled test for that flow and verify the delivered email in Resend/Gmail.
6. Never paste a live confirmation URL, recovery token, access token, password, CAPTCHA secret or customer data into this repository.

Resend open/click tracking should remain disabled for Supabase Auth emails because rewriting one-time Auth links can break them.

## Sender profile image / Gmail avatar

The inbox avatar is not controlled by these HTML templates. A durable brand avatar across supporting email clients is a separate sender-identity project using DMARC + BIMI and, for Gmail logo display, an eligible brand certificate path such as CMC/VMC where required. Do not tighten DMARC to `quarantine` or `reject` until all legitimate Namdar senders have been audited for SPF/DKIM alignment.

Until that sender-identity work is complete, these templates provide a consistent Namdar brand inside every Auth email without depending on remote images.
