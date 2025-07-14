#!/usr/bin/env node

/**
 * Batch Duplicate Removal Script
 * 
 * Systematically fixes all 405 affected players by removing duplicate game entries
 * while preserving legitimate doubleheader games. Creates backups before modifications
 * and generates comprehensive before/after reports.
 * 
 * Usage: node scripts/data-validation/batchDuplicateRemoval.js [--dry-run] [--backup-dir=path]
 */

const fs = require('fs').promises;
const path = require('path');
const duplicateDetectionService = require('../../src/services/duplicateDetectionService');

/**
 * Command line argument parsing
 */
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const backupDirArg = args.find(arg => arg.startsWith('--backup-dir='));
const customBackupDir = backupDirArg ? backupDirArg.split('=')[1] : null;

/**
 * Configuration
 */
const CONFIG = {
  DATA_DIR: 'public/data/2025',
  BACKUP_DIR: customBackupDir || `backups/batch_duplicate_removal_${new Date().toISOString().split('T')[0]}`,
  REPORTS_DIR: 'scripts/data-validation/reports',
  DRY_RUN: isDryRun,
  
  // Safety thresholds
  MAX_FILES_TO_MODIFY: 100,
  MAX_PLAYERS_TO_MODIFY: 500,
  MAX_GAMES_TO_REMOVE: 1000
};

/**
 * Create backup directory structure
 */
async function createBackupStructure() {
  try {
    await fs.mkdir(CONFIG.BACKUP_DIR, { recursive: true });
    await fs.mkdir(CONFIG.REPORTS_DIR, { recursive: true });
    console.log(`📁 Created backup directory: ${CONFIG.BACKUP_DIR}`);
  } catch (error) {
    console.error('❌ Error creating backup directory:', error);
    throw error;
  }
}

/**
 * Create backup of a file before modification
 * @param {string} filePath - Original file path
 * @returns {string} Backup file path
 */
async function createFileBackup(filePath) {
  try {
    const relativePath = path.relative('public/data/2025', filePath);
    const backupPath = path.join(CONFIG.BACKUP_DIR, relativePath);
    const backupDir = path.dirname(backupPath);
    
    await fs.mkdir(backupDir, { recursive: true });
    await fs.copyFile(filePath, backupPath);
    
    return backupPath;
  } catch (error) {
    console.error(`❌ Error creating backup for ${filePath}:`, error);
    throw error;
  }
}

/**
 * Remove duplicate games from a daily JSON file
 * @param {string} filePath - Path to the JSON file
 * @param {Array} removalsForFile - Array of removal instructions for this file
 * @returns {object} Removal results
 */
