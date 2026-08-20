const { buildSchedule } = require('./schedule');
const { formatDate, daysBetween } = require('../lib/dates');
const { TODAY } = require('../config');

// Round to 2 decimals for money output.
const round2 = (n) => Math.round(n * 100) / 100;

// Work out the risk band. Order matters: CLOSED is checked before anything about days past due, exactly as the brief lists it.
function riskBand(totalRepaid, totalRepayable, daysPastDue) {
  if (totalRepaid >= totalRepayable) return 'CLOSED';
  if (daysPastDue === 0) return 'CURRENT';
  if (daysPastDue <= 30) return 'WATCH';
  if (daysPastDue <= 90) return 'ARREARS';
  return 'DEFAULT';
}

// Days past due: apply the borrower's total payments against the schedule in order, regardless of when they actually paid. The first installment we can't fully cover is the earliest one in arrears; days past due is measured from its due date. If that installment isn't due yet, the borrower is on track.
function daysPastDue(schedule, totalRepaid, today) {
  let remaining = totalRepaid;
  for (const installment of schedule) {
    if (remaining >= installment.amount_due) {
      remaining -= installment.amount_due;
      continue;
    }
    // This installment is not fully covered.
    if (installment.due_date > today) return 0; // not due yet -> on track
    return daysBetween(installment.due_date, today);
  }
  return 0; // every installment is covered
}

// Build the full status object for one loan.
function computeStatus(loan, repayments, flags = [], today = TODAY) {
  const schedule = buildSchedule(loan);

  const totalRepayable = round2(loan.monthly_installment * loan.term_months);

  // Total repaid is the sum of the cleaned payments. Reversals are already negative, so they subtract here automatically.
  const totalRepaid = round2(repayments.reduce((sum, r) => sum + r.amount, 0));

  // Expected to date = installment x (installments whose due date has passed), capped at the total repayable.
  const installmentsDue = schedule.filter((s) => s.due_date <= today).length;
  const expectedToDate = Math.min(
    round2(loan.monthly_installment * installmentsDue),
    totalRepayable
  );

  const outstanding = round2(totalRepayable - totalRepaid);
  const dpd = daysPastDue(schedule, totalRepaid, today);

  const paidDates = repayments.map((r) => r.paid_date).sort();
  const lastPaymentDate = paidDates.length ? paidDates[paidDates.length - 1] : null;

  return {
    loan_id: loan.loan_id,
    borrower_name: loan.borrower_name,
    principal: loan.principal,
    term_months: loan.term_months,
    monthly_installment: loan.monthly_installment,
    disbursement_date: formatDate(loan.disbursement_date),
    total_repayable: totalRepayable,
    total_repaid: totalRepaid,
    expected_to_date: expectedToDate,
    outstanding_balance: outstanding,
    installments_due: installmentsDue,
    days_past_due: dpd,
    risk_band: riskBand(totalRepaid, totalRepayable, dpd),
    last_payment_date: lastPaymentDate,
    data_quality_flags: flags,
  };
}

module.exports = { computeStatus, riskBand, daysPastDue };
