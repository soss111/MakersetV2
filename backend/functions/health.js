/**
 * GET /api/health
 * Health check endpoint
 */

const { asyncHandler, successResponse } = require('../lib/errors');
const { getPool } = require('../lib/db');

async function handler(event, context) {
  const requestId = context.requestId;

  try {
    // Check database connection
    const pool = getPool();
    await pool.query('SELECT 1');

    return successResponse({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Service unavailable',
        database: 'disconnected',
      }),
    };
  }
}

exports.handler = asyncHandler(handler);
