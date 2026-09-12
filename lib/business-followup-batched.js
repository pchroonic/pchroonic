const crypto = require('crypto');

const TRANSIENT_GATEWAY = new Set([502, 503, 504]);
const DEFAULT_CHUNK_SIZE = 50;

function businessUtcMorning(value, days = 0, hour = 9) {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days, hour, 0, 0));
}

function businessEventKey(parts = []) {
  return crypto.createHash('sha256').update(parts.map((x) => String(x ?? '')).join('|')).digest('hex').slice(0, 40);
}

function candidateKey(row = {}) {
  return [row.notification_type, row.entity_type, row.entity_id, row.event_key].join('|');
}

function dedupeCandidates(rows = []) {
  const map = new Map();
  for (const row of rows) {
    if (!row?.notification_type || !row?.entity_type || !row?.entity_id || !row?.event_key || !row?.recipient_email) continue;
    map.set(candidateKey(row), row);
  }
  return [...map.values()];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function insertChunkWithRetry(db, chunk) {
  const path = 'business_notifications?on_conflict=notification_type%2Centity_type%2Centity_id%2Cevent_key';
  const options = {
    method: 'POST',
    prefer: 'resolution=ignore-duplicates,return=representation',
    body: chunk,
  };
  try {
    return await db(path, options);
  } catch (error) {
    if (!TRANSIENT_GATEWAY.has(Number(error?.status))) throw error;
    await sleep(180);
    return db(path, options);
  }
}

async function queueBusinessCandidates(db, rows = [], options = {}) {
  const candidates = dedupeCandidates(rows);
  const chunkSize = Math.max(1, Math.min(100, Number(options.chunkSize) || DEFAULT_CHUNK_SIZE));
  let queued = 0;
  let chunks = 0;
  const errors = [];
  for (let i = 0; i < candidates.length; i += chunkSize) {
    const chunk = candidates.slice(i, i + chunkSize);
    chunks += 1;
    try {
      const inserted = await insertChunkWithRetry(db, chunk);
      queued += Array.isArray(inserted) ? inserted.length : 0;
    } catch (error) {
      console.error('Business notification batch queue failed', error?.status || '', error?.message || error);
      errors.push({ status: Number(error?.status) || 500, error: String(error?.message || 'Queue failed').slice(0, 180) });
    }
  }
  return { candidates: candidates.length, queued, chunks, errors };
}

async function scanBusinessFollowUpsBatched(deps = {}) {
  const { db, env, isManagedInboxAddress } = deps;
  if (typeof db !== 'function' || typeof env !== 'function' || typeof isManagedInboxAddress !== 'function') {
    throw new Error('Business follow-up scanner dependencies are required.');
  }

  const sourceErrors = [];
  async function safeRows(source, fn) {
    try {
      const rows = await fn();
      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      console.error(`Business follow-up source failed: ${source}`, error?.status || '', error?.message || error);
      sourceErrors.push({ source, status: Number(error?.status) || 500, error: String(error?.message || 'Query failed').slice(0, 180) });
      return [];
    }
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const candidates = [];
  let considered = 0;

  const configured = String(env('NAMDAR_NOTIFY_EMAIL', env('NAMDAR_ALERT_EMAIL', '')) || '').trim().toLowerCase();
  let adminEmail = configured && !isManagedInboxAddress(configured) ? configured : '';
  if (!adminEmail) {
    const admins = await safeRows('admin_contact', () => db('profiles?role=eq.admin&select=email,account_status&limit=20'));
    adminEmail = String((admins || []).find((x) => x.email && (!x.account_status || x.account_status === 'active') && !isManagedInboxAddress(x.email))?.email || '').trim().toLowerCase();
  }

  const quotes = await safeRows('quote_reminders', () => db('quotes?status=in.(sent,approved)&customer_response=eq.pending&final_price=not.is.null&select=id,customer_name,email,service_key,final_price,automatic_estimate,expires_at,sent_at,updated_at,created_at&limit=500'));
  for (const q of quotes) {
    considered += 1;
    if (!q.email) continue;
    const sentAt = new Date(q.sent_at || q.updated_at || q.created_at);
    const expiry = q.expires_at ? new Date(q.expires_at) : null;
    if (!Number.isFinite(sentAt.getTime()) || (expiry && expiry <= now)) continue;
    for (const [stage, days] of [[1, 2], [2, 7]]) {
      const due = businessUtcMorning(sentAt, days, 9);
      if (expiry && due >= expiry) continue;
      candidates.push({
        notification_type: 'quote_reminder', entity_type: 'quote', entity_id: q.id,
        event_key: businessEventKey(['quote_reminder', q.id, sentAt.toISOString(), stage]),
        due_at: due.toISOString(), recipient_email: String(q.email).trim().toLowerCase(),
        status: 'pending', attempts: 0, metadata: { stage, sentAt: sentAt.toISOString() },
      });
    }
  }

  const invoices = await safeRows('overdue_invoices', () => db(`invoices?status=in.(issued,part_paid)&due_at=not.is.null&due_at=lt.${encodeURIComponent(nowIso)}&select=id,quote_id,booking_id,invoice_number,total,amount_paid,due_at,status&limit=500`));
  const invoiceQuoteIds = [...new Set(invoices.map((x) => x.quote_id).filter(Boolean))];
  const invoiceQuotes = invoiceQuoteIds.length
    ? await safeRows('invoice_quote_context', () => db(`quotes?id=in.(${invoiceQuoteIds.map((x) => encodeURIComponent(x)).join(',')})&select=id,customer_name,email,service_key`))
    : [];
  const quoteMap = Object.fromEntries(invoiceQuotes.map((q) => [q.id, q]));
  for (const invoice of invoices) {
    considered += 1;
    const outstanding = Math.max(0, Number(invoice.total || 0) - Number(invoice.amount_paid || 0));
    const q = quoteMap[invoice.quote_id];
    if (outstanding < 0.005 || !q?.email) continue;
    const dueBase = new Date(invoice.due_at);
    if (!Number.isFinite(dueBase.getTime())) continue;
    for (const [stage, days] of [[1, 1], [2, 8], [3, 15], [4, 29]]) {
      const due = businessUtcMorning(dueBase, days, 9);
      candidates.push({
        notification_type: 'invoice_overdue', entity_type: 'invoice', entity_id: invoice.id,
        event_key: businessEventKey(['invoice_overdue', invoice.id, dueBase.toISOString(), stage]),
        due_at: due.toISOString(), recipient_email: String(q.email).trim().toLowerCase(),
        status: 'pending', attempts: 0, metadata: { stage, dueAt: dueBase.toISOString() },
      });
    }
  }

  if (adminEmail) {
    const upcomingEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const unassigned = await safeRows('unassigned_bookings', () => db(`bookings?status=eq.confirmed&assigned_staff_id=is.null&starts_at=gt.${encodeURIComponent(nowIso)}&starts_at=lte.${encodeURIComponent(upcomingEnd)}&select=id,quote_id,starts_at,ends_at,address,status,assigned_staff_id,work_status&limit=250`));
    for (const b of unassigned) {
      considered += 1;
      const due = (now.getUTCHours() >= 7 && now.getUTCHours() < 20) ? now : businessUtcMorning(now, now.getUTCHours() >= 20 ? 1 : 0, 8);
      candidates.push({
        notification_type: 'unassigned_staff', entity_type: 'booking', entity_id: b.id,
        event_key: businessEventKey(['unassigned_staff', b.id, b.starts_at]),
        due_at: due.toISOString(), recipient_email: adminEmail,
        status: 'pending', attempts: 0, metadata: { startsAt: b.starts_at },
      });
    }

    const staleStart = new Date(now.getTime() - 3 * 86400000).toISOString();
    const attentionCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const attention = await safeRows('booking_attention', () => db(`bookings?status=eq.confirmed&work_status=eq.scheduled&ends_at=gte.${encodeURIComponent(staleStart)}&ends_at=lt.${encodeURIComponent(attentionCutoff)}&select=id,quote_id,starts_at,ends_at,address,status,assigned_staff_id,work_status&limit=250`));
    for (const b of attention) {
      considered += 1;
      const due = (now.getUTCHours() >= 7 && now.getUTCHours() < 20) ? now : businessUtcMorning(now, now.getUTCHours() >= 20 ? 1 : 0, 8);
      candidates.push({
        notification_type: 'booking_attention', entity_type: 'booking', entity_id: b.id,
        event_key: businessEventKey(['booking_attention', b.id, b.ends_at]),
        due_at: due.toISOString(), recipient_email: adminEmail,
        status: 'pending', attempts: 0, metadata: { endsAt: b.ends_at },
      });
    }
  }

  const queue = await queueBusinessCandidates(db, candidates);
  return {
    considered,
    candidates: queue.candidates,
    queued: queue.queued,
    chunks: queue.chunks,
    sourceErrors,
    queueErrors: queue.errors,
    degraded: sourceErrors.length > 0 || queue.errors.length > 0,
  };
}

module.exports = { businessUtcMorning, businessEventKey, dedupeCandidates, queueBusinessCandidates, scanBusinessFollowUpsBatched };
