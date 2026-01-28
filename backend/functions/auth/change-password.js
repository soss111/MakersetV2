/**
 * PUT /api/auth/change-password
 * Change user password
 */

const { asyncHandler, successResponse, ValidationError, AuthenticationError } = require('../../lib/errors');
const { requireAuth } = require('../../lib/middleware');
const { comparePassword, hashPassword } = require('../../lib/auth');
const { query } = require('../../lib/db');
const logger = require('../../lib/logger');

async function handler(event, context) {
  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    };
  }

  const requestId = context.requestId;
  const user = requireAuth(event);

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    throw new ValidationError('Invalid JSON body');
  }

  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    throw new ValidationError('Current password and new password are required');
  }

  if (newPassword.length < 8) {
    throw new ValidationError('New password must be at least 8 characters');
  }

  // Get current password hash
  const result = await query(
    'SELECT password_hash FROM users WHERE user_id = $1',
    [user.userId]
  );

  if (result.rows.length === 0) {
    throw new AuthenticationError('User not found');
  }

  // Verify current password
  const passwordValid = await comparePassword(currentPassword, result.rows[0].password_hash);
  if (!passwordValid) {
    throw new AuthenticationError('Current password is incorrect');
  }

  // Hash new password
  const newPasswordHash = await hashPassword(newPassword);

  // Update password
  await query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
    [newPasswordHash, user.userId]
  );

  logger.info('Password changed', { userId: user.userId, requestId });

  return successResponse({ success: true });
}

exports.handler = asyncHandler(handler);
