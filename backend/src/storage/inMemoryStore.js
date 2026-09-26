const crypto = require('crypto');

const datasets = new Map();

function createDataset() {
  const datasetId = crypto.randomUUID();
  const dataset = {
    datasetId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'upload',
    progress: 0,
    stage: 'upload',
    files: [],
    parsedSheets: [],
    originalData: {},
    cleanedData: {},
    schema: {},
    issues: [],
    duplicates: [],
    inconsistencies: [],
    reconciliations: [],
    metrics: [],
    traceability: [],
    assumptions: [],
    limitations: [],
    qualitySummary: null,
    dashboardData: null
  };
  datasets.set(datasetId, dataset);
  return dataset;
}

function getDataset(datasetId) {
  return datasets.get(datasetId) || null;
}

function updateDataset(datasetId, updates) {
  const dataset = datasets.get(datasetId);
  if (!dataset) return null;
  Object.assign(dataset, updates, { updatedAt: new Date().toISOString() });
  datasets.set(datasetId, dataset);
  return dataset;
}

function deleteDataset(datasetId) {
  return datasets.delete(datasetId);
}

function getAllDatasets() {
  return Array.from(datasets.values()).map(d => ({
    datasetId: d.datasetId,
    createdAt: d.createdAt,
    status: d.status,
    stage: d.stage,
    fileCount: d.files.length
  }));
}

module.exports = {
  createDataset,
  getDataset,
  updateDataset,
  deleteDataset,
  getAllDatasets
};
