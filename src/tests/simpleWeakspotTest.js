/**
 * Simple Weakspot Exploiter System Test
 * Direct test of current system functionality
 */

// Use require for CommonJS compatibility
const weakspotExploiterService = require('../services/weakspotExploiterService.js');

async function testCurrentSystem() {
  console.log('🧪 TESTING CURRENT WEAKSPOT EXPLOITER SYSTEM');
  console.log('='.repeat(70));
  
  try {
    const testDate = '2025-07-28';
    console.log('📅 Test Date:', testDate);
    console.log('⏰ Start Time:', new Date().toISOString());
    
    // Test the current system
    const startTime = Date.now();
    const results = await weakspotExploiterService.default.generateDailyExploiters(testDate);
    const processingTime = Date.now() - startTime;
    
    console.log('\n📊 SYSTEM PERFORMANCE ANALYSIS:');
    console.log('Processing Time:', processingTime, 'ms');
    console.log('Exploiters Found:', results.exploiters?.length || 0);
    console.log('Total Analyzed:', results.totalAnalyzed || 0);
    console.log('Games Analyzed:', results.gamesAnalyzed || 0);
    console.log('Overall Confidence:', results.confidence || 0, '%');
    console.log('Last Updated:', results.lastUpdated || 'N/A');
    
    // Analyze exploiter quality
    if (results.exploiters && results.exploiters.length > 0) {
      console.log('\n🎯 EXPLOITER QUALITY ANALYSIS:');
      
      const exploitIndexes = results.exploiters.map(e => e.exploitIndex || 0);
      const confidences = results.exploiters.map(e => e.confidence || 0);
      
      const avgExploitIndex = exploitIndexes.reduce((a, b) => a + b, 0) / exploitIndexes.length;
      const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
      const highQuality = results.exploiters.filter(e => (e.exploitIndex || 0) > 75).length;
      
      console.log('Average Exploit Index:', avgExploitIndex.toFixed(2));
      console.log('Average Confidence:', (avgConfidence * 100).toFixed(1) + '%');
      console.log('High Quality Exploiters (>75):', highQuality);
      console.log('Unique Teams:', new Set(results.exploiters.map(e => e.team)).size);
      console.log('Unique Pitchers:', new Set(results.exploiters.map(e => e.pitcher)).size);
      
      console.log('\n🏆 TOP 5 EXPLOITERS:');
      results.exploiters.slice(0, 5).forEach((exploiter, i) => {
        console.log(`${i+1}. ${exploiter.player} (${exploiter.team}) vs ${exploiter.pitcher}`);
        console.log(`   Exploit Index: ${exploiter.exploitIndex}`);
        console.log(`   Key Weakness: ${exploiter.keyWeakness || 'N/A'}`);
        console.log(`   Confidence: ${((exploiter.confidence || 0) * 100).toFixed(1)}%`);
        if (exploiter.categories && exploiter.categories.length > 0) {
          console.log(`   Categories: ${exploiter.categories.join(', ')}`);
        }
        console.log('');
      });
      
      // Data quality checks
      console.log('🔍 DATA QUALITY CHECKS:');
      const hasKeyWeakness = results.exploiters.filter(e => e.keyWeakness && e.keyWeakness !== 'N/A').length;
      const hasCategories = results.exploiters.filter(e => e.categories && e.categories.length > 0).length;
      const hasVenue = results.exploiters.filter(e => e.venue).length;
      
      console.log('Has Key Weakness:', `${hasKeyWeakness}/${results.exploiters.length} (${(hasKeyWeakness/results.exploiters.length*100).toFixed(1)}%)`);
      console.log('Has Categories:', `${hasCategories}/${results.exploiters.length} (${(hasCategories/results.exploiters.length*100).toFixed(1)}%)`);
      console.log('Has Venue:', `${hasVenue}/${results.exploiters.length} (${(hasVenue/results.exploiters.length*100).toFixed(1)}%)`);
      
    } else {
      console.log('\n⚠️  NO EXPLOITERS FOUND');
      if (results.error) {
        console.log('Error:', results.error);
      }
    }
    
    // Validate output format
    console.log('\n📋 OUTPUT FORMAT VALIDATION:');
    const requiredFields = ['exploiters', 'totalAnalyzed', 'gamesAnalyzed', 'confidence', 'lastUpdated'];
    const hasAllFields = requiredFields.every(field => results.hasOwnProperty(field));
    
    console.log('Has all required fields:', hasAllFields ? '✅ YES' : '❌ NO');
    if (!hasAllFields) {
      const missing = requiredFields.filter(field => !results.hasOwnProperty(field));
      console.log('Missing fields:', missing.join(', '));
    }
    
    // Test edge cases
    console.log('\n🧪 EDGE CASE TESTING:');
    
    // Test with invalid date
    try {
      const invalidResult = await weakspotExploiterService.default.generateDailyExploiters('invalid-date');
      console.log('Invalid date handling: ✅ Handled gracefully');
    } catch (error) {
      console.log('Invalid date handling: ❌ Threw error -', error.message);
    }
    
    // Test with future date
    try {
      const futureResult = await weakspotExploiterService.default.generateDailyExploiters('2025-12-31');
      console.log('Future date handling: ✅ Handled gracefully');
      console.log('Future date exploiters found:', futureResult.exploiters?.length || 0);
    } catch (error) {
      console.log('Future date handling: ❌ Threw error -', error.message);
    }
    
    console.log('\n📈 ENHANCEMENT RECOMMENDATIONS:');
    console.log('Based on current system analysis:');
    
    if (avgExploitIndex < 70) {
      console.log('• Improve exploit index calculations for better quality scores');
    }
    
    if (avgConfidence < 0.7) {
      console.log('• Enhance confidence scoring based on data quality indicators');
    }
    
    if (highQuality < results.exploiters.length * 0.3) {
      console.log('• Refine filtering criteria to surface higher quality exploiters');
    }
    
    if (hasKeyWeakness < results.exploiters.length * 0.8) {
      console.log('• Improve weakness analysis to provide more detailed explanations');
    }
    
    console.log('• Add barrel rate analysis for pitcher vulnerability assessment');
    console.log('• Implement CSW% calculations for pitcher command evaluation');
    console.log('• Develop expected performance gap analysis for regression candidates');
    console.log('• Enhance batter classification with situational hitting data');
    
    console.log('\n✅ COMPREHENSIVE TESTING COMPLETED');
    console.log('='.repeat(70));
    
    return {
      testDate,
      processingTime,
      exploitersFound: results.exploiters?.length || 0,
      avgExploitIndex,
      avgConfidence,
      dataQualityScore: (hasKeyWeakness + hasCategories + hasVenue) / (results.exploiters?.length * 3 || 1) * 100,
      systemHealth: results.exploiters?.length > 0 ? 'HEALTHY' : 'NEEDS_ATTENTION'
    };
    
  } catch (error) {
    console.error('❌ TEST EXECUTION FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Export for use as module
module.exports = { testCurrentSystem };

// Run test if called directly
if (require.main === module) {
  testCurrentSystem()
    .then(summary => {
      console.log('\n🎉 Test Summary:');
      console.log('System Health:', summary.systemHealth);
      console.log('Processing Time:', summary.processingTime + 'ms');
      console.log('Exploiters Found:', summary.exploitersFound);
      console.log('Data Quality Score:', summary.dataQualityScore.toFixed(1) + '%');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test failed:', error.message);
      process.exit(1);
    });
}