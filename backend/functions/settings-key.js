/**
 * GET /api/settings/:key - Get single setting
 * PUT /api/settings/:key - Update setting (admin only)
 */

const { asyncHandler, successResponse, ValidationError, NotFoundError } = require('../lib/errors');
const { requireAdmin, optionalAuth } = require('../lib/middleware');
const { query } = require('../lib/db');
const logger = require('../lib/logger');

async function handler(event, context) {
  const requestId = context.requestId;
  
  // Extract key from path
  const pathParts = event.path.split('/');
  const key = pathParts[pathParts.length - 1];

  if (!key || key === 'settings') {
    throw new ValidationError('Setting key is required');
  }

  if (event.httpMethod === 'GET') {
    // Public endpoint - no auth required for reading settings
    const result = await query(
      'SELECT setting_key, setting_value, setting_type FROM system_settings WHERE setting_key = $1',
      [key]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Setting');
    }

    const row = result.rows[0];
    let value = row.setting_value;
    
    // Parse value based on type
    if (row.setting_type === 'number') {
      value = parseFloat(value);
    } else if (row.setting_type === 'boolean') {
      value = value === 'true';
    } else if (row.setting_type === 'json') {
      try {
        value = JSON.parse(value);
      } catch (e) {
        // Keep as string if invalid JSON
      }
    }

    return successResponse({
      setting: key,
      value,
      type: row.setting_type,
    });
  }

  if (event.httpMethod === 'PUT') {
    requireAdmin(event); // Admin only for updates

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (error) {
      throw new ValidationError('Invalid JSON body');
    }

    const { value, type, description } = body;

    if (value === undefined) {
      throw new ValidationError('Value is required');
    }

    const settingType = type || 'string';
    if (!['string', 'number', 'boolean', 'json'].includes(settingType)) {
      throw new ValidationError('Invalid setting type');
    }

    // Convert value to string for storage
    let stringValue = value;
    if (settingType === 'json') {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = String(value);
    }

    // Upsert setting
    const result = await query(
      `INSERT INTO system_settings (setting_key, setting_value, setting_type, description, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = $2, setting_type = $3, description = COALESCE($4, system_settings.description), updated_at = CURRENT_TIMESTAMP
       RETURNING setting_key, setting_value, setting_type, description`,
      [key, stringValue, settingType, description || null]
    );

    // Cache will be cleared on next access (settings.js uses in-memory cache with TTL)

    logger.info('Setting updated', { key, requestId });
    return successResponse(result.rows[0]);
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'Method not allowed' }),
  };
}

exports.handler = asyncHandler(handler);
