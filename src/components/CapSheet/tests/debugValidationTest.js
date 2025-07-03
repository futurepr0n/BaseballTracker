/**
 * Debug Test for Phase 4 Validation Logic
 * 
 * This test specifically debugs why certain player matches are failing
 */

// Mock roster data
const mockRosterData = [
  { name: 'Pete Alonso', team: 'NYM', position: '1B' },
  { name: 'Vladimir Guerrero Jr.', team: 'TOR', position: '1B' },
  { name: 'Aaron Judge', team: 'NYY', position: 'RF' },
  { name: 'Francisco Lindor', team: 'NYM', position: 'SS' },
  { name: 'Shohei Ohtani', team: 'LAA', position: 'DH' },
  { name: 'Trea Turner', team: 'PHI', position: 'SS' }
];

// Copy the exact findPlayerInRoster function from CapSheet.js
const findPlayerInRoster = (playerName, rosterData) => {
  if (!playerName || !rosterData) return null;
  
  console.log(`\n🔍 DEBUG: Looking for "${playerName}" in roster`);
  console.log(`📚 Roster contains: ${rosterData.map(p => p.name).join(', ')}`);
  
  // Try exact match first
  let match = rosterData.find(p => 
    p.name.toLowerCase() === playerName.toLowerCase()
  );
  
  if (match) {
    console.log(`✅ EXACT MATCH found: "${match.name}"`);
    return match;
  }
  console.log(`❌ No exact match for "${playerName}"`);
  
  // Try partial match (last name)
  const lastName = playerName.split(' ').pop();
  console.log(`🔍 Trying last name match: "${lastName}"`);
  
  match = rosterData.find(p => 
    p.name.toLowerCase().includes(lastName.toLowerCase())
  );
  
  if (match) {
    console.log(`✅ LAST NAME MATCH found: "${match.name}" contains "${lastName}"`);
    return match;
  }
  console.log(`❌ No last name match for "${lastName}"`);
  
  // Try first initial + last name match (e.g., "P. Alonso" matches "Pete Alonso")
  const nameParts = playerName.split(' ');
  if (nameParts.length >= 2) {
    const firstInitial = nameParts[0].charAt(0).toLowerCase();
    const lastName = nameParts[nameParts.length - 1].toLowerCase();
    
    console.log(`🔍 Trying initial + last name: "${firstInitial}. ${lastName}"`);
    
    match = rosterData.find(p => {
      const rosterParts = p.name.toLowerCase().split(' ');
      if (rosterParts.length >= 2) {
        const rosterFirstInitial = rosterParts[0].charAt(0);
        const rosterLastName = rosterParts[rosterParts.length - 1];
        console.log(`   Comparing "${firstInitial}.${lastName}" vs "${rosterFirstInitial}.${rosterLastName}" (${p.name})`);
        return rosterFirstInitial === firstInitial && rosterLastName === lastName;
      }
      return false;
    });
    
    if (match) {
      console.log(`✅ INITIAL + LAST NAME MATCH found: "${match.name}"`);
      return match;
    }
    console.log(`❌ No initial + last name match for "${firstInitial}. ${lastName}"`);
  }
  
  console.log(`❌ NO MATCH FOUND for "${playerName}"`);
  return null;
};

// Test the problematic cases
const debugTestCases = [
  'P. Alonso',        // Should match Pete Alonso
  'Judge',            // Should match Aaron Judge  
  'F. Lindor',        // Should match Francisco Lindor
  'Ohtani',           // Should match Shohei Ohtani
  'Trea T.',          // Should match Trea Turner (tricky case)
  'Pete Alonso',      // Should match exactly
  'Vladimir Guerrero Jr.', // Should match exactly
  'Fake Player'       // Should NOT match
];

