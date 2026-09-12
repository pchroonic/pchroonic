const { db } = require('./server');

function asBool(value) { return value === true; }

function normalisePolicy(row = {}, sourceDataset = '') {
  return {
    sourceDataset: String(row.source_dataset || sourceDataset || ''),
    provider: String(row.provider || ''),
    product: String(row.product || ''),
    licenceCategory: String(row.licence_category || 'unreviewed'),
    licenceName: row.licence_name || null,
    licenceReference: row.licence_reference || null,
    termsReference: row.terms_reference || row.licence_reference || null,
    rightsReviewedAt: row.rights_reviewed_at || null,
    permissionReference: row.permission_reference || null,
    operationalUseAllowed: asBool(row.operational_use_allowed),
    humanInputRequired: asBool(row.human_input_required),
    automatedBulkIngestAllowed: asBool(row.automated_bulk_ingest_allowed),
    commercialRedistributionAllowed: asBool(row.commercial_redistribution_allowed),
    subscriptionApiAllowed: asBool(row.subscription_api_allowed),
    bulkExportAllowed: asBool(row.bulk_export_allowed),
    shareAlikeRequired: asBool(row.share_alike_required),
    attributionText: row.attribution_text || null,
    rightsNotes: row.rights_notes || null,
    active: row.active !== false
  };
}

async function datasetPolicy(sourceDataset) {
  const source = String(sourceDataset || '').trim();
  if (!source) return normalisePolicy({}, '');
  try {
    const rows = await db(`address_dataset_registry?source_dataset=eq.${encodeURIComponent(source)}&select=*&limit=1`);
    return normalisePolicy(rows?.[0] || {}, source);
  } catch (error) {
    // Rights metadata is a safety control. Fail closed if the registry or a new
    // migration is temporarily unavailable rather than accidentally enabling use.
    console.warn(`Address policy lookup failed for ${source}:`, error.message);
    return normalisePolicy({}, source);
  }
}

async function refreshDatasetCount(sourceDataset) {
  const source = String(sourceDataset || '').trim();
  if (!source) return null;
  try {
    const result = await db('rpc/refresh_address_dataset_registry_count', {
      method: 'POST',
      body: { p_source_dataset: source }
    });
    const n = Number(Array.isArray(result) ? result[0] : result);
    return Number.isFinite(n) ? n : null;
  } catch (error) {
    console.warn(`Address dataset count refresh failed for ${source}:`, error.message);
    return null;
  }
}

function automationBlockReason(policy) {
  if (!policy?.active) return 'The address data source is inactive.';
  if (policy?.automatedBulkIngestAllowed) return '';
  return policy?.rightsNotes || 'Automated bulk collection is not permitted for this address data source.';
}

function distributionBlockReason(policy) {
  if (!policy?.active) return 'The address data source is inactive.';
  if (!policy?.commercialRedistributionAllowed) return 'Commercial redistribution is not permitted for this address data source.';
  if (!policy?.subscriptionApiAllowed) return 'This address data source is not approved for the Namdar subscription API.';
  return '';
}

module.exports = {
  normalisePolicy,
  datasetPolicy,
  refreshDatasetCount,
  automationBlockReason,
  distributionBlockReason
};
