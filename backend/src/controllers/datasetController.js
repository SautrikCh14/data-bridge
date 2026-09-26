const crypto = require('crypto');
const path = require('path');
const store = require('../storage/inMemoryStore');
const { parseAllFiles } = require('../services/fileParser');
const { detectSchema, normalizeData, detectMissingValues } = require('../services/normalizer');
const { detectDuplicates } = require('../services/duplicateDetector');
const { findInconsistencies } = require('../services/inconsistencyDetector');
const { findRelationships, reconcileDatasets } = require('../services/reconciliationService');
const { calculateMetrics } = require('../services/metricService');
const { generateTraceability, generateAssumptions, generateLimitations } = require('../services/traceabilityService');
const { success, error, paginate } = require('../utils/response');
const { isNullLike } = require('../utils/dataTypes');
const { stringify } = require('csv-stringify/sync');

async function uploadFiles(req, res, next) {
  try {
    const dataset = store.createDataset();
    const files = req.files.map(f => ({
      fileId: crypto.randomUUID(),
      originalname: f.originalname,
      filename: f.filename,
      path: f.path,
      extension: path.extname(f.originalname).toLowerCase(),
      size: f.size,
      mimetype: f.mimetype,
      status: 'uploaded'
    }));

    store.updateDataset(dataset.datasetId, {
      files,
      status: 'uploaded',
      stage: 'upload',
      progress: 10
    });

    let parsedFiles;
    try {
      parsedFiles = parseAllFiles(files);
      const allSheets = [];
      for (const pf of parsedFiles) {
        for (const sheet of pf.sheets) {
          sheet.sourceFile = pf.filename;
          sheet.fileId = pf.fileId;
          allSheets.push(sheet);
        }
      }

      store.updateDataset(dataset.datasetId, {
        parsedSheets: allSheets,
        parsedFiles,
        status: 'parsed',
        stage: 'parsing',
        progress: 25
      });
    } catch (parseErr) {
      store.updateDataset(dataset.datasetId, {
        status: 'error',
        stage: 'parsing',
        progress: 0,
        errorMessage: parseErr.message
      });
    }

    return success(res, {
      datasetId: dataset.datasetId,
      files: files.map(f => ({
        fileId: f.fileId,
        filename: f.originalname,
        extension: f.extension,
        size: f.size,
        status: f.status
      }))
    }, 201);
  } catch (err) {
    next(err);
  }
}

async function getPreview(req, res, next) {
  try {
    const dataset = req.dataset;
    const { sheet, page, limit } = req.query;

    if (!dataset.parsedSheets || dataset.parsedSheets.length === 0) {
      return error(res, 'NOT_PARSED', 'Dataset has not been parsed yet.', 400);
    }

    let targetSheet;
    if (sheet) {
      targetSheet = dataset.parsedSheets.find(
        s => s.name.toLowerCase() === sheet.toLowerCase()
      );
      if (!targetSheet) {
        return error(res, 'SHEET_NOT_FOUND', `Sheet "${sheet}" not found.`, 404);
      }
    } else {
      targetSheet = dataset.parsedSheets[0];
    }

    const paginated = paginate(targetSheet.rows, page, limit);

    return success(res, {
      sheet: targetSheet.name,
      sourceFile: targetSheet.sourceFile,
      page: paginated.page,
      limit: paginated.limit,
      totalRows: paginated.total,
      totalPages: paginated.totalPages,
      columns: targetSheet.columns,
      rows: paginated.data,
      availableSheets: dataset.parsedSheets.map(s => ({
        name: s.name,
        sourceFile: s.sourceFile,
        rowCount: s.rowCount,
        columnCount: s.columnCount
      }))
    });
  } catch (err) {
    next(err);
  }
}

async function getStatus(req, res, next) {
  try {
    const dataset = req.dataset;
    return success(res, {
      datasetId: dataset.datasetId,
      status: dataset.status,
      progress: dataset.progress,
      stage: dataset.stage,
      errorMessage: dataset.errorMessage || null
    });
  } catch (err) {
    next(err);
  }
}

