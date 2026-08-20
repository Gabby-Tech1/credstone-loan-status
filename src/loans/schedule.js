const { addMonths } = require('../lib/dates');

// Turn a loan into its installment schedule. The first installment is due one month after disbursement, the second two months after, and so on for `term_months` months. Each installment is for the full monthly installment.
function buildSchedule(loan) {
  const schedule = [];
  for (let k = 1; k <= loan.term_months; k++) {
    schedule.push({
      number: k,
      due_date: addMonths(loan.disbursement_date, k),
      amount_due: loan.monthly_installment,
    });
  }
  return schedule;
}

module.exports = { buildSchedule };
