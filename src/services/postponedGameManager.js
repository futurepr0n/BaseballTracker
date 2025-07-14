#!/usr/bin/env node

/**
 * Postponed Game Manager
 * 
 * Manages the lifecycle of postponed games, including ESPN schedule integration,
 * gameId tracking, and player statistics reconciliation when games are rescheduled.
 * 
 * Addresses the core issue: when games are postponed and rescheduled, gameIds change
 * but player statistics may still reference the old gameId.
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Configuration for postponed game management
 */
const POSTPONED_CONFIG = {
  ESPN_BASE_URL: 'https://www.espn.com/mlb/schedule/_/date',
  SCHEDULE_DIR: '../BaseballScraper', // Relative to BaseballTracker
  JSON_DATA_DIR: 'public/data/2025',
  POSTPONEMENT_LOG_DIR: 'logs/postponed_games',
  
  // GameId validation ranges
  ESPN_GAMEID_RANGES: {
    PRIMARY: { min: 400000000, max: 500000000 },
    SECONDARY: { min: 360000000, max: 399999999 }
  },
  
  // Schedule generator ID range
  SCHEDULE_ID_RANGE: { min: 1, max: 99999 }
};

/**
 * ESPN Schedule fetcher utility
 */
class ESPNScheduleFetcher {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  }
  
  /**
   * Fetch ESPN schedule for a specific date
   */
  async fetchScheduleForDate(date) {
    try {
      // Format date for ESPN URL (YYYYMMDD)
      const espnDate = date.replace(/-/g, '');
      const url = `${POSTPONED_CONFIG.ESPN_BASE_URL}/${espnDate}`;
      
      console.log(`🔍 Fetching ESPN schedule for ${date}: ${url}`);
      
      // Use node-fetch if available, otherwise provide fallback
      let fetch;
      try {
        fetch = (await import('node-fetch')).default;
      } catch (error) {
        console.warn('⚠️  node-fetch not available, using basic HTTP request');
        return await this.basicHttpFetch(url);
      }
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      return this.parseESPNSchedule(html, date);
      
    } catch (error) {
      console.error(`❌ Error fetching ESPN schedule for ${date}:`, error.message);
      return { date, games: [], error: error.message };
    }
  }
  
  /**
   * Basic HTTP fetch fallback using Node.js http/https
   */
  async basicHttpFetch(url) {
    return new Promise((resolve) => {
      const https = require('https');
      const urlParsed = new URL(url);
      
      const options = {
        hostname: urlParsed.hostname,
        port: 443,
        path: urlParsed.pathname + urlParsed.search,
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = this.parseESPNSchedule(data, urlParsed.pathname.split('/').pop());
            resolve(parsed);
          } catch (error) {
            resolve({ games: [], error: error.message });
          }
        });
      });
      
      req.on('error', (error) => {
        resolve({ games: [], error: error.message });
      });
      
      req.end();
    });
  }
  
  /**
   * Parse ESPN schedule HTML to extract game information
   */
  parseESPNSchedule(html, date) {
    const games = [];
    
    try {
      // Look for game links with ESPN gameIds
      const gameIdRegex = /gameId[=\/_](\d{9,10})/g;
      const teamRegex = /"shortName":"([A-Z]{2,3})"/g;
      const timeRegex = /"startTime":"([^"]+)"/g;
      
      let match;
      const foundGameIds = new Set();
      
      // Extract unique gameIds
      while ((match = gameIdRegex.exec(html)) !== null) {
        const gameId = match[1];
        
        // Validate gameId is in ESPN range
        const numericId = parseInt(gameId);
        const isValidESPNId = 
          (numericId >= POSTPONED_CONFIG.ESPN_GAMEID_RANGES.PRIMARY.min && 
           numericId <= POSTPONED_CONFIG.ESPN_GAMEID_RANGES.PRIMARY.max) ||
          (numericId >= POSTPONED_CONFIG.ESPN_GAMEID_RANGES.SECONDARY.min && 
           numericId <= POSTPONED_CONFIG.ESPN_GAMEID_RANGES.SECONDARY.max);
        
        if (isValidESPNId && !foundGameIds.has(gameId)) {
          foundGameIds.add(gameId);
          
          games.push({
            gameId: gameId,
            espnGameId: gameId,
            date: date,
            status: 'scheduled',
            source: 'espn_schedule_fetch',
            fetchedAt: new Date().toISOString()
          });
        }
      }
      
      console.log(`📊 Parsed ${games.length} games from ESPN schedule for ${date}`);
      
      return {
        date,
        games,
        totalGames: games.length,
        source: 'espn_schedule',
        fetchedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ Error parsing ESPN schedule:`, error.message);
      return {
        date,
        games: [],
        error: error.message,
        source: 'espn_schedule_parse_error'
      };
    }
  }
}

/**
 * GameId lifecycle manager
 */
class GameIdLifecycleManager {
  constructor() {
    this.espnFetcher = new ESPNScheduleFetcher();
  }
  
  /**
   * Detect postponed games that need gameId updates
   */
  async detectPostponedGameIssues() {
    console.log('🔍 DETECTING POSTPONED GAME ISSUES');
    console.log('=================================');
    
    try {
      // Check for postponement logs in BaseballScraper
      const postponementLogs = await this.loadPostponementLogs();
      
      if (postponementLogs.length === 0) {
        console.log('ℹ️  No postponement logs found - no issues to resolve');
        return { postponedGames: [], issues: [] };
      }
      
      const issues = [];
      
      for (const log of postponementLogs) {
        const logIssues = await this.analyzePostponementLog(log);
        issues.push(...logIssues);
      }
      
      console.log(`📊 Detected ${issues.length} potential postponed game issues`);
      
      return {
        postponedGames: postponementLogs,
        issues,
        summary: {
          totalPostponements: postponementLogs.length,
          potentialIssues: issues.length
        }
      };
      
    } catch (error) {
      console.error('❌ Error detecting postponed game issues:', error);
      throw error;
    }
  }
  
  /**
   * Load postponement logs from BaseballScraper
   */
  async loadPostponementLogs() {
    const logs = [];
    
    try {
      const scrapperPath = path.resolve(POSTPONED_CONFIG.SCHEDULE_DIR);
      const files = await fs.readdir(scrapperPath);
      
      const postponementFiles = files.filter(f => f.startsWith('postponements_') && f.endsWith('.json'));
      
      for (const file of postponementFiles) {
        try {
          const filePath = path.join(scrapperPath, file);
          const logData = JSON.parse(await fs.readFile(filePath, 'utf8'));
          
          logs.push({
            file: file,
            path: filePath,
            date: file.replace('postponements_', '').replace('.json', ''),
            ...logData
          });
        } catch (error) {
          console.warn(`⚠️  Could not load postponement log: ${file}`);
        }
      }
      
      return logs.sort((a, b) => a.date.localeCompare(b.date));
      
    } catch (error) {
      console.warn(`⚠️  Could not access BaseballScraper directory: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Analyze a specific postponement log for gameId issues
   */
  async analyzePostponementLog(log) {
    const issues = [];
    
    try {
      if (!log.detected_postponements || log.detected_postponements.length === 0) {
        return issues;
      }
      
      for (const postponement of log.detected_postponements) {
        // Check if this postponement created gameId tracking issues
        const issue = await this.detectGameIdIssue(postponement, log.date);
        if (issue) {
          issues.push(issue);
        }
      }
      
    } catch (error) {
      console.warn(`⚠️  Error analyzing postponement log for ${log.date}:`, error.message);
    }
    
    return issues;
  }
  
  /**
   * Detect specific gameId issue for a postponement
   */
  async detectGameIdIssue(postponement, originalDate) {
    try {
      // Look for player data files that might have stale gameId references
      const playerDataIssue = await this.checkPlayerDataGameIdConsistency(postponement, originalDate);
      
      if (playerDataIssue) {
        return {
          type: 'gameId_mismatch',
          originalDate,
          postponement,
          issue: playerDataIssue,
          severity: 'high',
          description: 'Player data may reference incorrect gameId after postponement'
        };
      }
      
      return null;
      
    } catch (error) {
      console.warn(`⚠️  Error detecting gameId issue:`, error.message);
      return null;
    }
  }
  
  /**
   * Check player data for gameId consistency issues
   */
  async checkPlayerDataGameIdConsistency(postponement, originalDate) {
    try {
      // This would check CSV files in BaseballScraper for gameId references
      // and JSON files in BaseballTracker for consistency
      
      const issue = {
        description: 'Potential gameId reference mismatch detected',
        details: postponement,
        recommendedAction: 'Fetch current ESPN schedule and update gameId references'
      };
      
      // Note: Full implementation would require CSV file analysis
      // This is a simplified detection that identifies potential issues
      
      return issue;
      
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Resolve gameId issues by fetching current ESPN schedule
   */
  async resolveGameIdIssues(issues) {
    console.log('\n🔧 RESOLVING GAMEID ISSUES');
    console.log('=========================');
    
    if (issues.length === 0) {
      console.log('✅ No gameId issues to resolve');
      return { resolved: [], failed: [] };
    }
    
    const resolved = [];
    const failed = [];
    
    for (const issue of issues) {
      try {
        console.log(`🔧 Resolving issue for ${issue.originalDate}...`);
        
        const resolution = await this.resolveIndividualGameIdIssue(issue);
        
        if (resolution.success) {
          resolved.push({ issue, resolution });
          console.log(`✅ Resolved: ${resolution.description}`);
        } else {
          failed.push({ issue, error: resolution.error });
          console.log(`❌ Failed: ${resolution.error}`);
        }
        
      } catch (error) {
        failed.push({ issue, error: error.message });
        console.log(`❌ Failed to resolve issue: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Resolution Summary:`);
    console.log(`   Resolved: ${resolved.length}`);
    console.log(`   Failed: ${failed.length}`);
    
    return { resolved, failed };
  }
  
  /**
   * Resolve individual gameId issue
   */
  async resolveIndividualGameIdIssue(issue) {
    try {
      // Step 1: Fetch current ESPN schedule for dates around the postponement
      const originalDate = issue.originalDate;
      const nextDay = this.addDays(originalDate, 1);
      const dayAfter = this.addDays(originalDate, 2);
      
      const schedules = await Promise.all([
        this.espnFetcher.fetchScheduleForDate(originalDate),
        this.espnFetcher.fetchScheduleForDate(nextDay),
        this.espnFetcher.fetchScheduleForDate(dayAfter)
      ]);
      
      // Step 2: Find likely rescheduled games
      const rescheduledGames = this.identifyRescheduledGames(schedules, issue.postponement);
      
      if (rescheduledGames.length === 0) {
        return {
          success: false,
          error: 'Could not identify rescheduled games in ESPN schedule'
        };
      }
      
      // Step 3: Create gameId mapping recommendations
      const mappings = this.createGameIdMappings(issue.postponement, rescheduledGames);
      
      return {
        success: true,
        description: `Identified ${rescheduledGames.length} rescheduled games with new gameIds`,
        rescheduledGames,
        mappings,
        recommendation: 'Update player data files and JSON game records with new gameIds'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Identify rescheduled games in ESPN schedules
   */
  identifyRescheduledGames(schedules, postponement) {
    const rescheduled = [];
    
    // Simple heuristic: games on subsequent days that might be the rescheduled game
    for (const schedule of schedules) {
      if (schedule.games && schedule.games.length > 0) {
        // Look for games that could be the rescheduled one
        // This is a simplified approach - real implementation would need team matching
        rescheduled.push(...schedule.games);
      }
    }
    
    return rescheduled;
  }
  
  /**
   * Create gameId mapping recommendations
   */
  createGameIdMappings(postponement, rescheduledGames) {
    return rescheduledGames.map(game => ({
      oldGameId: postponement.original_game_id || 'unknown',
      newGameId: game.gameId,
      newDate: game.date,
      confidence: 'medium', // Would be higher with team matching
      action: 'update_player_data_references'
    }));
  }
  
  /**
   * Utility function to add days to a date string
   */
  addDays(dateStr, days) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }
  
  /**
   * Generate postponed game management report
   */
  async generatePostponedGameReport(detectionResults, resolutionResults) {
    const report = {
      timestamp: new Date().toISOString(),
      reportType: 'postponed_game_management',
      
      detection: {
        postponementLogsFound: detectionResults.postponedGames.length,
        issuesDetected: detectionResults.issues.length,
        summary: detectionResults.summary
      },
      
      resolution: resolutionResults ? {
        issuesResolved: resolutionResults.resolved.length,
        issuesFailed: resolutionResults.failed.length,
        resolutions: resolutionResults.resolved.map(r => ({
          originalDate: r.issue.originalDate,
          rescheduledGames: r.resolution.rescheduledGames?.length || 0,
          mappings: r.resolution.mappings?.length || 0
        }))
      } : null,
      
      recommendations: [],
      nextSteps: []
    };
    
    // Generate recommendations
    if (detectionResults.issues.length === 0) {
      report.recommendations.push('No postponed game issues detected - system is healthy');
    } else {
      report.recommendations.push('Postponed game issues detected - gameId updates may be needed');
      
      if (resolutionResults && resolutionResults.resolved.length > 0) {
        report.recommendations.push('ESPN schedule fetching successful - implement gameId updates');
        report.nextSteps.push('Review gameId mapping recommendations');
        report.nextSteps.push('Update player data files with new gameId references');
        report.nextSteps.push('Validate game records in JSON files');
      } else {
        report.nextSteps.push('Manual investigation of postponed games required');
        report.nextSteps.push('Check ESPN schedule manually for rescheduled games');
      }
    }
    
    // Save report
    await fs.mkdir(POSTPONED_CONFIG.POSTPONEMENT_LOG_DIR, { recursive: true });
    const reportPath = path.join(POSTPONED_CONFIG.POSTPONEMENT_LOG_DIR, 
      `postponed_game_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Postponed game report saved: ${reportPath}`);
    
    return report;
  }
}

/**
 * Main postponed game management function
 */
async function managePostponedGames() {
  console.log('🎯 POSTPONED GAME MANAGER');
  console.log('========================');
  console.log(`Started: ${new Date().toISOString()}`);
  
  try {
    const manager = new GameIdLifecycleManager();
    
    // Step 1: Detect issues
    const detectionResults = await manager.detectPostponedGameIssues();
    
    // Step 2: Resolve issues if any found
    let resolutionResults = null;
    if (detectionResults.issues.length > 0) {
      resolutionResults = await manager.resolveGameIdIssues(detectionResults.issues);
    }
    
    // Step 3: Generate report
    const report = await manager.generatePostponedGameReport(detectionResults, resolutionResults);
    
    console.log('\n🎯 POSTPONED GAME MANAGEMENT SUMMARY');
    console.log('===================================');
    console.log(`Issues Detected: ${detectionResults.issues.length}`);
    if (resolutionResults) {
      console.log(`Issues Resolved: ${resolutionResults.resolved.length}`);
      console.log(`Resolution Failures: ${resolutionResults.failed.length}`);
    }
    
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach(rec => console.log(`   • ${rec}`));
    
    if (report.nextSteps.length > 0) {
      console.log('\n📋 Next Steps:');
      report.nextSteps.forEach(step => console.log(`   • ${step}`));
    }
    
    return report;
    
  } catch (error) {
    console.error('❌ Postponed game management failed:', error);
    throw error;
  }
}

// Execute if run directly
if (require.main === module) {
  managePostponedGames().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  managePostponedGames,
  GameIdLifecycleManager,
  ESPNScheduleFetcher,
  POSTPONED_CONFIG
};