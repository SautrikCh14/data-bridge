const { normalizeColumnName } = require('../utils/normalizeValue');
const { isNullLike } = require('../utils/dataTypes');
const { findIdentifierColumns } = require('./duplicateDetector');

function findInconsistencies(sheets, schemaMap) {
  const inconsistencies = [];

  if (sheets.length < 2) return inconsistencies;

  const sheetIdColumns = sheets.map(sheet => {
    const schema = schemaMap[sheet.name];
    const idCols = findIdentifierColumns(sheet.columns, schema);
    return { sheet, idCols };
  });

  for (let i = 0; i < sheetIdColumns.length; i++) {
    for (let j = i + 1; j < sheetIdColumns.length; j++) {
      const sheetA = sheetIdColumns[i];
      const sheetB = sheetIdColumns[j];

      const matchingIdPairs = findMatchingColumns(sheetA.idCols, sheetB.idCols);

      for (const [colA, colB] of matchingIdPairs) {
        const entityMapA = buildEntityMap(sheetA.sheet, colA);
        const entityMapB = buildEntityMap(sheetB.sheet, colB);

        for (const [entityId, rowDataA] of entityMapA) {
          if (!entityMapB.has(entityId)) continue;
          const rowDataB = entityMapB.get(entityId);

          const commonFields = findCommonFields(
            sheetA.sheet.columns,
            sheetB.sheet.columns,
            colA,
            colB
          );

          for (const [fieldA, fieldB] of commonFields) {
            const valuesA = rowDataA.map(r => ({
              value: r.row[fieldA],
              row: r.idx
            })).filter(v => !isNullLike(v.value));

            const valuesB = rowDataB.map(r => ({
              value: r.row[fieldB],
              row: r.idx
            })).filter(v => !isNullLike(v.value));

            if (valuesA.length === 0 || valuesB.length === 0) continue;

            const uniqueA = [...new Set(valuesA.map(v => String(v.value).trim().toLowerCase()))];
            const uniqueB = [...new Set(valuesB.map(v => String(v.value).trim().toLowerCase()))];

            const conflicting = uniqueA.filter(a => !uniqueB.includes(a));
            if (conflicting.length > 0 && uniqueA.length > 0 && uniqueB.length > 0) {
              const allValues = [];
              for (const v of valuesA) {
                allValues.push({
                  value: v.value,
                  source: sheetA.sheet.sourceFile || sheetA.sheet.name,
                  sheet: sheetA.sheet.name,
                  row: v.row
                });
              }
              for (const v of valuesB) {
                allValues.push({
                  value: v.value,
                  source: sheetB.sheet.sourceFile || sheetB.sheet.name,
                  sheet: sheetB.sheet.name,
                  row: v.row
                });
              }

              inconsistencies.push({
                type: 'inconsistency',
                severity: 'warning',
                entity: entityId,
                identifierColumn: colA,
                field: fieldA,
                values: allValues
              });
            }
          }
        }
      }
    }
  }

  return inconsistencies;
}

function findMatchingColumns(colsA, colsB) {
  const pairs = [];
  for (const a of colsA) {
    for (const b of colsB) {
      if (normalizeColumnName(a) === normalizeColumnName(b)) {
        pairs.push([a, b]);
      }
    }
  }
  return pairs;
}

function buildEntityMap(sheet, idCol) {
  const map = new Map();
  for (let i = 0; i < sheet.rows.length; i++) {
    const id = sheet.rows[i][idCol];
    if (isNullLike(id)) continue;
    const normalized = String(id).trim().toLowerCase();
    if (!map.has(normalized)) {
      map.set(normalized, []);
    }
    map.get(normalized).push({ row: sheet.rows[i], idx: i + 1 });
  }
  return map;
}

function findCommonFields(colsA, colsB, excludeA, excludeB) {
  const pairs = [];
  for (const a of colsA) {
    if (a === excludeA) continue;
    for (const b of colsB) {
      if (b === excludeB) continue;
      if (normalizeColumnName(a) === normalizeColumnName(b)) {
        pairs.push([a, b]);
      }
    }
  }
  return pairs;
}

module.exports = { findInconsistencies };
