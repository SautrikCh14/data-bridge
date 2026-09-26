const XLSX = require('xlsx');

function parseExcelFile(filePath) {
  const workbook = XLSX.readFile(filePath, { type: 'file', cellDates: true });
  const sheets = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false });
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    sheets.push({
      name: sheetName,
      rows,
      rowCount: rows.length,
      columnCount: columns.length,
      columns
    });
  }

  return { sheets };
}

module.exports = { parseExcelFile };
