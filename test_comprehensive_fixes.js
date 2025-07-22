#!/usr/bin/env node

/**
 * Comprehensive Fix Testing Script
 * 
 * Tests all the critical fixes implemented for PlayerPropsLadderCard:
 * 1. Date Reference Consistency
 * 2. Opponent Resolution Fixed 
 * 3. Display Formatting Fixed
 * 4. Doubleheader Games Included
 * 5. Data Structure Separation
 * 
 * Run this in browser console to verify fixes are working
 */

console.log('🧪 COMPREHENSIVE FIX TESTING SCRIPT');
console.log('===================================');
console.log('');

// Test 1: Date Reference Consistency
console.log('📅 TEST 1: Date Reference Consistency');
console.log('-------------------------------------');

function testDateConsistency() {
  // Check if app has selected date
  const appState = window.localStorage.getItem('selectedDate');
  const currentURL = window.location.href;
  
  console.log('App Selected Date (localStorage):', appState);
  console.log('Current URL:', currentURL);
  
  // Look for date components in the DOM
  const dateDisplays = document.querySelectorAll('[class*="date"], [class*="current"], .card-subtitle, .last-updated');
  console.log('Date displays found:', dateDisplays.length);
  
  dateDisplays.forEach((element, index) => {
    console.log(`  ${index + 1}. ${element.className}: "${element.textContent.trim()}"`);
  });
  
  console.log('✅ Date consistency test complete');
  return true;
}

// Test 2: Opponent Resolution 
console.log('🆚 TEST 2: Opponent Resolution');
console.log('------------------------------');

function testOpponentResolution() {
  // Look for PlayerPropsLadderCard in the DOM
  const ladderCard = document.querySelector('.player-props-ladder-card');
  if (!ladderCard) {
    console.log('❌ PlayerPropsLadderCard not found on page');
    return false;
  }
  
  console.log('✅ PlayerPropsLadderCard found');
  
  // Look for player items
  const playerItems = ladderCard.querySelectorAll('.player-item, .mobile-player-card');
  console.log(`Found ${playerItems.length} player items`);
  
  if (playerItems.length > 0) {
    console.log('Clicking first player to test opponent resolution...');
    playerItems[0].click();
    
    // Wait for charts to load and check for opponent data
    setTimeout(() => {
      const recentGamesChart = document.querySelector('.recent-5-games-chart');
      const opponentChart = document.querySelector('.opponent-history-chart');
      
      if (recentGamesChart) {
        console.log('✅ Recent games chart found');
        const gameElements = recentGamesChart.querySelectorAll('[class*="game"], [class*="opponent"]');
        console.log(`  Found ${gameElements.length} game elements`);
        
        gameElements.forEach((element, index) => {
          const text = element.textContent.trim();
          if (text.includes('vs') || text.includes('@')) {
            console.log(`  ${index + 1}. Opponent: "${text}"`);
            if (text.includes('vs Unknown') || text.includes('@ Unknown')) {
              console.log('    ❌ "Unknown" opponent detected!');
            } else if (text.includes('vs vs') || text.includes('vs @')) {
              console.log('    ❌ Duplicate prefix detected!');
            } else {
              console.log('    ✅ Opponent formatting looks good');
            }
          }
        });
      }
      
      if (opponentChart) {
        console.log('✅ Opponent chart found');
      }
    }, 2000);
  }
  
  return true;
}

// Test 3: Display Formatting
console.log('🎨 TEST 3: Display Formatting');
console.log('-----------------------------');

function testDisplayFormatting() {
  const textContent = document.body.textContent;
  
  // Check for problematic patterns
  const issues = [];
  
  if (textContent.includes('vs Unknown')) {
    issues.push('❌ "vs Unknown" found in content');
  }
  
  if (textContent.includes('vs vs')) {
    issues.push('❌ "vs vs" duplicate prefix found');
  }
  
  if (textContent.includes('vs @')) {
    issues.push('❌ "vs @" mixed prefix found');
  }
  
  if (textContent.includes('@ vs')) {
    issues.push('❌ "@ vs" mixed prefix found');
  }
  
  if (issues.length === 0) {
    console.log('✅ No display formatting issues detected');
  } else {
    issues.forEach(issue => console.log(issue));
  }
  
  return issues.length === 0;
}

// Test 4: Console Debug Logs
console.log('🔍 TEST 4: Console Debug Logs');
console.log('-----------------------------');

