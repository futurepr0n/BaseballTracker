#!/usr/bin/env node

/**
 * Status Summary Script
 * 
 * Provides a comprehensive overview of the current duplicate cleanup state
 * and all available options for proceeding with the review and cleanup process.
 * 
 * Usage: node scripts/review/statusSummary.js
 */

const fs = require('fs').promises;
const path = require('path');
const duplicateDetectionService = require('../../src/services/duplicateDetectionService');

/**
 * Check if files exist
 */
async function checkFileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get recent reports
 */
async function getRecentReports() {
  const reports = {
    automation: [],
    detailed: [],
    batches: []
  };
  
  try {
    // Check automation reports
    const automationDir = 'scripts/automation/reports';
    if (await checkFileExists(automationDir)) {
      const automationFiles = await fs.readdir(automationDir);
      reports.automation = automationFiles
        .filter(f => f.startsWith('automation_report_'))
        .sort()
        .reverse()
        .slice(0, 3);
    }
    
    // Check detailed analysis reports
    const reviewDir = 'scripts/review/reports';
    if (await checkFileExists(reviewDir)) {
      const reviewFiles = await fs.readdir(reviewDir);
      reports.detailed = reviewFiles
        .filter(f => f.startsWith('detailed_analysis_'))
        .sort()
        .reverse()
        .slice(0, 3);
    }
    
    // Check for approved batches
    const batchFiles = await fs.readdir('scripts/review');
    reports.batches = batchFiles
      .filter(f => f.startsWith('approved_cleanup_batch_'))
      .sort()
      .reverse()
      .slice(0, 3);
    
  } catch (error) {
    // Silent failure - reports are optional
  }
  
  return reports;
}

/**
 * Analyze automation decision
 */
function analyzeAutomationDecision(metrics) {
  const autoThresholds = {
    MAX_HIGH_CONFIDENCE_REMOVALS: 20,
    MIN_JULY_CORRELATION: 0.8,
    MAX_OVERALL_IMPACT: 0.5,
    MIN_CONFIDENCE: 0.95
  };
  
  const manualThresholds = {
    MAX_HIGH_CONFIDENCE_REMOVALS: 50,
    MIN_JULY_CORRELATION: 0.7,
    MAX_OVERALL_IMPACT: 1.0,
    MIN_CONFIDENCE: 0.9
  };
  
  const checks = {
    autoSafe: {
      removals: metrics.highConfidenceCount <= autoThresholds.MAX_HIGH_CONFIDENCE_REMOVALS,
      correlation: metrics.julyCorrelation >= autoThresholds.MIN_JULY_CORRELATION,
      impact: metrics.overallImpact <= autoThresholds.MAX_OVERALL_IMPACT,
      confidence: metrics.avgConfidence >= autoThresholds.MIN_CONFIDENCE
    },
    manualSafe: {
      removals: metrics.highConfidenceCount <= manualThresholds.MAX_HIGH_CONFIDENCE_REMOVALS,
      correlation: metrics.julyCorrelation >= manualThresholds.MIN_JULY_CORRELATION,
      impact: metrics.overallImpact <= manualThresholds.MAX_OVERALL_IMPACT,
      confidence: metrics.avgConfidence >= manualThresholds.MIN_CONFIDENCE
    }
  };
  
  return checks;
}

/**
 * Main status summary function
 */
