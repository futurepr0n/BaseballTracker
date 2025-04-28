
/**
 * MLB Schedule Generator
 *
 * This script fetches MLB schedule data from fixturedownload.com
 * and converts it to the format needed by our MLB Statistics Tracker app.
 * It creates daily schedule files with game information and an empty 'players' array
 * intended to be populated later with actual game statistics.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const YEAR = 2025;
const SCHEDULE_URL = `https://fixturedownload.com/feed/json/mlb-${YEAR}`;
const OUTPUT_DIR = path.join('public', 'data', `${YEAR}`);

// Team abbreviation mapping (fixturedownload format to our format)
const TEAM_MAPPING = {
  'Arizona Diamondbacks': 'ARI',
  'Atlanta Braves': 'ATL',
  'Baltimore Orioles': 'BAL',
  'Boston Red Sox': 'BOS',
  'Chicago Cubs': 'CHC',
  'Chicago White Sox': 'CWS',
  'Cincinnati Reds': 'CIN',
  'Cleveland Guardians': 'CLE',
  'Colorado Rockies': 'COL',
  'Detroit Tigers': 'DET',
  'Houston Astros': 'HOU',
  'Kansas City Royals': 'KC',
  'Los Angeles Angels': 'LAA',
  'Los Angeles Dodgers': 'LAD',
  'Miami Marlins': 'MIA',
  'Milwaukee Brewers': 'MIL',
  'Minnesota Twins': 'MIN',
  'New York Mets': 'NYM',
  'New York Yankees': 'NYY',
  'Oakland Athletics': 'OAK',
  'Philadelphia Phillies': 'PHI',
  'Pittsburgh Pirates': 'PIT',
  'San Diego Padres': 'SD',
  'San Francisco Giants': 'SF',
  'Seattle Mariners': 'SEA',
  'St. Louis Cardinals': 'STL',
  'Tampa Bay Rays': 'TB',
  'Texas Rangers': 'TEX',
  'Toronto Blue Jays': 'TOR',
  'Washington Nationals': 'WSH'
};

// Default venue mapping for each team
const VENUE_MAPPING = {
  'ARI': 'Chase Field',
  'ATL': 'Truist Park',
  'BAL': 'Camden Yards',
  'BOS': 'Fenway Park',
  'CHC': 'Wrigley Field',
  'CWS': 'Guaranteed Rate Field',
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

// Default attendance for games (placeholder, real data should replace this)
const DEFAULT_ATTENDANCE = 0; // Set to 0 or null as it's just a placeholder


/**
 * Fetch MLB schedule data from fixturedownload.com
 * @returns {Promise<Array>} Array of games
 */
function fetchSchedule() {
  return new Promise((resolve, reject) => {
    https.get(SCHEDULE_URL, (response) => {
      let data = '';

      // Handle potential redirect
      if (response.statusCode === 301 || response.statusCode === 302) {
          console.log(`Redirected to: ${response.headers.location}`);
          https.get(response.headers.location, (res) => handleResponse(res, resolve, reject))
              .on('error', (error) => reject(new Error(`Failed to fetch schedule after redirect: ${error.message}`)));
          return;
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        reject(new Error(`Failed to fetch schedule: Status Code ${response.statusCode}`));
        return;
      }

      handleResponse(response, resolve, reject);

    }).on('error', (error) => {
      reject(new Error(`Failed to fetch schedule: ${error.message}`));
    });
  });
}

/**
 * Helper function to handle HTTP response data stream
 */
function handleResponse(response, resolve, reject) {
    let data = '';
    response.setEncoding('utf8'); // Ensure correct encoding

    response.on('data', (chunk) => {
        data += chunk;
    });

    response.on('end', () => {
        try {
            const schedule = JSON.parse(data);
            // Filter out games with missing date or teams - optional safety check
            const validGames = schedule.filter(game => game.DateUtc && game.HomeTeam && game.AwayTeam);
            if (validGames.length !== schedule.length) {
                console.warn(`Filtered out ${schedule.length - validGames.length} games with missing data.`);
            }
            resolve(validGames);
        } catch (error) {
            console.error("Raw data received:", data.substring(0, 500) + "..."); // Log snippet of raw data on parse error
            reject(new Error(`Failed to parse schedule data: ${error.message}`));
        }
    });
}


/**
 * Group games by date
 * @param {Array} games - Array of games from fixturedownload
 * @returns {Object} Object with dates (YYYY-MM-DD) as keys and arrays of games as values
 */
function groupGamesByDate(games) {
  const gamesByDate = {};

  games.forEach(game => {
    if (!game.DateUtc) {
        console.warn(`Skipping game with missing DateUtc field.`);
        return;
    }
    // Ensure we ONLY use the date part (YYYY-MM-DD) for grouping
    // Use substring for robustness, assuming format YYYY-MM-DD...
    const gameDate = game.DateUtc.substring(0, 10);

    if (!gameDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        console.warn(`Skipping game with invalid date format: ${game.DateUtc}`);
        return; // Skip if the date format isn't YYYY-MM-DD
    }

    if (!gamesByDate[gameDate]) {
      gamesByDate[gameDate] = [];
    }

    // Convert team names to our abbreviations
    const homeTeam = TEAM_MAPPING[game.HomeTeam];
    const awayTeam = TEAM_MAPPING[game.AwayTeam];

    if (!homeTeam || !awayTeam) {
      console.warn(`Unknown team name found in game on ${gameDate}: Home='${game.HomeTeam}', Away='${game.AwayTeam}'. Skipping game.`);
      // Log the full mapping for debugging if needed
      // console.log("Current TEAM_MAPPING:", TEAM_MAPPING);
      return; // Skip this game
    }

    // Create game object in our format
    const gameObject = {
      homeTeam,
      awayTeam,
      homeScore: null,  // No score yet for scheduled games
      awayScore: null,  // No score yet for scheduled games
      status: 'Scheduled',
      venue: VENUE_MAPPING[homeTeam] || 'Unknown Venue', // Use mapping, provide fallback
      attendance: DEFAULT_ATTENDANCE, // Placeholder value
      originalId: game.MatchNumber,
      dateTime: game.DateUtc, // Keep the original full timestamp here
      round: game.RoundNumber
    };

    gamesByDate[gameDate].push(gameObject);
  });

  return gamesByDate;
}

