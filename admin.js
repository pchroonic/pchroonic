(()=>{
  const v='6.4.16-privileged-captcha-1';
  document.write(`<link rel="stylesheet" href="/admin-inbox-safety.css?v=${v}">`);
  document.write(`<script src="/privileged-login-captcha.js?v=${v}"><\/script>`);
  document.write(`<script src="/admin-original.js?v=${v}"><\/script>`);
  document.write(`<script src="/admin-mfa-guard.js?v=${v}"><\/script>`);
  document.write(`<script src="/admin-inbox-safety.js?v=${v}"><\/script>`);
  document.write(`<script src="/admin-address-harvest.js?v=${v}"><\/script>`);
})();
