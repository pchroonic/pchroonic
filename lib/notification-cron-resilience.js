'use strict';

const TRANSIENT_STATUSES = new Set([408, 429, 502, 503, 504, 520, 522, 524]);
const DEFAULT_ATTEMPTS = 3;
const DEFAULT_DELAYS = [450, 1400];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientDatabaseError(error) {
  const status = Number(error?.status || error?.statusCode || 0);
  if (TRANSIENT_STATUSES.has(status)) return true;
  const message = String(error?.message || error || '').toLowerCase();
  return /fetch failed|network error|socket hang up|econnreset|econnrefused|etimedout|und_err|gateway timeout|request timed out|temporarily unavailable/.test(message);
}

function boundedAttempts(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_ATTEMPTS;
  return Math.max(1, Math.min(4, Math.round(n)));
}

function delayForRetry(retryIndex, delays = DEFAULT_DELAYS) {
  const base = Number(delays?.[retryIndex] ?? delays?.at?.(-1) ?? 0);
  if (!Number.isFinite(base) || base <= 0) return 0;
  const jitter = Math.floor(Math.random() * Math.max(25, Math.min(200, base * 0.15)));
  return base + jitter;
}

async function retryTransient(fn, options = {}) {
  if (typeof fn !== 'function') throw new TypeError('retryTransient requires a function.');
  const maxAttempts = boundedAttempts(options.maxAttempts);
  const sleepFn = typeof options.sleepFn === 'function' ? options.sleepFn : sleep;
  const metrics = options.metrics || null;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const value = await fn(attempt);
      if (attempt > 1) {
        if (metrics) metrics.recovered = Number(metrics.recovered || 0) + 1;
        if (options.label) console.warn(`Notification cron transient recovered: ${options.label} after ${attempt} attempts`);
      }
      return { value, attempts: attempt, recovered: attempt > 1 };
    } catch (error) {
      lastError = error;
      const retryable = isTransientDatabaseError(error);
      if (!retryable || attempt >= maxAttempts) {
        if (retryable && metrics) metrics.exhausted = Number(metrics.exhausted || 0) + 1;
        throw error;
      }
      if (metrics) metrics.retries = Number(metrics.retries || 0) + 1;
      if (options.label) console.warn(`Notification cron transient retry: ${options.label} attempt ${attempt}/${maxAttempts}`, error?.status || '', error?.message || error);
      const wait = delayForRetry(attempt - 1, options.delays || DEFAULT_DELAYS);
      if (wait > 0) await sleepFn(wait);
    }
  }

  throw lastError || new Error('Transient retry failed.');
}

function createResilientReadDb(db, options = {}) {
  if (typeof db !== 'function') throw new TypeError('createResilientReadDb requires a database function.');
  const metrics = options.metrics || null;
  return async function resilientReadDb(path, requestOptions = {}) {
    const method = String(requestOptions.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) return db(path, requestOptions);
    const result = await retryTransient(
      () => db(path, requestOptions),
      {
        maxAttempts: options.maxAttempts,
        delays: options.delays,
        sleepFn: options.sleepFn,
        metrics,
        label: options.label ? `${options.label}:${String(path).split('?')[0]}` : `db-read:${String(path).split('?')[0]}`,
      }
    );
    return result.value;
  };
}

module.exports = {
  TRANSIENT_STATUSES,
  isTransientDatabaseError,
  retryTransient,
  createResilientReadDb,
};
