const test = require('node:test');
const assert = require('node:assert');
const createApp = require('../src/app');

// Start the real app on an ephemeral port and make real HTTP requests to it.
test('GET /loans/:id', async (t) => {
  const server = createApp().listen(0);
  const { port } = server.address();
  const base = `http://localhost:${port}`;

  await t.test('returns 200 and the status for a known loan', async () => {
    const res = await fetch(`${base}/loans/L-1001`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.loan_id, 'L-1001');
    assert.equal(body.borrower_name, 'Ama Boateng');
    assert.ok(body.risk_band);
    assert.ok(Array.isArray(body.data_quality_flags));
  });

  await t.test('returns 404 for an unknown loan', async () => {
    const res = await fetch(`${base}/loans/L-9999`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.ok(body.error);
  });

  await new Promise((resolve) => server.close(resolve));
});
