/**
 * GET /api/provider-sets/:id - Get single provider set
 * PUT /api/provider-sets/:id - Update provider set (provider owns it, or admin)
 */

const { asyncHandler, successResponse, ValidationError, NotFoundError, AuthorizationError } = require('../lib/errors');
const { requireAuth } = require('../lib/middleware');
const { query } = require('../lib/db');
const logger = require('../lib/logger');

async function handler(event, context) {
  const requestId = context.requestId;
  const user = requireAuth(event);
  
  const pathParts = event.path.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id || id === 'provider-sets') {
    throw new ValidationError('Provider set ID is required');
  }

  if (event.httpMethod === 'GET') {
    const result = await query(
      `SELECT ps.provider_set_id, ps.provider_id, ps.set_id, ps.price, ps.available_quantity, 
              ps.is_active, ps.provider_visible, ps.admin_visible, ps.admin_status, ps.admin_notes,
              ps.created_at, ps.updated_at,
              s.name as set_name, s.description as set_description, s.category as set_category,
              s.difficulty_level, s.base_price, s.image_url as set_image_url
       FROM provider_sets ps
       JOIN sets s ON ps.set_id = s.set_id
       WHERE ps.provider_set_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Provider set');
    }

    const providerSet = result.rows[0];

    // Non-admins can only see their own provider sets
    if (user.role !== 'admin' && providerSet.provider_id !== user.userId) {
      throw new NotFoundError('Provider set');
    }

    return successResponse(providerSet);
  }

  if (event.httpMethod === 'PUT') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (error) {
      throw new ValidationError('Invalid JSON body');
    }

    // Check ownership
    const existing = await query(
      'SELECT provider_id FROM provider_sets WHERE provider_set_id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      throw new NotFoundError('Provider set');
    }

    const providerId = existing.rows[0].provider_id;

    // Only provider owner or admin can update
    if (user.role !== 'admin' && providerId !== user.userId) {
      throw new AuthorizationError('You can only update your own provider sets');
    }

    const { price, available_quantity, is_active, provider_visible } = body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (price !== undefined) {
      if (price < 0) {
        throw new ValidationError('Price must be non-negative');
      }
      updates.push(`price = $${paramIndex++}`);
      values.push(price);
    }
    if (available_quantity !== undefined) {
      updates.push(`available_quantity = $${paramIndex++}`);
      values.push(available_quantity);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    if (provider_visible !== undefined) {
      updates.push(`provider_visible = $${paramIndex++}`);
      values.push(provider_visible);
    }

    // Admin can update admin_status and admin_notes
    if (user.role === 'admin') {
      if (body.admin_status !== undefined) {
        updates.push(`admin_status = $${paramIndex++}`);
        values.push(body.admin_status);
      }
      if (body.admin_notes !== undefined) {
        updates.push(`admin_notes = $${paramIndex++}`);
        values.push(body.admin_notes);
      }
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(id);

    const result = await query(
      `UPDATE provider_sets SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE provider_set_id = $${paramIndex}
       RETURNING provider_set_id, provider_id, set_id, price, available_quantity, is_active, provider_visible, admin_visible, admin_status, admin_notes, created_at, updated_at`,
      values
    );

    logger.info('Provider set updated', { providerSetId: id, requestId });
    return successResponse(result.rows[0]);
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'Method not allowed' }),
  };
}

exports.handler = asyncHandler(handler);
