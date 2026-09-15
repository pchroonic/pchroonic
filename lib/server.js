const base = require('./server-original');
const { balanceDueAt } = require('./payment-policy');

function accessTokenClaims(req) {
  const token = base.bearer(req);
  if (!token) return {};
  const parts = token.split('.');
  if (parts.length !== 3) return {};
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) || {};
  } catch {
    return {};
  }
}

async function requireStaff(req, permission = null) {
  const staff = await base.requireStaff(req, permission);
  const claims = accessTokenClaims(req);
  if (claims.aal !== 'aal2') {
    const error = new Error('Two-step verification is required for Namdar staff access.');
    error.status = 403;
    error.code = 'mfa_required';
    throw error;
  }
  return { ...staff, aal: 'aal2' };
}

async function ensureInvoiceForBooking(bookingOrId, options = {}) {
  const booking = typeof bookingOrId === 'string'
    ? (await base.db(`bookings?id=eq.${encodeURIComponent(bookingOrId)}&select=*&limit=1`))?.[0]
    : bookingOrId;
  const invoice = await base.ensureInvoiceForBooking(bookingOrId, options);
  const snapshot = booking?.payment_policy_snapshot;
  if (!invoice?.id || !snapshot || typeof snapshot !== 'object') return invoice;

  const overdue = snapshot.overdue || {};
  const patch = {
    payment_policy_revision: Number.isFinite(Number(snapshot.revision)) ? Number(snapshot.revision) : null,
    payment_policy_snapshot: snapshot,
    deposit_required: Number(Math.max(0, Number(snapshot.initialPaymentRequired ? snapshot.initialPaymentAmount : 0) || 0).toFixed(2)),
    balance_due_hours: Number.isFinite(Number(snapshot.balanceDueHours)) ? Number(snapshot.balanceDueHours) : null,
    overdue_booking_hold_days: Number.isFinite(Number(overdue.bookingHoldAfterDays)) ? Number(overdue.bookingHoldAfterDays) : null,
    overdue_final_review_days: Number.isFinite(Number(overdue.finalReviewAfterDays)) ? Number(overdue.finalReviewAfterDays) : null,
    updated_at: new Date().toISOString()
  };
  if (!['paid','void'].includes(invoice.status)) {
    const dueAt = balanceDueAt(booking, snapshot);
    if (dueAt) patch.due_at = dueAt;
  }
  return (await base.db(`invoices?id=eq.${encodeURIComponent(invoice.id)}`, { method:'PATCH', prefer:'return=representation', body:patch }))?.[0] || invoice;
}

module.exports = { ...base, accessTokenClaims, requireStaff, ensureInvoiceForBooking };
