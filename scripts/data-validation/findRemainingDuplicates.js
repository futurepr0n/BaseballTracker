#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const duplicateDetectionService = require('../../src/services/duplicateDetectionService');

async function findRemainingDuplicates() {
  console.log('🔍 Finding ALL remaining cross-date duplicates...\n');
  
  // Run full duplicate analysis
  const analysis = await duplicateDetectionService.analyzeDatasetForDuplicates();
  
  console.log('📊 Overall Analysis:');
  console.log(`   Total Issues: ${analysis.summary.totalIssues}`);
  console.log(`   Affected Players: ${analysis.summary.affectedPlayers}`);
  console.log(`   High-Confidence Removals: ${analysis.summary.highConfidenceRemovals}`);
  
  // Focus on cross-date duplicates
  const crossDateDuplicates = analysis.removalRecommendations.filter(r => 
    r.reason.includes('Cross-date duplicate')
  );
  
  console.log(`\n🎯 Cross-Date Duplicates: ${crossDateDuplicates.length}`);
  
  // Group by gameId
  const gameIdGroups = {};
  crossDateDuplicates.forEach(dup => {
    if (!gameIdGroups[dup.gameId]) {
      gameIdGroups[dup.gameId] = [];
    }
    gameIdGroups[dup.gameId].push(dup);
  });
  
  console.log(`\n📋 Duplicate Games Found: ${Object.keys(gameIdGroups).length}`);
  
  // Show details for each duplicate game
  Object.entries(gameIdGroups).sort((a, b) => b[1].length - a[1].length).forEach(([gameId, dups]) => {
    console.log(`\n🎮 GameId ${gameId} (${dups.length} occurrences):`);
    
    // Get unique dates and files
    const dateInfo = {};
    dups.forEach(dup => {
      const date = dup.date;
      if (!dateInfo[date]) {
        dateInfo[date] = {
          file: dup.file,
          count: 0
        };
      }
      dateInfo[date].count++;
    });
    
    Object.entries(dateInfo).forEach(([date, info]) => {
      console.log(`   - ${date}: ${info.file.split('/').pop()} (${info.count} players)`);
    });
    
    // Sample affected players
    const players = [...new Set(dups.slice(0, 5).map(d => 
      d.playerKey ? d.playerKey.split('_')[0] : 'Unknown'
    ))];
    console.log(`   Affected players: ${players.join(', ')}${dups.length > 5 ? '...' : ''}`);
  });
  
  // Find specific players with significant issues
  console.log('\n🚨 Players with 10+ extra hits from duplicates:');
  
  const playerImpacts = {};
  analysis.playerDuplicates.forEach(pd => {
    if (pd.totalStatsImpact && pd.totalStatsImpact.extraHits >= 10) {
      playerImpacts[pd.playerName] = {
        extraHits: pd.totalStatsImpact.extraHits,
        duplicateGames: pd.duplicateGames ? pd.duplicateGames.length : 0,
        team: pd.playerKey ? pd.playerKey.split('_')[1] : 'Unknown'
      };
    }
  });
  
  Object.entries(playerImpacts)
    .sort((a, b) => b[1].extraHits - a[1].extraHits)
    .forEach(([player, impact]) => {
      console.log(`   ${player} (${impact.team}): +${impact.extraHits} hits from ${impact.duplicateGames} duplicate games`);
    });
  
  // Generate removal recommendations
  console.log('\n💡 Generating cleanup recommendations...');
  
  const highConfidenceRemovals = crossDateDuplicates.filter(r => r.confidence >= 0.9);
  console.log(`   High-confidence removals: ${highConfidenceRemovals.length}`);
  
  // Save recommendations to file
  const recommendations = {
    timestamp: new Date().toISOString(),
    summary: {
      totalCrossDateDuplicates: crossDateDuplicates.length,
      highConfidenceRemovals: highConfidenceRemovals.length,
      affectedGames: Object.keys(gameIdGroups).length,
      playersWithSignificantImpact: Object.keys(playerImpacts).length
    },
    gameIdGroups,
    playerImpacts,
    removalRecommendations: highConfidenceRemovals
  };
  
  const reportPath = 'scripts/data-validation/remaining_duplicates_report.json';
  fs.writeFileSync(reportPath, JSON.stringify(recommendations, null, 2));
  console.log(`\n📊 Detailed report saved to: ${reportPath}`);
  
  console.log('\n✅ Analysis complete. Run interactive review to clean these duplicates:');
  console.log('   node scripts/review/interactiveReview.js');
}

findRemainingDuplicates().catch(console.error);