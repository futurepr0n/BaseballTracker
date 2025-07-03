/**
 * Test file for Phase 4 Bet Slip Scanner Validation
 * 
 * This file contains comprehensive tests to verify the player validation logic
 * works correctly to prevent invalid players from being added to the CapSheet.
 */

// Mock roster data for testing
const mockRosterData = [
  { name: 'Pete Alonso', team: 'NYM', position: '1B' },
  { name: 'Vladimir Guerrero Jr.', team: 'TOR', position: '1B' },
  { name: 'Aaron Judge', team: 'NYY', position: 'RF' },
  { name: 'Mookie Betts', team: 'LAD', position: 'RF' },
  { name: 'Ronald Acuna Jr.', team: 'ATL', position: 'OF' },
  { name: 'Fernando Tatis Jr.', team: 'SD', position: 'SS' },
  { name: 'Shohei Ohtani', team: 'LAA', position: 'DH' },
  { name: 'Mike Trout', team: 'LAA', position: 'OF' },
  { name: 'Juan Soto', team: 'WSH', position: 'OF' },
  { name: 'Jose Altuve', team: 'HOU', position: '2B' }
];

// Mock scanned player data for testing
const mockScannedPlayers = [
  // Valid players that should pass validation
  { name: 'Pete Alonso', team: 'NYM', prop_type: 'HR', line: '0.5', odds: '+150' },
  { name: 'Vladimir Guerrero Jr.', team: 'TOR', prop_type: 'H', line: '1.5', odds: '-110' },
  { name: 'P. Alonso', team: 'NYM', prop_type: 'B', line: '2.5', odds: '+120' }, // Initial + last name format
  { name: 'Judge', team: 'NYY', prop_type: 'HR', line: '0.5', odds: '+200' }, // Last name only
  
  // Invalid players that should fail validation
  { name: 'John Fake Player', team: 'NYM', prop_type: 'HR', line: '0.5', odds: '+150' },
  { name: 'Pete Smith', team: 'BOS', prop_type: 'H', line: '1.5', odds: '-110' },
  { name: 'Invalid Player', team: 'XXX', prop_type: 'B', line: '2.5', odds: '+120' },
  
  // Edge cases
  { name: 'Mike T.', team: 'LAA', prop_type: 'HR', line: '0.5', odds: '+180' }, // First name + initial
  { name: 'Ohtani', team: 'LAA', prop_type: 'H', line: '1.5', odds: '-105' }, // Last name only (valid)
  { name: 'Ronald A.', team: 'ATL', prop_type: 'B', line: '2.5', odds: '+110' }, // First name + initial
];

// Import validation functions (these would need to be extracted to a separate module for testing)
// For now, we'll redefine them here for testing purposes

/**
 * Process player line from scanned data
 */
const processPlayerLine = (scannedPlayer) => {
  if (!scannedPlayer || !scannedPlayer.name) {
    return null;
  }
  
  return {
    name: scannedPlayer.name,
    team: scannedPlayer.team || '',
    prop_type: scannedPlayer.prop_type || '',
    line: scannedPlayer.line || '',
    odds: scannedPlayer.odds || ''
  };
};

/**
 * Find player in roster with multiple matching strategies
 */
const findPlayerInRoster = (playerName, rosterData) => {
  if (!playerName || !rosterData) return null;
  
  // Try exact match first
  let match = rosterData.find(p => 
    p.name.toLowerCase() === playerName.toLowerCase()
  );
  
  if (!match) {
    // Try partial match (last name)
    const lastName = playerName.split(' ').pop();
    match = rosterData.find(p => 
      p.name.toLowerCase().includes(lastName.toLowerCase())
    );
  }
  
  if (!match) {
    // Try first initial + last name match (e.g., "P. Alonso" matches "Pete Alonso")
    const nameParts = playerName.split(' ');
    if (nameParts.length >= 2) {
      const firstInitial = nameParts[0].charAt(0).toLowerCase();
      const lastName = nameParts[nameParts.length - 1].toLowerCase();
      
      match = rosterData.find(p => {
        const rosterParts = p.name.toLowerCase().split(' ');
        if (rosterParts.length >= 2) {
          const rosterFirstInitial = rosterParts[0].charAt(0);
          const rosterLastName = rosterParts[rosterParts.length - 1];
          return rosterFirstInitial === firstInitial && rosterLastName === lastName;
        }
        return false;
      });
    }
  }
  
  return match;
};

/**
 * Validate scanned players against roster data
 */
const validateScannedPlayers = (scannedPlayers, rosterData) => {
  const validPlayers = [];
  const invalidEntries = [];
  const warnings = [];
  
  for (const scannedPlayer of scannedPlayers) {
    const processed = processPlayerLine(scannedPlayer);
    
    if (processed) {
      // Validate against roster
      const rosterMatch = findPlayerInRoster(processed.name, rosterData);
      
      if (rosterMatch) {
        console.log(`✅ Validated: ${processed.name} (${rosterMatch.team}) - ${processed.prop_type}`);
        validPlayers.push({
          ...processed,
          ...rosterMatch,
          validated: true,
          _rosterMatch: true
        });
      } else {
        console.log(`❌ Invalid: ${processed.name} - not found in roster`);
        invalidEntries.push({
          originalText: `${scannedPlayer.name} - ${scannedPlayer.prop_type}`,
          extractedName: processed.name,
          reason: 'Player not found in roster',
          scannedData: scannedPlayer
        });
      }
    } else {
      console.log(`⚠️ Warning: Could not parse scanned player data`);
      warnings.push(`Could not parse: ${JSON.stringify(scannedPlayer)}`);
    }
  }
  
  return {
    validPlayers,
    invalidEntries, 
    warnings,
    summary: {
      total: scannedPlayers.length,
      valid: validPlayers.length,
      invalid: invalidEntries.length,
      warnings: warnings.length
    }
  };
};