async function generateStatusSummary() {
  console.log('📊 DUPLICATE CLEANUP STATUS SUMMARY');
  console.log('===================================');
  console.log(`Generated: ${new Date().toISOString()}`);
  
  try {
    // Get current analysis
    console.log('\\n🔍 Running current duplicate analysis...');
    const analysis = await duplicateDetectionService.analyzeDatasetForDuplicates();
    
    const highConfidenceRemovals = analysis.removalRecommendations.filter(r => 
      r.confidence >= 0.9
    );
    
    // Calculate key metrics
    const julyRemovals = highConfidenceRemovals.filter(r => 
      r.date >= '2025-07-02' && r.date <= '2025-07-09'
    );
    const julyCorrelation = highConfidenceRemovals.length > 0 ? 
      julyRemovals.length / highConfidenceRemovals.length : 0;
    
    const estimatedTotalPlayers = analysis.metadata.totalPlayers * 30;
    const overallImpact = estimatedTotalPlayers > 0 ? 
      highConfidenceRemovals.length / estimatedTotalPlayers : 0;
    
    const avgConfidence = highConfidenceRemovals.length > 0 ?
      highConfidenceRemovals.reduce((sum, r) => sum + r.confidence, 0) / highConfidenceRemovals.length : 0;
    
    const metrics = {
      totalIssues: analysis.summary.totalIssues,
      affectedPlayers: analysis.summary.affectedPlayers,
      highConfidenceCount: highConfidenceRemovals.length,
      julyCorrelation,
      overallImpact,
      avgConfidence
    };
    
    // Display current state
    console.log('\\n📈 CURRENT STATE:');
    console.log(`   Total Issues: ${metrics.totalIssues}`);
    console.log(`   Affected Players: ${metrics.affectedPlayers}`);
    console.log(`   High-Confidence Removals: ${metrics.highConfidenceCount}`);
    console.log(`   July 2-9 Correlation: ${Math.round(metrics.julyCorrelation * 100)}%`);
    console.log(`   Overall Data Impact: ${(metrics.overallImpact * 100).toFixed(3)}%`);
    console.log(`   Average Confidence: ${Math.round(metrics.avgConfidence * 100)}%`);
    
    // Analyze automation decision
    const automationChecks = analyzeAutomationDecision(metrics);
    
    console.log('\\n🤖 AUTOMATION ANALYSIS:');
    console.log('   Automatic Execution Eligibility:');
    console.log(`     ✅ Removals ≤ 20: ${automationChecks.autoSafe.removals ? 'PASS' : 'FAIL'} (${metrics.highConfidenceCount})`);
    console.log(`     ✅ July Correlation ≥ 80%: ${automationChecks.autoSafe.correlation ? 'PASS' : 'FAIL'} (${Math.round(metrics.julyCorrelation * 100)}%)`);
    console.log(`     ✅ Impact ≤ 0.5%: ${automationChecks.autoSafe.impact ? 'PASS' : 'FAIL'} (${(metrics.overallImpact * 100).toFixed(3)}%)`);
    console.log(`     ✅ Confidence ≥ 95%: ${automationChecks.autoSafe.confidence ? 'PASS' : 'FAIL'} (${Math.round(metrics.avgConfidence * 100)}%)`);
    
    const autoRecommendation = Object.values(automationChecks.autoSafe).every(check => check);
    const manualRecommendation = Object.values(automationChecks.manualSafe).every(check => check);
    
    let recommendation, status;
    if (autoRecommendation) {
      recommendation = 'AUTO_EXECUTE';
      status = '🟢 SAFE FOR AUTOMATIC EXECUTION';
    } else if (manualRecommendation) {
      recommendation = 'MANUAL_REVIEW';
      status = '🟡 SAFE FOR MANUAL REVIEW';
    } else {
      recommendation = 'BLOCK';
      status = '🔴 REQUIRES INVESTIGATION';
    }
    
    console.log(`\\n🎯 RECOMMENDATION: ${recommendation}`);
    console.log(`   Status: ${status}`);
    
    // Show available actions based on recommendation
    console.log('\\n🚀 AVAILABLE ACTIONS:');
    
    if (recommendation === 'AUTO_EXECUTE') {
      console.log('   ✅ Automatic Cleanup:');
      console.log('      node scripts/automation/smartCleanupController.js --dry-run');
      console.log('      node scripts/automation/smartCleanupController.js  # Live execution');
    }
    
    if (recommendation === 'MANUAL_REVIEW' || recommendation === 'AUTO_EXECUTE') {
      console.log('   🔍 Manual Review Options:');
      console.log('      node scripts/review/detailedAnalysisDashboard.js  # Detailed analysis');
      console.log('      node scripts/review/interactiveReview.js  # Interactive review');
      console.log('      node scripts/data-validation/stagedProductionTest.js  # Staged cleanup');
    }
    
    console.log('   📊 Analysis Tools:');
    console.log('      node scripts/data-validation/validateDuplicateFixes.js  # Validation');
    console.log('      node scripts/data-validation/testDuplicateDetection.js  # Unit tests');
    
    // Show recent activity
    const reports = await getRecentReports();
    
    console.log('\\n📋 RECENT ACTIVITY:');
    if (reports.automation.length > 0) {
      console.log('   Recent Automation Reports:');
      reports.automation.forEach(report => {
        console.log(`     • ${report}`);
      });
    }
    
    if (reports.detailed.length > 0) {
      console.log('   Recent Detailed Analyses:');
      reports.detailed.forEach(report => {
        console.log(`     • ${report}`);
      });
    }
    
    if (reports.batches.length > 0) {
      console.log('   Approved Cleanup Batches:');
      reports.batches.forEach(batch => {
        console.log(`     • ${batch}`);
        console.log(`       Execute: node scripts/review/executeApprovedBatch.js scripts/review/${batch}`);
      });
    }
    
    if (reports.automation.length === 0 && reports.detailed.length === 0 && reports.batches.length === 0) {
      console.log('   No recent activity found');
    }
    
    // Integration status
    console.log('\\n🔗 PIPELINE INTEGRATION:');
    console.log('   Daily Integration:');
    console.log('      ./scripts/automation/dailyCleanupIntegration.sh  # Manual run');
    console.log('      # Add to daily_update.sh for automatic integration');
    
    console.log('\\n💡 RECOMMENDED NEXT STEPS:');
    
    if (recommendation === 'AUTO_EXECUTE') {
      console.log('   1. Review current analysis with detailed dashboard');
      console.log('   2. Run automatic cleanup (dry-run first)');
      console.log('   3. Verify results and regenerate dependent data');
    } else if (recommendation === 'MANUAL_REVIEW') {
      console.log('   1. Run detailed analysis dashboard for file-by-file review');
      console.log('   2. Use interactive review for selective approval');
      console.log('   3. Execute approved batch with verified removals');
    } else {
      console.log('   1. Investigate why safety thresholds are exceeded');
      console.log('   2. Review duplicate patterns manually');
      console.log('   3. Consider adjusting thresholds if patterns are expected');
    }
    
    return {
      metrics,
      recommendation,
      automationChecks,
      reports
    };
    
  } catch (error) {
    console.error('❌ Status summary failed:', error);
    throw error;
  }
}

// Execute if run directly
if (require.main === module) {
  generateStatusSummary().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  generateStatusSummary,
  analyzeAutomationDecision,
  getRecentReports
};