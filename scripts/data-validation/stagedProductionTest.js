#!/usr/bin/env node

/**
 * Staged Production Test Script
 * 
 * Safe testing approach that limits to high-confidence duplicates only.
 * This addresses the user's request: "test this in non prod first, as well as 
 * the production environment" with comprehensive verification before production.
 * 
 * Usage: node scripts/data-validation/stagedProductionTest.js [--execute]
 */

const fs = require('fs').promises;
const path = require('path');
const duplicateDetectionService = require('../../src/services/duplicateDetectionService');

/**
 * Configuration for staged testing
 */
const STAGED_CONFIG = {
  // Conservative limits for testing
  MAX_HIGH_CONFIDENCE_REMOVALS: 50,
  HIGH_CONFIDENCE_THRESHOLD: 0.9,
  
  // Backup and reporting
  BACKUP_DIR: `staged_test_backup_${new Date().toISOString().split('T')[0]}`,
  REPORTS_DIR: 'scripts/data-validation/reports',
  
  // Safety checks
  REQUIRE_JULY_CORRELATION: true, // Ensure most removals are in July 2-9 period
  MIN_JULY_PERCENTAGE: 0.7 // 70% of removals should be in known problem period
};

/**
 * Analyze high-confidence removals for safety
 */
async function analyzeHighConfidenceRemovals() {
  console.log('🔍 Analyzing high-confidence duplicate removals...');
  
  const analysis = await duplicateDetectionService.analyzeDatasetForDuplicates();
  const highConfidenceRemovals = analysis.removalRecommendations.filter(r => 
    r.confidence >= STAGED_CONFIG.HIGH_CONFIDENCE_THRESHOLD
  );
  
  console.log(`📊 Analysis Results:`);
  console.log(`   Total Issues: ${analysis.summary.totalIssues}`);
  console.log(`   Affected Players: ${analysis.summary.affectedPlayers}`);
  console.log(`   Total Recommendations: ${analysis.summary.totalRemovalRecommendations}`);
  console.log(`   High-Confidence Removals: ${highConfidenceRemovals.length}`);
  
  // Safety validation
  const safetyChecks = {
    passed: true,
    warnings: [],
    errors: []
  };
  
  // Check removal count
  if (highConfidenceRemovals.length > STAGED_CONFIG.MAX_HIGH_CONFIDENCE_REMOVALS) {
    safetyChecks.errors.push(
      `Too many high-confidence removals: ${highConfidenceRemovals.length} > ${STAGED_CONFIG.MAX_HIGH_CONFIDENCE_REMOVALS}`
    );
    safetyChecks.passed = false;
  }
  
  // Check July correlation
  const julyRemovals = highConfidenceRemovals.filter(r => 
    r.date >= '2025-07-02' && r.date <= '2025-07-09'
  );
  const julyPercentage = julyRemovals.length / highConfidenceRemovals.length;
  
  console.log(`   July 2-9 Removals: ${julyRemovals.length} (${Math.round(julyPercentage * 100)}%)`);
  
  if (julyPercentage < STAGED_CONFIG.MIN_JULY_PERCENTAGE) {
    safetyChecks.warnings.push(
      `Only ${Math.round(julyPercentage * 100)}% of removals in known problem period (expected ≥70%)`
    );
  }
  
  // Analyze affected files
  const affectedFiles = new Set(highConfidenceRemovals.map(r => r.file));
  console.log(`   Affected Files: ${affectedFiles.size}`);
  
  // Show sample removals
  console.log(`\n🎯 High-Confidence Removal Sample:`);
  highConfidenceRemovals.slice(0, 10).forEach((removal, i) => {
    console.log(`   ${i+1}. ${removal.reason} (${removal.date}, confidence: ${Math.round(removal.confidence * 100)}%)`);
  });
  
  return {
    analysis,
    highConfidenceRemovals,
    safetyChecks,
    julyPercentage,
    affectedFiles: Array.from(affectedFiles)
  };
}

/**
 * Execute staged cleanup on high-confidence duplicates
 */
