/**
 * stadiumCoordinates.js
 * 
 * MLB Stadium coordinates and travel distance calculations
 * Used for analyzing travel-related performance impacts
 */

// MLB Stadium coordinates (latitude, longitude)
export const STADIUM_COORDINATES = {
  // American League
  'Yankee Stadium': { lat: 40.8296, lng: -73.9262, city: 'New York', state: 'NY', timezone: 'America/New_York' },
  'Fenway Park': { lat: 42.3467, lng: -71.0972, city: 'Boston', state: 'MA', timezone: 'America/New_York' },
  'Camden Yards': { lat: 39.2840, lng: -76.6218, city: 'Baltimore', state: 'MD', timezone: 'America/New_York' },
  'Tropicana Field': { lat: 27.7683, lng: -82.6534, city: 'St. Petersburg', state: 'FL', timezone: 'America/New_York' },
  'Rogers Centre': { lat: 43.6414, lng: -79.3894, city: 'Toronto', state: 'ON', timezone: 'America/Toronto' },
  
  'Progressive Field': { lat: 41.4962, lng: -81.6855, city: 'Cleveland', state: 'OH', timezone: 'America/New_York' },
  'Guaranteed Rate Field': { lat: 41.8300, lng: -87.6338, city: 'Chicago', state: 'IL', timezone: 'America/Chicago' },
  'Comerica Park': { lat: 41.3390, lng: -83.0485, city: 'Detroit', state: 'MI', timezone: 'America/New_York' },
  'Kauffman Stadium': { lat: 39.0517, lng: -94.4803, city: 'Kansas City', state: 'MO', timezone: 'America/Chicago' },
  'Target Field': { lat: 44.9817, lng: -93.2776, city: 'Minneapolis', state: 'MN', timezone: 'America/Chicago' },
  
  'Minute Maid Park': { lat: 32.7573, lng: -95.355, city: 'Houston', state: 'TX', timezone: 'America/Chicago' },
  'Angel Stadium': { lat: 33.8003, lng: -117.8827, city: 'Anaheim', state: 'CA', timezone: 'America/Los_Angeles' },
  'Oakland Coliseum': { lat: 37.7516, lng: -122.2005, city: 'Oakland', state: 'CA', timezone: 'America/Los_Angeles' },
  'T-Mobile Park': { lat: 47.5914, lng: -122.3326, city: 'Seattle', state: 'WA', timezone: 'America/Los_Angeles' },
  'Globe Life Field': { lat: 32.7472, lng: -97.0842, city: 'Arlington', state: 'TX', timezone: 'America/Chicago' },
  
  // National League
  'Citi Field': { lat: 40.7571, lng: -73.8458, city: 'New York', state: 'NY', timezone: 'America/New_York' },
  'Citizens Bank Park': { lat: 39.9061, lng: -75.1665, city: 'Philadelphia', state: 'PA', timezone: 'America/New_York' },
  'Truist Park': { lat: 33.8906, lng: -84.4677, city: 'Atlanta', state: 'GA', timezone: 'America/New_York' },
  'LoanDepot Park': { lat: 25.7781, lng: -80.2197, city: 'Miami', state: 'FL', timezone: 'America/New_York' },
  'Nationals Park': { lat: 38.8730, lng: -77.0074, city: 'Washington', state: 'DC', timezone: 'America/New_York' },
  
  'Wrigley Field': { lat: 41.9484, lng: -87.6553, city: 'Chicago', state: 'IL', timezone: 'America/Chicago' },
  'Great American Ball Park': { lat: 39.0975, lng: -84.5061, city: 'Cincinnati', state: 'OH', timezone: 'America/New_York' },
  'American Family Field': { lat: 43.0280, lng: -87.9712, city: 'Milwaukee', state: 'WI', timezone: 'America/Chicago' },
  'PNC Park': { lat: 40.4469, lng: -80.0057, city: 'Pittsburgh', state: 'PA', timezone: 'America/New_York' },
  'Busch Stadium': { lat: 38.6226, lng: -90.1928, city: 'St. Louis', state: 'MO', timezone: 'America/Chicago' },
  
  'Coors Field': { lat: 39.7559, lng: -104.9942, city: 'Denver', state: 'CO', timezone: 'America/Denver' },
  'Chase Field': { lat: 33.4455, lng: -112.0667, city: 'Phoenix', state: 'AZ', timezone: 'America/Phoenix' },
  'Dodger Stadium': { lat: 34.0739, lng: -118.2400, city: 'Los Angeles', state: 'CA', timezone: 'America/Los_Angeles' },
  'Petco Park': { lat: 32.7073, lng: -117.1566, city: 'San Diego', state: 'CA', timezone: 'America/Los_Angeles' },
  'Oracle Park': { lat: 37.7786, lng: -122.3893, city: 'San Francisco', state: 'CA', timezone: 'America/Los_Angeles' }
};

