#!/usr/bin/env node

/**
 * Detailed Analysis Dashboard
 * 
 * Provides comprehensive step-by-step review of duplicate cleanup operations.
 * Shows exactly what will be removed, why, and the impact on each file.
 * 
 * Usage: node scripts/review/detailedAnalysisDashboard.js [--file=filename]
 */

const fs = require('fs').promises;
const path = require('path');
const duplicateDetectionService = require('../../src/services/duplicateDetectionService');

/**
 * Configuration for detailed analysis
 */
const ANALYSIS_CONFIG = {
  HIGH_CONFIDENCE_THRESHOLD: 0.9,
  SHOW_PLAYER_DETAILS: true,
  GENERATE_REPORTS: true,
  REPORTS_DIR: 'scripts/review/reports'
};

/**
 * Analyze specific file impact
 */
async function analyzeFileImpact(filePath, removals) {
  console.log(`\n📄 FILE ANALYSIS: ${filePath.split('/').pop()}`);
  console.log('='.repeat(60));
  
  try {
    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
    const playersArray = Array.isArray(data.players) ? data.players : 
                        (Array.isArray(data) ? data : []);
    
    console.log(`📊 Current Stats:`);
    console.log(`   Total Players: ${playersArray.length}`);
    console.log(`   Scheduled Removals: ${removals.length}`);
    console.log(`   Remaining After Cleanup: ${playersArray.length - removals.length}`);
    
    // Analyze removal patterns
    const removalsByGameId = {};
    removals.forEach(removal => {
      const gameId = removal.gameId;
      if (!removalsByGameId[gameId]) {
        removalsByGameId[gameId] = {
          gameId,
          removals: [],
          affectedPlayers: []
        };
      }
      removalsByGameId[gameId].removals.push(removal);
    });
    
    // Find affected players for each game ID
    for (const gameId of Object.keys(removalsByGameId)) {
      const affectedPlayers = playersArray.filter(player => 
        player.gameId === gameId || player.gameId === parseInt(gameId)
      );
      
      removalsByGameId[gameId].affectedPlayers = affectedPlayers;
      
      console.log(`\n🎯 Game ID ${gameId} Analysis:`);
      console.log(`   Players with this Game ID: ${affectedPlayers.length}`);
      console.log(`   Removal Reason: ${removalsByGameId[gameId].removals[0]?.reason}`);
      console.log(`   Confidence: ${Math.round(removalsByGameId[gameId].removals[0]?.confidence * 100)}%`);
      
      if (ANALYSIS_CONFIG.SHOW_PLAYER_DETAILS && affectedPlayers.length > 0) {
        console.log(`   Affected Teams:`);
        const teams = [...new Set(affectedPlayers.map(p => p.team))];
        teams.forEach(team => {
          const teamPlayers = affectedPlayers.filter(p => p.team === team);
          console.log(`     ${team}: ${teamPlayers.length} players`);
        });
        
        // Show sample players
        console.log(`   Sample Players to be Removed:`);
        affectedPlayers.slice(0, 5).forEach(player => {
          console.log(`     ${player.name} (${player.team}) - ${player.playerType || 'unknown'}`);
        });
        
        if (affectedPlayers.length > 5) {
          console.log(`     ... and ${affectedPlayers.length - 5} more players`);
        }
      }
    }
    
    // Check for cross-date verification
    console.log(`\n🔍 Cross-Date Verification:`);
    for (const gameId of Object.keys(removalsByGameId)) {
      const otherFiles = await findGameIdInOtherFiles(gameId, filePath);
      if (otherFiles.length > 0) {
        console.log(`   ✅ Game ID ${gameId} also found in: ${otherFiles.map(f => f.split('/').pop()).join(', ')}`);
        console.log(`      This confirms cross-date duplicate pattern`);
      } else {
        console.log(`   ⚠️  Game ID ${gameId} not found in other files - unusual pattern`);
      }
    }
    
    return {
      filePath,
      currentPlayerCount: playersArray.length,
      removalCount: removals.length,
      removalsByGameId,
      impact: {
        playersRemoved: removals.length,
        percentageReduction: (removals.length / playersArray.length * 100).toFixed(2)
      }
    };
    
  } catch (error) {
    console.error(`❌ Error analyzing ${filePath}: ${error.message}`);
    return {
      filePath,
      error: error.message
    };
  }
}

