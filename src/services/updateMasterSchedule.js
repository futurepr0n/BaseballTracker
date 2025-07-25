/**
 * Daily Master Schedule Updater
 * 
 * Automatically maintains the master schedule by:
 * 1. Adding new game dates when data is processed
 * 2. Syncing with MLB API for schedule changes
 * 3. Handling postponements and rescheduled games
 */

const fs = require('fs').promises;
const path = require('path');
const MasterScheduleGenerator = require('./generateMasterSchedule');

class MasterScheduleUpdater {
  constructor() {
    this.generator = new MasterScheduleGenerator();
    this.currentYear = new Date().getFullYear();
  }

  /**
   * Check if a specific date has actual game data
   */
  async checkDataExists(dateString) {
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      
      const filename = `month_${day.toString().padStart(2, '0')}_${year}.json`;
      const filePath = path.join(__dirname, '../../public/data', year.toString(), month.toString(), filename);
      
      await fs.access(filePath);
      
      // File exists, but let's also check if it has actual game data
      const data = await fs.readFile(filePath, 'utf8');
      const gameData = JSON.parse(data);
      
      // Check if there are actual players (indicating games were played)
      const hasPlayers = gameData.players && Array.isArray(gameData.players) && gameData.players.length > 0;
      
      if (hasPlayers) {
        console.log(`✅ Confirmed game data exists for ${dateString}`);
        return true;
      } else {
        console.log(`⚠️ Data file exists for ${dateString} but contains no players`);
        return false;
      }
    } catch (error) {
      console.log(`❌ No game data found for ${dateString}`);
      return false;
    }
  }

  /**
   * Update master schedule with a new game date
   */
  async addGameDate(dateString) {
    try {
      const currentSchedule = await this.generator.loadMasterSchedule();
      
      if (currentSchedule.includes(dateString)) {
        console.log(`📅 Date ${dateString} already in master schedule`);
        return false;
      }
      
      console.log(`📅 Adding new game date to master schedule: ${dateString}`);
      
      // Add new date and sort
      const updatedSchedule = [...currentSchedule, dateString].sort();
      
      // Save updated schedule
      await this.generator.saveMasterSchedule(updatedSchedule);
      
      return true;
    } catch (error) {
      console.error(`❌ Error adding game date ${dateString}:`, error);
      return false;
    }
  }

  /**
   * Remove a game date from master schedule (for postponements)
   */
  async removeGameDate(dateString) {
    try {
      const currentSchedule = await this.generator.loadMasterSchedule();
      
      if (!currentSchedule.includes(dateString)) {
        console.log(`📅 Date ${dateString} not in master schedule`);
        return false;
      }
      
      console.log(`📅 Removing game date from master schedule: ${dateString}`);
      
      // Remove date
      const updatedSchedule = currentSchedule.filter(date => date !== dateString);
      
      // Save updated schedule
      await this.generator.saveMasterSchedule(updatedSchedule);
      
      return true;
    } catch (error) {
      console.error(`❌ Error removing game date ${dateString}:`, error);
      return false;
    }
  }

  /**
   * Sync master schedule with MLB API for recent changes
   */
  async syncRecentChanges(daysBack = 7) {
    try {
      console.log(`🔄 Syncing master schedule with MLB API (last ${daysBack} days)...`);
      
      const today = new Date();
      const startDate = new Date(today.getTime() - (daysBack * 24 * 60 * 60 * 1000));
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = today.toISOString().split('T')[0];
      
      const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&startDate=${startDateStr}&endDate=${endDateStr}&gameType=R,P,W`;
      
      const response = await fetch(scheduleUrl);
      if (!response.ok) {
        console.warn(`⚠️ MLB API sync failed: ${response.status} ${response.statusText}`);
        return false;
      }
      
      const scheduleData = await response.json();
      const apiGameDates = new Set();
      
      if (scheduleData.dates && Array.isArray(scheduleData.dates)) {
        for (const dateEntry of scheduleData.dates) {
          if (dateEntry.games && dateEntry.games.length > 0) {
            apiGameDates.add(dateEntry.date);
          }
        }
      }
      
      // Check for new dates in API that we don't have
      let changeseMade = false;
      const currentSchedule = await this.generator.loadMasterSchedule();
      
      for (const apiDate of apiGameDates) {
        if (!currentSchedule.includes(apiDate)) {
          console.log(`📅 API shows new game date: ${apiDate}`);
          await this.addGameDate(apiDate);
          changeseMade = true;
        }
      }
      
      console.log(changeseMade ? '✅ Master schedule updated from API sync' : '📅 Master schedule in sync with API');
      return changeseMade;
    } catch (error) {
      console.error('❌ Error syncing with MLB API:', error);
      return false;
    }
  }

  /**
   * Process daily update - main entry point for daily workflow
   */
  async processDailyUpdate(dateString) {
    try {
      console.log(`🏟️ Processing daily master schedule update for ${dateString}...`);
      
      // Check if this date has actual game data
      const hasData = await this.checkDataExists(dateString);
      
      if (hasData) {
        // Add to master schedule if not already present
        const added = await this.addGameDate(dateString);
        
        if (added) {
          console.log(`✅ Added ${dateString} to master schedule`);
        }
      } else {
        console.log(`ℹ️ No game data for ${dateString}, not adding to schedule`);
      }
      
      // Sync with API for any recent changes (every few days)
      const today = new Date().getDate();
      if (today % 3 === 0) { // Every 3 days
        await this.syncRecentChanges();
      }
      
      // Display current schedule stats
      const currentSchedule = await this.generator.loadMasterSchedule();
      console.log(`📊 Master schedule now contains ${currentSchedule.length} game dates`);
      
      return true;
    } catch (error) {
      console.error(`❌ Error processing daily update for ${dateString}:`, error);
      return false;
    }
  }

  /**
   * Validate master schedule integrity
   */
  async validateSchedule() {
    try {
      console.log('🔍 Validating master schedule integrity...');
      
      const schedule = await this.generator.loadMasterSchedule();
      const issues = [];
      
      // Check for duplicates
      const uniqueDates = new Set(schedule);
      if (uniqueDates.size !== schedule.length) {
        issues.push(`Found ${schedule.length - uniqueDates.size} duplicate dates`);
      }
      
      // Check chronological order
      const sortedSchedule = [...schedule].sort();
      const isOrdered = JSON.stringify(schedule) === JSON.stringify(sortedSchedule);
      if (!isOrdered) {
        issues.push('Schedule is not in chronological order');
      }
      
      // Check for valid date formats
      const invalidDates = schedule.filter(date => !/^\d{4}-\d{2}-\d{2}$/.test(date));
      if (invalidDates.length > 0) {
        issues.push(`Found ${invalidDates.length} invalid date formats: ${invalidDates.slice(0, 5).join(', ')}`);
      }
      
      // Check date range reasonableness
      const currentYear = new Date().getFullYear();
      const wrongYearDates = schedule.filter(date => !date.startsWith(currentYear.toString()));
      if (wrongYearDates.length > 0) {
        issues.push(`Found ${wrongYearDates.length} dates from wrong year: ${wrongYearDates.slice(0, 5).join(', ')}`);
      }
      
      if (issues.length === 0) {
        console.log('✅ Master schedule validation passed');
        return true;
      } else {
        console.warn('⚠️ Master schedule validation issues:');
        issues.forEach(issue => console.warn(`  - ${issue}`));
        return false;
      }
    } catch (error) {
      console.error('❌ Error validating schedule:', error);
      return false;
    }
  }

  /**
   * Clean and repair master schedule
   */
  async repairSchedule() {
    try {
      console.log('🔧 Repairing master schedule...');
      
      const schedule = await this.generator.loadMasterSchedule();
      
      // Remove duplicates and sort
      const cleanSchedule = [...new Set(schedule)]
        .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)) // Valid format
        .filter(date => date.startsWith(this.currentYear.toString())) // Current year
        .sort();
      
      if (cleanSchedule.length !== schedule.length) {
        console.log(`🔧 Cleaned ${schedule.length - cleanSchedule.length} problematic entries`);
        await this.generator.saveMasterSchedule(cleanSchedule);
        console.log('✅ Master schedule repaired');
      } else {
        console.log('✅ Master schedule was already clean');
      }
      
      return cleanSchedule;
    } catch (error) {
      console.error('❌ Error repairing schedule:', error);
      throw error;
    }
  }
}

// CLI usage
if (require.main === module) {
  const updater = new MasterScheduleUpdater();
  
  const command = process.argv[2] || 'update';
  const dateArg = process.argv[3] || new Date().toISOString().split('T')[0];
  
  switch (command) {
    case 'update':
      updater.processDailyUpdate(dateArg)
        .then(success => {
          console.log(success ? '✅ Daily update completed' : '❌ Daily update failed');
          process.exit(success ? 0 : 1);
        });
      break;
      
    case 'add':
      updater.addGameDate(dateArg)
        .then(added => {
          console.log(added ? `✅ Added ${dateArg}` : `ℹ️ ${dateArg} already in schedule`);
          process.exit(0);
        });
      break;
      
    case 'remove':
      updater.removeGameDate(dateArg)
        .then(removed => {
          console.log(removed ? `✅ Removed ${dateArg}` : `ℹ️ ${dateArg} not in schedule`);
          process.exit(0);
        });
      break;
      
    case 'sync':
      updater.syncRecentChanges()
        .then(changed => {
          console.log(changed ? '✅ Schedule updated from API' : '📅 Schedule already current');
          process.exit(0);
        });
      break;
      
    case 'validate':
      updater.validateSchedule()
        .then(valid => {
          process.exit(valid ? 0 : 1);
        });
      break;
      
    case 'repair':
      updater.repairSchedule()
        .then(() => {
          console.log('✅ Schedule repair completed');
          process.exit(0);
        });
      break;
      
    default:
      console.log('Usage: node updateMasterSchedule.js [update|add|remove|sync|validate|repair] [date]');
      process.exit(1);
  }
}

module.exports = MasterScheduleUpdater;