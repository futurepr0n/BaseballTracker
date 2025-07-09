// CapSheet Sharing Service - GitHub Gist Integration with TinyURL Support
// Provides URL-based sharing for CapSheet configurations without database requirements

import { createTinyUrl, needsShortening } from './tinyUrlService';

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
        handicappers: {
          hitters: capSheetData.handicappers?.hitters || [],
          pitchers: capSheetData.handicappers?.pitchers || []
        },
        settings: {
          hitterGamesHistory: capSheetData.settings?.hitterGamesHistory || 3,
          pitcherGamesHistory: capSheetData.settings?.pitcherGamesHistory || 3,
          currentDate: capSheetData.settings?.currentDate || new Date().toISOString().split('T')[0]
        }
      },
      summary: {
        totalHitters: capSheetData.hitters?.length || 0,
        totalPitchers: capSheetData.pitchers?.length || 0,
        totalHitterHandicappers: capSheetData.handicappers?.hitters?.length || 0,
        totalPitcherHandicappers: capSheetData.handicappers?.pitchers?.length || 0,
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
  
  // Try to shorten the URL if it's long
  let finalUrl = shareUrl;
  let tinyUrlData = null;
  
  if (needsShortening(shareUrl)) {
    try {
      console.log('[CapSheetSharing] Creating TinyURL for share link...');
      tinyUrlData = await createTinyUrl(shareUrl, {
        description: `CapSheet - ${shareData.summary.totalHitters}H, ${shareData.summary.totalPitchers}P`
      });
      finalUrl = tinyUrlData.shortUrl;
      console.log('[CapSheetSharing] TinyURL created:', finalUrl);
    } catch (tinyError) {
      console.warn('[CapSheetSharing] TinyURL creation failed, using full URL:', tinyError.message);
      // Continue with the original URL
    }
  }

  return {
    url: finalUrl,
    fullUrl: shareUrl,
    gistUrl: gist.html_url,
    id: gist.id,
    created: shareData.created,
    summary: shareData.summary,
    method: 'github-gist',
    tinyUrl: tinyUrlData
  };
};

/**
 * Create Base64 encoded share link (fallback method)
 */
