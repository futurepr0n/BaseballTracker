#!/usr/bin/env node

/**
 * Systematic Duplicate Fixer
 * 
 * Fixes the massive duplicate issue identified by comprehensive detection.
 * Addresses 496 player duplicates and 18 games appearing on multiple dates.
 */

const fs = require('fs').promises;
const path = require('path');

class SystematicDuplicateFixer {
  constructor() {
    this.fixedFiles = new Set();
    this.removedDuplicates = [];
    this.backupDir = `backups/systematic_fix_${new Date().toISOString().slice(0, 10)}`;
  }

  async fixAllDuplicates() {
    console.log('🔧 SYSTEMATIC DUPLICATE FIXING');
    console.log('===============================\n');

    // Create backup directory
    await this.createBackups();

    // Load the comprehensive duplicate report
    const reportPath = await this.findLatestReport();
    const duplicateReport = JSON.parse(await fs.readFile(reportPath, 'utf8'));

    console.log(`📋 Loaded duplicate report: ${path.basename(reportPath)}`);
    console.log(`📊 Found ${duplicateReport.duplicates.length} duplicates to fix\n`);

    // Group duplicates by gameId for systematic fixing
    const gameIdGroups = this.groupDuplicatesByGameId(duplicateReport.duplicates);

    // Fix each game's duplicates
    for (const [gameId, gameDuplicates] of gameIdGroups.entries()) {
      await this.fixGameDuplicates(gameId, gameDuplicates);
    }

    // Generate fix report
    return this.generateFixReport();
  }

  async createBackups() {
    console.log(`💾 Creating backup directory: ${this.backupDir}`);
    await fs.mkdir(this.backupDir, { recursive: true });
    
    // Backup all July files (where most duplicates are)
    const julyDir = 'public/data/2025/july';
    const julyBackupDir = path.join(this.backupDir, 'july');
    await fs.mkdir(julyBackupDir, { recursive: true });

    const julyFiles = await fs.readdir(julyDir);
    for (const file of julyFiles.filter(f => f.endsWith('.json'))) {
      const srcPath = path.join(julyDir, file);
      const destPath = path.join(julyBackupDir, file);
      await fs.copyFile(srcPath, destPath);
    }

    // Also backup May files (second most affected)
    const mayDir = 'public/data/2025/may';
    const mayBackupDir = path.join(this.backupDir, 'may');
    await fs.mkdir(mayBackupDir, { recursive: true });

    const mayFiles = await fs.readdir(mayDir);
    for (const file of mayFiles.filter(f => f.endsWith('.json'))) {
      const srcPath = path.join(mayDir, file);
      const destPath = path.join(mayBackupDir, file);
      await fs.copyFile(srcPath, destPath);
    }

    console.log('   ✅ Backups created successfully\n');
  }

  async findLatestReport() {
    const reportDir = 'scripts/data-validation';
    const files = await fs.readdir(reportDir);
    const reportFiles = files.filter(f => f.startsWith('comprehensive_duplicate_report_')).sort().reverse();
    
    if (reportFiles.length === 0) {
      throw new Error('No comprehensive duplicate report found. Run comprehensiveDuplicateDetector.js first.');
    }

    return path.join(reportDir, reportFiles[0]);
  }

  groupDuplicatesByGameId(duplicates) {
    const gameIdGroups = new Map();

    for (const duplicate of duplicates) {
      const gameId = duplicate.gameId;
      if (!gameIdGroups.has(gameId)) {
        gameIdGroups.set(gameId, []);
      }
      gameIdGroups.get(gameId).push(duplicate);
    }

    return gameIdGroups;
  }

  async fixGameDuplicates(gameId, gameDuplicates) {
    console.log(`🎮 Fixing GameId ${gameId}...`);
    
    // Get all unique dates for this game
    const dates = [...new Set(gameDuplicates.flatMap(d => 
      d.occurrences.map(o => o.date)
    ))];

    console.log(`   📅 Game appears on: ${dates.join(', ')}`);

    // Determine the correct date (earliest occurrence as primary)
    const correctDate = dates.sort()[0];
    const incorrectDates = dates.slice(1);

    console.log(`   ✅ Keeping game on: ${correctDate}`);
    console.log(`   ❌ Removing from: ${incorrectDates.join(', ')}`);

    // Remove duplicates from incorrect dates
    for (const incorrectDate of incorrectDates) {
      await this.removeDuplicateFromDate(gameId, incorrectDate, gameDuplicates);
    }

    console.log(`   ✅ Fixed GameId ${gameId}\n`);
  }

  async removeDuplicateFromDate(gameId, date, gameDuplicates) {
    // Find the file for this date
    const filePath = await this.findFileForDate(date);
    if (!filePath) {
      console.warn(`   ⚠️  File not found for date: ${date}`);
      return;
    }

    console.log(`   🔧 Processing file: ${path.basename(filePath)}`);

    // Load file data
    const fileContent = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContent);

