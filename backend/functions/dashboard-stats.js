/**
 * GET /api/dashboard/stats - Dashboard statistics (role-based)
 */

const { asyncHandler, successResponse } = require('../lib/errors');
const { requireAuth } = require('../lib/middleware');
const { query } = require('../lib/db');
const logger = require('../lib/logger');

async function handler(event, context) {
  const requestId = context.requestId;
  const user = requireAuth(event);

  let stats = {};

  if (user.role === 'admin') {
    // Admin stats
    const [
      usersCount,
      setsCount,
      providerSetsCount,
      ordersCount,
      pendingOrders,
      totalRevenue,
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users WHERE is_active = true'),
      query('SELECT COUNT(*) as count FROM sets WHERE active = true'),
      query('SELECT COUNT(*) as count FROM provider_sets WHERE is_active = true AND admin_status = \'approved\''),
      query('SELECT COUNT(*) as count FROM orders'),
      query('SELECT COUNT(*) as count FROM orders WHERE status = \'pending\''),
      query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status IN (\'confirmed\', \'processing\', \'shipped\', \'delivered\')'),
    ]);

    stats = {
      users: parseInt(usersCount.rows[0].count, 10),
      sets: parseInt(setsCount.rows[0].count, 10),
      providerSets: parseInt(providerSetsCount.rows[0].count, 10),
      orders: parseInt(ordersCount.rows[0].count, 10),
      pendingOrders: parseInt(pendingOrders.rows[0].count, 10),
      totalRevenue: parseFloat(totalRevenue.rows[0].total || 0),
    };
  } else if (user.role === 'provider') {
    // Provider stats
    const [
      providerSetsCount,
      ordersCount,
      pendingOrders,
      totalRevenue,
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM provider_sets WHERE provider_id = $1 AND is_active = true', [user.userId]),
      query('SELECT COUNT(*) as count FROM orders WHERE provider_id = $1', [user.userId]),
      query('SELECT COUNT(*) as count FROM orders WHERE provider_id = $1 AND status = \'pending\'', [user.userId]),
      query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE provider_id = $1 AND status IN (\'confirmed\', \'processing\', \'shipped\', \'delivered\')', [user.userId]),
    ]);

    stats = {
      providerSets: parseInt(providerSetsCount.rows[0].count, 10),
      orders: parseInt(ordersCount.rows[0].count, 10),
      pendingOrders: parseInt(pendingOrders.rows[0].count, 10),
      totalRevenue: parseFloat(totalRevenue.rows[0].total || 0),
    };
  } else if (user.role === 'customer') {
    // Customer stats
    const [
      ordersCount,
      pendingOrders,
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM orders WHERE customer_id = $1', [user.userId]),
      query('SELECT COUNT(*) as count FROM orders WHERE customer_id = $1 AND status = \'pending\'', [user.userId]),
    ]);

    stats = {
      orders: parseInt(ordersCount.rows[0].count, 10),
      pendingOrders: parseInt(pendingOrders.rows[0].count, 10),
    };
  }

  logger.info('Dashboard stats retrieved', { role: user.role, requestId });
  return successResponse(stats);
}

exports.handler = asyncHandler(handler);
