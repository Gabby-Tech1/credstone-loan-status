const createApp = require('./app');

const PORT = process.env.PORT || 3000;

createApp().listen(PORT, () => {
  console.log(`Loan status service running on http://localhost:${PORT}`);
  console.log(`Try: http://localhost:${PORT}/loans/L-1001`);
});
