const test = require('node:test');
const assert = require('node:assert');
const { parseDate, formatDate, addMonths, daysBetween } = require('../src/lib/dates');

test('parseDate and formatDate round-trip', () => {
  assert.equal(formatDate(parseDate('2026-02-15')), '2026-02-15');
});

test('addMonths keeps the same day of month', () => {
  assert.equal(formatDate(addMonths(parseDate('2026-02-15'), 1)), '2026-03-15');
  assert.equal(formatDate(addMonths(parseDate('2026-02-15'), 6)), '2026-08-15');
});

test('addMonths clamps to the last day of a shorter month', () => {
  // 31 January + 1 month has no 31 February, so it clamps to 28 Feb (2026).
  assert.equal(formatDate(addMonths(parseDate('2026-01-31'), 1)), '2026-02-28');
});

test('addMonths rolls across year boundaries', () => {
  assert.equal(formatDate(addMonths(parseDate('2025-11-10'), 3)), '2026-02-10');
});

test('daysBetween counts whole days', () => {
  assert.equal(daysBetween(parseDate('2026-08-08'), parseDate('2026-08-20')), 12);
});
