#!/usr/bin/env node

/**
 * Comprehensive Duplicate Detector
 * 
 * Enhanced duplicate detection system that addresses limitations in the original
 * detection logic. Performs thorough cross-date analysis without temporal restrictions.
 */

const fs = require('fs').promises;
const path = require('path');

class ComprehensiveDuplicateDetector {
  constructor() {
    this.duplicates = [];
    this.playerStats = new Map();
    this.gameContexts = new Map();
    this.suspiciousPatterns = [];
  }

  async analyzeFullSeason() {
    console.log('🔍 COMPREHENSIVE DUPLICATE DETECTION');
    console.log('====================================\n');

    // Load all data files
    const allGameData = await this.loadAllGameData();
    console.log(`📊 Loaded ${allGameData.length} data files\n`);

    // Build player statistics and game contexts
    await this.buildPlayerStatistics(allGameData);
    await this.buildGameContexts(allGameData);

    // Run comprehensive duplicate detection
    await this.detectCrossDateDuplicates(allGameData);
    await this.detectStatisticalAnomalies();
    await this.detectGameContextDuplicates();

    // Generate comprehensive report
    return this.generateReport();
  }

  async loadAllGameData() {
    const dataDir = 'public/data/2025';
    const months = ['march', 'april', 'may', 'june', 'july'];
    const allData = [];

    for (const month of months) {
      const monthDir = path.join(dataDir, month);
      try {
        const files = await fs.readdir(monthDir);
        const jsonFiles = files.filter(f => f.endsWith('.json')).sort();

        for (const file of jsonFiles) {
          const filePath = path.join(monthDir, file);
          try {
            const content = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(content);
            allData.push({
              file: filePath,
              date: file.replace('.json', ''),
              month,
              data
            });
          } catch (error) {
            console.warn(`⚠️  Skipping corrupted file: ${filePath}`);
          }
        }
      } catch (error) {
        console.warn(`⚠️  Month directory not found: ${monthDir}`);
      }
    }

    return allData;
  }

  async buildPlayerStatistics(allGameData) {
    console.log('📈 Building comprehensive player statistics...');

    for (const fileData of allGameData) {
      const players = fileData.data.players || [];
      
      for (const player of players) {
        const key = `${player.name}_${player.team}`;
        
        if (!this.playerStats.has(key)) {
          this.playerStats.set(key, {
            name: player.name,
            team: player.team,
            games: [],
            totalHits: 0,
            totalGames: 0,
            gameIds: new Set()
          });
        }

        const playerStat = this.playerStats.get(key);
        playerStat.games.push({
          date: fileData.date,
          file: fileData.file,
          gameId: player.gameId,
          hits: parseInt(player.H) || 0,
          ab: parseInt(player.AB) || 0,
          runs: parseInt(player.R) || 0,
          rbi: parseInt(player.RBI) || 0,
          hr: parseInt(player.HR) || 0
        });

        playerStat.totalHits += parseInt(player.H) || 0;
        playerStat.totalGames++;
        playerStat.gameIds.add(player.gameId);
      }
    }

    console.log(`   📊 Analyzed ${this.playerStats.size} unique players`);
  }

  async buildGameContexts(allGameData) {
    console.log('🎮 Building game context database...');

    for (const fileData of allGameData) {
      const games = fileData.data.games || [];
      const players = fileData.data.players || [];

      for (const game of games) {
        const gameId = game.gameId || game.originalId;
        if (!gameId) continue;

        // Get teams involved in this game
        const gamePlayers = players.filter(p => p.gameId === gameId);
        const teams = [...new Set(gamePlayers.map(p => p.team))];

        this.gameContexts.set(gameId, {
          gameId,
          date: fileData.date,
          file: fileData.file,
          teams,
          playerCount: gamePlayers.length,
          venue: game.venue,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam
        });
      }
    }

    console.log(`   🎮 Indexed ${this.gameContexts.size} game contexts`);
  }

