/**
 * Stadium Home Run Tracker Service
 * src/services/stadiumHRTracker.js
 * 
 * Traverses all dated JSON files and creates/maintains a master list of
 * MLB stadiums with detailed home run tracking data.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BASE_DATA_DIR = path.join(__dirname, '../../public/data/2025');
const OUTPUT_FILE = path.join(__dirname, '../../public/data/stadium/stadium_hr_analysis.json');
const BACKUP_DIR = path.join(__dirname, '../../public/data/backups');

/**
 * Stadium Home Run Tracker Class
 */
class StadiumHRTracker {
  constructor() {
    this.stadiumData = new Map();
    this.processedFiles = new Set();
    this.totalFilesProcessed = 0;
    this.totalGamesProcessed = 0;
    this.totalHomeRunsTracked = 0;
    this.errors = [];
  }

  /**
   * Main execution function
   */
  async execute(forceRebuild = false) {
    console.log('🏟️  Starting Stadium Home Run Analysis...');
    console.log(`📂 Base directory: ${BASE_DATA_DIR}`);
    console.log(`📋 Output file: ${OUTPUT_FILE}`);
    
    try {
      // Load existing data if not forcing rebuild
      if (!forceRebuild) {
        await this.loadExistingData();
      }
      
      // Create backup directory if it doesn't exist
      this.ensureDirectoryExists(BACKUP_DIR);
      
      // Process all dated JSON files
      await this.processAllDateFiles();
      
      // Save the results
      await this.saveResults();
      
      // Generate summary report
      this.generateSummaryReport();
      
      console.log('✅ Stadium Home Run Analysis completed successfully!');
      return true;
      
    } catch (error) {
      console.error('❌ Error during Stadium HR Analysis:', error);
      this.errors.push({
        type: 'EXECUTION_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Load existing stadium data if available
   */
  async loadExistingData() {
    try {
      if (fs.existsSync(OUTPUT_FILE)) {
        console.log('📖 Loading existing stadium data...');
        const existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
        
        // Reconstruct the Map from existing data
        if (existingData.stadiums) {
          Object.entries(existingData.stadiums).forEach(([stadiumName, data]) => {
            this.stadiumData.set(stadiumName, data);
          });
        }
        
        // Track processed files to avoid reprocessing
        if (existingData.processedFiles) {
          existingData.processedFiles.forEach(file => {
            this.processedFiles.add(file);
          });
        }
        
        console.log(`📊 Loaded data for ${this.stadiumData.size} stadiums`);
      }
    } catch (error) {
      console.warn('⚠️  Could not load existing data, starting fresh:', error.message);
    }
  }

  /**
   * Process all date-based JSON files
   */
  async processAllDateFiles() {
    console.log('🔍 Scanning for date-based JSON files...');
    
    if (!fs.existsSync(BASE_DATA_DIR)) {
      throw new Error(`Base data directory does not exist: ${BASE_DATA_DIR}`);
    }
    
    // Get all month directories
    const monthDirs = fs.readdirSync(BASE_DATA_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    console.log(`📅 Found month directories: ${monthDirs.join(', ')}`);
    
    for (const monthDir of monthDirs) {
      await this.processMonthDirectory(monthDir);
    }
  }

  /**
   * Process all files in a month directory
   */
  async processMonthDirectory(monthName) {
    const monthPath = path.join(BASE_DATA_DIR, monthName);
    console.log(`📆 Processing month: ${monthName}`);
    
    try {
      const files = fs.readdirSync(monthPath)
        .filter(file => file.endsWith('.json') && file.includes('_'))
        .sort(); // Process in chronological order
      
      console.log(`📄 Found ${files.length} JSON files in ${monthName}`);
      
      for (const file of files) {
        const filePath = path.join(monthPath, file);
        
        // Skip if already processed (unless forcing rebuild)
        if (this.processedFiles.has(filePath)) {
          continue;
        }
        
        await this.processDateFile(filePath, file);
      }
      
    } catch (error) {
      console.error(`❌ Error processing month ${monthName}:`, error.message);
      this.errors.push({
        type: 'MONTH_PROCESSING_ERROR',
        month: monthName,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Process a single date file
   */
  async processDateFile(filePath, fileName) {
    try {
      console.log(`📄 Processing file: ${fileName}`);
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      if (!data.games || !data.players) {
        console.warn(`⚠️  File ${fileName} missing games or players data`);
        return;
      }
      
      // Extract date from filename (e.g., "april_02_2025.json")
      const dateMatch = fileName.match(/(\w+)_(\d{1,2})_(\d{4})\.json/);
      if (!dateMatch) {
        console.warn(`⚠️  Could not parse date from filename: ${fileName}`);
        return;
      }
      
      const [, monthName, day, year] = dateMatch;
      const gameDate = this.parseGameDate(monthName, day, year);
      
      // Process each game in the file
      for (const game of data.games) {
        await this.processGame(game, data.players, gameDate, fileName);
      }
      
      // Mark file as processed
      this.processedFiles.add(filePath);
      this.totalFilesProcessed++;
      
    } catch (error) {
      console.error(`❌ Error processing file ${fileName}:`, error.message);
      this.errors.push({
        type: 'FILE_PROCESSING_ERROR',
        file: fileName,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Process a single game
   */
  async processGame(game, allPlayers, gameDate, sourceFile) {
    try {
      const {
        homeTeam,
        awayTeam,
        venue,
        originalId,
        dateTime,
        homeScore,
        awayScore,
        status
      } = game;
      
      if (!venue || !homeTeam || !awayTeam) {
        console.warn(`⚠️  Game missing required data: venue=${venue}, homeTeam=${homeTeam}, awayTeam=${awayTeam}`);
        return;
      }
      
      // Initialize stadium data if not exists
      if (!this.stadiumData.has(venue)) {
        this.initializeStadium(venue, homeTeam);
      }
      
      const stadiumInfo = this.stadiumData.get(venue);
      
      // Parse timing information
      const timingInfo = this.parseGameTiming(gameDate, dateTime);
      
      // Filter players for this game's teams
      const gamePlayers = allPlayers.filter(player => 
        (player.team === homeTeam || player.team === awayTeam) &&
        (player.playerType === 'hitter' || !player.playerType) &&
        player.HR !== 'DNP'
      );
      
      // Count home runs by team
      let homeTeamHRs = 0;
      let awayTeamHRs = 0;
      const homeRunDetails = [];
      
      gamePlayers.forEach(player => {
        const hrs = Number(player.HR) || 0;
        if (hrs > 0) {
          const isHomeTeam = player.team === homeTeam;
          
          if (isHomeTeam) {
            homeTeamHRs += hrs;
          } else {
            awayTeamHRs += hrs;
          }
          
          // Track individual home run details with timing
          for (let i = 0; i < hrs; i++) {
            homeRunDetails.push({
              player: player.name,
              team: player.team,
              isHomeTeam,
              gameId: originalId,
              date: gameDate,
              dayOfWeek: timingInfo.dayOfWeek,
              dayName: timingInfo.dayName,
              gameHour: timingInfo.gameHour,
              timeString: timingInfo.timeString
            });
          }
          
          this.totalHomeRunsTracked += hrs;
        }
      });
      
      // Create enhanced game record with timing information
      const gameRecord = {
        gameId: originalId,
        date: gameDate,
        dateTime: dateTime || null,
        homeTeam,
        awayTeam,
        homeScore: homeScore || 0,
        awayScore: awayScore || 0,
        status: status || 'Unknown',
        homeTeamHRs,
        awayTeamHRs,
        totalHRs: homeTeamHRs + awayTeamHRs,
        homeRunDetails,
        sourceFile,
        // Enhanced timing information
        timing: {
          dayOfWeek: timingInfo.dayOfWeek,      // 0-6 (Sunday-Saturday)
          dayName: timingInfo.dayName,          // "Sunday", "Monday", etc.
          gameHour: timingInfo.gameHour,        // UTC hour (0-23)
          gameMinute: timingInfo.gameMinute,    // UTC minute (0-59)
          timeString: timingInfo.timeString,    // "HH:MM" format in UTC
          isWeekend: timingInfo.isWeekend,      // true/false
          isWeekday: timingInfo.isWeekday,      // true/false
          isDayGame: timingInfo.isDayGame,      // true/false (before 17:00 UTC)
          isNightGame: timingInfo.isNightGame,  // true/false (18:00+ UTC)
          timeSlot: timingInfo.timeSlot,        // "Weekend 19:00", "Weekday 13:05", etc.
          utcDateTime: timingInfo.utcDateTime   // Full ISO string for reference
        }
      };
      
      // Add to stadium data
      stadiumInfo.games.push(gameRecord);
      stadiumInfo.totalGames++;
      stadiumInfo.totalHomeRuns += homeTeamHRs + awayTeamHRs;
      stadiumInfo.homeTeamHomeRuns += homeTeamHRs;
      stadiumInfo.awayTeamHomeRuns += awayTeamHRs;
      
      // Update per-team statistics
      this.updateTeamStats(stadiumInfo, homeTeam, homeTeamHRs, true);
      this.updateTeamStats(stadiumInfo, awayTeam, awayTeamHRs, false);
      
      // Update timing-based statistics
      this.updateTimingStats(stadiumInfo, gameRecord);
      
      this.totalGamesProcessed++;
      
      if (homeTeamHRs + awayTeamHRs > 0) {
        console.log(`⚾ ${venue}: ${homeTeam} ${homeTeamHRs} HR, ${awayTeam} ${awayTeamHRs} HR (${timingInfo.dayName} ${timingInfo.timeString} UTC, Game ${originalId})`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing game:`, error.message);
      this.errors.push({
        type: 'GAME_PROCESSING_ERROR',
        game: game.originalId || 'unknown',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Initialize a new stadium
   */
  initializeStadium(venue, homeTeam) {
    console.log(`🏟️  Initializing new stadium: ${venue} (Home: ${homeTeam})`);
    
    this.stadiumData.set(venue, {
      name: venue,
      homeTeam,
      totalGames: 0,
      totalHomeRuns: 0,
      homeTeamHomeRuns: 0,
      awayTeamHomeRuns: 0,
      averageHRsPerGame: 0,
      games: [],
      teamStats: new Map(),
      monthlyStats: new Map(),
      // Enhanced timing-based statistics
      timingStats: {
        byDayOfWeek: new Map(),     // Sunday through Saturday
        byGameHour: new Map(),      // 0-23 (24-hour format)
        byTimeSlot: new Map(),      // "Weekend 13:00", "Weekday 19:00", etc.
        dayVsNight: {
          dayGames: { games: 0, homeRuns: 0, averageHRs: 0 },     // Games before 17:00
          nightGames: { games: 0, homeRuns: 0, averageHRs: 0 }    // Games 18:00 and after
        },
        weekdayVsWeekend: {
          weekday: { games: 0, homeRuns: 0, averageHRs: 0 },
          weekend: { games: 0, homeRuns: 0, averageHRs: 0 }
        },
        hourlyDistribution: new Map()  // Track frequency of games by hour
      },
      trends: {
        bestMonth: null,
        worstMonth: null,
        bestDayOfWeek: null,
        bestGameHour: null,
        longestHRDrought: 0,
        mostHRsInGame: 0,
        mostHRsInGameDate: null,
        // Enhanced timing trends
        bestTimeSlot: null,
        dayVsNightPreference: null, // "day" or "night"
        weekdayVsWeekendPreference: null, // "weekday" or "weekend"
        peakHours: []  // Hours with highest HR averages
      },
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });
  }

  /**
   * Parse game timing information from date and dateTime
   */
  parseGameTiming(gameDate, dateTime) {
    const gameDateTime = dateTime ? new Date(dateTime) : new Date(gameDate + 'T19:00:00Z'); // Default to 7 PM if no time
    
    // Extract day of week
    const dayOfWeek = gameDateTime.getDay(); // 0 = Sunday, 6 = Saturday
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];
    
    // Extract hour in UTC (keeping it normalized as requested)
    const gameHour = gameDateTime.getUTCHours(); // 0-23 in UTC
    const gameMinute = gameDateTime.getUTCMinutes();
    
    // Create time string for display (HH:MM format)
    const timeString = `${gameHour.toString().padStart(2, '0')}:${gameMinute.toString().padStart(2, '0')}`;
    
    // Determine day vs night game (using standard baseball definitions)
    // Day games: typically before 17:00 (5 PM) UTC
    // Night games: typically 18:00 (6 PM) UTC and after
    const isDayGame = gameHour < 17;
    const isNightGame = gameHour >= 18;
    
    // Determine weekend vs weekday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    const isWeekday = !isWeekend;
    
    // Create combined time slot description with specific hour
    const weekdayType = isWeekend ? 'Weekend' : 'Weekday';
    const timeSlot = `${weekdayType} ${timeString}`;
    
    return {
      dayOfWeek,
      dayName,
      gameHour,
      gameMinute,
      timeString,
      isWeekend,
      isWeekday,
      isDayGame,
      isNightGame,
      timeSlot,
      utcDateTime: gameDateTime.toISOString()
    };
  }

  /**
   * Update timing-based statistics for a stadium
   */
  updateTimingStats(stadiumInfo, gameRecord) {
    const { timing, totalHRs } = gameRecord;
    const timingStats = stadiumInfo.timingStats;
    
    // Update day of week stats
    if (!timingStats.byDayOfWeek.has(timing.dayName)) {
      timingStats.byDayOfWeek.set(timing.dayName, { games: 0, homeRuns: 0 });
    }
    const dayStats = timingStats.byDayOfWeek.get(timing.dayName);
    dayStats.games++;
    dayStats.homeRuns += totalHRs;
    
    // Update game hour stats
    if (!timingStats.byGameHour.has(timing.gameHour)) {
      timingStats.byGameHour.set(timing.gameHour, { games: 0, homeRuns: 0 });
    }
    const hourStats = timingStats.byGameHour.get(timing.gameHour);
    hourStats.games++;
    hourStats.homeRuns += totalHRs;
    
    // Update hourly distribution (frequency tracking)
    if (!timingStats.hourlyDistribution.has(timing.gameHour)) {
      timingStats.hourlyDistribution.set(timing.gameHour, 0);
    }
    timingStats.hourlyDistribution.set(timing.gameHour, timingStats.hourlyDistribution.get(timing.gameHour) + 1);
    
    // Update time slot stats (weekday/weekend + specific hour)
    if (!timingStats.byTimeSlot.has(timing.timeSlot)) {
      timingStats.byTimeSlot.set(timing.timeSlot, { games: 0, homeRuns: 0 });
    }
    const slotStats = timingStats.byTimeSlot.get(timing.timeSlot);
    slotStats.games++;
    slotStats.homeRuns += totalHRs;
    
    // Update day vs night stats
    if (timing.isDayGame) {
      timingStats.dayVsNight.dayGames.games++;
      timingStats.dayVsNight.dayGames.homeRuns += totalHRs;
    }
    if (timing.isNightGame) {
      timingStats.dayVsNight.nightGames.games++;
      timingStats.dayVsNight.nightGames.homeRuns += totalHRs;
    }
    
    // Update weekday vs weekend stats
    if (timing.isWeekday) {
      timingStats.weekdayVsWeekend.weekday.games++;
      timingStats.weekdayVsWeekend.weekday.homeRuns += totalHRs;
    }
    if (timing.isWeekend) {
      timingStats.weekdayVsWeekend.weekend.games++;
      timingStats.weekdayVsWeekend.weekend.homeRuns += totalHRs;
    }
  }

  /**
   * Update team-specific statistics for a stadium
   */
  updateTeamStats(stadiumInfo, team, homeRuns, isHomeTeam) {
    if (!stadiumInfo.teamStats.has(team)) {
      stadiumInfo.teamStats.set(team, {
        team,
        gamesPlayed: 0,
        homeRuns: 0,
        homeGames: 0,
        awayGames: 0,
        homeHRs: 0,
        awayHRs: 0
      });
    }
    
    const teamStats = stadiumInfo.teamStats.get(team);
    teamStats.gamesPlayed++;
    teamStats.homeRuns += homeRuns;
    
    if (isHomeTeam) {
      teamStats.homeGames++;
      teamStats.homeHRs += homeRuns;
    } else {
      teamStats.awayGames++;
      teamStats.awayHRs += homeRuns;
    }
  }

  /**
   * Calculate advanced statistics and trends
   */
  calculateAdvancedStats() {
    console.log('📊 Calculating advanced statistics...');
    
    this.stadiumData.forEach((stadium, stadiumName) => {
      // Calculate averages
      stadium.averageHRsPerGame = stadium.totalGames > 0 
        ? (stadium.totalHomeRuns / stadium.totalGames).toFixed(2)
        : 0;
      
      // Calculate monthly trends
      const monthlyData = new Map();
      
      stadium.games.forEach(game => {
        const month = game.date.substring(0, 7); // YYYY-MM
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { games: 0, homeRuns: 0 });
        }
        const monthStats = monthlyData.get(month);
        monthStats.games++;
        monthStats.homeRuns += game.totalHRs;
      });
      
      // Find best and worst months
      let bestMonth = null;
      let worstMonth = null;
      let bestAvg = 0;
      let worstAvg = Infinity;
      
      monthlyData.forEach((data, month) => {
        const avg = data.homeRuns / data.games;
        if (avg > bestAvg) {
          bestAvg = avg;
          bestMonth = { month, ...data, average: avg.toFixed(2) };
        }
        if (avg < worstAvg) {
          worstAvg = avg;
          worstMonth = { month, ...data, average: avg.toFixed(2) };
        }
      });
      
      stadium.trends.bestMonth = bestMonth;
      stadium.trends.worstMonth = worstMonth;
      
      // Find most HRs in a single game
      let mostHRsInGame = 0;
      let mostHRsInGameDate = null;
      
      stadium.games.forEach(game => {
        if (game.totalHRs > mostHRsInGame) {
          mostHRsInGame = game.totalHRs;
          mostHRsInGameDate = game.date;
        }
      });
      
      stadium.trends.mostHRsInGame = mostHRsInGame;
      stadium.trends.mostHRsInGameDate = mostHRsInGameDate;
      
      // Calculate timing-based trends
      this.calculateTimingTrends(stadium);
      
      // Convert Maps to Objects for JSON serialization
      stadium.teamStats = Object.fromEntries(stadium.teamStats);
      stadium.monthlyStats = Object.fromEntries(monthlyData);
      
      // Convert timing stats Maps to Objects
      stadium.timingStats.byDayOfWeek = Object.fromEntries(stadium.timingStats.byDayOfWeek);
      stadium.timingStats.byGameHour = Object.fromEntries(stadium.timingStats.byGameHour);
      stadium.timingStats.byTimeSlot = Object.fromEntries(stadium.timingStats.byTimeSlot);
      stadium.timingStats.hourlyDistribution = Object.fromEntries(stadium.timingStats.hourlyDistribution);
      
      // Calculate averages for day/night and weekday/weekend
      const dayStats = stadium.timingStats.dayVsNight.dayGames;
      if (dayStats.games > 0) {
        dayStats.averageHRs = (dayStats.homeRuns / dayStats.games).toFixed(2);
      }
      
      const nightStats = stadium.timingStats.dayVsNight.nightGames;
      if (nightStats.games > 0) {
        nightStats.averageHRs = (nightStats.homeRuns / nightStats.games).toFixed(2);
      }
      
      const weekdayStats = stadium.timingStats.weekdayVsWeekend.weekday;
      if (weekdayStats.games > 0) {
        weekdayStats.averageHRs = (weekdayStats.homeRuns / weekdayStats.games).toFixed(2);
      }
      
      const weekendStats = stadium.timingStats.weekdayVsWeekend.weekend;
      if (weekendStats.games > 0) {
        weekendStats.averageHRs = (weekendStats.homeRuns / weekendStats.games).toFixed(2);
      }
      
      stadium.lastUpdated = new Date().toISOString();
    });
  }

  /**
   * Calculate timing-based trends for a stadium
   */
  calculateTimingTrends(stadium) {
    const timingStats = stadium.timingStats;
    
    // Find best day of week
    let bestDayOfWeek = null;
    let bestDayAvg = 0;
    
    timingStats.byDayOfWeek.forEach((stats, dayName) => {
      if (stats.games >= 3) { // Minimum games for meaningful average
        const avg = stats.homeRuns / stats.games;
        if (avg > bestDayAvg) {
          bestDayAvg = avg;
          bestDayOfWeek = {
            dayName,
            games: stats.games,
            homeRuns: stats.homeRuns,
            average: avg.toFixed(2)
          };
        }
      }
    });
    
    stadium.trends.bestDayOfWeek = bestDayOfWeek;
    
    // Find best game hour
    let bestGameHour = null;
    let bestHourAvg = 0;
    
    timingStats.byGameHour.forEach((stats, gameHour) => {
      if (stats.games >= 3) {
        const avg = stats.homeRuns / stats.games;
        if (avg > bestHourAvg) {
          bestHourAvg = avg;
          bestGameHour = {
            gameHour,
            timeString: `${gameHour.toString().padStart(2, '0')}:00`,
            games: stats.games,
            homeRuns: stats.homeRuns,
            average: avg.toFixed(2)
          };
        }
      }
    });
    
    stadium.trends.bestGameHour = bestGameHour;
    
    // Find peak hours (top 3 hours with best averages)
    const peakHours = [];
    timingStats.byGameHour.forEach((stats, gameHour) => {
      if (stats.games >= 2) { // Lower threshold for peak hours
        const avg = stats.homeRuns / stats.games;
        peakHours.push({
          gameHour,
          timeString: `${gameHour.toString().padStart(2, '0')}:00`,
          games: stats.games,
          homeRuns: stats.homeRuns,
          average: avg
        });
      }
    });
    
    // Sort by average and take top 3
    stadium.trends.peakHours = peakHours
      .sort((a, b) => b.average - a.average)
      .slice(0, 3)
      .map(hour => ({
        ...hour,
        average: hour.average.toFixed(2)
      }));
    
    // Find best time slot
    let bestTimeSlot = null;
    let bestSlotAvg = 0;
    
    timingStats.byTimeSlot.forEach((stats, timeSlot) => {
      if (stats.games >= 2) { // Lower threshold since time slots are more specific
        const avg = stats.homeRuns / stats.games;
        if (avg > bestSlotAvg) {
          bestSlotAvg = avg;
          bestTimeSlot = {
            timeSlot,
            games: stats.games,
            homeRuns: stats.homeRuns,
            average: avg.toFixed(2)
          };
        }
      }
    });
    
    stadium.trends.bestTimeSlot = bestTimeSlot;
    
    // Determine day vs night preference
    const dayAvg = timingStats.dayVsNight.dayGames.games > 0 
      ? timingStats.dayVsNight.dayGames.homeRuns / timingStats.dayVsNight.dayGames.games 
      : 0;
    const nightAvg = timingStats.dayVsNight.nightGames.games > 0 
      ? timingStats.dayVsNight.nightGames.homeRuns / timingStats.dayVsNight.nightGames.games 
      : 0;
    
    if (dayAvg > nightAvg && timingStats.dayVsNight.dayGames.games >= 3) {
      stadium.trends.dayVsNightPreference = {
        preference: 'day',
        dayAverage: dayAvg.toFixed(2),
        nightAverage: nightAvg.toFixed(2),
        difference: (dayAvg - nightAvg).toFixed(2)
      };
    } else if (nightAvg > dayAvg && timingStats.dayVsNight.nightGames.games >= 3) {
      stadium.trends.dayVsNightPreference = {
        preference: 'night',
        dayAverage: dayAvg.toFixed(2),
        nightAverage: nightAvg.toFixed(2),
        difference: (nightAvg - dayAvg).toFixed(2)
      };
    } else {
      stadium.trends.dayVsNightPreference = {
        preference: 'neutral',
        dayAverage: dayAvg.toFixed(2),
        nightAverage: nightAvg.toFixed(2),
        difference: '0.00'
      };
    }
    
    // Determine weekday vs weekend preference
    const weekdayAvg = timingStats.weekdayVsWeekend.weekday.games > 0 
      ? timingStats.weekdayVsWeekend.weekday.homeRuns / timingStats.weekdayVsWeekend.weekday.games 
      : 0;
    const weekendAvg = timingStats.weekdayVsWeekend.weekend.games > 0 
      ? timingStats.weekdayVsWeekend.weekend.homeRuns / timingStats.weekdayVsWeekend.weekend.games 
      : 0;
    
    if (weekdayAvg > weekendAvg && timingStats.weekdayVsWeekend.weekday.games >= 3) {
      stadium.trends.weekdayVsWeekendPreference = {
        preference: 'weekday',
        weekdayAverage: weekdayAvg.toFixed(2),
        weekendAverage: weekendAvg.toFixed(2),
        difference: (weekdayAvg - weekendAvg).toFixed(2)
      };
    } else if (weekendAvg > weekdayAvg && timingStats.weekdayVsWeekend.weekend.games >= 3) {
      stadium.trends.weekdayVsWeekendPreference = {
        preference: 'weekend',
        weekdayAverage: weekdayAvg.toFixed(2),
        weekendAverage: weekendAvg.toFixed(2),
        difference: (weekendAvg - weekdayAvg).toFixed(2)
      };
    } else {
      stadium.trends.weekdayVsWeekendPreference = {
        preference: 'neutral',
        weekdayAverage: weekdayAvg.toFixed(2),
        weekendAverage: weekendAvg.toFixed(2),
        difference: '0.00'
      };
    }
  }

  /**
   * Save results to JSON file
   */
  async saveResults() {
    try {
      console.log('💾 Calculating advanced statistics and saving results...');
      
      // Calculate advanced stats before saving
      this.calculateAdvancedStats();
      
      // Create backup of existing file
      if (fs.existsSync(OUTPUT_FILE)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(BACKUP_DIR, `stadium_hr_analysis_backup_${timestamp}.json`);
        fs.copyFileSync(OUTPUT_FILE, backupFile);
        console.log(`📋 Created backup: ${backupFile}`);
      }
      
      // Convert Map to Object for JSON serialization
      const stadiumsObject = Object.fromEntries(this.stadiumData);
      
      // Create comprehensive output
      const output = {
        metadata: {
          version: "1.0.0",
          generatedAt: new Date().toISOString(),
          totalStadiums: this.stadiumData.size,
          totalFilesProcessed: this.totalFilesProcessed,
          totalGamesProcessed: this.totalGamesProcessed,
          totalHomeRunsTracked: this.totalHomeRunsTracked,
          errors: this.errors
        },
        summary: this.generateSummary(),
        stadiums: stadiumsObject,
        processedFiles: Array.from(this.processedFiles)
      };
      
      // Ensure output directory exists
      this.ensureDirectoryExists(path.dirname(OUTPUT_FILE));
      
      // Write to file
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
      console.log(`✅ Results saved to: ${OUTPUT_FILE}`);
      
    } catch (error) {
      console.error('❌ Error saving results:', error);
      throw error;
    }
  }

  /**
   * Generate summary statistics
   */
  generateSummary() {
    const stadiums = Array.from(this.stadiumData.values());
    
    const summary = {
      totalStadiums: stadiums.length,
      totalGames: stadiums.reduce((sum, s) => sum + s.totalGames, 0),
      totalHomeRuns: stadiums.reduce((sum, s) => sum + s.totalHomeRuns, 0),
      averageHRsPerStadium: stadiums.length > 0 
        ? (stadiums.reduce((sum, s) => sum + s.totalHomeRuns, 0) / stadiums.length).toFixed(2)
        : 0,
      
      topStadiumsByTotalHRs: stadiums
        .sort((a, b) => b.totalHomeRuns - a.totalHomeRuns)
        .slice(0, 10)
        .map(s => ({
          name: s.name,
          homeTeam: s.homeTeam,
          totalHomeRuns: s.totalHomeRuns,
          totalGames: s.totalGames,
          averagePerGame: s.averageHRsPerGame
        })),
        
      topStadiumsByAverage: stadiums
        .filter(s => s.totalGames >= 5) // Minimum games for meaningful average
        .sort((a, b) => parseFloat(b.averageHRsPerGame) - parseFloat(a.averageHRsPerGame))
        .slice(0, 10)
        .map(s => ({
          name: s.name,
          homeTeam: s.homeTeam,
          averagePerGame: s.averageHRsPerGame,
          totalGames: s.totalGames,
          totalHomeRuns: s.totalHomeRuns
        })),
        
      homeVsAwayAnalysis: {
        totalHomeTeamHRs: stadiums.reduce((sum, s) => sum + s.homeTeamHomeRuns, 0),
        totalAwayTeamHRs: stadiums.reduce((sum, s) => sum + s.awayTeamHomeRuns, 0),
        homeAdvantage: stadiums.reduce((sum, s) => sum + s.homeTeamHomeRuns, 0) > 
                      stadiums.reduce((sum, s) => sum + s.awayTeamHomeRuns, 0)
      }
    };
    
    return summary;
  }

  /**
   * Generate and display summary report
   */
  generateSummaryReport() {
    const summary = this.generateSummary();
    
    console.log('\n📊 STADIUM HOME RUN ANALYSIS SUMMARY');
    console.log('=====================================');
    console.log(`🏟️  Total Stadiums: ${summary.totalStadiums}`);
    console.log(`⚾ Total Games Processed: ${summary.totalGames}`);
    console.log(`🚀 Total Home Runs Tracked: ${summary.totalHomeRuns}`);
    console.log(`📈 Average HRs per Stadium: ${summary.averageHRsPerStadium}`);
    console.log(`📄 Files Processed: ${this.totalFilesProcessed}`);
    console.log(`❌ Errors Encountered: ${this.errors.length}`);
    
    console.log('\n🏆 TOP 5 STADIUMS BY TOTAL HOME RUNS:');
    summary.topStadiumsByTotalHRs.slice(0, 5).forEach((stadium, index) => {
      console.log(`${index + 1}. ${stadium.name} (${stadium.homeTeam}): ${stadium.totalHomeRuns} HRs in ${stadium.totalGames} games`);
    });
    
    console.log('\n📊 TOP 5 STADIUMS BY HR AVERAGE:');
    summary.topStadiumsByAverage.slice(0, 5).forEach((stadium, index) => {
      console.log(`${index + 1}. ${stadium.name} (${stadium.homeTeam}): ${stadium.averagePerGame} HRs/game (${stadium.totalGames} games)`);
    });
    
    console.log('\n🏠 HOME VS AWAY ANALYSIS:');
    console.log(`Home Team HRs: ${summary.homeVsAwayAnalysis.totalHomeTeamHRs}`);
    console.log(`Away Team HRs: ${summary.homeVsAwayAnalysis.totalAwayTeamHRs}`);
    console.log(`Home Advantage: ${summary.homeVsAwayAnalysis.homeAdvantage ? 'YES' : 'NO'}`);
    
    if (this.errors.length > 0) {
      console.log('\n⚠️  ERRORS SUMMARY:');
      const errorTypes = {};
      this.errors.forEach(error => {
        errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;
      });
      Object.entries(errorTypes).forEach(([type, count]) => {
        console.log(`${type}: ${count}`);
      });
    }
    
    console.log('\n✅ Analysis Complete!');
  }

  /**
   * Utility functions
   */
  parseGameDate(monthName, day, year) {
    const months = {
      'january': '01', 'february': '02', 'march': '03', 'april': '04',
      'may': '05', 'june': '06', 'july': '07', 'august': '08',
      'september': '09', 'october': '10', 'november': '11', 'december': '12'
    };
    
    const monthNum = months[monthName.toLowerCase()] || '01';
    const dayPadded = day.padStart(2, '0');
    
    return `${year}-${monthNum}-${dayPadded}`;
  }

  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}

/**
 * Main execution function
 */
async function generateStadiumHRAnalysis(forceRebuild = false) {
  const tracker = new StadiumHRTracker();
  return await tracker.execute(forceRebuild);
}

/**
 * CLI execution
 */
if (require.main === module) {
  const forceRebuild = process.argv.includes('--force') || process.argv.includes('-f');
  
  console.log('🚀 Starting Stadium Home Run Tracker...');
  if (forceRebuild) {
    console.log('🔄 Force rebuild enabled - will reprocess all files');
  }
  
  generateStadiumHRAnalysis(forceRebuild)
    .then(success => {
      if (success) {
        console.log('🎉 Stadium HR Analysis completed successfully!');
        process.exit(0);
      } else {
        console.log('❌ Stadium HR Analysis completed with errors');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Critical error:', error);
      process.exit(1);
    });
}

module.exports = {
  StadiumHRTracker,
  generateStadiumHRAnalysis
};