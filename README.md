# Credstone — Loan Repayment Status Service

A small Node.js service that reads `loans.csv` and `repayments.csv` and reports
the repayment status of each loan. Built for the Credstone take-home.

It exposes the one required endpoint:

```
GET /loans/{loan_id}
```

which returns the loan's status as JSON, or `404` if the loan doesn't exist.

"Today" is treated as **20 August 2026** throughout, as the brief allows.

---

## How to run it

These steps assume a completely fresh machine with nothing installed.

1. **Install Node.js (version 18.13 or newer).**
   Download the LTS installer from <https://nodejs.org> and run it. To confirm it
   worked, open a new terminal and run:

   ```bash
   node --version
   ```

   You should see something like `v20.x.x`.

2. **Open a terminal in this project folder** (the folder containing this README).

3. **Install the one dependency (Express):**

   ```bash
   npm install
   ```

4. **Start the service:**

   ```bash
   npm start
   ```

   You should see `Loan status service running on http://localhost:3000`.

5. **Ask it about a loan.** In a browser, visit
   <http://localhost:3000/loans/L-1001>, or from another terminal:

   ```bash
   curl http://localhost:3000/loans/L-1010
   ```

To stop the service, press `Ctrl+C`.

### Running the tests

```bash
npm test
```

This runs the test suite using Node's built-in test runner (no extra tools to
install). It covers the date maths, the dirty-data handling, the core
calculations, and the endpoint itself.

---

## Example response

`GET /loans/L-1010`:

```json
{
  "loan_id": "L-1010",
  "borrower_name": "Abena Frimpong",
  "principal": 4200,
  "term_months": 4,
  "monthly_installment": 1150,
  "disbursement_date": "2026-05-08",
  "total_repayable": 4600,
  "total_repaid": 2300,
  "expected_to_date": 3450,
  "outstanding_balance": 2300,
  "installments_due": 3,
  "days_past_due": 12,
  "risk_band": "WATCH",
  "last_payment_date": "2026-08-10",
  "data_quality_flags": ["reversal_applied"]
}
```

The brief asks for at least the loan id, borrower name, total repaid, outstanding
balance, days past due, and risk band. I added the fields a credit officer would
reasonably want next to those numbers: the total repayable, what was expected by
today, how many installments have fallen due, the last payment date, and — most
importantly — a `data_quality_flags` array that says whenever the service had to
alter a loan's payments to produce the figures.

---

## How the numbers are worked out

Straight from the brief's rules:

- **Schedule.** Installment *k* is due *k* months after disbursement, for
  `term_months` installments. (15 Feb → 15 Mar, 15 Apr, …)
- **Total repayable** = `monthly_installment × term_months`.
- **Expected to date** = `monthly_installment × (installments whose due date has
  passed)`, capped at the total repayable.
- **Outstanding balance** = total repayable − everything repaid.
- **Days past due.** The borrower's total payments are applied against the
  schedule in order, regardless of *when* they paid. The earliest installment
  they can't fully cover is the one in arrears, and days past due is measured
  from that installment's due date to 20 Aug 2026. Someone who has paid at least
  the expected amount is 0 days past due.
- **Risk band** (checked in this order): `CLOSED` if total repaid covers the
  total repayable, else `CURRENT` (0 dpd), `WATCH` (1–30), `ARREARS` (31–90),
  `DEFAULT` (>90).

---

## The dirty data — what I found and what I did

I went through `repayments.csv` row by row. Here is every problem I found and the
decision I made about it. The guiding principle throughout: **never silently
invent or discard a financial figure, and always leave a flag on the loan so the
change is visible** (via `data_quality_flags`).

| # | What's wrong | Where | What I did | Why |
|---|---|---|---|---|
| 1 | An **exact duplicate row** — `R-5062` appears twice, identical in every field | L-1008 | Kept the first, dropped the duplicate. Flag: `duplicate_payment_removed` | A row identical in id, loan, amount and date is a double entry, not two real payments. Counting it twice would understate how far behind the borrower is. |
| 2 | A **negative amount**, `-1150.00` | L-1010 (`R-5082`) | Kept it and let it net against the total. Flag: `reversal_applied` | A negative payment is most plausibly a reversal (a bounced or refunded instalment), which is a real event. See the note below — this is the one call that changes a risk band. |
| 3 | A **blank amount** | L-1011 (`R-5092`) | Excluded it from the totals. Flag: `payment_with_missing_amount_excluded` | A payment was recorded but the amount is unknown. I won't guess a number; excluding it is honest, and the flag tells the officer a payment is unaccounted for. |
| 4 | A loan with **no repayments at all** | L-1006 | Handled normally — it simply comes out as deep `DEFAULT` | Not strictly "dirty", but an edge case the service must not crash on. It correctly reports 0 repaid and 130 days past due. |
| 5 | An **overpayment** — the final payment is `1500` where the instalment is `950` | L-1007 (`R-5054`) | Trusted it as a real (larger, final/settlement) payment | A single larger closing payment is normal in lending. It makes the loan `CLOSED` with a small credit balance (outstanding shows `-550`, i.e. the borrower is 550 ahead). I chose to trust the data rather than assume a typo. |

