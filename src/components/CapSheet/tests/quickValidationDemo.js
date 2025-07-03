/**
 * Quick Validation Demo - Shows Phase 4 validation working
 * 
 * This is a simple demonstration that can be run to quickly verify
 * the validation system is working as intended.
 */

// Sample roster data
const sampleRoster = [
  { name: 'Pete Alonso', team: 'NYM' },
  { name: 'Aaron Judge', team: 'NYY' },
  { name: 'Vladimir Guerrero Jr.', team: 'TOR' },
  { name: 'Shohei Ohtani', team: 'LAA' },
  { name: 'Francisco Lindor', team: 'NYM' },
  { name: 'Trea Turner', team: 'PHI' }
];

// Sample scanned bet slip data
const sampleScannedData = [
  { name: 'Pete Alonso', prop_type: 'HR', odds: '+150' },      // ✅ Should be valid
  { name: 'P. Alonso', prop_type: 'H', odds: '-110' },        // ✅ Should be valid (initial format)
  { name: 'Judge', prop_type: 'HR', odds: '+200' },           // ✅ Should be valid (last name only)
  { name: 'Trea T.', prop_type: 'H', odds: '-105' },          // ✅ Should be valid (first + initial)
  { name: 'Fake Player', prop_type: 'HR', odds: '+150' },     // ❌ Should be invalid
  { name: 'John Smith', prop_type: 'H', odds: '-110' }        // ❌ Should be invalid
];

// Import the improved validation logic
const findPlayerInRoster = (playerName, rosterData) => {
  if (!playerName || !rosterData) return null;
  
  const normalizedInput = playerName.toLowerCase().trim();
  
  // Exact match
  let match = rosterData.find(p => p.name.toLowerCase() === normalizedInput);
  if (match) return match;
  
  const inputParts = normalizedInput.split(' ').filter(part => part.length > 0);
  
  // Last name only
  if (inputParts.length === 1) {
    const searchTerm = inputParts[0];
    match = rosterData.find(p => {
      const rosterParts = p.name.toLowerCase().split(' ');
      return rosterParts[rosterParts.length - 1] === searchTerm;
    });
    if (match) return match;
  }
  
  // First initial + Last name
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
  
  // First name + Last initial  
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
  
  return null;
};

const validateDemo = () => {
  console.log('🎯 Phase 4 Validation Demo\n');
  console.log('📚 Roster Players:', sampleRoster.map(p => p.name).join(', '));
  console.log('📋 Scanned Players:', sampleScannedData.length);
  console.log('\n--- Validation Results ---\n');
  
  let validCount = 0;
  let invalidCount = 0;
  
  sampleScannedData.forEach((player, index) => {
    const match = findPlayerInRoster(player.name, sampleRoster);
    const isValid = match !== null;
    
    if (isValid) {
      validCount++;
      console.log(`${index + 1}. ✅ "${player.name}" → "${match.name}" (${match.team}) - ${player.prop_type}`);
    } else {
      invalidCount++;
      console.log(`${index + 1}. ❌ "${player.name}" → NOT FOUND - ${player.prop_type}`);
    }
  });
  
  console.log('\n--- Summary ---');
  console.log(`✅ Valid: ${validCount}/${sampleScannedData.length}`);
  console.log(`❌ Invalid: ${invalidCount}/${sampleScannedData.length}`);
  console.log(`📊 Success Rate: ${Math.round(validCount/sampleScannedData.length*100)}%`);
  
  // Expected: 4 valid (Pete Alonso, P. Alonso, Judge, Trea T.), 2 invalid (Fake Player, John Smith)
  const expectedValid = 4;
  const expectedInvalid = 2;
  
  if (validCount === expectedValid && invalidCount === expectedInvalid) {
    console.log('\n🎉 DEMO PASSED: Validation working correctly!');
  } else {
    console.log(`\n❌ DEMO FAILED: Expected ${expectedValid} valid, ${expectedInvalid} invalid`);
  }
};

// Run the demo
validateDemo();

module.exports = { validateDemo, findPlayerInRoster, sampleRoster, sampleScannedData };