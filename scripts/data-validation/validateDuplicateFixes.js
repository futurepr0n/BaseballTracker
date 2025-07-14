#!/usr/bin/env node

/**
 * Validate Duplicate Fixes Script
 * 
 * Validates that the duplicate detection system correctly identifies issues
 * and provides reasonable fix recommendations for the 405 affected players.
 */

const duplicateDetectionService = require('../../src/services/duplicateDetectionService');

async function validateSystemDetection() {
  console.log('🔍 Validating Duplicate Detection System...');
  console.log('==========================================');
  
  try {
    // Run comprehensive analysis
    const analysis = await duplicateDetectionService.analyzeDatasetForDuplicates();
    
    console.log('📊 DETECTION VALIDATION:');
    console.log(`   Total Issues: ${analysis.summary.totalIssues}`);
    console.log(`   Affected Players: ${analysis.summary.affectedPlayers}`);
    console.log(`   Affected Dates: ${analysis.summary.affectedDates}`);
    console.log(`   Removal Recommendations: ${analysis.summary.totalRemovalRecommendations}`);
    console.log(`   High Confidence Removals: ${analysis.summary.highConfidenceRemovals}`);
    
    // Validation checks
    let validationsPassed = 0;
    let totalValidations = 0;
    
    // Check 1: Should detect ~405 affected players
    totalValidations++;
    if (analysis.summary.affectedPlayers >= 400 && analysis.summary.affectedPlayers <= 410) {
      console.log('✅ PASS: Detected expected number of affected players (~405)');
      validationsPassed++;
    } else {
      console.log(`❌ FAIL: Expected ~405 affected players, found ${analysis.summary.affectedPlayers}`);
    }
    
    // Check 2: Should detect July 2-9 date range issues
    totalValidations++;
    const julyIssues = analysis.crossDateDuplicates.filter(dup => 
      dup.dates.some(date => date >= '2025-07-02' && date <= '2025-07-09')
    );
    
    if (julyIssues.length > 0) {
      console.log('✅ PASS: Detected July 2-9 systematic corruption period');
      validationsPassed++;
    } else {
      console.log('❌ FAIL: Did not detect July 2-9 corruption period');
    }
    
    // Check 3: Should have reasonable number of high-confidence fixes
    totalValidations++;
    const highConfidenceRemovals = analysis.removalRecommendations.filter(r => r.confidence >= 0.9);
    
    if (highConfidenceRemovals.length > 0 && highConfidenceRemovals.length < 100) {
      console.log(`✅ PASS: Found reasonable number of high-confidence fixes (${highConfidenceRemovals.length})`);
      validationsPassed++;
    } else {
      console.log(`❌ FAIL: High-confidence fixes: ${highConfidenceRemovals.length} (expected 1-99)`);
    }
    
    // Check 4: Verify C. Bellinger is in affected players
    totalValidations++;
    const bellingerIssue = analysis.playerDuplicates.find(p => 
      p.playerName.includes('C. Bellinger') || p.playerKey.includes('C. Bellinger')
    );
    
    if (bellingerIssue) {
      console.log(`✅ PASS: C. Bellinger duplicate issues detected (+${bellingerIssue.totalStatsImpact.extraHits} hits)`);
      validationsPassed++;
    } else {
      console.log('❌ FAIL: C. Bellinger issues not detected');
    }
    
    // Check 5: Verify known duplicate game IDs are flagged
    totalValidations++;
    const knownDuplicateGameIds = ['401696200', '401696221', '401769356'];
    const detectedKnownDuplicates = analysis.crossDateDuplicates.filter(dup =>
      knownDuplicateGameIds.includes(dup.gameId.toString())
    );
    
    if (detectedKnownDuplicates.length >= 2) {
      console.log(`✅ PASS: Known duplicate game IDs detected (${detectedKnownDuplicates.length})`);
      validationsPassed++;
    } else {
      console.log(`❌ FAIL: Expected to detect known duplicate game IDs`);
    }
    
    console.log('\n📈 HIGH-CONFIDENCE REMOVAL SAMPLE:');
    if (highConfidenceRemovals.length > 0) {
      highConfidenceRemovals.slice(0, 5).forEach((removal, i) => {
        console.log(`   ${i+1}. ${removal.reason} (confidence: ${Math.round(removal.confidence * 100)}%)`);
      });
    } else {
      console.log('   No high-confidence removals found');
    }
    
    console.log('\n🎯 TOP AFFECTED PLAYERS:');
    analysis.playerDuplicates.slice(0, 5).forEach((player, i) => {
      console.log(`   ${i+1}. ${player.playerName} (${player.team}): +${player.totalStatsImpact.extraHits} hits, ${player.issues.length} issues`);
    });
    
    console.log('\n🏁 VALIDATION SUMMARY:');
    console.log(`   Validations Passed: ${validationsPassed}/${totalValidations}`);
    console.log(`   Success Rate: ${Math.round((validationsPassed / totalValidations) * 100)}%`);
    
    if (validationsPassed === totalValidations) {
      console.log('🎉 All validations passed! Duplicate detection system is working correctly.');
      return 0;
    } else {
      console.log('⚠️  Some validations failed. Review system implementation.');
      return 1;
    }
    
  } catch (error) {
    console.error('❌ Error during validation:', error);
    return 1;
  }
}

