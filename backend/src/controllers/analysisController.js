const store = require('../storage/inMemoryStore');
const { detectSchema, normalizeData, detectMissingValues } = require('../services/normalizer');
const { detectDuplicates } = require('../services/duplicateDetector');
const { findInconsistencies } = require('../services/inconsistencyDetector');
const { findRelationships, reconcileDatasets } = require('../services/reconciliationService');
const { calculateMetrics } = require('../services/metricService');
const { generateTraceability, getMetricTraceability, generateAssumptions, generateLimitations } = require('../services/traceabilityService');
const { success, error } = require('../utils/response');

async function analyze(req, res, next) {
  try {
    const dataset = req.dataset;

    if (!dataset.parsedSheets || dataset.parsedSheets.length === 0) {
      return error(res, 'NOT_PARSED', 'Dataset has not been parsed. Upload files first.', 400);
    }

    store.updateDataset(dataset.datasetId, {
      status: 'processing',
      stage: 'schema_detection',
      progress: 30
    });

    const schemaMap = detectSchema(dataset.parsedSheets);

    store.updateDataset(dataset.datasetId, {
      schema: schemaMap,
      stage: 'normalization',
      progress: 40
    });

    const { normalizedSheets, transformations } = normalizeData(dataset.parsedSheets, schemaMap);

    store.updateDataset(dataset.datasetId, {
      stage: 'duplicate_detection',
      progress: 50
    });

    const missingIssues = detectMissingValues(dataset.parsedSheets, schemaMap);
    const duplicates = detectDuplicates(normalizedSheets, schemaMap);

    store.updateDataset(dataset.datasetId, {
      stage: 'inconsistency_detection',
      progress: 60
    });

    const inconsistencies = findInconsistencies(normalizedSheets, schemaMap);

    store.updateDataset(dataset.datasetId, {
      stage: 'reconciliation',
      progress: 70
    });

    const relationships = findRelationships(normalizedSheets, schemaMap);
    const reconciliations = reconcileDatasets(normalizedSheets, relationships);

    store.updateDataset(dataset.datasetId, {
      stage: 'metric_calculation',
      progress: 80
    });

    const metrics = calculateMetrics(normalizedSheets, schemaMap);
    const traceability = generateTraceability(metrics);
    const assumptions = generateAssumptions(normalizedSheets, schemaMap, reconciliations, duplicates);
    const limitations = generateLimitations(normalizedSheets, schemaMap, missingIssues, reconciliations);

    const exactDuplicateRows = new Set();
    for (const dup of duplicates.filter(d => d.subType === 'exact')) {
      for (let i = 1; i < dup.rows.length; i++) {
        exactDuplicateRows.add(`${dup.sheet}:${dup.rows[i]}`);
      }
    }

    const cleanedSheets = normalizedSheets.map(sheet => {
      const cleanedRows = sheet.rows.filter((row, idx) => {
        return !exactDuplicateRows.has(`${sheet.name}:${idx + 1}`);
      });
      return {
        name: sheet.name,
        columns: sheet.columns,
        rowCount: cleanedRows.length,
        columnCount: sheet.columnCount,
        rows: cleanedRows,
        sourceFile: sheet.sourceFile
      };
    });

    let totalOriginal = 0;
    let totalCleaned = 0;
    for (const s of dataset.parsedSheets) totalOriginal += s.rowCount;
    for (const s of cleanedSheets) totalCleaned += s.rows.length;

    const totalMissing = missingIssues.reduce((sum, i) => sum + i.count, 0);

    const qualitySummary = {
      totalRecords: totalOriginal,
      cleanRecords: totalCleaned,
      duplicates: duplicates.filter(d => d.subType === 'exact').reduce((sum, d) => sum + d.count - 1, 0),
      potentialDuplicates: duplicates.filter(d => d.subType !== 'exact').length,
      missingValues: totalMissing,
      inconsistencies: inconsistencies.length,
      normalizationChanges: transformations.length,
      relationships: relationships.length,
      reconciled: reconciliations.length
    };

    store.updateDataset(dataset.datasetId, {
      status: 'completed',
      stage: 'completed',
      progress: 100,
      cleanedData: { sheets: cleanedSheets },
      originalData: { sheets: dataset.parsedSheets },
      issues: missingIssues,
      duplicates,
      inconsistencies,
      reconciliations,
      relationships,
      metrics,
      traceability,
      assumptions,
      limitations,
      qualitySummary,
      transformations
    });

    return success(res, {
      datasetId: dataset.datasetId,
      status: 'completed',
      summary: {
        files: dataset.files.length,
        sheets: dataset.parsedSheets.length,
        records: totalOriginal,
        cleanRecords: totalCleaned,
        duplicates: qualitySummary.duplicates,
        potentialDuplicates: qualitySummary.potentialDuplicates,
        inconsistencies: qualitySummary.inconsistencies,
        missingValues: qualitySummary.missingValues,
        relationships: qualitySummary.relationships,
        metricsGenerated: metrics.length
      }
    });
  } catch (err) {
    store.updateDataset(req.dataset.datasetId, {
      status: 'error',
      stage: 'error',
      progress: 0,
      errorMessage: err.message
    });
    next(err);
  }
}

async function getTraceability(req, res, next) {
  try {
    const dataset = req.dataset;

    if (dataset.status !== 'completed') {
      return error(res, 'ANALYSIS_NOT_COMPLETE', 'Analysis has not been completed for this dataset.', 400);
    }

    return success(res, {
      datasetId: dataset.datasetId,
      traceability: dataset.traceability || [],
      assumptions: dataset.assumptions || [],
      limitations: dataset.limitations || []
    });
  } catch (err) {
    next(err);
  }
}

async function getMetricTrace(req, res, next) {
  try {
    const dataset = req.dataset;
    const { metricId } = req.params;

    if (dataset.status !== 'completed') {
      return error(res, 'ANALYSIS_NOT_COMPLETE', 'Analysis has not been completed for this dataset.', 400);
    }

    const trace = getMetricTraceability(dataset.traceability || [], metricId);
    if (!trace) {
      return error(res, 'METRIC_NOT_FOUND', `Metric ${metricId} not found.`, 404);
    }

    return success(res, { metric: trace });
  } catch (err) {
    next(err);
  }
}

module.exports = { analyze, getTraceability, getMetricTrace };
