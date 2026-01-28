/**
 * GET /api/parts - List parts (with pagination and filtering)
 * POST /api/parts - Create part (admin only)
 */

const { asyncHandler, successResponse, ValidationError } = require('../lib/errors');
const { requireAdmin, optionalAuth } = require('../lib/middleware');
const { query } = require('../lib/db');
const { parsePagination, createPaginationMeta, paginatedResponse } = require('../lib/pagination');
const logger = require('../lib/logger');

async function handler(event, context) {
  const requestId = context.requestId;

  if (event.httpMethod === 'GET') {
    // List parts
    const pagination = parsePagination(event.queryStringParameters);
    const { category, search, active } = event.queryStringParameters || {};

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (category) {
      whereConditions.push(`category = $${paramIndex++}`);
      params.push(category);
    }

    if (search) {
      whereConditions.push(`(part_name ILIKE $${paramIndex} OR part_number ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (active !== undefined) {
      whereConditions.push(`active = $${paramIndex++}`);
      params.push(active === 'true');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM parts ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results
    params.push(pagination.limit, pagination.offset);
    const result = await query(
      `SELECT part_id, part_number, part_name, category, stock_quantity, unit_cost, 
              safety_notes, image_url, translations, active, created_at, updated_at
       FROM parts ${whereClause}
       ORDER BY part_name ASC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const paginationMeta = createPaginationMeta(pagination.page, pagination.limit, total);

    logger.info('Parts listed', { count: result.rows.length, requestId });
    return successResponse(paginatedResponse(result.rows, paginationMeta));
  }

  if (event.httpMethod === 'POST') {
    requireAdmin(event); // Admin only

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (error) {
      throw new ValidationError('Invalid JSON body');
    }

    const { part_number, part_name, category, stock_quantity = 0, unit_cost = 0, safety_notes, image_url, translations, active = true } = body;

    if (!part_number || !part_name) {
      throw new ValidationError('Part number and name are required');
    }

    // Check if part_number already exists
    const existing = await query('SELECT part_id FROM parts WHERE part_number = $1', [part_number]);
    if (existing.rows.length > 0) {
      throw new ValidationError('Part number already exists');
    }

    const result = await query(
      `INSERT INTO parts (part_number, part_name, category, stock_quantity, unit_cost, safety_notes, image_url, translations, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING part_id, part_number, part_name, category, stock_quantity, unit_cost, safety_notes, image_url, translations, active, created_at, updated_at`,
      [part_number, part_name, category || null, stock_quantity, unit_cost, safety_notes || null, image_url || null, translations ? JSON.stringify(translations) : null, active]
    );

    logger.info('Part created', { partId: result.rows[0].part_id, requestId });
    return successResponse(result.rows[0], 201);
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'Method not allowed' }),
  };
}

exports.handler = asyncHandler(handler);
