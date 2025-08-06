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
 * Target JSON File: <DATA_PATH>/<year>/<month>/<month>_<day>_<year>.json
 * Rosters File: <DATA_PATH>/rosters.json
 *
 * Usage: node statLoader.js <path_to_csv_file>
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const gameIdValidator = require('../../utils/gameIdValidator');
const doubleheaderValidator = require('../../utils/doubleheaderValidator');
const playerMappingService = require('./playerMappingService');
const { detectEnhancedDuplicatesWithPrevention } = require('./enhancedDuplicateDetection');
const { acquireProcessingLock, releaseProcessingLock, cleanupStaleLocks } = require('./processingLockManager');

// Import centralized data path configuration
const { DATA_PATH } = require('../../config/dataPath');

// --- Configuration ---
const BASE_DATA_DIR = DATA_PATH;

// Enhanced duplicate detection configuration
const ENHANCED_CONFIG = {
  // Processing tracking
  PROCESSING_LOG_FILE: 'scripts/data-validation/processing_log.json',
  BACKUP_DIR: 'backups/statloader_backups',
  
  // Duplicate detection settings
  ENABLE_ENHANCED_VALIDATION: true,
  ENABLE_PROCESSING_TRACKING: true,
  ENABLE_AUTOMATIC_BACKUP: true,
  
  // Suspicious date ranges (known corruption periods)
  SUSPICIOUS_DATE_RANGES: [
    { start: '2025-07-02', end: '2025-07-09', reason: 'Known systematic corruption period' }
  ],
  
  // Validation thresholds
  VALIDATION_THRESHOLDS: {
    MAX_REASONABLE_HITS_PER_GAME: 6,
    MAX_REASONABLE_HR_PER_GAME: 4,
    MIN_REASONABLE_AB_FOR_HITS: 1
  }
};
const ROSTERS_FILE_PATH = path.join(DATA_PATH, 'rosters.json');
// --- End Configuration ---

// --- Enhanced Validation Utilities ---

/**
 * Load processing log to track which CSV files have been processed
 * @returns {object} Processing log data
 */
function loadProcessingLog() {
  try {
    if (fs.existsSync(ENHANCED_CONFIG.PROCESSING_LOG_FILE)) {
      const logData = JSON.parse(fs.readFileSync(ENHANCED_CONFIG.PROCESSING_LOG_FILE, 'utf8'));
      return logData;
    }
  } catch (error) {
    console.warn('Warning: Could not load processing log:', error.message);
  }
  
  return {
    processedFiles: {},
    lastUpdated: null,
    version: '1.0'
  };
}

/**
 * Save processing log after successful processing
 * @param {object} logData - Processing log data
 * @param {string} csvFilePath - CSV file path that was processed
 * @param {string} gameId - Game ID processed
 */
