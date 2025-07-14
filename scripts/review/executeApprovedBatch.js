#!/usr/bin/env node

/**
 * Execute Approved Batch Script
 * 
 * Executes only the removals that have been approved through the interactive review process.
 * Provides safe execution of custom cleanup batches with full rollback capability.
 * 
 * Usage: node scripts/review/executeApprovedBatch.js <batch-file> [--dry-run]
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Configuration for batch execution
 */
const BATCH_CONFIG = {
  BACKUP_DIR: `approved_batch_backup_${new Date().toISOString().split('T')[0]}`,
  REPORTS_DIR: 'scripts/review/reports'
};

/**
 * Execute approved removals from batch file
 */
async function executeApprovedBatch(batchFilePath, isDryRun = false) {
  console.log(`🚀 ${isDryRun ? 'SIMULATING' : 'EXECUTING'} Approved Cleanup Batch`);
  console.log('====================================');
  console.log(`Batch File: ${batchFilePath}`);
  
  try {
    // Load batch file
    const batchData = JSON.parse(await fs.readFile(batchFilePath, 'utf8'));
    
    // Handle different batch file formats
    let approvedRemovals, summary;
    if (batchData.approvedRemovals) {
      // Standard interactive review format
      approvedRemovals = batchData.approvedRemovals;
      summary = batchData.summary;
    } else if (batchData.removals) {
      // Player cleanup format
      approvedRemovals = batchData.removals;
      summary = batchData.summary || {
        totalApproved: approvedRemovals.length,
        rejectedFiles: [],
        skippedFiles: []
      };
    } else {
      throw new Error('Unknown batch file format');
    }
    
    console.log(`\\n📊 Batch Summary:`);
    console.log(`   Approved Removals: ${summary.totalApproved || approvedRemovals.length}`);
    console.log(`   Rejected Files: ${summary.rejectedFiles ? summary.rejectedFiles.length : 0}`);
    console.log(`   Skipped Files: ${summary.skippedFiles ? summary.skippedFiles.length : 0}`);
    
    if (approvedRemovals.length === 0) {
      console.log(`\\n✅ No removals to execute - batch is empty`);
      return { success: true, removals: 0 };
    }
    
    // Create backup if not dry run
    if (!isDryRun) {
      await createBatchBackup();
    }
    
    // Group removals by file
    const fileGroups = {};
    approvedRemovals.forEach(removal => {
      if (!fileGroups[removal.file]) {
        fileGroups[removal.file] = [];
      }
      fileGroups[removal.file].push(removal);
    });
    
    console.log(`\\n🔧 Processing ${Object.keys(fileGroups).length} files...`);
    
    const results = {
      filesProcessed: 0,
      totalRemovals: 0,
      errors: []
    };
    
    // Process each file
    for (const [filePath, removals] of Object.entries(fileGroups)) {
      try {
        console.log(`\\n📄 ${isDryRun ? 'Analyzing' : 'Processing'}: ${filePath.split('/').pop()} (${removals.length} removals)`);
        
        const fileResult = await processFileRemovals(filePath, removals, isDryRun);
        
        results.filesProcessed++;
        results.totalRemovals += fileResult.removalsExecuted;
        
        console.log(`   ${isDryRun ? 'Would remove' : 'Removed'}: ${fileResult.removalsExecuted} entries`);
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        results.errors.push({ file: filePath, error: error.message });
      }
    }
    
    // Generate execution report
    const report = await generateExecutionReport(batchData, results, isDryRun);
    
    console.log(`\\n📈 ${isDryRun ? 'Simulation' : 'Execution'} Complete:`);
    console.log(`   Files Processed: ${results.filesProcessed}`);
    console.log(`   Total Removals: ${results.totalRemovals}`);
    console.log(`   Errors: ${results.errors.length}`);
    
    if (!isDryRun && results.totalRemovals > 0) {
      console.log(`\\n💡 Next Steps:`);
      console.log(`   🔄 Regenerate data: npm run generate-milestones && ./generate_rolling_stats.sh`);
      console.log(`   🧪 Test application functionality`);
      console.log(`   📊 Run duplicate analysis to verify improvements`);
      console.log(`\\n🔄 Rollback Available:`);
      console.log(`   Backup: backups/${BATCH_CONFIG.BACKUP_DIR}/`);
    }
    
    return {
      success: results.errors.length === 0,
      removals: results.totalRemovals,
      errors: results.errors,
      report
    };
    
  } catch (error) {
    console.error(`❌ Batch execution failed: ${error.message}`);
    throw error;
  }
}

/**
 * Process removals for a specific file
 */
