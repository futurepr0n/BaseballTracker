// Test for Enhanced Handedness Lookup System - ES Module version
// This test verifies that the handedness service can correctly match abbreviated names

import { getPlayerHandedness } from './src/services/handednessService.js';

// Test data
const testPlayers = [
    { display: "A. García", expected: "García, Adolis", team: "TEX" },
    { display: "Adolis García", expected: "García, Adolis", team: "TEX" },
    { display: "García, Adolis", expected: "García, Adolis", team: "TEX" },
    { display: "M. Olson", expected: "Olson, Matt", team: "ATL" },
    { display: "Matt Olson", expected: "Olson, Matt", team: "ATL" }
];

console.log("=== Enhanced Handedness Lookup Test ===\n");

// Run tests using the actual service
async function runTests() {
    for (const testCase of testPlayers) {
        console.log(`Testing: "${testCase.display}" (Team: ${testCase.team})`);
        console.log("Expected to match: " + testCase.expected);
        
        try {
            const result = await getPlayerHandedness(testCase.display, testCase.team);
            
            console.log(`Results:`);
            console.log(`  - Input: ${testCase.display}`);
            console.log(`  - Team: ${testCase.team}`);
            console.log(`  - Found: ${result ? '✓' : '✗'}`);
            
            if (result) {
                console.log(`  - Matched Name: ${result.matchedName}`);
                console.log(`  - Bats: ${result.bats}`);
                console.log(`  - Throws: ${result.throws}`);
                console.log(`  - Source: ${result.source}`);
                
                if (result.swingPath) {
                    console.log(`  - Swing Path Data:`);
                    console.log(`    - Avg Bat Speed: ${result.swingPath.avgBatSpeed?.toFixed(1)} mph`);
                    console.log(`    - Attack Angle: ${result.swingPath.attackAngle?.toFixed(1)}°`);
                    console.log(`    - Ideal Rate: ${(result.swingPath.idealAttackAngleRate * 100)?.toFixed(1)}%`);
                    console.log(`    - Competitive Swings: ${result.swingPath.competitiveSwings}`);
                }
            }
            
        } catch (error) {
            console.log(`  - Error: ${error.message}`);
        }
        
        console.log("-".repeat(50) + "\n");
    }
}

// Test 5: Manual verification instructions
console.log("Manual Testing Instructions:");
console.log("1. Start the React app with: npm start");
console.log("2. Navigate to Pinheads Playhouse");
console.log("3. Find a game with Adolis García");
console.log("4. Look for console logs showing handedness lookup process");
console.log("5. Verify the BarrelMatchupCard shows swing path data");
console.log("6. Check that both 'A. García' and 'Adolis García' work\n");

// Run the tests
runTests().catch(console.error);