/**
 * Run comprehensive validation tests
 */
const runValidationTests = () => {
  console.log('=== Phase 4 Bet Slip Scanner Validation Tests ===\n');
  
  // Test 1: Basic validation function
  console.log('Test 1: Basic Validation Function');
  const results = validateScannedPlayers(mockScannedPlayers, mockRosterData);
  
  console.log('Validation Results:');
  console.log(`- Total scanned: ${results.summary.total}`);
  console.log(`- Valid players: ${results.summary.valid}`);
  console.log(`- Invalid entries: ${results.summary.invalid}`);
  console.log(`- Warnings: ${results.summary.warnings}\n`);
  
  // Test 2: Verify specific player matching scenarios
  console.log('Test 2: Player Matching Scenarios');
  
  const testCases = [
    { input: 'Pete Alonso', expected: 'Pete Alonso', description: 'Exact match' },
    { input: 'P. Alonso', expected: 'Pete Alonso', description: 'Initial + last name' },
    { input: 'Judge', expected: 'Aaron Judge', description: 'Last name only' },
    { input: 'Ohtani', expected: 'Shohei Ohtani', description: 'Last name only (unique)' },
    { input: 'Fake Player', expected: null, description: 'Invalid player' }
  ];
  
  testCases.forEach((testCase, index) => {
    const match = findPlayerInRoster(testCase.input, mockRosterData);
    const matchedName = match ? match.name : null;
    const passed = matchedName === testCase.expected;
    
    console.log(`  ${index + 1}. ${testCase.description}: ${testCase.input}`);
    console.log(`     Expected: ${testCase.expected || 'null'}`);
    console.log(`     Got: ${matchedName || 'null'}`);
    console.log(`     Result: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  });
  
  // Test 3: Edge cases and error handling
  console.log('Test 3: Edge Cases and Error Handling');
  
  const edgeCases = [
    { players: [], roster: mockRosterData, description: 'Empty scanned players array' },
    { players: mockScannedPlayers, roster: [], description: 'Empty roster data' },
    { players: [{ name: '', prop_type: 'HR' }], roster: mockRosterData, description: 'Empty player name' },
    { players: [{ prop_type: 'HR' }], roster: mockRosterData, description: 'Missing player name' }
  ];
  
  edgeCases.forEach((edgeCase, index) => {
    try {
      const result = validateScannedPlayers(edgeCase.players, edgeCase.roster);
      console.log(`  ${index + 1}. ${edgeCase.description}: ✅ Handled gracefully`);
      console.log(`     Valid: ${result.summary.valid}, Invalid: ${result.summary.invalid}, Warnings: ${result.summary.warnings}\n`);
    } catch (error) {
      console.log(`  ${index + 1}. ${edgeCase.description}: ❌ Error thrown: ${error.message}\n`);
    }
  });
  
  // Test 4: Performance test with larger dataset
  console.log('Test 4: Performance Test');
  const startTime = Date.now();
  
  // Create a larger test dataset
  const largeScannedPlayers = [];
  for (let i = 0; i < 100; i++) {
    largeScannedPlayers.push(...mockScannedPlayers);
  }
  
  const performanceResult = validateScannedPlayers(largeScannedPlayers, mockRosterData);
  const endTime = Date.now();
  
  console.log(`  Processed ${largeScannedPlayers.length} players in ${endTime - startTime}ms`);
  console.log(`  Valid: ${performanceResult.summary.valid}, Invalid: ${performanceResult.summary.invalid}\n`);
  
  // Test 5: Detailed invalid entries analysis
  console.log('Test 5: Invalid Entries Analysis');
  
  if (results.invalidEntries.length > 0) {
    console.log('Invalid entries found:');
    results.invalidEntries.forEach((entry, index) => {
      console.log(`  ${index + 1}. "${entry.originalText}"`);
      console.log(`     Extracted Name: "${entry.extractedName}"`);
      console.log(`     Reason: ${entry.reason}\n`);
    });
  } else {
    console.log('No invalid entries found in test data\n');
  }
  
  // Summary
  console.log('=== Test Summary ===');
  const expectedValid = 6; // Based on our mock data
  const expectedInvalid = 4; // Based on our mock data
  
  const validationPassed = results.summary.valid === expectedValid && results.summary.invalid === expectedInvalid;
  
  console.log(`Expected: ${expectedValid} valid, ${expectedInvalid} invalid`);
  console.log(`Actual: ${results.summary.valid} valid, ${results.summary.invalid} invalid`);
  console.log(`Overall Test Result: ${validationPassed ? '✅ ALL TESTS PASSED' : '❌ TESTS FAILED'}`);
  
  return {
    passed: validationPassed,
    results: results
  };
};

// Export functions for use in other test files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runValidationTests,
    validateScannedPlayers,
    findPlayerInRoster,
    processPlayerLine,
    mockRosterData,
    mockScannedPlayers
  };
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - add to window for manual testing
  window.validationTests = {
    runValidationTests,
    validateScannedPlayers,
    findPlayerInRoster,
    processPlayerLine,
    mockRosterData,
    mockScannedPlayers
  };
  
  // Auto-run tests
  runValidationTests();
} else {
  // Node environment - run tests immediately
  runValidationTests();
}