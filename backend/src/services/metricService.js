const crypto = require('crypto');
const { normalizeColumnName } = require('../utils/normalizeValue');
const { isNullLike, isNumeric } = require('../utils/dataTypes');
const { findIdentifierColumns } = require('./duplicateDetector');

function calculateMetrics(sheets, schemaMap) {
  const metrics = [];

  for (const sheet of sheets) {
    const schema = schemaMap[sheet.name];
    if (!schema) continue;

    metrics.push({
      metricId: crypto.randomUUID(),
      name: `Total Records in ${sheet.name}`,
      value: sheet.rowCount,
      calculation: `COUNT rows in ${sheet.name}`,
      category: 'record_count',
      sources: [{ file: sheet.sourceFile || sheet.name, sheet: sheet.name, column: null }],
      transformations: [],
      assumptions: [],
      limitations: []
    });

    const idCols = findIdentifierColumns(sheet.columns, schema);
    for (const col of idCols) {
      const values = sheet.rows
        .map(r => r[col])
        .filter(v => !isNullLike(v))
        .map(v => String(v).trim().toLowerCase());
      const uniqueCount = new Set(values).size;
      const blanks = sheet.rows.filter(r => isNullLike(r[col])).length;

      const metric = {
        metricId: crypto.randomUUID(),
        name: `Unique ${col}`,
        value: uniqueCount,
        calculation: `COUNT DISTINCT ${col}`,
        category: 'unique_count',
        sources: [{ file: sheet.sourceFile || sheet.name, sheet: sheet.name, column: col }],
        transformations: ['Trimmed whitespace', 'Normalized to lowercase', 'Excluded blank values'],
        assumptions: [`${col} is treated as an identifier field`],
        limitations: []
      };

      if (blanks > 0) {
        metric.limitations.push(`${blanks} records had no ${col}`);
      }

      metrics.push(metric);
    }

    for (const colSchema of schema.columns) {
      if (['integer', 'decimal', 'number'].includes(colSchema.type)) {
        const numericValues = sheet.rows
          .map(r => r[colSchema.original])
          .filter(v => !isNullLike(v) && isNumeric(v))
          .map(v => parseFloat(v));

        if (numericValues.length === 0) continue;

        const sum = numericValues.reduce((a, b) => a + b, 0);
        const avg = sum / numericValues.length;
        const min = Math.min(...numericValues);
        const max = Math.max(...numericValues);

        const baseSources = [{ file: sheet.sourceFile || sheet.name, sheet: sheet.name, column: colSchema.original }];
        const baseTransformations = ['Excluded null values', 'Parsed as numeric'];
        const baseLimitations = [];
        const nonNumericCount = sheet.rows.filter(r => !isNullLike(r[colSchema.original]) && !isNumeric(r[colSchema.original])).length;
        if (nonNumericCount > 0) {
          baseLimitations.push(`${nonNumericCount} non-numeric values excluded`);
        }

        metrics.push({
          metricId: crypto.randomUUID(),
          name: `Sum of ${colSchema.original}`,
          value: parseFloat(sum.toFixed(2)),
          calculation: `SUM ${colSchema.original}`,
          category: 'numeric_aggregate',
          sources: baseSources,
          transformations: baseTransformations,
          assumptions: [],
          limitations: baseLimitations
        });

        metrics.push({
          metricId: crypto.randomUUID(),
          name: `Average ${colSchema.original}`,
          value: parseFloat(avg.toFixed(2)),
          calculation: `AVG ${colSchema.original}`,
          category: 'numeric_aggregate',
          sources: baseSources,
          transformations: baseTransformations,
          assumptions: [],
          limitations: baseLimitations
        });

        metrics.push({
          metricId: crypto.randomUUID(),
          name: `Min ${colSchema.original}`,
          value: min,
          calculation: `MIN ${colSchema.original}`,
          category: 'numeric_aggregate',
          sources: baseSources,
          transformations: baseTransformations,
          assumptions: [],
          limitations: baseLimitations
        });

        metrics.push({
          metricId: crypto.randomUUID(),
          name: `Max ${colSchema.original}`,
          value: max,
          calculation: `MAX ${colSchema.original}`,
          category: 'numeric_aggregate',
          sources: baseSources,
          transformations: baseTransformations,
          assumptions: [],
          limitations: baseLimitations
        });
      }

      if (colSchema.type === 'string' && colSchema.uniqueCount <= 50 && colSchema.uniqueCount > 1) {
        const distribution = {};
        for (const row of sheet.rows) {
          const val = row[colSchema.original];
          if (isNullLike(val)) continue;
          const key = String(val).trim();
          distribution[key] = (distribution[key] || 0) + 1;
        }

        metrics.push({
          metricId: crypto.randomUUID(),
          name: `Distribution of ${colSchema.original}`,
          value: distribution,
          calculation: `GROUP BY ${colSchema.original} COUNT`,
          category: 'distribution',
          sources: [{ file: sheet.sourceFile || sheet.name, sheet: sheet.name, column: colSchema.original }],
          transformations: ['Trimmed whitespace', 'Excluded null values'],
          assumptions: [`${colSchema.original} is treated as a categorical field`],
          limitations: []
        });
      }

      if (colSchema.type === 'date') {
        const dates = sheet.rows
          .map(r => r[colSchema.original])
          .filter(v => !isNullLike(v))
          .map(v => new Date(v))
          .filter(d => !isNaN(d.getTime()))
          .sort((a, b) => a - b);

        if (dates.length > 0) {
          const yearDistribution = {};
          for (const d of dates) {
            const year = d.getFullYear();
            yearDistribution[year] = (yearDistribution[year] || 0) + 1;
          }

          metrics.push({
            metricId: crypto.randomUUID(),
            name: `Date Range of ${colSchema.original}`,
            value: {
              earliest: dates[0].toISOString().split('T')[0],
              latest: dates[dates.length - 1].toISOString().split('T')[0],
              distribution: yearDistribution
            },
            calculation: `MIN/MAX/GROUP BY YEAR ${colSchema.original}`,
            category: 'date_range',
            sources: [{ file: sheet.sourceFile || sheet.name, sheet: sheet.name, column: colSchema.original }],
            transformations: ['Parsed as date', 'Excluded invalid dates'],
            assumptions: [],
            limitations: []
          });
        }
      }
    }
  }

  return metrics;
}

module.exports = { calculateMetrics };
