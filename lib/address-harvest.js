const crypto = require('crypto');
const { db, env, supabaseUrl, serviceKey } = require('./server');

const DATASET = 'getaddress-daily-cache';
const BACKUP_BUCKET = 'address-harvest-backups';
const MAX_DAILY_LOOKUPS = 20;
const DELIMITER = '~~~NAMDAR~~~';
const TEMPLATE = ['{line_1}','{line_2}','{line_3}','{line_4}','{town_or_city}','{locality}','{county}','{country}','{postcode}'].join(DELIMITER);
const PRIORITY_AREAS = ['SE','SW','E','N','NW','W','EC','WC','BR','CR','DA','EN','HA','IG','KT','RM','SM','TW','UB','WD','AL','BN','CM','GU','HP','LU','ME','MK','OX','PO','RG','RH','SG','SL','SS','TN'];
const UK_AREAS = ['AB','AL','B','BA','BB','BD','BH','BL','BN','BR','BS','BT','CA','CB','CF','CH','CM','CO','CR','CT','CV','CW','DA','DD','DE','DG','DH','DL','DN','DT','DY','E','EC','EH','EN','EX','FK','FY','G','GL','GU','GY','HA','HD','HG','HP','HR','HS','HU','HX','IG','IM','IP','IV','JE','KA','KT','KW','KY','L','LA','LD','LE','LL','LN','LS','LU','M','ME','MK','ML','N','NE','NG','NN','NP','NR','NW','OL','OX','PA','PE','PH','PL','PO','PR','RG','RH','RM','S','SA','SE','SG','SK','SL','SM','SN','SO','SP','SR','SS','ST','SW','SY','TA','TD','TF','TN','TQ','TR','TS','TW','UB','W','WA','WC','WD','WF','WN','WR','WS','WV','YO','ZE'];
const AREAS = [...PRIORITY_AREAS, ...UK_AREAS.filter(x => !PRIORITY_AREAS.includes(x))];

