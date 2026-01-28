/**
 * API base URL utility
 * Single source of truth for API base URL
 */

/**
 * Get API base URL
 * Checks environment variables and defaults appropriately
 */
function getApiBaseUrl() {
  // In production (Netlify), use the site URL
  if (process.env.NETLIFY) {
    return process.env.URL || 'https://your-site.netlify.app';
  }

  // For local development
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Default to localhost for Netlify Dev
  return 'http://localhost:8888';
}

module.exports = {
  getApiBaseUrl,
};
