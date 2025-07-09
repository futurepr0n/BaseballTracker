/**
 * Consolidated Handedness Service
 * 
 * Centralizes all handedness data loading and calculations
 * to avoid duplicate logic across components and services.
 * Enhanced with Unicode normalization for special characters.
 */

import { normalizeToEnglish, createAllNameVariants, namesMatch } from '../utils/universalNameNormalizer.js';

// Cache for handedness data to avoid redundant fetches
const handednessCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Load handedness data for a player
 * @param {string} playerName - Abbreviated player name (e.g., "A. Judge")
 * @param {string} teamAbbr - Optional team abbreviation for better matching
 * @returns {Promise<Object>} Handedness data with RHP and LHP splits
 */
export const loadHandednessData = async (playerName, teamAbbr = null) => {
  const cacheKey = `${playerName}_${teamAbbr || 'any'}`;
  
  // Check cache first
  const cached = handednessCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`🎯 Using cached handedness data for ${playerName}`);
    return cached.data;
  }

  try {
    console.log(`🔍 Loading handedness data for: ${playerName}`);
    
    // First, get the full name from rosters.json for better matching
    let fullName = null;
    try {
      const rosterResponse = await fetch('/data/rosters.json');
      if (rosterResponse.ok) {
        const rosterData = await rosterResponse.json();
        // Find player by abbreviated name and optional team
        const playerRoster = rosterData.find(p => 
          p.name === playerName && (!teamAbbr || p.team === teamAbbr)
        );
        if (playerRoster && playerRoster.fullName) {
          fullName = playerRoster.fullName;
          console.log(`🔍 Found full name in roster: ${fullName}`);
        }
      }
    } catch (rosterError) {
      console.log('Could not load roster data for full name lookup');
    }
    
    // Load handedness datasets
    const [rhpResponse, lhpResponse] = await Promise.all([
      fetch('/data/handedness/rhp.json'),
      fetch('/data/handedness/lhp.json')
    ]);

    if (rhpResponse.ok && lhpResponse.ok) {
      const [rhpData, lhpData] = await Promise.all([
        rhpResponse.json(),
        lhpResponse.json()
      ]);

      // Create search variants based on full name or abbreviated name
      let searchVariants = [];
      
      if (fullName) {
        // Use full name to create comprehensive search variants
        searchVariants = createAllNameVariants(fullName);
        // Also add CSV format variants
        const nameParts = fullName.split(' ');
        if (nameParts.length >= 2) {
          const lastName = nameParts[nameParts.length - 1];
          const firstName = nameParts.slice(0, -1).join(' ');
          const csvFormat = `${lastName}, ${firstName}`;
          searchVariants.push(...createAllNameVariants(csvFormat));
        }
      } else {
        // Use abbreviated name
        searchVariants = createAllNameVariants(playerName);
        // Also add CSV format variants
        const nameParts = playerName.split(' ');
        if (nameParts.length >= 2) {
          const lastName = nameParts[nameParts.length - 1];
          const firstName = nameParts.slice(0, -1).join(' ');
          const csvFormat = `${lastName}, ${firstName}`;
          searchVariants.push(...createAllNameVariants(csvFormat));
        }
      }
      
      console.log(`🔍 Using comprehensive search variants for ${playerName}:`, searchVariants.slice(0, 8));
      
      // Enhanced search in the players array with comprehensive name matching
      let rhpResult = null;
      let lhpResult = null;
      
      if (rhpData.players) {
        rhpResult = rhpData.players.find(p => {
          if (!p.name) return false;
          // Use comprehensive name matching
          return namesMatch(playerName, p.name) || 
                 (fullName && namesMatch(fullName, p.name));
        });
      }
      
      if (lhpData.players) {
        lhpResult = lhpData.players.find(p => {
          if (!p.name) return false;
          // Use comprehensive name matching
          return namesMatch(playerName, p.name) || 
                 (fullName && namesMatch(fullName, p.name));
        });
      }
      
      console.log(`🔍 Enhanced handedness lookup results:`, { 
        playerName,
        fullName,
        found: !!(rhpResult || lhpResult), 
        rhp: !!rhpResult, 
        lhp: !!lhpResult,
        rhpName: rhpResult?.name,
        lhpName: lhpResult?.name
      });

      const result = {
        rhp: rhpResult,
        lhp: lhpResult,
        fullName: fullName,
        lastUpdated: new Date().toISOString()
      };

      // Cache the result
      handednessCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    }
  } catch (error) {
    console.error('Error loading handedness data for', playerName, error);
  }
  
  return null;
};

/**
 * Calculate batting average from handedness data
 */
