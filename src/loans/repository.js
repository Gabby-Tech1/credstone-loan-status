const { loadCsv } = require('../lib/csv');
const { parseDate } = require('../lib/dates');
const { cleanRepayments } = require('./cleaning');
const { LOANS_CSV, REPAYMENTS_CSV } = require('../config');

// Loads both CSV files, cleans the repayments, and organises everything in memory. The files are small and never change while the server runs, so we read them once and cache the result.
let cache;

function loadData() {
  if (cache) return cache;

  const loans = loadCsv(LOANS_CSV).map((row) => ({
    loan_id: row.loan_id,
    borrower_name: row.borrower_name,
    principal: Number(row.principal),
    term_months: Number(row.term_months),
    monthly_installment: Number(row.monthly_installment),
    disbursement_date: parseDate(row.disbursement_date),
  }));

  const { repayments, flagsByLoan } = cleanRepayments(loadCsv(REPAYMENTS_CSV));

  // Group repayments by loan so a lookup doesn't scan the whole list.
  const repaymentsByLoan = {};
  for (const payment of repayments) {
    (repaymentsByLoan[payment.loan_id] ||= []).push(payment);
  }

  const loansById = new Map(loans.map((loan) => [loan.loan_id, loan]));

  cache = { loans, loansById, repaymentsByLoan, flagsByLoan };
  return cache;
}

module.exports = { loadData };
