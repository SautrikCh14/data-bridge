function generateTraceability(metrics) {
  return metrics.map(metric => ({
    metricId: metric.metricId,
    name: metric.name,
    value: metric.value,
    calculation: metric.calculation,
    category: metric.category,
    sources: metric.sources,
    transformations: metric.transformations,
    assumptions: metric.assumptions,
    limitations: metric.limitations
  }));
}

function getMetricTraceability(traceability, metricId) {
  return traceability.find(t => t.metricId === metricId) || null;
}

function generateAssumptions(sheets, schemaMap, reconciliations, duplicates) {
  const assumptions = [];

  for (const sheet of sheets) {
    const schema = schemaMap[sheet.name];
    if (!schema) continue;

    for (const col of schema.columns) {
      if (col.type === 'identifier') {
        assumptions.push({
          text: `${col.original} in ${sheet.name} is treated as a unique identifier.`,
          source: sheet.sourceFile || sheet.name,
          column: col.original
        });
      }
    }
  }

  if (reconciliations.length > 0) {
    for (const rec of reconciliations) {
      assumptions.push({
        text: `${rec.relationship.columnA} and ${rec.relationship.columnB} represent the same entity across datasets.`,
        source: `${rec.relationship.datasetA} ↔ ${rec.relationship.datasetB}`
      });
    }
  }

  if (duplicates.length > 0) {
    assumptions.push({
      text: 'Duplicate detection uses normalized (trimmed, lowercased) values for comparison.',
      source: 'system'
    });
  }

  return assumptions;
}

function generateLimitations(sheets, schemaMap, issues, reconciliations) {
  const limitations = [];

  for (const sheet of sheets) {
    const schema = schemaMap[sheet.name];
    if (!schema) continue;

    for (const col of schema.columns) {
      if (col.nullCount > 0) {
        limitations.push({
          text: `${col.original} in ${sheet.name} has ${col.nullCount} missing values (${((col.nullCount / col.totalCount) * 100).toFixed(1)}%).`,
          severity: col.nullCount > col.totalCount * 0.5 ? 'critical' : 'minor',
          source: sheet.sourceFile || sheet.name,
          column: col.original
        });
      }
    }
  }

  limitations.push({
    text: 'Data is stored in-memory and will be lost on server restart.',
    severity: 'info',
    source: 'system'
  });

  limitations.push({
    text: 'Potential duplicate detection uses heuristic matching and may produce false positives.',
    severity: 'info',
    source: 'system'
  });

  for (const rec of reconciliations) {
    if (rec.unmatched > 0) {
      limitations.push({
        text: `${rec.unmatched} records from ${rec.relationship.datasetA} could not be matched in ${rec.relationship.datasetB}.`,
        severity: 'minor',
        source: `${rec.relationship.datasetA} ↔ ${rec.relationship.datasetB}`
      });
    }
  }

  return limitations;
}

module.exports = {
  generateTraceability,
  getMetricTraceability,
  generateAssumptions,
  generateLimitations
};
