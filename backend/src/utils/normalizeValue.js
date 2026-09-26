const { isNullLike } = require('./dataTypes');

function normalizeColumnName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeStringValue(value) {
  if (isNullLike(value)) return null;
  return String(value)
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeDateValue(value) {
  if (isNullLike(value)) return null;
  const str = String(value).trim();
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  const dmyMatch = str.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const parsed = new Date(`${year}-${month}-${day}`);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  }
  return str;
}

function normalizeNumericValue(value) {
  if (isNullLike(value)) return null;
  const str = String(value).trim().replace(/,/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function normalizeBooleanValue(value) {
  if (isNullLike(value)) return null;
  const lower = String(value).trim().toLowerCase();
  if (['true', 'yes', '1', 't', 'y'].includes(lower)) return true;
  if (['false', 'no', '0', 'f', 'n'].includes(lower)) return false;
  return null;
}

function normalizeValue(value, type) {
  if (isNullLike(value)) return null;
  switch (type) {
    case 'string':
    case 'email':
    case 'phone':
    case 'identifier':
      return normalizeStringValue(value);
    case 'date':
      return normalizeDateValue(value);
    case 'integer':
    case 'decimal':
    case 'number':
      return normalizeNumericValue(value);
    case 'boolean':
      return normalizeBooleanValue(value);
    default:
      return normalizeStringValue(value);
  }
}

module.exports = {
  normalizeColumnName,
  normalizeStringValue,
  normalizeDateValue,
  normalizeNumericValue,
  normalizeBooleanValue,
  normalizeValue
};
