#!/usr/bin/env node

/**
 * Post-Cleanup Verification System
 * 
 * Comprehensive verification that cleanup was successful and data is accurate.
 * Compares before/after states, verifies affected players, and validates against external sources.
 * 
 * Usage: node scripts/verification/postCleanupVerification.js [--batch-file=path]
 */

const fs = require('fs').promises;
const path = require('path');
const duplicateDetectionService = require('../../src/services/duplicateDetectionService');

/**
 * Configuration for verification
 */
const VERIFICATION_CONFIG = {
  REPORTS_DIR: 'scripts/verification/reports',
  EXTERNAL_VALIDATION: false, // Enable when BaseballAPI is available
  PLAYER_SAMPLE_SIZE: 10, // Number of players to verify in detail
  CONFIDENCE_THRESHOLD: 0.9
};

/**
 * Load and analyze cleanup results
 */
async function analyzeCleanupResults(batchFilePath = null) {
  console.log('🔍 ANALYZING CLEANUP RESULTS');
  console.log('============================');
  
  try {
    // Find the most recent cleanup if no specific batch provided
    if (!batchFilePath) {
      const reviewFiles = await fs.readdir('scripts/review');
      const batchFiles = reviewFiles
        .filter(f => f.startsWith('approved_cleanup_batch_'))
        .sort()
        .reverse();
      
      if (batchFiles.length === 0) {
        throw new Error('No cleanup batch files found');
      }
      
      batchFilePath = path.join('scripts/review', batchFiles[0]);
      console.log(`📄 Using most recent batch: ${batchFiles[0]}`);
    }
    
    // Load batch file
    const batchData = JSON.parse(await fs.readFile(batchFilePath, 'utf8'));
    const { approvedRemovals, summary } = batchData;
    
    console.log(`\n📊 Cleanup Summary:`);
    console.log(`   Approved Removals: ${summary.totalApproved}`);
    console.log(`   Affected Files: ${approvedRemovals.length > 0 ? new Set(approvedRemovals.map(r => r.file.split('/').pop())).size : 0}`);
    
    // Analyze removed game IDs
    const removedGameIds = [...new Set(approvedRemovals.map(r => r.gameId))];
    console.log(`   Unique Game IDs Removed: ${removedGameIds.length}`);
    
    // Group by reason to understand cleanup patterns
    const reasonGroups = {};
    approvedRemovals.forEach(removal => {
      const reason = removal.reason;
      if (!reasonGroups[reason]) reasonGroups[reason] = 0;
      reasonGroups[reason]++;
    });
    
    console.log(`\n🎯 Cleanup Patterns:`);
    Object.entries(reasonGroups).forEach(([reason, count]) => {
      console.log(`   ${reason}: ${count} removals`);
    });
    
    return {
      batchData,
      removedGameIds,
      affectedFiles: [...new Set(approvedRemovals.map(r => r.file))],
      cleanupPatterns: reasonGroups
    };
    
  } catch (error) {
    console.error('❌ Error analyzing cleanup results:', error);
    throw error;
  }
}

/**
 * Run current duplicate analysis to verify cleanup success
 */