function cleanPostcode(value='') {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  return raw.length > 3 ? `${raw.slice(0, -3)} ${raw.slice(-3)}` : raw;
}
function isFullPostcode(value='') {
  return /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(String(value || '').trim());
}
function uniq(parts) {
  const seen = new Set();
  return parts.map(v => String(v || '').trim()).filter(v => {
    if (!v) return false;
    const k = v.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}
function csvCell(value='') {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function todayUtc() { return new Date().toISOString().slice(0, 10); }
function nowIso() { return new Date().toISOString(); }
function sourceId(postcode, suggestion) {
  if (suggestion?.id) return String(suggestion.id).slice(0, 500);
  return crypto.createHash('sha256').update(`${postcode}|${suggestion?.address || ''}`).digest('hex');
}
function normalizeSuggestion(postcode, suggestion) {
  const rawAddress = String(suggestion?.address || '').trim();
  let [line1='', line2='', line3='', line4='', town='', locality='', county='', country='', renderedPostcode=''] = rawAddress.includes(DELIMITER)
    ? rawAddress.split(DELIMITER).map(v => v.trim())
    : [];
  const pc = cleanPostcode(renderedPostcode || postcode);
  if (!line1 && rawAddress) {
    const parts = rawAddress.split(',').map(v => v.trim()).filter(Boolean);
    line1 = parts.shift() || '';
    const tailPc = parts.length && cleanPostcode(parts.at(-1)) === pc ? parts.pop() : '';
    town = parts.pop() || '';
    line2 = parts.join(', ');
    renderedPostcode = tailPc;
  }
  if (!line1) return null;
  const extraLines = uniq([line2, line3, line4]);
  const addressLine2 = extraLines.join(', ') || null;
  const display = uniq([line1, ...extraLines, locality, town, county, pc]).join(', ');
  return {
    source_dataset: DATASET,
    source_record_id: sourceId(pc, suggestion),
    uprn: null, udprn: null, postcode: pc,
    organisation_name: null, department_name: null, po_box_number: null,
    sub_building_name: null, building_name: null, building_number: null,
    dependent_thoroughfare: null, thoroughfare: null,
    double_dependent_locality: null, dependent_locality: locality || null,
    post_town: town || null,
    address_line1: line1,
    address_line2: addressLine2,
    address_line3: null,
    display_address: display || `${line1}, ${pc}`,
    city: town || null,
    district: locality || null,
    region: county || null,
    country_code: 'GB', latitude: null, longitude: null,
    property_class: null, active: true, dataset_version: todayUtc(),
    import_batch: `getaddress:${todayUtc()}`,
    updated_at: nowIso()
  };
}
async function providerRequest(url, options={}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || 10000);
  try {
    const response = await fetch(url, { method: options.method || 'GET', headers: options.headers, body: options.body, signal: controller.signal });
    const text = await response.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch { data = text; } }
    if (!response.ok) {
      const error = new Error(data?.message || data?.Message || `getAddress request failed (${response.status})`);
      error.status = response.status;
      error.retryAfter = Number(response.headers.get('retry-after') || 0) || 0;
      throw error;
    }
    return data;
  } finally { clearTimeout(timer); }
}
async function providerUsage() {
  const adminKey = env('GETADDRESS_ADMIN_KEY', '').trim();
  if (!adminKey) return null;
  try {
    const data = await providerRequest(`https://api.getAddress.io/v3/usage?api-key=${encodeURIComponent(adminKey)}`, { timeoutMs: 7000 });
    const usage = Number(data?.usage_today), limit = Number(data?.daily_limit);
    if (!Number.isFinite(usage) || !Number.isFinite(limit)) return null;
    return { usageToday: Math.max(0, usage), dailyLimit: Math.max(0, limit) };
  } catch (error) {
    console.warn('GetAddress usage check unavailable:', error.message);
    return null;
  }
}
async function typeahead(term, apiKey) {
  const url = `https://api.getAddress.io/typeahead/${encodeURIComponent(term)}?api-key=${encodeURIComponent(apiKey)}&top=20`;
  const data = await providerRequest(url, {
    method: 'POST', timeoutMs: 8000,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ search: ['postcode'] })
  });
  const values = Array.isArray(data) ? data : Array.isArray(data?.suggestions) ? data.suggestions : [];
  return [...new Set(values.map(cleanPostcode).filter(isFullPostcode))];
}
async function autocompletePostcode(postcode, apiKey, requestOptions={}) {
  const params = new URLSearchParams({ 'api-key': apiKey, all: 'true', template: TEMPLATE });
  const data = await providerRequest(`https://api.getAddress.io/autocomplete/${encodeURIComponent(postcode)}?${params}`, { timeoutMs: 10000, headers: requestOptions.headers });
  const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
  const byId = new Map();
  for (const suggestion of suggestions) {
    const row = normalizeSuggestion(postcode, suggestion);
    if (row && !byId.has(row.source_record_id)) byId.set(row.source_record_id, row);
  }
  return { raw: data || {}, rows: [...byId.values()] };
}
async function settings() {
  return (await db('address_harvest_settings?id=eq.1&select=*&limit=1'))?.[0] || null;
}
async function seedKnownPostcodes() {
  const known = await db('postcode_directory?select=postcode&order=verified_at.desc&limit=500').catch(() => []);
  const rows = [...new Set((known || []).map(x => cleanPostcode(x.postcode)).filter(isFullPostcode))]
    .map(postcode => ({ postcode, seed_term: 'namdar-known', status: 'pending', updated_at: nowIso() }));
  if (rows.length) await db('address_harvest_postcodes?on_conflict=postcode', { method: 'POST', prefer: 'resolution=ignore-duplicates,return=minimal', body: rows });
}
function seedTerm(cursor) {
  const n = Math.max(0, Number(cursor) || 0);
  const area = AREAS[Math.floor(n / 99) % AREAS.length];
  const district = (n % 99) + 1;
  return `${area}${district}`;
}
async function seedTypeahead(apiKey, currentSettings, wanted=20) {
  let cursor = Math.max(0, Number(currentSettings.seed_cursor) || 0);
  const terms = [];
  for (let attempt = 0; attempt < 4 && wanted > 0; attempt++) {
    const term = seedTerm(cursor++);
    terms.push(term);
    try {
      const postcodes = await typeahead(term, apiKey);
      const rows = postcodes.map(postcode => ({ postcode, seed_term: term, status: 'pending', updated_at: nowIso() }));
      if (rows.length) await db('address_harvest_postcodes?on_conflict=postcode', { method: 'POST', prefer: 'resolution=ignore-duplicates,return=minimal', body: rows });
      wanted -= postcodes.length;
    } catch (error) {
      if (error.status === 429) break;
      console.warn(`GetAddress typeahead seed ${term}:`, error.message);
    }
  }
  await db('address_harvest_settings?id=eq.1', { method: 'PATCH', body: { seed_cursor: cursor, updated_at: nowIso() } });
  return terms;
}
async function retryOldErrors() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await db(`address_harvest_postcodes?status=eq.error&attempts=lt.3&updated_at=lt.${encodeURIComponent(cutoff)}`, { method: 'PATCH', body: { status: 'pending', updated_at: nowIso() } }).catch(() => null);
}
async function localUsageToday() {
  const rows = await db(`address_harvest_runs?run_date=eq.${todayUtc()}&select=lookups_attempted,status`).catch(() => []);
  return (rows || []).reduce((sum, row) => sum + Math.max(0, Number(row.lookups_attempted) || 0), 0);
}
async function storageUpload(path, content, contentType) {
  const key = serviceKey();
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${supabaseUrl()}/storage/v1/object/${encodeURIComponent(BACKUP_BUCKET)}/${encodedPath}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': contentType, 'x-upsert': 'true' },
    body: content
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Backup upload failed (${response.status}): ${text.slice(0, 180)}`);
  }
}
async function storageDownload(path) {
  const key = serviceKey();
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${supabaseUrl()}/storage/v1/object/authenticated/${encodeURIComponent(BACKUP_BUCKET)}/${encodedPath}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!response.ok) throw new Error(`Backup download failed (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}
function rowsToCsv(rows) {
  const fields = ['source_record_id','postcode','address_line1','address_line2','city','district','region','display_address','dataset_version','import_batch'];
  return [fields.join(','), ...(rows || []).map(row => fields.map(field => csvCell(row[field])).join(','))].join('\n') + '\n';
}
async function createBackups(run, collected, normalizedRows) {
  const date = todayUtc(), [year, month, day] = date.split('-');
  const base = `${year}/${month}/${day}/${run.id}`;
  const jsonPath = `${base}.json`, csvPath = `${base}.csv`;
  const document = JSON.stringify({
    format: 'namdar-address-harvest-v1', generatedAt: nowIso(), run: {
      id: run.id, runDate: run.run_date || date, trigger: run.trigger,
      lookupsAttempted: run.lookups_attempted, lookupsSucceeded: run.lookups_succeeded,
      postcodesHarvested: run.postcodes_harvested, addressesCollected: run.addresses_collected
    },
    postcodes: collected
  }, null, 2);
  await storageUpload(jsonPath, document, 'application/json');
  await storageUpload(csvPath, rowsToCsv(normalizedRows), 'text/csv');
  return { jsonPath, csvPath };
}
async function updateDatasetCount(delta) {
  if (!delta) return;
  const row = (await db(`address_dataset_registry?source_dataset=eq.${encodeURIComponent(DATASET)}&select=row_count&limit=1`))?.[0];
  const count = Math.max(0, Number(row?.row_count || 0) + Number(delta || 0));
  await db(`address_dataset_registry?source_dataset=eq.${encodeURIComponent(DATASET)}`, { method: 'PATCH', body: { row_count: count, dataset_version: todayUtc(), updated_at: nowIso() } });
}
async function createRun(trigger, requestedLimit, status='running', errorText=null) {
  try {
    const rows = await db('address_harvest_runs', { method: 'POST', prefer: 'return=representation', body: {
      trigger, status, requested_limit: requestedLimit, error_text: errorText,
      finished_at: status === 'running' ? null : nowIso()
    } });
    return rows?.[0] || null;
  } catch (error) {
    if (String(error.message || '').toLowerCase().includes('duplicate')) return null;
    throw error;
  }
}
async function runHarvest({ trigger='cron', respectEnabled=true, requestedLimit=null }={}) {
  const staleCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  await db(`address_harvest_runs?status=eq.running&started_at=lt.${encodeURIComponent(staleCutoff)}`, { method:'PATCH', body:{ status:'failed', error_text:'Previous harvest did not finish and was released by the stale-run guard.', finished_at:nowIso() } }).catch(() => null);
  const current = await settings();
  if (!current) throw new Error('Address harvest settings are unavailable.');
  const cap = Math.min(MAX_DAILY_LOOKUPS, Math.max(1, Number(current.daily_lookup_cap || MAX_DAILY_LOOKUPS)));
  const requested = Math.min(cap, Math.max(0, Number(requestedLimit ?? cap)));
  if (respectEnabled && !current.enabled) {
    const run = await createRun(trigger, requested, 'skipped', 'Automatic harvesting is switched off.');
    return { ok: true, skipped: true, reason: 'disabled', run };
  }
  const apiKey = env('GETADDRESS_API_KEY', '').trim();
  if (!apiKey) {
    const run = await createRun(trigger, requested, 'skipped', 'GETADDRESS_API_KEY is not configured.');
    return { ok: true, skipped: true, reason: 'api_key_missing', run };
  }
  const run = await createRun(trigger, requested);
  if (!run) return { ok: true, skipped: true, reason: 'already_running' };
  let attempted = 0, succeeded = 0, postcodesHarvested = 0, addressesCollected = 0, addressesUpserted = 0;
  let seedTerms = [], lastError = '', status = 'completed', backupJsonPath = null, backupCsvPath = null;
  const collected = [], normalizedRows = [];
  try {
    const provider = await providerUsage();
    const localUsed = await localUsageToday();
    const localRemaining = Math.max(0, cap - localUsed);
    const providerRemaining = provider ? Math.max(0, provider.dailyLimit - provider.usageToday) : MAX_DAILY_LOOKUPS;
    const allowed = Math.max(0, Math.min(requested, localRemaining, providerRemaining));
    await db(`address_harvest_runs?id=eq.${encodeURIComponent(run.id)}`, { method: 'PATCH', body: {
      provider_usage_before: provider?.usageToday ?? null,
      provider_daily_limit: provider?.dailyLimit ?? null
    } });
    await db('address_harvest_settings?id=eq.1', { method: 'PATCH', body: {
      provider_usage_today: provider?.usageToday ?? null,
      provider_daily_limit: provider?.dailyLimit ?? null,
      provider_usage_checked_at: provider ? nowIso() : null,
      last_run_at: nowIso(), updated_at: nowIso()
    } });
    if (allowed <= 0) {
      status = 'skipped'; lastError = 'Daily GetAddress lookup allowance is already exhausted.';
    } else {
      await retryOldErrors();
      await seedKnownPostcodes();
      let queue = await db(`address_harvest_postcodes?status=eq.pending&select=postcode,seed_term,attempts&order=discovered_at.asc&limit=${allowed}`);
      if ((queue || []).length < allowed) {
        seedTerms = await seedTypeahead(apiKey, current, allowed - (queue || []).length);
        queue = await db(`address_harvest_postcodes?status=eq.pending&select=postcode,seed_term,attempts&order=discovered_at.asc&limit=${allowed}`);
      }
      if (!(queue || []).length) {
        status = 'skipped'; lastError = 'No new postcode candidates were available.';
      } else {
        for (const item of queue) {
          attempted++;
          await db(`address_harvest_runs?id=eq.${encodeURIComponent(run.id)}`, { method: 'PATCH', body: { lookups_attempted: attempted } });
          await db(`address_harvest_postcodes?postcode=eq.${encodeURIComponent(item.postcode)}`, { method: 'PATCH', body: { attempts: Number(item.attempts || 0) + 1, updated_at: nowIso() } });
          try {
            const result = await autocompletePostcode(item.postcode, apiKey);
            succeeded++;
            addressesCollected += result.rows.length;
            postcodesHarvested++;
            if (result.rows.length) {
              await db('master_addresses?on_conflict=source_dataset,source_record_id', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: result.rows });
              addressesUpserted += result.rows.length;
              normalizedRows.push(...result.rows);
            }
            await db('address_harvest_snapshots', { method: 'POST', body: { run_id: run.id, postcode: item.postcode, provider_payload: result.raw, address_count: result.rows.length } });
            await db(`address_harvest_postcodes?postcode=eq.${encodeURIComponent(item.postcode)}`, { method: 'PATCH', body: {
              status: 'harvested', address_count: result.rows.length, last_error: null, harvested_at: nowIso(), updated_at: nowIso()
            } });
            collected.push({ postcode: item.postcode, seedTerm: item.seed_term || null, addressCount: result.rows.length, providerPayload: result.raw });
          } catch (error) {
            lastError = String(error.message || error).slice(0, 500);
            if (error.status === 429) {
              status = 'partial';
              await db(`address_harvest_postcodes?postcode=eq.${encodeURIComponent(item.postcode)}`, { method: 'PATCH', body: { status: 'pending', last_error: lastError, updated_at: nowIso() } });
              break;
            }
            status = 'partial';
            await db(`address_harvest_postcodes?postcode=eq.${encodeURIComponent(item.postcode)}`, { method: 'PATCH', body: { status: 'error', last_error: lastError, updated_at: nowIso() } });
          }
        }
      }
    }
    if (addressesUpserted) await updateDatasetCount(addressesUpserted);
    const runForBackup = { ...run, lookups_attempted: attempted, lookups_succeeded: succeeded, postcodes_harvested: postcodesHarvested, addresses_collected: addressesCollected };
    if (collected.length) {
      try {
        const backup = await createBackups(runForBackup, collected, normalizedRows);
        backupJsonPath = backup.jsonPath; backupCsvPath = backup.csvPath;
      } catch (error) {
        status = status === 'completed' ? 'partial' : status;
        lastError = [lastError, `Backup: ${error.message}`].filter(Boolean).join(' | ').slice(0, 1000);
      }
    }
  } catch (error) {
    status = attempted || succeeded ? 'partial' : 'failed';
    lastError = String(error.message || error).slice(0, 1000);
  }
  const finishedAt = nowIso();
  await db(`address_harvest_runs?id=eq.${encodeURIComponent(run.id)}`, { method: 'PATCH', body: {
    status, lookups_attempted: attempted, lookups_succeeded: succeeded,
    postcodes_harvested: postcodesHarvested, addresses_collected: addressesCollected,
    addresses_upserted: addressesUpserted, seed_terms: seedTerms,
    backup_json_path: backupJsonPath, backup_csv_path: backupCsvPath,
    error_text: lastError || null, finished_at: finishedAt
  } });
  await db('address_harvest_settings?id=eq.1', { method: 'PATCH', body: {
    last_run_at: finishedAt,
    last_success_at: succeeded ? finishedAt : current.last_success_at,
    last_error: lastError || null,
    updated_at: finishedAt
  } });
  return { ok: true, runId: run.id, status, attempted, succeeded, postcodesHarvested, addressesCollected, addressesUpserted, backupCreated: !!backupJsonPath, error: lastError || null };
}
async function harvestStatus() {
  const [current, runs, dataset, provider] = await Promise.all([
    settings(),
    db('address_harvest_runs?select=*&order=started_at.desc&limit=20').catch(() => []),
    db(`address_dataset_registry?source_dataset=eq.${encodeURIComponent(DATASET)}&select=source_dataset,row_count,active,dataset_version,updated_at&limit=1`).catch(() => []),
    providerUsage()
  ]);
  const localUsed = await localUsageToday();
  const cap = Math.min(MAX_DAILY_LOOKUPS, Math.max(1, Number(current?.daily_lookup_cap || MAX_DAILY_LOOKUPS)));
  return {
    settings: current,
    runs: runs || [],
    dataset: dataset?.[0] || null,
    apiKeyConfigured: !!env('GETADDRESS_API_KEY', '').trim(),
    adminKeyConfigured: !!env('GETADDRESS_ADMIN_KEY', '').trim(),
    localUsedToday: localUsed,
    localRemainingToday: Math.max(0, cap - localUsed),
    providerUsage: provider
  };
}
async function exportDatasetRows() {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; offset < 1000000; offset += pageSize) {
    const page = await db(`master_addresses?source_dataset=eq.${encodeURIComponent(DATASET)}&select=source_record_id,postcode,address_line1,address_line2,city,district,region,display_address,dataset_version,import_batch&order=id.asc&offset=${offset}&limit=${pageSize}`);
    rows.push(...(page || []));
    if (!page || page.length < pageSize) break;
  }
  return rows;
}
module.exports = { DATASET, BACKUP_BUCKET, MAX_DAILY_LOOKUPS, runHarvest, harvestStatus, rowsToCsv, exportDatasetRows, storageDownload, autocompletePostcode, normalizeSuggestion };
