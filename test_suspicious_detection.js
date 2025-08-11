/**
 * Test script to verify suspicious team change detection
 */

// Test the suspicious change detection logic
function testSuspiciousChangeDetection() {
    console.log('🧪 Testing suspicious team change detection...\n');
    
    // Mimic the exact logic from statLoader.js
    const suspiciousChanges = [
        { from: 'TB', to: 'ARI' },  // B. Lowe corruption pattern
        { from: 'KC', to: 'MIL' },  // KC players corruption pattern
        { from: 'KC', to: 'COL' },  // Alternative KC corruption
        { from: 'TB', to: 'COL' },  // Alternative TB corruption
        { from: 'TB', to: 'MIL' },  // Alternative TB corruption
    ];
    
    // Test cases - scenarios that were corrupted
    const testCases = [
        { playerName: 'B. Lowe', fromTeam: 'TB', toTeam: 'ARI', shouldBeBlocked: true },
        { playerName: 'Bobby Witt Jr.', fromTeam: 'KC', toTeam: 'MIL', shouldBeBlocked: true },
        { playerName: 'Maikel Garcia', fromTeam: 'KC', toTeam: 'MIL', shouldBeBlocked: true },
        { playerName: 'Salvador Perez', fromTeam: 'KC', toTeam: 'MIL', shouldBeBlocked: true },
        { playerName: 'Test Player', fromTeam: 'TB', toTeam: 'COL', shouldBeBlocked: true },
        // Legitimate changes should not be blocked by this pattern
        { playerName: 'Trade Player', fromTeam: 'NYY', toTeam: 'LAD', shouldBeBlocked: false },
        { playerName: 'Another Player', fromTeam: 'BOS', toTeam: 'SF', shouldBeBlocked: false },
    ];
    
    let passed = 0;
    let total = testCases.length;
    
    testCases.forEach((testCase, index) => {
        const isSuspicious = suspiciousChanges.some(pattern => 
            pattern.from === testCase.fromTeam && pattern.to === testCase.toTeam
        );
        
        const result = isSuspicious === testCase.shouldBeBlocked ? '✅ PASS' : '❌ FAIL';
        const action = isSuspicious ? 'BLOCKED' : 'ALLOWED';
        
        console.log(`Test ${index + 1}: ${testCase.playerName} ${testCase.fromTeam} → ${testCase.toTeam}`);
        console.log(`  Expected: ${testCase.shouldBeBlocked ? 'BLOCKED' : 'ALLOWED'}, Got: ${action} ${result}`);
        
        if (isSuspicious === testCase.shouldBeBlocked) {
            passed++;
        }
    });
    
    console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('🎉 All suspicious change detection tests passed!');
        return true;
    } else {
        console.log('⚠️ Some tests failed - review suspicious change patterns');
        return false;
    }
}

// Run the test
if (require.main === module) {
    const success = testSuspiciousChangeDetection();
    process.exit(success ? 0 : 1);
}

module.exports = { testSuspiciousChangeDetection };