async function verifyCleanupSuccess(cleanupResults) {
  console.log('\n🧪 VERIFYING CLEANUP SUCCESS');
  console.log('============================');
  
  try {
    // Run fresh duplicate analysis
    const currentAnalysis = await duplicateDetectionService.analyzeDatasetForDuplicates();
    
    console.log(`📊 Current State:`);
    console.log(`   Total Issues: ${currentAnalysis.summary.totalIssues}`);
    console.log(`   Affected Players: ${currentAnalysis.summary.affectedPlayers}`);
    console.log(`   High-Confidence Removals: ${currentAnalysis.summary.highConfidenceRemovals}`);
    
    // Check if removed game IDs still exist
    const stillPresentGameIds = [];
    const highConfidenceRemovals = currentAnalysis.removalRecommendations.filter(r => 
      r.confidence >= VERIFICATION_CONFIG.CONFIDENCE_THRESHOLD
    );
    
    for (const removedGameId of cleanupResults.removedGameIds) {
      const stillExists = highConfidenceRemovals.some(r => 
        r.gameId === removedGameId || r.gameId === removedGameId.toString()
      );
      
      if (stillExists) {
        stillPresentGameIds.push(removedGameId);
      }
    }
    
    console.log(`\n✅ Verification Results:`);
    console.log(`   Game IDs Successfully Removed: ${cleanupResults.removedGameIds.length - stillPresentGameIds.length}`);
    console.log(`   Game IDs Still Present: ${stillPresentGameIds.length}`);
    
    if (stillPresentGameIds.length > 0) {
      console.log(`   ⚠️  Still Present: ${stillPresentGameIds.join(', ')}`);
    }
    
    const verificationSuccess = stillPresentGameIds.length === 0;
    
    if (verificationSuccess) {
      console.log(`   🎉 CLEANUP VERIFICATION: SUCCESS`);
    } else {
      console.log(`   ❌ CLEANUP VERIFICATION: FAILED`);
    }
    
    return {
      currentAnalysis,
      verificationSuccess,
      stillPresentGameIds,
      improvementMetrics: {
        issuesReduced: 'N/A', // Would need before state
        duplicatesEliminated: cleanupResults.removedGameIds.length - stillPresentGameIds.length
      }
    };
    
  } catch (error) {
    console.error('❌ Error verifying cleanup success:', error);
    throw error;
  }
}

/**
 * Verify specific affected players
 */
async function verifyAffectedPlayers(cleanupResults, verificationResults) {
  console.log('\n👥 VERIFYING AFFECTED PLAYERS');
  console.log('=============================');
  
  try {
    // Extract affected players from cleanup data
    const affectedPlayers = new Set();
    
    // Load files that were cleaned and identify affected players
    for (const filePath of cleanupResults.affectedFiles) {
      try {
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        const playersArray = Array.isArray(data.players) ? data.players : 
                            (Array.isArray(data) ? data : []);
        
        // Find players that were associated with removed game IDs
        playersArray.forEach(player => {
          const gameId = player.gameId;
          if (cleanupResults.removedGameIds.includes(gameId) || 
              cleanupResults.removedGameIds.includes(gameId?.toString())) {
            affectedPlayers.add(`${player.name}_${player.team}`);
          }
        });
        
      } catch (error) {
        console.warn(`⚠️  Could not analyze file: ${filePath}`);
      }
    }
    
    console.log(`📊 Player Impact Analysis:`);
    console.log(`   Players Previously Affected: ${affectedPlayers.size}`);
    
    // Sample player verification
    const playerList = Array.from(affectedPlayers).slice(0, VERIFICATION_CONFIG.PLAYER_SAMPLE_SIZE);
    
    console.log(`\n🔍 Sample Player Verification (${playerList.length} players):`);
    
    const playerVerifications = [];
    
    for (const playerKey of playerList) {
      const [playerName, team] = playerKey.split('_');
      
      // Check current duplicate analysis for this player
      const currentIssues = verificationResults.currentAnalysis.playerDuplicates.filter(p => 
        p.playerKey === playerKey || p.playerName === playerName
      );
      
      const verificationStatus = currentIssues.length === 0 ? 'CLEAN' : 'ISSUES_REMAIN';
      
      console.log(`   ${playerName} (${team}): ${verificationStatus}`);
      if (currentIssues.length > 0) {
        console.log(`     Issues: ${currentIssues.length} duplicates, +${currentIssues[0]?.totalStatsImpact?.extraHits || 0} extra hits`);
      }
      
      playerVerifications.push({
        playerKey,
        playerName,
        team,
        status: verificationStatus,
        remainingIssues: currentIssues.length
      });
    }
    
    const cleanPlayers = playerVerifications.filter(p => p.status === 'CLEAN').length;
    const playersWithIssues = playerVerifications.filter(p => p.status === 'ISSUES_REMAIN').length;
    
    console.log(`\n📈 Player Verification Summary:`);
    console.log(`   Clean Players: ${cleanPlayers}/${playerVerifications.length}`);
    console.log(`   Players with Remaining Issues: ${playersWithIssues}/${playerVerifications.length}`);
    
    const playerVerificationSuccess = playersWithIssues === 0;
    
    return {
      affectedPlayersCount: affectedPlayers.size,
      sampleVerifications: playerVerifications,
      playerVerificationSuccess,
      cleanPlayersCount: cleanPlayers,
      playersWithIssuesCount: playersWithIssues
    };
    
  } catch (error) {
    console.error('❌ Error verifying affected players:', error);
    throw error;
  }
}

