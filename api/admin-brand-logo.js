const { json, parseBody, requireStaff, auditLog, safeError, supabaseUrl, serviceKey, randomId } = require('../lib/server');
const { decodeLogoBase64 } = require('../lib/brand-logo');

const BUCKET = 'brand-assets';

function storageObjectUrl(path) {
  return `${supabaseUrl()}/storage/v1/object/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

function publicObjectUrl(path) {
  return `${supabaseUrl()}/storage/v1/object/public/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
    const staff = await requireStaff(req, 'settings');
    const body = parseBody(req);
    const { buffer, mimeType, extension } = decodeLogoBase64(body.dataBase64);
    const path = `logos/namdar-${Date.now()}-${randomId('')}.${extension}`;
    const key = serviceKey();
    const response = await fetch(storageObjectUrl(path), {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'x-upsert': 'false'
      },
      body: buffer
    });
    const text = await response.text();
    let result = null;
    if (text) {
      try { result = JSON.parse(text); } catch { result = text; }
    }
    if (!response.ok) {
      const error = new Error(result?.message || result?.error || `Logo upload failed (${response.status}).`);
      error.status = response.status >= 400 && response.status < 500 ? response.status : 502;
      throw error;
    }
    const url = publicObjectUrl(path);
    await auditLog(req, staff, {
      action: 'website.logo_upload',
      entityType: 'storage_object',
      entityId: path,
      summary: `Uploaded website logo (${mimeType}, ${buffer.length} bytes)`,
      after: { bucket: BUCKET, path, mimeType, size: buffer.length, url }
    });
    return json(res, 200, { ok: true, url, path, mimeType, size: buffer.length });
  } catch (error) {
    return safeError(res, error);
  }
};
