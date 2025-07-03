// CapSheet Sharing Service - GitHub Gist Integration
// Provides URL-based sharing for CapSheet configurations without database requirements

const GITHUB_GIST_API = 'https://api.github.com/gists';

/**
 * Create a shareable link for CapSheet data using GitHub Gist (with Base64 fallback)
 * @param {Object} capSheetData - The CapSheet configuration to share
 * @returns {Promise<Object>} Share result with URL and metadata
 */
export const createShareableLink = async (capSheetData) => {
  try {
    console.log('[CapSheetSharing] Creating shareable link...', { 
      hitters: capSheetData.hitters?.length || 0,
      pitchers: capSheetData.pitchers?.length || 0,
      handicappers: capSheetData.handicappers?.length || 0
    });

    // Prepare data for sharing with sanitization
    const shareData = {
      version: '1.0',
      created: new Date().toISOString(),
      source: 'CapSheet - Capping.Pro',
      data: {
        hitters: capSheetData.hitters?.map(sanitizePlayerData) || [],
        pitchers: capSheetData.pitchers?.map(sanitizePlayerData) || [],
        handicappers: capSheetData.handicappers || [],
        settings: {
          hitterGamesHistory: capSheetData.settings?.hitterGamesHistory || 3,
          pitcherGamesHistory: capSheetData.settings?.pitcherGamesHistory || 3,
          currentDate: capSheetData.settings?.currentDate || new Date().toISOString().split('T')[0]
        }
      },
      summary: {
        totalHitters: capSheetData.hitters?.length || 0,
        totalPitchers: capSheetData.pitchers?.length || 0,
        totalHandicappers: (capSheetData.handicappers?.hitters?.length || 0) + (capSheetData.handicappers?.pitchers?.length || 0),
        createdAt: new Date().toISOString()
      }
    };

    console.log('[CapSheetSharing] Prepared share data:', shareData.summary);

    // Try GitHub Gist first, fallback to Base64 encoding
    try {
      return await createGitHubGist(shareData);
    } catch (githubError) {
      console.warn('[CapSheetSharing] GitHub Gist failed, using Base64 fallback:', githubError.message);
      return await createBase64Share(shareData);
    }

  } catch (error) {
    console.error('[CapSheetSharing] Error creating shareable link:', error);
    throw new Error(`Failed to create share link: ${error.message}`);
  }
};

/**
 * Create GitHub Gist (requires authentication or anonymous)
 */
const createGitHubGist = async (shareData) => {
  const gistData = {
    description: `CapSheet Share - ${shareData.summary.totalHitters} hitters, ${shareData.summary.totalPitchers} pitchers - Capping.Pro`,
    public: true, // Changed to public for anonymous access
    files: {
      'capsheet.json': {
        content: JSON.stringify(shareData, null, 2)
      },
      'README.md': {
        content: generateShareReadme(shareData)
      }
    }
  };

  console.log('[CapSheetSharing] Creating GitHub Gist...');
  const response = await fetch(GITHUB_GIST_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'CapSheet-Sharing/1.0'
    },
    body: JSON.stringify(gistData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}. ${errorData.message || ''}`);
  }

  const gist = await response.json();
  console.log('[CapSheetSharing] Gist created successfully:', gist.id);

  const shareUrl = `${window.location.origin}/capsheet?share=${gist.id}`;

  return {
    url: shareUrl,
    gistUrl: gist.html_url,
    id: gist.id,
    created: shareData.created,
    summary: shareData.summary,
    method: 'github-gist'
  };
};

/**
 * Create Base64 encoded share link (fallback method)
 */
const createBase64Share = async (shareData) => {
  // Compress the data for URL sharing
  const compressedData = {
    v: shareData.version,
    c: shareData.created,
    d: {
      h: shareData.data.hitters.map(h => ({
        n: h.name,
        t: h.team,
        p: h.position,
        b: h.bats,
        g: h.games
      })),
      p: shareData.data.pitchers.map(p => ({
        n: p.name,
        t: p.team,
        th: p.throwingArm,
        g: p.games
      })),
      s: shareData.data.settings
    },
    s: shareData.summary
  };

  const jsonString = JSON.stringify(compressedData);
  
  // Check if data is too large for URL
  if (jsonString.length > 2000) {
    throw new Error('CapSheet too large for URL sharing. Try reducing the number of players.');
  }

  const encoded = btoa(jsonString);
  const shareUrl = `${window.location.origin}/capsheet?data=${encoded}`;
  
  // Generate a pseudo-ID for consistency
  const shareId = 'base64_' + Date.now().toString(36);

  console.log('[CapSheetSharing] Base64 share created:', shareId);

  return {
    url: shareUrl,
    gistUrl: null,
    id: shareId,
    created: shareData.created,
    summary: shareData.summary,
    method: 'base64'
  };
};

/**
 * Load shared CapSheet data from GitHub Gist or Base64
 * @param {string} shareId - The Gist ID to load
 * @returns {Promise<Object>} The shared CapSheet data
 */
export const loadSharedCapSheet = async (shareId) => {
  try {
    console.log('[CapSheetSharing] Loading shared CapSheet:', shareId);

    const response = await fetch(`${GITHUB_GIST_API}/${shareId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Share link not found. It may have been deleted or the ID is incorrect.');
      }
      throw new Error(`Failed to load share: ${response.status} ${response.statusText}`);
    }

    const gist = await response.json();
    console.log('[CapSheetSharing] Gist loaded:', gist.id);

    // Extract CapSheet data from gist
    const capsheetFile = gist.files['capsheet.json'];
    if (!capsheetFile) {
      throw new Error('Invalid share format: capsheet.json not found');
    }

    const shareData = JSON.parse(capsheetFile.content);
    console.log('[CapSheetSharing] Share data parsed:', shareData.summary);

    // Validate share data format
    if (!shareData.version || !shareData.data) {
      throw new Error('Invalid share format: missing required fields');
    }

    // Return the actual CapSheet data
    return {
      ...shareData.data,
      _shareMetadata: {
        version: shareData.version,
        created: shareData.created,
        source: shareData.source,
        summary: shareData.summary,
        gistUrl: gist.html_url,
        method: 'github-gist'
      }
    };

  } catch (error) {
    console.error('[CapSheetSharing] Error loading shared CapSheet:', error);
    throw error;
  }
};