async function removeDuplicatesFromFile(filePath, removalsForFile) {
  const results = {
    filePath,
    originalGamesCount: 0,
    originalPlayersCount: 0,
    gamesRemoved: 0,
    playersRemoved: 0,
    modificationsMade: []
  };

  try {
    // Load the file
    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
    results.originalGamesCount = data.games?.length || 0;
    results.originalPlayersCount = data.players?.length || 0;

    if (!CONFIG.DRY_RUN) {
      // Create backup
      const backupPath = await createFileBackup(filePath);
      console.log(`📄 Created backup: ${backupPath}`);
    }

    // Process game removals
    const gameRemovals = removalsForFile.filter(r => r.action === 'remove_game');
    if (gameRemovals.length > 0 && data.games) {
      const originalGames = [...data.games];
      data.games = data.games.filter(game => {
        const gameId = game.gameId || game.originalId;
        const shouldRemove = gameRemovals.some(removal => 
          removal.gameId === gameId || removal.gameId === gameId?.toString()
        );
        
        if (shouldRemove) {
          results.gamesRemoved++;
          results.modificationsMade.push({
            type: 'game_removal',
            gameId: gameId,
            teams: `${game.awayTeam}@${game.homeTeam}`,
            reason: gameRemovals.find(r => r.gameId === gameId)?.reason
          });
        }
        
        return !shouldRemove;
      });
    }

    // Process player game removals
    const playerRemovals = removalsForFile.filter(r => r.action === 'remove_player_game');
    if (playerRemovals.length > 0) {
      const playersArray = Array.isArray(data.players) ? data.players : 
                          (Array.isArray(data) ? data : []);
      
      if (playersArray.length > 0) {
        const originalPlayers = [...playersArray];
        const filteredPlayers = playersArray.filter(player => {
          const playerKey = `${player.name}_${player.team}`;
          const gameId = player.gameId;
          
          const shouldRemove = playerRemovals.some(removal => 
            removal.playerKey === playerKey && 
            (removal.gameId === gameId || removal.gameId === gameId?.toString())
          );
          
          if (shouldRemove) {
            results.playersRemoved++;
            results.modificationsMade.push({
              type: 'player_removal',
              playerKey: playerKey,
              gameId: gameId,
              stats: {
                hits: player.H,
                ab: player.AB,
                runs: player.R,
                rbi: player.RBI,
                hr: player.HR
              },
              reason: playerRemovals.find(r => 
                r.playerKey === playerKey && r.gameId === gameId
              )?.reason
            });
          }
          
          return !shouldRemove;
        });

        // Update the data structure appropriately
        if (Array.isArray(data.players)) {
          data.players = filteredPlayers;
        } else if (Array.isArray(data)) {
          // If the root is an array (old format)
          Object.keys(data).forEach(key => delete data[key]);
          filteredPlayers.forEach((player, index) => {
            data[index] = player;
          });
          data.length = filteredPlayers.length;
        }
      }
    }

    // Write the modified file (unless dry run)
    if (!CONFIG.DRY_RUN && results.modificationsMade.length > 0) {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      console.log(`✅ Modified ${filePath}: -${results.gamesRemoved} games, -${results.playersRemoved} players`);
    } else if (CONFIG.DRY_RUN && results.modificationsMade.length > 0) {
      console.log(`🔍 [DRY RUN] Would modify ${filePath}: -${results.gamesRemoved} games, -${results.playersRemoved} players`);
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    results.error = error.message;
  }

  return results;
}

/**
 * Group removal recommendations by file
 * @param {Array} recommendations - Array of removal recommendations
 * @returns {Map} Map of filePath -> removals array
 */
function groupRemovalsByFile(recommendations) {
  const removalsByFile = new Map();
  
  recommendations.forEach(removal => {
    if (!removalsByFile.has(removal.file)) {
      removalsByFile.set(removal.file, []);
    }
    removalsByFile.get(removal.file).push(removal);
  });
  
  return removalsByFile;
}

/**
 * Apply safety checks before proceeding with batch removal
 * @param {Array} recommendations - Removal recommendations
 * @returns {object} Safety check results
 */
function applySafetyChecks(recommendations) {
  const checks = {
    passed: true,
    warnings: [],
    errors: []
  };

  const filesAffected = new Set(recommendations.map(r => r.file)).size;
  const playersAffected = new Set(recommendations.map(r => r.playerKey).filter(k => k)).size;
  const gamesAffected = recommendations.length;

  if (filesAffected > CONFIG.MAX_FILES_TO_MODIFY) {
    checks.errors.push(`Too many files affected: ${filesAffected} > ${CONFIG.MAX_FILES_TO_MODIFY}`);
    checks.passed = false;
  }

  if (playersAffected > CONFIG.MAX_PLAYERS_TO_MODIFY) {
    checks.errors.push(`Too many players affected: ${playersAffected} > ${CONFIG.MAX_PLAYERS_TO_MODIFY}`);
    checks.passed = false;
  }

  if (gamesAffected > CONFIG.MAX_GAMES_TO_REMOVE) {
    checks.errors.push(`Too many game removals: ${gamesAffected} > ${CONFIG.MAX_GAMES_TO_REMOVE}`);
    checks.passed = false;
  }

  // Check for suspicious patterns
  const suspiciousDateRemovals = recommendations.filter(r => 
    r.date >= '2025-07-02' && r.date <= '2025-07-09'
  );

  if (suspiciousDateRemovals.length < gamesAffected * 0.5) {
    checks.warnings.push(
      `Only ${suspiciousDateRemovals.length}/${gamesAffected} removals in known problem period (July 2-9)`
    );
  }

  return checks;
}

/**
 * Generate comprehensive before/after report
 * @param {object} beforeAnalysis - Analysis before removal
 * @param {Array} removalResults - Results of removal operations
 * @returns {object} Comprehensive report
 */
function generateComprehensiveReport(beforeAnalysis, removalResults) {
  const report = {
    timestamp: new Date().toISOString(),
    operation: CONFIG.DRY_RUN ? 'DRY_RUN_ANALYSIS' : 'BATCH_DUPLICATE_REMOVAL',
    
    beforeAnalysis: {
      totalIssues: beforeAnalysis.summary.totalIssues,
      affectedPlayers: beforeAnalysis.summary.affectedPlayers,
      affectedDates: beforeAnalysis.summary.affectedDates,
      removalRecommendations: beforeAnalysis.summary.totalRemovalRecommendations
    },
    
    removalExecution: {
      filesProcessed: removalResults.length,
      totalGamesRemoved: removalResults.reduce((sum, r) => sum + r.gamesRemoved, 0),
      totalPlayersRemoved: removalResults.reduce((sum, r) => sum + r.playersRemoved, 0),
      filesWithErrors: removalResults.filter(r => r.error).length,
      successfulModifications: removalResults.filter(r => 
        r.modificationsMade.length > 0 && !r.error
      ).length
    },
    
    detailedResults: removalResults,
    
    impactAssessment: {
      affectedPlayerList: [...new Set(
        removalResults.flatMap(r => 
          r.modificationsMade
            .filter(m => m.type === 'player_removal')
            .map(m => m.playerKey)
        )
      )],
      
      gameIdsCleaned: [...new Set(
        removalResults.flatMap(r => 
          r.modificationsMade.map(m => m.gameId)
        )
      )],
      
      statsReductions: removalResults.flatMap(r => 
        r.modificationsMade
          .filter(m => m.type === 'player_removal' && m.stats)
          .map(m => ({
            playerKey: m.playerKey,
            statsRemoved: m.stats
          }))
      )
    }
  };

  // Calculate total stats impact
  const totalStatsImpact = report.impactAssessment.statsReductions.reduce((total, player) => ({
    hits: total.hits + (parseInt(player.statsRemoved.hits) || 0),
    ab: total.ab + (parseInt(player.statsRemoved.ab) || 0),
    runs: total.runs + (parseInt(player.statsRemoved.runs) || 0),
    rbi: total.rbi + (parseInt(player.statsRemoved.rbi) || 0),
    hr: total.hr + (parseInt(player.statsRemoved.hr) || 0)
  }), { hits: 0, ab: 0, runs: 0, rbi: 0, hr: 0 });

  report.impactAssessment.totalStatsImpact = totalStatsImpact;

  return report;
}

/**
 * Save detailed report to file
 * @param {object} report - Report data
 * @param {string} filename - Report filename
 */
async function saveReport(report, filename) {
  try {
    const reportPath = path.join(CONFIG.REPORTS_DIR, filename);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Report saved: ${reportPath}`);
  } catch (error) {
    console.error(`❌ Error saving report:`, error);
  }
}

/**
 * Print human-readable summary
 * @param {object} report - Report data
 */
function printSummary(report) {
  console.log('\n🎯 BATCH DUPLICATE REMOVAL SUMMARY');
  console.log('=====================================');
  
  if (CONFIG.DRY_RUN) {
    console.log('🔍 DRY RUN - No actual changes made');
  } else {
    console.log('✅ LIVE RUN - Changes applied to files');
  }
  
  console.log(`📅 Timestamp: ${report.timestamp}`);
  console.log(`📁 Backup Directory: ${CONFIG.BACKUP_DIR}`);
  
  console.log('\n📊 BEFORE ANALYSIS:');
  console.log(`- Total Issues: ${report.beforeAnalysis.totalIssues}`);
  console.log(`- Affected Players: ${report.beforeAnalysis.affectedPlayers}`);
  console.log(`- Affected Dates: ${report.beforeAnalysis.affectedDates}`);
  console.log(`- Removal Recommendations: ${report.beforeAnalysis.removalRecommendations}`);
  
  console.log('\n🔧 REMOVAL EXECUTION:');
  console.log(`- Files Processed: ${report.removalExecution.filesProcessed}`);
  console.log(`- Games Removed: ${report.removalExecution.totalGamesRemoved}`);
  console.log(`- Player Entries Removed: ${report.removalExecution.totalPlayersRemoved}`);
  console.log(`- Successful Modifications: ${report.removalExecution.successfulModifications}`);
  console.log(`- Files with Errors: ${report.removalExecution.filesWithErrors}`);
  
  console.log('\n📈 IMPACT ASSESSMENT:');
  console.log(`- Unique Players Affected: ${report.impactAssessment.affectedPlayerList.length}`);
  console.log(`- Game IDs Cleaned: ${report.impactAssessment.gameIdsCleaned.length}`);
  console.log(`- Total Stats Removed:`);
  console.log(`  • Hits: ${report.impactAssessment.totalStatsImpact.hits}`);
  console.log(`  • At-Bats: ${report.impactAssessment.totalStatsImpact.ab}`);
  console.log(`  • Runs: ${report.impactAssessment.totalStatsImpact.runs}`);
  console.log(`  • RBIs: ${report.impactAssessment.totalStatsImpact.rbi}`);
  console.log(`  • Home Runs: ${report.impactAssessment.totalStatsImpact.hr}`);
  
  if (report.removalExecution.filesWithErrors > 0) {
    console.log('\n⚠️  ERRORS ENCOUNTERED:');
    report.detailedResults
      .filter(r => r.error)
      .forEach(r => console.log(`- ${r.filePath}: ${r.error}`));
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🚀 Starting Batch Duplicate Removal Process...');
    console.log(`Mode: ${CONFIG.DRY_RUN ? 'DRY RUN' : 'LIVE RUN'}`);
    
    // Create directory structure
    await createBackupStructure();
    
    // Run comprehensive duplicate analysis
    console.log('\n🔍 Running comprehensive duplicate analysis...');
    const analysisResults = await duplicateDetectionService.analyzeDatasetForDuplicates(CONFIG.DATA_DIR);
    
    // Apply safety checks
    console.log('\n🛡️  Applying safety checks...');
    const safetyChecks = applySafetyChecks(analysisResults.removalRecommendations);
    
    if (!safetyChecks.passed) {
      console.error('❌ Safety checks failed:');
      safetyChecks.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
    
    if (safetyChecks.warnings.length > 0) {
      console.log('⚠️  Safety warnings:');
      safetyChecks.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    // Group removals by file
    const removalsByFile = groupRemovalsByFile(analysisResults.removalRecommendations);
    console.log(`\n📋 Grouped removals across ${removalsByFile.size} files`);
    
    // Process each file
    console.log('\n🔧 Processing file modifications...');
    const removalResults = [];
    
    for (const [filePath, removals] of removalsByFile) {
      console.log(`\n📄 Processing: ${filePath} (${removals.length} removals)`);
      const result = await removeDuplicatesFromFile(filePath, removals);
      removalResults.push(result);
    }
    
    // Generate comprehensive report
    const report = generateComprehensiveReport(analysisResults, removalResults);
    
    // Save reports
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const mode = CONFIG.DRY_RUN ? 'dry-run' : 'live-run';
    
    await saveReport(analysisResults, `before-analysis-${timestamp}.json`);
    await saveReport(report, `batch-removal-${mode}-${timestamp}.json`);
    
    // Print summary
    printSummary(report);
    
    console.log('\n🏁 Batch duplicate removal process completed successfully!');
    
    if (!CONFIG.DRY_RUN) {
      console.log('\n💡 Next Steps:');
      console.log('1. Run milestone tracking regeneration: npm run generate-milestones');
      console.log('2. Regenerate rolling stats: ./generate_rolling_stats.sh');
      console.log('3. Verify player statistics in the application');
      console.log('4. Monitor for any remaining data quality issues');
    } else {
      console.log('\n💡 To apply these changes, run without --dry-run flag:');
      console.log('node scripts/data-validation/batchDuplicateRemoval.js');
    }
    
  } catch (error) {
    console.error('❌ Fatal error during batch duplicate removal:', error);
    process.exit(1);
  }
}

// Execute main function if script is run directly
if (require.main === module) {
  main();
}

module.exports = {
  main,
  removeDuplicatesFromFile,
  generateComprehensiveReport,
  applySafetyChecks,
  CONFIG
};