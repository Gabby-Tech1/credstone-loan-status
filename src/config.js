const path = require('path');
const { parseDate } = require('./lib/dates');

const TODAY = parseDate('2026-08-20');

const DATA_DIR = path.join(__dirname, '..', 'data');

module.exports = {
  TODAY,
  LOANS_CSV: path.join(DATA_DIR, 'loans.csv'),
  REPAYMENTS_CSV: path.join(DATA_DIR, 'repayments.csv'),
};
