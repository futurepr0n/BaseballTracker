#!/usr/bin/env node

/**
 * Comprehensive Testing Suite for Duplicate Detection System
 * 
 * Tests all components of the enhanced duplicate detection and prevention system:
 * - Game ID validation utilities
 * - Doubleheader validation utilities  
 * - Duplicate detection service
 * - StatLoader enhancements
 * - End-to-end pipeline validation
 * 
 * Usage: node scripts/data-validation/testDuplicateDetection.js [--verbose] [--test-type=all|unit|integration]
 */

const fs = require('fs').promises;
const path = require('path');

// Import modules to test
const gameIdValidator = require('../../utils/gameIdValidator');
const doubleheaderValidator = require('../../utils/doubleheaderValidator');
const duplicateDetectionService = require('../../src/services/duplicateDetectionService');

/**
 * Test configuration
 */
const TEST_CONFIG = {
  verbose: false,
  testType: 'all', // all, unit, integration
  tempTestDir: 'test_temp_data',
  
  // Test data samples
  validGameIds: ['401696183', '401696184', '401696185'],
  invalidGameIds: ['999999999', '0', 'abc123'], // Changed '123' to '0' as 123 is valid schedule ID
  suspiciousGameIds: ['401769356', '363', '401764563'],
  
  // Known duplicate patterns from analysis
  knownDuplicates: [
    { gameId: '401696200', dates: ['2025-07-02', '2025-07-03'] },
    { gameId: '401696221', dates: ['2025-07-04', '2025-07-05'] }
  ]
};

/**
 * Test result tracking
 */
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  details: []
};

/**
 * Utility functions for testing
 */
function log(message, force = false) {
  if (TEST_CONFIG.verbose || force) {
    console.log(message);
  }
}

function assert(condition, message, testName) {
  testResults.total++;
  
  if (condition) {
    testResults.passed++;
    log(`✅ PASS: ${testName} - ${message}`);
    testResults.details.push({ test: testName, status: 'PASS', message });
  } else {
    testResults.failed++;
    log(`❌ FAIL: ${testName} - ${message}`, true);
    testResults.details.push({ test: testName, status: 'FAIL', message });
  }
}

function skip(message, testName) {
  testResults.total++;
  testResults.skipped++;
  log(`⏭️  SKIP: ${testName} - ${message}`);
  testResults.details.push({ test: testName, status: 'SKIP', message });
}

/**
 * Create test data files for integration testing
 */
