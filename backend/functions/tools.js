/**
 * GET /api/tools - List tools (with pagination and filtering)
 * POST /api/tools - Create tool (admin only)
 */

const { asyncHandler, successResponse, ValidationError } = require('../lib/errors');
const { requireAdmin } = require('../lib/middleware');
const { query } = require('../lib/db');
const { parsePagination, createPaginationMeta, paginatedResponse } = require('../lib/pagination');
const logger = require('../lib/logger');

async function handler(event, context) {
  const requestId = context.requestId;

  if (event.httpMethod === 'GET') {
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
      whereConditions.push(`(tool_name ILIKE $${paramIndex} OR tool_number ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (active !== undefined) {
      whereConditions.push(`active = $${paramIndex++}`);
      params.push(active === 'true');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) as total FROM tools ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    params.push(pagination.limit, pagination.offset);
    const result = await query(
      `SELECT tool_id, tool_number, tool_name, category, stock_quantity, unit_cost, 
              safety_instructions, image_url, translations, active, created_at, updated_at
       FROM tools ${whereClause}
       ORDER BY tool_name ASC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const paginationMeta = createPaginationMeta(pagination.page, pagination.limit, total);

    logger.info('Tools listed', { count: result.rows.length, requestId });
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

    const { tool_number, tool_name, category, stock_quantity = 0, unit_cost = 0, safety_instructions, image_url, translations, active = true } = body;

    if (!tool_number || !tool_name) {
      throw new ValidationError('Tool number and name are required');
    }

    const existing = await query('SELECT tool_id FROM tools WHERE tool_number = $1', [tool_number]);
    if (existing.rows.length > 0) {
      throw new ValidationError('Tool number already exists');
    }

    const result = await query(
      `INSERT INTO tools (tool_number, tool_name, category, stock_quantity, unit_cost, safety_instructions, image_url, translations, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING tool_id, tool_number, tool_name, category, stock_quantity, unit_cost, safety_instructions, image_url, translations, active, created_at, updated_at`,
      [tool_number, tool_name, category || null, stock_quantity, unit_cost, safety_instructions || null, image_url || null, translations ? JSON.stringify(translations) : null, active]
    );

    logger.info('Tool created', { toolId: result.rows[0].tool_id, requestId });
    return successResponse(result.rows[0], 201);
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'Method not allowed' }),
  };
}

exports.handler = asyncHandler(handler);