/**
 * Find game ID in other files (cross-date verification)
 */
async function findGameIdInOtherFiles(gameId, excludeFile) {
  const searchPattern = `"gameId": "${gameId}"`;
  const otherFiles = [];
  
  try {
    const months = ['march', 'april', 'may', 'june', 'july', 'august', 'september'];
    
    for (const month of months) {
      const monthDir = `public/data/2025/${month}`;
      try {
        const files = await fs.readdir(monthDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        for (const file of jsonFiles) {
          const filePath = path.join(monthDir, file);
          if (filePath === excludeFile) continue;
          
          try {
            const content = await fs.readFile(filePath, 'utf8');
            if (content.includes(searchPattern)) {
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
  } catch (error) {
    console.warn(`Warning: Could not search for cross-date duplicates: ${error.message}`);
  }
  
  return otherFiles;
}

/**
 * Generate safety assessment
 */
function generateSafetyAssessment(analysisResults) {
  console.log(`\n🛡️  SAFETY ASSESSMENT`);
  console.log('='.repeat(60));
  
  const totalRemovals = analysisResults.reduce((sum, result) => 
    sum + (result.removalCount || 0), 0
  );
  
  const totalCurrentPlayers = analysisResults.reduce((sum, result) => 
    sum + (result.currentPlayerCount || 0), 0
  );
  
  const overallImpact = (totalRemovals / totalCurrentPlayers * 100).toFixed(2);
  
  console.log(`📊 Overall Impact:`);
  console.log(`   Files Affected: ${analysisResults.length}`);
  console.log(`   Total Players to Remove: ${totalRemovals}`);
  console.log(`   Total Current Players: ${totalCurrentPlayers}`);
  console.log(`   Overall Impact: ${overallImpact}% of dataset`);
  
  // Safety thresholds
  const safetyChecks = {
    lowImpact: overallImpact < 1.0, // Less than 1% of data
    managableFileCount: analysisResults.length < 15,
    reasonableRemovalCount: totalRemovals < 100,
    noErrors: analysisResults.every(r => !r.error)
  };
  
  console.log(`\n✅ Safety Checks:`);
  Object.entries(safetyChecks).forEach(([check, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const description = {
      lowImpact: 'Low overall data impact (<1%)',
      managableFileCount: 'Manageable file count (<15)',
      reasonableRemovalCount: 'Reasonable removal count (<100)',
      noErrors: 'No analysis errors'
    }[check];
    
    console.log(`   ${status}: ${description}`);
  });
  
  const allSafe = Object.values(safetyChecks).every(check => check);
  
  console.log(`\n🎯 Safety Recommendation: ${allSafe ? '✅ SAFE TO PROCEED' : '⚠️  REVIEW REQUIRED'}`);
  
  if (!allSafe) {
    console.log(`   Please review failed safety checks before proceeding`);
  }
  
  return {
    overallImpact: parseFloat(overallImpact),
    totalRemovals,
    safetyChecks,
    recommendation: allSafe ? 'SAFE' : 'REVIEW_REQUIRED'
  };
}

/**
 * Generate detailed report
 */
async function generateDetailedReport(analysisResults, safetyAssessment) {
  if (!ANALYSIS_CONFIG.GENERATE_REPORTS) return;
  
  const report = {
    timestamp: new Date().toISOString(),
    analysisType: 'detailed_review_dashboard',
    
    summary: {
      filesAnalyzed: analysisResults.length,
      totalRemovals: safetyAssessment.totalRemovals,
      overallImpact: safetyAssessment.overallImpact,
      safetyRecommendation: safetyAssessment.recommendation
    },
    
    fileAnalyses: analysisResults.map(result => ({
      file: result.filePath?.split('/').pop(),
      currentPlayers: result.currentPlayerCount,
      removals: result.removalCount,
      impact: result.impact,
      gameIds: Object.keys(result.removalsByGameId || {}),
      error: result.error
    })),
    
    safetyAssessment,
    
    nextSteps: safetyAssessment.recommendation === 'SAFE' ? [
      'Review specific file impacts above',
      'Execute staged cleanup when ready',
      'Monitor results and verify improvements'
    ] : [
      'Address safety check failures',
      'Review files with errors',
      'Consider reducing cleanup scope'
    ]
  };
  
  await fs.mkdir(ANALYSIS_CONFIG.REPORTS_DIR, { recursive: true });
  const reportPath = path.join(ANALYSIS_CONFIG.REPORTS_DIR, 
    `detailed_analysis_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📊 Detailed report saved: ${reportPath}`);
  
  return report;
}

/**
 * Main dashboard function
 */
async function runDetailedAnalysis(targetFile = null) {
  console.log('🔍 DETAILED ANALYSIS DASHBOARD');
  console.log('===============================');
  
  try {
    // Get current duplicate analysis
    console.log('📊 Running comprehensive duplicate analysis...');
    const analysis = await duplicateDetectionService.analyzeDatasetForDuplicates();
    
    // Filter high-confidence removals
    const highConfidenceRemovals = analysis.removalRecommendations.filter(r => 
      r.confidence >= ANALYSIS_CONFIG.HIGH_CONFIDENCE_THRESHOLD
    );
    
    console.log(`\n📈 Analysis Summary:`);
    console.log(`   Total Issues: ${analysis.summary.totalIssues}`);
    console.log(`   Affected Players: ${analysis.summary.affectedPlayers}`);
    console.log(`   High-Confidence Removals: ${highConfidenceRemovals.length}`);
    
    // Group removals by file
    const fileGroups = {};
    highConfidenceRemovals.forEach(removal => {
      if (!fileGroups[removal.file]) {
        fileGroups[removal.file] = [];
      }
      fileGroups[removal.file].push(removal);
    });
    
    // Filter for specific file if requested
    const filesToAnalyze = targetFile ? 
      Object.keys(fileGroups).filter(f => f.includes(targetFile)) :
      Object.keys(fileGroups);
    
    if (filesToAnalyze.length === 0) {
      console.log(`❌ No files found matching: ${targetFile || 'criteria'}`);
      return;
    }
    
    console.log(`\n🎯 Analyzing ${filesToAnalyze.length} files with high-confidence removals...`);
    
    // Analyze each file in detail
    const analysisResults = [];
    for (const filePath of filesToAnalyze) {
      const removals = fileGroups[filePath];
      const result = await analyzeFileImpact(filePath, removals);
      analysisResults.push(result);
    }
    
    // Generate safety assessment
    const safetyAssessment = generateSafetyAssessment(analysisResults);
    
    // Generate detailed report
    await generateDetailedReport(analysisResults, safetyAssessment);
    
    console.log(`\n💡 Next Steps:`);
    if (safetyAssessment.recommendation === 'SAFE') {
      console.log(`   ✅ Analysis shows cleanup is safe to proceed`);
      console.log(`   📋 Run staged cleanup: node scripts/data-validation/stagedProductionTest.js --execute`);
      console.log(`   🔍 Or continue with interactive review: node scripts/review/interactiveReview.js`);
    } else {
      console.log(`   ⚠️  Review safety check failures before proceeding`);
      console.log(`   📊 Check detailed report for specific issues`);
    }
    
    return {
      analysisResults,
      safetyAssessment,
      recommendation: safetyAssessment.recommendation
    };
    
  } catch (error) {
    console.error('❌ Dashboard error:', error);
    throw error;
  }
}

/**
 * Command line interface
 */
async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find(arg => arg.startsWith('--file='));
  const targetFile = fileArg ? fileArg.split('=')[1] : null;
  
  if (targetFile) {
    console.log(`🎯 Focusing on files matching: ${targetFile}`);
  }
  
  await runDetailedAnalysis(targetFile);
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  runDetailedAnalysis,
  analyzeFileImpact,
  generateSafetyAssessment,
  ANALYSIS_CONFIG
};