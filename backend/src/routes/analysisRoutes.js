const express = require('express');
const router = express.Router();
const { validateDatasetExists } = require('../middleware/validation');
const analysisController = require('../controllers/analysisController');

router.post('/:datasetId/analyze', validateDatasetExists, analysisController.analyze);
router.get('/:datasetId/traceability', validateDatasetExists, analysisController.getTraceability);
router.get('/:datasetId/traceability/:metricId', validateDatasetExists, analysisController.getMetricTrace);

module.exports = router;
