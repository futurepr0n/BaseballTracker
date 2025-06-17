/**
 * MLB Player Stat Loader with Game Score Updates and Roster Management
 *
 * This script reads player hitting and pitching statistics from specially named CSV files
 * and updates the corresponding daily schedule JSON file, including updating game scores.
 * It also updates the rosters.json file when new players are discovered.
 *
 * CSV Filename Format: TEAM_[hitting|pitching]_month_day_year_gameId.csv 
 * (e.g., ARI_hitting_april_24_2025_401695376.csv)
 *
 * Target JSON File: public/data/<year>/<month>/<month>_<day>_<year>.json
 * Rosters File: public/data/rosters.json
 *
 * Usage: node statLoader.js <path_to_csv_file>
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const playerMappingService = require('./playerMappingService');

// --- Configuration ---
const BASE_DATA_DIR = path.join('public', 'data');
const ROSTERS_FILE_PATH = path.join(__dirname, '..', '..', 'public', 'data', 'rosters.json');
// --- End Configuration ---

/**
 * Cleans player name by removing potential trailing position abbreviations.
 */
function cleanPlayerName(rawName) {
    if (!rawName) return '';
    const cleaned = rawName.replace(/[A-Z0-9\-]+$/, '').trim();
    return cleaned;
}

/**
 * Parses the stat value, ensuring it's a number.
 */
function parseStat(value) {
    if (value === undefined || value === null || value === '') return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
}

/**
 * Creates a shortened name from a full name (e.g., "John Smith" -> "J. Smith")
 */
function createShortName(fullName) {
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length < 2) return fullName;
    
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    
    return `${firstName.charAt(0)}. ${lastName}`;
}

/**
 * Updates the rosters.json file with any new players found in the stats
 * Now integrates with playerMappingService for team change detection
 */
