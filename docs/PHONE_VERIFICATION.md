# Phone verification activation

Namdar's customer phone-verification flow is built but disabled by default.

## Current state

- Customers can enter and save a mobile number.
- Numbers are normalised to international E.164 format before use.
- `profiles.phone_verified` remains `false` until a real SMS OTP is successfully confirmed.
- SMS send/verify buttons are disabled while the feature flag is off.
- An unverified saved phone does not block account completion while SMS verification is disabled.
- No SMS provider is required and no SMS cost is incurred in the disabled state.

## Turn it on later

1. Choose and fund a Supabase-supported SMS provider. Supabase currently documents providers such as Twilio, MessageBird, Vonage, and community-supported TextLocal.
2. Configure that provider in the Supabase project under Auth phone/SMS provider settings.
3. Confirm phone auth / phone change verification is enabled in Supabase and use E.164-format numbers.
4. In Vercel, set:
   `NAMDAR_PHONE_VERIFICATION_ENABLED=true`
5. Redeploy production.
6. Test with a real UK mobile number:
   - save/change the number;
   - request an SMS code;
   - enter the OTP;
   - confirm My Namdar shows Verified;
   - confirm `profiles.phone_verified=true` for that customer.
7. Test resend/rate-limit behaviour before announcing the feature.

## Turn it off again

Set:

`NAMDAR_PHONE_VERIFICATION_ENABLED=false`

and redeploy.

Customers keep their saved numbers. No new SMS verification requests will be sent while the flag is off.

## Implementation

The browser uses Supabase's standard signed-in phone-change flow:
- `auth.updateUser({ phone })` to request phone confirmation;
- `auth.verifyOtp({ phone, token, type: 'phone_change' })` to confirm the OTP.

This is separate from Advanced MFA Phone. Namdar's authenticator-app MFA remains independent.
