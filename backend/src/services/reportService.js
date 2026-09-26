const PDFDocument = require('pdfkit');

function generateReportData(dataset) {
  return {
    datasetId: dataset.datasetId,
    generatedAt: new Date().toISOString(),
    files: (dataset.files || []).map(f => ({
      filename: f.originalname,
      size: f.size,
      type: f.extension
    })),
    summary: dataset.qualitySummary || {},
    schema: dataset.schema || {},
    duplicates: {
      total: (dataset.duplicates || []).length,
      exact: (dataset.duplicates || []).filter(d => d.subType === 'exact').length,
      potential: (dataset.duplicates || []).filter(d => d.subType !== 'exact').length,
      details: (dataset.duplicates || []).slice(0, 50)
    },
    inconsistencies: {
      total: (dataset.inconsistencies || []).length,
      details: (dataset.inconsistencies || []).slice(0, 50)
    },
    cleaningActions: {
      totalTransformations: (dataset.transformations || []).length,
      exactDuplicatesRemoved: (dataset.qualitySummary?.duplicates || 0),
      samples: (dataset.transformations || []).slice(0, 50)
    },
    reconciliations: dataset.reconciliations || [],
    metrics: (dataset.metrics || []).map(m => ({
      name: m.name,
      value: m.value,
      calculation: m.calculation,
      category: m.category
    })),
    traceability: dataset.traceability || [],
    assumptions: dataset.assumptions || [],
    limitations: dataset.limitations || []
  };
}

