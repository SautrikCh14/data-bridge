const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{2}\/\d{2}\/\d{4}$/,
  /^\d{2}-\d{2}-\d{4}$/,
  /^\d{4}\/\d{2}\/\d{2}$/,
  /^\d{2}\.\d{2}\.\d{4}$/,
  /^\d{1,2}\s+\w+\s+\d{4}$/,
  /^\w+\s+\d{1,2},?\s+\d{4}$/
];
const BOOLEAN_VALUES = ['true', 'false', 'yes', 'no', '1', '0', 't', 'f', 'y', 'n'];
const NULL_VALUES = ['', 'null', 'nil', 'none', 'na', 'n/a', 'nan', 'undefined', '-', '--', '.'];

function isNullLike(value) {
  if (value === null || value === undefined) return true;
  return NULL_VALUES.includes(String(value).trim().toLowerCase());
}

function isEmail(value) {
  return EMAIL_REGEX.test(String(value).trim());
}

function isPhone(value) {
  const cleaned = String(value).trim();
  return PHONE_REGEX.test(cleaned) && cleaned.replace(/\D/g, '').length >= 7;
}

function isDate(value) {
  const str = String(value).trim();
  if (DATE_PATTERNS.some(p => p.test(str))) return true;
  const d = new Date(str);
  return !isNaN(d.getTime()) && str.length > 4;
}

function isBoolean(value) {
  return BOOLEAN_VALUES.includes(String(value).trim().toLowerCase());
}

function isInteger(value) {
  const str = String(value).trim();
  return /^-?\d+$/.test(str);
}

function isDecimal(value) {
  const str = String(value).trim();
  return /^-?\d+\.\d+$/.test(str);
}

function isNumeric(value) {
  const str = String(value).trim();
  return !isNaN(parseFloat(str)) && isFinite(str);
}

function isIdentifier(value) {
  const str = String(value).trim();
  return /^[A-Za-z]{0,5}\d{2,}$/.test(str) || /^[A-Z]{2,}-\d+$/.test(str);
}

function detectColumnType(values) {
  const nonNull = values.filter(v => !isNullLike(v));
  if (nonNull.length === 0) return 'string';

  const sample = nonNull.slice(0, Math.min(100, nonNull.length));
  const counts = {
    email: 0,
    phone: 0,
    date: 0,
    boolean: 0,
    integer: 0,
    decimal: 0,
    identifier: 0,
    string: 0
  };

  for (const val of sample) {
    const str = String(val).trim();
    if (isEmail(str)) counts.email++;
    else if (isBoolean(str)) counts.boolean++;
    else if (isInteger(str)) counts.integer++;
    else if (isDecimal(str)) counts.decimal++;
    else if (isPhone(str)) counts.phone++;
    else if (isDate(str)) counts.date++;
    else counts.string++;
  }

  const threshold = sample.length * 0.7;

  if (counts.email >= threshold) return 'email';
  if (counts.boolean >= threshold) return 'boolean';
  if (counts.integer >= threshold) {
    const uniqueRatio = new Set(sample.map(v => String(v).trim())).size / sample.length;
    if (uniqueRatio > 0.8 && isIdentifier(sample[0])) return 'identifier';
    return 'integer';
  }
  if (counts.decimal >= threshold) return 'decimal';
  if (counts.integer + counts.decimal >= threshold) return 'number';
  if (counts.phone >= threshold) return 'phone';
  if (counts.date >= threshold) return 'date';

  const identifierCount = nonNull.filter(v => isIdentifier(String(v).trim())).length;
  if (identifierCount >= threshold) return 'identifier';

  return 'string';
}

function getExampleValues(values, count = 5) {
  const nonNull = values.filter(v => !isNullLike(v));
  const unique = [...new Set(nonNull.map(v => String(v).trim()))];
  return unique.slice(0, count);
}

module.exports = {
  isNullLike,
  isEmail,
  isPhone,
  isDate,
  isBoolean,
  isInteger,
  isDecimal,
  isNumeric,
  isIdentifier,
  detectColumnType,
  getExampleValues,
  NULL_VALUES
};
