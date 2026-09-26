const fs = require('fs');
const { parse } = require('csv-parse/sync');
const path = require('path');

function parseCsvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const bom = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;

  const records = parse(bom, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    cast: false
  });

  const columns = records.length > 0 ? Object.keys(records[0]) : [];

  return {
    sheets: [
      {
        name: path.basename(filePath, path.extname(filePath)),
        rows: records,
        rowCount: records.length,
        columnCount: columns.length,
        columns
      }
    ]
  };
}

module.exports = { parseCsvFile };
