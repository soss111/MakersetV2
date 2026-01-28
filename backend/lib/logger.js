/**
 * Structured logging utility
 * Logs include requestId for tracing
 */

/**
 * Log with structured format
 */
function log(level, message, data = {}, requestId = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...(requestId && { requestId }),
    ...data,
  };

  const logString = JSON.stringify(logEntry);
  
  // Use appropriate console method
  switch (level.toLowerCase()) {
    case 'error':
      console.error(logString);
      break;
    case 'warn':
      console.warn(logString);
      break;
    case 'info':
      console.log(logString);
      break;
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.log(logString);
      }
      break;
    default:
      console.log(logString);
  }
}

const logger = {
  error: (message, data, requestId) => log('error', message, data, requestId),
  warn: (message, data, requestId) => log('warn', message, data, requestId),
  info: (message, data, requestId) => log('info', message, data, requestId),
  debug: (message, data, requestId) => log('debug', message, data, requestId),
};

module.exports = logger;
