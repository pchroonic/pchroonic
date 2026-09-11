const base = require('./server-original');

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

module.exports = { ...base, accessTokenClaims, requireStaff };