  async detectCrossDateDuplicates(allGameData) {
    console.log('🔍 Detecting cross-date duplicates (no temporal limits)...');
    
    const gameIdOccurrences = new Map();

    // Map all gameId occurrences across all dates
    for (const fileData of allGameData) {
      const players = fileData.data.players || [];
      
      for (const player of players) {
        const gameId = player.gameId;
        if (!gameId) continue;

        if (!gameIdOccurrences.has(gameId)) {
          gameIdOccurrences.set(gameId, []);
        }

        gameIdOccurrences.get(gameId).push({
          player: player.name,
          team: player.team,
          date: fileData.date,
          file: fileData.file,
          hits: parseInt(player.H) || 0,
          stats: {
            ab: parseInt(player.AB) || 0,
            r: parseInt(player.R) || 0,
            rbi: parseInt(player.RBI) || 0,
            hr: parseInt(player.HR) || 0
          }
        });
      }
    }

    // Find duplicates (gameId appearing on multiple dates)
    let duplicateCount = 0;
    for (const [gameId, occurrences] of gameIdOccurrences) {
      const uniqueDates = [...new Set(occurrences.map(o => o.date))];
      
      if (uniqueDates.length > 1) {
        duplicateCount++;
        
        // Group by player to see which players are affected
        const playerGroups = new Map();
        for (const occurrence of occurrences) {
          const playerKey = `${occurrence.player}_${occurrence.team}`;
          if (!playerGroups.has(playerKey)) {
            playerGroups.set(playerKey, []);
          }
          playerGroups.get(playerKey).push(occurrence);
        }

        // Find players with identical stats across dates (true duplicates)
        for (const [playerKey, playerOccurrences] of playerGroups) {
          if (playerOccurrences.length > 1) {
            this.duplicates.push({
              type: 'cross_date_duplicate',
              gameId,
              player: playerKey,
              occurrences: playerOccurrences,
              severity: 'high',
              impact: `Player appears ${playerOccurrences.length} times for same game`
            });
          }
        }
      }
    }

    console.log(`   ❌ Found ${duplicateCount} games appearing on multiple dates`);
    console.log(`   👤 Found ${this.duplicates.length} player duplicate entries`);
  }

  async detectStatisticalAnomalies() {
    console.log('📊 Detecting statistical anomalies...');
    
    for (const [playerKey, playerStat] of this.playerStats) {
      // Check for unrealistic hit rates
      const hitsPerGame = playerStat.totalHits / playerStat.totalGames;
      if (hitsPerGame > 3.5) {
        this.suspiciousPatterns.push({
          type: 'high_hit_rate',
          player: playerKey,
          hitsPerGame: hitsPerGame.toFixed(2),
          totalHits: playerStat.totalHits,
          totalGames: playerStat.totalGames,
          severity: 'medium'
        });
      }

      // Check for duplicate gameIds for same player
      const uniqueGameIds = playerStat.gameIds.size;
      if (uniqueGameIds < playerStat.totalGames) {
        const duplicateGameCount = playerStat.totalGames - uniqueGameIds;
        this.suspiciousPatterns.push({
          type: 'duplicate_game_ids',
          player: playerKey,
          totalGames: playerStat.totalGames,
          uniqueGames: uniqueGameIds,
          duplicateCount: duplicateGameCount,
          severity: 'high'
        });
      }

      // Check for statistical inconsistencies in same gameId
      const gameIdGroups = new Map();
      for (const game of playerStat.games) {
        if (!gameIdGroups.has(game.gameId)) {
          gameIdGroups.set(game.gameId, []);
        }
        gameIdGroups.get(game.gameId).push(game);
      }

      for (const [gameId, gameOccurrences] of gameIdGroups) {
        if (gameOccurrences.length > 1) {
          // Check if stats are identical (legitimate) or different (suspicious)
          const firstGame = gameOccurrences[0];
          const hasIdenticalStats = gameOccurrences.every(game => 
            game.hits === firstGame.hits &&
            game.ab === firstGame.ab &&
            game.runs === firstGame.runs &&
            game.rbi === firstGame.rbi &&
            game.hr === firstGame.hr
          );

          if (!hasIdenticalStats) {
            this.suspiciousPatterns.push({
              type: 'inconsistent_duplicate_stats',
              player: playerKey,
              gameId,
              occurrences: gameOccurrences,
              severity: 'high'
            });
          }
        }
      }
    }

    console.log(`   ⚠️  Found ${this.suspiciousPatterns.length} statistical anomalies`);
  }

  async detectGameContextDuplicates() {
    console.log('🏟️  Validating game contexts...');
    
    let contextIssues = 0;

    for (const duplicate of this.duplicates) {
      if (duplicate.type === 'cross_date_duplicate') {
        const gameId = duplicate.gameId;
        const context = this.gameContexts.get(gameId);
        
        if (!context) {
          duplicate.contextIssue = 'missing_game_context';
          contextIssues++;
          continue;
        }

        // Check if all occurrences have consistent team context
        const occurrenceTeams = new Set(duplicate.occurrences.map(o => o.team));
        if (!Array.from(occurrenceTeams).every(team => context.teams.includes(team))) {
          duplicate.contextIssue = 'team_mismatch';
          contextIssues++;
        }
      }
    }

    console.log(`   🚨 Found ${contextIssues} context validation issues`);
  }

