#!/usr/bin/env node

/**
 * CSV Processing Validator
 * 
 * Pre-processing validation script for CSV files before they are processed
 * by statLoader.js. Helps prevent duplicate processing and validates file integrity.
 * 
 * Usage: node scripts/data-validation/csvProcessingValidator.js <csv_directory>
 */

const fs = require('fs');
const path = require('path');
const gameIdValidator = require('../../utils/gameIdValidator');

/**
 * Validation configuration
 */
const VALIDATION_CONFIG = {
  // File validation thresholds
  MIN_FILE_SIZE_BYTES: 100,
  MAX_FILE_SIZE_MB: 10,
  
  // CSV content validation
  MIN_EXPECTED_ROWS: 5,
  MAX_EXPECTED_ROWS: 1000,
  
  // Game ID validation
  ALLOW_SUSPICIOUS_GAME_IDS: false,
  
  // Date range validation
  SUSPICIOUS_DATE_RANGES: [
    { start: '2025-07-02', end: '2025-07-09', reason: 'Known systematic corruption period' }
  ]
};

/**
 * Extract game information from CSV filename
 * @param {string} filename - CSV filename
 * @returns {object|null} Parsed game info or null if invalid
 */
function parseCSVFilename(filename) {
  const match = filename.match(/^([A-Z]{2,3})_(hitting|pitching)_(\w+)_(\d{1,2})_(\d{4})_(\d+)\.csv$/i);
  
  if (!match) {
    return null;
  }
  
  const [, team, statType, month, day, year, gameId] = match;
  
  return {
    team: team.toUpperCase(),
    statType: statType.toLowerCase(),
    month: month.toLowerCase(),
    day: day.padStart(2, '0'),
    year: year,
    gameId: gameId,
    date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  };
}

/**
 * Validate individual CSV file
 * @param {string} filePath - Path to CSV file
 * @returns {object} Validation result
 */
function validateCSVFile(filePath) {
  const result = {
    filePath,
    filename: path.basename(filePath),
    isValid: true,
    warnings: [],
    errors: [],
    gameInfo: null
  };
  
  try {
    // Check if file exists and is readable
    if (!fs.existsSync(filePath)) {
      result.errors.push('File does not exist');
      result.isValid = false;
      return result;
    }
    
    const stats = fs.statSync(filePath);
    
    // Check file size
    if (stats.size < VALIDATION_CONFIG.MIN_FILE_SIZE_BYTES) {
      result.errors.push(`File too small: ${stats.size} bytes (min: ${VALIDATION_CONFIG.MIN_FILE_SIZE_BYTES})`);
      result.isValid = false;
    }
    
    const maxSizeBytes = VALIDATION_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024;
    if (stats.size > maxSizeBytes) {
      result.warnings.push(`File unusually large: ${Math.round(stats.size / 1024 / 1024 * 100) / 100}MB`);
    }
    
    // Parse filename
    result.gameInfo = parseCSVFilename(result.filename);
    if (!result.gameInfo) {
      result.errors.push('Invalid filename format - expected: TEAM_[hitting|pitching]_month_day_year_gameId.csv');
      result.isValid = false;
      return result;
    }
    
    // Validate game ID
    const gameIdValidation = gameIdValidator.isValidGameId(result.gameInfo.gameId);
    if (!gameIdValidation.isValid) {
      result.errors.push(`Invalid game ID: ${result.gameInfo.gameId} - ${gameIdValidation.reason}`);
      result.isValid = false;
    }
    
    // Check for suspicious game IDs
    const gameIdAnalysis = gameIdValidator.analyzeGameIdPattern(
      result.gameInfo.gameId, 
      { date: result.gameInfo.date }
    );
    
    if (gameIdAnalysis.isSuspicious) {
      const message = `Suspicious game ID: ${result.gameInfo.gameId} - ${gameIdAnalysis.suspiciousReasons.join(', ')}`;
      
      if (VALIDATION_CONFIG.ALLOW_SUSPICIOUS_GAME_IDS) {
        result.warnings.push(message);
      } else {
        result.errors.push(message);
        result.isValid = false;
      }
    }
    
    // Check for suspicious date ranges
    for (const range of VALIDATION_CONFIG.SUSPICIOUS_DATE_RANGES) {
      if (result.gameInfo.date >= range.start && result.gameInfo.date <= range.end) {
        result.warnings.push(`Date falls in suspicious range: ${range.reason}`);
        break;
      }
    }
    
    // Validate CSV content
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      
      if (lines.length < VALIDATION_CONFIG.MIN_EXPECTED_ROWS) {
        result.warnings.push(`Few CSV rows: ${lines.length} (expected at least ${VALIDATION_CONFIG.MIN_EXPECTED_ROWS})`);
      }
      
      if (lines.length > VALIDATION_CONFIG.MAX_EXPECTED_ROWS) {
        result.warnings.push(`Many CSV rows: ${lines.length} (max expected: ${VALIDATION_CONFIG.MAX_EXPECTED_ROWS})`);
      }
      
      // Check for header row
      if (lines.length > 0) {
        const headerRow = lines[0].toLowerCase();
        const expectedHeaders = result.gameInfo.statType === 'hitting' 
          ? ['player', 'ab', 'h', 'r', 'rbi', 'hr']
          : ['player', 'ip', 'h', 'r', 'er', 'bb', 'k'];
        
        const missingHeaders = expectedHeaders.filter(header => 
          !headerRow.includes(header)
        );
        
        if (missingHeaders.length > 0) {
          result.warnings.push(`Missing expected headers: ${missingHeaders.join(', ')}`);
        }
      }
    } catch (error) {
      result.errors.push(`Error reading CSV content: ${error.message}`);
      result.isValid = false;
    }
    
  } catch (error) {
    result.errors.push(`File access error: ${error.message}`);
    result.isValid = false;
  }
  
  return result;
}