// Team to stadium mapping (matches your existing VENUE_MAPPING)
export const TEAM_TO_STADIUM = {
  'ARI': 'Chase Field',
  'ATL': 'Truist Park',
  'BAL': 'Camden Yards',
  'BOS': 'Fenway Park',
  'CHC': 'Wrigley Field',
  'CHW': 'Guaranteed Rate Field',
  'CIN': 'Great American Ball Park',
  'CLE': 'Progressive Field',
  'COL': 'Coors Field',
  'DET': 'Comerica Park',
  'HOU': 'Minute Maid Park',
  'KC': 'Kauffman Stadium',
  'LAA': 'Angel Stadium',
  'LAD': 'Dodger Stadium',
  'MIA': 'LoanDepot Park',
  'MIL': 'American Family Field',
  'MIN': 'Target Field',
  'NYM': 'Citi Field',
  'NYY': 'Yankee Stadium',
  'OAK': 'Oakland Coliseum',
  'PHI': 'Citizens Bank Park',
  'PIT': 'PNC Park',
  'SD': 'Petco Park',
  'SF': 'Oracle Park',
  'SEA': 'T-Mobile Park',
  'STL': 'Busch Stadium',
  'TB': 'Tropicana Field',
  'TEX': 'Globe Life Field',
  'TOR': 'Rogers Centre',
  'WSH': 'Nationals Park'
};

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in miles
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Get distance between two stadiums
 * @param {string} stadium1 - Name of first stadium
 * @param {string} stadium2 - Name of second stadium
 * @returns {number|null} Distance in miles, or null if stadium not found
 */
export function getStadiumDistance(stadium1, stadium2) {
  const coords1 = STADIUM_COORDINATES[stadium1];
  const coords2 = STADIUM_COORDINATES[stadium2];
  
  if (!coords1 || !coords2) {
    console.warn(`Stadium coordinates not found: ${stadium1} or ${stadium2}`);
    return null;
  }
  
  return Math.round(calculateDistance(coords1.lat, coords1.lng, coords2.lat, coords2.lng));
}

/**
 * Get distance between two teams (using their home stadiums)
 * @param {string} team1 - First team abbreviation
 * @param {string} team2 - Second team abbreviation
 * @returns {number|null} Distance in miles
 */
export function getTeamDistance(team1, team2) {
  const stadium1 = TEAM_TO_STADIUM[team1];
  const stadium2 = TEAM_TO_STADIUM[team2];
  
  if (!stadium1 || !stadium2) {
    console.warn(`Team stadium mapping not found: ${team1} or ${team2}`);
    return null;
  }
  
  return getStadiumDistance(stadium1, stadium2);
}

/**
 * Determine if a distance is considered "long travel"
 * @param {number} miles - Distance in miles
 * @returns {string} Travel category: 'local', 'regional', 'long', 'cross-country'
 */
export function categorizeTravelDistance(miles) {
  if (miles === null || miles === undefined) return 'unknown';
  if (miles < 300) return 'local';        // Same region/nearby cities
  if (miles < 800) return 'regional';     // Within same part of country
  if (miles < 1500) return 'long';        // Cross multiple states
  return 'cross-country';                 // Coast to coast
}

/**
 * Get all distances from a specific stadium
 * @param {string} stadium - Stadium name
 * @returns {Array} Array of {stadium, distance, category} objects
 */
