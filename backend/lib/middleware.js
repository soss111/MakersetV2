/**
 * Authentication and authorization middleware
 */

const { verifyToken, extractTokenFromHeader } = require('./auth');
const { AuthenticationError, AuthorizationError } = require('./errors');

/**
 * Middleware to require authentication
 */
function requireAuth(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    throw new AuthenticationError('Authentication required');
  }

  try {
    const decoded = verifyToken(token);
    return decoded;
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
}

/**
 * Middleware to require specific role(s)
 */
function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (event) => {
    const user = requireAuth(event);
    
    if (!roles.includes(user.role)) {
      throw new AuthorizationError(`Access denied. Required role: ${roles.join(' or ')}`);
    }

    return user;
  };
}

/**
 * Middleware to require admin role
 */
function requireAdmin(event) {
  return requireRole('admin')(event);
}

/**
 * Middleware to require provider role
 */
function requireProvider(event) {
  return requireRole('provider')(event);
}

/**
 * Middleware to require customer role
 */
function requireCustomer(event) {
  return requireRole('customer')(event);
}

/**
 * Optional auth - returns user if token is valid, null otherwise
 */
function optionalAuth(event) {
  try {
    return requireAuth(event);
  } catch (error) {
    return null;
  }
}

module.exports = {
  requireAuth,
  requireRole,
  requireAdmin,
  requireProvider,
  requireCustomer,
  optionalAuth,
};
