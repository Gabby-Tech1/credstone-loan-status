// This is where the "dirty on purpose" data gets handled. Every decision below
// is deliberate and explained in the README. The goal is to never silently
// produce a wrong number: anything we change leaves a flag on the loan so a
// credit officer can see we touched it.

// Human-readable flags attached to a loan when we alter its repayments.
const FLAGS = {
  DUPLICATE: 'duplicate_payment_removed',
  MISSING_AMOUNT: 'payment_with_missing_amount_excluded',
  UNPARSEABLE_AMOUNT: 'payment_with_unparseable_amount_excluded',
  REVERSAL: 'reversal_applied',
};

// Takes the raw repayment rows (strings from the CSV) and returns:
//   - repayments: cleaned rows with a numeric `amount`
//   - flagsByLoan: { [loan_id]: string[] } describing what we changed
function cleanRepayments(rawRows) {
  const flagsByLoan = {};
  const seen = new Set();
  const cleaned = [];

  const addFlag = (loanId, flag) => {
    (flagsByLoan[loanId] ||= new Set()).add(flag);
  };

  for (const row of rawRows) {
    const loanId = row.loan_id;
    const rawAmount = (row.amount ?? '').trim();

    // Decision: a blank amount means a payment was recorded but we don't know
    // how much. We refuse to invent a figure, so it is excluded from totals and
    // flagged. (Affects L-1011 / R-5092.)
    if (rawAmount === '') {
      addFlag(loanId, FLAGS.MISSING_AMOUNT);
      continue;
    }

    const amount = Number(rawAmount);
    if (Number.isNaN(amount)) {
      // Same principle for a value we can't read as a number.
      addFlag(loanId, FLAGS.UNPARSEABLE_AMOUNT);
      continue;
    }

    // Decision: a row identical in every field is a double entry, so we keep
    // the first and drop the rest. (Affects L-1008 / the repeated R-5062.)
    const key = `${row.repayment_id}|${loanId}|${rawAmount}|${row.paid_date}`;
    if (seen.has(key)) {
      addFlag(loanId, FLAGS.DUPLICATE);
      continue;
    }
    seen.add(key);

    // Decision: a negative amount is a reversal (a bounced or refunded
    // payment), not noise. We keep it so it nets against the borrower's total
    // rather than inflating it. (Affects L-1010 / R-5082.)
    if (amount < 0) {
      addFlag(loanId, FLAGS.REVERSAL);
    }

    cleaned.push({
      repayment_id: row.repayment_id,
      loan_id: loanId,
      amount,
      paid_date: row.paid_date,
    });
  }

  // Convert the Sets to plain arrays for a clean, JSON-friendly result.
  const flags = {};
  for (const [loanId, set] of Object.entries(flagsByLoan)) {
    flags[loanId] = [...set];
  }

  return { repayments: cleaned, flagsByLoan: flags };
}

module.exports = { cleanRepayments, FLAGS };
