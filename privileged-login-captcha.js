(() => {
  let siteKey = '', slotId = '', widgetId = null, token = '';
  let libraryPromise = null, mountPromise = null;

  function status(message) {
    const element = document.getElementById(`${slotId}Status`);
    if (element) element.textContent = message;
  }

  function loadLibrary() {
    if (window.turnstile?.render) return Promise.resolve();
    if (!libraryPromise) {
      libraryPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const fail = () => {
          clearTimeout(timer);
          script.remove();
          reject(new Error('The anti-bot check could not load. Check your connection and try signing in again.'));
        };
        const timer = setTimeout(fail, 15000);
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.onload = () => {
          if (!window.turnstile?.render) return fail();
          clearTimeout(timer);
          resolve();
        };
        script.onerror = fail;
        document.head.appendChild(script);
      }).catch(error => { libraryPromise = null; throw error; });
    }
    return libraryPromise;
  }

  async function mount() {
    if (widgetId !== null) return;
    if (!siteKey) throw new Error('Secure sign-in configuration is incomplete. Please contact Namdar.');
    if (!mountPromise) {
      mountPromise = (async () => {
        status('Loading anti-bot check…');
        await loadLibrary();
        const slot = document.getElementById(slotId);
        if (!slot) throw new Error('The anti-bot check is unavailable. Refresh the page.');
        widgetId = window.turnstile.render(slot, {
          sitekey: siteKey,
          size: 'flexible',
          callback: value => { token = value; status(''); },
          'expired-callback': () => { token = ''; status('The anti-bot check expired. Please complete it again.'); },
          'error-callback': () => { token = ''; status('The anti-bot check failed. Please try again.'); },
          'timeout-callback': () => { token = ''; status('The anti-bot check timed out. Please try again.'); }
        });
        if (!token) status('Please complete the anti-bot check.');
      })().finally(() => { mountPromise = null; });
    }
    return mountPromise;
  }

  function reset() {
    token = '';
    if (widgetId !== null) {
      try { window.turnstile.reset(widgetId); }
      catch { widgetId = null; status('Refresh the page to reload the anti-bot check.'); }
    }
  }

  window.NamdarPrivilegedCaptcha = {
    configure(key, id) { siteKey = key || ''; slotId = id; },
    show() { mount().catch(error => status(error.message)); },
    async signIn(auth, credentials) {
      await mount();
      if (!token) throw new Error('Please complete the anti-bot check first.');
      const captchaToken = token;
      token = ''; // A one-time token must never be reused by a second submission.
      try {
        return await auth.signInWithPassword({
          ...credentials,
          options: { ...credentials.options, captchaToken }
        });
      } finally { reset(); }
    }
  };
})();
