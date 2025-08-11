/**
 * Roster Deduplication Script
 * Removes duplicate player entries and merges information intelligently
 */

const fs = require('fs');
const path = require('path');

// Import centralized data path configuration
const { DATA_PATH } = require('../config/dataPath');

const ROSTERS_FILE_PATH = path.join(DATA_PATH, 'rosters.json');
const ROSTERS_BACKUP_PATH = path.join(DATA_PATH, `rosters_before_dedup_${Date.now()}.json`);

function deduplicateRosters() {
    console.log('🧹 Starting roster deduplication process...');
    
    // Load rosters
    const rosters = JSON.parse(fs.readFileSync(ROSTERS_FILE_PATH, 'utf8'));
    console.log(`📊 Initial roster count: ${rosters.length} players`);
    
    // Create backup
    fs.writeFileSync(ROSTERS_BACKUP_PATH, JSON.stringify(rosters, null, 2), 'utf8');
    console.log(`💾 Created backup: ${ROSTERS_BACKUP_PATH}`);
    
    // Group players by name
    const playerGroups = {};
    rosters.forEach((player, index) => {
        const key = player.name;
        if (!playerGroups[key]) {
            playerGroups[key] = [];
        }
        playerGroups[key].push({ ...player, originalIndex: index });
    });
    
    const duplicateGroups = Object.keys(playerGroups).filter(name => 
        playerGroups[name].length > 1
    );
    
    console.log(`🔍 Found ${duplicateGroups.length} players with duplicates`);
    
    const deduplicatedRoster = [];
    let duplicatesRemoved = 0;
    let mergedCount = 0;
    
    // Process each player group
    Object.keys(playerGroups).forEach(playerName => {
        const group = playerGroups[playerName];
        
        if (group.length === 1) {
            // Single player, no duplicates
            deduplicatedRoster.push(group[0]);
        } else {
            // Multiple players with same name - need to deduplicate
            console.log(`\n🔄 Deduplicating: ${playerName} (${group.length} entries)`);
            
            const mergedPlayer = mergePlayerEntries(group);
            deduplicatedRoster.push(mergedPlayer);
            
            duplicatesRemoved += (group.length - 1);
            mergedCount++;
        }
    });
    
    // Remove originalIndex from final roster
    const cleanedRoster = deduplicatedRoster.map(player => {
        const { originalIndex, ...cleanPlayer } = player;
        return cleanPlayer;
    });
    
    // Save deduplicated roster
    fs.writeFileSync(ROSTERS_FILE_PATH, JSON.stringify(cleanedRoster, null, 2), 'utf8');
    
    console.log('\n✅ Deduplication complete:');
    console.log(`   Original players: ${rosters.length}`);
    console.log(`   Deduplicated players: ${cleanedRoster.length}`);
    console.log(`   Duplicates removed: ${duplicatesRemoved}`);
    console.log(`   Players merged: ${mergedCount}`);
    console.log(`   Backup saved to: ${ROSTERS_BACKUP_PATH}`);
}

/**
 * Merge multiple player entries intelligently
 * Priority: playerId > fullName > completeness of data
 */
function mergePlayerEntries(playerEntries) {
    console.log(`   📋 Merging ${playerEntries.length} entries:`);
    
    // Display all entries for review
    playerEntries.forEach((player, i) => {
        console.log(`     [${i}] Team: ${player.team}, PlayerId: ${player.playerId || 'NONE'}, FullName: ${player.fullName || 'undefined'}`);
    });
    
    // Sort by priority:
    // 1. Has playerId
    // 2. Has fullName
    // 3. More complete data
    const sortedEntries = playerEntries.sort((a, b) => {
        // Priority 1: playerId exists
        if (a.playerId && !b.playerId) return -1;
        if (!a.playerId && b.playerId) return 1;
        
        // Priority 2: fullName exists and is not 'undefined'
        if (a.fullName && a.fullName !== 'undefined' && (!b.fullName || b.fullName === 'undefined')) return -1;
        if ((!a.fullName || a.fullName === 'undefined') && b.fullName && b.fullName !== 'undefined') return 1;
        
        // Priority 3: more complete data (more properties)
        const aKeys = Object.keys(a).filter(k => a[k] !== undefined && a[k] !== null && a[k] !== '');
        const bKeys = Object.keys(b).filter(k => b[k] !== undefined && b[k] !== null && b[k] !== '');
        
        return bKeys.length - aKeys.length;
    });
    
    // Start with the best entry
    const mergedPlayer = { ...sortedEntries[0] };
    
    // Merge additional data from other entries
    sortedEntries.slice(1).forEach(player => {
        // Merge missing fields
        Object.keys(player).forEach(key => {
            if (key === 'originalIndex') return; // Skip internal tracking
            
            if (!mergedPlayer[key] || 
                mergedPlayer[key] === 'undefined' || 
                mergedPlayer[key] === undefined ||
                mergedPlayer[key] === null ||
                mergedPlayer[key] === '') {
                
                if (player[key] && 
                    player[key] !== 'undefined' && 
                    player[key] !== undefined &&
                    player[key] !== null &&
                    player[key] !== '') {
                    mergedPlayer[key] = player[key];
                }
            }
            
            // Special handling for stats - merge if missing
            if (key === 'stats' && player.stats && Object.keys(player.stats).length > 0) {
                if (!mergedPlayer.stats || Object.keys(mergedPlayer.stats).length === 0) {
                    mergedPlayer.stats = player.stats;
                }
            }
            
            // Special handling for injuries - merge arrays
            if (key === 'injuries' && Array.isArray(player.injuries)) {
                if (!mergedPlayer.injuries) {
                    mergedPlayer.injuries = [];
                }
                mergedPlayer.injuries = [...mergedPlayer.injuries, ...player.injuries];
            }
        });
    });
    
    console.log(`     ✅ Merged to: Team: ${mergedPlayer.team}, PlayerId: ${mergedPlayer.playerId || 'NONE'}, FullName: ${mergedPlayer.fullName || 'undefined'}`);
    
    return mergedPlayer;
}

// Run the deduplication
if (require.main === module) {
    try {
        deduplicateRosters();
    } catch (error) {
        console.error('❌ Error during deduplication:', error);
        process.exit(1);
    }
}

module.exports = { deduplicateRosters };