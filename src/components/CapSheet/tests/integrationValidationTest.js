/**
 * Integration Test for Phase 4 Bet Slip Scanner Validation
 * 
 * This test simulates the complete end-to-end flow from scanning results
 * to validation and UI display, ensuring the entire validation system works correctly.
 */

// Mock roster data (same as validation test but more complete)
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
  { name: 'Jose Altuve', team: 'HOU', position: '2B' },
  { name: 'Francisco Lindor', team: 'NYM', position: 'SS' },
  { name: 'Trea Turner', team: 'PHI', position: 'SS' },
  { name: 'Freddie Freeman', team: 'LAD', position: '1B' },
  { name: 'Kyle Tucker', team: 'HOU', position: 'OF' },
  { name: 'George Springer', team: 'TOR', position: 'OF' }
];

// Mock scan API response (what would come from the bet slip scanner)
const mockScanApiResponse = {
  success: true,
  player_data: [
    // Valid players that should pass validation
    { name: 'Pete Alonso', team: 'NYM', prop_type: 'HR', line: '0.5', odds: '+150' },
    { name: 'Vladimir Guerrero Jr.', team: 'TOR', prop_type: 'H', line: '1.5', odds: '-110' },
    { name: 'P. Alonso', team: 'NYM', prop_type: 'B', line: '2.5', odds: '+120' }, // Initial format
    { name: 'Judge', team: 'NYY', prop_type: 'HR', line: '0.5', odds: '+200' }, // Last name only
    { name: 'F. Lindor', team: 'NYM', prop_type: 'H', line: '1.5', odds: '-105' }, // Initial format
    
    // Invalid players that should fail validation
    { name: 'John Fake Player', team: 'NYM', prop_type: 'HR', line: '0.5', odds: '+150' },
    { name: 'Pete Smith', team: 'BOS', prop_type: 'H', line: '1.5', odds: '-110' },
    { name: 'Invalid Player', team: 'XXX', prop_type: 'B', line: '2.5', odds: '+120' },
    
    // Edge cases
    { name: 'Ohtani', team: 'LAA', prop_type: 'HR', line: '0.5', odds: '+180' }, // Last name only (valid)
    { name: 'Trea T.', team: 'PHI', prop_type: 'H', line: '1.5', odds: '-105' }, // First name + initial
  ]
};

// Import/copy the validation functions from CapSheet.js
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

