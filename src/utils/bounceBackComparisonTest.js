/**
 * Bounce Back Analysis Comparison Test
 * 
 * Demonstrates the difference between old and new bounce back analysis
 * Shows how the enhanced system properly penalizes repeated failures
 */

const { analyzeEnhancedBounceBackPatterns, generateBounceBackSummary } = require('../services/enhancedBounceBackAnalyzer');

/**
 * Test scenarios that demonstrate the problem with old analysis
 */
const testScenarios = [
  {
    name: "Player with 5 consecutive poor games (multiple failed bounce attempts)",
    gameHistory: [
      // Earlier season games (good performance)
      { date: '2025-04-01', hits: 2, atBats: 4, avg: 0.500 },
      { date: '2025-04-02', hits: 1, atBats: 3, avg: 0.333 },
      { date: '2025-04-03', hits: 3, atBats: 4, avg: 0.750 },
      { date: '2025-04-04', hits: 2, atBats: 4, avg: 0.500 },
      { date: '2025-04-05', hits: 1, atBats: 4, avg: 0.250 },
      
      // Start of cold streak - recent games (MULTIPLE FAILED BOUNCE BACK ATTEMPTS)
      { date: '2025-06-10', hits: 0, atBats: 4, avg: 0.000 }, // Poor game 1
      { date: '2025-06-11', hits: 0, atBats: 3, avg: 0.000 }, // Failed to bounce back
      { date: '2025-06-12', hits: 1, atBats: 4, avg: 0.250 }, // Failed to bounce back  
      { date: '2025-06-13', hits: 0, atBats: 4, avg: 0.000 }, // Failed to bounce back
      { date: '2025-06-14', hits: 0, atBats: 3, avg: 0.000 }, // Failed to bounce back
    ]
  },
  
  {
    name: "Player with one poor game (legitimate bounce back candidate)",
    gameHistory: [
      // Good recent performance
      { date: '2025-06-10', hits: 2, atBats: 4, avg: 0.500 },
      { date: '2025-06-11', hits: 3, atBats: 4, avg: 0.750 },
      { date: '2025-06-12', hits: 1, atBats: 3, avg: 0.333 },
      { date: '2025-06-13', hits: 2, atBats: 4, avg: 0.500 },
      
      // One poor game (genuine bounce back opportunity)
      { date: '2025-06-14', hits: 0, atBats: 4, avg: 0.000 }, // Recent poor game
    ]
  },
  
  {
    name: "Player with historical pattern of successful bounce backs",
    gameHistory: [
      // Historical successful bounce backs
      { date: '2025-04-01', hits: 0, atBats: 4, avg: 0.000 }, // Poor game
      { date: '2025-04-02', hits: 3, atBats: 4, avg: 0.750 }, // Successful bounce back
      { date: '2025-04-03', hits: 2, atBats: 4, avg: 0.500 },
      
      { date: '2025-04-10', hits: 0, atBats: 3, avg: 0.000 }, // Poor game
      { date: '2025-04-11', hits: 2, atBats: 4, avg: 0.500 }, // Successful bounce back
      { date: '2025-04-12', hits: 1, atBats: 4, avg: 0.250 },
      
      { date: '2025-05-01', hits: 0, atBats: 4, avg: 0.000 }, // Poor game
      { date: '2025-05-02', hits: 2, atBats: 3, avg: 0.667 }, // Successful bounce back
      
      // Current poor game (should have high bounce back potential due to history)
      { date: '2025-06-14', hits: 0, atBats: 4, avg: 0.000 },
    ]
  }
];

/**
 * Legacy bounce back analysis (simplified version of old logic)
 */
