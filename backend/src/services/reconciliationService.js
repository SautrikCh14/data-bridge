const { normalizeColumnName } = require('../utils/normalizeValue');
const { isNullLike } = require('../utils/dataTypes');

function findRelationships(sheets, schemaMap) {
  const relationships = [];

  if (sheets.length < 2) return relationships;

  for (let i = 0; i < sheets.length; i++) {
    for (let j = i + 1; j < sheets.length; j++) {
      const sheetA = sheets[i];
      const sheetB = sheets[j];
      const schemaA = schemaMap[sheetA.name];
      const schemaB = schemaMap[sheetB.name];

      for (const colA of sheetA.columns) {
        const normalizedA = normalizeColumnName(colA);
        const colSchemaA = schemaA ? schemaA.columns.find(c => c.original === colA) : null;

        for (const colB of sheetB.columns) {
          const normalizedB = normalizeColumnName(colB);
          const colSchemaB = schemaB ? schemaB.columns.find(c => c.original === colB) : null;

          if (normalizedA !== normalizedB) continue;
          if (!colSchemaA || !colSchemaB) continue;

          const valuesA = new Set();
          for (const row of sheetA.rows) {
            const val = row[colA];
            if (!isNullLike(val)) valuesA.add(String(val).trim().toLowerCase());
          }

          const valuesB = new Set();
          for (const row of sheetB.rows) {
            const val = row[colB];
            if (!isNullLike(val)) valuesB.add(String(val).trim().toLowerCase());
          }

          let matchCount = 0;
          for (const val of valuesA) {
            if (valuesB.has(val)) matchCount++;
          }

          if (matchCount === 0) continue;

          const overlapA = valuesA.size > 0 ? matchCount / valuesA.size : 0;
          const overlapB = valuesB.size > 0 ? matchCount / valuesB.size : 0;
          const confidence = Math.max(overlapA, overlapB);

          if (confidence < 0.1) continue;

          relationships.push({
            datasetA: sheetA.sourceFile || sheetA.name,
            sheetA: sheetA.name,
            columnA: colA,
            datasetB: sheetB.sourceFile || sheetB.name,
            sheetB: sheetB.name,
            columnB: colB,
            matchedRecords: matchCount,
            uniqueInA: valuesA.size,
            uniqueInB: valuesB.size,
            unmatchedInA: valuesA.size - matchCount,
            unmatchedInB: valuesB.size - matchCount,
            confidence: parseFloat(confidence.toFixed(4)),
            confidenceLevel: confidence >= 0.7 ? 'high' : confidence >= 0.4 ? 'medium' : 'low'
          });
        }
      }
    }
  }

  relationships.sort((a, b) => b.confidence - a.confidence);
  return relationships;
}

function reconcileDatasets(sheets, relationships) {
  const reconciliations = [];
  const highConfidenceRels = relationships.filter(r => r.confidenceLevel === 'high');

  for (const rel of highConfidenceRels) {
    const sheetA = sheets.find(s => s.name === rel.sheetA);
    const sheetB = sheets.find(s => s.name === rel.sheetB);
    if (!sheetA || !sheetB) continue;

    const indexB = new Map();
    for (let i = 0; i < sheetB.rows.length; i++) {
      const val = sheetB.rows[i][rel.columnB];
      if (!isNullLike(val)) {
        const key = String(val).trim().toLowerCase();
        if (!indexB.has(key)) indexB.set(key, []);
        indexB.get(key).push(i);
      }
    }

    let matched = 0;
    let unmatched = 0;
    const unmatchedKeys = [];

    for (const row of sheetA.rows) {
      const val = row[rel.columnA];
      if (isNullLike(val)) continue;
      const key = String(val).trim().toLowerCase();
      if (indexB.has(key)) {
        matched++;
      } else {
        unmatched++;
        if (unmatchedKeys.length < 20) unmatchedKeys.push(String(val).trim());
      }
    }

    reconciliations.push({
      relationship: rel,
      matched,
      unmatched,
      unmatchedSampleKeys: unmatchedKeys,
      decision: 'auto_matched',
      reason: `High confidence relationship (${(rel.confidence * 100).toFixed(1)}%) between ${rel.columnA} and ${rel.columnB}`
    });
  }

  return reconciliations;
}

module.exports = { findRelationships, reconcileDatasets };
