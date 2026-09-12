const { json, db, env, bearer, safeError, queryParam } = require('../lib/server');
const { cleanPostcode, isFullPostcode, cleanUprn, hashApiKey, safeLimit, publicAddressRow } = require('../lib/address-data-api');

const PRODUCT = 'address-v1';
const SELECT_FIELDS = [
  'uprn','postcode','address_line1','address_line2','address_line3','display_address',
  'post_town','city','dependent_locality','district','region','country_code',
  'latitude','longitude','property_class','source_dataset','dataset_version',
  'licence_category','licence_name','licence_reference','attribution_text','share_alike_required'
].join(',');

function apiEnabled() {
  return String(env('ADDRESS_DATA_API_ENABLED', '')).trim().toLowerCase() === 'true';
}

async function authenticate(req) {
  const raw = bearer(req);
  if (!raw || raw.length < 24) {
    const error = new Error('A valid Namdar Address API key is required.');
    error.status = 401;
    throw error;
  }
  const keyHash = hashApiKey(raw);
  const key = (await db(`address_api_keys?key_hash=eq.${keyHash}&active=eq.true&select=id,client_id,expires_at&limit=1`))?.[0];
  if (!key?.id || (key.expires_at && new Date(key.expires_at).getTime() <= Date.now())) {
    const error = new Error('This Namdar Address API key is invalid or expired.');
    error.status = 401;
    throw error;
  }
  const client = (await db(`address_api_clients?id=eq.${encodeURIComponent(key.client_id)}&select=id,name,status,plan_code,monthly_request_limit,allowed_products&limit=1`))?.[0];
  if (!client?.id || client.status !== 'active') {
    const error = new Error('This Namdar Address API subscription is not active.');
    error.status = 403;
    throw error;
  }
  if (!Array.isArray(client.allowed_products) || !client.allowed_products.includes(PRODUCT)) {
    const error = new Error('This subscription does not include the Address API.');
    error.status = 403;
    throw error;
  }
  return { key, client };
}

async function consume(clientId, matchedRows, bytesServed) {
  try {
    return await db('rpc/consume_address_api_request', {
      method: 'POST',
      body: { p_client_id: clientId, p_matched_rows: matchedRows, p_bytes_served: bytesServed }
    });
  } catch (error) {
    const message = String(error.message || '');
    if (/quota/i.test(message)) {
      error.status = 429;
      error.message = 'Namdar Address API monthly request quota exceeded.';
    }
    throw error;
  }
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') return json(res, 405, { ok:false, error:'Method not allowed' });
    if (!apiEnabled()) return json(res, 503, { ok:false, error:'Namdar Address API is not enabled.' });

    const { key, client } = await authenticate(req);
    const postcode = cleanPostcode(queryParam(req, 'postcode') || '');
    const uprn = cleanUprn(queryParam(req, 'uprn') || '');
    if (!postcode && !uprn) return json(res, 400, { ok:false, error:'Provide a postcode or UPRN.' });
    if (postcode && !isFullPostcode(postcode)) return json(res, 400, { ok:false, error:'Enter a valid UK postcode.' });
    const limit = safeLimit(queryParam(req, 'limit'), 50, 100);

    const filter = uprn ? `uprn=eq.${encodeURIComponent(uprn)}` : `postcode=eq.${encodeURIComponent(postcode)}`;
    const rows = await db(`address_distribution_eligible?${filter}&select=${SELECT_FIELDS}&order=display_address.asc&limit=${limit}`);
    const data = (rows || []).map(publicAddressRow);
    const attributions = [...new Set(data.map(x=>x.attribution).filter(Boolean))];
    const payload = {
      ok: true,
      product: PRODUCT,
      query: uprn ? { uprn } : { postcode },
      count: data.length,
      data,
      attributions
    };
    const encoded = JSON.stringify(payload);
    await consume(client.id, data.length, Buffer.byteLength(encoded, 'utf8'));
    await db(`address_api_keys?id=eq.${encodeURIComponent(key.id)}`, { method:'PATCH', body:{ last_used_at:new Date().toISOString() } }).catch(()=>null);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Namdar-Data-Product', PRODUCT);
    return res.end(encoded);
  } catch (error) {
    return safeError(res, error);
  }
};