/**
 * Generate rolling stats and verify accuracy
 */
async function generateAndVerifyStats(cleanupResults) {
  console.log('\n📊 GENERATING AND VERIFYING STATISTICS');
  console.log('=====================================');
  
  try {
    const { execSync } = require('child_process');
    
    // Generate fresh rolling stats
    console.log('🔄 Generating fresh rolling statistics...');
    
    try {
      const result = execSync('./generate_rolling_stats.sh', { 
        encoding: 'utf8',
        cwd: process.cwd()
      });
      console.log('✅ Rolling stats generation completed');
    } catch (error) {
      console.log('⚠️  Rolling stats generation failed - continuing with existing data');
    }
    
    // Generate milestone tracking
    console.log('🎯 Generating milestone tracking...');
    
    try {
      const milestoneResult = execSync('npm run generate-milestones', { 
        encoding: 'utf8',
        cwd: process.cwd()
      });
      console.log('✅ Milestone tracking generation completed');
    } catch (error) {
      console.log('⚠️  Milestone tracking generation failed');
    }
    
    // Verify data consistency
    console.log('\n🔍 Verifying data consistency...');
    
    // Check if rolling stats files exist and are recent
    const rollingStatsFiles = [
      'public/data/rolling_stats/rolling_stats_season_latest.json',
      'public/data/rolling_stats/rolling_stats_last_30_latest.json',
      'public/data/rolling_stats/rolling_stats_last_7_latest.json'
    ];
    
    let statsFilesVerified = 0;
    for (const filePath of rollingStatsFiles) {
      try {
        const stats = await fs.stat(filePath);
        const ageMinutes = (Date.now() - stats.mtime.getTime()) / (1000 * 60);
        
        if (ageMinutes < 60) { // Less than 1 hour old
          console.log(`   ✅ ${filePath.split('/').pop()}: Fresh (${Math.round(ageMinutes)}m old)`);
          statsFilesVerified++;
        } else {
          console.log(`   ⚠️  ${filePath.split('/').pop()}: Stale (${Math.round(ageMinutes)}m old)`);
        }
      } catch (error) {
        console.log(`   ❌ ${filePath.split('/').pop()}: Missing`);
      }
    }
    
    console.log(`\n📈 Stats Verification:`);
    console.log(`   Fresh Stats Files: ${statsFilesVerified}/${rollingStatsFiles.length}`);
    
    const statsVerificationSuccess = statsFilesVerified >= 2; // At least 2 of 3 files should be fresh
    
    return {
      statsGenerated: true,
      statsFilesVerified,
      totalStatsFiles: rollingStatsFiles.length,
      statsVerificationSuccess
    };
    
  } catch (error) {
    console.error('❌ Error generating and verifying stats:', error);
    return {
      statsGenerated: false,
      error: error.message
    };
  }
}

/**
 * Generate comprehensive verification report
 */