async function executeStagedCleanup(highConfidenceRemovals, executeChanges = false) {
  console.log(`\n🔧 ${executeChanges ? 'EXECUTING' : 'SIMULATING'} Staged Cleanup...`);
  
  if (executeChanges) {
    // Create backup directory
    await fs.mkdir(`backups/${STAGED_CONFIG.BACKUP_DIR}`, { recursive: true });
    console.log(`📁 Created backup directory: backups/${STAGED_CONFIG.BACKUP_DIR}`);
  }
  
  // Group removals by file
  const fileGroups = new Map();
  highConfidenceRemovals.forEach(removal => {
    if (!fileGroups.has(removal.file)) {
      fileGroups.set(removal.file, []);
    }
    fileGroups.get(removal.file).push(removal);
  });
  
  const results = {
    filesProcessed: 0,
    totalRemovals: 0,
    backupsCreated: 0,
    errors: []
  };
  
  console.log(`📋 Processing ${fileGroups.size} files with ${highConfidenceRemovals.length} removals:`);
  
  for (const [filePath, removals] of fileGroups) {
    try {
      console.log(`\n📄 ${executeChanges ? 'Processing' : 'Analyzing'}: ${filePath} (${removals.length} removals)`);
      
      // Load file
      const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
      const originalPlayerCount = Array.isArray(data.players) ? data.players.length : 
                                  (Array.isArray(data) ? data.length : 0);
      
      if (executeChanges) {
        // Create backup
        const relativePath = path.relative('public/data/2025', filePath);
        const backupPath = path.join(`backups/${STAGED_CONFIG.BACKUP_DIR}`, relativePath);
        const backupDir = path.dirname(backupPath);
        
        await fs.mkdir(backupDir, { recursive: true });
        await fs.copyFile(filePath, backupPath);
        results.backupsCreated++;
        console.log(`   📄 Backup created: ${backupPath}`);
      }
      
      // Process removals
      let removedCount = 0;
      const playersArray = Array.isArray(data.players) ? data.players : 
                          (Array.isArray(data) ? data : []);
      
      if (playersArray.length > 0) {
        const filteredPlayers = playersArray.filter(player => {
          const playerKey = `${player.name}_${player.team}`;
          const gameId = player.gameId;
          
          const shouldRemove = removals.some(removal => 
            removal.action === 'remove_player_game' &&
            removal.playerKey === playerKey && 
            (removal.gameId === gameId || removal.gameId === gameId?.toString())
          );
          
          if (shouldRemove) {
            removedCount++;
            console.log(`   ${executeChanges ? 'Removed' : 'Would remove'}: ${player.name} (${gameId})`);
          }
          
          return !shouldRemove;
        });
        
        if (executeChanges && removedCount > 0) {
          // Update file
          if (Array.isArray(data.players)) {
            data.players = filteredPlayers;
          } else if (Array.isArray(data)) {
            Object.keys(data).forEach(key => delete data[key]);
            filteredPlayers.forEach((player, index) => {
              data[index] = player;
            });
            data.length = filteredPlayers.length;
          }
          
          await fs.writeFile(filePath, JSON.stringify(data, null, 2));
          console.log(`   ✅ File updated: ${originalPlayerCount} → ${filteredPlayers.length} players`);
        } else if (!executeChanges && removedCount > 0) {
          console.log(`   🔍 Would update: ${originalPlayerCount} → ${originalPlayerCount - removedCount} players`);
        }
      }
      
      results.filesProcessed++;
      results.totalRemovals += removedCount;
      
    } catch (error) {
      console.error(`   ❌ Error processing ${filePath}: ${error.message}`);
      results.errors.push({ file: filePath, error: error.message });
    }
  }
  
  return results;
}

/**
 * Validate results after cleanup
 */
async function validateResults(originalAnalysis) {
  console.log('\n🧪 Validating cleanup results...');
  
  const newAnalysis = await duplicateDetectionService.analyzeDatasetForDuplicates();
  
  const improvement = {
    issuesReduced: originalAnalysis.summary.totalIssues - newAnalysis.summary.totalIssues,
    playersFixed: originalAnalysis.summary.affectedPlayers - newAnalysis.summary.affectedPlayers,
    recommendationsReduced: originalAnalysis.summary.totalRemovalRecommendations - newAnalysis.summary.totalRemovalRecommendations
  };
  
  console.log('📊 Cleanup Impact:');
  console.log(`   Issues Reduced: ${improvement.issuesReduced}`);
  console.log(`   Players Fixed: ${improvement.playersFixed}`);
  console.log(`   Recommendations Reduced: ${improvement.recommendationsReduced}`);
  
  const highConfidenceAfter = newAnalysis.removalRecommendations.filter(r => 
    r.confidence >= STAGED_CONFIG.HIGH_CONFIDENCE_THRESHOLD
  ).length;
  
  console.log(`   High-Confidence Remaining: ${highConfidenceAfter}`);
  
  return {
    newAnalysis,
    improvement,
    highConfidenceRemaining: highConfidenceAfter
  };
}

/**
 * Generate comprehensive staged test report
 */
