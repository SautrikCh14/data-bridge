const path = require('path');
const { parseCsvFile } = require('./csvParser');
const { parseExcelFile } = require('./excelParser');

function parseFile(filePath, originalName) {
  const ext = path.extname(originalName || filePath).toLowerCase();

  switch (ext) {
    case '.csv':
      return parseCsvFile(filePath);
    case '.xls':
    case '.xlsx':
      return parseExcelFile(filePath);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

function parseAllFiles(files) {
  const results = [];

  for (const file of files) {
    const parsed = parseFile(file.path, file.originalname);
    results.push({
      fileId: file.fileId,
      filename: file.originalname,
      fileType: path.extname(file.originalname).toLowerCase(),
      size: file.size,
      sheets: parsed.sheets.map(sheet => ({
        name: sheet.name,
        rowCount: sheet.rowCount,
        columnCount: sheet.columnCount,
        columns: sheet.columns,
        rows: sheet.rows
      }))
    });
  }

  return results;
}

module.exports = { parseFile, parseAllFiles };
