/**
 * GET /api/settings - Get all settings (admin only)
 * Settings are cached in memory for performance
 */

const { asyncHandler, successResponse } = require('../lib/errors');
const { requireAdmin } = require('../lib/middleware');
const { query } = require('../lib/db');
const logger = require('../lib/logger');

// In-memory cache for settings
let settingsCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadSettings() {
  const now = Date.now();
  if (settingsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return settingsCache;
  }

  const result = await query('SELECT setting_key, setting_value, setting_type FROM system_settings');
  
  const settings = {};
  result.rows.forEach(row => {
    let value = row.setting_value;
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
    settings[row.setting_key] = value;
  });

  settingsCache = settings;
  cacheTimestamp = now;
  return settings;
}

async function handler(event, context) {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    };
  }

  const requestId = context.requestId;
  requireAdmin(event); // Admin only

  const settings = await loadSettings();
  
  logger.info('Settings retrieved', { requestId });
  return successResponse(settings);
}

exports.handler = asyncHandler(handler);
