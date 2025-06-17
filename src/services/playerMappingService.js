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
    const possibleExistingPlayer = findPlayerByNameOnly(name);
    if (possibleExistingPlayer && team !== getCurrentTeam(possibleExistingPlayer)) {
        console.log(`Detected potential team change: ${name} from ${getCurrentTeam(possibleExistingPlayer)} to ${team}`);
        return addTeamChangeToPlayer(possibleExistingPlayer, name, team, gameDate);
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
    isDateInRange
};