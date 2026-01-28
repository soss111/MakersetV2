/**
 * GET /api/parts/:id - Get single part
 * PUT /api/parts/:id - Update part (admin only)
 * DELETE /api/parts/:id - Delete part (admin only)
 */

const { asyncHandler, successResponse, ValidationError, NotFoundError } = require('../lib/errors');
const { requireAdmin } = require('../lib/middleware');
const { query } = require('../lib/db');
const logger = require('../lib/logger');

async function handler(event, context) {
  const requestId = context.requestId;
  
  // Extract ID from path
  const pathParts = event.path.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id || id === 'parts') {
    throw new ValidationError('Part ID is required');
  }

  if (event.httpMethod === 'GET') {
    const result = await query(
      `SELECT part_id, part_number, part_name, category, stock_quantity, unit_cost, 
              safety_notes, image_url, translations, active, created_at, updated_at
       FROM parts WHERE part_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Part');
    }

    return successResponse(result.rows[0]);
  }

  if (event.httpMethod === 'PUT') {
    requireAdmin(event);

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (error) {
      throw new ValidationError('Invalid JSON body');
    }

    const { part_number, part_name, category, stock_quantity, unit_cost, safety_notes, image_url, translations, active } = body;

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (part_number !== undefined) {
      // Check uniqueness if changing part_number
      const existing = await query('SELECT part_id FROM parts WHERE part_number = $1 AND part_id != $2', [part_number, id]);
      if (existing.rows.length > 0) {
        throw new ValidationError('Part number already exists');
      }
      updates.push(`part_number = $${paramIndex++}`);
      values.push(part_number);
    }
    if (part_name !== undefined) {
      updates.push(`part_name = $${paramIndex++}`);
      values.push(part_name);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(category);
    }
    if (stock_quantity !== undefined) {
      updates.push(`stock_quantity = $${paramIndex++}`);
      values.push(stock_quantity);
    }
    if (unit_cost !== undefined) {
      updates.push(`unit_cost = $${paramIndex++}`);
      values.push(unit_cost);
    }
    if (safety_notes !== undefined) {
      updates.push(`safety_notes = $${paramIndex++}`);
      values.push(safety_notes);
    }
    if (image_url !== undefined) {
      updates.push(`image_url = $${paramIndex++}`);
      values.push(image_url);
    }
    if (translations !== undefined) {
      updates.push(`translations = $${paramIndex++}`);
      values.push(translations ? JSON.stringify(translations) : null);
    }
    if (active !== undefined) {
      updates.push(`active = $${paramIndex++}`);
      values.push(active);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(id);

    const result = await query(
      `UPDATE parts SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE part_id = $${paramIndex}
       RETURNING part_id, part_number, part_name, category, stock_quantity, unit_cost, safety_notes, image_url, translations, active, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Part');
    }

    logger.info('Part updated', { partId: id, requestId });
    return successResponse(result.rows[0]);
  }

  if (event.httpMethod === 'DELETE') {
    requireAdmin(event);

    const result = await query('DELETE FROM parts WHERE part_id = $1 RETURNING part_id', [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Part');
    }

    logger.info('Part deleted', { partId: id, requestId });
    return successResponse({ success: true });
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'Method not allowed' }),
  };
}

exports.handler = asyncHandler(handler);
