/**
 * POST /api/auth/register
 * Register a new user
 */

const { asyncHandler, successResponse, ValidationError, ConflictError } = require('../../lib/errors');
const { hashPassword, generateToken } = require('../../lib/auth');
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
  logger.info('Register request', { requestId });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    throw new ValidationError('Invalid JSON body');
  }

  const { username, email, password, role = 'customer', first_name, last_name, company_name } = body;

  // Validation
  if (!username || !email || !password) {
    throw new ValidationError('Username, email, and password are required');
  }

  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }

  if (!['admin', 'provider', 'customer', 'production'].includes(role)) {
    throw new ValidationError('Invalid role');
  }

  // Check if user already exists
  const existingUser = await query(
    'SELECT user_id FROM users WHERE username = $1 OR email = $2',
    [username, email]
  );

  if (existingUser.rows.length > 0) {
    throw new ConflictError('Username or email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Generate provider code if provider
  let providerCode = null;
  if (role === 'provider') {
    providerCode = `PROV-${username.toUpperCase().substring(0, 10)}-${Date.now().toString(36)}`;
  }

  // Insert user
  const result = await query(
    `INSERT INTO users (username, email, password_hash, role, first_name, last_name, company_name, provider_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING user_id, username, email, role, first_name, last_name, company_name, provider_code, created_at`,
    [username, email, passwordHash, role, first_name || null, last_name || null, company_name || null, providerCode]
  );

  const user = result.rows[0];
  delete user.password_hash;

  // Generate token
  const token = generateToken(user);

  logger.info('User registered successfully', { userId: user.user_id, username, requestId });

  return successResponse({
    token,
    user,
  });
}

exports.handler = asyncHandler(handler);
