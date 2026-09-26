const { normalizeColumnName } = require('../utils/normalizeValue');
const { isNullLike } = require('../utils/dataTypes');

function buildRowSignature(row, columns) {
  return columns
    .map(col => {
      const val = row[col];
      return isNullLike(val) ? '' : String(val).trim().toLowerCase();
    })
    .join('|');
}

function findExactDuplicates(sheet) {
  const duplicates = [];
  const signatureMap = new Map();

  for (let i = 0; i < sheet.rows.length; i++) {
    const sig = buildRowSignature(sheet.rows[i], sheet.columns);
    if (signatureMap.has(sig)) {
      signatureMap.get(sig).push(i + 1);
    } else {
      signatureMap.set(sig, [i + 1]);
    }
  }

  for (const [sig, rows] of signatureMap) {
    if (rows.length > 1) {
      duplicates.push({
        type: 'duplicate',
        subType: 'exact',
        severity: 'warning',
        sheet: sheet.name,
        rows: rows,
        count: rows.length,
        reason: 'Exact duplicate rows (all normalized values match)'
      });
    }
  }

  return duplicates;
}

function findIdentifierColumns(columns, schema) {
  const identifierPatterns = [
    'id', 'identifier', 'code', 'number', 'no', 'num',
    'key', 'ref', 'reference'
  ];

  const candidateColumns = [];

  for (const col of columns) {
    const normalized = normalizeColumnName(col);
    const colSchema = schema ? schema.columns.find(c => c.original === col) : null;

    const isIdByName = identifierPatterns.some(p =>
      normalized.includes(p) || normalized.endsWith(`_${p}`)
    );

    const isIdByType = colSchema && (colSchema.type === 'identifier' || colSchema.type === 'integer');
    const isHighUnique = colSchema && colSchema.uniqueCount > colSchema.totalCount * 0.8;

    if (isIdByName || (isIdByType && isHighUnique)) {
      candidateColumns.push(col);
    }
  }

  return candidateColumns;
}

function findNameColumns(columns) {
  const namePatterns = ['name', 'full_name', 'first_name', 'last_name', 'person'];
  return columns.filter(col => {
    const normalized = normalizeColumnName(col);
    return namePatterns.some(p => normalized.includes(p));
  });
}

function findContactColumns(columns) {
  const contactPatterns = ['email', 'phone', 'mobile', 'contact', 'address'];
  return columns.filter(col => {
    const normalized = normalizeColumnName(col);
    return contactPatterns.some(p => normalized.includes(p));
  });
}

function findPotentialDuplicates(sheet, schema) {
  const potentialDuplicates = [];
  const idColumns = findIdentifierColumns(sheet.columns, schema);
  const nameColumns = findNameColumns(sheet.columns);
  const contactColumns = findContactColumns(sheet.columns);

  const checkColumns = [...idColumns, ...nameColumns, ...contactColumns];
  if (checkColumns.length === 0) return potentialDuplicates;

  for (const col of checkColumns) {
    const valueMap = new Map();

    for (let i = 0; i < sheet.rows.length; i++) {
      const val = sheet.rows[i][col];
      if (isNullLike(val)) continue;
      const normalized = String(val).trim().toLowerCase();
      if (normalized.length === 0) continue;

      if (valueMap.has(normalized)) {
        valueMap.get(normalized).push(i + 1);
      } else {
        valueMap.set(normalized, [i + 1]);
      }
    }

    for (const [value, rows] of valueMap) {
      if (rows.length > 1) {
        const isExact = idColumns.includes(col);
        if (!isExact || rows.length > 1) {
          potentialDuplicates.push({
            type: 'duplicate',
            subType: idColumns.includes(col) ? 'identifier' : 'potential',
            severity: idColumns.includes(col) ? 'warning' : 'info',
            sheet: sheet.name,
            column: col,
            value,
            rows: rows,
            count: rows.length,
            reason: `Same normalized ${normalizeColumnName(col)} value`
          });
        }
      }
    }
  }

  return potentialDuplicates;
}

function detectDuplicates(sheets, schemaMap) {
  const allDuplicates = [];

  for (const sheet of sheets) {
    const schema = schemaMap[sheet.name];
    const exactDups = findExactDuplicates(sheet);
    const potentialDups = findPotentialDuplicates(sheet, schema);

    for (const dup of exactDups) {
      allDuplicates.push({ ...dup, source: { file: sheet.sourceFile || sheet.name } });
    }
    for (const dup of potentialDups) {
      allDuplicates.push({ ...dup, source: { file: sheet.sourceFile || sheet.name } });
    }
  }

  return allDuplicates;
}

module.exports = {
  detectDuplicates,
  findExactDuplicates,
  findPotentialDuplicates,
  findIdentifierColumns,
  findNameColumns,
  findContactColumns
};