function generateTextReport(dataset) {
  const timestamp = new Date().toISOString();
  const qs = dataset.qualitySummary || {};
  const totalOriginal = qs.totalRecords ?? 0;
  const cleanRecords = qs.cleanRecords ?? 0;
  const exactDuplicatesRemoved = qs.duplicates ?? 0;
  const potentialDuplicates = qs.potentialDuplicates ?? 0;
  const missingValues = qs.missingValues ?? 0;
  const inconsistencies = qs.inconsistencies ?? 0;
  const totalIssues = missingValues + inconsistencies;
  const transformations = dataset.transformations || [];
  const files = dataset.files || [];
  const sheets = dataset.parsedSheets || [];
  const metrics = dataset.metrics || [];
  const assumptions = dataset.assumptions || [];
  const limitations = dataset.limitations || [];

  const lines = [
    '================================================================================',
    '                          DATABRIDGE AUDIT REPORT                               ',
    '================================================================================',
    `Processing Timestamp : ${timestamp}`,
    `Dataset ID           : ${dataset.datasetId}`,
    `Status               : Completed`,
    '',
    '--------------------------------------------------------------------------------',
    '1. DATA-SOURCE / FILE TRACEABILITY',
    '--------------------------------------------------------------------------------',
    'Original File(s):'
  ];

  for (const f of files) {
    const sizeKb = (f.size / 1024).toFixed(1);
    lines.push(`  • Filename: ${f.originalname} | Size: ${sizeKb} KB | Type: ${f.extension || 'N/A'}`);
  }

  lines.push('');
  lines.push('Sheet & Origin Breakdown:');
  for (const s of sheets) {
    lines.push(`  • Sheet "${s.name}" from [${s.sourceFile || 'unknown'}] (${s.rowCount} rows, ${s.columnCount || (s.columns ? s.columns.length : 0)} cols)`);
  }

  lines.push('');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('2. RECORD COUNTS & PROCESSING METRICS');
  lines.push('--------------------------------------------------------------------------------');
  lines.push(`Original Records Imported  : ${totalOriginal}`);
  lines.push(`Clean Records Output       : ${cleanRecords}`);
  const retainedRate = totalOriginal > 0 ? ((cleanRecords / totalOriginal) * 100).toFixed(1) : '100.0';
  lines.push(`Retention Rate             : ${retainedRate}%`);
  lines.push(`Duplicates Detected/Removed: ${exactDuplicatesRemoved}`);
  lines.push(`Potential Duplicates       : ${potentialDuplicates}`);
  lines.push(`Total Issues Detected      : ${totalIssues}`);
  lines.push(`  - Missing/Null Values    : ${missingValues}`);
  lines.push(`  - Cross-Entity Conflicts : ${inconsistencies}`);

  lines.push('');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('3. CLEANING & NORMALIZATION ACTIONS PERFORMED');
  lines.push('--------------------------------------------------------------------------------');
  lines.push(`Total Normalization Actions: ${transformations.length}`);
  lines.push('Automated Actions Summary:');
  lines.push('  • Exact duplicate records removed from final cleaned output.');
  lines.push('  • Whitespace trimmed and string values sanitized.');
  lines.push('  • Telephone numbers cleaned to standardized numeric representation.');
  lines.push('  • Email addresses normalized to lowercase standard format.');
  lines.push('  • Date values parsed and normalized into standard ISO format.');
  lines.push('  • Null-like tokens (e.g., "N/A", "none", "-", "") normalized to null.');

  if (transformations.length > 0) {
    lines.push('');
    lines.push(`Sample Transformation Log (showing up to 25 of ${transformations.length}):`);
    for (const t of transformations.slice(0, 25)) {
      lines.push(`  • [${t.sheet}] Row ${t.row}, Col "${t.column}": "${t.originalValue}" → "${t.normalizedValue}"`);
    }
  }

  lines.push('');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('4. METRIC & SCHEMA TRACEABILITY');
  lines.push('--------------------------------------------------------------------------------');
  if (metrics.length > 0) {
    for (const m of metrics) {
      const valStr = typeof m.value === 'object' ? JSON.stringify(m.value) : m.value;
      lines.push(`• Metric: ${m.name} = ${valStr}`);
      if (m.calculation) lines.push(`  Calculation: ${m.calculation}`);
      if (m.sources && m.sources.length > 0) lines.push(`  Data Sources: ${m.sources.join(', ')}`);
      if (m.transformations && m.transformations.length > 0) lines.push(`  Applied Transformations: ${m.transformations.join(', ')}`);
    }
  } else {
    lines.push('  No aggregate metrics configured.');
  }

  lines.push('');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('5. ASSUMPTIONS');
  lines.push('--------------------------------------------------------------------------------');
  if (assumptions.length > 0) {
    for (const a of assumptions) {
      lines.push(`  • ${a.text} (Source: ${a.source || 'system'})`);
    }
  } else {
    lines.push('  • No custom assumptions identified.');
  }

  lines.push('');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('6. DATA LIMITATIONS');
  lines.push('--------------------------------------------------------------------------------');
  if (limitations.length > 0) {
    for (const l of limitations) {
      const sev = l.severity ? `[${l.severity.toUpperCase()}] ` : '';
      lines.push(`  • ${sev}${l.text} (Source: ${l.source || 'dataset'})`);
    }
  } else {
    lines.push('  • No critical data limitations detected.');
  }

  lines.push('');
  lines.push('================================================================================');
  lines.push('                            END OF AUDIT REPORT                                 ');
  lines.push('================================================================================');

  return lines.join('\n');
}

