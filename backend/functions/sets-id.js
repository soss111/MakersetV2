/**
 * GET /api/sets/:id - Get single set (with parts and tools)
 * PUT /api/sets/:id - Update set (admin only)
 * DELETE /api/sets/:id - Delete set (admin only)
 */

const { asyncHandler, successResponse, ValidationError, NotFoundError } = require('../lib/errors');
const { requireAdmin, optionalAuth } = require('../lib/middleware');
const { query } = require('../lib/db');
const logger = require('../lib/logger');

async function handler(event, context) {
  const requestId = context.requestId;
  const user = optionalAuth(event);
  
  const pathParts = event.path.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id || id === 'sets') {
    throw new ValidationError('Set ID is required');
  }

  if (event.httpMethod === 'GET') {
    // Get set
    const setResult = await query(
      `SELECT set_id, name, description, category, difficulty_level, age_min, age_max, duration, 
              base_price, video_url, learning_outcomes, active, admin_visible, created_at, updated_at
       FROM sets WHERE set_id = $1`,
      [id]
    );

    if (setResult.rows.length === 0) {
      throw new NotFoundError('Set');
    }

    const set = setResult.rows[0];

    // Check admin_visible if not admin
    if ((!user || user.role !== 'admin') && !set.admin_visible) {
      throw new NotFoundError('Set');
    }

    // Get set parts
    const partsResult = await query(
      `SELECT sp.set_part_id, sp.set_id, sp.part_id, sp.quantity, sp.is_optional, sp.notes, sp.safety_notes,
              p.part_number, p.part_name, p.category, p.unit_cost, p.image_url
       FROM set_parts sp
       JOIN parts p ON sp.part_id = p.part_id
       WHERE sp.set_id = $1
       ORDER BY p.part_name`,
      [id]
    );

    // Get set tools (optional)
    const toolsResult = await query(
      `SELECT st.set_tool_id, st.set_id, st.tool_id, st.quantity, st.is_optional, st.notes, st.safety_instructions,
              t.tool_number, t.tool_name, t.category, t.unit_cost, t.image_url
       FROM set_tools st
       JOIN tools t ON st.tool_id = t.tool_id
       WHERE st.set_id = $1
       ORDER BY t.tool_name`,
      [id]
    );

    set.parts = partsResult.rows;
    set.tools = toolsResult.rows;

    return successResponse(set);
  }

  if (event.httpMethod === 'PUT') {
    requireAdmin(event);

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (error) {
      throw new ValidationError('Invalid JSON body');
    }

    const { name, description, category, difficulty_level, age_min, age_max, duration, base_price, video_url, learning_outcomes, active, admin_visible } = body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(category);
    }
    if (difficulty_level !== undefined) {
      updates.push(`difficulty_level = $${paramIndex++}`);
      values.push(difficulty_level);
    }
    if (age_min !== undefined) {
      updates.push(`age_min = $${paramIndex++}`);
      values.push(age_min);
    }
    if (age_max !== undefined) {
      updates.push(`age_max = $${paramIndex++}`);
      values.push(age_max);
    }
    if (duration !== undefined) {
      updates.push(`duration = $${paramIndex++}`);
      values.push(duration);
    }
    if (base_price !== undefined) {
      updates.push(`base_price = $${paramIndex++}`);
      values.push(base_price);
    }
    if (video_url !== undefined) {
      updates.push(`video_url = $${paramIndex++}`);
      values.push(video_url);
    }
    if (learning_outcomes !== undefined) {
      updates.push(`learning_outcomes = $${paramIndex++}`);
      values.push(learning_outcomes);
    }
    if (active !== undefined) {
      updates.push(`active = $${paramIndex++}`);
      values.push(active);
    }
    if (admin_visible !== undefined) {
      updates.push(`admin_visible = $${paramIndex++}`);
      values.push(admin_visible);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(id);

    const result = await query(
      `UPDATE sets SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE set_id = $${paramIndex}
       RETURNING set_id, name, description, category, difficulty_level, age_min, age_max, duration, base_price, video_url, learning_outcomes, active, admin_visible, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Set');
    }

    logger.info('Set updated', { setId: id, requestId });
    return successResponse(result.rows[0]);
  }

  if (event.httpMethod === 'DELETE') {
    requireAdmin(event);

    const result = await query('DELETE FROM sets WHERE set_id = $1 RETURNING set_id', [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Set');
    }

    logger.info('Set deleted', { setId: id, requestId });
    return successResponse({ success: true });
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'Method not allowed' }),
  };
}

exports.handler = asyncHandler(handler);
