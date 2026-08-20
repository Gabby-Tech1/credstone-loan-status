const path = require('path');
const { parseDate } = require('./lib/dates');

// The brief says to treat 20 August 2026 as "today", and that hardcoding it is
// fine. Keeping it in one named place makes it obvious and easy to change.
const TODAY = parseDate('2026-08-20');

const DATA_DIR = path.join(__dirname, '..', 'data');

module.exports = {
  TODAY,
  LOANS_CSV: path.join(DATA_DIR, 'loans.csv'),
  REPAYMENTS_CSV: path.join(DATA_DIR, 'repayments.csv'),
};