    // Remove players with this gameId
    const originalPlayerCount = data.players ? data.players.length : 0;
    let removedPlayers = [];

    if (data.players) {
      const keptPlayers = [];
      for (const player of data.players) {
        if (player.gameId === gameId) {
          removedPlayers.push({
            name: player.name,
            team: player.team,
            hits: parseInt(player.H) || 0,
            gameId: gameId
          });
        } else {
          keptPlayers.push(player);
        }
      }
      data.players = keptPlayers;
    }

    // Remove game from games array if it exists
    let removedFromGamesArray = false;
    if (data.games) {
      const originalGamesCount = data.games.length;
      data.games = data.games.filter(game => 
        game.gameId !== gameId && game.originalId !== gameId
      );
      removedFromGamesArray = data.games.length < originalGamesCount;
    }

    // Save the cleaned file
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    // Track the fix
    this.removedDuplicates.push({
      gameId,
      date,
      file: filePath,
      removedPlayers,
      removedFromGamesArray,
      impact: `Removed ${removedPlayers.length} player entries`
    });

    console.log(`     - Removed ${removedPlayers.length} player entries`);
    if (removedFromGamesArray) {
      console.log(`     - Removed game from games array`);
    }

    this.fixedFiles.add(filePath);
  }

  async findFileForDate(date) {
    // Convert date format (e.g., "july_11_2025" to find the file)
    const dateParts = date.split('_');
    if (dateParts.length !== 3) return null;

    const [month, day, year] = dateParts;
    const filePath = `public/data/${year}/${month}/${date}.json`;

    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      return null;
    }
  }

  generateFixReport() {
    console.log('📋 SYSTEMATIC DUPLICATE FIX REPORT');
    console.log('===================================\n');

    console.log(`✅ Files processed: ${this.fixedFiles.size}`);
    console.log(`🔧 Duplicates removed: ${this.removedDuplicates.length}`);
    console.log(`💾 Backup location: ${this.backupDir}\n`);

    // Group removals by player for impact analysis
    const playerImpact = new Map();
    let totalHitsRemoved = 0;

    for (const removal of this.removedDuplicates) {
      for (const player of removal.removedPlayers) {
        const key = `${player.name}_${player.team}`;
        if (!playerImpact.has(key)) {
          playerImpact.set(key, { games: 0, hits: 0, gameIds: [] });
        }
        const impact = playerImpact.get(key);
        impact.games++;
        impact.hits += player.hits;
        impact.gameIds.push(player.gameId);
        totalHitsRemoved += player.hits;
      }
    }

    console.log('👤 PLAYER IMPACT SUMMARY:');
    const sortedPlayers = Array.from(playerImpact.entries())
      .sort((a, b) => b[1].hits - a[1].hits)
      .slice(0, 10);

    for (const [player, impact] of sortedPlayers) {
      console.log(`   ${player}: -${impact.hits} hits (${impact.games} duplicate games)`);
    }

    // Focus on Cody Bellinger
    const bellingerImpact = playerImpact.get('C. Bellinger_NYY');
    console.log('\n🎯 CODY BELLINGER IMPACT:');
    if (bellingerImpact) {
      console.log(`   Duplicate games removed: ${bellingerImpact.games}`);
      console.log(`   Hits reduced by: ${bellingerImpact.hits}`);
      console.log(`   Affected GameIds: ${bellingerImpact.gameIds.join(', ')}`);
      console.log(`   Expected new total: 99 - ${bellingerImpact.hits} = ${99 - bellingerImpact.hits} hits`);
    } else {
      console.log('   ❌ No duplicates found for Cody Bellinger');
    }

    console.log(`\n📊 TOTAL IMPACT:`);
    console.log(`   Total hits removed from dataset: ${totalHitsRemoved}`);
    console.log(`   Players affected: ${playerImpact.size}`);

    return {
      fixedFiles: Array.from(this.fixedFiles),
      removedDuplicates: this.removedDuplicates,
      playerImpact: Object.fromEntries(playerImpact),
      summary: {
        filesProcessed: this.fixedFiles.size,
        duplicatesRemoved: this.removedDuplicates.length,
        totalHitsRemoved,
        playersAffected: playerImpact.size
      }
    };
  }
}

// Main execution
async function main() {
  try {
    const fixer = new SystematicDuplicateFixer();
    const report = await fixer.fixAllDuplicates();
    
    // Save fix report
    const reportPath = `scripts/data-validation/systematic_fix_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Fix report saved to: ${reportPath}`);
    console.log('\n🎉 Systematic duplicate fixing completed!');
    console.log('\n🔄 NEXT STEPS:');
    console.log('   1. Run ./generate_rolling_stats.sh to update statistics');
    console.log('   2. Verify Cody Bellinger\'s hit total in milestone tracking');
    console.log('   3. Test the application to ensure data integrity');
    
    return report;
  } catch (error) {
    console.error('❌ Error during systematic duplicate fixing:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SystematicDuplicateFixer };