function oldBounceBackAnalysis(gameHistory) {
  const playerSeasonAvg = gameHistory.reduce((sum, game) => sum + game.avg, 0) / gameHistory.length;
  const poorGameThreshold = playerSeasonAvg * 0.7;
  const bounceBackAnalysis = [];
  
  gameHistory.forEach((game, index) => {
    if (index >= gameHistory.length - 1) return;
    
    if (game.avg < poorGameThreshold && game.atBats >= 2) {
      const nextGames = gameHistory.slice(index + 1, Math.min(index + 4, gameHistory.length));
      
      if (nextGames.length > 0) {
        const bounceBackGames = nextGames.filter(g => g.avg >= playerSeasonAvg * 1.2);
        const strongBounceBack = nextGames.some(g => g.avg >= 0.400 || g.hits >= 3);
        
        bounceBackAnalysis.push({
          hasBounceBack: bounceBackGames.length > 0,
          hasStrongBounceBack: strongBounceBack
        });
      }
    }
  });
  
  const bounceBackRate = bounceBackAnalysis.length > 0 ? 
    bounceBackAnalysis.filter(b => b.hasBounceBack).length / bounceBackAnalysis.length : 0;
  
  const strongBounceBackRate = bounceBackAnalysis.length > 0 ?
    bounceBackAnalysis.filter(b => b.hasStrongBounceBack).length / bounceBackAnalysis.length : 0;
  
  return {
    bounceBackRate,
    strongBounceBackRate,
    isReliablePattern: bounceBackAnalysis.length >= 5,
    opportunities: bounceBackAnalysis.length
  };
}

/**
 * Run comparison test
 */
function runBounceBackComparisonTest() {
  console.log('🧪 BOUNCE BACK ANALYSIS COMPARISON TEST');
  console.log('=' .repeat(60));
  console.log('This test demonstrates how the enhanced system properly handles');
  console.log('repeated failed bounce back attempts vs the old system.\n');
  
  testScenarios.forEach((scenario, index) => {
    console.log(`\n📊 TEST SCENARIO ${index + 1}: ${scenario.name}`);
    console.log('-'.repeat(50));
    
    // Show recent game history
    const recentGames = scenario.gameHistory.slice(-5);
    console.log('Recent games:');
    recentGames.forEach(game => {
      const performance = game.avg >= 0.300 ? '✅' : game.avg >= 0.200 ? '⚠️' : '❌';
      console.log(`  ${game.date}: ${game.hits}/${game.atBats} (.${(game.avg * 1000).toFixed(0).padStart(3, '0')}) ${performance}`);
    });
    
    // OLD SYSTEM ANALYSIS
    console.log('\n🏚️  OLD SYSTEM RESULTS:');
    const oldResults = oldBounceBackAnalysis(scenario.gameHistory);
    console.log(`   Bounce Back Rate: ${(oldResults.bounceBackRate * 100).toFixed(1)}%`);
    console.log(`   Strong Bounce Rate: ${(oldResults.strongBounceBackRate * 100).toFixed(1)}%`);
    console.log(`   Reliable Pattern: ${oldResults.isReliablePattern ? 'Yes' : 'No'}`);
    console.log(`   Opportunities: ${oldResults.opportunities}`);
    
    if (oldResults.bounceBackRate > 0.5) {
      console.log(`   🎯 OLD SYSTEM VERDICT: Would give bounce back bonus (${(oldResults.strongBounceBackRate * 30).toFixed(1)} points)`);
    } else {
      console.log(`   ❌ OLD SYSTEM VERDICT: No bounce back bonus`);
    }
    
    // NEW ENHANCED SYSTEM ANALYSIS  
    console.log('\n🚀 ENHANCED SYSTEM RESULTS:');
    const enhancedResults = analyzeEnhancedBounceBackPatterns(scenario.gameHistory, 'Test Player');
    const summary = generateBounceBackSummary(enhancedResults);
    
    console.log(`   Bounce Back Potential: ${(enhancedResults.bounceBackPotential * 100).toFixed(1)}%`);
    console.log(`   Confidence: ${(enhancedResults.confidence * 100).toFixed(1)}%`);
    console.log(`   Classification: ${enhancedResults.classification}`);
    console.log(`   Score: ${enhancedResults.score.toFixed(1)}/100`);
    console.log(`   Failed Attempts: ${enhancedResults.currentSituation.failedBounceBackAttempts}`);
    console.log(`   Cold Streak: ${enhancedResults.currentSituation.consecutivePoorGames} games`);
    
    if (enhancedResults.recommendAction) {
      const bonus = Math.min(25, enhancedResults.score * 0.3);
      console.log(`   🎯 ENHANCED VERDICT: ${summary.recommendation} (${bonus.toFixed(1)} points)`);
    } else {
      console.log(`   ❌ ENHANCED VERDICT: ${summary.recommendation}`);
    }
    
    if (enhancedResults.warnings && enhancedResults.warnings.length > 0) {
      console.log(`   ⚠️  WARNINGS: ${enhancedResults.warnings.join(', ')}`);
    }
    
    // COMPARISON ANALYSIS
    console.log('\n📈 COMPARISON:');
    const oldWouldRecommend = oldResults.bounceBackRate > 0.5;
    const newRecommends = enhancedResults.recommendAction;
    
    if (oldWouldRecommend && !newRecommends) {
      console.log('   ✅ ENHANCED SYSTEM CORRECTLY IDENTIFIES POOR BOUNCE BACK CANDIDATE');
      console.log('   🔍 Old system would have given false confidence');
    } else if (!oldWouldRecommend && newRecommends) {
      console.log('   ✅ ENHANCED SYSTEM FINDS LEGITIMATE BOUNCE BACK OPPORTUNITY');
      console.log('   🔍 Old system was too restrictive');
    } else if (oldWouldRecommend && newRecommends) {
      console.log('   ✅ BOTH SYSTEMS AGREE - BOUNCE BACK CANDIDATE');
    } else {
      console.log('   ❌ BOTH SYSTEMS AGREE - AVOID');
    }
    
    console.log('\n' + '='.repeat(60));
  });
  
  console.log('\n🎯 KEY IMPROVEMENTS IN ENHANCED SYSTEM:');
  console.log('1. ✅ Tracks failed bounce back attempts and penalizes repeated failures');
  console.log('2. ✅ Uses adaptive analysis windows to find meaningful patterns');  
  console.log('3. ✅ Compares current situation to historical similar cold streaks');
  console.log('4. ✅ Provides detailed explanations for recommendations');
  console.log('5. ✅ Prevents overconfidence in players with extended cold streaks');
  console.log('\n🚫 PROBLEMS WITH OLD SYSTEM:');
  console.log('1. ❌ Treats each poor game independently (no failure tracking)');
  console.log('2. ❌ Same bounce back potential regardless of recent failures');
  console.log('3. ❌ No consideration of streak length or failure patterns');
  console.log('4. ❌ Can recommend players with 10+ straight poor games');
}

