const test = require('node:test');
const assert = require('node:assert');
const { cleanRepayments, FLAGS } = require('../src/loans/cleaning');

test('drops an identical duplicate row and flags it', () => {
  const rows = [
    { repayment_id: 'R-1', loan_id: 'L-1', amount: '1150.00', paid_date: '2026-02-03' },
    { repayment_id: 'R-1', loan_id: 'L-1', amount: '1150.00', paid_date: '2026-02-03' },
  ];
  const { repayments, flagsByLoan } = cleanRepayments(rows);
  assert.equal(repayments.length, 1);
  assert.deepEqual(flagsByLoan['L-1'], [FLAGS.DUPLICATE]);
});

test('excludes a blank amount and flags it', () => {
  const rows = [
    { repayment_id: 'R-2', loan_id: 'L-2', amount: '', paid_date: '2025-12-15' },
  ];
  const { repayments, flagsByLoan } = cleanRepayments(rows);
  assert.equal(repayments.length, 0);
  assert.deepEqual(flagsByLoan['L-2'], [FLAGS.MISSING_AMOUNT]);
});

test('keeps a negative amount as a reversal and flags it', () => {
  const rows = [
    { repayment_id: 'R-3', loan_id: 'L-3', amount: '1150.00', paid_date: '2026-07-09' },
    { repayment_id: 'R-4', loan_id: 'L-3', amount: '-1150.00', paid_date: '2026-07-12' },
  ];
  const { repayments, flagsByLoan } = cleanRepayments(rows);
  assert.equal(repayments.length, 2);
  const total = repayments.reduce((sum, r) => sum + r.amount, 0);
  assert.equal(total, 0); // the reversal nets the payment out
  assert.deepEqual(flagsByLoan['L-3'], [FLAGS.REVERSAL]);
});

test('leaves clean rows untouched with no flags', () => {
  const rows = [
    { repayment_id: 'R-5', loan_id: 'L-4', amount: '900.00', paid_date: '2026-02-05' },
  ];
  const { repayments, flagsByLoan } = cleanRepayments(rows);
  assert.equal(repayments.length, 1);
  assert.equal(repayments[0].amount, 900);
  assert.equal(flagsByLoan['L-4'], undefined);
});
