#!/usr/bin/env node

/**
 * Interactive Review System
 * 
 * Step-by-step interactive review of duplicate cleanup operations.
 * Allows selective approval/rejection of removals with detailed context.
 * 
 * Usage: node scripts/review/interactiveReview.js
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const duplicateDetectionService = require('../../src/services/duplicateDetectionService');

/**
 * Configuration for interactive review
 */
const REVIEW_CONFIG = {
  HIGH_CONFIDENCE_THRESHOLD: 0.9,
  SHOW_PLAYER_SAMPLES: 5,
  AUTO_SAVE_DECISIONS: true,
  DECISIONS_FILE: 'scripts/review/review_decisions.json'
};

/**
 * Create readline interface
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Ask a question and wait for response
 */
function question(rl, query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

/**
 * Display file context with detailed information
 */
async function displayFileContext(filePath, removals) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📄 FILE: ${filePath.split('/').pop()}`);
  console.log(`${'='.repeat(80)}`);
  
  try {
    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
    const playersArray = Array.isArray(data.players) ? data.players : 
                        (Array.isArray(data) ? data : []);
    
    console.log(`📊 File Overview:`);
    console.log(`   📅 Date: ${data.date || 'Unknown'}`);
    console.log(`   👥 Total Players: ${playersArray.length}`);
    console.log(`   🎯 Scheduled Removals: ${removals.length}`);
    console.log(`   📉 Impact: ${(removals.length / playersArray.length * 100).toFixed(2)}% reduction`);
    
    // Group removals by game ID for clearer presentation
    const removalsByGameId = {};
    removals.forEach(removal => {
      const gameId = removal.gameId;
      if (!removalsByGameId[gameId]) {
        removalsByGameId[gameId] = [];
      }
      removalsByGameId[gameId].push(removal);
    });
    
    console.log(`\n🎮 Game IDs to be Removed:`);
    for (const [gameId, gameRemovals] of Object.entries(removalsByGameId)) {
      const affectedPlayers = playersArray.filter(p => 
        p.gameId === gameId || p.gameId === parseInt(gameId)
      );
      
      console.log(`\n   🆔 Game ID: ${gameId}`);
      console.log(`      Reason: ${gameRemovals[0].reason}`);
      console.log(`      Confidence: ${Math.round(gameRemovals[0].confidence * 100)}%`);
      console.log(`      Affected Players: ${affectedPlayers.length}`);
      
      if (affectedPlayers.length > 0) {
        const teams = [...new Set(affectedPlayers.map(p => p.team))];
        console.log(`      Teams: ${teams.join(', ')}`);
        
        // Show sample players
        const samplePlayers = affectedPlayers.slice(0, REVIEW_CONFIG.SHOW_PLAYER_SAMPLES);
        console.log(`      Sample Players:`);
        samplePlayers.forEach(player => {
          const stats = player.playerType === 'hitter' ? 
            `${player.AB || 0} AB, ${player.H || 0} H, ${player.HR || 0} HR` :
            `${player.IP || 0} IP, ${player.H || 0} H, ${player.ER || 0} ER`;
          console.log(`        ${player.name} (${player.team}) - ${stats}`);
        });
        
        if (affectedPlayers.length > REVIEW_CONFIG.SHOW_PLAYER_SAMPLES) {
          console.log(`        ... and ${affectedPlayers.length - REVIEW_CONFIG.SHOW_PLAYER_SAMPLES} more`);
        }
      }
    }
    
    // Cross-date verification
    console.log(`\n🔍 Cross-Date Verification:`);
    for (const gameId of Object.keys(removalsByGameId)) {
      const otherFiles = await findGameIdInOtherFiles(gameId, filePath);
      if (otherFiles.length > 0) {
        console.log(`   ✅ Game ID ${gameId} found in: ${otherFiles.map(f => f.split('/').pop()).join(', ')}`);
      } else {
        console.log(`   ⚠️  Game ID ${gameId} not found elsewhere (unusual)`);
      }
    }
    
    return {
      totalPlayers: playersArray.length,
      removalCount: removals.length,
      gameIds: Object.keys(removalsByGameId),
      impact: (removals.length / playersArray.length * 100).toFixed(2)
    };
    
  } catch (error) {
    console.error(`❌ Error reading file: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Find game ID in other files for verification
 */
async function findGameIdInOtherFiles(gameId, excludeFile) {
  const otherFiles = [];
  const months = ['march', 'april', 'may', 'june', 'july', 'august', 'september'];
  
  for (const month of months) {
    try {
      const monthDir = `public/data/2025/${month}`;
      const files = await fs.readdir(monthDir);
      
      for (const file of files.filter(f => f.endsWith('.json'))) {
        const filePath = path.join(monthDir, file);
        if (filePath === excludeFile) continue;
        
        try {
          const content = await fs.readFile(filePath, 'utf8');
          if (content.includes(`"gameId": "${gameId}"`)) {
            otherFiles.push(filePath);
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    } catch (error) {
      // Skip directories that don't exist
    }
  }
  
  return otherFiles;
}

/**
 * Present review options for a file
 */
async function reviewFileDecision(rl, filePath, removals, fileContext) {
  console.log(`\n📋 REVIEW DECISION FOR: ${filePath.split('/').pop()}`);
  console.log(`${'─'.repeat(60)}`);
  
  console.log(`Options:`);
  console.log(`  [a] Approve all removals for this file (${removals.length} removals)`);
  console.log(`  [r] Reject all removals for this file`);
  console.log(`  [s] Selective - choose specific game IDs to approve`);
  console.log(`  [v] View detailed player list`);
  console.log(`  [i] Skip this file (decide later)`);
  console.log(`  [q] Quit review process`);
  
  while (true) {
    const answer = await question(rl, '\n🎯 Your decision: ');
    const choice = answer.toLowerCase().trim();
    
    switch (choice) {
      case 'a':
        return { action: 'approve_all', removals };
        
      case 'r':
        return { action: 'reject_all', removals: [] };
        
      case 's':
        return await selectiveApproval(rl, filePath, removals);
        
      case 'v':
        await showDetailedPlayerList(filePath, removals);
        continue;
        
      case 'i':
        return { action: 'skip' };
        
      case 'q':
        return { action: 'quit' };
        
      default:
        console.log(`❌ Invalid choice: ${choice}. Please choose a, r, s, v, i, or q.`);
        continue;
    }
  }
}

/**
 * Selective approval of specific game IDs
 */
async function selectiveApproval(rl, filePath, removals) {
  const removalsByGameId = {};
  removals.forEach(removal => {
    const gameId = removal.gameId;
    if (!removalsByGameId[gameId]) {
      removalsByGameId[gameId] = [];
    }
    removalsByGameId[gameId].push(removal);
  });
  
  console.log(`\n🎯 Selective Approval for: ${filePath.split('/').pop()}`);
  console.log(`Choose which game IDs to approve for removal:`);
  
  const approvedRemovals = [];
  
  for (const [gameId, gameRemovals] of Object.entries(removalsByGameId)) {
    console.log(`\n🆔 Game ID: ${gameId} (${gameRemovals.length} removals)`);
    console.log(`   Reason: ${gameRemovals[0].reason}`);
    console.log(`   Confidence: ${Math.round(gameRemovals[0].confidence * 100)}%`);
    
    const approveAnswer = await question(rl, '   Approve removal of this game ID? [y/n]: ');
    
    if (approveAnswer.toLowerCase().trim() === 'y') {
      approvedRemovals.push(...gameRemovals);
      console.log(`   ✅ Approved for removal`);
    } else {
      console.log(`   ❌ Rejected - will keep this game ID`);
    }
  }
  
  return { action: 'selective', removals: approvedRemovals };
}

/**
 * Show detailed player list
 */
async function showDetailedPlayerList(filePath, removals) {
  console.log(`\n📋 DETAILED PLAYER LIST FOR: ${filePath.split('/').pop()}`);
  console.log(`${'─'.repeat(80)}`);
  
  try {
    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
    const playersArray = Array.isArray(data.players) ? data.players : 
                        (Array.isArray(data) ? data : []);
    
    const removalsByGameId = {};
    removals.forEach(removal => {
      const gameId = removal.gameId;
      if (!removalsByGameId[gameId]) {
        removalsByGameId[gameId] = [];
      }
      removalsByGameId[gameId].push(removal);
    });
    
    for (const gameId of Object.keys(removalsByGameId)) {
      const affectedPlayers = playersArray.filter(p => 
        p.gameId === gameId || p.gameId === parseInt(gameId)
      );
      
      console.log(`\n🆔 Game ID ${gameId} - ${affectedPlayers.length} players:`);
      
      const hitters = affectedPlayers.filter(p => p.playerType === 'hitter');
      const pitchers = affectedPlayers.filter(p => p.playerType === 'pitcher');
      
      if (hitters.length > 0) {
        console.log(`   🏏 Hitters (${hitters.length}):`);
        hitters.forEach(player => {
          console.log(`     ${player.name} (${player.team}) - ${player.AB || 0} AB, ${player.H || 0} H, ${player.HR || 0} HR, ${player.RBI || 0} RBI`);
        });
      }
      
      if (pitchers.length > 0) {
        console.log(`   ⚾ Pitchers (${pitchers.length}):`);
        pitchers.forEach(player => {
          console.log(`     ${player.name} (${player.team}) - ${player.IP || 0} IP, ${player.H || 0} H, ${player.ER || 0} ER, ${player.K || 0} K`);
        });
      }
    }
    
  } catch (error) {
    console.error(`❌ Error showing player list: ${error.message}`);
  }
  
  await question(rl, '\nPress Enter to continue...');
}

/**
 * Save review decisions
 */
async function saveDecisions(decisions) {
  if (!REVIEW_CONFIG.AUTO_SAVE_DECISIONS) return;
  
  try {
    await fs.mkdir(path.dirname(REVIEW_CONFIG.DECISIONS_FILE), { recursive: true });
    await fs.writeFile(REVIEW_CONFIG.DECISIONS_FILE, JSON.stringify({
      timestamp: new Date().toISOString(),
      decisions
    }, null, 2));
    
    console.log(`💾 Review decisions saved to: ${REVIEW_CONFIG.DECISIONS_FILE}`);
  } catch (error) {
    console.warn(`⚠️  Could not save decisions: ${error.message}`);
  }
}

/**
 * Generate approved cleanup batch
 */
async function generateApprovedBatch(decisions) {
  const approvedRemovals = [];
  const rejectedFiles = [];
  const skippedFiles = [];
  
  decisions.forEach(decision => {
    switch (decision.action) {
      case 'approve_all':
      case 'selective':
        approvedRemovals.push(...decision.removals);
        break;
      case 'reject_all':
        rejectedFiles.push(decision.filePath);
        break;
      case 'skip':
        skippedFiles.push(decision.filePath);
        break;
    }
  });
  
  console.log(`\n📊 REVIEW SUMMARY`);
  console.log(`${'='.repeat(50)}`);
  console.log(`✅ Approved Removals: ${approvedRemovals.length}`);
  console.log(`❌ Rejected Files: ${rejectedFiles.length}`);
  console.log(`⏭️  Skipped Files: ${skippedFiles.length}`);
  
  if (approvedRemovals.length > 0) {
    const batchPath = `scripts/review/approved_cleanup_batch_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await fs.writeFile(batchPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      approvedRemovals,
      summary: {
        totalApproved: approvedRemovals.length,
        rejectedFiles,
        skippedFiles
      }
    }, null, 2));
    
    console.log(`💾 Approved batch saved to: ${batchPath}`);
    console.log(`\n💡 To execute approved removals:`);
    console.log(`   node scripts/review/executeApprovedBatch.js ${batchPath}`);
  } else {
    console.log(`\n💡 No removals approved - no batch file generated`);
  }
  
  return {
    approvedRemovals,
    rejectedFiles,
    skippedFiles
  };
}

/**
 * Main interactive review function
 */
async function runInteractiveReview() {
  console.log('🔍 INTERACTIVE DUPLICATE REVIEW SYSTEM');
  console.log('=====================================');
  console.log('This tool allows you to review each file and approve/reject specific removals.\n');
  
  const rl = createInterface();
  
  try {
    // Get current analysis
    console.log('📊 Analyzing current duplicate state...');
    const analysis = await duplicateDetectionService.analyzeDatasetForDuplicates();
    const highConfidenceRemovals = analysis.removalRecommendations.filter(r => 
      r.confidence >= REVIEW_CONFIG.HIGH_CONFIDENCE_THRESHOLD
    );
    
    console.log(`\n📈 Analysis Results:`);
    console.log(`   High-Confidence Removals: ${highConfidenceRemovals.length}`);
    
    // Group by file
    const fileGroups = {};
    highConfidenceRemovals.forEach(removal => {
      if (!fileGroups[removal.file]) {
        fileGroups[removal.file] = [];
      }
      fileGroups[removal.file].push(removal);
    });
    
    const filesToReview = Object.keys(fileGroups);
    console.log(`   Files to Review: ${filesToReview.length}`);
    
    if (filesToReview.length === 0) {
      console.log(`✅ No high-confidence removals found - nothing to review!`);
      return;
    }
    
    const continueAnswer = await question(rl, '\n🎯 Continue with interactive review? [y/n]: ');
    if (continueAnswer.toLowerCase().trim() !== 'y') {
      console.log('Review cancelled.');
      return;
    }
    
    // Review each file
    const decisions = [];
    
    for (let i = 0; i < filesToReview.length; i++) {
      const filePath = filesToReview[i];
      const removals = fileGroups[filePath];
      
      console.log(`\n📍 FILE ${i + 1} OF ${filesToReview.length}`);
      
      // Display file context
      const fileContext = await displayFileContext(filePath, removals);
      
      if (fileContext.error) {
        console.log(`❌ Skipping file due to error: ${fileContext.error}`);
        continue;
      }
      
      // Get user decision
      const decision = await reviewFileDecision(rl, filePath, removals, fileContext);
      
      if (decision.action === 'quit') {
        console.log('\n🛑 Review process terminated by user.');
        break;
      }
      
      decisions.push({
        filePath,
        ...decision
      });
      
      console.log(`📝 Decision recorded: ${decision.action}`);
    }
    
    // Save decisions and generate batch
    await saveDecisions(decisions);
    const batch = await generateApprovedBatch(decisions);
    
    console.log(`\n🎉 Interactive review completed!`);
    
    return batch;
    
  } catch (error) {
    console.error('❌ Review error:', error);
    throw error;
  } finally {
    rl.close();
  }
}

// Execute if run directly
if (require.main === module) {
  runInteractiveReview().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  runInteractiveReview,
  displayFileContext,
  generateApprovedBatch,
  REVIEW_CONFIG
};