/**
 * Player Mapping Service - Handles player identification across team changes
 * 
 * This service manages unique player IDs and tracks players across team changes,
 * name updates, and other roster movements. It provides functions to:
 * - Find or create unique player IDs
 * - Track team changes with date ranges
 * - Resolve player identities across different name formats
 * - Aggregate player data across all team affiliations
 */

const fs = require('fs');
const path = require('path');

const PLAYER_MAPPINGS_FILE = path.join(__dirname, '..', '..', 'public', 'data', 'playerMappings.json');

/**
 * Loads the player mappings from file
 */
function loadPlayerMappings() {
    try {
        if (fs.existsSync(PLAYER_MAPPINGS_FILE)) {
            const content = fs.readFileSync(PLAYER_MAPPINGS_FILE, 'utf8');
            return JSON.parse(content);
        }
        return {
            nextPlayerId: 665001,
            players: []
        };
    } catch (error) {
        console.error(`Error loading player mappings: ${error.message}`);
        return {
            nextPlayerId: 665001,
            players: []
        };
    }
}

/**
 * Saves the player mappings to file
 */
function savePlayerMappings(mappings) {
    try {
        const dir = path.dirname(PLAYER_MAPPINGS_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(PLAYER_MAPPINGS_FILE, JSON.stringify(mappings, null, 2));
        return true;
    } catch (error) {
        console.error(`Error saving player mappings: ${error.message}`);
        return false;
    }
}

/**
 * Finds a player by name and team, considering team changes
 */
function findPlayerByNameAndTeam(name, team, gameDate = null) {
    const mappings = loadPlayerMappings();
    
    for (const player of mappings.players) {
        // Check current name match
        if (player.currentName === name) {
            // If no team specified, return first match
            if (!team) return player;
            
            // Check if team matches any alias
            for (const alias of player.aliases) {
                if (alias.team === team) {
                    // If no date specified, or date falls within range
                    if (!gameDate || isDateInRange(gameDate, alias.dateRange)) {
                        return player;
                    }
                }
            }
        }
        
        // Check alias names
        for (const alias of player.aliases) {
            if (alias.name === name && alias.team === team) {
                if (!gameDate || isDateInRange(gameDate, alias.dateRange)) {
                    return player;
                }
            }
        }
    }
    
    return null;
}

/**
 * Finds or creates a player entry
 */
function findOrCreatePlayer(name, team, fullName = null, gameDate = null) {
    // First try to find existing player
    let player = findPlayerByNameAndTeam(name, team, gameDate);
    
    if (player) {
        // Update fullName if provided and not already set
        if (fullName && (!player.fullName || player.fullName === name)) {
            player.fullName = fullName;
            const mappings = loadPlayerMappings();
            const playerIndex = mappings.players.findIndex(p => p.playerId === player.playerId);
            if (playerIndex >= 0) {
                mappings.players[playerIndex] = player;
                savePlayerMappings(mappings);
            }
        }
        return player;
    }
    
    // Check if this might be a team change for an existing player
    // CRITICAL FIX: Add more conservative team change detection to prevent false positives
    const possibleExistingPlayer = findPlayerByNameOnly(name);
    if (possibleExistingPlayer && team !== getCurrentTeam(possibleExistingPlayer)) {
        const currentTeam = getCurrentTeam(possibleExistingPlayer);
        const timeSinceLastAlias = getTimeSinceLastAlias(possibleExistingPlayer);
        
        // SAFETY CHECK 1: Only allow team changes if there's been significant time since last entry
        // This prevents rapid false team changes from corrupting data
        if (timeSinceLastAlias < 7) {  // Less than 7 days
            console.log(`⚠️  REJECTED potential team change for ${name}: Too recent (${timeSinceLastAlias} days since last update)`);
            // Treat as new player instead of forcing a team change
        } else {
            // SAFETY CHECK 2: Validate that this looks like a legitimate trade/signing
            console.log(`🔍 INVESTIGATING potential team change: ${name} from ${currentTeam} to ${team}`);
            console.log(`   - Time since last alias: ${timeSinceLastAlias} days`);
            console.log(`   - Player ID: ${possibleExistingPlayer.playerId}`);
            
            // For now, be extremely conservative and require manual validation
            console.log(`⚠️  DEFERRED team change for ${name}: Requires manual validation to prevent corruption`);
        }
        // Skip the team change for now - treat as new player entry
    }
    
    // Create new player
    const mappings = loadPlayerMappings();
    const newPlayer = {
        playerId: mappings.nextPlayerId,
        currentName: name,
        fullName: fullName || name,
        aliases: [
            {
                name: name,
                team: team,
                dateRange: {
                    start: gameDate || new Date().toISOString().split('T')[0],
                    end: null
                }
            }
        ]
    };
    
    mappings.players.push(newPlayer);
    mappings.nextPlayerId++;
    
    if (savePlayerMappings(mappings)) {
        console.log(`Created new player: ${name} (${team}) with ID ${newPlayer.playerId}`);
        return newPlayer;
    }
    
    return null;
}

/**
 * Finds a player by name only (ignoring team)
 */
function findPlayerByNameOnly(name) {
    const mappings = loadPlayerMappings();
    
    for (const player of mappings.players) {
        if (player.currentName === name || player.fullName === name) {
            return player;
        }
        
        for (const alias of player.aliases) {
            if (alias.name === name) {
                return player;
            }
        }
    }
    
    return null;
}

/**
 * Gets the number of days since the last alias was added for a player
 * Used to prevent rapid false team changes
 */
function getTimeSinceLastAlias(player) {
    if (!player.aliases || player.aliases.length === 0) {
        return Infinity; // No aliases, treat as very old
    }
    
    // Find the most recent alias start date
    const mostRecentDate = player.aliases.reduce((latest, alias) => {
        const aliasDate = new Date(alias.dateRange.start);
        return aliasDate > latest ? aliasDate : latest;
    }, new Date(0));
    
    const now = new Date();
    const diffTime = Math.abs(now - mostRecentDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
}

/**
 * Gets the current team for a player
 */
function getCurrentTeam(player) {
    // Find the alias with no end date (current team)
    for (const alias of player.aliases) {
        if (!alias.dateRange.end) {
            return alias.team;
        }
    }
    
    // If no current team found, return the most recent team
    let mostRecentAlias = player.aliases[0];
    for (const alias of player.aliases) {
        if (alias.dateRange.start > mostRecentAlias.dateRange.start) {
            mostRecentAlias = alias;
        }
    }
    
    return mostRecentAlias.team;
}

/**
 * Adds a team change to an existing player
 */
function addTeamChangeToPlayer(player, name, newTeam, gameDate) {
    const mappings = loadPlayerMappings();
    const playerIndex = mappings.players.findIndex(p => p.playerId === player.playerId);
    
    if (playerIndex === -1) return null;
    
    const updatedPlayer = { ...mappings.players[playerIndex] };
    
    // Close the current team's date range
    for (const alias of updatedPlayer.aliases) {
        if (!alias.dateRange.end) {
            alias.dateRange.end = gameDate || new Date().toISOString().split('T')[0];
        }
    }
    
    // Add new team alias
    updatedPlayer.aliases.push({
        name: name,
        team: newTeam,
        dateRange: {
            start: gameDate || new Date().toISOString().split('T')[0],
            end: null
        }
    });
    
    // Update current name and team
    updatedPlayer.currentName = name;
    
    mappings.players[playerIndex] = updatedPlayer;
    
    if (savePlayerMappings(mappings)) {
        console.log(`Added team change: ${name} moved to ${newTeam} (Player ID: ${updatedPlayer.playerId})`);
        return updatedPlayer;
    }
    
    return null;
}

/**
 * Gets all team affiliations for a player
 */
function getPlayerTeamHistory(playerId) {
    const mappings = loadPlayerMappings();
    const player = mappings.players.find(p => p.playerId === playerId);
    
    if (!player) return [];
    
    return player.aliases.map(alias => ({
        name: alias.name,
        team: alias.team,
        startDate: alias.dateRange.start,
        endDate: alias.dateRange.end
    }));
}

/**
 * Gets all name/team combinations for a player (for data aggregation)
 */
function getPlayerAliases(playerId) {
    const mappings = loadPlayerMappings();
    const player = mappings.players.find(p => p.playerId === playerId);
    
    if (!player) return [];
    
    return player.aliases.map(alias => ({
        name: alias.name,
        team: alias.team
    }));
}

/**
 * Checks if a date falls within a date range
 */
function isDateInRange(date, dateRange) {
    const checkDate = new Date(date);
    const startDate = new Date(dateRange.start);
    const endDate = dateRange.end ? new Date(dateRange.end) : new Date();
    
    return checkDate >= startDate && checkDate <= endDate;
}

/**
 * Gets player by ID
 */
function getPlayerById(playerId) {
    const mappings = loadPlayerMappings();
    return mappings.players.find(p => p.playerId === playerId);
}

/**
 * Updates player full name
 */
function updatePlayerFullName(playerId, fullName) {
    const mappings = loadPlayerMappings();
    const playerIndex = mappings.players.findIndex(p => p.playerId === playerId);
    
    if (playerIndex >= 0) {
        mappings.players[playerIndex].fullName = fullName;
        return savePlayerMappings(mappings);
    }
    
    return false;
}

/**
 * CRITICAL SAFETY FUNCTIONS: Prevent roster corruption
 */

/**
 * Validates roster data for suspicious team assignments
 * Returns array of warnings for manual review
 */
function validateRosterData() {
    const warnings = [];
    
    try {
        // Load current rosters.json for validation
        const fs = require('fs');
        const rosterPath = path.join(__dirname, '..', '..', '..', 'BaseballData', 'data', 'rosters.json');
        
        if (!fs.existsSync(rosterPath)) {
            warnings.push('⚠️  rosters.json not found at expected location');
            return warnings;
        }
        
        const rosterData = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
        
        // Check for common team assignment errors
        const suspiciousAssignments = [
            { name: 'Kyle Schwarber', expectedTeam: 'PHI', suspiciousTeams: ['CLE', 'BAL', 'NYM'] },
            { name: 'Gunnar Henderson', expectedTeam: 'BAL', suspiciousTeams: ['NYM', 'CLE', 'PHI'] },
            { name: 'Pete Alonso', expectedTeam: 'NYM', suspiciousTeams: ['SD', 'PHI', 'CLE'] },
            { name: 'Kyle Stowers', expectedTeam: 'MIA', suspiciousTeams: ['LAA', 'BAL', 'TEX'] }
        ];
        
        for (const check of suspiciousAssignments) {
            const player = rosterData.find(p => 
                p.fullName === check.name || p.name === check.name
            );
            
            if (player && check.suspiciousTeams.includes(player.team)) {
                warnings.push(`🚨 SUSPICIOUS: ${check.name} assigned to ${player.team}, expected ${check.expectedTeam}`);
            }
        }
        
        console.log(`✅ Roster validation completed: ${warnings.length} warnings found`);
        
    } catch (error) {
        warnings.push(`❌ Roster validation failed: ${error.message}`);
    }
    
    return warnings;
}

/**
 * Removes duplicate player entries from playerMappings.json
 * Critical for preventing false team change detection
 */
function removeDuplicatePlayerMappings() {
    const mappings = loadPlayerMappings();
    const seen = new Map();
    const duplicates = [];
    const cleanPlayers = [];
    
    for (const player of mappings.players) {
        const key = `${player.currentName}:${player.fullName}`.toLowerCase();
        
        if (seen.has(key)) {
            duplicates.push({
                duplicate: player,
                original: seen.get(key)
            });
            console.log(`🔍 Found duplicate: ${player.currentName} (ID: ${player.playerId})`);
        } else {
            seen.set(key, player);
            cleanPlayers.push(player);
        }
    }
    
    if (duplicates.length > 0) {
        console.log(`🧹 Removing ${duplicates.length} duplicate entries...`);
        mappings.players = cleanPlayers;
        
        if (savePlayerMappings(mappings)) {
            console.log(`✅ Cleaned playerMappings.json: removed ${duplicates.length} duplicates`);
            return duplicates.length;
        } else {
            console.error('❌ Failed to save cleaned player mappings');
            return -1;
        }
    } else {
        console.log('✅ No duplicate player mappings found');
        return 0;
    }
}

module.exports = {
    loadPlayerMappings,
    savePlayerMappings,
    findPlayerByNameAndTeam,
    findOrCreatePlayer,
    findPlayerByNameOnly,
    getCurrentTeam,
    addTeamChangeToPlayer,
    getPlayerTeamHistory,
    getPlayerAliases,
    getPlayerById,
    updatePlayerFullName,
    isDateInRange,
    // CRITICAL SAFETY FUNCTIONS
    validateRosterData,
    removeDuplicatePlayerMappings,
    getTimeSinceLastAlias
};