async function getDashboard(req, res, next) {
  try {
    const dataset = req.dataset;

    if (dataset.status !== 'completed') {
      return error(res, 'ANALYSIS_NOT_COMPLETE', 'Analysis has not been completed for this dataset.', 400);
    }

    const allSheets = dataset.cleanedData.sheets || dataset.parsedSheets || [];
    let totalRecords = 0;
    for (const s of allSheets) {
      totalRecords += s.rows.length;
    }

    const summary = dataset.qualitySummary || {
      originalRecords: totalRecords,
      cleanRecords: totalRecords,
      duplicates: 0,
      issues: 0
    };

    const statistics = { totalRecords };
    const charts = {};

    const metrics = dataset.metrics || [];
    for (const m of metrics) {
      if (m.category === 'unique_count') {
        const key = m.name.replace('Unique ', '').replace(/ /g, '_');
        statistics[key] = m.value;
      }
      if (m.category === 'distribution' && typeof m.value === 'object') {
        const chartKey = `recordsBy_${m.name.replace('Distribution of ', '').replace(/ /g, '_')}`;
        charts[chartKey] = Object.entries(m.value).map(([label, count]) => ({
          label,
          count
        }));
      }
      if (m.category === 'date_range' && typeof m.value === 'object' && m.value.distribution) {
        const chartKey = `recordsBy_${m.name.replace('Date Range of ', '').replace(/ /g, '_')}_year`;
        charts[chartKey] = Object.entries(m.value.distribution).map(([label, count]) => ({
          label,
          count
        }));
      }
    }

    const cleanedSheets = dataset.cleanedData.sheets || [];
    const compositionMap = {};
    let compositionTotal = 0;
    for (const sheet of cleanedSheets) {
      const source = sheet.sourceFile || sheet.name;
      if (!compositionMap[source]) {
        compositionMap[source] = 0;
      }
      compositionMap[source] += sheet.rows.length;
      compositionTotal += sheet.rows.length;
    }

    const datasetComposition = Object.entries(compositionMap)
      .map(([fileName, recordCount]) => ({
        fileName,
        recordCount,
        percentage: compositionTotal > 0
          ? parseFloat(((recordCount / compositionTotal) * 100).toFixed(1))
          : 0
      }))
      .sort((a, b) => b.recordCount - a.recordCount);

    return success(res, {
      datasetId: dataset.datasetId,
      summary,
      statistics,
      charts,
      metrics: metrics.map(m => ({
        metricId: m.metricId,
        name: m.name,
        value: m.value,
        category: m.category,
        calculation: m.calculation
      })),
      filesAnalyzed: dataset.files.map(f => ({
        filename: f.originalname,
        size: f.size
      })),
      sheetsDetected: (dataset.parsedSheets || []).map(s => ({
        name: s.name,
        sourceFile: s.sourceFile,
        rowCount: s.rowCount
      })),
      datasetComposition,
      compositionTotalRecords: compositionTotal
    });
  } catch (err) {
    next(err);
  }
}

async function getCleanedData(req, res, next) {
  try {
    const dataset = req.dataset;
    const { page, limit, sheet } = req.query;

    if (dataset.status !== 'completed' || !dataset.cleanedData) {
      return error(res, 'ANALYSIS_NOT_COMPLETE', 'Analysis has not been completed for this dataset.', 400);
    }

    const sheets = dataset.cleanedData.sheets || [];
    let targetSheet;
    if (sheet) {
      targetSheet = sheets.find(s => s.name.toLowerCase() === sheet.toLowerCase());
      if (!targetSheet) {
        return error(res, 'SHEET_NOT_FOUND', `Sheet "${sheet}" not found.`, 404);
      }
    } else {
      targetSheet = sheets[0];
    }

    if (!targetSheet) {
      return success(res, { page: 1, limit: 20, total: 0, columns: [], rows: [] });
    }

    const paginated = paginate(targetSheet.rows, page, limit);

    return success(res, {
      sheet: targetSheet.name,
      page: paginated.page,
      limit: paginated.limit,
      total: paginated.total,
      totalPages: paginated.totalPages,
      columns: targetSheet.columns,
      rows: paginated.data,
      availableSheets: sheets.map(s => ({
        name: s.name,
        rowCount: s.rows.length
      }))
    });
  } catch (err) {
    next(err);
  }
}