const runDebugTest = () => {
  console.log('=== DEBUG: Player Matching Logic ===\n');
  
  debugTestCases.forEach((testName, index) => {
    console.log(`\n--- Test ${index + 1}: "${testName}" ---`);
    const result = findPlayerInRoster(testName, mockRosterData);
    console.log(`FINAL RESULT: ${result ? `FOUND "${result.name}"` : 'NOT FOUND'}`);
  });
  
  // Let's also test the edge case logic manually
  console.log('\n\n=== MANUAL DEBUG: Edge Cases ===');
  
  // Test "Trea T." specifically
  console.log('\n--- Special case: "Trea T." should match "Trea Turner" ---');
  const treaParts = 'Trea T.'.split(' ');
  console.log(`Parts: ${JSON.stringify(treaParts)}`);
  
  if (treaParts.length >= 2) {
    const firstPart = treaParts[0]; // "Trea"
    const secondPart = treaParts[1]; // "T."
    
    console.log(`First part: "${firstPart}"`);
    console.log(`Second part: "${secondPart}"`);
    
    // Check if this is "First name + initial" format
    if (secondPart.endsWith('.') && secondPart.length === 2) {
      const lastInitial = secondPart.charAt(0).toLowerCase();
      console.log(`This appears to be "First name + last initial" format`);
      console.log(`Looking for first name "${firstPart}" and last initial "${lastInitial}"`);
      
      // Look for a match
      const match = mockRosterData.find(p => {
        const rosterParts = p.name.toLowerCase().split(' ');
        if (rosterParts.length >= 2) {
          const rosterFirstName = rosterParts[0];
          const rosterLastInitial = rosterParts[rosterParts.length - 1].charAt(0);
          console.log(`   Checking "${p.name}": first="${rosterFirstName}" vs "${firstPart.toLowerCase()}", last initial="${rosterLastInitial}" vs "${lastInitial}"`);
          return rosterFirstName === firstPart.toLowerCase() && rosterLastInitial === lastInitial;
        }
        return false;
      });
      
      console.log(`Match found: ${match ? match.name : 'none'}`);
    }
  }
  
  console.log('\n=== IMPROVED MATCHING ALGORITHM ===');
  
  // Let's design a better matching algorithm
  const improvedFindPlayerInRoster = (playerName, rosterData) => {
    if (!playerName || !rosterData) return null;
    
    console.log(`\n🔧 IMPROVED: Looking for "${playerName}"`);
    
    // Normalize the input
    const normalizedInput = playerName.toLowerCase().trim();
    
    // Try exact match first
    let match = rosterData.find(p => 
      p.name.toLowerCase() === normalizedInput
    );
    if (match) {
      console.log(`✅ EXACT: "${match.name}"`);
      return match;
    }
    
    const inputParts = normalizedInput.split(' ').filter(part => part.length > 0);
    
    // Strategy 1: Last name only
    if (inputParts.length === 1) {
      const searchTerm = inputParts[0];
      match = rosterData.find(p => {
        const rosterParts = p.name.toLowerCase().split(' ');
        return rosterParts[rosterParts.length - 1] === searchTerm;
      });
      if (match) {
        console.log(`✅ LAST NAME: "${match.name}" (searched: "${searchTerm}")`);
        return match;
      }
    }
    
    // Strategy 2: First initial + Last name (e.g., "P. Alonso")
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
      if (match) {
        console.log(`✅ INITIAL+LAST: "${match.name}" (searched: "${firstInitial}. ${lastName}")`);
        return match;
      }
    }
    
    // Strategy 3: First name + Last initial (e.g., "Trea T.")
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
      if (match) {
        console.log(`✅ FIRST+INITIAL: "${match.name}" (searched: "${firstName} ${lastInitial}.")`);
        return match;
      }
    }
    
    // Strategy 4: Partial matches (contains)
    if (inputParts.length === 1) {
      const searchTerm = inputParts[0];
      match = rosterData.find(p => 
        p.name.toLowerCase().includes(searchTerm)
      );
      if (match) {
        console.log(`✅ PARTIAL: "${match.name}" (contains: "${searchTerm}")`);
        return match;
      }
    }
    
    console.log(`❌ NO MATCH: "${playerName}"`);
    return null;
  };
  
  // Test the improved algorithm
  console.log('\n--- Testing Improved Algorithm ---');
  debugTestCases.forEach((testName, index) => {
    console.log(`\nImproved Test ${index + 1}: "${testName}"`);
    const result = improvedFindPlayerInRoster(testName, mockRosterData);
    console.log(`RESULT: ${result ? `FOUND "${result.name}"` : 'NOT FOUND'}`);
  });
};

// Export for potential use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runDebugTest,
    findPlayerInRoster,
    debugTestCases,
    mockRosterData
  };
}

// Run debug test
runDebugTest();