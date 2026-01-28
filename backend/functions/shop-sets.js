/**
 * GET /api/shop-sets - Customer-facing provider sets listing
 * Public endpoint - no auth required
 */

const { asyncHandler, successResponse, ValidationError } = require('../lib/errors');
const { query } = require('../lib/db');
const { parsePagination, createPaginationMeta, paginatedResponse } = require('../lib/pagination');
const logger = require('../lib/logger');

async function handler(event, context) {
  const requestId = context.requestId;

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    };
  }

  const pagination = parsePagination(event.queryStringParameters);
  const { provider_id, category, difficulty_level, search, min_price, max_price } = event.queryStringParameters || {};

  let whereConditions = [
    'ps.is_active = true',
    'ps.provider_visible = true',
    'ps.admin_visible = true',
    'ps.admin_status = \'approved\'',
    's.active = true',
  ];
  let params = [];
  let paramIndex = 1;

  if (provider_id) {
    whereConditions.push(`ps.provider_id = $${paramIndex++}`);
    params.push(provider_id);
  }

  if (category) {
    whereConditions.push(`s.category = $${paramIndex++}`);
    params.push(category);
  }

  if (difficulty_level) {
    whereConditions.push(`s.difficulty_level = $${paramIndex++}`);
    params.push(difficulty_level);
  }

  if (search) {
    whereConditions.push(`(s.name ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (min_price !== undefined) {
    whereConditions.push(`ps.price >= $${paramIndex++}`);
    params.push(parseFloat(min_price));
  }

  if (max_price !== undefined) {
    whereConditions.push(`ps.price <= $${paramIndex++}`);
    params.push(parseFloat(max_price));
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  const countResult = await query(
    `SELECT COUNT(*) as total 
     FROM provider_sets ps
     JOIN sets s ON ps.set_id = s.set_id
     JOIN users u ON ps.provider_id = u.user_id
     ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  params.push(pagination.limit, pagination.offset);
  const result = await query(
    `SELECT ps.provider_set_id, ps.provider_id, ps.set_id, ps.price, ps.available_quantity,
            s.name as set_name, s.description as set_description, s.category as set_category,
            s.difficulty_level, s.age_min, s.age_max, s.duration, s.base_price, s.video_url,
            s.learning_outcomes, s.image_url as set_image_url,
            u.company_name as provider_name, u.provider_code
     FROM provider_sets ps
     JOIN sets s ON ps.set_id = s.set_id
     JOIN users u ON ps.provider_id = u.user_id
     ${whereClause}
     ORDER BY ps.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    params
  );

  const paginationMeta = createPaginationMeta(pagination.page, pagination.limit, total);

  logger.info('Shop sets listed', { count: result.rows.length, requestId });
  return successResponse(paginatedResponse(result.rows, paginationMeta));
}

exports.handler = asyncHandler(handler);
