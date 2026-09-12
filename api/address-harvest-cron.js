const { json, env, safeError } = require('../lib/server');
const { runHarvest } = require('../lib/address-harvest-compliance');
module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') return json(res, 405, { ok:false, error:'Method not allowed' });
    const secret = env('CRON_SECRET');
    if (!secret) return json(res, 503, { ok:false, error:'CRON_SECRET is not configured.' });
    const auth = req.headers.authorization || req.headers.Authorization || '';
    if (auth !== `Bearer ${secret}`) return json(res, 401, { ok:false, error:'Unauthorized' });
    return json(res, 200, await runHarvest({ trigger:'cron', respectEnabled:true }));
  } catch (error) { return safeError(res, error); }
};