/**
 * Detect potential duplicate CSV files
 * @param {Array} validationResults - Array of validation results
 * @returns {Array} Array of potential duplicates
 */
function detectDuplicateCSVs(validationResults) {
  const duplicates = [];
  const gameIdMap = new Map();
  
  // Group files by game ID
  validationResults.forEach(result => {
    if (result.gameInfo && result.gameInfo.gameId) {
      const gameId = result.gameInfo.gameId;
      
      if (!gameIdMap.has(gameId)) {
        gameIdMap.set(gameId, []);
      }
      
      gameIdMap.get(gameId).push(result);
    }
  });
  
  // Find game IDs with multiple files
  for (const [gameId, files] of gameIdMap) {
    if (files.length > 1) {
      // Check if files are legitimately different (different teams or stat types)
      const uniqueTeams = [...new Set(files.map(f => f.gameInfo.team))];
      const uniqueStatTypes = [...new Set(files.map(f => f.gameInfo.statType))];
      
      if (uniqueTeams.length === 1 && uniqueStatTypes.length === 1) {
        // Same team and stat type with same game ID = potential duplicate
        duplicates.push({
          type: 'duplicate_csv',
          gameId,
          files: files.map(f => f.filePath),
          reason: `Multiple ${files[0].gameInfo.statType} files for ${files[0].gameInfo.team} with same game ID`
        });
      } else if (uniqueTeams.length > 2 || uniqueStatTypes.length > 2) {
        // Too many variations for one game ID
        duplicates.push({
          type: 'suspicious_game_id_reuse',
          gameId,
          files: files.map(f => f.filePath),
          reason: `Game ID used across ${uniqueTeams.length} teams and ${uniqueStatTypes.length} stat types`
        });
      }
    }
  }
  
  return duplicates;
}

/**
 * Generate validation report
 * @param {Array} validationResults - Array of validation results
 * @param {Array} duplicates - Array of duplicate detections
 * @returns {object} Validation report
 */
function generateValidationReport(validationResults, duplicates) {
  const totalFiles = validationResults.length;
  const validFiles = validationResults.filter(r => r.isValid).length;
  const invalidFiles = totalFiles - validFiles;
  const filesWithWarnings = validationResults.filter(r => r.warnings.length > 0).length;
  
  return {
    summary: {
      totalFiles,
      validFiles,
      invalidFiles,
      filesWithWarnings,
      duplicateIssues: duplicates.length
    },
    validationResults,
    duplicates,
    recommendation: invalidFiles > 0 || duplicates.length > 0 ? 'fix_issues' : 'proceed'
  };
}

