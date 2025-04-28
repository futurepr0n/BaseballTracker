/**
 * MLB Player Stat Loader with Game Score Updates
 *
 * This script reads player hitting and pitching statistics from specially named CSV files
 * and updates the corresponding daily schedule JSON file, including updating game scores.
 *
 * CSV Filename Format: TEAM_[hitting|pitching]_month_day_year.csv 
 * (e.g., ARI_hitting_april_24_2025.csv, ARI_pitching_april_24_2025.csv)
 *
 * Target JSON File: public/data/<year>/<month>/<month>_<day>_<year>.json
 *
 * Usage: node statLoader.js <path_to_csv_file>
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync'); // Using sync parser for simplicity

// --- Configuration ---
const BASE_DATA_DIR = path.join('public', 'data');
// --- End Configuration ---

/**
 * Cleans player name by removing potential trailing position abbreviations.
 * Handles cases like "X. EdwardsSS", "J. SánchezCF-RF", "aD. MyersPH-CF".
 * @param {string} rawName - The name string from the CSV (e.g., "X. EdwardsSS")
 * @returns {string} The cleaned player name (e.g., "X. Edwards")
 */
function cleanPlayerName(rawName) {
    if (!rawName) return '';
    // Remove trailing sequences of uppercase letters, numbers, and hyphens (common position indicators)
    // This regex attempts to remove common patterns like SS, CF, RF, PH-CF, PR-3B, 1B etc. from the end.
    // It's not perfect for all edge cases but covers many common baseball notations.
    const cleaned = rawName.replace(/[A-Z0-9\-]+$/, '').trim();
    // Handle potential leading indicators like 'a' for pinch hitter, 'b' etc. if needed
    return cleaned;
}

/**
 * Parses the stat value, ensuring it's a number.
 * @param {string} value - The stat value from the CSV.
 * @returns {number} The parsed number, or 0 if parsing fails.
 */
function parseStat(value) {
    if (value === undefined || value === null || value === '') return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
}

/**
 * Process hitting stats from a CSV file
 * @param {Array} csvRecords - The parsed CSV records
 * @param {string} teamAbbreviation - The team abbreviation
 * @returns {Array} Array of player hitting stats
 */
function processHittingStats(csvRecords, teamAbbreviation) {
    const playersData = [];
    
    for (const record of csvRecords) {
        const rawPlayerName = record.player || record.hitters; // Handle either column name
        
        // Skip the summary "team" row or empty rows
        if (!rawPlayerName || rawPlayerName.toLowerCase() === 'team') {
            continue;
        }
        
        const playerName = cleanPlayerName(rawPlayerName);
        if (!playerName) {
            console.warn(`Could not extract player name from: "${rawPlayerName}". Skipping row.`);
            continue;
        }
        
        const playerStats = {
            name: playerName,
            team: teamAbbreviation.toUpperCase(),
            playerType: 'hitter',
            AB: parseStat(record.ab || record.AB),
            R: parseStat(record.r || record.R),
            H: parseStat(record.h || record.H),
            RBI: parseStat(record.rbi || record.RBI),
            HR: parseStat(record.hr || record.HR),
            BB: parseStat(record.bb || record.BB),
            K: parseStat(record.k || record.K),
            AVG: parseFloat(record.avg || record.AVG || 0).toFixed(3),
            OBP: parseFloat(record.obp || record.OBP || 0).toFixed(3),
            SLG: parseFloat(record.slg || record.SLG || 0).toFixed(3)
        };
        
        playersData.push(playerStats);
    }
    
    return playersData;
}

/**
 * Process pitching stats from a CSV file
 * @param {Array} csvRecords - The parsed CSV records
 * @param {string} teamAbbreviation - The team abbreviation
 * @returns {Array} Array of player pitching stats
 */
