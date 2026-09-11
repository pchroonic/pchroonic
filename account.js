(()=>{
  const v='6.4.16-security-mfa-1';
  document.write(`<script src="/account-original.js?v=${v}"><\/script>`);
  document.write(`<script src="/account-auth-hotfix.js?v=${v}"><\/script>`);
  document.write(`<script src="/account-mfa-guard.js?v=${v}"><\/script>`);
})();
