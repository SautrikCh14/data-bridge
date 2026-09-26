const { error } = require('../utils/response');
const store = require('../storage/inMemoryStore');

function validateDatasetExists(req, res, next) {
  const { datasetId } = req.params;
  if (!datasetId) {
    return error(res, 'MISSING_DATASET_ID', 'Dataset ID is required.', 400);
  }
  const dataset = store.getDataset(datasetId);
  if (!dataset) {
    return error(res, 'DATASET_NOT_FOUND', `Dataset ${datasetId} not found.`, 404);
  }
  req.dataset = dataset;
  next();
}

function validateAnalysisComplete(req, res, next) {
  if (!req.dataset || req.dataset.status !== 'completed') {
    return error(res, 'ANALYSIS_NOT_COMPLETE', 'Analysis has not been completed for this dataset.', 400);
  }
  next();
}

function validateFilesUploaded(req, res, next) {
  if (!req.files || req.files.length === 0) {
    return error(res, 'NO_FILES', 'At least one file must be uploaded.', 400);
  }
  next();
}

module.exports = {
  validateDatasetExists,
  validateAnalysisComplete,
  validateFilesUploaded
};