function generatePdfReport(dataset) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const timestamp = new Date().toISOString();
    const qs = dataset.qualitySummary || {};

    doc.fontSize(22).text('DataBridge Audit Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generated: ${timestamp}`, { align: 'center' });
    doc.text(`Dataset ID: ${dataset.datasetId}`, { align: 'center' });
    doc.moveDown(1.5);

    // 1. Files & Traceability
    doc.fontSize(14).text('1. Data-Source & File Traceability');
    doc.moveDown(0.5);
    doc.fontSize(10);
    for (const file of dataset.files || []) {
      doc.text(`• ${file.originalname} (${(file.size / 1024).toFixed(1)} KB) - Type: ${file.extension || 'N/A'}`);
    }
    doc.moveDown();

    // 2. Data Quality Summary
    doc.fontSize(14).text('2. Data Quality & Record Counts');
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Original Records Imported: ${qs.totalRecords || 0}`);
    doc.text(`Clean Records Output: ${qs.cleanRecords || 0}`);
    doc.text(`Duplicates Detected / Removed: ${qs.duplicates || 0}`);
    doc.text(`Potential Duplicates: ${qs.potentialDuplicates || 0}`);
    doc.text(`Missing Values Detected: ${qs.missingValues || 0}`);
    doc.text(`Inconsistencies Detected: ${qs.inconsistencies || 0}`);
    doc.moveDown();

    // 3. Schema
    if (dataset.schema) {
      doc.fontSize(14).text('3. Schema');
      doc.moveDown(0.5);
      doc.fontSize(10);
      for (const [sheetName, schema] of Object.entries(dataset.schema)) {
        doc.text(`Sheet: ${sheetName} (${schema.rowCount} rows, ${schema.columnCount} columns)`);
        for (const col of schema.columns) {
          doc.text(`  - ${col.original} [${col.type}] (${col.nullCount} nulls, ${col.uniqueCount} unique)`);
        }
        doc.moveDown(0.5);
      }
      doc.moveDown();
    }

    // 4. Cleaning & Normalization
    doc.fontSize(14).text('4. Cleaning & Normalization Actions');
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text('• Exact duplicate records removed from final cleaned dataset.');
    doc.text('• String whitespace trimmed and normalized.');
    doc.text('• Telephone and phone fields standardized.');
    doc.text('• Email casing and syntax standardized.');
    doc.text('• Date values normalized to ISO-8601 representation.');
    doc.text('• Empty strings and null-like placeholders standardized to null.');
    if (dataset.transformations && dataset.transformations.length > 0) {
      doc.text(`• Total data transformations applied: ${dataset.transformations.length}`);
    }
    doc.moveDown();

    // 5. Duplicates
    if (dataset.duplicates && dataset.duplicates.length > 0) {
      doc.fontSize(14).text('5. Duplicates');
      doc.moveDown(0.5);
      doc.fontSize(10);
      const exactCount = dataset.duplicates.filter(d => d.subType === 'exact').length;
      const potentialCount = dataset.duplicates.length - exactCount;
      doc.text(`Total duplicate groups: ${dataset.duplicates.length}`);
      doc.text(`Exact duplicates: ${exactCount}`);
      doc.text(`Potential duplicates: ${potentialCount}`);
      doc.moveDown();
    }

    // 6. Inconsistencies
    if (dataset.inconsistencies && dataset.inconsistencies.length > 0) {
      doc.fontSize(14).text('6. Inconsistencies');
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Total inconsistencies: ${dataset.inconsistencies.length}`);
      for (const inc of dataset.inconsistencies.slice(0, 10)) {
        doc.text(`• Entity ${inc.entity}: ${inc.field} has conflicting values`);
      }
      doc.moveDown();
    }

    // 7. Metrics & Traceability
    if (dataset.metrics && dataset.metrics.length > 0) {
      doc.fontSize(14).text('7. Metrics & Traceability');
      doc.moveDown(0.5);
      doc.fontSize(10);
      for (const metric of dataset.metrics) {
        if (typeof metric.value === 'object') {
          doc.text(`• ${metric.name}: [see distribution data]`);
        } else {
          doc.text(`• ${metric.name}: ${metric.value}`);
        }
        if (metric.calculation) {
          doc.text(`  Calculation: ${metric.calculation}`);
        }
      }
      doc.moveDown();
    }

    // 8. Assumptions
    if (dataset.assumptions && dataset.assumptions.length > 0) {
      doc.fontSize(14).text('8. Assumptions');
      doc.moveDown(0.5);
      doc.fontSize(10);
      for (const a of dataset.assumptions) {
        doc.text(`• ${a.text}`);
      }
      doc.moveDown();
    }

    // 9. Limitations
    if (dataset.limitations && dataset.limitations.length > 0) {
      doc.fontSize(14).text('9. Data Limitations');
      doc.moveDown(0.5);
      doc.fontSize(10);
      for (const l of dataset.limitations) {
        doc.text(`• ${l.text}`);
      }
      doc.moveDown();
    }

    doc.end();
  });
}

module.exports = { generateReportData, generateTextReport, generatePdfReport };
