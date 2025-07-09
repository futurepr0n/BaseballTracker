// TinyURL Integration Service
// Provides URL shortening for CapSheet sharing links

const TINYURL_API_BASE = 'https://api.tinyurl.com';

// TinyURL API configuration
// Note: API token should be stored in environment variables for production
const TINYURL_CONFIG = {
  apiToken: process.env.REACT_APP_TINYURL_API_TOKEN || '', // Add your token here for testing
  domain: 'tinyurl.com',
  tags: ['capsheet', 'capping-pro']
};

/**
 * Create a shortened URL using TinyURL API
 * @param {string} longUrl - The long URL to shorten
 * @param {Object} options - Optional configuration
 * @returns {Promise<Object>} Result with shortened URL
 */
export const createTinyUrl = async (longUrl, options = {}) => {
  try {

    // For testing without API token - use the free web service
    if (!TINYURL_CONFIG.apiToken) {
      return await createTinyUrlFree(longUrl);
    }

    // API-based shortening (requires token)
    const requestBody = {
      url: longUrl,
      domain: options.domain || TINYURL_CONFIG.domain,
      tags: options.tags || TINYURL_CONFIG.tags,
      expires_at: options.expiresAt || null, // null = never expires
      description: options.description || 'CapSheet Share - Capping.Pro'
    };

    // Add custom alias if provided
    if (options.alias) {
      requestBody.alias = options.alias;
    }

    const response = await fetch(`${TINYURL_API_BASE}/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TINYURL_CONFIG.apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`TinyURL API error: ${response.status} - ${error.errors?.[0] || response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      shortUrl: data.data.tiny_url,
      fullShortUrl: `https://${data.data.domain}/${data.data.alias}`,
      alias: data.data.alias,
      created: data.data.created_at,
      expires: data.data.expires_at,
      analytics: data.data.analytics || null
    };

  } catch (error) {
    console.error('[TinyURL] Error creating short URL:', error);
    throw error;
  }
};

/**
 * Create a TinyURL using the free web service (no API token required)
 * This is a fallback for testing and users without API tokens
 */
const createTinyUrlFree = async (longUrl) => {
  try {

    // Use the simple free API endpoint
    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, {
      method: 'GET',
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`TinyURL free service error: ${response.status}`);
    }

    const shortUrl = await response.text();
    
    if (!shortUrl || shortUrl.includes('Error')) {
      throw new Error('Failed to create TinyURL');
    }


    return {
      success: true,
      shortUrl: shortUrl.trim(),
      fullShortUrl: shortUrl.trim(),
      alias: shortUrl.replace('https://tinyurl.com/', ''),
      created: new Date().toISOString(),
      expires: null,
      analytics: null,
      method: 'free'
    };

  } catch (error) {
    // CORS might block the free API, provide alternative
    console.warn('[TinyURL] Free API failed, trying proxy approach:', error.message);
    return createTinyUrlViaProxy(longUrl);
  }
};

/**
 * Create TinyURL via a proxy/serverless function to avoid CORS
 * This would need to be implemented on your backend
 */
const createTinyUrlViaProxy = async (longUrl) => {
  try {
    // Check if we have a backend proxy available
    const proxyUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    
    const response = await fetch(`${proxyUrl}/api/shorten-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: longUrl })
    });

    if (!response.ok) {
      throw new Error('Backend proxy not available');
    }

    const data = await response.json();
    return {
      success: true,
      shortUrl: data.shortUrl,
      fullShortUrl: data.shortUrl,
      alias: data.alias || data.shortUrl.split('/').pop(),
      created: new Date().toISOString(),
      expires: null,
      analytics: null,
      method: 'proxy'
    };

  } catch (error) {
    console.error('[TinyURL] Proxy approach failed:', error);
    throw new Error('Unable to create short URL. Please try the GitHub Gist option instead.');
  }
};

/**
 * Get analytics for a TinyURL (requires API token)
 * @param {string} alias - The TinyURL alias
 * @returns {Promise<Object>} Analytics data
 */
export const getTinyUrlAnalytics = async (alias) => {
  if (!TINYURL_CONFIG.apiToken) {
    throw new Error('TinyURL API token required for analytics');
  }

  try {
    const response = await fetch(`${TINYURL_API_BASE}/alias/${alias}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TINYURL_CONFIG.apiToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get analytics: ${response.status}`);
    }

    const data = await response.json();
    return {
      clicks: data.data.hits || 0,
      created: data.data.created_at,
      lastAccessed: data.data.last_hit_at,
      url: data.data.url
    };

  } catch (error) {
    console.error('[TinyURL] Error getting analytics:', error);
    return null;
  }
};

/**
 * Validate if a URL needs shortening
 * @param {string} url - URL to check
 * @returns {boolean} True if URL should be shortened
 */
export const needsShortening = (url) => {
  // URLs longer than 500 chars benefit from shortening
  // Especially important for SMS (160 char limit)
  return url && url.length > 500;
};

/**
 * Extract TinyURL alias from a full TinyURL
 * @param {string} tinyUrl - The full TinyURL
 * @returns {string|null} The alias or null
 */
export const extractTinyUrlAlias = (tinyUrl) => {
  const match = tinyUrl.match(/tinyurl\.com\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
};

export default {
  createTinyUrl,
  getTinyUrlAnalytics,
  needsShortening,
  extractTinyUrlAlias
};