/**
 * Error handling utilities
 * Ensures all errors return valid HTTP responses with JSON
 */

class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

class ConflictError extends AppError {
  constructor(message, details = null) {
    super(message, 409, details);
  }
}

/**
 * Wrap async handler to catch errors and return valid JSON responses
 */
function asyncHandler(fn) {
  return async (event, context) => {
    const requestId = context?.requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Add requestId to context for logging
      context.requestId = requestId;
      
      const result = await fn(event, context);
      
      // Ensure result has proper structure
      if (!result || typeof result !== 'object') {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
          },
          body: JSON.stringify({
            success: true,
            data: result,
          }),
        };
      }

      // Add requestId to headers if not present
      if (!result.headers) {
        result.headers = {};
      }
      result.headers['X-Request-ID'] = requestId;
      result.headers['Content-Type'] = result.headers['Content-Type'] || 'application/json';

      return result;
    } catch (error) {
      // Log error with requestId
      console.error(`[${requestId}] Error:`, {
        message: error.message,
        stack: error.stack,
        statusCode: error.statusCode || 500,
        details: error.details,
      });

      const statusCode = error.statusCode || 500;
      const message = error.message || 'Internal server error';
      
      // Don't expose internal error details in production
      const details = process.env.NODE_ENV === 'development' ? error.details : null;
      const stack = process.env.NODE_ENV === 'development' ? error.stack : undefined;

      return {
        statusCode,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        body: JSON.stringify({
          success: false,
          error: message,
          ...(details && { details }),
          ...(stack && { stack }),
        }),
      };
    }
  };
}

/**
 * Create standardized success response
 */
function successResponse(data, statusCode = 200, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      success: true,
      data,
    }),
  };
}

/**
 * Create standardized error response
 */
function errorResponse(error, requestId = null) {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  const details = process.env.NODE_ENV === 'development' ? error.details : null;

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...(requestId && { 'X-Request-ID': requestId }),
    },
    body: JSON.stringify({
      success: false,
      error: message,
      ...(details && { details }),
    }),
  };
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  asyncHandler,
  successResponse,
  errorResponse,
};
