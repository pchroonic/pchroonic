const priority = require('./address-harvest-priority');
const { datasetPolicy, automationBlockReason } = require('./address-policy');

function complianceSummary(policy) {
  const blockedReason = automationBlockReason(policy);
  return {
    sourceDataset: policy.sourceDataset,
    provider: policy.provider,
    licenceCategory: policy.licenceCategory,
    licenceName: policy.licenceName,
    termsReference: policy.termsReference,
    rightsReviewedAt: policy.rightsReviewedAt,
    operationalUseAllowed: policy.operationalUseAllowed,
    humanInputRequired: policy.humanInputRequired,
    automatedBulkIngestAllowed: policy.automatedBulkIngestAllowed,
    commercialRedistributionAllowed: policy.commercialRedistributionAllowed,
    subscriptionApiAllowed: policy.subscriptionApiAllowed,
    bulkExportAllowed: policy.bulkExportAllowed,
    blockedReason: blockedReason || null
  };
}

async function runHarvest(options = {}) {
  const policy = await datasetPolicy(priority.DATASET);
  const blockedReason = automationBlockReason(policy);
  if (blockedReason) {
    return {
      ok: true,
      skipped: true,
      status: 'skipped',
      reason: 'provider_terms_blocked',
      error: blockedReason,
      compliance: complianceSummary(policy)
    };
  }
  return priority.runHarvest(options);
}

async function harvestStatus() {
  const [status, policy] = await Promise.all([
    priority.harvestStatus(),
    datasetPolicy(priority.DATASET)
  ]);
  return { ...status, compliance: complianceSummary(policy) };
}

module.exports = { ...priority, runHarvest, harvestStatus, complianceSummary };