  generateReport() {
    console.log('\n📋 COMPREHENSIVE DUPLICATE ANALYSIS REPORT');
    console.log('==========================================\n');

    // Summary statistics
    console.log('📊 SUMMARY STATISTICS:');
    console.log(`Total players analyzed: ${this.playerStats.size}`);
    console.log(`Cross-date duplicates found: ${this.duplicates.length}`);
    console.log(`Statistical anomalies: ${this.suspiciousPatterns.length}`);
    console.log(`Game contexts indexed: ${this.gameContexts.size}\n`);

    // Critical duplicates requiring immediate attention
    const criticalDuplicates = this.duplicates.filter(d => d.severity === 'high');
    console.log(`🚨 CRITICAL DUPLICATES (${criticalDuplicates.length}):`);
    for (const duplicate of criticalDuplicates.slice(0, 10)) {
      console.log(`❌ ${duplicate.player} - GameId ${duplicate.gameId}`);
      console.log(`   Appears on: ${duplicate.occurrences.map(o => o.date).join(', ')}`);
      console.log(`   Impact: ${duplicate.impact}`);
      if (duplicate.contextIssue) {
        console.log(`   Context Issue: ${duplicate.contextIssue}`);
      }
      console.log();
    }

    // High-impact statistical anomalies
    const highImpactAnomalies = this.suspiciousPatterns.filter(p => p.severity === 'high');
    console.log(`⚠️  HIGH-IMPACT ANOMALIES (${highImpactAnomalies.length}):`);
    for (const anomaly of highImpactAnomalies.slice(0, 10)) {
      console.log(`⚠️  ${anomaly.player} - ${anomaly.type}`);
      if (anomaly.duplicateCount) {
        console.log(`   ${anomaly.duplicateCount} duplicate games out of ${anomaly.totalGames}`);
      }
      if (anomaly.hitsPerGame) {
        console.log(`   Unusual hit rate: ${anomaly.hitsPerGame} hits/game`);
      }
      console.log();
    }

    // Focus on Cody Bellinger specifically
    console.log('🎯 CODY BELLINGER ANALYSIS:');
    const bellingerKey = 'C. Bellinger_NYY';
    const bellingerStats = this.playerStats.get(bellingerKey);
    
    if (bellingerStats) {
      console.log(`Total games: ${bellingerStats.totalGames}`);
      console.log(`Unique games: ${bellingerStats.gameIds.size}`);
      console.log(`Total hits: ${bellingerStats.totalHits}`);
      console.log(`Hits per game: ${(bellingerStats.totalHits / bellingerStats.totalGames).toFixed(2)}`);
      
      const bellingerDuplicates = this.duplicates.filter(d => d.player === bellingerKey);
      if (bellingerDuplicates.length > 0) {
        console.log(`\n❌ BELLINGER DUPLICATES FOUND (${bellingerDuplicates.length}):`);
        for (const dup of bellingerDuplicates) {
          console.log(`   GameId ${dup.gameId}:`);
          for (const occurrence of dup.occurrences) {
            console.log(`     ${occurrence.date}: ${occurrence.hits} hits (${occurrence.file})`);
          }
        }
      }
    } else {
      console.log('❌ Cody Bellinger not found in dataset!');
    }

    return {
      duplicates: this.duplicates,
      anomalies: this.suspiciousPatterns,
      playerStats: Object.fromEntries(this.playerStats),
      summary: {
        totalPlayers: this.playerStats.size,
        criticalDuplicates: criticalDuplicates.length,
        highImpactAnomalies: highImpactAnomalies.length
      }
    };
  }
}

// Main execution
async function main() {
  try {
    const detector = new ComprehensiveDuplicateDetector();
    const report = await detector.analyzeFullSeason();
    
    // Save detailed report
    const reportPath = `scripts/data-validation/comprehensive_duplicate_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    console.log('\n🎉 Comprehensive duplicate detection completed!');
    
    return report;
  } catch (error) {
    console.error('❌ Error during comprehensive duplicate detection:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ComprehensiveDuplicateDetector };