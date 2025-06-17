/**
 * Migration Script: Populate playerMappings.json from existing rosters.json
 * 
 * This script creates player mappings for all existing players in rosters.json
 * Run this once to initialize the player mapping system.
 * 
 * Usage: node src/services/migratePlayersToMappings.js
 */

const fs = require('fs');
const path = require('path');

const ROSTERS_FILE = path.join(__dirname, '..', '..', 'public', 'data', 'rosters.json');
const MAPPINGS_FILE = path.join(__dirname, '..', '..', 'public', 'data', 'playerMappings.json');

/**
 * Main migration function
 */
async function migratePlayersToMappings() {
    console.log('Starting player mapping migration...');
    
    // Load existing rosters
    let rosters = [];
    try {
        if (fs.existsSync(ROSTERS_FILE)) {
            const rostersContent = fs.readFileSync(ROSTERS_FILE, 'utf8');
            rosters = JSON.parse(rostersContent);
            console.log(`Loaded ${rosters.length} players from rosters.json`);
        } else {
            console.error('rosters.json not found');
            return;
        }
    } catch (error) {
        console.error('Error reading rosters.json:', error.message);
        return;
    }
    
    // Load existing mappings (if any)
    let mappings = {
        nextPlayerId: 665001,
        players: []
    };
    
    try {
        if (fs.existsSync(MAPPINGS_FILE)) {
            const mappingsContent = fs.readFileSync(MAPPINGS_FILE, 'utf8');
            mappings = JSON.parse(mappingsContent);
            console.log(`Found existing mappings with ${mappings.players.length} players`);
        }
    } catch (error) {
        console.log('No existing mappings found, creating new...');
    }
    
    let playersAdded = 0;
    let playersUpdated = 0;
    
    // Process each roster player
    for (const rosterPlayer of rosters) {
        if (!rosterPlayer.name || !rosterPlayer.team) {
            console.warn(`Skipping invalid player: ${JSON.stringify(rosterPlayer)}`);
            continue;
        }
        
        // Check if player already exists in mappings
        let existingPlayer = mappings.players.find(p => 
            p.currentName === rosterPlayer.name && 
            p.aliases.some(alias => alias.team === rosterPlayer.team)
        );
        
        if (existingPlayer) {
            // Update existing player if needed
            if (!existingPlayer.fullName && rosterPlayer.fullName) {
                existingPlayer.fullName = rosterPlayer.fullName;
                playersUpdated++;
                console.log(`Updated fullName for ${rosterPlayer.name} (ID: ${existingPlayer.playerId})`);
            }
            continue;
        }
        
        // Create new player mapping
        const newPlayer = {
            playerId: mappings.nextPlayerId,
            currentName: rosterPlayer.name,
            fullName: rosterPlayer.fullName || rosterPlayer.name,
            aliases: [
                {
                    name: rosterPlayer.name,
                    team: rosterPlayer.team,
                    dateRange: {
                        start: "2025-01-01", // Default start date for existing players
                        end: null // Current team
                    }
                }
            ]
        };
        
        mappings.players.push(newPlayer);
        mappings.nextPlayerId++;
        playersAdded++;
        
        console.log(`Added ${rosterPlayer.name} (${rosterPlayer.team}) with ID ${newPlayer.playerId}`);
    }
    
    // Update rosters.json with playerIds
    console.log('Updating rosters.json with player IDs...');
    let rostersUpdated = 0;
    
    for (const rosterPlayer of rosters) {
        if (rosterPlayer.playerId) continue; // Already has ID
        
        const mappedPlayer = mappings.players.find(p => 
            p.currentName === rosterPlayer.name && 
            p.aliases.some(alias => alias.team === rosterPlayer.team)
        );
        
        if (mappedPlayer) {
            rosterPlayer.playerId = mappedPlayer.playerId;
            rostersUpdated++;
        }
    }
    
    // Save updated mappings
    try {
        fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2));
        console.log(`Successfully saved player mappings with ${mappings.players.length} players`);
    } catch (error) {
        console.error('Error saving player mappings:', error.message);
        return;
    }
    
    // Save updated rosters
    try {
        fs.writeFileSync(ROSTERS_FILE, JSON.stringify(rosters, null, 2));
        console.log(`Successfully updated rosters.json with ${rostersUpdated} player IDs`);
    } catch (error) {
        console.error('Error saving updated rosters:', error.message);
        return;
    }
    
    console.log('\nMigration Summary:');
    console.log(`- Players added to mappings: ${playersAdded}`);
    console.log(`- Players updated: ${playersUpdated}`);
    console.log(`- Rosters updated with IDs: ${rostersUpdated}`);
    console.log(`- Next available player ID: ${mappings.nextPlayerId}`);
    console.log('\nMigration completed successfully!');
}

// Run the migration
if (require.main === module) {
    migratePlayersToMappings().catch(console.error);
}

module.exports = { migratePlayersToMappings };