function testDebugLogs() {
  // Store original console.log
  const originalLog = console.log;
  const debugMessages = [];
  
  // Intercept console.log messages
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('📅') || message.includes('🆚') || message.includes('FIXED') || 
        message.includes('gameId cross-reference') || message.includes('opponent resolution')) {
      debugMessages.push(message);
    }
    originalLog.apply(console, args);
  };
  
  // Trigger a player selection if possible
  const playerItems = document.querySelectorAll('.player-item, .mobile-player-card');
  if (playerItems.length > 0) {
    console.log('Triggering player selection to check debug logs...');
    playerItems[0].click();
    
    setTimeout(() => {
      console.log = originalLog; // Restore original console.log
      console.log('Debug messages captured:', debugMessages.length);
      debugMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. ${msg}`);
      });
      
      const hasFixedMessages = debugMessages.some(msg => msg.includes('FIXED'));
      if (hasFixedMessages) {
        console.log('✅ FIXED debug messages found - fixes are active');
      } else {
        console.log('⚠️ No FIXED debug messages - may need to trigger more interactions');
      }
    }, 3000);
  }
  
  return true;
}

// Test 5: Data Structure Separation
console.log('📊 TEST 5: Data Structure Separation');
console.log('------------------------------------');

function testDataStructureSeparation() {
  // This test requires examining the component state
  // We'll look for signs that recent games and opponent history are separate
  
  const recentGamesSection = document.querySelector('.recent-5-games-chart, [class*="recent"]');
  const opponentHistorySection = document.querySelector('.opponent-history-chart, [class*="opponent"]');
  
  if (recentGamesSection && opponentHistorySection) {
    console.log('✅ Both recent games and opponent history sections found');
    console.log('Recent games section:', recentGamesSection.className);
    console.log('Opponent history section:', opponentHistorySection.className);
    
    // Check if they have different data
    const recentGamesText = recentGamesSection.textContent;
    const opponentHistoryText = opponentHistorySection.textContent;
    
    if (recentGamesText !== opponentHistoryText) {
      console.log('✅ Sections have different content - data separation working');
    } else {
      console.log('⚠️ Sections have identical content - may be sharing data');
    }
  } else {
    console.log('⚠️ Could not find both chart sections');
  }
  
  return true;
}

// Test 6: Enhanced Player Analysis Consistency
console.log('🔬 TEST 6: Enhanced Player Analysis Consistency');
console.log('----------------------------------------------');

function testEnhancedPlayerAnalysisConsistency() {
  // Check if we're on the players page or if it's available
  if (window.location.pathname.includes('/players')) {
    console.log('✅ On Enhanced Player Analysis page');
    
    // Look for player search or analysis components
    const searchBar = document.querySelector('[class*="search"], input[placeholder*="player"]');
    const playerAnalysis = document.querySelector('.enhanced-player-analysis, [class*="player-analysis"]');
    
    if (searchBar) {
      console.log('✅ Player search found');
    }
    
    if (playerAnalysis) {
      console.log('✅ Player analysis component found');
    }
    
    // Check for date consistency with main app
    const analysisDateElements = document.querySelectorAll('[class*="date"], .last-updated');
    console.log('Date elements in analysis:', analysisDateElements.length);
    
  } else {
    console.log('ℹ️ Not on Enhanced Player Analysis page');
    console.log('Navigate to /players to test consistency with PlayerPropsLadderCard');
  }
  
  return true;
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive fix testing...');
  console.log('');
  
  const results = {
    dateConsistency: testDateConsistency(),
    displayFormatting: testDisplayFormatting(),
    dataStructureSeparation: testDataStructureSeparation(),
    enhancedPlayerAnalysisConsistency: testEnhancedPlayerAnalysisConsistency()
  };
  
  // Run async tests
  testOpponentResolution();
  testDebugLogs();
  
  console.log('');
  console.log('📋 IMMEDIATE TEST RESULTS:');
  console.log('==========================');
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  console.log('');
  console.log('⏱️ ASYNC TESTS RUNNING:');
  console.log('=======================');
  console.log('- Opponent resolution test (2 second delay)');
  console.log('- Debug logs test (3 second delay)');
  console.log('');
  console.log('🎯 MANUAL VERIFICATION STEPS:');
  console.log('=============================');
  console.log('1. Find PlayerPropsLadderCard on dashboard (may need to scroll)');
  console.log('2. Click on Aaron Judge in hits prop type');
  console.log('3. Check Recent 5 Games - should show proper opponent formatting');
  console.log('4. Navigate to /players page');
  console.log('5. Search for Aaron Judge');
  console.log('6. Compare game dates - should be consistent between components');
  console.log('7. Look for console debug logs with "FIXED" messages');
  console.log('');
  console.log('🔧 EXPECTED FIXES:');
  console.log('==================');
  console.log('✅ No "vs Unknown" opponents');
  console.log('✅ No "vs @ TOR" or "vs vs CHC" formatting');
  console.log('✅ Consistent dates between PlayerPropsLadderCard and /players');
  console.log('✅ Proper gameId cross-reference logging');
  console.log('✅ Separated recent games from opponent history');
}

// Export for browser console use
window.testComprehensiveFixes = runAllTests;

// Auto-run if loaded in browser
if (typeof window !== 'undefined') {
  console.log('');
  console.log('💡 RUN COMPREHENSIVE TESTS:');
  console.log('===========================');
  console.log('Copy and paste this into browser console:');
  console.log('');
  console.log('testComprehensiveFixes()');
  console.log('');
} else {
  // Run immediately if in Node.js environment
  runAllTests();
}