const createBase64Share = async (shareData) => {
  // Compress the data for URL sharing with comprehensive field preservation
  const compressedData = {
    v: shareData.version,
    c: shareData.created,
    d: {
      h: shareData.data.hitters.map(h => ({
        // Basic info (short keys for compression)
        n: h.name,
        t: h.team,
        p: h.position,
        b: h.bats,
        fn: h.fullName,
        
        // Game data
        g: h.games,
        lhr: h.lastHR,
        lab: h.lastAB,
        lh: h.lastH,
        thr: h.totalHR,
        
        // Critical custom fields
        eso: h.expectedSO,
        gou: h.gameOU,
        std: h.stadium,
        pit: h.pitcher,
        pid: h.pitcherId,
        ph: h.pitcherHand,
        opp: h.opponent,
        opt: h.opponentTeam,
        
        // Bet types
        bt: h.betTypes,
        
        // Handicapper data
        hc: h.handicappers,
        hp: h.handicapperPicks,
        
        // Game history (preserve all game fields)
        ...Object.fromEntries(
          Object.entries(h).filter(([key, value]) => 
            key.startsWith('game') && value !== undefined && value !== null && value !== ''
          )
        ),
        
        // Previous game stats
        ...Object.fromEntries(
          Object.entries(h).filter(([key, value]) => 
            key.startsWith('prevGame') && value !== undefined && value !== null && value !== ''
          )
        )
      })),
      p: shareData.data.pitchers.map(p => ({
        // Basic info
        n: p.name,
        t: p.team,
        th: p.throwingArm,
        pit: p.pitches,
        fn: p.fullName,
        
        // Game data
        g: p.games,
        era: p.ERA,
        whip: p.WHIP,
        
        // Critical custom fields
        ek: p.expectedK,
        ep: p.expectedPitch,
        gou: p.gameOU,
        std: p.stadium,
        opp: p.opponent,
        
        // Bet types
        bt: p.betTypes,
        
        // Handicapper data
        hc: p.handicappers,
        hp: p.handicapperPicks,
        
        // Game history (preserve all game fields)
        ...Object.fromEntries(
          Object.entries(p).filter(([key, value]) => 
            key.startsWith('game') && value !== undefined && value !== null && value !== ''
          )
        ),
        
        // Previous game stats
        ...Object.fromEntries(
          Object.entries(p).filter(([key, value]) => 
            key.startsWith('prevGame') && value !== undefined && value !== null && value !== ''
          )
        )
      })),
      hcp: shareData.data.handicappers,
      s: shareData.data.settings
    },
    s: shareData.summary
  };

  const jsonString = JSON.stringify(compressedData);
  
  // Check if data is too large for URL - increased limit for comprehensive data
  if (jsonString.length > 8000) {
    console.warn('[CapSheetSharing] Base64 data size:', jsonString.length, 'characters');
    throw new Error('CapSheet too large for URL sharing. Please use the GitHub Gist option instead.');
  }

  const encoded = btoa(jsonString);
  const shareUrl = `${window.location.origin}/capsheet?data=${encoded}`;
  
  // Generate a pseudo-ID for consistency
  const shareId = 'base64_' + Date.now().toString(36);

  console.log('[CapSheetSharing] Base64 share created:', shareId, 'Size:', jsonString.length, 'chars');
  
  // Always try to shorten Base64 URLs as they are very long
  let finalUrl = shareUrl;
  let tinyUrlData = null;
  
  try {
    console.log('[CapSheetSharing] Creating TinyURL for long Base64 URL...');
    tinyUrlData = await createTinyUrl(shareUrl, {
      description: `CapSheet - ${shareData.summary.totalHitters}H, ${shareData.summary.totalPitchers}P (Base64)`
    });
    finalUrl = tinyUrlData.shortUrl;
    console.log('[CapSheetSharing] TinyURL created for Base64:', finalUrl);
  } catch (tinyError) {
    console.error('[CapSheetSharing] TinyURL creation failed for Base64 URL:', tinyError.message);
    // For Base64 URLs, this is more critical since they're extremely long
    throw new Error('URL too long for sharing. TinyURL service unavailable. Please try GitHub Gist option.');
  }

  return {
    url: finalUrl,
    fullUrl: shareUrl,
    gistUrl: null,
    id: shareId,
    created: shareData.created,
    summary: shareData.summary,
    method: 'base64',
    tinyUrl: tinyUrlData
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
          // Basic info
          name: h.n,
          team: h.t,
          position: h.p || h.position,
          bats: h.b || h.bats,
          fullName: h.fn || h.fullName,
          
          // Game data
          games: h.g || h.games,
          lastHR: h.lhr || h.lastHR,
          lastAB: h.lab || h.lastAB,
          lastH: h.lh || h.lastH,
          totalHR: h.thr || h.totalHR,
          
          // Critical custom fields
          expectedSO: h.eso || h.expectedSO,
          gameOU: h.gou || h.gameOU,
          stadium: h.std || h.stadium,
          pitcher: h.pit || h.pitcher,
          pitcherId: h.pid || h.pitcherId,
          pitcherHand: h.ph || h.pitcherHand,
          opponent: h.opp || h.opponent,
          opponentTeam: h.opt || h.opponentTeam,
          
          // Bet types
          betTypes: h.bt || h.betTypes || {},
          
          // Handicapper data
          handicappers: h.hc || h.handicappers,
          handicapperPicks: h.hp || h.handicapperPicks || {},
          
          // Game history - preserve all available fields
          ...Object.fromEntries(
            Object.entries(h).filter(([key, value]) => 
              key.startsWith('game') && value !== undefined
            )
          ),
          
          // Previous game stats
          ...Object.fromEntries(
            Object.entries(h).filter(([key, value]) => 
              key.startsWith('prevGame') && value !== undefined
            )
          )
        })),
        pitchers: compressedData.d.p.map(p => ({
          // Basic info
          name: p.n,
          team: p.t,
          throwingArm: p.th || p.throwingArm,
          pitches: p.pit || p.pitches,
          fullName: p.fn || p.fullName,
          
          // Game data
          games: p.g || p.games,
          ERA: p.era || p.ERA,
          WHIP: p.whip || p.WHIP,
          
          // Critical custom fields
          expectedK: p.ek || p.expectedK,
          expectedPitch: p.ep || p.expectedPitch,
          gameOU: p.gou || p.gameOU,
          stadium: p.std || p.stadium,
          opponent: p.opp || p.opponent,
          
          // Bet types
          betTypes: p.bt || p.betTypes || {},
          
          // Handicapper data
          handicappers: p.hc || p.handicappers,
          handicapperPicks: p.hp || p.handicapperPicks || {},
          
          // Game history - preserve all available fields
          ...Object.fromEntries(
            Object.entries(p).filter(([key, value]) => 
              key.startsWith('game') && value !== undefined
            )
          ),
          
          // Previous game stats
          ...Object.fromEntries(
            Object.entries(p).filter(([key, value]) => 
              key.startsWith('prevGame') && value !== undefined
            )
          )
        })),
        handicappers: compressedData.d.hcp || compressedData.d.handicappers || {
          hitters: [],
          pitchers: []
        },
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
    pitches, // For pitchers
    fullName,
    
    // Game statistics
    games,
    lastHR,
    lastAB, 
    lastH,
    totalHR,
    
    // Critical CapSheet custom fields
    expectedSO, // Expected strikeouts for hitters
    expectedK,  // Expected strikeouts for pitchers
    expectedPitch, // Expected pitch count for pitchers
    gameOU,     // Over/Under values
    stadium,    // Stadium selection
    pitcher,    // Assigned pitcher for hitters
    pitcherId,  // Pitcher ID
    pitcherHand, // Pitcher handedness
    opponent,   // Opponent team
    opponentTeam, // Opponent team (alternative field)
    
    // Bet types (critical for sharing)
    betTypes,
    
    // Handicapper data
    handicappers,
    handicapperPicks,
    
    // Game history data (up to 7 games)
    game1Date, game1HR, game1AB, game1H, game1IP, game1K, game1ER, game1BB, game1PC_ST,
    game2Date, game2HR, game2AB, game2H, game2IP, game2K, game2ER, game2BB, game2PC_ST,
    game3Date, game3HR, game3AB, game3H, game3IP, game3K, game3ER, game3BB, game3PC_ST,
    game4Date, game4HR, game4AB, game4H, game4IP, game4K, game4ER, game4BB, game4PC_ST,
    game5Date, game5HR, game5AB, game5H, game5IP, game5K, game5ER, game5BB, game5PC_ST,
    game6Date, game6HR, game6AB, game6H, game6IP, game6K, game6ER, game6BB, game6PC_ST,
    game7Date, game7HR, game7AB, game7H, game7IP, game7K, game7ER, game7BB, game7PC_ST,
    
    // Previous game statistics
    prevGameHR, prevGameAB, prevGameH, prevGameIP, prevGameK, prevGameER, prevGameBB, prevGamePC_ST,
    
    // Additional pitcher stats
    ERA, WHIP,
    
    // Other relevant data
    ...otherData
  } = player;

  return {
    // Basic player info
    name,
    team,
    position,
    bats,
    throwingArm,
    pitches,
    fullName,
    
    // Game statistics
    games,
    lastHR,
    lastAB,
    lastH,
    totalHR,
    
    // Critical CapSheet custom fields
    expectedSO,
    expectedK,
    expectedPitch,
    gameOU,
    stadium,
    pitcher,
    pitcherId,
    pitcherHand,
    opponent,
    opponentTeam,
    
    // Bet types
    betTypes,
    
    // Handicapper data
    handicappers,
    handicapperPicks,
    
    // Game history data
    game1Date, game1HR, game1AB, game1H, game1IP, game1K, game1ER, game1BB, game1PC_ST,
    game2Date, game2HR, game2AB, game2H, game2IP, game2K, game2ER, game2BB, game2PC_ST,
    game3Date, game3HR, game3AB, game3H, game3IP, game3K, game3ER, game3BB, game3PC_ST,
    game4Date, game4HR, game4AB, game4H, game4IP, game4K, game4ER, game4BB, game4PC_ST,
    game5Date, game5HR, game5AB, game5H, game5IP, game5K, game5ER, game5BB, game5PC_ST,
    game6Date, game6HR, game6AB, game6H, game6IP, game6K, game6ER, game6BB, game6PC_ST,
    game7Date, game7HR, game7AB, game7H, game7IP, game7K, game7ER, game7BB, game7PC_ST,
    
    // Previous game statistics
    prevGameHR, prevGameAB, prevGameH, prevGameIP, prevGameK, prevGameER, prevGameBB, prevGamePC_ST,
    
    // Additional pitcher stats
    ERA,
    WHIP,
    
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
  
  // Count players with various data types
  const hittersWithBets = data.hitters.filter(h => h.betTypes && (h.betTypes.H || h.betTypes.HR || h.betTypes.B)).length;
  const pitchersWithBets = data.pitchers.filter(p => p.betTypes && (p.betTypes.K || p.betTypes.OU)).length;
  const hittersWithCustomData = data.hitters.filter(h => h.expectedSO || h.gameOU || h.pitcher || h.stadium).length;
  const pitchersWithCustomData = data.pitchers.filter(p => p.expectedK || p.expectedPitch || p.gameOU || p.opponent || p.stadium).length;
  
  return `# CapSheet Share - Capping.Pro

**Created:** ${new Date(shareData.created).toLocaleString()}  
**Source:** ${shareData.source}  
**Version:** ${shareData.version}

## Summary
- **${summary.totalHitters}** Hitters (${hittersWithBets} with bet types, ${hittersWithCustomData} with custom data)
- **${summary.totalPitchers}** Pitchers (${pitchersWithBets} with bet types, ${pitchersWithCustomData} with custom data)
- **${summary.totalHitterHandicappers || 0}** Hitter Handicappers
- **${summary.totalPitcherHandicappers || 0}** Pitcher Handicappers
- **Games History:** ${data.settings?.hitterGamesHistory || 3} games (hitters), ${data.settings?.pitcherGamesHistory || 3} games (pitchers)
- **Date Context:** ${data.settings?.currentDate || 'Current'}

## Data Included
This comprehensive CapSheet share includes:

### For Hitters:
- Basic player info (name, team, position, batting hand)
- Game history (up to ${data.settings?.hitterGamesHistory || 3} games)
- Custom fields: Expected SO, Game O/U, Assigned Pitcher, Stadium
- Bet types: Hits (H), Home Runs (HR), Bases (B)
- Handicapper picks and analysis

### For Pitchers:
- Basic player info (name, team, throwing arm, pitch types)
- Game history (up to ${data.settings?.pitcherGamesHistory || 3} games)
- Custom fields: Expected K, Expected Pitch Count, Game O/U, Opponent, Stadium
- Bet types: Strikeouts (K), Over/Under (OU)
- Handicapper picks and analysis

## How to Use
1. Copy the share URL from the CapSheet application
2. Share the URL with others
3. Recipients can load the CapSheet by visiting the URL
4. All custom data, bet selections, and handicapper picks will be preserved

## Players Included

### Hitters (${summary.totalHitters})
${data.hitters.map(h => {
  const bets = h.betTypes ? Object.entries(h.betTypes).filter(([_, selected]) => selected).map(([type, _]) => type).join(', ') : '';
  const customInfo = [h.expectedSO && `ExpSO: ${h.expectedSO}`, h.gameOU && `O/U: ${h.gameOU}`, h.pitcher && `vs ${h.pitcher}`].filter(Boolean).join(' | ');
  return `- **${h.name}** (${h.team})${bets ? ` - Bets: ${bets}` : ''}${customInfo ? ` - ${customInfo}` : ''}`;
}).join('\n')}

### Pitchers (${summary.totalPitchers})
${data.pitchers.map(p => {
  const bets = p.betTypes ? Object.entries(p.betTypes).filter(([_, selected]) => selected).map(([type, _]) => type).join(', ') : '';
  const customInfo = [p.expectedK && `ExpK: ${p.expectedK}`, p.expectedPitch && `ExpPC: ${p.expectedPitch}`, p.gameOU && `O/U: ${p.gameOU}`].filter(Boolean).join(' | ');
  return `- **${p.name}** (${p.team})${bets ? ` - Bets: ${bets}` : ''}${customInfo ? ` - ${customInfo}` : ''}`;
}).join('\n')}

${summary.totalHitterHandicappers > 0 || summary.totalPitcherHandicappers > 0 ? `
## Handicappers Included
${summary.totalHitterHandicappers > 0 ? `- **${summary.totalHitterHandicappers}** Hitter Handicappers` : ''}
${summary.totalPitcherHandicappers > 0 ? `- **${summary.totalPitcherHandicappers}** Pitcher Handicappers` : ''}
` : ''}

## About CapSheet
CapSheet is a comprehensive baseball handicapping tool from Capping.Pro that helps analyze player performance and make informed betting decisions. This share preserves all your custom data, selections, and analysis.

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