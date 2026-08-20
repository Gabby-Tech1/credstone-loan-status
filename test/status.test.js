const test = require('node:test');
const assert = require('node:assert');
const { parseDate } = require('../src/lib/dates');
const { computeStatus } = require('../src/loans/status');
const { loadData } = require('../src/loans/repository');

const TODAY = parseDate('2026-08-20');
const payment = (amount, paid_date) => ({ amount, paid_date });

// --- Unit tests on the rules, using a synthetic loan ---------------------

// 8-month loan disbursed 15 Feb 2026, 1100/month. As of 20 Aug 2026 six installments are due (Mar..Aug).
const sampleLoan = {
  loan_id: 'L-TEST',
  borrower_name: 'Test Borrower',
  principal: 8000,
  term_months: 8,
  monthly_installment: 1100,
  disbursement_date: parseDate('2026-02-15'),
};

test('a borrower paid up to schedule is CURRENT with 0 days past due', () => {
  const payments = Array.from({ length: 6 }, () => payment(1100, '2026-03-15'));
  const s = computeStatus(sampleLoan, payments, [], TODAY);
  assert.equal(s.total_repayable, 8800);
  assert.equal(s.total_repaid, 6600);
  assert.equal(s.expected_to_date, 6600);
  assert.equal(s.outstanding_balance, 2200);
  assert.equal(s.days_past_due, 0);
  assert.equal(s.risk_band, 'CURRENT');
});

test('a missed installment produces days past due from its due date', () => {
  // Only 5 of the 6 due installments paid; installment 6 was due 15 Aug.
  const payments = Array.from({ length: 5 }, () => payment(1100, '2026-03-15'));
  const s = computeStatus(sampleLoan, payments, [], TODAY);
  assert.equal(s.days_past_due, 5); // 15 Aug -> 20 Aug
  assert.equal(s.risk_band, 'WATCH');
});

test('fully repaid loan is CLOSED regardless of timing', () => {
  const payments = Array.from({ length: 8 }, () => payment(1100, '2026-03-15'));
  const s = computeStatus(sampleLoan, payments, [], TODAY);
  assert.equal(s.risk_band, 'CLOSED');
});

// --- Integration checks against the real (dirty) dataset -----------------

function statusFor(id) {
  const { loansById, repaymentsByLoan, flagsByLoan } = loadData();
  return computeStatus(loansById.get(id), repaymentsByLoan[id] || [], flagsByLoan[id] || []);
}

test('L-1006 with no repayments is deep in DEFAULT', () => {
  const s = statusFor('L-1006');
  assert.equal(s.total_repaid, 0);
  assert.equal(s.outstanding_balance, 8400);
  assert.equal(s.days_past_due, 130);
  assert.equal(s.risk_band, 'DEFAULT');
  assert.equal(s.last_payment_date, null);
});

test('L-1008 counts the duplicate payment only once', () => {
  const s = statusFor('L-1008');
  assert.equal(s.total_repaid, 5750); // 5 unique payments, not 6
  assert.equal(s.days_past_due, 78);
  assert.equal(s.risk_band, 'ARREARS');
  assert.deepEqual(s.data_quality_flags, ['duplicate_payment_removed']);
});

test('L-1010 nets the reversal out of the total', () => {
  const s = statusFor('L-1010');
  assert.equal(s.total_repaid, 2300); // 1150 + 1150 - 1150 + 1150
  assert.equal(s.days_past_due, 12);
  assert.equal(s.risk_band, 'WATCH');
  assert.deepEqual(s.data_quality_flags, ['reversal_applied']);
});

test('L-1011 excludes the blank-amount payment', () => {
  const s = statusFor('L-1011');
  assert.equal(s.total_repaid, 5600); // 5 payments of 1120, blank ignored
  assert.equal(s.risk_band, 'DEFAULT');
  assert.deepEqual(s.data_quality_flags, ['payment_with_missing_amount_excluded']);
});
