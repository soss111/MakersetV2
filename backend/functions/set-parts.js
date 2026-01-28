/**
 * GET /api/set-parts - List set parts (filter by set_id)
 * POST /api/set-parts - Create set part (admin only)
 */

const { asyncHandler, successResponse, ValidationError } = require('../lib/errors');
const { requireAdmin } = require('../lib/middleware');
const { query } = require('../lib/db');
const logger = require('../lib/logger');

async function handler(event, context) {
  const requestId = context.requestId;

  if (event.httpMethod === 'GET') {
    const { set_id } = event.queryStringParameters || {};

    if (!set_id) {
      throw new ValidationError('set_id query parameter is required');
    }

    const result = await query(
      `SELECT sp.set_part_id, sp.set_id, sp.part_id, sp.quantity, sp.is_optional, sp.notes, sp.safety_notes,
              p.part_number, p.part_name, p.category, p.unit_cost, p.image_url
       FROM set_parts sp
       JOIN parts p ON sp.part_id = p.part_id
       WHERE sp.set_id = $1
       ORDER BY p.part_name`,
      [set_id]
    );

    logger.info('Set parts listed', { setId: set_id, count: result.rows.length, requestId });
    return successResponse(result.rows);
  }

  if (event.httpMethod === 'POST') {
    requireAdmin(event);

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (error) {
      throw new ValidationError('Invalid JSON body');
    }

    const { set_id, part_id, quantity = 1, is_optional = false, notes, safety_notes } = body;

    if (!set_id || !part_id) {
      throw new ValidationError('set_id and part_id are required');
    }

    // Check if already exists
    const existing = await query(
      'SELECT set_part_id FROM set_parts WHERE set_id = $1 AND part_id = $2',
      [set_id, part_id]
    );

    if (existing.rows.length > 0) {
      throw new ValidationError('This part is already in the set');
    }

    const result = await query(
      `INSERT INTO set_parts (set_id, part_id, quantity, is_optional, notes, safety_notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING set_part_id, set_id, part_id, quantity, is_optional, notes, safety_notes`,
      [set_id, part_id, quantity, is_optional, notes || null, safety_notes || null]
    );

    logger.info('Set part created', { setPartId: result.rows[0].set_part_id, requestId });
    return successResponse(result.rows[0], 201);
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'Method not allowed' }),
  };
}

exports.handler = asyncHandler(handler);
