const express = require('express');
const router = express.Router();
const { validateDatasetExists } = require('../middleware/validation');
const reportController = require('../controllers/reportController');

router.get('/:datasetId/report', validateDatasetExists, reportController.getReport);
router.get('/:datasetId/report/pdf', validateDatasetExists, reportController.getPdfReport);
router.get('/:datasetId/report/txt', validateDatasetExists, reportController.getTextReport);
router.get('/:datasetId/report/text', validateDatasetExists, reportController.getTextReport);

module.exports = router;
