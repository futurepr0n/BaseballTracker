/**
 * Master Schedule Generator
 * 
 * Creates and maintains the authoritative list of MLB game dates for the season.
 * This eliminates wasted requests and ensures complete coverage of all actual game days.
 */

const fs = require('fs').promises;
const path = require('path');

class MasterScheduleGenerator {
  constructor() {
    this.currentYear = new Date().getFullYear();
    this.scheduleFilePath = path.join(__dirname, '../../public/data', `season_game_dates_${this.currentYear}.json`);
    this.backupFilePath = path.join(__dirname, '../../public/data', `season_game_dates_${this.currentYear}_backup.json`);
  }

  /**
   * Generate complete season schedule from MLB API
   */
  async generateFullSeasonSchedule() {
    try {
      console.log(`🏟️ Generating master schedule for ${this.currentYear} season...`);
      
      // Fetch full season schedule from MLB API
      const startDate = `${this.currentYear}-03-01`; // Start from March to catch spring training/early games
      const endDate = `${this.currentYear}-11-30`;   // End in November to catch World Series
      
      const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&startDate=${startDate}&endDate=${endDate}&gameType=R,P,W`; // Regular, Playoff, World Series
      
      console.log(`📡 Fetching schedule from MLB API: ${scheduleUrl}`);
      const response = await fetch(scheduleUrl);
      
      if (!response.ok) {
        throw new Error(`MLB API failed: ${response.status} ${response.statusText}`);
      }
      
      const scheduleData = await response.json();
      
      // Extract unique game dates
      const gameDates = new Set();
      
      if (scheduleData.dates && Array.isArray(scheduleData.dates)) {
        for (const dateEntry of scheduleData.dates) {
          if (dateEntry.games && dateEntry.games.length > 0) {
            // Only include dates that actually have games
            gameDates.add(dateEntry.date);
          }
        }
      }
      
      // Convert to sorted array
      const sortedGameDates = Array.from(gameDates).sort();
      
      console.log(`📅 Found ${sortedGameDates.length} game dates for ${this.currentYear} season`);
      console.log(`📅 Season range: ${sortedGameDates[0]} to ${sortedGameDates[sortedGameDates.length - 1]}`);
      
      // Save master schedule
      await this.saveMasterSchedule(sortedGameDates);
      
      return sortedGameDates;
    } catch (error) {
      console.error('❌ Error generating master schedule:', error);
      
      // Try to generate from existing data as fallback
      console.log('🔄 Attempting to generate schedule from existing data files...');
      return await this.generateFromExistingData();
    }
  }

  /**
   * Generate schedule from existing data files (fallback method)
   */
  async generateFromExistingData() {
    try {
      const dataDir = path.join(__dirname, '../../public/data', this.currentYear.toString());
      const gameDates = new Set();
      
      // Check if year directory exists
      try {
        await fs.access(dataDir);
      } catch {
        console.log(`📁 No data directory found for ${this.currentYear}, creating empty schedule`);
        return [];
      }
      
      // Scan through month directories
      const months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
      
      for (const month of months) {
        const monthDir = path.join(dataDir, month);
        
        try {
          const files = await fs.readdir(monthDir);
          
          for (const file of files) {
            if (file.match(/month_\d{2}_\d{4}\.json$/)) {
              // Extract date from filename: month_DD_YYYY.json
              const match = file.match(/month_(\d{2})_(\d{4})\.json$/);
              if (match) {
                const day = match[1];
                const year = match[2];
                const gameDate = `${year}-${month.padStart(2, '0')}-${day}`;
                gameDates.add(gameDate);
              }
            }
          }
        } catch (error) {
          // Month directory doesn't exist, skip
          continue;
        }
      }
      
      const sortedGameDates = Array.from(gameDates).sort();
      
      console.log(`📅 Generated schedule from existing data: ${sortedGameDates.length} game dates`);
      
      if (sortedGameDates.length > 0) {
        await this.saveMasterSchedule(sortedGameDates);
      }
      
      return sortedGameDates;
    } catch (error) {
      console.error('❌ Error generating schedule from existing data:', error);
      return [];
    }
  }

  /**
   * Save master schedule to file
   */
  async saveMasterSchedule(gameDates) {
    try {
      // Create backup if file exists
      try {
        await fs.access(this.scheduleFilePath);
        await fs.copyFile(this.scheduleFilePath, this.backupFilePath);
        console.log('💾 Created backup of existing schedule');
      } catch {
        // No existing file, no backup needed
      }
      
      // Ensure directory exists
      const dir = path.dirname(this.scheduleFilePath);
      await fs.mkdir(dir, { recursive: true });
      
      const scheduleData = {
        generated: new Date().toISOString(),
        year: this.currentYear,
        gameCount: gameDates.length,
        firstGame: gameDates[0] || null,
        lastGame: gameDates[gameDates.length - 1] || null,
        gameDates: gameDates
      };
      
      await fs.writeFile(this.scheduleFilePath, JSON.stringify(scheduleData, null, 2));
      
      console.log(`✅ Master schedule saved: ${this.scheduleFilePath}`);
      console.log(`📊 Schedule contains ${gameDates.length} game dates`);
      
    } catch (error) {
      console.error('❌ Error saving master schedule:', error);
      throw error;
    }
  }

  /**
   * Load existing master schedule
   */
  async loadMasterSchedule() {
    try {
      const data = await fs.readFile(this.scheduleFilePath, 'utf8');
      const scheduleData = JSON.parse(data);
      return scheduleData.gameDates || [];
    } catch (error) {
      console.warn('⚠️ Could not load master schedule:', error.message);
      return [];
    }
  }

  /**
   * Check if schedule file exists and is current
   */
  async isScheduleCurrent() {
    try {
      const data = await fs.readFile(this.scheduleFilePath, 'utf8');
      const scheduleData = JSON.parse(data);
      
      // Check if it's for the current year
      if (scheduleData.year !== this.currentYear) {
        return false;
      }
      
      // Check if it was generated recently (within last 7 days)
      const generated = new Date(scheduleData.generated);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      return generated > weekAgo;
    } catch {
      return false;
    }
  }

  /**
   * Get game dates up to a specific date (for filtering)
   */
  async getGameDatesUpTo(targetDate) {
    const allGameDates = await this.loadMasterSchedule();
    return allGameDates.filter(date => date <= targetDate);
  }

  /**
   * Main entry point - generate or load schedule as needed
   */
  async ensureMasterSchedule() {
    if (await this.isScheduleCurrent()) {
      console.log('✅ Master schedule is current, loading existing schedule');
      return await this.loadMasterSchedule();
    } else {
      console.log('🔄 Master schedule needs update, generating new schedule');
      return await this.generateFullSeasonSchedule();
    }
  }
}

// CLI usage
if (require.main === module) {
  const generator = new MasterScheduleGenerator();
  
  const command = process.argv[2] || 'ensure';
  
  switch (command) {
    case 'generate':
      generator.generateFullSeasonSchedule()
        .then(dates => {
          console.log(`🎉 Generated master schedule with ${dates.length} game dates`);
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Failed to generate schedule:', error);
          process.exit(1);
        });
      break;
      
    case 'load':
      generator.loadMasterSchedule()
        .then(dates => {
          console.log(`📅 Loaded ${dates.length} game dates from master schedule`);
          console.log('First 10 dates:', dates.slice(0, 10));
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Failed to load schedule:', error);
          process.exit(1);
        });
      break;
      
    case 'ensure':
    default:
      generator.ensureMasterSchedule()
        .then(dates => {
          console.log(`✅ Master schedule ready with ${dates.length} game dates`);
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Failed to ensure schedule:', error);
          process.exit(1);
        });
      break;
  }
}

module.exports = MasterScheduleGenerator;