export function getAllDistancesFrom(stadium) {
  const baseCoords = STADIUM_COORDINATES[stadium];
  if (!baseCoords) return [];
  
  return Object.keys(STADIUM_COORDINATES)
    .filter(s => s !== stadium)
    .map(targetStadium => {
      const distance = getStadiumDistance(stadium, targetStadium);
      return {
        stadium: targetStadium,
        distance,
        category: categorizeTravelDistance(distance),
        city: STADIUM_COORDINATES[targetStadium].city,
        state: STADIUM_COORDINATES[targetStadium].state
      };
    })
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Find the longest potential trips from each stadium
 * @returns {Object} Map of stadium to longest trip info
 */
export function getLongestTripsFromEachStadium() {
  const longestTrips = {};
  
  Object.keys(STADIUM_COORDINATES).forEach(stadium => {
    const distances = getAllDistancesFrom(stadium);
    const longest = distances[distances.length - 1];
    longestTrips[stadium] = longest;
  });
  
  return longestTrips;
}

/**
 * Get timezone difference between stadiums (hours)
 * @param {string} fromStadium - Origin stadium
 * @param {string} toStadium - Destination stadium
 * @returns {number} Time difference in hours (positive = destination is ahead)
 */
export function getTimezoneDifference(fromStadium, toStadium) {
  const fromTz = STADIUM_COORDINATES[fromStadium]?.timezone;
  const toTz = STADIUM_COORDINATES[toStadium]?.timezone;
  
  if (!fromTz || !toTz) return 0;
  
  // Simplified timezone offset mapping (EST = 0 baseline)
  const timezoneOffsets = {
    'America/New_York': 0,      // EST/EDT
    'America/Toronto': 0,       // EST/EDT  
    'America/Chicago': -1,      // CST/CDT
    'America/Denver': -2,       // MST/MDT
    'America/Phoenix': -2,      // MST (no DST)
    'America/Los_Angeles': -3   // PST/PDT
  };
  
  const fromOffset = timezoneOffsets[fromTz] || 0;
  const toOffset = timezoneOffsets[toTz] || 0;
  
  return toOffset - fromOffset;
}

/**
 * Assess travel difficulty
 * @param {number} distance - Distance in miles
 * @param {number} timezoneDiff - Timezone difference in hours
 * @returns {Object} Travel difficulty assessment
 */
export function assessTravelDifficulty(distance, timezoneDiff) {
  let difficultyScore = 0;
  let factors = [];
  
  // Distance factor
  if (distance >= 2500) {
    difficultyScore += 40;
    factors.push('Cross-country travel');
  } else if (distance >= 1500) {
    difficultyScore += 25;
    factors.push('Long-distance travel');
  } else if (distance >= 800) {
    difficultyScore += 15;
    factors.push('Regional travel');
  } else if (distance >= 300) {
    difficultyScore += 5;
    factors.push('Moderate travel');
  }
  
  // Timezone factor
  const absTimezoneDiff = Math.abs(timezoneDiff);
  if (absTimezoneDiff >= 3) {
    difficultyScore += 20;
    factors.push('3-hour timezone change');
  } else if (absTimezoneDiff >= 2) {
    difficultyScore += 12;
    factors.push('2-hour timezone change');
  } else if (absTimezoneDiff >= 1) {
    difficultyScore += 6;
    factors.push('1-hour timezone change');
  }
  
  // Determine difficulty level
  let level = 'minimal';
  if (difficultyScore >= 50) level = 'extreme';
  else if (difficultyScore >= 35) level = 'high';
  else if (difficultyScore >= 20) level = 'moderate';
  else if (difficultyScore >= 10) level = 'low';
  
  return {
    score: difficultyScore,
    level,
    factors,
    distance,
    timezoneDiff
  };
}

// Export common distance calculations for quick reference
export const COMMON_DISTANCES = {
  'coast_to_coast': ['Oakland Coliseum', 'Fenway Park', getStadiumDistance('Oakland Coliseum', 'Fenway Park')],
  'ny_to_la': ['Yankee Stadium', 'Dodger Stadium', getStadiumDistance('Yankee Stadium', 'Dodger Stadium')],
  'miami_to_seattle': ['LoanDepot Park', 'T-Mobile Park', getStadiumDistance('LoanDepot Park', 'T-Mobile Park')],
  'texas_to_toronto': ['Globe Life Field', 'Rogers Centre', getStadiumDistance('Globe Life Field', 'Rogers Centre')]
};