I also checked for two other classes of problem and found **none**: no payments
dated after "today" (20 Aug 2026), and no malformed dates.

### The negative amount — the decision that actually matters

This is the row where reasonable people differ, so it's worth being explicit.

`R-5082 = -1150.00` on L-1010 can be read two ways:

- **As a reversal (what I chose):** it cancels a matching `+1150` payment, so the
  borrower's total drops to 2300. That leaves them one instalment short, **12
  days past due → `WATCH`**.
- **As a bad row to delete:** if you simply drop it, the total is 3450, the
  borrower looks fully up to date, and the loan is **`CURRENT`**.

I went with the reversal reading because it's the more conservative, standard
accounting interpretation, and because deleting a value outright is exactly the
"silently produce a wrong number" trap the brief warns about. If Credstone's
domain says these negatives are data-entry noise rather than reversals, flipping
the decision is a one-line change in `src/loans/cleaning.js` — and the
`reversal_applied` flag means no one is misled in the meantime.

### All twelve loans at a glance

For reference, here is what the service reports for the whole file:

| Loan | Borrower | Repaid | Outstanding | Days past due | Band | Flag |
|---|---|---|---|---|---|---|
| L-1001 | Ama Boateng | 6600 | 2200 | 0 | CURRENT | |
| L-1002 | Kofi Mensah | 9200 | 1150 | 10 | WATCH | |
| L-1003 | Yaw Owusu | 3600 | 1800 | 76 | ARREARS | |
| L-1004 | Akosua Darko | 3450 | 10350 | 304 | DEFAULT | |
| L-1005 | Kwabena Asare | 3300 | 0 | 0 | CLOSED | |
| L-1006 | Efua Nyarko | 0 | 8400 | 130 | DEFAULT | (no payments) |
| L-1007 | Kojo Adjei | 5300 | -550 | 0 | CLOSED | (overpaid) |
| L-1008 | Adwoa Sarpong | 5750 | 3450 | 78 | ARREARS | duplicate removed |
| L-1009 | Kwame Antwi | 5000 | 2500 | 59 | ARREARS | |
| L-1010 | Abena Frimpong | 2300 | 2300 | 12 | WATCH | reversal applied |
| L-1011 | Yaa Asantewaa | 5600 | 5600 | 158 | DEFAULT | blank amount excluded |
| L-1012 | Fiifi Cudjoe | 1000 | 5000 | 0 | CURRENT | |

---

## Project structure

```
.
├── data/                     # the two CSV files, shipped with the repo
├── src/
│   ├── server.js             # starts the HTTP server
│   ├── app.js                # builds the Express app (exported for tests)
│   ├── config.js             # the hardcoded "today" and file paths
│   ├── lib/
│   │   ├── csv.js            # minimal CSV reader
│   │   └── dates.js          # addMonths / daysBetween / parse / format
│   └── loans/
│       ├── cleaning.js       # the dirty-data decisions (heart of the task)
│       ├── schedule.js       # builds the installment schedule
│       ├── status.js         # applies the rules -> the status numbers
│       ├── repository.js     # loads + cleans the CSVs into memory once
│       └── routes.js         # GET /loans/:id
└── test/                     # tests mirroring the src files
```

---

## What I'd do differently with more time, and what's weak

- **Money is handled as floating-point numbers.** The data is clean two-decimal
  currency and I round on output, so there is no visible error here, but for real
  money I'd store everything in integer minor units (pesewas) to remove any risk
  of rounding drift. This is the weakest part of the current code.
- **The CSV reader is deliberately minimal.** It assumes no quoted fields or
  commas-inside-values, which holds for this dataset but would break on messier
  files. With more time I'd swap in a proper CSV library — the reader is isolated
  in one small file precisely so that swap is trivial.
- **`L-1007` reports a negative outstanding balance** (`-550`) because the
  borrower overpaid. I chose to let that show rather than clamp it to zero, since
  a credit balance is real information — but a product team might prefer a
  separate "credit balance" field instead. It's a judgement call I'd want to
  confirm.
- **The data is read once at startup and cached.** That's the right call for
  static files, but it means the service must be restarted to pick up new data.
  A real version would reload on change or read from a database.
- **No structured logging or config beyond a port env var.** For a production
  service I'd add request logging and load "today" from configuration rather than
  hardcoding it — the hardcoding is only because the brief asked for it.
- **More edge-case tests.** I test the rules and each dirty row, but with more
  time I'd add cases around month-end clamping (e.g. loans disbursed on the 31st)
  and partially-covered installments.

If anything here is unclear or you'd weigh a decision differently, I'm happy to
walk through the reasoning.