export const calculateHandednessBA = (handednessData) => {
  if (!handednessData) return '.000';
  
  // Estimate BA based on attack angle and bat speed
  const baseBA = 0.240;
  const angleBonus = (handednessData.attack_angle || 10) > 15 ? 0.020 : -0.010;
  const speedBonus = ((handednessData.avg_bat_speed || 70) - 70) * 0.002;
  return Math.max(0.180, Math.min(0.350, baseBA + angleBonus + speedBonus)).toFixed(3);
};

/**
 * Calculate slugging percentage from handedness data
 */
export const calculateHandednessSLG = (handednessData) => {
  if (!handednessData) return '.000';
  
  // Estimate SLG based on attack angle and bat speed
  const baseSLG = 0.400;
  const angleBonus = ((handednessData.attack_angle || 10) - 15) * 0.008;
  const speedBonus = ((handednessData.avg_bat_speed || 70) - 70) * 0.005;
  return Math.max(0.300, Math.min(0.600, baseSLG + angleBonus + speedBonus)).toFixed(3);
};

/**
 * Calculate isolated power from handedness data
 */
export const calculateHandednessISO = (handednessData) => {
  if (!handednessData) return '.000';
  
  const slg = parseFloat(calculateHandednessSLG(handednessData));
  const avg = parseFloat(calculateHandednessBA(handednessData));
  return (slg - avg).toFixed(3);
};

/**
 * Calculate wOBA from handedness data
 */
export const calculateHandednessWOBA = (handednessData) => {
  if (!handednessData) return '.000';
  
  // Estimate wOBA based on multiple factors
  const baseWOBA = 0.320;
  const angleBonus = ((handednessData.attack_angle || 10) - 15) * 0.002;
  const speedBonus = ((handednessData.avg_bat_speed || 70) - 70) * 0.002;
  const idealRateBonus = (handednessData.ideal_attack_angle_rate || 0.4) > 0.5 ? 0.015 : -0.010;
  
  return Math.max(0.200, Math.min(0.450, baseWOBA + angleBonus + speedBonus + idealRateBonus)).toFixed(3);
};

/**
 * Format handedness splits for display
 */
export const formatHandednessSplits = (handednessData) => {
  if (!handednessData) return null;

  const format = (data) => {
    if (!data) return null;
    
    return {
      hab: `${Math.round((data.competitive_swings || 100) * 0.3)}/${data.competitive_swings || 100}`,
      ba: calculateHandednessBA(data),
      slg: calculateHandednessSLG(data),
      iso: calculateHandednessISO(data),
      woba: calculateHandednessWOBA(data),
      k_rate: `${Math.max(15, 30 - (data.ideal_attack_angle_rate || 0.4) * 25).toFixed(1)}%`,
      bb_rate: `${Math.max(5, 6 + (data.ideal_attack_angle_rate || 0.4) * 8).toFixed(1)}%`,
      swingScore: Math.round(((data.ideal_attack_angle_rate || 0.4) * 50) + ((data.avg_bat_speed || 70) / 3)),
      attackAngle: data.attack_angle,
      batSpeed: data.avg_bat_speed
    };
  };

  return {
    vsRHP: format(handednessData.rhp),
    vsLHP: format(handednessData.lhp),
    fullName: handednessData.fullName,
    lastUpdated: handednessData.lastUpdated
  };
};

/**
 * Generate estimated splits when handedness data is not available
 */
export const generateEstimatedSplits = (seasonStats, pitcherType) => {
  if (!seasonStats) return null;
  
  // Apply typical platoon splits
  const platoonAdjustment = pitcherType === 'LHP' ? -0.020 : 0.010;
  
  return {
    hab: `${seasonStats.H}/${seasonStats.AB}`,
    ba: Math.max(0.180, parseFloat(seasonStats.AVG) + platoonAdjustment).toFixed(3),
    slg: Math.max(0.300, parseFloat(seasonStats.SLG || '0.400') + platoonAdjustment * 2).toFixed(3),
    iso: Math.max(0.050, parseFloat(seasonStats.ISO || '0.150')).toFixed(3),
    woba: Math.max(0.250, parseFloat(seasonStats.wOBA || '0.320') + platoonAdjustment).toFixed(3),
    k_rate: '22.0%',
    bb_rate: '8.0%',
    estimated: true
  };
};

/**
 * Get player handedness with enhanced roster lookup
 * @param {string} playerName - Player name (e.g., "A. García")
 * @param {string} teamAbbr - Team abbreviation (e.g., "TEX")
 * @returns {Promise<Object>} Handedness data with bats, throws, and swing path
 */
