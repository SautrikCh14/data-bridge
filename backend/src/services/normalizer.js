const { normalizeColumnName, normalizeValue } = require('../utils/normalizeValue');
const { detectColumnType, getExampleValues, isNullLike } = require('../utils/dataTypes');

function detectSchema(sheets) {
  const schemaMap = {};

  for (const sheet of sheets) {
    const columns = [];

    for (const colName of sheet.columns) {
      const values = sheet.rows.map(row => row[colName]);
      const nonNullValues = values.filter(v => !isNullLike(v));
      const type = detectColumnType(values);
      const uniqueValues = new Set(nonNullValues.map(v => String(v).trim()));

      columns.push({
        original: colName,
        normalized: normalizeColumnName(colName),
        type,
        nullCount: values.length - nonNullValues.length,
        uniqueCount: uniqueValues.size,
        totalCount: values.length,
        examples: getExampleValues(values)
      });
    }

    schemaMap[sheet.name] = {
      sheetName: sheet.name,
      rowCount: sheet.rowCount,
      columnCount: sheet.columnCount,
      columns
    };
  }

  return schemaMap;
}

function normalizeData(sheets, schemaMap) {
  const normalizedSheets = [];
  const transformations = [];

  for (const sheet of sheets) {
    const schema = schemaMap[sheet.name];
    if (!schema) continue;

    const normalizedRows = [];

    for (let rowIdx = 0; rowIdx < sheet.rows.length; rowIdx++) {
      const row = sheet.rows[rowIdx];
      const normalizedRow = {};

      for (const colSchema of schema.columns) {
        const originalValue = row[colSchema.original];
        const normalizedVal = normalizeValue(originalValue, colSchema.type);

        normalizedRow[colSchema.original] = normalizedVal;

        if (originalValue !== null && originalValue !== undefined && String(originalValue) !== String(normalizedVal) && normalizedVal !== null) {
          transformations.push({
            sheet: sheet.name,
            row: rowIdx + 1,
            column: colSchema.original,
            originalValue: String(originalValue),
            normalizedValue: String(normalizedVal),
            type: 'normalization'
          });
        }
      }

      normalizedRows.push(normalizedRow);
    }

    normalizedSheets.push({
      name: sheet.name,
      columns: sheet.columns,
      rowCount: normalizedRows.length,
      columnCount: sheet.columnCount,
      rows: normalizedRows
    });
  }

  return { normalizedSheets, transformations };
}

function detectMissingValues(sheets, schemaMap) {
  const issues = [];

  for (const sheet of sheets) {
    const schema = schemaMap[sheet.name];
    if (!schema) continue;

    for (const colSchema of schema.columns) {
      if (colSchema.nullCount > 0) {
        const missingRows = [];
        for (let i = 0; i < sheet.rows.length; i++) {
          if (isNullLike(sheet.rows[i][colSchema.original])) {
            missingRows.push(i + 1);
          }
        }

        issues.push({
          type: 'missing_value',
          severity: colSchema.nullCount > sheet.rowCount * 0.5 ? 'critical' : 'warning',
          sheet: sheet.name,
          column: colSchema.original,
          count: colSchema.nullCount,
          totalRows: sheet.rowCount,
          percentage: parseFloat(((colSchema.nullCount / sheet.rowCount) * 100).toFixed(2)),
          affectedRows: missingRows.slice(0, 50)
        });
      }
    }
  }

  return issues;
}

module.exports = { detectSchema, normalizeData, detectMissingValues };