function updateRostersFile(playersData, gameDate) {
    console.log('Checking for new players to add to rosters...');
    
    // Read existing rosters
    let rosters = [];
    try {
        if (fs.existsSync(ROSTERS_FILE_PATH)) {
            const rostersContent = fs.readFileSync(ROSTERS_FILE_PATH, 'utf8');
            rosters = JSON.parse(rostersContent);
            console.log(`Loaded ${rosters.length} existing players from rosters file`);
        } else {
            console.log('Rosters file not found, will create new one');
        }
    } catch (error) {
        console.error(`Error reading rosters file: ${error.message}`);
        return;
    }
    
    let newPlayersAdded = 0;
    let playersUpdated = 0;
    
    for (const player of playersData) {
        // Use player mapping service to find or create player
        const mappedPlayer = playerMappingService.findOrCreatePlayer(
            createShortName(player.name), 
            player.team, 
            player.name, 
            gameDate
        );
        
        if (!mappedPlayer) {
            console.warn(`Failed to create player mapping for ${player.name}`);
            continue;
        }
        
        // Check if player exists in rosters by playerId or name+team match
        let existingRosterIndex = -1;
        
        // First try to find by playerId
        if (mappedPlayer.playerId) {
            existingRosterIndex = rosters.findIndex(r => r.playerId === mappedPlayer.playerId);
        }
        
        // If not found by playerId, try name+team match (legacy lookup)
        if (existingRosterIndex === -1) {
            existingRosterIndex = rosters.findIndex(r => {
                const teamMatch = r.team === player.team;
                const nameMatch = r.fullName === player.name || 
                                 r.name === createShortName(player.name) ||
                                 r.fullName === createShortName(player.name) ||
                                 r.name === player.name;
                return teamMatch && nameMatch;
            });
        }
        
        if (existingRosterIndex >= 0) {
            // Update existing roster entry
            const existingRoster = rosters[existingRosterIndex];
            
            // Add playerId if missing
            if (!existingRoster.playerId) {
                existingRoster.playerId = mappedPlayer.playerId;
                playersUpdated++;
                console.log(`Added playerId ${mappedPlayer.playerId} to existing roster entry: ${player.name}`);
            }
            
            // Update team if changed
            if (existingRoster.team !== player.team) {
                console.log(`Updated team for ${player.name}: ${existingRoster.team} → ${player.team}`);
                existingRoster.team = player.team;
                playersUpdated++;
            }
            
            // Update fullName if we have more complete information
            if (!existingRoster.fullName || player.name.length > existingRoster.fullName.length) {
                existingRoster.fullName = player.name;
                playersUpdated++;
            }
        } else {
            // Create new roster entry
            const shortName = createShortName(player.name);
            
            const newRosterEntry = {
                playerId: mappedPlayer.playerId,
                name: shortName,
                team: player.team,
                type: player.playerType,
                fullName: player.name
            };
            
            // Add type-specific fields with placeholder values
            if (player.playerType === 'pitcher') {
                newRosterEntry.ph = "R"; // Default to right-handed, could be updated later
                newRosterEntry.pitches = []; // Empty array, to be populated later
            } else if (player.playerType === 'hitter') {
                newRosterEntry.bats = "R"; // Default to right-handed, could be updated later
                newRosterEntry.stats = {
                    "2024_Games": 0,
                    "2024_AB": 0,
                    "2024_R": 0,
                    "2024_H": 0,
                    "2024_2B": 0,
                    "2024_3B": 0,
                    "2024_HR": 0,
                    "2024_SB": 0,
                    "2024_BB": 0,
                    "2024_SO": 0,
                    "2024_AVG": 0,
                    "2024_SLG": 0,
                    "2024_OBP": 0,
                    "2024_OPS": 0
                };
            }
            
            rosters.push(newRosterEntry);
            newPlayersAdded++;
            console.log(`Added new player to roster: ${player.name} (${player.team}, ${player.playerType}) with ID ${mappedPlayer.playerId}`);
        }
    }
    
    if (newPlayersAdded > 0 || playersUpdated > 0) {
        try {
            // Sort rosters by name for consistency
            rosters.sort((a, b) => a.name.localeCompare(b.name));
            
            // Create directory if it doesn't exist
            const rostersDir = path.dirname(ROSTERS_FILE_PATH);
            createDirectoryIfNotExists(rostersDir);
            
            fs.writeFileSync(ROSTERS_FILE_PATH, JSON.stringify(rosters, null, 2));
            console.log(`Successfully updated rosters file: ${newPlayersAdded} new players, ${playersUpdated} updated`);
        } catch (error) {
            console.error(`Error writing updated rosters file: ${error.message}`);
        }
    } else {
        console.log('No changes needed for rosters file');
    }
}

/**
 * Process hitting stats from a CSV file
 */
