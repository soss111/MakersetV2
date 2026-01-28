/**
 * GET /api/provider-sets - List provider sets (filtered by provider_id for non-admins)
 * POST /api/provider-sets - Create provider set (provider only)
 */

const { asyncHandler, successResponse, ValidationError } = require('../lib/errors');
const { requireAuth, requireRole } = require('../lib/middleware');
const { query } = require('../lib/db');
const { parsePagination, createPaginationMeta, paginatedResponse } = require('../lib/pagination');
const logger = require('../lib/logger');

async function handler(event, context) {
  const requestId = context.requestId;
  const user = requireAuth(event);

  if (event.httpMethod === 'GET') {
    const pagination = parsePagination(event.queryStringParameters);
    const { provider_id, set_id, is_active, admin_status, search } = event.queryStringParameters || {};

    // Non-admins can only see their own provider sets
    const effectiveProviderId = user.role === 'admin' ? provider_id : user.userId;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (effectiveProviderId) {
      whereConditions.push(`ps.provider_id = $${paramIndex++}`);
      params.push(effectiveProviderId);
    }

    if (set_id) {
      whereConditions.push(`ps.set_id = $${paramIndex++}`);
      params.push(set_id);
    }

    if (is_active !== undefined) {
      whereConditions.push(`ps.is_active = $${paramIndex++}`);
      params.push(is_active === 'true');
    }

    if (admin_status) {
      whereConditions.push(`ps.admin_status = $${paramIndex++}`);
      params.push(admin_status);
    }

    if (search) {
      whereConditions.push(`s.name ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) as total 
       FROM provider_sets ps
       JOIN sets s ON ps.set_id = s.set_id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    params.push(pagination.limit, pagination.offset);
    const result = await query(
      `SELECT ps.provider_set_id, ps.provider_id, ps.set_id, ps.price, ps.available_quantity, 
              ps.is_active, ps.provider_visible, ps.admin_visible, ps.admin_status, ps.admin_notes,
              ps.created_at, ps.updated_at,
              s.name as set_name, s.description as set_description, s.category as set_category,
              s.difficulty_level, s.base_price, s.image_url as set_image_url
       FROM provider_sets ps
       JOIN sets s ON ps.set_id = s.set_id
       ${whereClause}
       ORDER BY ps.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const paginationMeta = createPaginationMeta(pagination.page, pagination.limit, total);

    logger.info('Provider sets listed', { count: result.rows.length, requestId });
    return successResponse(paginatedResponse(result.rows, paginationMeta));
  }

  if (event.httpMethod === 'POST') {
    requireRole(['provider', 'admin'])(event);

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (error) {
      throw new ValidationError('Invalid JSON body');
    }

    const { set_id, price, available_quantity = 0, is_active = true, provider_visible = true } = body;

    if (!set_id || price === undefined) {
      throw new ValidationError('set_id and price are required');
    }

    if (price < 0) {
      throw new ValidationError('Price must be non-negative');
    }

    // Providers can only create sets for themselves
    const providerId = user.role === 'admin' && body.provider_id ? body.provider_id : user.userId;

    // Check if set exists
    const setCheck = await query('SELECT set_id FROM sets WHERE set_id = $1', [set_id]);
    if (setCheck.rows.length === 0) {
      throw new ValidationError('Set not found');
    }

    // Check if provider set already exists
    const existing = await query(
      'SELECT provider_set_id FROM provider_sets WHERE provider_id = $1 AND set_id = $2',
      [providerId, set_id]
    );

    if (existing.rows.length > 0) {
      throw new ValidationError('Provider set already exists for this set');
    }

    const result = await query(
      `INSERT INTO provider_sets (provider_id, set_id, price, available_quantity, is_active, provider_visible, admin_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING provider_set_id, provider_id, set_id, price, available_quantity, is_active, provider_visible, admin_visible, admin_status, admin_notes, created_at, updated_at`,
      [providerId, set_id, price, available_quantity, is_active, provider_visible]
    );

    logger.info('Provider set created', { providerSetId: result.rows[0].provider_set_id, requestId });
    return successResponse(result.rows[0], 201);
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'Method not allowed' }),
  };
}

exports.handler = asyncHandler(handler);