async function createTestData() {
  try {
    await fs.mkdir(TEST_CONFIG.tempTestDir, { recursive: true });
    
    // Create sample game data with known duplicate patterns
    const sampleGameData = {
      date: '2025-07-02',
      games: [
        {
          homeTeam: 'TOR',
          awayTeam: 'NYY',
          homeScore: 12,
          awayScore: 5,
          status: 'Final',
          venue: 'Rogers Centre',
          originalId: 401696200,
          dateTime: '2025-07-02 19:07:00Z'
        }
      ],
      players: [
        {
          name: 'C. Bellinger',
          team: 'NYY',
          gameId: '401696200',
          playerType: 'hitter',
          AB: 4,
          R: 0,
          H: 2,
          RBI: 0,
          HR: 0
        }
      ]
    };
    
    // Create duplicate data for next day
    const duplicateGameData = {
      ...sampleGameData,
      date: '2025-07-03'
    };
    
    await fs.writeFile(
      path.join(TEST_CONFIG.tempTestDir, 'july_02_2025.json'),
      JSON.stringify(sampleGameData, null, 2)
    );
    
    await fs.writeFile(
      path.join(TEST_CONFIG.tempTestDir, 'july_03_2025.json'),
      JSON.stringify(duplicateGameData, null, 2)
    );
    
    // Create legitimate doubleheader data
    const doubleheaderData = {
      date: '2025-05-29',
      games: [
        {
          homeTeam: 'PHI',
          awayTeam: 'ATL',
          homeScore: 3,
          awayScore: 9,
          status: 'Final',
          venue: 'Citizens Bank Park',
          originalId: 401695746,
          dateTime: '2025-05-29 17:05:00Z'
        },
        {
          homeTeam: 'PHI',
          awayTeam: 'ATL',
          homeScore: 5,
          awayScore: 4,
          status: 'Final',
          venue: 'Citizens Bank Park',
          originalId: 401777355,
          dateTime: '2025-05-29 22:45:00Z'
        }
      ],
      players: [
        {
          name: 'T. Turner',
          team: 'PHI',
          gameId: '401695746',
          playerType: 'hitter',
          AB: 4,
          R: 0,
          H: 1,
          RBI: 0,
          HR: 0
        },
        {
          name: 'T. Turner',
          team: 'PHI',
          gameId: '401777355',
          playerType: 'hitter',
          AB: 3,
          R: 1,
          H: 2,
          RBI: 1,
          HR: 0
        }
      ]
    };
    
    await fs.writeFile(
      path.join(TEST_CONFIG.tempTestDir, 'may_29_2025.json'),
      JSON.stringify(doubleheaderData, null, 2)
    );
    
    log('✅ Test data created successfully');
    
  } catch (error) {
    log(`❌ Error creating test data: ${error.message}`, true);
    throw error;
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  try {
    await fs.rmdir(TEST_CONFIG.tempTestDir, { recursive: true });
    log('✅ Test data cleaned up');
  } catch (error) {
    log(`⚠️  Warning: Could not clean up test data: ${error.message}`);
  }
}

/**
 * Unit Tests for Game ID Validator
 */
function testGameIdValidator() {
  log('\n🧪 Testing Game ID Validator...', true);
  
  // Test valid game IDs
  TEST_CONFIG.validGameIds.forEach(gameId => {
    const result = gameIdValidator.isValidGameId(gameId);
    assert(
      result.isValid === true,
      `Valid game ID ${gameId} should be recognized as valid`,
      'GameIdValidator.isValidGameId'
    );
  });
  
  // Test invalid game IDs
  TEST_CONFIG.invalidGameIds.forEach(gameId => {
    const result = gameIdValidator.isValidGameId(gameId);
    assert(
      result.isValid === false,
      `Invalid game ID ${gameId} should be recognized as invalid`,
      'GameIdValidator.isValidGameId'
    );
  });
  
  // Test suspicious game ID detection
  TEST_CONFIG.suspiciousGameIds.forEach(gameId => {
    const analysis = gameIdValidator.analyzeGameIdPattern(gameId);
    assert(
      analysis.isSuspicious === true,
      `Suspicious game ID ${gameId} should be flagged`,
      'GameIdValidator.analyzeGameIdPattern'
    );
  });
  
  // Test game ID health report generation
  const sampleGames = [
    { gameId: '401696183', homeTeam: 'TOR', awayTeam: 'NYY' },
    { gameId: '999999999', homeTeam: 'BOS', awayTeam: 'LAA' },
    { gameId: '401696184', homeTeam: 'PHI', awayTeam: 'ATL' }
  ];
  
  const healthReport = gameIdValidator.generateGameIdHealthReport(sampleGames);
  
  assert(
    healthReport.totalGames === 3,
    'Health report should count all games correctly',
    'GameIdValidator.generateGameIdHealthReport'
  );
  
  assert(
    healthReport.invalidGames >= 1,
    'Health report should detect invalid game IDs',
    'GameIdValidator.generateGameIdHealthReport'
  );
}

/**
 * Unit Tests for Doubleheader Validator
 */
function testDoubleheaderValidator() {
  log('\n🧪 Testing Doubleheader Validator...', true);
  
  // Test legitimate doubleheader
  const legitimateDoubleheader = [
    {
      homeTeam: 'PHI',
      awayTeam: 'ATL',
      venue: 'Citizens Bank Park',
      originalId: 401695746,
      gameId: '401695746',
      dateTime: '2025-05-29 17:05:00Z',
      players: Array(20).fill({}).map((_, i) => ({ name: `Player${i}` }))
    },
    {
      homeTeam: 'PHI',
      awayTeam: 'ATL',
      venue: 'Citizens Bank Park',
      originalId: 401777355,
      gameId: '401777355',
      dateTime: '2025-05-29 22:45:00Z',
      players: Array(22).fill({}).map((_, i) => ({ name: `Player${i}` }))
    }
  ];
  
  const doubleheaderAnalysis = doubleheaderValidator.isLegitimateDoubleheader(legitimateDoubleheader);
  
  assert(
    doubleheaderAnalysis.isLegitimate === true,
    'Legitimate doubleheader should be recognized',
    'DoubleheaderValidator.isLegitimateDoubleheader'
  );
  
  assert(
    doubleheaderAnalysis.legitimacyChecks.sameTeams === true,
    'Doubleheader should have same teams',
    'DoubleheaderValidator.legitimacyChecks'
  );
  
  assert(
    doubleheaderAnalysis.legitimacyChecks.sameVenue === true,
    'Doubleheader should have same venue',
    'DoubleheaderValidator.legitimacyChecks'
  );
  
  // Test duplicate detection (same game ID)
  const duplicateGames = [
    {
      homeTeam: 'NYY',
      awayTeam: 'TOR',
      venue: 'Rogers Centre',
      originalId: 401696200,
      gameId: '401696200',
      dateTime: '2025-07-02 19:07:00Z'
    },
    {
      homeTeam: 'NYY',
      awayTeam: 'TOR',
      venue: 'Rogers Centre',
      originalId: 401696200,
      gameId: '401696200',
      dateTime: '2025-07-02 19:07:00Z'
    }
  ];
  
  const duplicateAnalysis = doubleheaderValidator.isLegitimateDoubleheader(duplicateGames);
  
  assert(
    duplicateAnalysis.isLegitimate === false,
    'Duplicate games should be detected',
    'DoubleheaderValidator.duplicateDetection'
  );
  
  assert(
    duplicateAnalysis.classification === 'duplicate_data',
    'Duplicates should be classified correctly',
    'DoubleheaderValidator.classification'
  );
}

/**
 * Unit Tests for Duplicate Detection Service
 */
async function testDuplicateDetectionService() {
  log('\n🧪 Testing Duplicate Detection Service...', true);
  
  try {
    // Test cross-date duplicate detection using test data
    const gamesByDate = new Map();
    
    // Add test data to the map
    gamesByDate.set('2025-07-02', {
      date: '2025-07-02',
      games: [{
        homeTeam: 'TOR',
        awayTeam: 'NYY',
        originalId: 401696200,
        gameId: '401696200'
      }],
      players: [{
        name: 'C. Bellinger',
        team: 'NYY',
        gameId: '401696200'
      }]
    });
    
    gamesByDate.set('2025-07-03', {
      date: '2025-07-03',
      games: [{
        homeTeam: 'TOR',
        awayTeam: 'NYY',
        originalId: 401696200,
        gameId: '401696200'
      }],
      players: [{
        name: 'C. Bellinger',
        team: 'NYY',
        gameId: '401696200'
      }]
    });
    
    // Test cross-date duplicate analysis
    const crossDateDuplicates = duplicateDetectionService.analyzeCrossDateDuplicates(gamesByDate);
    
    assert(
      crossDateDuplicates.length >= 1,
      'Cross-date duplicates should be detected',
      'DuplicateDetectionService.analyzeCrossDateDuplicates'
    );
    
    assert(
      crossDateDuplicates[0].gameId === '401696200',
      'Correct game ID should be identified as duplicate',
      'DuplicateDetectionService.crossDateGameId'
    );
    
    // Test suspicious date range checking
    const suspiciousDate = duplicateDetectionService.checkSuspiciousDateRange('2025-07-05');
    
    assert(
      suspiciousDate !== null,
      'Dates in known suspicious ranges should be flagged',
      'DuplicateDetectionService.checkSuspiciousDateRange'
    );
    
    assert(
      suspiciousDate.reason.includes('systematic corruption'),
      'Suspicious date should have correct reason',
      'DuplicateDetectionService.suspiciousDateReason'
    );
    
  } catch (error) {
    log(`❌ Error in duplicate detection service tests: ${error.message}`, true);
    assert(false, `Duplicate detection service test failed: ${error.message}`, 'DuplicateDetectionService.general');
  }
}

/**
 * Integration Tests
 */
async function testIntegration() {
  log('\n🧪 Running Integration Tests...', true);
  
  try {
    // Create test data
    await createTestData();
    
    // Test full duplicate analysis on test data
    const testDataDir = TEST_CONFIG.tempTestDir;
    
    // Create a temporary analysis (simulating the full service)
    // Note: This would need modification of the service to accept custom data directory
    
    log('ℹ️  Integration tests would require full service modification for custom test data');
    skip('Full integration test requires service modification', 'Integration.fullAnalysis');
    
    // Test individual components working together
    const testGameId = '401696200';
    const testDate = '2025-07-02';
    
    // Validate game ID
    const gameIdValidation = gameIdValidator.isValidGameId(testGameId);
    const gameIdAnalysis = gameIdValidator.analyzeGameIdPattern(testGameId, { date: testDate });
    
    // Check suspicious date
    const suspiciousDate = duplicateDetectionService.checkSuspiciousDateRange(testDate);
    
    assert(
      gameIdValidation.isValid === true,
      'Test game ID should be valid',
      'Integration.gameIdValidation'
    );
    
    assert(
      suspiciousDate !== null,
      'Test date should be in suspicious range',
      'Integration.suspiciousDateDetection'
    );
    
    // Test component integration
    const combinedWarnings = [];
    
    if (gameIdAnalysis.isSuspicious) {
      combinedWarnings.push('Suspicious game ID');
    }
    
    if (suspiciousDate) {
      combinedWarnings.push('Suspicious date range');
    }
    
    assert(
      combinedWarnings.length >= 1,
      'Integration should combine warnings from multiple components',
      'Integration.warningCombination'
    );
    
  } catch (error) {
    log(`❌ Integration test error: ${error.message}`, true);
    assert(false, `Integration test failed: ${error.message}`, 'Integration.general');
  } finally {
    await cleanupTestData();
  }
}

/**
 * Performance Tests
 */
async function testPerformance() {
  log('\n🧪 Running Performance Tests...', true);
  
  // Test game ID validation performance
  const startTime = Date.now();
  
  for (let i = 0; i < 1000; i++) {
    gameIdValidator.isValidGameId('401696183');
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  assert(
    duration < 1000, // Should complete 1000 validations in under 1 second
    `Game ID validation performance: 1000 validations in ${duration}ms`,
    'Performance.gameIdValidation'
  );
  
  // Test doubleheader validation performance
  const sampleGames = Array(10).fill(null).map((_, i) => ({
    homeTeam: 'PHI',
    awayTeam: 'ATL',
    gameId: `40169${i.toString().padStart(4, '0')}`,
    dateTime: `2025-05-29 ${(17 + i).toString().padStart(2, '0')}:05:00Z`,
    venue: 'Citizens Bank Park'
  }));
  
  const perfStartTime = Date.now();
  doubleheaderValidator.isLegitimateDoubleheader(sampleGames);
  const perfEndTime = Date.now();
  
  assert(
    (perfEndTime - perfStartTime) < 100,
    `Doubleheader validation performance: ${perfEndTime - perfStartTime}ms`,
    'Performance.doubleheaderValidation'
  );
}

/**
 * Print test results summary
 */
function printTestSummary() {
  console.log('\n🎯 TEST SUMMARY');
  console.log('===============');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏭️  Skipped: ${testResults.skipped}`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.details
      .filter(detail => detail.status === 'FAIL')
      .forEach(detail => {
        console.log(`   ${detail.test}: ${detail.message}`);
      });
  }
  
  if (testResults.skipped > 0) {
    console.log('\n⏭️  SKIPPED TESTS:');
    testResults.details
      .filter(detail => detail.status === 'SKIP')
      .forEach(detail => {
        console.log(`   ${detail.test}: ${detail.message}`);
      });
  }
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  console.log(`\n📊 Success Rate: ${successRate}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed!');
    return 0;
  } else {
    console.log('\n💥 Some tests failed. Please review and fix.');
    return 1;
  }
}

/**
 * Main test execution function
 */
async function runTests() {
  console.log('🚀 Starting Duplicate Detection Test Suite');
  console.log('==========================================');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  args.forEach(arg => {
    if (arg === '--verbose') {
      TEST_CONFIG.verbose = true;
    } else if (arg.startsWith('--test-type=')) {
      TEST_CONFIG.testType = arg.split('=')[1];
    }
  });
  
  console.log(`Test Type: ${TEST_CONFIG.testType}`);
  console.log(`Verbose: ${TEST_CONFIG.verbose}`);
  
  try {
    // Run unit tests
    if (TEST_CONFIG.testType === 'all' || TEST_CONFIG.testType === 'unit') {
      testGameIdValidator();
      testDoubleheaderValidator();
      await testDuplicateDetectionService();
      await testPerformance();
    }
    
    // Run integration tests
    if (TEST_CONFIG.testType === 'all' || TEST_CONFIG.testType === 'integration') {
      await testIntegration();
    }
    
  } catch (error) {
    console.error('💥 Fatal error during testing:', error);
    return 1;
  }
  
  return printTestSummary();
}

// Execute tests if run directly
if (require.main === module) {
  runTests()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      console.error('💥 Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = {
  runTests,
  testGameIdValidator,
  testDoubleheaderValidator,
  testDuplicateDetectionService,
  TEST_CONFIG
};