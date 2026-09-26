const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/uploadMiddleware');
const { validateDatasetExists, validateFilesUploaded } = require('../middleware/validation');
const datasetController = require('../controllers/datasetController');

router.get('/', datasetController.listDatasets);

router.post(
  '/upload',
  upload.array('files', 20),
  validateFilesUploaded,
  datasetController.uploadFiles
);

router.get('/:datasetId/preview', validateDatasetExists, datasetController.getPreview);
router.get('/:datasetId/status', validateDatasetExists, datasetController.getStatus);
router.get('/:datasetId/dashboard', validateDatasetExists, datasetController.getDashboard);
router.get('/:datasetId/cleaned-data', validateDatasetExists, datasetController.getCleanedData);
router.get('/:datasetId/issues', validateDatasetExists, datasetController.getIssues);
router.get('/:datasetId/limitations', validateDatasetExists, datasetController.getLimitations);
router.get('/:datasetId/export/csv', validateDatasetExists, datasetController.exportCsv);

module.exports = router;
