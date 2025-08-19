#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Import centralized configuration
const { paths } = require('../../config/dataPath');

// Milestone definitions
const MILESTONE_DEFINITIONS = {
  HR: { interval: 5, start: 5 },     // 5, 10, 15, 20, 25...
  H: { interval: 10, start: 10 },    // 10, 20, 30, 40, 50...
  RBI: { interval: 10, start: 10 },  // 10, 20, 30, 40, 50...
  R: { interval: 10, start: 10 }     // 10, 20, 30, 40, 50...
};

// Heat level definitions based on proximity
const HEAT_LEVELS = {
  1: { level: 'BLAZING', emoji: '🔥🔥🔥', urgencyScore: 95 },
  2: { level: 'HOT', emoji: '🔥🔥', urgencyScore: 75 },
  3: { level: 'WARM', emoji: '🔥', urgencyScore: 50 }
};

// Month mapping
const MONTHS = {
  'march': 'march', 'april': 'april', 'may': 'may', 'june': 'june',
  'july': 'july', 'august': 'august', 'september': 'september', 'october': 'october'
};

class MilestoneTracker {
  constructor() {
    this.playerStats = new Map(); // Cumulative season stats
    this.playerGameHistory = new Map(); // Recent game history
    this.milestones = [];
  }

  async processAllDailyFiles() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const dataDir = paths.gameData(currentYear);
    
    console.log(`🔍 Scanning all ${currentYear} season data...`);
    
    // Process each month directory
    for (const month of Object.keys(MONTHS)) {
      const monthDir = path.join(dataDir, month);
      
      try {
        const files = await fs.readdir(monthDir);
        const jsonFiles = files
          .filter(f => f.endsWith('.json'))
          .sort(); // Process chronologically
        
        for (const file of jsonFiles) {
          const filePath = path.join(monthDir, file);
          await this.processDataFile(filePath);
        }
      } catch (error) {
        // Month directory might not exist yet
        continue;
      }
    }
    
