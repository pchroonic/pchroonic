(()=>{
  const v='6.4.31-staff-auth-recovery-1';
  const experienceV='6.4.40-staff-experience-v2-1';
  document.write(`<link rel="stylesheet" href="/staff-experience-v2.css?v=${experienceV}">`);
  document.write(`<script src="/privileged-login-captcha.js?v=${v}"><\/script>`);
  document.write(`<script src="/staff-original.js?v=${v}"><\/script>`);
  document.write(`<script src="/staff-experience-v2.js?v=${experienceV}"><\/script>`);
  document.write(`<script src="/staff-auth-readiness.js?v=${v}"><\/script>`);
  document.write(`<script src="/staff-closeout.js?v=${v}"><\/script>`);
  document.write(`<script src="/staff-mfa-guard.js?v=${v}"><\/script>`);
})();
