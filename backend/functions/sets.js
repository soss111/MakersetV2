/**
 * GET /api/sets - List sets (with pagination and filtering)
 * POST /api/sets - Create set (admin only)
 */

const { asyncHandler, successResponse, ValidationError } = require('../lib/errors');
const { requireAdmin, optionalAuth } = require('../lib/middleware');
const { query } = require('../lib/db');
const { parsePagination, createPaginationMeta, paginatedResponse } = require('../lib/pagination');
const logger = require('../lib/logger');

async function handler(event, context) {
  const requestId = context.requestId;
  const user = optionalAuth(event);

  if (event.httpMethod === 'GET') {
    const pagination = parsePagination(event.queryStringParameters);
    const { category, difficulty_level, search, active, admin_visible } = event.queryStringParameters || {};

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // Non-admin users only see admin_visible sets
    if (!user || user.role !== 'admin') {
      whereConditions.push(`admin_visible = true`);
    } else if (admin_visible !== undefined) {
      whereConditions.push(`admin_visible = $${paramIndex++}`);
      params.push(admin_visible === 'true');
    }

    if (category) {
      whereConditions.push(`category = $${paramIndex++}`);
      params.push(category);
    }

    if (difficulty_level) {
      whereConditions.push(`difficulty_level = $${paramIndex++}`);
      params.push(difficulty_level);
    }

    if (search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (active !== undefined) {
      whereConditions.push(`active = $${paramIndex++}`);
      params.push(active === 'true');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) as total FROM sets ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    params.push(pagination.limit, pagination.offset);
    const result = await query(
      `SELECT set_id, name, description, category, difficulty_level, age_min, age_max, duration, 
              base_price, video_url, learning_outcomes, active, admin_visible, created_at, updated_at
       FROM sets ${whereClause}
       ORDER BY name ASC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const paginationMeta = createPaginationMeta(pagination.page, pagination.limit, total);

    logger.info('Sets listed', { count: result.rows.length, requestId });
    return successResponse(paginatedResponse(result.rows, paginationMeta));
  }

  if (event.httpMethod === 'POST') {
    requireAdmin(event);

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (error) {
      throw new ValidationError('Invalid JSON body');
    }

    const { name, description, category, difficulty_level, age_min, age_max, duration, base_price = 0, video_url, learning_outcomes, active = true, admin_visible = true } = body;

    if (!name) {
      throw new ValidationError('Set name is required');
    }

    const result = await query(
      `INSERT INTO sets (name, description, category, difficulty_level, age_min, age_max, duration, base_price, video_url, learning_outcomes, active, admin_visible)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING set_id, name, description, category, difficulty_level, age_min, age_max, duration, base_price, video_url, learning_outcomes, active, admin_visible, created_at, updated_at`,
      [name, description || null, category || null, difficulty_level || null, age_min || null, age_max || null, duration || null, base_price, video_url || null, learning_outcomes || null, active, admin_visible]
    );

    logger.info('Set created', { setId: result.rows[0].set_id, requestId });
    return successResponse(result.rows[0], 201);
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'Method not allowed' }),
  };
}

exports.handler = asyncHandler(handler);