async function getIssues(req, res, next) {
  try {
    const dataset = req.dataset;
    const { type, severity, page, limit } = req.query;

    let allIssues = [
      ...(dataset.issues || []),
      ...(dataset.duplicates || []).map(d => ({ ...d, type: 'duplicate' })),
      ...(dataset.inconsistencies || []).map(i => ({ ...i, type: 'inconsistency' }))
    ];

    if (type) {
      allIssues = allIssues.filter(i => i.type === type);
    }
    if (severity) {
      allIssues = allIssues.filter(i => i.severity === severity);
    }

    const paginated = paginate(allIssues, page, limit);

    return success(res, {
      page: paginated.page,
      limit: paginated.limit,
      total: paginated.total,
      totalPages: paginated.totalPages,
      summary: {
        duplicates: (dataset.duplicates || []).length,
        inconsistencies: (dataset.inconsistencies || []).length,
        missingValues: (dataset.issues || []).filter(i => i.type === 'missing_value').length,
        total: allIssues.length
      },
      issues: paginated.data
    });
  } catch (err) {
    next(err);
  }
}

async function getLimitations(req, res, next) {
  try {
    const dataset = req.dataset;
    return success(res, {
      assumptions: dataset.assumptions || [],
      limitations: dataset.limitations || []
    });
  } catch (err) {
    next(err);
  }
}

async function exportCsv(req, res, next) {
  try {
    const dataset = req.dataset;

    if (dataset.status !== 'completed' || !dataset.cleanedData) {
      return error(res, 'ANALYSIS_NOT_COMPLETE', 'Analysis has not been completed for this dataset.', 400);
    }

    const sheets = dataset.cleanedData.sheets || [];
    if (sheets.length === 0) {
      return error(res, 'NO_DATA', 'No cleaned data available for export.', 400);
    }

    const { sheet: sheetName } = req.query;
    let exportRows = [];
    let exportColumns = [];
    let exportSheetName = '';

    if (sheetName) {
      const targetSheet = sheets.find(s => s.name.toLowerCase() === sheetName.toLowerCase());
      if (!targetSheet) {
        return error(res, 'SHEET_NOT_FOUND', `Sheet "${sheetName}" not found.`, 404);
      }
      exportRows = targetSheet.rows;
      exportColumns = targetSheet.columns;
      exportSheetName = targetSheet.name;
    } else if (sheets.length === 1) {
      exportRows = sheets[0].rows;
      exportColumns = sheets[0].columns;
      exportSheetName = sheets[0].name;
    } else {
      const colSet = new Set();
      for (const s of sheets) {
        for (const c of s.columns) colSet.add(c);
      }
      exportColumns = Array.from(colSet);
      exportRows = sheets.flatMap(s => s.rows);
      exportSheetName = 'cleaned_dataset';
    }

    const csvOutput = stringify(exportRows, {
      header: true,
      columns: exportColumns
    });

    const filename = `DataBridge_Cleaned_${exportSheetName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvOutput);
  } catch (err) {
    next(err);
  }
}

async function listDatasets(req, res, next) {
  try {
    const datasets = store.getAllDatasets();
    return success(res, { datasets });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadFiles,
  getPreview,
  getStatus,
  getDashboard,
  getCleanedData,
  getIssues,
  getLimitations,
  exportCsv,
  listDatasets
};
