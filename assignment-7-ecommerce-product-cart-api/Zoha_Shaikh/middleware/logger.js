/**
 * Custom request logger middleware
 * Logs [ISO timestamp] METHOD URL STATUS - Duration ms upon response finish.
 */
function logger(req, res, next) {
  const start = process.hrtime();
  const startTimeISO = new Date().toISOString();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationInMs = ((diff[0] * 1e9 + diff[1]) / 1e6).toFixed(2);
    console.log(`[${startTimeISO}] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} - ${durationInMs}ms`);
  });

  next();
}

module.exports = logger;