async function processFileRemovals(filePath, removals, isDryRun) {
  const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
  const originalPlayerCount = Array.isArray(data.players) ? data.players.length : 
                              (Array.isArray(data) ? data.length : 0);
  
  let removalsExecuted = 0;
  
  if (originalPlayerCount === 0) {
    return { removalsExecuted: 0 };
  }
  
  // Process game removals (games array)
  const gameRemovals = removals.filter(r => r.action === 'remove_game');
  if (gameRemovals.length > 0 && data.games && Array.isArray(data.games)) {
    const originalGameCount = data.games.length;
    
    const filteredGames = data.games.filter(game => {
      const gameId = game.originalId || game.gameId || game.id;
      
      const shouldRemove = gameRemovals.some(removal => 
        removal.gameId === gameId || removal.gameId === gameId?.toString()
      );
      
      if (shouldRemove) {
        removalsExecuted++;
        console.log(`     ${isDryRun ? 'Would remove' : 'Removing'}: Game ${gameId} (${game.homeTeam} vs ${game.awayTeam})`);
      }
      
      return !shouldRemove;
    });
    
    if (!isDryRun && removalsExecuted > 0) {
      data.games = filteredGames;
      console.log(`     Updated ${filePath.split('/').pop()}: ${originalGameCount} → ${filteredGames.length} games`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    }
  }
  
  // Process player removals
  const playerRemovals = removals.filter(r => r.action === 'remove_player_game');
  if (playerRemovals.length > 0) {
    const playersArray = Array.isArray(data.players) ? data.players : 
                        (Array.isArray(data) ? data : []);
    
    const filteredPlayers = playersArray.filter(player => {
      const playerKey = `${player.name}_${player.team}`;
      const gameId = player.gameId;
      
      const shouldRemove = playerRemovals.some(removal => 
        removal.playerKey === playerKey && 
        (removal.gameId === gameId || removal.gameId === gameId?.toString())
      );
      
      if (shouldRemove) {
        removalsExecuted++;
        console.log(`     ${isDryRun ? 'Would remove' : 'Removing'}: ${player.name} (${gameId})`);
      }
      
      return !shouldRemove;
    });
    
    if (!isDryRun && removalsExecuted > 0) {
      // Update data structure
      if (Array.isArray(data.players)) {
        data.players = filteredPlayers;
      } else if (Array.isArray(data)) {
        Object.keys(data).forEach(key => delete data[key]);
        filteredPlayers.forEach((player, index) => {
          data[index] = player;
        });
        data.length = filteredPlayers.length;
      }
      
      // Write updated file
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    }
  }
  
  return { removalsExecuted };
}

/**
 * Create backup for batch execution
 */
async function createBatchBackup() {
  console.log(`\\n💾 Creating backup...`);
  
  await fs.mkdir(`backups/${BATCH_CONFIG.BACKUP_DIR}`, { recursive: true });
  
  // Create compressed backup
  const { execSync } = require('child_process');
  const command = `tar -czf backups/${BATCH_CONFIG.BACKUP_DIR}/approved_batch_backup.tar.gz public/data/2025/`;
  
  execSync(command, { cwd: process.cwd() });
  console.log(`   ✅ Backup created: backups/${BATCH_CONFIG.BACKUP_DIR}/approved_batch_backup.tar.gz`);
}

/**
 * Generate execution report
 */
async function generateExecutionReport(batchData, results, isDryRun) {
  const report = {
    timestamp: new Date().toISOString(),
    executionType: isDryRun ? 'approved_batch_simulation' : 'approved_batch_execution',
    
    batch: {
      sourceFile: batchData.timestamp,
      approvedRemovals: batchData.summary.totalApproved,
      rejectedFiles: batchData.summary.rejectedFiles,
      skippedFiles: batchData.summary.skippedFiles
    },
    
    execution: {
      filesProcessed: results.filesProcessed,
      totalRemovals: results.totalRemovals,
      errors: results.errors,
      success: results.errors.length === 0
    },
    
    backup: isDryRun ? null : {
      location: `backups/${BATCH_CONFIG.BACKUP_DIR}/`,
      created: new Date().toISOString()
    }
  };
  
  // Save report
  await fs.mkdir(BATCH_CONFIG.REPORTS_DIR, { recursive: true });
  const reportPath = path.join(BATCH_CONFIG.REPORTS_DIR, 
    `batch_execution_${isDryRun ? 'simulation' : 'report'}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\\n📊 Report saved: ${reportPath}`);
  
  return report;
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ Usage: node scripts/review/executeApprovedBatch.js <batch-file> [--dry-run]');
    console.log('\\nAvailable batch files:');
    
    try {
      const files = await fs.readdir('scripts/review');
      const batchFiles = files.filter(f => f.startsWith('approved_cleanup_batch_'));
      batchFiles.forEach(file => console.log(`   scripts/review/${file}`));
    } catch (error) {
      console.log('   No batch files found');
    }
    
    process.exit(1);
  }
  
  const batchFilePath = args[0];
  const isDryRun = args.includes('--dry-run');
  
  try {
    const result = await executeApprovedBatch(batchFilePath, isDryRun);
    
    console.log(`\\n🎯 BATCH EXECUTION RESULT: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = {
  executeApprovedBatch,
  processFileRemovals,
  BATCH_CONFIG
};