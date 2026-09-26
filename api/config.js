const { json, supabaseUrl, publicKey, env, safeError } = require('../lib/server');
module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') return json(res, 405, { ok:false, error:'Method not allowed' });
    return json(res, 200, {
      ok: true,
      supabaseUrl: supabaseUrl(),
      supabaseAnonKey: publicKey(),
      stripeEnabled: Boolean(env('STRIPE_SECRET_KEY')),
      depositPercent: Math.max(1, Math.min(100, Number(env('NAMDAR_DEPOSIT_PERCENT','20')) || 20)),
      emailEnabled: Boolean(env('RESEND_API_KEY') && env('NAMDAR_FROM_EMAIL')),
      remindersEnabled: Boolean(env('RESEND_API_KEY') && env('NAMDAR_FROM_EMAIL') && env('CRON_SECRET')),
      businessFollowupsEnabled: Boolean(env('RESEND_API_KEY') && env('NAMDAR_FROM_EMAIL') && env('CRON_SECRET')),
      adsEnabled: Boolean(env('GOOGLE_ADSENSE_CLIENT') && env('GOOGLE_ADSENSE_SLOT_HOME')),
      adsenseClient: env('GOOGLE_ADSENSE_CLIENT'),
      adsenseSlotHome: env('GOOGLE_ADSENSE_SLOT_HOME'),
      turnstileSiteKey: env('TURNSTILE_SITE_KEY'),
      phoneVerificationEnabled: ['1','true','yes','on'].includes(String(env('NAMDAR_PHONE_VERIFICATION_ENABLED','')).trim().toLowerCase()),
      phoneVerificationMode: 'supabase_sms',
      addressLookupEnabled: true,
      addressSystem: 'namdar',
      aiEnabled: Boolean(env('OPENAI_API_KEY') && env('OPENAI_MODEL')),
      companyEmail: env('NAMDAR_COMPANY_EMAIL','hello@namdar.co.uk'),
      supportEmail: env('NAMDAR_SUPPORT_EMAIL','support@namdar.co.uk')
    });
  } catch (e) { return safeError(res,e); }
};