function saveProcessingLog(logData, csvFilePath, gameId) {
  try {
    // Ensure directory exists
    const logDir = path.dirname(ENHANCED_CONFIG.PROCESSING_LOG_FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Update log data
    const fileStats = fs.statSync(csvFilePath);
    logData.processedFiles[csvFilePath] = {
      gameId: gameId,
      processedAt: new Date().toISOString(),
      fileSize: fileStats.size,
      fileModified: fileStats.mtime.toISOString(),
      checksum: generateFileChecksum(csvFilePath)
    };
    logData.lastUpdated = new Date().toISOString();
    
    fs.writeFileSync(ENHANCED_CONFIG.PROCESSING_LOG_FILE, JSON.stringify(logData, null, 2));
  } catch (error) {
    console.warn('Warning: Could not save processing log:', error.message);
  }
}

/**
 * Generate simple checksum for CSV file to detect changes
 * @param {string} filePath - File path
 * @returns {string} Simple checksum
 */
function generateFileChecksum(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return `${stats.size}_${stats.mtime.getTime()}`;
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Check if CSV file has already been processed
 * @param {object} logData - Processing log data
 * @param {string} csvFilePath - CSV file path
 * @returns {boolean} True if file already processed
 */
function isFileAlreadyProcessed(logData, csvFilePath) {
  if (!ENHANCED_CONFIG.ENABLE_PROCESSING_TRACKING) {
    return false;
  }
  
  const processedFile = logData.processedFiles[csvFilePath];
  if (!processedFile) {
    return false;
  }
  
  // Check if file has been modified since processing
  const currentChecksum = generateFileChecksum(csvFilePath);
  return processedFile.checksum === currentChecksum;
}

/**
 * Create backup of JSON file before modification
 * @param {string} jsonFilePath - JSON file path
 * @returns {string|null} Backup file path or null if backup failed
 */
function createJsonBackup(jsonFilePath) {
  if (!ENHANCED_CONFIG.ENABLE_AUTOMATIC_BACKUP) {
    return null;
  }
  
  try {
    // Ensure backup directory exists
    if (!fs.existsSync(ENHANCED_CONFIG.BACKUP_DIR)) {
      fs.mkdirSync(ENHANCED_CONFIG.BACKUP_DIR, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${path.basename(jsonFilePath, '.json')}_backup_${timestamp}.json`;
    const backupPath = path.join(ENHANCED_CONFIG.BACKUP_DIR, backupFileName);
    
    fs.copyFileSync(jsonFilePath, backupPath);
    console.log(`📄 Created backup: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.warn('Warning: Could not create backup:', error.message);
    return null;
  }
}

/**
 * Validate game ID for potential issues
 * @param {string} gameId - Game ID to validate
 * @param {string} date - Game date
 * @returns {object} Validation result
 */
function validateGameId(gameId, date) {
  const validation = gameIdValidator.isValidGameId(gameId);
  const analysis = gameIdValidator.analyzeGameIdPattern(gameId, { date });
  
  return {
    isValid: validation.isValid,
    isSuspicious: analysis.isSuspicious,
    confidence: analysis.confidence,
    warnings: analysis.suspiciousReasons || [],
    recommendation: analysis.isSuspicious ? 'investigate' : 'proceed'
  };
}

/**
 * Check if date falls within suspicious ranges
 * @param {string} date - Date to check
 * @returns {object|null} Suspicious range info or null
 */
function checkSuspiciousDate(date) {
  for (const range of ENHANCED_CONFIG.SUSPICIOUS_DATE_RANGES) {
    if (date >= range.start && date <= range.end) {
      return range;
    }
  }
  return null;
}

/**
 * Validate player statistics for reasonableness
 * @param {object} player - Player data
 * @returns {Array} Array of validation warnings
 */
function validatePlayerStats(player) {
  const warnings = [];
  const hits = parseInt(player.H) || 0;
  const ab = parseInt(player.AB) || 0;
  const hr = parseInt(player.HR) || 0;
  
  if (hits > ENHANCED_CONFIG.VALIDATION_THRESHOLDS.MAX_REASONABLE_HITS_PER_GAME) {
    warnings.push(`Unusually high hits: ${hits} (max reasonable: ${ENHANCED_CONFIG.VALIDATION_THRESHOLDS.MAX_REASONABLE_HITS_PER_GAME})`);
  }
  
  if (hr > ENHANCED_CONFIG.VALIDATION_THRESHOLDS.MAX_REASONABLE_HR_PER_GAME) {
    warnings.push(`Unusually high HRs: ${hr} (max reasonable: ${ENHANCED_CONFIG.VALIDATION_THRESHOLDS.MAX_REASONABLE_HR_PER_GAME})`);
  }
  
  if (hits > 0 && ab === 0) {
    warnings.push(`Impossible stats: ${hits} hits with 0 at-bats`);
  }
  
  return warnings;
}

/**
 * Enhanced duplicate detection with sophisticated logic
 * @param {Array} existingPlayers - Existing players in JSON
 * @param {object} newPlayer - New player to check
 * @param {string} gameId - Game ID being processed
 * @param {string} date - Game date
 * @returns {object} Duplicate analysis result
 */
function detectEnhancedDuplicates(existingPlayers, newPlayer, gameId, date) {
  const result = {
    isDuplicate: false,
    duplicateType: null,
    duplicateIndex: -1,
    action: 'add',
    warnings: [],
    confidence: 1.0
  };
  
  // Find existing player with same name and team
  const existingPlayerIndex = existingPlayers.findIndex(p => 
    p.name === newPlayer.name && 
    p.team === newPlayer.team &&
    (p.playerType === newPlayer.playerType || (!p.playerType && newPlayer.playerType === 'hitter'))
  );
  
  if (existingPlayerIndex >= 0) {
    const existingPlayer = existingPlayers[existingPlayerIndex];
    
    // Check for exact duplicate (same gameId)
    if (existingPlayer.gameId === newPlayer.gameId) {
      result.isDuplicate = true;
      result.duplicateType = 'exact_duplicate';
      result.duplicateIndex = existingPlayerIndex;
      result.action = 'update';
      result.warnings.push('Exact duplicate found - updating existing record');
      return result;
    }
    
    // Check for suspicious cross-date duplicate
    const suspiciousDate = checkSuspiciousDate(date);
    if (suspiciousDate) {
      result.warnings.push(`Processing file in suspicious date range: ${suspiciousDate.reason}`);
      result.confidence = 0.7;
      
      // In suspicious date ranges, be more cautious about duplicates
      if (existingPlayer.gameId && 
          Math.abs(parseInt(existingPlayer.gameId) - parseInt(newPlayer.gameId)) < 100) {
        result.isDuplicate = true;
        result.duplicateType = 'suspicious_cross_date';
        result.duplicateIndex = existingPlayerIndex;
        result.action = 'skip';
        result.warnings.push('Potential cross-date duplicate in suspicious period - skipping');
        return result;
      }
    }
    
    // Check for doubleheader legitimacy if different gameIds
    if (existingPlayer.gameId !== newPlayer.gameId) {
      // This could be a legitimate doubleheader
      result.warnings.push('Player appears in multiple games - possible doubleheader');
      result.action = 'add';
      result.confidence = 0.8;
    }
  }
  
  return result;
}

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
 * Main function to process the CSV and update the JSON with enhanced validation.
 */
async function processStatsFile(csvFilePath) {
    console.log(`🔄 Processing stats file: ${csvFilePath}`);

    // Load processing log (needed for various validations)
    let processingLog = null;

    // 0. Enhanced Pre-Processing Validation
    if (ENHANCED_CONFIG.ENABLE_ENHANCED_VALIDATION) {
        console.log('🛡️  Enhanced validation enabled');
        
        // Load processing log
        processingLog = loadProcessingLog();
        
        // Check if file already processed
        if (isFileAlreadyProcessed(processingLog, csvFilePath)) {
            console.log(`⏭️  File already processed and unchanged: ${csvFilePath}`);
            console.log('   To reprocess, delete or modify the CSV file');
            return;
        }
    }

    // 1. Validate and Parse CSV Filename
    const csvFileName = path.basename(csvFilePath);
    // Updated regex to match TEAM_hitting_month_day_year_gameId.csv
    const nameParts = csvFileName.match(/^([A-Z]{2,3})_(hitting|pitching)_(\w+)_(\d{1,2})_(\d{4})_(\d+)\.csv$/i);

    if (!nameParts) {
        console.error(`❌ Error: Invalid CSV filename format: "${csvFileName}". Expected format: TEAM_[hitting|pitching]_month_day_year_gameId.csv`);
        process.exit(1);
    }

    const [, teamAbbreviation, statType, month, day, year, gameId] = nameParts;
    const monthLower = month.toLowerCase();
    const dayPadded = day.padStart(2, '0');
    const gameDate = `${year}-${month.padStart(2, '0')}-${dayPadded}`;

    console.log(`📊 Parsed info: Team=${teamAbbreviation}, Type=${statType}, Year=${year}, Month=${monthLower}, Day=${dayPadded}, GameId=${gameId}, Date=${gameDate}`);

    // 1.5. Enhanced Game ID Validation (relaxed for edge cases)
    if (ENHANCED_CONFIG.ENABLE_ENHANCED_VALIDATION) {
        const gameIdValidation = validateGameId(gameId, gameDate);
        
        if (!gameIdValidation.isValid) {
            console.warn(`⚠️  Game ID validation warning: ${gameId} - ${gameIdValidation.warnings.join(', ')}`);
            console.warn('   Continuing processing (validation relaxed for edge cases)');
            // Continue processing instead of exiting - some games have unusual circumstances
        }
        
        if (gameIdValidation.isSuspicious) {
            console.warn(`⚠️  Suspicious game ID detected: ${gameId}`);
            gameIdValidation.warnings.forEach(warning => 
                console.warn(`   - ${warning}`)
            );
            
            if (gameIdValidation.recommendation === 'investigate') {
                console.warn('   Proceeding with caution...');
            }
        }
        
        // Check for suspicious date ranges
        const suspiciousDate = checkSuspiciousDate(gameDate);
        if (suspiciousDate) {
            console.warn(`⚠️  Processing file in known problem period: ${suspiciousDate.reason}`);
            console.warn('   Enhanced duplicate detection will be applied');
        }
    }

    // 2. Construct Target JSON File Path
    const jsonFilePath = path.join(BASE_DATA_DIR, year, monthLower, `${monthLower}_${dayPadded}_${year}.json`);
    console.log(`📁 Target JSON file: ${jsonFilePath}`);

    // 3. Check if JSON File Exists
    if (!fs.existsSync(jsonFilePath)) {
        console.error(`❌ Error: Target JSON file not found: "${jsonFilePath}". Please ensure the schedule generator has run for this date.`);
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

    // 7.5. Create backup before modification
    if (ENHANCED_CONFIG.ENABLE_AUTOMATIC_BACKUP) {
        createJsonBackup(jsonFilePath);
    }

    // 8. Enhanced JSON Data Update with intelligent duplicate detection
    if (!jsonData.players) {
        jsonData.players = [];
    }
    
    const existingPlayers = jsonData.players;
    let playersAdded = 0;
    let playersUpdated = 0;
    let playersSkipped = 0;
    const validationWarnings = [];
    
    console.log(`🔍 Processing ${playersData.length} players with enhanced duplicate detection...`);
    
    for (const newPlayer of playersData) {
        // Enhanced player statistics validation
        if (ENHANCED_CONFIG.ENABLE_ENHANCED_VALIDATION) {
            const statsWarnings = validatePlayerStats(newPlayer);
            if (statsWarnings.length > 0) {
                console.warn(`⚠️  Player stats validation warnings for ${newPlayer.name}:`);
                statsWarnings.forEach(warning => console.warn(`   - ${warning}`));
                validationWarnings.push({
                    player: newPlayer.name,
                    warnings: statsWarnings
                });
            }
        }
        
        // Enhanced duplicate detection with prevention logic
        if (!processingLog) {
            processingLog = loadProcessingLog();
        }
        const duplicateAnalysis = detectEnhancedDuplicatesWithPrevention(
            existingPlayers, 
            newPlayer, 
            gameId, 
            gameDate,
            csvFilePath,
            processingLog
        );
        
        // Log warnings from duplicate analysis
        if (duplicateAnalysis.warnings.length > 0) {
            duplicateAnalysis.warnings.forEach(warning => 
                console.warn(`⚠️  ${newPlayer.name}: ${warning}`)
            );
        }
        
        // Take action based on duplicate analysis
        switch (duplicateAnalysis.action) {
            case 'update':
                console.log(`🔄 Updating existing player: ${newPlayer.name} (game ${gameId})`);
                existingPlayers[duplicateAnalysis.duplicateIndex] = { 
                    ...existingPlayers[duplicateAnalysis.duplicateIndex], 
                    ...newPlayer 
                };
                playersUpdated++;
                break;
                
            case 'add':
                console.log(`➕ Adding new player: ${newPlayer.name} (game ${gameId})`);
                existingPlayers.push(newPlayer);
                playersAdded++;
                break;
                
            case 'skip':
                console.warn(`🚫 DUPLICATE PREVENTED: ${newPlayer.name} (${duplicateAnalysis.duplicateType})`);
                console.warn(`   📋 Reason: ${duplicateAnalysis.warnings.join(', ')}`);
                console.warn(`   🎯 Confidence: ${(duplicateAnalysis.confidence * 100).toFixed(1)}%`);
                playersSkipped++;
                break;
                
            default:
                console.warn(`❓ Unknown action for player: ${newPlayer.name} - adding by default`);
                existingPlayers.push(newPlayer);
                playersAdded++;
        }
    }
    
    jsonData.players = existingPlayers;
    
    // Enhanced processing summary
    console.log(`✅ Enhanced processing complete:`);
    console.log(`   📊 Total players in JSON: ${jsonData.players.length}`);
    console.log(`   ➕ Players added: ${playersAdded}`);
    console.log(`   🔄 Players updated: ${playersUpdated}`);
    console.log(`   ⏭️  Players skipped: ${playersSkipped}`);
    
    if (validationWarnings.length > 0) {
        console.log(`   ⚠️  Validation warnings: ${validationWarnings.length}`);
    }
    
    if (playersSkipped > 0) {
        console.warn(`   🚨 ${playersSkipped} players were skipped due to suspected duplicates`);
        console.warn(`   This may indicate data quality issues requiring investigation`);
    }

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
        console.log(`✅ Successfully updated JSON file: "${jsonFilePath}"`);
    } catch (error) {
        console.error(`❌ Error writing updated JSON file "${jsonFilePath}": ${error.message}`);
        process.exit(1);
    }
    
    // 11. Enhanced Post-Processing Tasks
    if (ENHANCED_CONFIG.ENABLE_PROCESSING_TRACKING) {
        // Update processing log
        if (!processingLog) {
            processingLog = loadProcessingLog();
        }
        saveProcessingLog(processingLog, csvFilePath, gameId);
        console.log(`📝 Updated processing log`);
    }
    
    // Final enhanced summary
    console.log(`🎯 Processing Summary for ${csvFileName}:`);
    console.log(`   📅 Date: ${gameDate}`);
    console.log(`   🆔 Game ID: ${gameId}`);
    console.log(`   🏃 Players Added: ${playersAdded}`);
    console.log(`   🔄 Players Updated: ${playersUpdated}`);
    console.log(`   ⏭️  Players Skipped: ${playersSkipped}`);
    
    if (validationWarnings.length > 0) {
        console.log(`   ⚠️  Validation Issues: ${validationWarnings.length} players had warnings`);
    }
    
    if (playersSkipped > 0 || validationWarnings.length > 0) {
        console.log(`💡 Recommendation: Review processing logs and consider running duplicate detection analysis`);
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

// Enhanced processing with lock management
async function main() {
    try {
        // Clean up any stale locks from previous runs
        cleanupStaleLocks();
        
        // Acquire processing lock to prevent concurrent processing
        const lockAcquired = await acquireProcessingLock(csvFilePath);
        if (!lockAcquired) {
            console.error('❌ Could not acquire processing lock - file may be currently processing');
            process.exit(1);
        }
        
        // Process the file
        await processStatsFile(csvFilePath);
        
        console.log('✅ Stat loading process finished successfully.');
        
    } catch (error) {
        console.error('❌ Error during stat loading:', error.message);
        process.exit(1);
    } finally {
        // Always release the lock
        releaseProcessingLock(csvFilePath);
    }
}

// Run the enhanced main function
main().catch(error => {
    console.error('❌ Fatal error:', error.message);
    releaseProcessingLock(csvFilePath);
    process.exit(1);
});