/**
 * Run a specific test case for debugging
 */
function testSpecificCase(gameHistory, playerName = 'Test Player') {
  console.log(`\n🧪 Testing ${playerName}:`);
  console.log('Game history:');
  gameHistory.slice(-10).forEach(game => {
    const performance = game.avg >= 0.300 ? '✅' : game.avg >= 0.200 ? '⚠️' : '❌';
    console.log(`  ${game.date}: ${game.hits}/${game.atBats} (.${(game.avg * 1000).toFixed(0).padStart(3, '0')}) ${performance}`);
  });
  
  const results = analyzeEnhancedBounceBackPatterns(gameHistory, playerName);
  const summary = generateBounceBackSummary(results);
  
  console.log('\nEnhanced Analysis Results:');
  console.log(`  Classification: ${results.classification}`);
  console.log(`  Bounce Back Potential: ${(results.bounceBackPotential * 100).toFixed(1)}%`);
  console.log(`  Confidence: ${(results.confidence * 100).toFixed(1)}%`);
  console.log(`  Score: ${results.score.toFixed(1)}/100`);
  console.log(`  Failed Attempts: ${results.currentSituation.failedBounceBackAttempts}`);
  console.log(`  Recommendation: ${summary.recommendation}`);
  
  return results;
}

module.exports = {
  runBounceBackComparisonTest,
  testSpecificCase,
  oldBounceBackAnalysis
};

// Run test if called directly
if (require.main === module) {
  runBounceBackComparisonTest();
}