async function testSafetyMechanisms() {
  console.log('\n🛡️  Testing Safety Mechanisms...');
  console.log('================================');
  
  try {
    const analysis = await duplicateDetectionService.analyzeDatasetForDuplicates();
    const { removalRecommendations } = analysis;
    
    // Test safety thresholds
    const SAFETY_THRESHOLDS = {
      MAX_FILES_TO_MODIFY: 100,
      MAX_PLAYERS_TO_MODIFY: 500,
      MAX_GAMES_TO_REMOVE: 1000
    };
    
    const filesAffected = new Set(removalRecommendations.map(r => r.file)).size;
    const playersAffected = new Set(removalRecommendations.map(r => r.playerKey).filter(k => k)).size;
    const gamesAffected = removalRecommendations.length;
    
    console.log('📊 Safety Check Results:');
    console.log(`   Files affected: ${filesAffected} (threshold: ${SAFETY_THRESHOLDS.MAX_FILES_TO_MODIFY})`);
    console.log(`   Players affected: ${playersAffected} (threshold: ${SAFETY_THRESHOLDS.MAX_PLAYERS_TO_MODIFY})`);
    console.log(`   Games affected: ${gamesAffected} (threshold: ${SAFETY_THRESHOLDS.MAX_GAMES_TO_REMOVE})`);
    
    // Test if safety mechanisms would trigger
    const wouldTriggerSafety = 
      filesAffected > SAFETY_THRESHOLDS.MAX_FILES_TO_MODIFY ||
      playersAffected > SAFETY_THRESHOLDS.MAX_PLAYERS_TO_MODIFY ||
      gamesAffected > SAFETY_THRESHOLDS.MAX_GAMES_TO_REMOVE;
    
    if (wouldTriggerSafety) {
      console.log('✅ PASS: Safety mechanisms would properly prevent bulk removal');
    } else {
      console.log('⚠️  WARNING: Safety mechanisms might not trigger for this dataset');
    }
    
    // Test high-confidence subset
    const highConfidenceRemovals = removalRecommendations.filter(r => r.confidence >= 0.9);
    console.log(`\n🎯 High-confidence subset: ${highConfidenceRemovals.length} removals`);
    
    if (highConfidenceRemovals.length > 0 && highConfidenceRemovals.length <= 50) {
      console.log('✅ PASS: High-confidence removals are within safe processing range');
    } else if (highConfidenceRemovals.length === 0) {
      console.log('ℹ️  INFO: No high-confidence removals - manual review required');
    } else {
      console.log('⚠️  WARNING: Many high-confidence removals - consider staged approach');
    }
    
  } catch (error) {
    console.error('❌ Error testing safety mechanisms:', error);
  }
}

async function main() {
  const systemValidationResult = await validateSystemDetection();
  await testSafetyMechanisms();
  
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (systemValidationResult === 0) {
    console.log('✅ System validation passed - duplicate detection is working correctly');
    console.log('📋 Next steps for production:');
    console.log('   1. Run batch removal on high-confidence duplicates first');
    console.log('   2. Use staged approach for large-scale cleanup');
    console.log('   3. Verify milestone tracking after fixes');
    console.log('   4. Monitor daily pipeline for new duplicates');
  } else {
    console.log('❌ System validation failed - review implementation before production');
  }
  
  return systemValidationResult;
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      console.error('💥 Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { validateSystemDetection, testSafetyMechanisms };