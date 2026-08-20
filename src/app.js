const express = require('express');
const loansRouter = require('./loans/routes');

// Builds the Express app without starting a server. Exporting it this way lets
// the tests exercise the real routes without binding to a fixed port.
function createApp() {
  const app = express();
  app.use(loansRouter);
  return app;
}

module.exports = createApp;
