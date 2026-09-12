const { requireStaff, safeError, queryParam } = require('../lib/server');
const { rowsToCsv, exportDatasetRows, storageDownload } = require('../lib/address-harvest');
function attachment(res, type, filename, body) {
  res.statusCode = 200;
  res.setHeader('Content-Type', type);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}
module.exports = async function handler(req, res) {
  try {
    await requireStaff(req, 'settings');
    if (req.method !== 'GET') { res.statusCode=405; return res.end('Method not allowed'); }
    const path = String(queryParam(req, 'path') || '').trim();
    const format = String(queryParam(req, 'format') || 'csv').toLowerCase();
    if (path) {
      if (!/^\d{4}\/\d{2}\/\d{2}\/[0-9a-f-]{36}\.(json|csv)$/i.test(path)) { res.statusCode=400; return res.end('Invalid backup path'); }
      const body = await storageDownload(path);
      return attachment(res, path.endsWith('.json') ? 'application/json' : 'text/csv', `namdar-address-backup-${path.replaceAll('/','-')}`, body);
    }
    const rows = await exportDatasetRows();
    const stamp = new Date().toISOString().slice(0,10);
    if (format === 'json') return attachment(res, 'application/json', `namdar-getaddress-${stamp}.json`, JSON.stringify({ exportedAt:new Date().toISOString(), count:rows.length, rows }, null, 2));
    return attachment(res, 'text/csv; charset=utf-8', `namdar-getaddress-${stamp}.csv`, rowsToCsv(rows));
  } catch (error) { return safeError(res, error); }
};
