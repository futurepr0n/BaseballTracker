/**
 * Enhanced Duplicate Detection with Prevention Logic
 * 
 * Fixes the root cause of duplicate entries by implementing sophisticated
 * validation to distinguish legitimate doubleheaders from data reprocessing.
 */

const fs = require('fs');
const path = require('path');

/**
 * Enhanced duplicate detection with sophisticated validation
 * @param {Array} existingPlayers - Existing players in JSON
 * @param {object} newPlayer - New player to check
 * @param {string} gameId - Game ID being processed
 * @param {string} date - Game date
 * @param {string} csvFilePath - Path to CSV file being processed
 * @param {object} processingLog - Processing log data
 * @returns {object} Enhanced duplicate analysis result
 */
function detectEnhancedDuplicatesWithPrevention(existingPlayers, newPlayer, gameId, date, csvFilePath, processingLog) {
  const result = {
    isDuplicate: false,
    duplicateType: null,
    duplicateIndex: -1,
    action: 'add',
    warnings: [],
    confidence: 1.0,
    confirmedDoubleheader: false
  };
  
  // Find existing player with same name and team
  const existingPlayerIndex = existingPlayers.findIndex(p => 
    p.name === newPlayer.name && 
    p.team === newPlayer.team &&
    (p.playerType === newPlayer.playerType || (!p.playerType && newPlayer.playerType === 'hitter'))
  );
  
  if (existingPlayerIndex >= 0) {
    const existingPlayer = existingPlayers[existingPlayerIndex];
    
    // Check for exact duplicate (same gameId)
    if (existingPlayer.gameId === newPlayer.gameId) {
      // Check if this exact file was already processed
      if (processingLog.processedFiles && processingLog.processedFiles[csvFilePath]) {
        result.isDuplicate = true;
        result.duplicateType = 'reprocessed_file';
        result.duplicateIndex = existingPlayerIndex;
        result.action = 'skip';
        result.warnings.push('CSV file already processed - skipping to prevent duplicates');
        result.confidence = 0.95;
        return result;
      }
      
      result.isDuplicate = true;
      result.duplicateType = 'exact_duplicate';
      result.duplicateIndex = existingPlayerIndex;
      result.action = 'update';
      result.warnings.push('Exact duplicate found - updating existing record');
      return result;
    }
    
    // Different gameIds - need sophisticated validation
    if (existingPlayer.gameId !== newPlayer.gameId) {
      // Check if this is legitimate doubleheader vs reprocessing
      const doubleheaderValidation = validateDoubleheader(
        existingPlayer, 
        newPlayer, 
        date, 
        csvFilePath, 
        processingLog
      );
      
      if (doubleheaderValidation.isLegitimate) {
        result.confirmedDoubleheader = true;
        result.action = 'add';
        result.confidence = doubleheaderValidation.confidence;
        result.warnings.push(`Confirmed legitimate doubleheader: ${doubleheaderValidation.reason}`);
      } else {
        result.isDuplicate = true;
        result.duplicateType = 'suspected_reprocessing';
        result.duplicateIndex = existingPlayerIndex;
        result.action = 'skip';
        result.warnings.push(`Suspected reprocessing duplicate: ${doubleheaderValidation.reason}`);
        result.confidence = 0.95;
      }
      
      return result;
    }
  }
  
  return result;
}

/**
 * Validate if different gameIds represent a legitimate doubleheader
 * @param {object} existingPlayer - Existing player entry
 * @param {object} newPlayer - New player entry
 * @param {string} date - Game date
 * @param {string} csvFilePath - CSV file path
 * @param {object} processingLog - Processing log
 * @returns {object} Validation result
 */
function validateDoubleheader(existingPlayer, newPlayer, date, csvFilePath, processingLog) {
  const validation = {
    isLegitimate: false,
    confidence: 0.5,
    reason: 'Unknown'
  };
  
  // Check 1: Game ID range difference (legitimate doubleheaders usually have close IDs)
  const gameIdDiff = Math.abs(parseInt(existingPlayer.gameId) - parseInt(newPlayer.gameId));
  
  if (gameIdDiff > 50) {
    validation.reason = `Large gameId difference (${gameIdDiff}) suggests different game events`;
    validation.isLegitimate = true;
    validation.confidence = 0.8;
    return validation;
  }
  
  // Check 2: File processing history
  if (processingLog.processedFiles) {
    const similarFiles = Object.keys(processingLog.processedFiles).filter(file => 
      file.includes(newPlayer.team) && 
      file.includes(date.replace(/-/g, '_'))
    );
    
    if (similarFiles.length > 1) {
      validation.reason = `Multiple CSV files for same team/date suggests potential reprocessing`;
      validation.isLegitimate = false;
      validation.confidence = 0.9;
      return validation;
    }
  }
  
  // Check 3: Statistical consistency (doubleheaders often have different performance)
  const statsMatch = (
    existingPlayer.H === newPlayer.H &&
    existingPlayer.AB === newPlayer.AB &&
    existingPlayer.HR === newPlayer.HR &&
    existingPlayer.RBI === newPlayer.RBI
  );
  
  if (statsMatch) {
    validation.reason = 'Identical stats across different gameIds suggests duplicate data';
    validation.isLegitimate = false;
    validation.confidence = 0.95;
    return validation;
  }
  
  // Check 4: Time-based validation (same date, close gameIds = likely doubleheader)
  if (gameIdDiff <= 20) {
    validation.reason = `Close gameIds (${gameIdDiff} apart) on same date suggests legitimate doubleheader`;
    validation.isLegitimate = true;
    validation.confidence = 0.85;
    return validation;
  }
  
  // Default: Conservative approach for unclear cases
  validation.reason = `Uncertain case - gameId diff: ${gameIdDiff}, requires manual review`;
  validation.isLegitimate = false;
  validation.confidence = 0.7;
  
  return validation;
}

/**
 * Check if file was already processed with same data
 * @param {string} csvFilePath - Path to CSV file
 * @param {object} processingLog - Processing log data
 * @returns {boolean} True if file was already processed
 */
function isFileAlreadyProcessed(csvFilePath, processingLog) {
  if (!processingLog.processedFiles || !processingLog.processedFiles[csvFilePath]) {
    return false;
  }
  
  const logEntry = processingLog.processedFiles[csvFilePath];
  
  try {
    // Check if file still exists and hasn't been modified
    const fileStats = fs.statSync(csvFilePath);
    const currentModified = fileStats.mtime.toISOString();
    
    return logEntry.fileModified === currentModified;
  } catch (error) {
    // File doesn't exist anymore, treat as not processed
    return false;
  }
}

/**
 * Generate simple checksum for file contents
 * @param {string} filePath - Path to file
 * @returns {string} Checksum
 */
function generateFileChecksum(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.length + '_' + content.slice(0, 100).replace(/\s/g, '').length;
  } catch (error) {
    return 'error_' + Date.now();
  }
}

module.exports = {
  detectEnhancedDuplicatesWithPrevention,
  validateDoubleheader,
  isFileAlreadyProcessed,
  generateFileChecksum
};