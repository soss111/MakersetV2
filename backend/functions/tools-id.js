/**
 * GET /api/tools/:id - Get single tool
 * PUT /api/tools/:id - Update tool (admin only)
 * DELETE /api/tools/:id - Delete tool (admin only)
 */

const { asyncHandler, successResponse, ValidationError, NotFoundError } = require('../lib/errors');
const { requireAdmin } = require('../lib/middleware');
const { query } = require('../lib/db');
const logger = require('../lib/logger');

async function handler(event, context) {
  const requestId = context.requestId;
  
  const pathParts = event.path.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id || id === 'tools') {
    throw new ValidationError('Tool ID is required');
  }

  if (event.httpMethod === 'GET') {
    const result = await query(
      `SELECT tool_id, tool_number, tool_name, category, stock_quantity, unit_cost, 
              safety_instructions, image_url, translations, active, created_at, updated_at
       FROM tools WHERE tool_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Tool');
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

    const { tool_number, tool_name, category, stock_quantity, unit_cost, safety_instructions, image_url, translations, active } = body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (tool_number !== undefined) {
      const existing = await query('SELECT tool_id FROM tools WHERE tool_number = $1 AND tool_id != $2', [tool_number, id]);
      if (existing.rows.length > 0) {
        throw new ValidationError('Tool number already exists');
      }
      updates.push(`tool_number = $${paramIndex++}`);
      values.push(tool_number);
    }
    if (tool_name !== undefined) {
      updates.push(`tool_name = $${paramIndex++}`);
      values.push(tool_name);
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
    if (safety_instructions !== undefined) {
      updates.push(`safety_instructions = $${paramIndex++}`);
      values.push(safety_instructions);
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
      `UPDATE tools SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE tool_id = $${paramIndex}
       RETURNING tool_id, tool_number, tool_name, category, stock_quantity, unit_cost, safety_instructions, image_url, translations, active, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Tool');
    }

    logger.info('Tool updated', { toolId: id, requestId });
    return successResponse(result.rows[0]);
  }

  if (event.httpMethod === 'DELETE') {
    requireAdmin(event);

    const result = await query('DELETE FROM tools WHERE tool_id = $1 RETURNING tool_id', [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Tool');
    }

    logger.info('Tool deleted', { toolId: id, requestId });
    return successResponse({ success: true });
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'Method not allowed' }),
  };
}

exports.handler = asyncHandler(handler);