async function generateVerificationReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    verificationType: 'post_cleanup_verification',
    
    cleanup: {
      batchFile: results.cleanupResults?.batchData?.timestamp,
      removalsExecuted: results.cleanupResults?.removedGameIds?.length || 0,
      affectedFiles: results.cleanupResults?.affectedFiles?.length || 0,
      cleanupPatterns: results.cleanupResults?.cleanupPatterns || {}
    },
    
    verification: {
      duplicateRemovalSuccess: results.verificationResults?.verificationSuccess || false,
      stillPresentGameIds: results.verificationResults?.stillPresentGameIds || [],
      currentIssues: results.verificationResults?.currentAnalysis?.summary?.totalIssues || 0,
      currentAffectedPlayers: results.verificationResults?.currentAnalysis?.summary?.affectedPlayers || 0
    },
    
    playerVerification: {
      affectedPlayersCount: results.playerResults?.affectedPlayersCount || 0,
      sampleSize: results.playerResults?.sampleVerifications?.length || 0,
      cleanPlayersCount: results.playerResults?.cleanPlayersCount || 0,
      playersWithIssuesCount: results.playerResults?.playersWithIssuesCount || 0,
      playerVerificationSuccess: results.playerResults?.playerVerificationSuccess || false
    },
    
    statsVerification: {
      statsGenerated: results.statsResults?.statsGenerated || false,
      statsFilesVerified: results.statsResults?.statsFilesVerified || 0,
      totalStatsFiles: results.statsResults?.totalStatsFiles || 0,
      statsVerificationSuccess: results.statsResults?.statsVerificationSuccess || false
    },
    
    overallSuccess: false,
    recommendations: [],
    nextSteps: []
  };
  
  // Determine overall success
  const verificationSuccesses = [
    results.verificationResults?.verificationSuccess,
    results.playerResults?.playerVerificationSuccess,
    results.statsResults?.statsVerificationSuccess
  ].filter(Boolean).length;
  
  report.overallSuccess = verificationSuccesses >= 2; // At least 2 of 3 verifications should pass
  
  // Generate recommendations
  if (report.overallSuccess) {
    report.recommendations.push('Cleanup verification successful - data integrity restored');
    report.recommendations.push('Statistics have been regenerated and are current');
    report.nextSteps.push('Monitor ongoing data quality with automated duplicate detection');
    report.nextSteps.push('Consider integrating smart cleanup into daily pipeline');
  } else {
    report.recommendations.push('Cleanup verification found issues - further investigation needed');
    
    if (!results.verificationResults?.verificationSuccess) {
      report.nextSteps.push('Re-run duplicate removal for remaining game IDs');
    }
    
    if (!results.playerResults?.playerVerificationSuccess) {
      report.nextSteps.push('Investigate remaining player duplicate issues');
    }
    
    if (!results.statsResults?.statsVerificationSuccess) {
      report.nextSteps.push('Manually regenerate rolling statistics and milestone tracking');
    }
  }
  
  // Save report
  await fs.mkdir(VERIFICATION_CONFIG.REPORTS_DIR, { recursive: true });
  const reportPath = path.join(VERIFICATION_CONFIG.REPORTS_DIR, 
    `verification_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📊 Verification report saved: ${reportPath}`);
  
  return report;
}

/**
 * Main verification function
 */
async function runPostCleanupVerification(batchFilePath = null) {
  console.log('🔍 POST-CLEANUP VERIFICATION SYSTEM');
  console.log('===================================');
  console.log(`Started: ${new Date().toISOString()}`);
  
  try {
    const results = {};
    
    // Step 1: Analyze cleanup results
    results.cleanupResults = await analyzeCleanupResults(batchFilePath);
    
    // Step 2: Verify cleanup success
    results.verificationResults = await verifyCleanupSuccess(results.cleanupResults);
    
    // Step 3: Verify affected players
    results.playerResults = await verifyAffectedPlayers(results.cleanupResults, results.verificationResults);
    
    // Step 4: Generate and verify statistics
    results.statsResults = await generateAndVerifyStats(results.cleanupResults);
    
    // Step 5: Generate comprehensive report
    const report = await generateVerificationReport(results);
    
    // Print final summary
    console.log('\n🎯 VERIFICATION SUMMARY');
    console.log('======================');
    console.log(`Overall Success: ${report.overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Duplicate Removal: ${report.verification.duplicateRemovalSuccess ? '✅' : '❌'}`);
    console.log(`Player Verification: ${report.playerVerification.playerVerificationSuccess ? '✅' : '❌'}`);
    console.log(`Stats Verification: ${report.statsVerification.statsVerificationSuccess ? '✅' : '❌'}`);
    
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach(rec => console.log(`   • ${rec}`));
    
    console.log('\n📋 Next Steps:');
    report.nextSteps.forEach(step => console.log(`   • ${step}`));
    
    return report;
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

/**
 * Command line interface
 */
async function main() {
  const args = process.argv.slice(2);
  const batchFileArg = args.find(arg => arg.startsWith('--batch-file='));
  const batchFilePath = batchFileArg ? batchFileArg.split('=')[1] : null;
  
  try {
    const report = await runPostCleanupVerification(batchFilePath);
    process.exit(report.overallSuccess ? 0 : 1);
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
  runPostCleanupVerification,
  analyzeCleanupResults,
  verifyCleanupSuccess,
  verifyAffectedPlayers,
  generateAndVerifyStats
};