function processHittingStats(csvRecords, teamAbbreviation, gameId) {
    const playersData = [];
    
    for (const record of csvRecords) {
        const rawPlayerName = record.player || record.hitters;
        
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
            gameId: gameId,  // Add gameId to player stats
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
 */
function processPitchingStats(csvRecords, teamAbbreviation, gameId) {
    const playersData = [];
    
    for (const record of csvRecords) {
        const rawPlayerName = record.player || record.pitchers;
        
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
            gameId: gameId,  // Add gameId to player stats
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
 * Calculates team runs from player statistics for a specific game
 */
function calculateTeamRunsForGame(players, teamAbbreviation, gameId) {
    // Filter players who belong to the specified team and game
    const teamPlayers = players.filter(player => 
        player.team === teamAbbreviation && player.gameId === gameId
    );
    
    const teamHitters = teamPlayers.filter(player => player.playerType === 'hitter');
    
    if (teamHitters.length > 0) {
        console.log(`Found ${teamHitters.length} hitters for team ${teamAbbreviation} in game ${gameId}`);
    }
    
    const totalRuns = teamHitters.reduce((sum, player) => {
        const runs = typeof player.R === 'number' ? player.R : 
                    (player.R === 'DNP' ? 0 : parseInt(player.R) || 0);
        return sum + runs;
    }, 0);
    
    console.log(`Calculated ${totalRuns} total runs for team ${teamAbbreviation} in game ${gameId}`);
    
    return totalRuns;
}

/**
 * Updates game scores in the JSON data
 */
function updateGameScores(jsonData, allPlayers, gameId) {
    if (!jsonData.games || !Array.isArray(jsonData.games) || jsonData.games.length === 0) {
        console.warn("No games found in JSON data to update scores.");
        return jsonData;
    }
    
    // Find the game with matching gameId (stored in originalId)
    const game = jsonData.games.find(g => g.originalId === parseInt(gameId));
    
    if (!game) {
        console.warn(`No game found with originalId matching gameId ${gameId}`);
        return jsonData;
    }
    
    console.log(`Found game: ${game.awayTeam} @ ${game.homeTeam} (gameId: ${gameId})`);
    
    // Calculate runs for this specific game
    const homeRuns = calculateTeamRunsForGame(allPlayers, game.homeTeam, gameId);
    const awayRuns = calculateTeamRunsForGame(allPlayers, game.awayTeam, gameId);
    
    // Update scores
    if (homeRuns >= 0) {
        game.homeScore = homeRuns;
        console.log(`Updated ${game.homeTeam} score to ${homeRuns}`);
    }
    
    if (awayRuns >= 0) {
        game.awayScore = awayRuns;
        console.log(`Updated ${game.awayTeam} score to ${awayRuns}`);
    }
    
    // Update status if we have both scores
    if (game.homeScore !== null && game.awayScore !== null && 
        (game.homeScore > 0 || game.awayScore > 0) && 
        game.status === "Scheduled") {
        game.status = "Final";
        console.log(`Updated game status to Final: ${game.awayTeam} ${game.awayScore} @ ${game.homeTeam} ${game.homeScore}`);
    }
    
    return jsonData;
}

/**
 * Create directory if it doesn't exist
 */
function createDirectoryIfNotExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        try {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`Created directory: ${dirPath}`);
        } catch (error) {
            console.error(`Failed to create directory ${dirPath}: ${error.message}`);
            throw error;
        }
    }
}

/**
 * Main function to process the CSV and update the JSON.
 */
function processStatsFile(csvFilePath) {
    console.log(`Processing stats file: ${csvFilePath}`);

    // 1. Validate and Parse CSV Filename
    const csvFileName = path.basename(csvFilePath);
    // Updated regex to match TEAM_hitting_month_day_year_gameId.csv
    const nameParts = csvFileName.match(/^([A-Z]{2,3})_(hitting|pitching)_(\w+)_(\d{1,2})_(\d{4})_(\d+)\.csv$/i);

    if (!nameParts) {
        console.error(`Error: Invalid CSV filename format: "${csvFileName}". Expected format: TEAM_[hitting|pitching]_month_day_year_gameId.csv`);
        process.exit(1);
    }

    const [, teamAbbreviation, statType, month, day, year, gameId] = nameParts;
    const monthLower = month.toLowerCase();
    const dayPadded = day.padStart(2, '0');

    console.log(`Parsed info: Team=${teamAbbreviation}, Type=${statType}, Year=${year}, Month=${monthLower}, Day=${dayPadded}, GameId=${gameId}`);

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
            columns: true,
            skip_empty_lines: true,
            trim: true
        });
    } catch (error) {
        console.error(`Error reading or parsing CSV file "${csvFilePath}": ${error.message}`);
        process.exit(1);
    }

    // 5. Process CSV Records into Player Stats Objects
    let playersData = [];
    if (statType.toLowerCase() === 'hitting') {
        playersData = processHittingStats(csvRecords, teamAbbreviation, gameId);
    } else if (statType.toLowerCase() === 'pitching') {
        playersData = processPitchingStats(csvRecords, teamAbbreviation, gameId);
    } else {
        console.error(`Unknown stat type: ${statType}`);
        process.exit(1);
    }

    if (playersData.length === 0) {
        console.warn(`Warning: No valid player data found in CSV file "${csvFileName}".`);
    } else {
        console.log(`Extracted ${statType} stats for ${playersData.length} players.`);
    }

    // 6. Update Rosters File with New Players
    const gameDate = `${year}-${monthLower === 'january' ? '01' : monthLower === 'february' ? '02' : monthLower === 'march' ? '03' : monthLower === 'april' ? '04' : monthLower === 'may' ? '05' : monthLower === 'june' ? '06' : monthLower === 'july' ? '07' : monthLower === 'august' ? '08' : monthLower === 'september' ? '09' : monthLower === 'october' ? '10' : monthLower === 'november' ? '11' : '12'}-${dayPadded}`;
    updateRostersFile(playersData, gameDate);

    // 7. Read Existing JSON Data
    let jsonData;
    try {
        const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
        jsonData = JSON.parse(jsonContent);
    } catch (error) {
        console.error(`Error reading or parsing JSON file "${jsonFilePath}": ${error.message}`);
        process.exit(1);
    }

    // 8. Update JSON Data - Merging with existing players
    if (!jsonData.players) {
        jsonData.players = [];
    }
    
    const existingPlayers = jsonData.players;
    
    for (const newPlayer of playersData) {
        // For each new player, check if they already exist (same name, team, type, and gameId)
        const existingPlayerIndex = existingPlayers.findIndex(
            p => p.name === newPlayer.name && 
                 p.team === newPlayer.team && 
                 p.gameId === newPlayer.gameId &&
                 (p.playerType === newPlayer.playerType || (!p.playerType && statType.toLowerCase() === 'hitting'))
        );
        
        if (existingPlayerIndex >= 0) {
            console.log(`Updating stats for existing player: ${newPlayer.name} (game ${gameId})`);
            existingPlayers[existingPlayerIndex] = { 
                ...existingPlayers[existingPlayerIndex], 
                ...newPlayer 
            };
        } else {
            console.log(`Adding new player: ${newPlayer.name} (game ${gameId})`);
            existingPlayers.push(newPlayer);
        }
    }
    
    jsonData.players = existingPlayers;
    console.log(`JSON now contains ${jsonData.players.length} total players`);

    // 9. Update game scores based on player statistics
    console.log("Starting game score update process...");
    
    // First, update originalId to use gameId if not already done
    const gameToUpdate = jsonData.games.find(g => 
        g.originalId === parseInt(gameId) || 
        (g.homeTeam === teamAbbreviation.toUpperCase() || g.awayTeam === teamAbbreviation.toUpperCase())
    );
    
    if (gameToUpdate && gameToUpdate.originalId !== parseInt(gameId)) {
        console.log(`Updating originalId from ${gameToUpdate.originalId} to ${gameId}`);
        gameToUpdate.originalId = parseInt(gameId);
    }
    
    // Update game scores
    jsonData = updateGameScores(jsonData, jsonData.players, gameId);

    // 10. Write Updated JSON Data Back to File
    try {
        fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2));
        console.log(`Successfully updated JSON file: "${jsonFilePath}"`);
    } catch (error) {
        console.error(`Error writing updated JSON file "${jsonFilePath}": ${error.message}`);
        process.exit(1);
    }
}

// --- Script Execution ---

const args = process.argv.slice(2);
if (args.length !== 1) {
    console.error('Usage: node statLoader.js <path_to_csv_file>');
    process.exit(1);
}

const csvFilePath = args[0];

try {
    if (!fs.existsSync(csvFilePath) || !fs.statSync(csvFilePath).isFile()) {
         console.error(`Error: CSV file not found or is not a file: "${csvFilePath}"`);
         process.exit(1);
    }
} catch (error) {
     console.error(`Error accessing CSV file "${csvFilePath}": ${error.message}`);
     process.exit(1);
}

processStatsFile(csvFilePath);

console.log('Stat loading process finished.');