export const getPlayerHandedness = async (playerName, teamAbbr = null) => {
  console.log(`🔍 HANDEDNESS LOOKUP: ${playerName} (${teamAbbr})`);
  
  try {
    // First, try to get full name from roster
    let fullName = null;
    let matchedName = null;
    
    try {
      console.log('🔍 Loading roster data...');
      const rosterResponse = await fetch('/data/rosters.json');
      if (rosterResponse.ok) {
        const rosterData = await rosterResponse.json();
        
        // Find player in roster with various matching strategies
        let foundPlayer = null;
        
        // Strategy 1: Direct name and team match
        if (teamAbbr) {
          foundPlayer = rosterData.find(p => 
            p.name === playerName && p.team === teamAbbr
          );
          if (foundPlayer) {
            console.log(`✓ Direct match found: ${foundPlayer.name} (${foundPlayer.team})`);
          }
        }
        
        // Strategy 2: Name match with first initial expansion
        if (!foundPlayer) {
          const searchStrategies = [
            // Try exact match first
            (p) => p.name === playerName,
            // Try case-insensitive match
            (p) => p.name.toLowerCase() === playerName.toLowerCase(),
            // Try first initial + last name match
            (p) => {
              const displayParts = playerName.split(' ');
              if (displayParts.length >= 2) {
                const firstInitial = displayParts[0].replace('.', '');
                const lastName = displayParts[1];
                
                // Check if player fullName contains matching parts
                const fullNameLower = (p.fullName || p.name).toLowerCase();
                const firstNameMatch = fullNameLower.includes(firstInitial.toLowerCase());
                const lastNameMatch = fullNameLower.includes(lastName.toLowerCase());
                
                return firstNameMatch && lastNameMatch;
              }
              return false;
            }
          ];
          
          for (let i = 0; i < searchStrategies.length && !foundPlayer; i++) {
            foundPlayer = rosterData.find(searchStrategies[i]);
            if (foundPlayer) {
              console.log(`✓ Strategy ${i + 1} match: ${foundPlayer.name} -> ${foundPlayer.fullName}`);
            }
          }
        }
        
        if (foundPlayer) {
          fullName = foundPlayer.fullName || foundPlayer.name;
          matchedName = foundPlayer.name;
          console.log(`✓ Full name from roster: ${fullName}`);
        }
      }
    } catch (rosterError) {
      console.log('Could not load roster data:', rosterError.message);
    }
    
    // Load handedness data
    console.log('🔍 Loading handedness data...');
    const handednessResponse = await fetch('/data/handedness/all.json');
    if (!handednessResponse.ok) {
      console.log('Could not load handedness data');
      return null;
    }
    
    const handednessData = await handednessResponse.json();
    if (!handednessData.players) {
      console.log('Invalid handedness data format');
      return null;
    }
    
    // Search for player in handedness data
    const searchNames = [playerName];
    if (fullName) {
      searchNames.push(fullName);
      // Also try CSV format
      const nameParts = fullName.split(' ');
      if (nameParts.length >= 2) {
        const lastName = nameParts[nameParts.length - 1];
        const firstName = nameParts.slice(0, -1).join(' ');
        searchNames.push(`${lastName}, ${firstName}`);
      }
    }
    
    console.log(`🔍 Searching handedness data with names:`, searchNames);
    
    let foundHandedness = null;
    for (const searchName of searchNames) {
      foundHandedness = handednessData.players.find(p => 
        p.name && (
          p.name === searchName ||
          p.name.toLowerCase() === searchName.toLowerCase() ||
          namesMatch(searchName, p.name)
        )
      );
      
      if (foundHandedness) {
        console.log(`✓ Found handedness match: ${foundHandedness.name}`);
        break;
      }
    }
    
    if (foundHandedness) {
      const result = {
        bats: foundHandedness.side === 'L' ? 'L' : 'R',
        throws: foundHandedness.side === 'L' ? 'L' : 'R', // Assume same for now
        swingPath: {
          avgBatSpeed: foundHandedness.avg_bat_speed,
          swingTilt: foundHandedness.swing_tilt,
          attackAngle: foundHandedness.attack_angle,
          attackDirection: foundHandedness.attack_direction,
          idealAttackAngleRate: foundHandedness.ideal_attack_angle_rate,
          competitiveSwings: foundHandedness.competitive_swings
        },
        matchedName: foundHandedness.name,
        source: 'handedness_data'
      };
      
      console.log(`✓ Handedness result:`, result);
      return result;
    }
    
    console.log(`✗ No handedness data found for ${playerName}`);
    return null;
    
  } catch (error) {
    console.error('Error in getPlayerHandedness:', error);
    return null;
  }
};

/**
 * Clear handedness cache (useful for testing or data updates)
 */
export const clearHandednessCache = () => {
  handednessCache.clear();
  console.log('✅ Handedness cache cleared');
};