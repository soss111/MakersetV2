/**
 * GET /api/orders - List orders (role-filtered)
 * POST /api/orders - Create order (checkout) - customer only
 */

const { asyncHandler, successResponse, ValidationError } = require('../lib/errors');
const { requireAuth, requireRole } = require('../lib/middleware');
const { query, transaction } = require('../lib/db');
const { parsePagination, createPaginationMeta, paginatedResponse } = require('../lib/pagination');
const logger = require('../lib/logger');

async function handler(event, context) {
  const requestId = context.requestId;
  const user = requireAuth(event);

  if (event.httpMethod === 'GET') {
    const pagination = parsePagination(event.queryStringParameters);
    const { customer_id, provider_id, status, order_number } = event.queryStringParameters || {};

    // Role-based filtering
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (user.role === 'customer') {
      // Customers only see their own orders
      whereConditions.push(`o.customer_id = $${paramIndex++}`);
      params.push(user.userId);
    } else if (user.role === 'provider') {
      // Providers only see orders for their provider sets
      whereConditions.push(`o.provider_id = $${paramIndex++}`);
      params.push(user.userId);
    } else if (user.role === 'admin') {
      // Admins can filter by customer_id or provider_id
      if (customer_id) {
        whereConditions.push(`o.customer_id = $${paramIndex++}`);
        params.push(customer_id);
      }
      if (provider_id) {
        whereConditions.push(`o.provider_id = $${paramIndex++}`);
        params.push(provider_id);
      }
    }

    if (status) {
      whereConditions.push(`o.status = $${paramIndex++}`);
      params.push(status);
    }

    if (order_number) {
      whereConditions.push(`o.order_number = $${paramIndex++}`);
      params.push(order_number);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) as total FROM orders o ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    params.push(pagination.limit, pagination.offset);
    const result = await query(
      `SELECT o.order_id, o.order_number, o.customer_id, o.provider_id, o.status, o.total_amount, 
              o.currency, o.shipping_address, o.printed, o.created_at, o.updated_at,
              u1.first_name || ' ' || u1.last_name as customer_name,
              u2.company_name as provider_name
       FROM orders o
       LEFT JOIN users u1 ON o.customer_id = u1.user_id
       LEFT JOIN users u2 ON o.provider_id = u2.user_id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const paginationMeta = createPaginationMeta(pagination.page, pagination.limit, total);

    logger.info('Orders listed', { count: result.rows.length, requestId });
    return successResponse(paginatedResponse(result.rows, paginationMeta));
  }

  if (event.httpMethod === 'POST') {
    requireRole('customer')(event);

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (error) {
      throw new ValidationError('Invalid JSON body');
    }

    const { provider_id, items, shipping_address } = body;

    if (!provider_id || !items || !Array.isArray(items) || items.length === 0) {
      throw new ValidationError('provider_id and items array are required');
    }

    if (!shipping_address) {
      throw new ValidationError('shipping_address is required');
    }

    // Generate order number
    const orderNumber = `MS-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create order in transaction
    const orderResult = await transaction(async (client) => {
      // Calculate total
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const { provider_set_id, quantity } = item;

        if (!provider_set_id || !quantity || quantity < 1) {
          throw new ValidationError('Each item must have provider_set_id and quantity >= 1');
        }

        // Get provider set
        const psResult = await client.query(
          `SELECT ps.provider_set_id, ps.provider_id, ps.set_id, ps.price, ps.available_quantity
           FROM provider_sets ps
           WHERE ps.provider_set_id = $1 AND ps.is_active = true AND ps.admin_status = 'approved'`,
          [provider_set_id]
        );

        if (psResult.rows.length === 0) {
          throw new ValidationError(`Provider set ${provider_set_id} not found or not available`);
        }

        const providerSet = psResult.rows[0];

        // Verify provider_id matches
        if (providerSet.provider_id !== provider_id) {
          throw new ValidationError('Provider set does not belong to specified provider');
        }

        // Check availability
        if (providerSet.available_quantity < quantity) {
          throw new ValidationError(`Insufficient quantity for provider set ${provider_set_id}`);
        }

        const unitPrice = providerSet.price;
        const lineTotal = unitPrice * quantity;
        totalAmount += lineTotal;

        orderItems.push({
          set_id: providerSet.set_id,
          quantity,
          unit_price: unitPrice,
          line_total: lineTotal,
        });
      }

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (order_number, customer_id, provider_id, status, total_amount, currency, shipping_address)
         VALUES ($1, $2, $3, 'pending', $4, 'USD', $5)
         RETURNING order_id, order_number, customer_id, provider_id, status, total_amount, currency, shipping_address, created_at`,
        [orderNumber, user.userId, provider_id, totalAmount, JSON.stringify(shipping_address)]
      );

      const order = orderResult.rows[0];

      // Create order items
      for (const item of orderItems) {
        await client.query(
          `INSERT INTO order_items (order_id, set_id, quantity, unit_price, line_total)
           VALUES ($1, $2, $3, $4, $5)`,
          [order.order_id, item.set_id, item.quantity, item.unit_price, item.line_total]
        );
      }

      // Update provider set quantities
      for (const item of items) {
        await client.query(
          `UPDATE provider_sets SET available_quantity = available_quantity - $1 WHERE provider_set_id = $2`,
          [item.quantity, item.provider_set_id]
        );
      }

      return order;
    });

    logger.info('Order created', { orderId: orderResult.order_id, orderNumber: orderResult.order_number, requestId });
    return successResponse(orderResult, 201);
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'Method not allowed' }),
  };
}

exports.handler = asyncHandler(handler);
