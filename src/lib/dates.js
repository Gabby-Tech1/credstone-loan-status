// Small date helpers. Every date in this project is a calendar date (no time),
// so we parse everything to UTC midnight to avoid timezone drift.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// "2026-02-15" -> Date at UTC midnight.
function parseDate(str) {
  const [year, month, day] = str.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// Date -> "2026-02-15".
function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Add n whole months, keeping the same day-of-month. If the target month is
// shorter (e.g. 31 Jan + 1 month), clamp to the last day of that month.
function addMonths(date, n) {
  const day = date.getUTCDate();
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + n, day));
  if (result.getUTCDate() !== day) {
    result.setUTCDate(0); // roll back to the last day of the intended month
  }
  return result;
}

// Whole days from `from` to `to` (positive if `to` is later).
function daysBetween(from, to) {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

module.exports = { parseDate, formatDate, addMonths, daysBetween };
