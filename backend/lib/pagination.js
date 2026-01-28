/**
 * Pagination utilities
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse pagination parameters from query string
 */
function parsePagination(queryParams) {
  const page = Math.max(1, parseInt(queryParams?.page || DEFAULT_PAGE, 10) || DEFAULT_PAGE);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(queryParams?.limit || DEFAULT_LIMIT, 10) || DEFAULT_LIMIT)
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Create pagination metadata
 */
function createPaginationMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
}

/**
 * Build paginated response
 */
function paginatedResponse(data, pagination) {
  return {
    items: data,
    pagination,
  };
}

module.exports = {
  parsePagination,
  createPaginationMeta,
  paginatedResponse,
};
