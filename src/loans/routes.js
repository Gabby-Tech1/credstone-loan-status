const express = require('express');
const { loadData } = require('./repository');
const { computeStatus } = require('./status');

const router = express.Router();

// The one required endpoint: repayment status for a single loan, or 404.
router.get('/loans/:id', (req, res) => {
  const { loansById, repaymentsByLoan, flagsByLoan } = loadData();
  const loan = loansById.get(req.params.id);

  if (!loan) {
    return res.status(404).json({ error: `Loan '${req.params.id}' not found` });
  }

  const status = computeStatus(
    loan,
    repaymentsByLoan[loan.loan_id] || [],
    flagsByLoan[loan.loan_id] || []
  );
  res.json(status);
});

module.exports = router;