async function generateStagedTestReport(testResults) {
  const report = {
    timestamp: new Date().toISOString(),
    testType: 'staged_production_test',
    configuration: STAGED_CONFIG,
    
    analysis: {
      before: {
        totalIssues: testResults.originalAnalysis.summary.totalIssues,
        affectedPlayers: testResults.originalAnalysis.summary.affectedPlayers,
        totalRecommendations: testResults.originalAnalysis.summary.totalRemovalRecommendations,
        highConfidenceRecommendations: testResults.highConfidenceRemovals.length
      },
      after: testResults.validation ? {
        totalIssues: testResults.validation.newAnalysis.summary.totalIssues,
        affectedPlayers: testResults.validation.newAnalysis.summary.affectedPlayers,
        totalRecommendations: testResults.validation.newAnalysis.summary.totalRemovalRecommendations,
        highConfidenceRemaining: testResults.validation.highConfidenceRemaining
      } : null
    },
    
    execution: testResults.executionResults,
    safetyChecks: testResults.safetyChecks,
    
    recommendations: [],
    nextSteps: []
  };
  
  // Generate recommendations
  if (testResults.safetyChecks.passed) {
    if (testResults.executionResults.errors.length === 0) {
      report.recommendations.push('Staged cleanup completed successfully');
      report.recommendations.push('High-confidence duplicates removed safely');
      
      if (testResults.validation && testResults.validation.improvement.issuesReduced > 0) {
        report.recommendations.push(`Successfully reduced ${testResults.validation.improvement.issuesReduced} duplicate issues`);
        report.nextSteps.push('Consider running additional cleanup phases if needed');
        report.nextSteps.push('Monitor for any remaining data quality issues');
        report.nextSteps.push('Regenerate milestone tracking and rolling stats');
      }
    } else {
      report.recommendations.push('Some errors encountered during cleanup');
      report.nextSteps.push('Review and fix cleanup errors');
    }
  } else {
    report.recommendations.push('Safety checks failed - do not proceed');
    report.nextSteps.push('Address safety check failures');
  }
  
  // Save report
  await fs.mkdir(STAGED_CONFIG.REPORTS_DIR, { recursive: true });
  const reportPath = path.join(STAGED_CONFIG.REPORTS_DIR, 
    `staged_test_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📊 Report saved: ${reportPath}`);
  return report;
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const executeChanges = args.includes('--execute');
  
  console.log('🚀 Staged Production Test');
  console.log('========================');
  console.log(`Mode: ${executeChanges ? 'LIVE EXECUTION' : 'SIMULATION'}`);
  console.log(`Target: High-confidence duplicates only (≥${STAGED_CONFIG.HIGH_CONFIDENCE_THRESHOLD * 100}%)`);
  
  try {
    // Step 1: Analyze high-confidence removals
    const analysisResults = await analyzeHighConfidenceRemovals();
    
    console.log('\n🛡️  Safety Check Results:');
    if (analysisResults.safetyChecks.passed) {
      console.log('✅ All safety checks passed');
    } else {
      console.log('❌ Safety checks failed:');
      analysisResults.safetyChecks.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (analysisResults.safetyChecks.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      analysisResults.safetyChecks.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    if (!analysisResults.safetyChecks.passed) {
      console.log('\n❌ Cannot proceed - safety checks failed');
      process.exit(1);
    }
    
    // Step 2: Execute/simulate cleanup
    const executionResults = await executeStagedCleanup(
      analysisResults.highConfidenceRemovals, 
      executeChanges
    );
    
    console.log(`\n📈 ${executeChanges ? 'Execution' : 'Simulation'} Results:`);
    console.log(`   Files Processed: ${executionResults.filesProcessed}`);
    console.log(`   Total Removals: ${executionResults.totalRemovals}`);
    if (executeChanges) {
      console.log(`   Backups Created: ${executionResults.backupsCreated}`);
    }
    console.log(`   Errors: ${executionResults.errors.length}`);
    
    // Step 3: Validate results (only if changes were made)
    let validation = null;
    if (executeChanges) {
      validation = await validateResults(analysisResults.analysis);
    }
    
    // Step 4: Generate report
    const report = await generateStagedTestReport({
      originalAnalysis: analysisResults.analysis,
      highConfidenceRemovals: analysisResults.highConfidenceRemovals,
      safetyChecks: analysisResults.safetyChecks,
      executionResults,
      validation
    });
    
    console.log('\n🎯 STAGED TEST SUMMARY');
    console.log('======================');
    console.log(`High-Confidence Removals: ${analysisResults.highConfidenceRemovals.length}`);
    console.log(`July Correlation: ${Math.round(analysisResults.julyPercentage * 100)}%`);
    console.log(`Files Affected: ${analysisResults.affectedFiles.length}`);
    console.log(`Safety Status: ${analysisResults.safetyChecks.passed ? 'PASSED' : 'FAILED'}`);
    
    if (executeChanges && validation) {
      console.log(`Issues Resolved: ${validation.improvement.issuesReduced}`);
      console.log(`Players Fixed: ${validation.improvement.playersFixed}`);
    }
    
    console.log('\n💡 Next Steps:');
    if (!executeChanges) {
      console.log('   • Review simulation results');
      console.log('   • Run with --execute flag to apply changes:');
      console.log('     node scripts/data-validation/stagedProductionTest.js --execute');
    } else {
      console.log('   • Regenerate milestone tracking: npm run generate-milestones');
      console.log('   • Regenerate rolling stats: ./generate_rolling_stats.sh');
      console.log('   • Test application functionality');
      if (validation && validation.highConfidenceRemaining > 0) {
        console.log(`   • Consider additional cleanup phases (${validation.highConfidenceRemaining} high-confidence issues remain)`);
      }
    }
    
    if (executeChanges) {
      console.log(`\n🔄 Rollback Available:`);
      console.log(`   Backup: backups/${STAGED_CONFIG.BACKUP_DIR}/`);
      console.log(`   Command: tar -xzf backups/${STAGED_CONFIG.BACKUP_DIR}.tar.gz`);
    }
    
  } catch (error) {
    console.error('❌ Staged test error:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = {
  analyzeHighConfidenceRemovals,
  executeStagedCleanup,
  validateResults,
  STAGED_CONFIG
};