function processPitchingStats(csvRecords, teamAbbreviation) {
    const playersData = [];
    
    for (const record of csvRecords) {
        const rawPlayerName = record.player || record.pitchers; // Handle either column name
        
        // Skip the summary "team" row or empty rows
        if (!rawPlayerName || rawPlayerName.toLowerCase() === 'team') {
            continue;
        }
        
        const playerName = cleanPlayerName(rawPlayerName);
        if (!playerName) {
            console.warn(`Could not extract player name from: "${rawPlayerName}". Skipping row.`);
            continue;
        }
        
        const playerStats = {
            name: playerName,
            team: teamAbbreviation.toUpperCase(),
            playerType: 'pitcher',
            IP: parseStat(record.ip || record.IP),
            H: parseStat(record.h || record.H),
            R: parseStat(record.r || record.R),
            ER: parseStat(record.er || record.ER),
            BB: parseStat(record.bb || record.BB),
            K: parseStat(record.k || record.K),
            HR: parseStat(record.hr || record.HR),
            PC_ST: record.pc_st || record.PC_ST || '',
            ERA: parseFloat(record.era || record.ERA || 0).toFixed(2)
        };
        
        playersData.push(playerStats);
    }
    
    return playersData;
}

/**
 * Calculates team runs from player statistics
 * @param {Array} players - Array of player statistics
 * @param {string} teamAbbreviation - Team abbreviation
 * @returns {number} Total runs scored by team
 */
function calculateTeamRuns(players, teamAbbreviation) {
    // Filter players who belong to the specified team
    const teamPlayers = players.filter(player => player.team === teamAbbreviation);
    
    // Sum up runs scored by hitters on this team
    const teamHitters = teamPlayers.filter(player => player.playerType === 'hitter');
    
    // Log the hitters found to help with debugging
    if (teamHitters.length > 0) {
        console.log(`Found ${teamHitters.length} hitters for team ${teamAbbreviation}`);
    }
    
    // Calculate total runs, ensuring we handle 'DNP' values properly
    const totalRuns = teamHitters.reduce((sum, player) => {
        // Player.R could be a number, 'DNP', null, or undefined
        const runs = typeof player.R === 'number' ? player.R : 
                    (player.R === 'DNP' ? 0 : parseInt(player.R) || 0);
        return sum + runs;
    }, 0);
    
    console.log(`Calculated ${totalRuns} total runs for team ${teamAbbreviation}`);
    
    return totalRuns;
}

/**
 * Updates game scores in the JSON data
 * @param {Object} jsonData - The parsed JSON data
 * @param {Array} allPlayers - Combined array of all player data
 * @returns {Object} Updated JSON data with game scores
 */