/**
 * Create directory if it doesn't exist
 * @param {string} dirPath - Directory path
 */
function createDirectoryIfNotExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    try {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
    } catch (error) {
        console.error(`Failed to create directory ${dirPath}: ${error.message}`);
        throw error; // Re-throw to stop the script if directory creation fails
    }
  }
}

/**
 * Write game schedule data to JSON files (one file per date)
 * @param {Object} gamesByDate - Object with dates (YYYY-MM-DD) as keys and arrays of games as values
 */
function writeScheduleFiles(gamesByDate) {
  // Iterate over each date found in the schedule data
  Object.entries(gamesByDate).forEach(([dateStr, gamesForDate]) => {
    // dateStr is guaranteed to be YYYY-MM-DD because of groupGamesByDate

    // Extract year, month, day from the date string
    const [year, month, day] = dateStr.split('-'); // e.g., "2025", "04", "19"

    // Get month name (lowercase) using UTC to avoid timezone issues
     const monthName = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)))
        .toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })
        .toLowerCase();


    // Create month directory if it doesn't exist
    const monthDir = path.join(OUTPUT_DIR, monthName);
    try {
        createDirectoryIfNotExists(monthDir);
    } catch (error) {
        console.error(`Cannot proceed without directory ${monthDir}. Exiting.`);
        process.exit(1);
    }


    // Create file path with correct naming convention (month_day_year.json)
    // Example: public/data/2025/april/april_19_2025.json
    const filePath = path.join(monthDir, `${monthName}_${day}_${year}.json`);

    // --- CHANGE: Initialize players as an empty array ---
    let players = [];
    let existingPlayersData = null; // To store players data from existing file if needed

    // Check if file exists to potentially preserve existing player data
    if (fs.existsSync(filePath)) {
      try {
        const existingContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // Preserve existing player data if it exists and is an array
        if (existingContent && Array.isArray(existingContent.players)) {
            console.log(`Preserving existing player data for ${dateStr} in ${filePath}`);
            existingPlayersData = existingContent.players;
        } else {
            console.log(`Existing file found for ${dateStr} but no valid player data found. Will use empty array.`);
        }

        // Optionally preserve existing game data if it has scores
         if (existingContent.games && existingContent.games.some(g => g.homeScore !== null || g.awayScore !== null)) {
          console.log(`Preserving existing game data with scores for ${dateStr}`);
          gamesForDate = existingContent.games; // Overwrite fetched games with existing scored games
        } else {
             console.log(`Overwriting existing schedule game data (no scores found) for ${dateStr}`);
        }

      } catch (error) {
        console.error(`Error reading or parsing existing file ${filePath}: ${error.message}. Proceeding with fetched data and empty players array.`);
        // Reset gamesForDate in case it was modified above due to error
        // (This part depends on whether you trust the originally fetched 'gamesForDate' more after an error)
      }
    }

    // Use existing player data if preserved, otherwise use the empty array initialized earlier
    players = existingPlayersData !== null ? existingPlayersData : [];

    // Create the final content object for the JSON file
    const fileContent = {
      date: dateStr,       // The date in YYYY-MM-DD format
      games: gamesForDate, // Array of all game objects for this date (potentially from existing file if scored)
      players: players       // Empty array or preserved player data from existing file
    };


    // Write the combined data for the day to the single JSON file
    try {
        fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2));
        console.log(`Wrote schedule data for ${dateStr} to ${filePath}`);
    } catch (error) {
        console.error(`Error writing file ${filePath}: ${error.message}`);
    }
  });
}

/**
 * Main function
 */
async function main() {
  try {
    console.log(`Fetching MLB ${YEAR} schedule from ${SCHEDULE_URL}...`);
    const schedule = await fetchSchedule();

    if (!schedule || schedule.length === 0) {
        console.log('No schedule data fetched or data is empty. Exiting.');
        return;
    }

    console.log(`Processing ${schedule.length} valid games...`);
    const gamesByDate = groupGamesByDate(schedule);

    // Create base output directory if it doesn't exist
    try {
        createDirectoryIfNotExists(OUTPUT_DIR);
    } catch (error) {
        console.error(`Cannot create base output directory ${OUTPUT_DIR}. Exiting.`);
        process.exit(1);
    }


    console.log('Writing daily schedule files...');
    writeScheduleFiles(gamesByDate);

    console.log('Done!');
  } catch (error) {
    console.error(`Error in main function: ${error.message}`);
    // Add more detailed error logging if available (e.g., stack trace)
    if (error.stack) {
        console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();