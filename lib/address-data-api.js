const crypto = require('crypto');

function cleanPostcode(value='') {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  return raw.length > 3 ? `${raw.slice(0, -3)} ${raw.slice(-3)}` : raw;
}
function isFullPostcode(value='') {
  return /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(String(value || '').trim());
}
function cleanUprn(value='') {
  const text = String(value || '').trim();
  return /^\d{1,12}$/.test(text) ? text : '';
}
function hashApiKey(value='') {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}
function safeLimit(value, fallback=50, max=100) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(1, n)) : fallback;
}
function rightsMetadata(row={}) {
  return {
    datasetVersion: row.dataset_version || null,
    licenceCategory: row.licence_category || null,
    licenceName: row.licence_name || null,
    licenceReference: row.licence_reference || null,
    attribution: row.attribution_text || null,
    shareAlikeRequired: row.share_alike_required === true
  };
}
function publicAddressRow(row={}) {
  return {
    uprn: row.uprn || null,
    postcode: row.postcode || null,
    addressLine1: row.address_line1 || null,
    addressLine2: row.address_line2 || null,
    addressLine3: row.address_line3 || null,
    displayAddress: row.display_address || null,
    postTown: row.post_town || row.city || null,
    locality: row.dependent_locality || null,
    district: row.district || null,
    region: row.region || null,
    countryCode: row.country_code || 'GB',
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    propertyClass: row.property_class || null,
    sourceDataset: row.source_dataset || null,
    ...rightsMetadata(row)
  };
}
function publicPostcodeRow(row={}) {
  return {
    postcode: row.postcode || null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    easting: row.easting ?? null,
    northing: row.northing ?? null,
    positionalQualityIndicator: row.positional_quality_indicator ?? null,
    countryCode: row.country_code || null,
    nhsRegionalHaCode: row.nhs_regional_ha_code || null,
    nhsHaCode: row.nhs_ha_code || null,
    adminCountyCode: row.admin_county_code || null,
    adminDistrictCode: row.admin_district_code || null,
    adminWardCode: row.admin_ward_code || null,
    sourceDataset: row.source_dataset || null,
    ...rightsMetadata(row)
  };
}
function publicPropertyRow(row={}) {
  return {
    uprn: row.uprn || null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    easting: row.easting ?? null,
    northing: row.northing ?? null,
    sourceDataset: row.location_source_dataset || row.source_dataset || null,
    ...rightsMetadata(row)
  };
}

module.exports = {
  cleanPostcode, isFullPostcode, cleanUprn, hashApiKey, safeLimit,
  rightsMetadata, publicAddressRow, publicPostcodeRow, publicPropertyRow
};
