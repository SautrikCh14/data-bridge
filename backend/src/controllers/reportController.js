const { generateReportData, generateTextReport, generatePdfReport } = require('../services/reportService');
const { success, error } = require('../utils/response');

async function getReport(req, res, next) {
  try {
    const dataset = req.dataset;

    if (dataset.status !== 'completed') {
      return error(res, 'ANALYSIS_NOT_COMPLETE', 'Analysis has not been completed for this dataset.', 400);
    }

    if (req.query.format === 'txt' || req.query.format === 'text') {
      return getTextReport(req, res, next);
    }

    if (req.query.format === 'pdf') {
      return getPdfReport(req, res, next);
    }

    const report = generateReportData(dataset);
    return success(res, { report });
  } catch (err) {
    next(err);
  }
}

async function getTextReport(req, res, next) {
  try {
    const dataset = req.dataset;

    if (dataset.status !== 'completed') {
      return error(res, 'ANALYSIS_NOT_COMPLETE', 'Analysis has not been completed for this dataset.', 400);
    }

    const textReport = generateTextReport(dataset);
    const filename = `DataBridge_Audit_Report_${Date.now()}.txt`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(textReport);
  } catch (err) {
    next(err);
  }
}

async function getPdfReport(req, res, next) {
  try {
    const dataset = req.dataset;

    if (dataset.status !== 'completed') {
      return error(res, 'ANALYSIS_NOT_COMPLETE', 'Analysis has not been completed for this dataset.', 400);
    }

    const pdfBuffer = await generatePdfReport(dataset);
    const filename = `DataBridge_Audit_Report_${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

module.exports = { getReport, getTextReport, getPdfReport };