function updateGameScores(jsonData, allPlayers) {
    if (!jsonData.games || !Array.isArray(jsonData.games) || jsonData.games.length === 0) {
        console.warn("No games found in JSON data to update scores.");
        return jsonData;
    }
    
    // Track which teams have data processed
    const teamsWithStats = new Set(allPlayers.map(player => player.team));
    console.log(`Teams with stats available: ${Array.from(teamsWithStats).join(', ')}`);
    
    // Create a map to track total runs by team from player data
    const teamRunsMap = new Map();
    teamsWithStats.forEach(team => {
        const runs = calculateTeamRuns(allPlayers, team);
        if (runs > 0) { // Only add teams that scored runs (important indicator of actual game data)
            teamRunsMap.set(team, runs);
        }
    });
    console.log(`Teams with run data: ${Array.from(teamRunsMap.entries()).map(([team, runs]) => `${team}:${runs}`).join(', ')}`);
    
    // Track games that have been fully updated
    const updatedGames = new Set();
    
    // Check if we have enough teams with runs to indicate full data
    const haveFullData = teamRunsMap.size >= 2;
    
    // For each game in the JSON
    for (const game of jsonData.games) {
        const homeTeam = game.homeTeam;
        const awayTeam = game.awayTeam;
        
        // Skip games already processed
        const gameKey = `${homeTeam}-${awayTeam}`;
        if (updatedGames.has(gameKey)) {
            continue;
        }
        
        // Check if we have stats for both teams
        const homeRuns = teamRunsMap.get(homeTeam);
        const awayRuns = teamRunsMap.get(awayTeam);
        const haveHomeStats = homeRuns !== undefined;
        const haveAwayStats = awayRuns !== undefined;
        
        // Check if this is likely to be a valid game with stats
        const hasEitherTeamStats = haveHomeStats || haveAwayStats;
        
        // If we have stats for either team, attempt to update the score
        if (hasEitherTeamStats) {
            // Use the runs from our map if available, otherwise retain existing score
            const homeScore = haveHomeStats ? homeRuns : game.homeScore;
            const awayScore = haveAwayStats ? awayRuns : game.awayScore;
            
            // Update home team score
            if (homeScore !== null && (game.homeScore === null || haveHomeStats)) {
                game.homeScore = homeScore;
                console.log(`Updated ${homeTeam} score to ${homeScore}`);
            }
            
            // Update away team score
            if (awayScore !== null && (game.awayScore === null || haveAwayStats)) {
                game.awayScore = awayScore;
                console.log(`Updated ${awayTeam} score to ${awayScore}`);
            }
            
            // Check if we can update status to Final
            const bothScoresAvailable = game.homeScore !== null && game.awayScore !== null;
            const hasValidScores = game.homeScore > 0 || game.awayScore > 0; // At least one team scored
            
            if (bothScoresAvailable && hasValidScores && game.status === "Scheduled") {
                game.status = "Final";
                console.log(`Updated game status to Final: ${awayTeam} ${game.awayScore} @ ${homeTeam} ${game.homeScore}`);
            }
            
            // Mark this game as updated
            updatedGames.add(gameKey);
            
            console.log(`Game scores after update: ${awayTeam} ${game.awayScore} @ ${homeTeam} ${game.homeScore}`);
        } 
        // If we have full data but this game wasn't updated, it might be a postponed game
        else if (haveFullData && game.status === "Scheduled") {
            // For days with extensive data but this game has no player stats, 
            // this game might have been postponed or not played
            console.log(`Note: No stats found for scheduled game: ${awayTeam} @ ${homeTeam}`);
        }
    }
    
    return jsonData;
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
 * Main function to process the CSV and update the JSON.
 * @param {string} csvFilePath - Full path to the input CSV file.
 */
function processStatsFile(csvFilePath) {
    console.log(`Processing stats file: ${csvFilePath}`);

    // 1. Validate and Parse CSV Filename
    const csvFileName = path.basename(csvFilePath);
    // Updated regex to match both TEAM_hitting_month_day_year.csv and TEAM_pitching_month_day_year.csv
    const nameParts = csvFileName.match(/^([A-Z]{2,3})_(hitting|pitching)_(\w+)_(\d{1,2})_(\d{4})\.csv$/i);

    if (!nameParts) {
        console.error(`Error: Invalid CSV filename format: "${csvFileName}". Expected format: TEAM_[hitting|pitching]_month_day_year.csv (e.g., ARI_hitting_april_24_2025.csv)`);
        process.exit(1);
    }

    const [, teamAbbreviation, statType, month, day, year] = nameParts;
    const monthLower = month.toLowerCase();
    // Ensure day is zero-padded if needed for consistency, though path.join handles it.
    const dayPadded = day.padStart(2, '0');

    console.log(`Parsed info: Team=${teamAbbreviation}, Type=${statType}, Year=${year}, Month=${monthLower}, Day=${dayPadded}`);

    // 2. Construct Target JSON File Path
    const jsonFilePath = path.join(BASE_DATA_DIR, year, monthLower, `${monthLower}_${dayPadded}_${year}.json`);
    console.log(`Target JSON file: ${jsonFilePath}`);

    // 3. Check if JSON File Exists
    if (!fs.existsSync(jsonFilePath)) {
        console.error(`Error: Target JSON file not found: "${jsonFilePath}". Please ensure the schedule generator has run for this date.`);
        process.exit(1);
    }

    // 4. Read and Parse CSV Data
    let csvRecords;
    try {
        const csvContent = fs.readFileSync(csvFilePath, 'utf8');
        csvRecords = parse(csvContent, {
            columns: true,          // Use header row for keys
            skip_empty_lines: true, // Ignore empty lines
            trim: true              // Trim whitespace from values
        });
    } catch (error) {
        console.error(`Error reading or parsing CSV file "${csvFilePath}": ${error.message}`);
        process.exit(1);
    }

    // 5. Process CSV Records into Player Stats Objects based on the file type
    let playersData = [];
    if (statType.toLowerCase() === 'hitting') {
        playersData = processHittingStats(csvRecords, teamAbbreviation);
    } else if (statType.toLowerCase() === 'pitching') {
        playersData = processPitchingStats(csvRecords, teamAbbreviation);
    } else {
        console.error(`Unknown stat type: ${statType}`);
        process.exit(1);
    }

    if (playersData.length === 0) {
        console.warn(`Warning: No valid player data found in CSV file "${csvFileName}".`);
    } else {
        console.log(`Extracted ${statType} stats for ${playersData.length} players.`);
    }

    // 6. Read Existing JSON Data
    let jsonData;
    try {
        const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
        jsonData = JSON.parse(jsonContent);
    } catch (error) {
        console.error(`Error reading or parsing JSON file "${jsonFilePath}": ${error.message}`);
        process.exit(1);
    }

    // 7. Update JSON Data - Merging with existing players
    if (!jsonData.players) {
        jsonData.players = [];
    }
    
    // If there are already players in the file, we need to merge the data
    const existingPlayers = jsonData.players;
    
    for (const newPlayer of playersData) {
        // For each new player, check if they already exist in the file
        const existingPlayerIndex = existingPlayers.findIndex(
            p => p.name === newPlayer.name && p.team === newPlayer.team && 
                 (p.playerType === newPlayer.playerType || (!p.playerType && statType.toLowerCase() === 'hitting'))
        );
        
        if (existingPlayerIndex >= 0) {
            // Update existing player
            console.log(`Updating stats for existing player: ${newPlayer.name}`);
            existingPlayers[existingPlayerIndex] = { 
                ...existingPlayers[existingPlayerIndex], 
                ...newPlayer 
            };
        } else {
            // Add new player
            console.log(`Adding new player: ${newPlayer.name}`);
            existingPlayers.push(newPlayer);
        }
    }
    
    // Update the players array in the JSON data
    jsonData.players = existingPlayers;
    
    console.log(`JSON now contains ${jsonData.players.length} total players`);

    // 8. NEW: Update game scores based on player statistics
    console.log("Starting game score update process...");
    
    // Get a list of teams playing today
    const teamsPlayingToday = new Set();
    if (jsonData.games && jsonData.games.length > 0) {
        jsonData.games.forEach(game => {
            teamsPlayingToday.add(game.homeTeam);
            teamsPlayingToday.add(game.awayTeam);
        });
        console.log(`Teams scheduled to play: ${Array.from(teamsPlayingToday).join(', ')}`);
    }
    
    // Check if we're processing a team that's playing today
    if (teamsPlayingToday.has(teamAbbreviation)) {
        console.log(`Processing stats for ${teamAbbreviation}, which has a game scheduled for today`);
    }
    
    // Update game scores
    jsonData = updateGameScores(jsonData, jsonData.players);

    // 9. Write Updated JSON Data Back to File
    try {
        fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2));
        console.log(`Successfully updated JSON file: "${jsonFilePath}"`);
    } catch (error) {
        console.error(`Error writing updated JSON file "${jsonFilePath}": ${error.message}`);
        process.exit(1);
    }
}

// --- Script Execution ---

// Get CSV file path from command line arguments
const args = process.argv.slice(2); // Skip 'node' and script name
if (args.length !== 1) {
    console.error('Usage: node statLoader.js <path_to_csv_file>');
    process.exit(1);
}

const csvFilePath = args[0];

// Validate if the provided path is a file
try {
    if (!fs.existsSync(csvFilePath) || !fs.statSync(csvFilePath).isFile()) {
         console.error(`Error: CSV file not found or is not a file: "${csvFilePath}"`);
         process.exit(1);
    }
} catch (error) {
     console.error(`Error accessing CSV file "${csvFilePath}": ${error.message}`);
     process.exit(1);
}

// Run the main processing function
processStatsFile(csvFilePath);

console.log('Stat loading process finished.');