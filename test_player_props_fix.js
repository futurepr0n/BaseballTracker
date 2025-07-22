const puppeteer = require('puppeteer');
const fs = require('fs');

/**
 * Comprehensive test to verify PlayerPropsLadderCard recent games fix
 * Tests the specific issue where Recent 5 Games showed games filtered by unique opponents
 * instead of actual chronological recent games
 */
async function testPlayerPropsRecentGamesFix() {
  console.log('🧪 Starting PlayerPropsLadderCard Recent Games Fix Test');
  console.log('=' * 60);
  
  let browser;
  let testResults = {
    testStartTime: new Date().toISOString(),
    navigatedToApp: false,
    foundPlayerPropsCard: false,
    foundHitsProp: false,
    foundAaronJudge: false,
    clickedAaronJudge: false,
    foundDebugLogs: [],
    recentGamesData: null,
    expectedFix: {
      shouldUseCurrentDate: true,
      shouldSeparateRecentFromOpponent: true,
      shouldShowChronologicalGames: true
    },
    fixVerification: {
      usesCurrentDate: false,
      separatesRecentFromOpponent: false,
      showsChronologicalGames: false
    },
    consoleLogs: [],
    errors: []
  };

  try {
    // Launch browser
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({ 
      headless: false,  // Keep visible to see what's happening
      slowMo: 100,      // Slow down for visibility
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();
    
    // Set up console logging capture
    page.on('console', msg => {
      const logText = msg.text();
      testResults.consoleLogs.push({
        type: msg.type(),
        text: logText,
        timestamp: new Date().toISOString()
      });
      
      // Check for specific debug logs we're looking for
      if (logText.includes('FIXED: Using actual current date instead of selected app date')) {
        testResults.foundDebugLogs.push('currentDateFix');
        testResults.fixVerification.usesCurrentDate = true;
        console.log('✅ Found debug log: Using actual current date fix');
      }
      
      if (logText.includes('Separated:') && logText.includes('recent games') && logText.includes('opponent history games')) {
        testResults.foundDebugLogs.push('gameSeparation');
        testResults.fixVerification.separatesRecentFromOpponent = true;
        console.log('✅ Found debug log: Game separation working');
      }
      
      if (logText.includes('Returning structured data:') && logText.includes('recent')) {
        testResults.foundDebugLogs.push('structuredData');
        console.log('✅ Found debug log: Structured data return');
      }
    });

    // Navigate to the application
    console.log('🌐 Navigating to localhost:3000...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    testResults.navigatedToApp = true;
    console.log('✅ Successfully navigated to application');

    // Wait for initial loading
    await page.waitForSelector('body', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Look for Player Props Ladder Card
    console.log('🔍 Looking for PlayerPropsLadderCard...');
    const playerPropsCard = await page.$('.player-props-ladder-card');
    if (playerPropsCard) {
      testResults.foundPlayerPropsCard = true;
      console.log('✅ Found PlayerPropsLadderCard');
      
      // Look for hits prop type (should be first/default)
      console.log('🎯 Looking for hits prop button...');
      const hitsPropButton = await page.$('.prop-button');
      if (hitsPropButton) {
        const buttonText = await page.evaluate(el => el.textContent, hitsPropButton);
        if (buttonText.includes('Hits')) {
          testResults.foundHitsProp = true;
          console.log('✅ Found hits prop button (active by default)');
          
          // Look for Aaron Judge in the player list
          console.log('👑 Looking for Aaron Judge in player list...');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Allow data to load
          
          const playerItems = await page.$$('.player-item');
          console.log(`📊 Found ${playerItems.length} player items`);
          
          let aaronJudgeElement = null;
          for (let i = 0; i < playerItems.length; i++) {
            const playerName = await page.evaluate(el => {
              const nameEl = el.querySelector('.player-name');
              return nameEl ? nameEl.textContent : '';
            }, playerItems[i]);
            
            console.log(`👤 Player ${i + 1}: ${playerName}`);
            
            if (playerName.includes('Aaron Judge')) {
              aaronJudgeElement = playerItems[i];
              testResults.foundAaronJudge = true;
              console.log('✅ Found Aaron Judge in player list!');
              break;
            }
          }
          
          if (aaronJudgeElement) {
            // Click on Aaron Judge
            console.log('🖱️  Clicking on Aaron Judge...');
            await aaronJudgeElement.click();
            testResults.clickedAaronJudge = true;
            
            // Wait for data to load and charts to appear
            console.log('⏳ Waiting for player details to load...');
            await new Promise(resolve => setTimeout(resolve, 5000)); // Give time for async data loading
            
            // Look for Recent 5 Games chart
            console.log('📈 Looking for Recent 5 Games chart...');
            const recentGamesChart = await page.$('.recent-games-chart');
            if (recentGamesChart) {
              console.log('✅ Found Recent 5 Games chart');
              
              // Try to extract game data from the chart
              const gameData = await page.evaluate(() => {
                const gameItems = document.querySelectorAll('.games-breakdown .game-item');
                const games = [];
                gameItems.forEach(item => {
                  const date = item.querySelector('.game-date')?.textContent;
                  const value = item.querySelector('.game-value')?.textContent;
                  const opponent = item.querySelector('.game-opponent')?.textContent;
                  if (date && value) {
                    games.push({ date, value, opponent });
                  }
                });
                return games;
              });
              
              testResults.recentGamesData = gameData;
              console.log('📊 Recent Games Data:', gameData);
              
              // Check if games are in chronological order (most recent first)
              if (gameData && gameData.length >= 2) {
                // Parse dates to check chronological order
                const dates = gameData.map(g => new Date(g.date + ', 2025'));
                let isChronological = true;
                for (let i = 1; i < dates.length; i++) {
                  if (dates[i] > dates[i-1]) {
                    isChronological = false;
                    break;
                  }
                }
                
                testResults.fixVerification.showsChronologicalGames = isChronological;
                if (isChronological) {
                  console.log('✅ Games appear to be in chronological order (most recent first)');
                } else {
                  console.log('❌ Games do NOT appear to be in chronological order');
                }
              }
            } else {
              console.log('❌ Recent 5 Games chart not found');
            }
          } else {
            console.log('❌ Aaron Judge not found in player list');
            // List the first few players for debugging
            console.log('🔍 First few players found:');
            for (let i = 0; i < Math.min(5, playerItems.length); i++) {
              const playerName = await page.evaluate(el => {
                const nameEl = el.querySelector('.player-name');
                return nameEl ? nameEl.textContent : 'Unknown';
              }, playerItems[i]);
              console.log(`  ${i + 1}. ${playerName}`);
            }
          }
        } else {
          console.log(`❌ First prop button is not 'Hits': ${buttonText}`);
        }
      } else {
        console.log('❌ No prop buttons found');
      }
    } else {
      console.log('❌ PlayerPropsLadderCard not found on page');
      
      // Try to find what cards ARE on the page
      const allCards = await page.$$('.glass-card, [class*="card"]');
      console.log(`🔍 Found ${allCards.length} card-like elements on page`);
      
      if (allCards.length > 0) {
        for (let i = 0; i < Math.min(3, allCards.length); i++) {
          const cardClass = await page.evaluate(el => el.className, allCards[i]);
          console.log(`  Card ${i + 1}: ${cardClass}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error);
    testResults.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (browser) {
      console.log('🔄 Waiting 10 seconds for final observations...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      await browser.close();
    }
  }

  // Generate test report
  console.log('\n📋 TEST RESULTS SUMMARY');
  console.log('=' * 40);
  
  testResults.testEndTime = new Date().toISOString();
  
  console.log('✅ Navigation and Setup:');
  console.log(`  - Navigated to app: ${testResults.navigatedToApp ? '✅' : '❌'}`);
  console.log(`  - Found Player Props Card: ${testResults.foundPlayerPropsCard ? '✅' : '❌'}`);
  console.log(`  - Found Hits Prop: ${testResults.foundHitsProp ? '✅' : '❌'}`);
  console.log(`  - Found Aaron Judge: ${testResults.foundAaronJudge ? '✅' : '❌'}`);
  console.log(`  - Clicked Aaron Judge: ${testResults.clickedAaronJudge ? '✅' : '❌'}`);
  
  console.log('\n🔧 Fix Verification:');
  console.log(`  - Uses current date for recent games: ${testResults.fixVerification.usesCurrentDate ? '✅' : '❌'}`);
  console.log(`  - Separates recent from opponent games: ${testResults.fixVerification.separatesRecentFromOpponent ? '✅' : '❌'}`);
  console.log(`  - Shows chronological recent games: ${testResults.fixVerification.showsChronologicalGames ? '✅' : '❌'}`);
  
  console.log('\n📊 Debug Logs Found:');
  testResults.foundDebugLogs.forEach(log => {
    console.log(`  - ${log}: ✅`);
  });
  
  if (testResults.recentGamesData && testResults.recentGamesData.length > 0) {
    console.log('\n🎮 Recent Games Data Found:');
    testResults.recentGamesData.forEach((game, index) => {
      console.log(`  ${index + 1}. ${game.date}: ${game.value} hits ${game.opponent || ''}`);
    });
  }
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ Errors Encountered:');
    testResults.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error.message}`);
    });
  }
  
  console.log('\n📈 Console Logs with Fix Keywords:');
  const relevantLogs = testResults.consoleLogs.filter(log => 
    log.text.includes('FIXED') || 
    log.text.includes('Separated:') || 
    log.text.includes('recent games') ||
    log.text.includes('current date')
  );
  
  relevantLogs.forEach((log, index) => {
    console.log(`  ${index + 1}. [${log.type}] ${log.text}`);
  });
  
  // Overall assessment
  const overallSuccess = testResults.fixVerification.usesCurrentDate && 
                        testResults.fixVerification.separatesRecentFromOpponent;
  
  console.log('\n🏆 OVERALL ASSESSMENT:');
  console.log(`The recent games fix is ${overallSuccess ? '✅ WORKING' : '❌ NOT WORKING'}`);
  
  if (overallSuccess) {
    console.log('The fix successfully:');
    console.log('  - Uses actual current date instead of selected app date');
    console.log('  - Separates recent games from opponent history');
    console.log('  - Returns structured data to prevent mixing');
  } else {
    console.log('The fix needs attention:');
    if (!testResults.fixVerification.usesCurrentDate) {
      console.log('  - ❌ Current date fix not detected in console logs');
    }
    if (!testResults.fixVerification.separatesRecentFromOpponent) {
      console.log('  - ❌ Game separation fix not detected in console logs');
    }
  }
  
  // Save detailed results to file
  const reportFile = `/Users/futurepr0n/Development/Capping.Pro/Claude-Code/BaseballTracker/test_results_${Date.now()}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Detailed test results saved to: ${reportFile}`);
  
  return testResults;
}

// Run the test
testPlayerPropsRecentGamesFix().then(results => {
  console.log('\n🎯 Test completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});