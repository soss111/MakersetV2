/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */

const { asyncHandler, successResponse, ValidationError, AuthenticationError } = require('../../lib/errors');
const { comparePassword, generateToken } = require('../../lib/auth');
const { query } = require('../../lib/db');
const logger = require('../../lib/logger');

async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    };
  }

  const requestId = context.requestId;
  logger.info('Login request', { requestId });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    throw new ValidationError('Invalid JSON body');
  }

  const { username, password } = body;

  if (!username || !password) {
    throw new ValidationError('Username and password are required');
  }

  // Find user by username or email
  const result = await query(
    'SELECT user_id, username, email, password_hash, role, first_name, last_name, company_name, provider_code, is_active FROM users WHERE username = $1 OR email = $1',
    [username]
  );

  if (result.rows.length === 0) {
    throw new AuthenticationError('Invalid credentials');
  }

  const user = result.rows[0];

  if (!user.is_active) {
    throw new AuthenticationError('Account is inactive');
  }

  // Verify password
  const passwordValid = await comparePassword(password, user.password_hash);
  if (!passwordValid) {
    throw new AuthenticationError('Invalid credentials');
  }

  // Update last login
  await query(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
    [user.user_id]
  );

  // Remove sensitive fields
  delete user.password_hash;

  // Generate token
  const token = generateToken(user);

  logger.info('User logged in successfully', { userId: user.user_id, username: user.username, requestId });

  return successResponse({
    token,
    user,
  });
}

exports.handler = asyncHandler(handler);
