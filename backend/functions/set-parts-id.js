/**
 * GET /api/set-parts/:id - Get single set part
 * PUT /api/set-parts/:id - Update set part (admin only)
 * DELETE /api/set-parts/:id - Delete set part (admin only)
 */

const { asyncHandler, successResponse, ValidationError, NotFoundError } = require('../lib/errors');
const { requireAdmin } = require('../lib/middleware');
const { query } = require('../lib/db');
const logger = require('../lib/logger');

async function handler(event, context) {
  const requestId = context.requestId;
  
  const pathParts = event.path.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id || id === 'set-parts') {
    throw new ValidationError('Set part ID is required');
  }

  if (event.httpMethod === 'GET') {
    const result = await query(
      `SELECT sp.set_part_id, sp.set_id, sp.part_id, sp.quantity, sp.is_optional, sp.notes, sp.safety_notes,
              p.part_number, p.part_name, p.category, p.unit_cost, p.image_url
       FROM set_parts sp
       JOIN parts p ON sp.part_id = p.part_id
       WHERE sp.set_part_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Set part');
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

    const { quantity, is_optional, notes, safety_notes } = body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (quantity !== undefined) {
      updates.push(`quantity = $${paramIndex++}`);
      values.push(quantity);
    }
    if (is_optional !== undefined) {
      updates.push(`is_optional = $${paramIndex++}`);
      values.push(is_optional);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(notes);
    }
    if (safety_notes !== undefined) {
      updates.push(`safety_notes = $${paramIndex++}`);
      values.push(safety_notes);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(id);

    const result = await query(
      `UPDATE set_parts SET ${updates.join(', ')}
       WHERE set_part_id = $${paramIndex}
       RETURNING set_part_id, set_id, part_id, quantity, is_optional, notes, safety_notes`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Set part');
    }

    logger.info('Set part updated', { setPartId: id, requestId });
    return successResponse(result.rows[0]);
  }

  if (event.httpMethod === 'DELETE') {
    requireAdmin(event);

    const result = await query('DELETE FROM set_parts WHERE set_part_id = $1 RETURNING set_part_id', [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Set part');
    }

    logger.info('Set part deleted', { setPartId: id, requestId });
    return successResponse({ success: true });
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'Method not allowed' }),
  };
}

exports.handler = asyncHandler(handler);
