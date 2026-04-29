/**
 * Global error handler — must be last middleware
 */
function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV === 'development';

  // Log with structured JSON for Cloud Logging
  const logEntry = {
    severity: 'ERROR',
    message: err.message,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    stack: isDev ? err.stack : undefined,
  };
  console.error(JSON.stringify(logEntry));

  // Postgres unique constraint
  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with that value already exists' });
  }

  // Postgres foreign key
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record does not exist' });
  }

  // Validation errors from Joi
  if (err.isJoi) {
    return res.status(400).json({ error: err.details[0].message });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.expose
    ? err.message
    : status < 500
    ? err.message
    : 'Internal server error';

  res.status(status).json({
    error: message,
    ...(isDev && { stack: err.stack }),
  });
}

/**
 * 404 handler
 */
function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}

module.exports = { errorHandler, notFound };
