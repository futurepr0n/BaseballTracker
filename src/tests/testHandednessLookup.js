// Test for Enhanced Handedness Lookup System
// This test verifies that the handedness service can correctly match abbreviated names
// like "A. García" to full names like "García, Adolis" using the roster lookup

const fs = require('fs');
const path = require('path');

// Import the handedness service
import { getPlayerHandedness } from '../services/handednessService.js';

// Use dynamic import to work with ES modules
async function testHandednessLookup(playerName, teamAbbr) {
    console.log(`Testing handedness lookup for: ${playerName} (${teamAbbr})`);
    
    try {
        // Use the actual service function
        const result = await getPlayerHandedness(playerName, teamAbbr);
        
        return {
            inputName: playerName,
            team: teamAbbr,
            foundInRoster: result ? true : false,
            foundInHandedness: result ? true : false,
            handednessData: result,
            bats: result?.bats,
            throws: result?.throws,
            swingPath: result?.swingPath,
            matchedName: result?.matchedName,
            source: result?.source
        };
    } catch (error) {
        console.error('Error in test:', error);
        return {
            inputName: playerName,
            team: teamAbbr,
            foundInRoster: false,
            foundInHandedness: false,
            handednessData: null,
            error: error.message
        };
    }
}

// Test data
const testPlayers = [
    { display: "A. García", expected: "García, Adolis", team: "TEX" },
    { display: "Adolis García", expected: "García, Adolis", team: "TEX" },
    { display: "García, Adolis", expected: "García, Adolis", team: "TEX" },
    { display: "M. Olson", expected: "Olson, Matt", team: "ATL" },
    { display: "Matt Olson", expected: "Olson, Matt", team: "ATL" }
];

console.log("=== Enhanced Handedness Lookup Test ===\n");

// Test 1: Verify roster data exists
console.log("Test 1: Checking roster data availability...");
const rosterPath = path.join(__dirname, '../../public/data/2024/rosters/mlb_rosters_2024.json');
if (fs.existsSync(rosterPath)) {
    const rosterData = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
    console.log(`✓ Roster data found with ${Object.keys(rosterData).length} teams`);
    
    // Check for specific player
    if (rosterData.TEX) {
        const garciaInRoster = rosterData.TEX.find(p => 
            p.name.includes('García') && p.name.includes('Adolis')
        );
        if (garciaInRoster) {
            console.log(`✓ Found Adolis García in TEX roster: ${garciaInRoster.name}`);
        }
    }
} else {
    console.log("✗ Roster data not found at expected location");
}

// Test 2: Verify handedness data exists
console.log("\nTest 2: Checking handedness data availability...");
const handednessPath = path.join(__dirname, '../../public/data/handedness/mlb_handedness_2024.json');
if (fs.existsSync(handednessPath)) {
    const handednessData = JSON.parse(fs.readFileSync(handednessPath, 'utf8'));
    const playerCount = Object.keys(handednessData).length;
    console.log(`✓ Handedness data found with ${playerCount} players`);
    
    // Check for specific player formats
    const garciaEntries = Object.keys(handednessData).filter(name => 
        name.includes('García')
    );
    console.log(`✓ Found ${garciaEntries.length} García entries:`, garciaEntries.slice(0, 5));
} else {
    console.log("✗ Handedness data not found at expected location");
}

// Test 3: Test the handedness lookup function
console.log("\nTest 3: Testing handedness lookup for various name formats...\n");

async function runTests() {
    for (const testCase of testPlayers) {
        console.log(`Testing: "${testCase.display}" (Team: ${testCase.team})`);
        console.log("Expected to match: " + testCase.expected);
        
        const result = await testHandednessLookup(testCase.display, testCase.team);
        
        console.log(`Results:`);
        console.log(`  - Input: ${result.inputName}`);
        console.log(`  - Full Name from Roster: ${result.fullName || 'Not found'}`);
        console.log(`  - Found in Roster: ${result.foundInRoster ? '✓' : '✗'}`);
        console.log(`  - Found in Handedness: ${result.foundInHandedness ? '✓' : '✗'}`);
        
        if (result.handednessData) {
            console.log(`  - Handedness Data:`);
            console.log(`    - Bats: ${result.handednessData.bats || 'N/A'}`);
            console.log(`    - Throws: ${result.handednessData.throws || 'N/A'}`);
            if (result.handednessData.swingPath) {
                console.log(`    - Swing Path: ${result.handednessData.swingPath}`);
            }
        }
        
        console.log("-".repeat(50) + "\n");
    }
}

// Test 4: Test the matching logic directly
console.log("\nTest 4: Testing name matching logic...\n");

function testNameMatching() {
    // Simulate the matching logic
    const testName = "A. García";
    const rosterName = "García, Adolis";
    
    console.log(`Direct match test: "${testName}" vs "${rosterName}"`);
    
    // Test various matching strategies
    const strategies = [
        {
            name: "Exact match",
            test: () => testName === rosterName
        },
        {
            name: "Case-insensitive match",
            test: () => testName.toLowerCase() === rosterName.toLowerCase()
        },
        {
            name: "Last name + first initial match",
            test: () => {
                const displayParts = testName.split(' ');
                const firstInitial = displayParts[0].replace('.', '');
                const lastName = displayParts[1];
                
                const rosterParts = rosterName.split(', ');
                const rosterLast = rosterParts[0];
                const rosterFirst = rosterParts[1];
                
                return lastName === rosterLast && 
                       rosterFirst && 
                       rosterFirst.charAt(0) === firstInitial;
            }
        }
    ];
    
    strategies.forEach(strategy => {
        const result = strategy.test();
        console.log(`  ${strategy.name}: ${result ? '✓' : '✗'}`);
    });
}

// Run all tests
async function runAllTests() {
    testNameMatching();
    console.log("\n" + "=".repeat(50) + "\n");
    await runTests();
    
    // Test 5: Check if the service is actually being used in the app
    console.log("\nTest 5: Integration check...");
    console.log("To verify the BarrelMatchupCard is using the service:");
    console.log("1. Start the app with: npm start");
    console.log("2. Navigate to Pinheads Playhouse");
    console.log("3. Look for a game with Adolis García");
    console.log("4. Check the browser console for handedness lookup logs");
    console.log("5. Verify the card shows swing path data");
    
    // Clean up
    delete process.env.DEBUG_HANDEDNESS;
}

// Execute tests
runAllTests().catch(console.error);