    console.log(`✅ Processed ${this.playerStats.size} players`);
  }

  async processDataFile(filePath) {
    try {
      const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
      const gameDate = data.date;
      
      // Process players from this day - handle both 'players' array and direct structure
      let players = [];
      if (data.players && Array.isArray(data.players)) {
        players = data.players;
      } else if (Array.isArray(data)) {
        players = data;
      }
      
      for (const player of players) {
        if (player.playerType === 'hitter' && player.name && player.team) {
          this.updatePlayerStats(player, gameDate);
        }
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
    }
  }

  updatePlayerStats(player, gameDate) {
    const key = `${player.name}_${player.team}`;
    
    // Initialize player if first time seeing them
    if (!this.playerStats.has(key)) {
      this.playerStats.set(key, {
        name: player.name,
        team: player.team,
        cumulative: { R: 0, H: 0, RBI: 0, HR: 0, AB: 0, games: 0 },
        recentGames: [],
        firstGame: gameDate,
        lastGame: gameDate
      });
    }
    
    const playerData = this.playerStats.get(key);
    
    // Update cumulative stats with safe parsing
    const safeParseInt = (value) => {
      const parsed = parseInt(value);
      return isNaN(parsed) ? 0 : parsed;
    };
    
    playerData.cumulative.R += safeParseInt(player.R);
    playerData.cumulative.H += safeParseInt(player.H);
    playerData.cumulative.RBI += safeParseInt(player.RBI);
    playerData.cumulative.HR += safeParseInt(player.HR);
    playerData.cumulative.AB += safeParseInt(player.AB);
    playerData.cumulative.games += 1;
    playerData.lastGame = gameDate;
    
    // Keep recent game history (last 10 games)
    playerData.recentGames.push({
      date: gameDate,
      R: safeParseInt(player.R),
      H: safeParseInt(player.H),
      RBI: safeParseInt(player.RBI),
      HR: safeParseInt(player.HR),
      AB: safeParseInt(player.AB)
    });
    
    if (playerData.recentGames.length > 10) {
      playerData.recentGames.shift();
    }
  }

  detectMilestones() {
    console.log('🎯 Detecting milestone candidates...');
    
    for (const [key, playerData] of this.playerStats) {
      // Check each stat category
      for (const stat of ['HR', 'H', 'RBI', 'R']) {
        const current = playerData.cumulative[stat];
        const definition = MILESTONE_DEFINITIONS[stat];
        
        // Skip if no stats
        if (current === 0) continue;
        
        // Find next milestone
        let nextMilestone = Math.ceil(current / definition.interval) * definition.interval;
        
        // Ensure we start at the minimum milestone
        if (nextMilestone < definition.start) {
          nextMilestone = definition.start;
        }
        
        // Skip if milestone is too far (more than 3 away)
        if (nextMilestone - current > 3) continue;
        
        const proximity = nextMilestone - current;
        
        // Only track X7, X8, X9 (3, 2, 1 away from milestone)
        if (proximity <= 3 && proximity >= 1) {
          const heatInfo = HEAT_LEVELS[proximity];
          
          // Debug check
          if (!heatInfo) {
            console.error(`No heat info for proximity ${proximity}`);
            continue;
          }
          
          const milestone = this.createMilestoneEntry(
            playerData, 
            stat, 
            current, 
            nextMilestone, 
            heatInfo
          );
          
          if (milestone) {
            this.milestones.push(milestone);
          }
        }
      }
    }
    
    console.log(`📊 Found ${this.milestones.length} milestone candidates`);
  }

  createMilestoneEntry(playerData, stat, current, target, heatInfo) {
    // Calculate season pace
    const gamesPlayed = playerData.cumulative.games;
    const seasonRate = current / gamesPlayed;
    
    // Calculate recent pace (last 3 games)
    const last3Games = playerData.recentGames.slice(-3);
    const last3Total = last3Games.reduce((sum, game) => sum + game[stat], 0);
    const recentRate = last3Total / 3;
    
    // Calculate timeline estimates
    const needed = target - current;
    const seasonPaceGames = seasonRate > 0 ? needed / seasonRate : 999;
    const recentPaceGames = recentRate > 0 ? needed / recentRate : 999;
    
    // Determine trend
    let trend = '➡️ STEADY';
    if (recentRate > seasonRate * 1.5) trend = '🚀 SURGING';
    else if (recentRate > seasonRate * 1.2) trend = '📈 RISING';
    else if (recentRate < seasonRate * 0.8) trend = '📉 FALLING';
    else if (recentRate < seasonRate * 0.5) trend = '❄️ COLD';
    
    // Calculate best estimate (weighted average favoring recent if hot)
    let bestEstimateGames;
    let confidence = 70;
    
    if (trend === '🚀 SURGING') {
      bestEstimateGames = recentPaceGames * 0.7 + seasonPaceGames * 0.3;
      confidence = 85;
    } else if (trend === '❄️ COLD') {
      bestEstimateGames = recentPaceGames * 0.3 + seasonPaceGames * 0.7;
      confidence = 55;
    } else {
      bestEstimateGames = recentPaceGames * 0.5 + seasonPaceGames * 0.5;
      confidence = 70;
    }
    
    // Calculate AB-based timeline for more precision
    const seasonABRate = gamesPlayed > 0 ? playerData.cumulative.AB / gamesPlayed : 4;
    const recentABRate = last3Games.length > 0 ? 
      last3Games.reduce((sum, g) => sum + g.AB, 0) / last3Games.length : 4;
    const avgABPerGame = (seasonABRate + recentABRate) / 2;
    
    const statPerAB = playerData.cumulative.AB > 0 ? 
      current / playerData.cumulative.AB : 0;
    const estimatedABsNeeded = statPerAB > 0 ? needed / statPerAB : 999;
    
    // Generate alerts
    const alerts = [];
    if (heatInfo.level === 'BLAZING') alerts.push('🎯 One away from milestone!');
    if (trend === '🚀 SURGING') alerts.push(`🔥 ${last3Total} ${stat} in last 3 games`);
    if (bestEstimateGames <= 1.5) alerts.push('⚡ Could happen tonight!');
    if (bestEstimateGames <= 3) alerts.push('📅 This weekend potential');
    
    // Calculate target date
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + Math.ceil(bestEstimateGames));
    
    return {
      player: playerData.name,
      team: playerData.team,
      milestone: {
        stat,
        current,
        target,
        heatLevel: heatInfo.level,
        heatEmoji: heatInfo.emoji,
        urgencyScore: heatInfo.urgencyScore
      },
      timeline: {
        seasonPace: {
          gamesNeeded: Math.round(seasonPaceGames * 10) / 10,
          targetDate: new Date(today.getTime() + seasonPaceGames * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          dailyRate: Math.round(seasonRate * 1000) / 1000
        },
        recentPace: {
          gamesNeeded: Math.round(recentPaceGames * 10) / 10,
          targetDate: new Date(today.getTime() + recentPaceGames * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          last3Rate: Math.round(recentRate * 1000) / 1000,
          trend
        },
        bestEstimate: {
          games: Math.round(bestEstimateGames * 10) / 10,
          confidence,
          date: targetDate.toISOString().split('T')[0],
          reasoning: this.getTimelineReasoning(trend, heatInfo.level)
        },
        atBatAnalysis: {
          avgABPerGame: Math.round(avgABPerGame * 10) / 10,
          seasonStatPerAB: Math.round(statPerAB * 1000) / 1000,
          estimatedABsNeeded: Math.round(estimatedABsNeeded * 10) / 10
        }
      },
      momentum: {
        gamesPlayed,
        last3Games: last3Total,
        seasonTotal: current,
        percentAboveSeason: recentRate > 0 ? 
          Math.round(((recentRate / seasonRate) - 1) * 100) : 0
      },
      alerts
    };
  }

  getTimelineReasoning(trend, heatLevel) {
    if (trend === '🚀 SURGING' && heatLevel === 'BLAZING') {
      return 'Hot streak + one away = imminent';
    } else if (trend === '🚀 SURGING') {
      return 'Recent surge accelerating timeline';
    } else if (trend === '❄️ COLD') {
      return 'Cold streak may delay milestone';
    } else if (heatLevel === 'BLAZING') {
      return 'One away at steady pace';
    } else {
      return 'Steady pace projection';
    }
  }

  generateSummary() {
    const summary = {
      totalTracked: this.milestones.length,
      byHeatLevel: {
        BLAZING: this.milestones.filter(m => m.milestone.heatLevel === 'BLAZING').length,
        HOT: this.milestones.filter(m => m.milestone.heatLevel === 'HOT').length,
        WARM: this.milestones.filter(m => m.milestone.heatLevel === 'WARM').length
      },
      byStat: {
        HR: this.milestones.filter(m => m.milestone.stat === 'HR').length,
        H: this.milestones.filter(m => m.milestone.stat === 'H').length,
        RBI: this.milestones.filter(m => m.milestone.stat === 'RBI').length,
        R: this.milestones.filter(m => m.milestone.stat === 'R').length
      },
      tonightWatch: this.milestones.filter(m => 
        m.timeline.bestEstimate.games <= 1.5
      ).map(m => ({
        player: m.player,
        team: m.team,
        milestone: `${m.milestone.current} → ${m.milestone.target} ${m.milestone.stat}`
      })),
      weekendWatch: this.milestones.filter(m => 
        m.timeline.bestEstimate.games > 1.5 && m.timeline.bestEstimate.games <= 3
      ).length,
      hottestPlayers: this.getHottestPlayers()
    };
    
    return summary;
  }

  getHottestPlayers() {
    // Find players with multiple milestones or blazing heat
    const playerMilestoneCount = new Map();
    
    for (const milestone of this.milestones) {
      const key = `${milestone.player}_${milestone.team}`;
      const current = playerMilestoneCount.get(key) || { 
        name: milestone.player, 
        team: milestone.team,
        count: 0, 
        blazing: 0 
      };
      
      current.count++;
      if (milestone.milestone.heatLevel === 'BLAZING') current.blazing++;
      
      playerMilestoneCount.set(key, current);
    }
    
    // Sort by blazing count, then total count
    const sorted = Array.from(playerMilestoneCount.values())
      .sort((a, b) => {
        if (b.blazing !== a.blazing) return b.blazing - a.blazing;
        return b.count - a.count;
      })
      .slice(0, 5)
      .map(p => p.name);
    
    return sorted;
  }

  async saveResults() {
    const today = new Date().toISOString().split('T')[0];
    const outputDir = paths.predictions;
    const outputPath = path.join(outputDir, `milestone_tracking_${today}.json`);
    
    // Sort milestones by urgency and significance
    this.milestones.sort((a, b) => {
      // First by heat level
      if (a.milestone.urgencyScore !== b.milestone.urgencyScore) {
        return b.milestone.urgencyScore - a.milestone.urgencyScore;
      }
      // Then by best estimate games
      return a.timeline.bestEstimate.games - b.timeline.bestEstimate.games;
    });
    
    // Create a player lookup map for easier access in tooltips
    const playerLookup = {};
    for (const milestone of this.milestones) {
      const fullName = milestone.player;
      const team = milestone.team;
      
      // Create multiple lookup keys for better matching
      // 1. Full name + team (e.g., "Bryce Harper-PHI")
      playerLookup[`${fullName}-${team}`.toUpperCase()] = milestone;
      
      // 2. If the name doesn't have a period, create abbreviated version
      if (!fullName.includes('.')) {
        const nameParts = fullName.split(' ');
        if (nameParts.length >= 2) {
          // Create "B. Harper" format
          const abbreviated = `${nameParts[0].charAt(0)}. ${nameParts[nameParts.length - 1]}`;
          playerLookup[`${abbreviated}-${team}`.toUpperCase()] = milestone;
          
          // Store both versions in the milestone for reference
          milestone.fullName = fullName;
          milestone.abbreviatedName = abbreviated;
        }
      } else {
        // Name is already abbreviated, create full name version if possible
        milestone.abbreviatedName = fullName;
        // Try to expand "B. Harper" to possible full names (would need roster lookup)
      }
      
      // 3. Last name only + team (e.g., "Harper-PHI") for fallback
      const nameParts = fullName.split(' ');
      if (nameParts.length >= 2) {
        const lastName = nameParts[nameParts.length - 1];
        // Only add if it doesn't conflict with another player
        const lastNameKey = `${lastName}-${team}`.toUpperCase();
        if (!playerLookup[lastNameKey]) {
          playerLookup[lastNameKey] = milestone;
        }
      }
    }
    
    const output = {
      date: today,
      lastUpdated: new Date().toISOString(),
      milestones: this.milestones,
      playerLookup: playerLookup,
      summary: this.generateSummary()
    };
    
    // Ensure directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Save main file
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
    console.log(`💾 Saved milestone tracking to: ${outputPath}`);
    
    // Also save as latest
    const latestPath = path.join(outputDir, 'milestone_tracking_latest.json');
    await fs.writeFile(latestPath, JSON.stringify(output, null, 2));
    console.log(`💾 Saved latest milestone tracking`);
    
    // Print summary
    console.log('\n📊 Milestone Tracking Summary:');
    console.log(`- Total Milestones Tracked: ${output.summary.totalTracked}`);
    console.log(`- 🔥🔥🔥 BLAZING (1 away): ${output.summary.byHeatLevel.BLAZING}`);
    console.log(`- 🔥🔥 HOT (2 away): ${output.summary.byHeatLevel.HOT}`);
    console.log(`- 🔥 WARM (3 away): ${output.summary.byHeatLevel.WARM}`);
    
    if (output.summary.tonightWatch.length > 0) {
      console.log('\n⚡ TONIGHT\'S WATCH LIST:');
      output.summary.tonightWatch.forEach(player => {
        console.log(`  - ${player.player} (${player.team}): ${player.milestone}`);
      });
    }
  }
}

// Main execution
async function main() {
  console.log('🏃 Starting Milestone Tracking Generation...\n');
  
  const tracker = new MilestoneTracker();
  
  try {
    // Process all daily files
    await tracker.processAllDailyFiles();
    
    // Detect milestones
    tracker.detectMilestones();
    
    // Save results
    await tracker.saveResults();
    
    console.log('\n✅ Milestone tracking generation complete!');
  } catch (error) {
    console.error('❌ Error generating milestone tracking:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { MilestoneTracker, MILESTONE_DEFINITIONS };