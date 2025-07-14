# Data Integrity Fix Guide - Milestone Tracking Accuracy

## Overview

This guide documents the complete process for fixing data integrity issues in the baseball milestone tracking system. These tools and processes were developed to fix a 7-hit discrepancy for C. Bellinger but can be used to identify and fix similar issues for any player.

## Problem Pattern Identified

**Duplicate Game Entries**: Games appearing in multiple daily files with the same gameId, causing inflated player statistics. Common causes:
- Postponed games being counted twice
- Data processing errors during scraping
- Doubleheader mishandling in the data pipeline

## Scripts Created

### 1. **detect_duplicates.js**
**Purpose**: Scans all daily JSON files to detect potential duplicate games
**Location**: `scripts/data-validation/detect_duplicates.js`
**Usage**: `node scripts/data-validation/detect_duplicates.js`

**What it detects**:
- Games with suspicious ID ranges (outside 400000000-500000000)
- Multiple games between same teams on same date
- Incomplete game data
- Potential duplicate vs legitimate doubleheaders

### 2. **analyze_bellinger_stats.js** 
**Purpose**: Deep analysis of any player's game-by-game statistics
**Location**: `scripts/data-validation/analyze_bellinger_stats.js`
**Usage**: `node scripts/data-validation/analyze_bellinger_stats.js`

**Note**: Currently hardcoded for C. Bellinger - needs modification for other players (see instructions below)

### 3. **remove_duplicate_games.js**
**Purpose**: Removes confirmed duplicate game entries with backup creation
**Location**: `scripts/data-validation/remove_duplicate_games.js`
**Usage**: `node scripts/data-validation/remove_duplicate_games.js`

**Features**:
- Automatic backup creation before modifications
- Verification after removal
- Rollback capability on failure

### 4. **fix_bellinger_duplicates.js**
**Purpose**: Targeted fix for specific identified duplicates
**Location**: `scripts/data-validation/fix_bellinger_duplicates.js`
**Usage**: `node scripts/data-validation/fix_bellinger_duplicates.js`

## Production Deployment Instructions

### Step 1: Backup Production Data
```bash
# Create a complete backup of your production data
cd /path/to/production/BaseballTracker
tar -czf production_backup_$(date +%Y%m%d_%H%M%S).tar.gz public/data/
```

### Step 2: Copy Validation Scripts to Production
```bash
# Create the scripts directory if it doesn't exist
mkdir -p scripts/data-validation

# Copy all validation scripts
cp /path/to/test/BaseballTracker/scripts/data-validation/*.js scripts/data-validation/
```

### Step 3: Run Duplicate Detection
```bash
# Identify all potential issues in production
node scripts/data-validation/detect_duplicates.js > duplicate_detection_report.txt
```

### Step 4: Analyze Specific Players
To analyze other players, modify `analyze_bellinger_stats.js`:

**Change line 26 from**:
```javascript
if (player.name === 'C. Bellinger' && player.team === 'NYY' && player.playerType === 'hitter') {
```

**To** (for any player):
```javascript
if (player.name === 'PLAYER_NAME' && player.team === 'TEAM' && player.playerType === 'hitter') {
```

### Step 5: Fix Identified Duplicates
1. Review the duplicate detection report
2. Verify duplicates against external sources (Baseball Reference, ESPN)
3. Update `remove_duplicate_games.js` with confirmed duplicates:

```javascript
const DUPLICATE_GAMES_TO_REMOVE = [
  {
    file: 'public/data/2025/month/month_DD_2025.json',
    gameId: 'GAME_ID_HERE',
    reason: 'Duplicate of gameId XXX - description',
    affectedPlayers: ['Player 1', 'Player 2']
  }
];
```

### Step 6: Run Fixes and Verify
```bash
# Remove duplicates
node scripts/data-validation/remove_duplicate_games.js

# Regenerate milestone tracking
node src/services/generateMilestoneTracking.js

# Regenerate rolling stats
./generate_rolling_stats.sh $(date +%Y-%m-%d)
```

## Creating a Generic Player Analysis Script

Here's a template for analyzing any player:

**Create**: `scripts/data-validation/analyze_player_stats.js`

```javascript
#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Configuration - CHANGE THESE VALUES
const PLAYER_CONFIG = {
  name: process.argv[2] || 'C. Bellinger',  // Pass as argument or change default
  team: process.argv[3] || 'NYY',           // Pass as argument or change default
  expectedStats: {
    hits: parseInt(process.argv[4]) || 92,   // Expected hits from external source
    games: parseInt(process.argv[5]) || 85   // Expected games from external source
  }
};

console.log(`Analyzing: ${PLAYER_CONFIG.name} (${PLAYER_CONFIG.team})`);
console.log(`Expected: ${PLAYER_CONFIG.expectedStats.hits} hits in ${PLAYER_CONFIG.expectedStats.games} games\n`);

// Rest of the analysis code from analyze_bellinger_stats.js
// Just replace hardcoded values with PLAYER_CONFIG values
```

**Usage**:
```bash
# Analyze any player
node scripts/data-validation/analyze_player_stats.js "M. Trout" "LAA" 95 87

# Format: node script.js "Player Name" "TEAM" expected_hits expected_games
```

## Identifying Other Players with Issues

### Quick Check Script
Create `scripts/data-validation/find_stat_discrepancies.js`:

```javascript
#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Add known correct stats here (from Baseball Reference)
const KNOWN_STATS = [
  { name: 'C. Bellinger', team: 'NYY', expectedHits: 92 },
  { name: 'A. Judge', team: 'NYY', expectedHits: 100 },  // Example
  // Add more players as needed
];

async function checkAllPlayers() {
  // Implementation to check all players against known stats
  // and report discrepancies
}

// Run checks and report issues
checkAllPlayers();
```

## Common Data Issues to Check

1. **Duplicate Games** (like C. Bellinger issue)
   - Same gameId on consecutive dates
   - Inflated hit/game counts

2. **Missing Games**
   - Player appears in roster but missing from game files
   - Lower than expected statistics

3. **Wrong Team Assignment**
   - Player traded but still showing on old team
   - Use playerMappingService.js for team history

4. **Data Entry Errors**
   - Impossible statistics (batting average > 1.0)
   - Negative values where not allowed
   - Hits without at-bats

## Validation Checklist

Before deploying fixes to production:

- [ ] Backup all data files
- [ ] Run duplicate detection
- [ ] Verify issues against external sources
- [ ] Test fixes in staging environment
- [ ] Document all changes made
- [ ] Update milestone tracking
- [ ] Regenerate rolling stats
- [ ] Verify no new issues introduced
- [ ] Monitor for 24 hours after deployment

## External Verification Sources

- **Baseball Reference**: https://www.baseball-reference.com/players/
- **ESPN**: https://www.espn.com/mlb/players
- **MLB.com**: https://www.mlb.com/stats

## Maintenance Schedule

**Daily**:
- Run milestone tracking generation
- Check for any error logs

**Weekly**:
- Run duplicate detection script
- Spot check 2-3 players against external sources

**Monthly**:
- Full data integrity audit
- Compare top 20 players against Baseball Reference

## Troubleshooting

**Issue**: Script says no duplicates but stats still wrong
**Solution**: Check for games on different dates, player name variations, or team changes

**Issue**: Milestone tracking not updating after fix
**Solution**: Clear cache and regenerate all derived data files

**Issue**: Rolling stats generation fails
**Solution**: Check for corrupted JSON files, run with verbose logging

## Contact for Issues

If you encounter issues not covered here:
1. Check error logs in the console
2. Verify JSON file structure hasn't changed
3. Ensure all dependencies are installed
4. Run scripts with additional logging

## Version History

- v1.0 (2024-07-11): Initial creation for C. Bellinger fix
- Scripts tested on Node.js v14+ 
- Compatible with BaseballTracker data structure as of July 2024