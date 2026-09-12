const { json, db, requireStaff, auditLog, safeError, parseBody } = require('../lib/server');
const { MAX_DAILY_LOOKUPS, runHarvest, harvestStatus } = require('../lib/address-harvest');
module.exports = async function handler(req, res) {
  try {
    const staff = await requireStaff(req, 'settings');
    if (req.method === 'GET') return json(res, 200, { ok:true, ...(await harvestStatus()) });
    if (req.method !== 'POST') return json(res, 405, { ok:false, error:'Method not allowed' });
    const body = parseBody(req), action = String(body.action || '');
    if (action === 'settings') {
      const before = (await db('address_harvest_settings?id=eq.1&select=*&limit=1'))?.[0] || null;
      const patch = { updated_at:new Date().toISOString() };
      if (typeof body.enabled === 'boolean') patch.enabled = body.enabled;
      if (body.dailyLookupCap !== undefined) {
        const cap = Math.round(Number(body.dailyLookupCap));
        if (!Number.isFinite(cap)) return json(res, 400, { ok:false, error:'Daily lookup cap must be a number.' });
        patch.daily_lookup_cap = Math.min(MAX_DAILY_LOOKUPS, Math.max(1, cap));
      }
      await db('address_harvest_settings?id=eq.1', { method:'PATCH', body:patch });
      const after = (await db('address_harvest_settings?id=eq.1&select=*&limit=1'))?.[0] || null;
      await auditLog(req, staff, { action:'address_harvest.settings', entityType:'address_harvest_settings', entityId:'1', summary:`Address harvest ${after?.enabled ? 'enabled' : 'disabled'}; daily cap ${after?.daily_lookup_cap || MAX_DAILY_LOOKUPS}`, before, after });
      return json(res, 200, { ok:true, ...(await harvestStatus()) });
    }
    if (action === 'run-now') {
      const result = await runHarvest({ trigger:'manual', respectEnabled:false, requestedLimit: body.limit || null });
      await auditLog(req, staff, { action:'address_harvest.run', entityType:'address_harvest_runs', entityId:result.runId || '', summary:`Manual address harvest: ${result.status || result.reason || 'completed'}`, before:null, after:result });
      return json(res, 200, { ok:true, result, ...(await harvestStatus()) });
    }
    return json(res, 400, { ok:false, error:'Unknown address harvest action.' });
  } catch (error) { return safeError(res, error); }
};
