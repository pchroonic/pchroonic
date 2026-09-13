(()=>{
  const v='6.4.23-supabase-lockless-1';
  const supabaseVersion='2.116.0';
  document.write(`<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${supabaseVersion}"><\/script>`);
  document.write(`<script src="/account-auth-hotfix.js?v=${v}"><\/script>`);
  document.write(`<script src="/account-original.js?v=${v}"><\/script>`);
  document.write(`<script src="/account-captcha-guard.js?v=${v}"><\/script>`);
  document.write(`<script src="/account-mfa-guard.js?v=${v}"><\/script>`);
  document.write(`<script src="/account-service-availability.js?v=${v}"><\/script>`);
  document.write(`<script src="/account-payments.js?v=${v}"><\/script>`);
})();