/**
 * Load shared CapSheet data from Base64 encoded URL parameter
 * @param {string} encodedData - The Base64 encoded data
 * @returns {Promise<Object>} The shared CapSheet data
 */
export const loadBase64CapSheet = async (encodedData) => {
  try {
    console.log('[CapSheetSharing] Loading Base64 CapSheet...');

    const decoded = atob(encodedData);
    const compressedData = JSON.parse(decoded);

    // Expand compressed data back to full format
    const shareData = {
      version: compressedData.v,
      created: compressedData.c,
      data: {
        hitters: compressedData.d.h.map(h => ({
          name: h.n,
          team: h.t,
          position: h.p,
          bats: h.b,
          games: h.g
        })),
        pitchers: compressedData.d.p.map(p => ({
          name: p.n,
          team: p.t,
          throwingArm: p.th,
          games: p.g
        })),
        settings: compressedData.d.s
      },
      summary: compressedData.s
    };

    console.log('[CapSheetSharing] Base64 data parsed:', shareData.summary);

    return {
      ...shareData.data,
      _shareMetadata: {
        version: shareData.version,
        created: shareData.created,
        source: 'CapSheet - Capping.Pro',
        summary: shareData.summary,
        gistUrl: null,
        method: 'base64'
      }
    };

  } catch (error) {
    console.error('[CapSheetSharing] Error loading Base64 CapSheet:', error);
    throw new Error('Invalid share link format');
  }
};

/**
 * Sanitize player data before sharing (remove sensitive information)
 * @param {Object} player - Player data to sanitize
 * @returns {Object} Sanitized player data
 */
const sanitizePlayerData = (player) => {
  // Remove any potentially sensitive or unnecessary fields
  const {
    // Keep all the essential CapSheet data
    name,
    team,
    position,
    bats,
    throwingArm,
    // Game statistics
    games,
    lastHR,
    lastAB, 
    lastH,
    totalHR,
    // Handicapper data
    handicappers,
    // Other relevant data
    ...otherData
  } = player;

  return {
    name,
    team,
    position,
    bats,
    throwingArm,
    games,
    lastHR,
    lastAB,
    lastH,
    totalHR,
    handicappers,
    // Include other data but be selective
    ...Object.fromEntries(
      Object.entries(otherData).filter(([key, value]) => 
        // Only include non-sensitive data
        !key.toLowerCase().includes('password') &&
        !key.toLowerCase().includes('token') &&
        !key.toLowerCase().includes('secret') &&
        value !== undefined &&
        value !== null
      )
    )
  };
};

/**
 * Generate a README for the shared Gist
 * @param {Object} shareData - The share data
 * @returns {string} Markdown README content
 */
const generateShareReadme = (shareData) => {
  const { summary, data } = shareData;
  
  return `# CapSheet Share - Capping.Pro

**Created:** ${new Date(shareData.created).toLocaleString()}
**Source:** ${shareData.source}

## Summary
- **${summary.totalHitters}** Hitters
- **${summary.totalPitchers}** Pitchers  
- **${summary.totalHandicappers}** Handicappers
- **Games History:** ${data.settings?.hitterGamesHistory || 3} games (hitters), ${data.settings?.pitcherGamesHistory || 3} games (pitchers)

## How to Use
1. Copy the share URL from the CapSheet application
2. Share the URL with others
3. Recipients can load the CapSheet by visiting the URL

## Players Included

### Hitters (${summary.totalHitters})
${data.hitters.map(h => `- ${h.name} (${h.team})`).join('\n')}

### Pitchers (${summary.totalPitchers})
${data.pitchers.map(p => `- ${p.name} (${p.team})`).join('\n')}

## About CapSheet
CapSheet is a comprehensive baseball handicapping tool from Capping.Pro that helps analyze player performance and make informed betting decisions.

**Visit:** https://capping.pro
`;
};

/**
 * Validate if a string looks like a valid Gist ID
 * @param {string} shareId - The ID to validate
 * @returns {boolean} True if valid format
 */
export const isValidShareId = (shareId) => {
  // GitHub Gist IDs are typically 32 character hexadecimal strings
  return /^[a-f0-9]{32}$/i.test(shareId);
};

/**
 * Get share statistics (for debugging/monitoring)
 * @param {string} shareId - The Gist ID
 * @returns {Promise<Object>} Share statistics
 */
export const getShareStats = async (shareId) => {
  try {
    const response = await fetch(`${GITHUB_GIST_API}/${shareId}`);
    if (!response.ok) return null;
    
    const gist = await response.json();
    return {
      id: gist.id,
      created: gist.created_at,
      updated: gist.updated_at,
      description: gist.description,
      public: gist.public,
      fileCount: Object.keys(gist.files).length
    };
  } catch (error) {
    console.error('[CapSheetSharing] Error getting share stats:', error);
    return null;
  }
};

export default {
  createShareableLink,
  loadSharedCapSheet,
  isValidShareId,
  getShareStats
};