/**
 * GET /api/orders/:id - Get single order with items
 * PUT /api/orders/:id - Update order (status, printed) - role-gated
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

  if (!id || id === 'orders') {
    throw new ValidationError('Order ID is required');
  }

  if (event.httpMethod === 'GET') {
    // Get order
    const orderResult = await query(
      `SELECT o.order_id, o.order_number, o.customer_id, o.provider_id, o.status, o.total_amount, 
              o.currency, o.shipping_address, o.printed, o.created_at, o.updated_at,
              u1.first_name || ' ' || u1.last_name as customer_name, u1.email as customer_email,
              u2.company_name as provider_name, u2.provider_code
       FROM orders o
       LEFT JOIN users u1 ON o.customer_id = u1.user_id
       LEFT JOIN users u2 ON o.provider_id = u2.user_id
       WHERE o.order_id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      throw new NotFoundError('Order');
    }

    const order = orderResult.rows[0];

    // Role-based access control
    if (user.role === 'customer' && order.customer_id !== user.userId) {
      throw new NotFoundError('Order');
    }
    if (user.role === 'provider' && order.provider_id !== user.userId) {
      throw new NotFoundError('Order');
    }

    // Get order items
    const itemsResult = await query(
      `SELECT oi.order_item_id, oi.order_id, oi.set_id, oi.quantity, oi.unit_price, oi.line_total,
              s.name as set_name, s.description as set_description
       FROM order_items oi
       JOIN sets s ON oi.set_id = s.set_id
       WHERE oi.order_id = $1
       ORDER BY oi.order_item_id`,
      [id]
    );

    order.items = itemsResult.rows;

    return successResponse(order);
  }

  if (event.httpMethod === 'PUT') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (error) {
      throw new ValidationError('Invalid JSON body');
    }

    // Get order to check ownership
    const existingOrder = await query(
      'SELECT customer_id, provider_id, status FROM orders WHERE order_id = $1',
      [id]
    );

    if (existingOrder.rows.length === 0) {
      throw new NotFoundError('Order');
    }

    const order = existingOrder.rows[0];

    // Role-based update permissions
    const canUpdateStatus = user.role === 'admin' || 
                           (user.role === 'provider' && order.provider_id === user.userId);
    const canUpdatePrinted = user.role === 'admin' || user.role === 'production';

    const { status, printed } = body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (status !== undefined) {
      if (!canUpdateStatus) {
        throw new AuthorizationError('You do not have permission to update order status');
      }
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError('Invalid status');
      }
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (printed !== undefined) {
      if (!canUpdatePrinted) {
        throw new AuthorizationError('You do not have permission to update printed status');
      }
      updates.push(`printed = $${paramIndex++}`);
      values.push(printed);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(id);

    const result = await query(
      `UPDATE orders SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE order_id = $${paramIndex}
       RETURNING order_id, order_number, customer_id, provider_id, status, total_amount, currency, shipping_address, printed, created_at, updated_at`,
      values
    );

    logger.info('Order updated', { orderId: id, requestId });
    return successResponse(result.rows[0]);
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'Method not allowed' }),
  };
}

exports.handler = asyncHandler(handler);
