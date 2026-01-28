/**
 * GET /api/auth/profile - Get current user profile
 * PUT /api/auth/profile - Update current user profile
 */

const { asyncHandler, successResponse, ValidationError } = require('../../lib/errors');
const { requireAuth } = require('../../lib/middleware');
const { query } = require('../../lib/db');
const logger = require('../../lib/logger');

async function handler(event, context) {
  const requestId = context.requestId;
  const user = requireAuth(event);

  if (event.httpMethod === 'GET') {
    // Get profile
    const result = await query(
      `SELECT user_id, username, email, role, first_name, last_name, company_name, 
              provider_markup_percentage, provider_code, is_active, created_at, updated_at, last_login
       FROM users WHERE user_id = $1`,
      [user.userId]
    );

    if (result.rows.length === 0) {
      return successResponse(null, 404);
    }

    logger.info('Profile retrieved', { userId: user.userId, requestId });
    return successResponse(result.rows[0]);
  }

  if (event.httpMethod === 'PUT') {
    // Update profile
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (error) {
      throw new ValidationError('Invalid JSON body');
    }

    const { first_name, last_name, company_name, email } = body;

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (first_name !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(last_name);
    }
    if (company_name !== undefined) {
      updates.push(`company_name = $${paramIndex++}`);
      values.push(company_name);
    }
    if (email !== undefined) {
      // Check if email is already taken
      const emailCheck = await query(
        'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
        [email, user.userId]
      );
      if (emailCheck.rows.length > 0) {
        throw new ValidationError('Email already in use');
      }
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(user.userId);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $${paramIndex}
       RETURNING user_id, username, email, role, first_name, last_name, company_name, 
                  provider_markup_percentage, provider_code, is_active, created_at, updated_at, last_login`,
      values
    );

    logger.info('Profile updated', { userId: user.userId, requestId });
    return successResponse(result.rows[0]);
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'Method not allowed' }),
  };
}

exports.handler = asyncHandler(handler);
