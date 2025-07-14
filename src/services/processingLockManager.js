/**
 * Processing Lock Manager
 * 
 * Prevents concurrent processing of the same CSV files to avoid duplicates
 * during simultaneous data processing operations.
 */

const fs = require('fs');
const path = require('path');

const LOCK_DIR = 'scripts/data-validation/locks';
const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/**
 * Acquire processing lock for a CSV file
 * @param {string} csvFilePath - Path to CSV file
 * @returns {Promise<boolean>} True if lock acquired, false if already locked
 */
async function acquireProcessingLock(csvFilePath) {
  try {
    // Ensure lock directory exists
    if (!fs.existsSync(LOCK_DIR)) {
      fs.mkdirSync(LOCK_DIR, { recursive: true });
    }
    
    const lockFileName = path.basename(csvFilePath) + '.lock';
    const lockFilePath = path.join(LOCK_DIR, lockFileName);
    
    // Check if lock already exists
    if (fs.existsSync(lockFilePath)) {
      const lockData = JSON.parse(fs.readFileSync(lockFilePath, 'utf8'));
      const lockAge = Date.now() - new Date(lockData.created).getTime();
      
      if (lockAge < LOCK_TIMEOUT) {
        console.warn(`🔒 Processing lock exists for ${csvFilePath} (${Math.round(lockAge/1000)}s old)`);
        return false;
      } else {
        console.warn(`🕒 Stale lock found for ${csvFilePath}, removing...`);
        fs.unlinkSync(lockFilePath);
      }
    }
    
    // Create new lock
    const lockData = {
      csvFile: csvFilePath,
      created: new Date().toISOString(),
      pid: process.pid,
      timeout: LOCK_TIMEOUT
    };
    
    fs.writeFileSync(lockFilePath, JSON.stringify(lockData, null, 2));
    console.log(`🔒 Acquired processing lock for ${path.basename(csvFilePath)}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error acquiring lock for ${csvFilePath}:`, error.message);
    return false;
  }
}

/**
 * Release processing lock for a CSV file
 * @param {string} csvFilePath - Path to CSV file
 */
function releaseProcessingLock(csvFilePath) {
  try {
    const lockFileName = path.basename(csvFilePath) + '.lock';
    const lockFilePath = path.join(LOCK_DIR, lockFileName);
    
    if (fs.existsSync(lockFilePath)) {
      fs.unlinkSync(lockFilePath);
      console.log(`🔓 Released processing lock for ${path.basename(csvFilePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error releasing lock for ${csvFilePath}:`, error.message);
  }
}

/**
 * Clean up stale locks older than timeout
 */
function cleanupStaleLocks() {
  try {
    if (!fs.existsSync(LOCK_DIR)) {
      return;
    }
    
    const lockFiles = fs.readdirSync(LOCK_DIR).filter(f => f.endsWith('.lock'));
    let cleaned = 0;
    
    for (const lockFile of lockFiles) {
      const lockFilePath = path.join(LOCK_DIR, lockFile);
      const lockData = JSON.parse(fs.readFileSync(lockFilePath, 'utf8'));
      const lockAge = Date.now() - new Date(lockData.created).getTime();
      
      if (lockAge > LOCK_TIMEOUT) {
        fs.unlinkSync(lockFilePath);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} stale processing locks`);
    }
    
  } catch (error) {
    console.error('❌ Error cleaning up stale locks:', error.message);
  }
}

/**
 * Get list of currently locked files
 * @returns {Array} Array of locked file information
 */
function getActiveLocks() {
  try {
    if (!fs.existsSync(LOCK_DIR)) {
      return [];
    }
    
    const lockFiles = fs.readdirSync(LOCK_DIR).filter(f => f.endsWith('.lock'));
    const activeLocks = [];
    
    for (const lockFile of lockFiles) {
      const lockFilePath = path.join(LOCK_DIR, lockFile);
      const lockData = JSON.parse(fs.readFileSync(lockFilePath, 'utf8'));
      const lockAge = Date.now() - new Date(lockData.created).getTime();
      
      if (lockAge < LOCK_TIMEOUT) {
        activeLocks.push({
          file: lockData.csvFile,
          created: lockData.created,
          age: lockAge,
          pid: lockData.pid
        });
      }
    }
    
    return activeLocks;
    
  } catch (error) {
    console.error('❌ Error getting active locks:', error.message);
    return [];
  }
}

module.exports = {
  acquireProcessingLock,
  releaseProcessingLock,
  cleanupStaleLocks,
  getActiveLocks
};