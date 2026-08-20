const fs = require('fs');

// Minimal CSV reader for simple, comma-separated files with a header row.
//
// Assumption: no quoted fields and no commas/newlines inside a value. That is
// true for both files in this task, so a full CSV library would be overkill.
// A blank value (e.g. a missing amount) comes back as an empty string, which
// the cleaning step then decides what to do with.
function loadCsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  const header = lines[0].split(',').map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const row = {};
    header.forEach((key, i) => {
      row[key] = (values[i] ?? '').trim();
    });
    return row;
  });
}

module.exports = { loadCsv };