/**
 * Print validation report to console
 * @param {object} report - Validation report
 */
function printValidationReport(report) {
  const { summary, validationResults, duplicates } = report;
  
  console.log('\n🛡️  CSV PRE-PROCESSING VALIDATION REPORT');
  console.log('=========================================');
  
  console.log(`📊 SUMMARY:`);
  console.log(`   Total Files: ${summary.totalFiles}`);
  console.log(`   Valid Files: ${summary.validFiles}`);
  console.log(`   Invalid Files: ${summary.invalidFiles}`);
  console.log(`   Files with Warnings: ${summary.filesWithWarnings}`);
  console.log(`   Duplicate Issues: ${summary.duplicateIssues}`);
  
  // Show invalid files
  if (summary.invalidFiles > 0) {
    console.log(`\n❌ INVALID FILES:`);
    validationResults
      .filter(r => !r.isValid)
      .forEach(result => {
        console.log(`   ${result.filename}:`);
        result.errors.forEach(error => console.log(`     - ${error}`));
      });
  }
  
  // Show files with warnings
  if (summary.filesWithWarnings > 0) {
    console.log(`\n⚠️  FILES WITH WARNINGS:`);
    validationResults
      .filter(r => r.warnings.length > 0)
      .forEach(result => {
        console.log(`   ${result.filename}:`);
        result.warnings.forEach(warning => console.log(`     - ${warning}`));
      });
  }
  
  // Show duplicate issues
  if (duplicates.length > 0) {
    console.log(`\n🔄 DUPLICATE ISSUES:`);
    duplicates.forEach(duplicate => {
      console.log(`   Game ID ${duplicate.gameId}:`);
      console.log(`     Reason: ${duplicate.reason}`);
      console.log(`     Files: ${duplicate.files.map(f => path.basename(f)).join(', ')}`);
    });
  }
  
  // Show recommendation
  console.log(`\n💡 RECOMMENDATION: ${report.recommendation}`);
  
  if (report.recommendation === 'fix_issues') {
    console.log('   Please resolve the issues above before processing');
  } else {
    console.log('   All validations passed - safe to proceed with processing');
  }
}

/**
 * Main validation function
 * @param {string} csvDirectory - Directory containing CSV files
 * @returns {number} Exit code (0 = success, 1 = validation failed)
 */
function main(csvDirectory) {
  console.log(`🔍 Starting CSV pre-processing validation for: ${csvDirectory}`);
  
  if (!fs.existsSync(csvDirectory)) {
    console.error(`❌ Directory not found: ${csvDirectory}`);
    return 1;
  }
  
  // Find all CSV files
  const csvFiles = fs.readdirSync(csvDirectory)
    .filter(file => file.endsWith('.csv'))
    .map(file => path.join(csvDirectory, file))
    .filter(filePath => fs.statSync(filePath).isFile());
  
  if (csvFiles.length === 0) {
    console.log('ℹ️  No CSV files found - validation complete');
    return 0;
  }
  
  console.log(`📋 Found ${csvFiles.length} CSV files to validate`);
  
  // Validate each file
  const validationResults = csvFiles.map(validateCSVFile);
  
  // Detect duplicates
  const duplicates = detectDuplicateCSVs(validationResults);
  
  // Generate and print report
  const report = generateValidationReport(validationResults, duplicates);
  printValidationReport(report);
  
  // Return appropriate exit code
  return report.recommendation === 'proceed' ? 0 : 1;
}

// Execute if run directly
if (require.main === module) {
  const csvDirectory = process.argv[2];
  
  if (!csvDirectory) {
    console.error('Usage: node csvProcessingValidator.js <csv_directory>');
    process.exit(1);
  }
  
  const exitCode = main(csvDirectory);
  process.exit(exitCode);
}

module.exports = {
  validateCSVFile,
  detectDuplicateCSVs,
  generateValidationReport,
  main
};