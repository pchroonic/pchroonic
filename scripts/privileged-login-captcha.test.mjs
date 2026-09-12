import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../privileged-login-captcha.js', import.meta.url), 'utf8');
function fixture({ missingLibrary = false } = {}) {
  let callbacks, resets = 0, renders = 0, script;
  const message = { textContent: '' };
  const window = {};
  const turnstile = {
    render(_slot, options) { callbacks = options; renders++; return 'widget'; },
    reset(id) { assert.equal(id, 'widget'); resets++; }
  };
  if (!missingLibrary) window.turnstile = turnstile;
  vm.runInNewContext(source, {
    window, setTimeout, clearTimeout,
    document: {
      getElementById: id => id.endsWith('Status') ? message : {},
      createElement: () => ({ remove() {} }),
      head: { appendChild: value => { script = value; } }
    }
  });
  const captcha = window.NamdarPrivilegedCaptcha;
  captcha.configure('test-site-key', 'loginTurnstile');
  return { captcha, window, turnstile, message, get callbacks() { return callbacks; }, get resets() { return resets; }, get renders() { return renders; }, get script() { return script; } };
}

test('blocks Auth without a completed CAPTCHA and mounts one widget', async () => {
  const f = fixture();
  let calls = 0;
  const auth = { signInWithPassword: () => { calls++; } };
  await assert.rejects(f.captcha.signIn(auth, {}), /complete the anti-bot/);
  await assert.rejects(f.captcha.signIn(auth, {}), /complete the anti-bot/);
  assert.equal(calls, 0);
  assert.equal(f.renders, 1);
});

test('passes token and existing options, returns Auth result, resets before next attempt', async () => {
  const f = fixture();
  await assert.rejects(f.captcha.signIn({}, {}));
  f.callbacks.callback('test-token');
  const result = { data: { session: null }, error: { message: 'Invalid credentials' } };
  const actual = await f.captcha.signIn({ signInWithPassword: async input => {
    assert.equal(input.options.captchaToken, 'test-token');
    assert.equal(input.options.custom, true);
    assert.equal(input.email, 'test@example.invalid');
    return result;
  } }, { email: 'test@example.invalid', options: { custom: true } });
  assert.equal(actual, result);
  assert.equal(f.resets, 1);
  await assert.rejects(f.captcha.signIn({}, {}), /complete the anti-bot/);
});

test('expiry, error and timeout invalidate a token; network failure resets it too', async () => {
  const f = fixture();
  await assert.rejects(f.captcha.signIn({}, {}));
  for (const event of ['expired-callback', 'error-callback', 'timeout-callback']) {
    f.callbacks.callback('test-token');
    f.callbacks[event]();
    await assert.rejects(f.captcha.signIn({}, {}), /complete the anti-bot/);
  }
  f.callbacks.callback('new-test-token');
  await assert.rejects(f.captcha.signIn({ signInWithPassword: async () => { throw new Error('Network unavailable'); } }, {}), /Network unavailable/);
  assert.equal(f.resets, 1);
});

test('missing site key fails closed and library load failure can retry', async () => {
  const f = fixture({ missingLibrary: true });
  f.captcha.configure('', 'loginTurnstile');
  await assert.rejects(f.captcha.signIn({}, {}), /configuration is incomplete/);
  f.captcha.configure('test-site-key', 'loginTurnstile');
  const failed = f.captcha.signIn({}, {});
  f.script.onerror();
  await assert.rejects(failed, /could not load/);
  const retry = f.captcha.signIn({}, {});
  f.window.turnstile = f.turnstile;
  f.script.onload();
  await assert.rejects(retry, /complete the anti-bot/);
  assert.equal(f.renders, 1);
});

test('Admin and Staff load CAPTCHA before their app, retain MFA, and submit through the guard', () => {
  for (const name of ['admin', 'staff']) {
    const loader = readFileSync(new URL(`../${name}.js`, import.meta.url), 'utf8');
    const app = readFileSync(new URL(`../${name}-original.js`, import.meta.url), 'utf8');
    const html = readFileSync(new URL(`../${name}.html`, import.meta.url), 'utf8');
    assert.ok(loader.indexOf('/privileged-login-captcha.js') < loader.indexOf(`/${name}-original.js`));
    assert.ok(loader.includes(`/${name}-mfa-guard.js`));
    assert.ok(app.includes(`configure(c.turnstileSiteKey,'${name}LoginTurnstile')`));
    assert.ok(app.includes('NamdarPrivilegedCaptcha.signIn(sb.auth,'));
    assert.ok(!app.includes('sb.auth.signInWithPassword('));
    assert.ok(html.includes(`id="${name}LoginTurnstile"`));
  }
});