const findPlayerInRoster = (playerName, rosterData) => {
  if (!playerName || !rosterData) return null;
  
  // Normalize the input
  const normalizedInput = playerName.toLowerCase().trim();
  
  // Try exact match first
  let match = rosterData.find(p => 
    p.name.toLowerCase() === normalizedInput
  );
  
  if (match) {
    return match;
  }
  
  const inputParts = normalizedInput.split(' ').filter(part => part.length > 0);
  
  // Strategy 1: Last name only (e.g., "Judge" → "Aaron Judge")
  if (inputParts.length === 1) {
    const searchTerm = inputParts[0];
    match = rosterData.find(p => {
      const rosterParts = p.name.toLowerCase().split(' ');
      return rosterParts[rosterParts.length - 1] === searchTerm;
    });
    if (match) return match;
  }
  
  // Strategy 2: First initial + Last name (e.g., "P. Alonso" → "Pete Alonso")
  if (inputParts.length === 2 && inputParts[0].endsWith('.')) {
    const firstInitial = inputParts[0].charAt(0);
    const lastName = inputParts[1];
    
    match = rosterData.find(p => {
      const rosterParts = p.name.toLowerCase().split(' ');
      if (rosterParts.length >= 2) {
        const rosterFirstInitial = rosterParts[0].charAt(0);
        const rosterLastName = rosterParts[rosterParts.length - 1];
        return rosterFirstInitial === firstInitial && rosterLastName === lastName;
      }
      return false;
    });
    if (match) return match;
  }
  
  // Strategy 3: First name + Last initial (e.g., "Trea T." → "Trea Turner")
  if (inputParts.length === 2 && inputParts[1].endsWith('.') && inputParts[1].length === 2) {
    const firstName = inputParts[0];
    const lastInitial = inputParts[1].charAt(0);
    
    match = rosterData.find(p => {
      const rosterParts = p.name.toLowerCase().split(' ');
      if (rosterParts.length >= 2) {
        const rosterFirstName = rosterParts[0];
        const rosterLastInitial = rosterParts[rosterParts.length - 1].charAt(0);
        return rosterFirstName === firstName && rosterLastInitial === lastInitial;
      }
      return false;
    });
    if (match) return match;
  }
  
  // Strategy 4: Partial match fallback (last name contains)
  if (inputParts.length === 1) {
    const searchTerm = inputParts[0];
    match = rosterData.find(p => 
      p.name.toLowerCase().includes(searchTerm)
    );
    if (match) return match;
  }
  
  return null;
};

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
        validPlayers.push({
          ...processed,
          ...rosterMatch,
          validated: true,
          _rosterMatch: true
        });
      } else {
        invalidEntries.push({
          originalText: `${scannedPlayer.name} - ${scannedPlayer.prop_type}`,
          extractedName: processed.name,
          reason: 'Player not found in roster',
          scannedData: scannedPlayer
        });
      }
    } else {
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

// Mock CapSheet state and functions
const mockCapSheetState = {
  selectedPlayers: {
    hitters: [],
    pitchers: []
  },
  hitterSelectOptions: [
    { label: 'Pete Alonso (NYM)', value: 'pete-alonso-nym-1' },
    { label: 'Vladimir Guerrero Jr. (TOR)', value: 'vlad-guerrero-tor-1' },
    { label: 'Aaron Judge (NYY)', value: 'aaron-judge-nyy-1' },
    { label: 'Francisco Lindor (NYM)', value: 'francisco-lindor-nym-1' },
    { label: 'Shohei Ohtani (LAA)', value: 'shohei-ohtani-laa-1' },
    { label: 'Trea Turner (PHI)', value: 'trea-turner-phi-1' }
  ]
};

// Mock the handleScanComplete function behavior
const simulateHandleScanComplete = async (scanResults) => {
  console.log('=== Simulating handleScanComplete Flow ===');
  
  // Step 1: Fetch roster data (simulated)
  console.log('1. Fetching roster data...');
  const rosterData = mockRosterData; // In real app, this would be await fetchRosterData()
  console.log(`   ✅ Loaded ${rosterData.length} roster entries`);
  
  // Step 2: Validate scanned players
  console.log('\n2. Validating scanned players...');
  const validatedResults = validateScannedPlayers(scanResults.player_data, rosterData);
  console.log(`   ✅ Validation complete: ${validatedResults.validPlayers.length} valid, ${validatedResults.invalidEntries.length} invalid`);
  
  // Step 3: Update scan results with validation information
  console.log('\n3. Enhancing scan results with validation...');
  const enhancedResults = {
    ...scanResults,
    validationSummary: validatedResults.summary,
    validPlayers: validatedResults.validPlayers,
    invalidEntries: validatedResults.invalidEntries,
    warnings: validatedResults.warnings
  };
  
  // Step 4: Process only validated players
  console.log('\n4. Processing validated players...');
  const matchResults = { 
    matched: 0, 
    added: 0, 
    total: scanResults.player_data.length,
    validated: validatedResults.validPlayers.length,
    invalid: validatedResults.invalidEntries.length
  };
  
  const processedPlayers = [];
  
  for (const validPlayer of validatedResults.validPlayers) {
    console.log(`   Processing: ${validPlayer.name} - ${validPlayer.prop_type}`);
    
    // Simulate finding best player match in hitter options
    const match = mockCapSheetState.hitterSelectOptions.find(option => 
      option.label.toLowerCase().includes(validPlayer.name.toLowerCase()) ||
      option.label.toLowerCase().includes(validPlayer.name.split(' ').pop().toLowerCase())
    );
    
    if (match) {
      matchResults.matched++;
      matchResults.added++;
      processedPlayers.push({
        id: match.value,
        name: validPlayer.name,
        team: validPlayer.team,
        prop_type: validPlayer.prop_type,
        matched: true,
        validated: true
      });
      console.log(`     ✅ Matched and will be added: ${match.label}`);
    } else {
      matchResults.added++;
      processedPlayers.push({
        id: `scanned-${validPlayer.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${Date.now()}`,
        name: validPlayer.name,
        team: validPlayer.team,
        prop_type: validPlayer.prop_type,
        matched: false,
        validated: true
      });
      console.log(`     ⚠️ No match found, creating new player entry`);
    }
  }
  
  // Step 5: Update final results
  enhancedResults.matchStats = matchResults;
  enhancedResults.processedPlayers = processedPlayers;
  
  console.log('\n5. Final Results:');
  console.log(`   📊 Total scanned: ${matchResults.total}`);
  console.log(`   ✅ Valid players: ${matchResults.validated}`);
  console.log(`   ❌ Invalid entries: ${matchResults.invalid}`);
  console.log(`   🎯 Matched with existing options: ${matchResults.matched}`);
  console.log(`   ➕ Total added to CapSheet: ${matchResults.added}`);
  
  return enhancedResults;
};

// Test the complete integration flow
const runIntegrationTest = async () => {
  console.log('=== Phase 4 Integration Test: Complete Validation Flow ===\n');
  
  console.log('📋 Test Scenario: Scanning bet slip with mixed valid/invalid players');
  console.log(`📊 Mock scan contains ${mockScanApiResponse.player_data.length} players`);
  console.log(`📚 Roster contains ${mockRosterData.length} players\n`);
  
  try {
    // Simulate the complete scan and validation flow
    const finalResults = await simulateHandleScanComplete(mockScanApiResponse);
    
    // Verify the results
    console.log('\n=== Verification ===');
    
    const expectedValid = 7; // Based on our mock data: Pete Alonso, Vladimir Guerrero Jr., P. Alonso, Judge, F. Lindor, Ohtani, Trea T.
    const expectedInvalid = 3; // Based on our mock data: John Fake Player, Pete Smith, Invalid Player
    
    const validationCorrect = finalResults.validationSummary.valid === expectedValid && 
                             finalResults.validationSummary.invalid === expectedInvalid;
    
    console.log(`Expected: ${expectedValid} valid, ${expectedInvalid} invalid`);
    console.log(`Actual: ${finalResults.validationSummary.valid} valid, ${finalResults.validationSummary.invalid} invalid`);
    console.log(`Validation Logic: ${validationCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
    
    // Test that invalid entries are properly captured
    const invalidEntriesCorrect = finalResults.invalidEntries.length === expectedInvalid;
    console.log(`Invalid Entries Captured: ${invalidEntriesCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
    
    // Test that only valid players are processed
    const onlyValidProcessed = finalResults.processedPlayers.every(p => p.validated === true);
    console.log(`Only Valid Players Processed: ${onlyValidProcessed ? '✅ CORRECT' : '❌ INCORRECT'}`);
    
    // Test UI data structure
    const hasUIData = finalResults.validationSummary && finalResults.invalidEntries && finalResults.matchStats;
    console.log(`UI Data Structure Complete: ${hasUIData ? '✅ CORRECT' : '❌ INCORRECT'}`);
    
    // Test specific player validations
    console.log('\n--- Detailed Player Validation Results ---');
    
    // Use the exact names from our mock scan data
    const testCases = [
      { input: 'Pete Alonso', expected: true, description: 'Exact name match' },
      { input: 'Vladimir Guerrero Jr.', expected: true, description: 'Exact name match (with Jr.)' },
      { input: 'P. Alonso', expected: true, description: 'Initial + last name' },
      { input: 'Judge', expected: true, description: 'Last name only' },
      { input: 'F. Lindor', expected: true, description: 'Initial + last name (Francisco)' },
      { input: 'John Fake Player', expected: false, description: 'Invalid player' },
      { input: 'Pete Smith', expected: false, description: 'Wrong team/player' },
      { input: 'Invalid Player', expected: false, description: 'Completely invalid' },
      { input: 'Ohtani', expected: true, description: 'Last name only (unique)' },
      { input: 'Trea T.', expected: true, description: 'First name + initial' }
    ];
    
    let playerTestsPassed = 0;
    
    testCases.forEach((testCase, index) => {
      const wasValidated = finalResults.validPlayers.some(p => p.name === testCase.input);
      const wasRejected = finalResults.invalidEntries.some(e => e.extractedName === testCase.input);
      const actualResult = wasValidated && !wasRejected;
      const passed = actualResult === testCase.expected;
      
      console.log(`  ${index + 1}. ${testCase.description}: "${testCase.input}"`);
      console.log(`     Expected: ${testCase.expected ? 'Valid' : 'Invalid'}`);
      console.log(`     Result: ${actualResult ? 'Valid' : 'Invalid'} ${passed ? '✅' : '❌'}`);
      
      if (passed) playerTestsPassed++;
    });
    
    const playerTestsCorrect = playerTestsPassed === testCases.length;
    console.log(`\nPlayer Validation Tests: ${playerTestsPassed}/${testCases.length} passed ${playerTestsCorrect ? '✅' : '❌'}`);
    
    // Overall test result
    const allTestsPassed = validationCorrect && invalidEntriesCorrect && onlyValidProcessed && hasUIData && playerTestsCorrect;
    
    console.log('\n=== Integration Test Summary ===');
    console.log(`✅ Validation Logic: ${validationCorrect}`);
    console.log(`✅ Invalid Entries: ${invalidEntriesCorrect}`);
    console.log(`✅ Valid Only Processing: ${onlyValidProcessed}`);
    console.log(`✅ UI Data Structure: ${hasUIData}`);
    console.log(`✅ Player Tests: ${playerTestsCorrect}`);
    console.log(`\n🏆 Overall Result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    // Show invalid entries for review
    if (finalResults.invalidEntries.length > 0) {
      console.log('\n--- Invalid Entries for Manual Review ---');
      finalResults.invalidEntries.forEach((entry, index) => {
        console.log(`  ${index + 1}. "${entry.originalText}"`);
        console.log(`     Reason: ${entry.reason}`);
        console.log(`     Extracted: "${entry.extractedName}"`);
      });
    }
    
    return {
      passed: allTestsPassed,
      results: finalResults,
      stats: {
        totalTests: testCases.length + 4, // player tests + 4 main tests
        passedTests: playerTestsPassed + [validationCorrect, invalidEntriesCorrect, onlyValidProcessed, hasUIData].filter(Boolean).length
      }
    };
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    return {
      passed: false,
      error: error.message
    };
  }
};

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runIntegrationTest,
    simulateHandleScanComplete,
    mockScanApiResponse,
    mockRosterData
  };
}

// Run test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.integrationValidationTest = {
    runIntegrationTest,
    simulateHandleScanComplete,
    mockScanApiResponse,
    mockRosterData
  };
  
  runIntegrationTest();
} else {
  // Node environment
  runIntegrationTest();
}