const puppeteer = require('puppeteer');

/**
 * Focused test specifically for capturing PlayerPropsLadderCard console debug logs
 * This test focuses on the fix verification without UI complexity
 */
async function focusedConsoleTest() {
  console.log('🔍 Focused Console Test for PlayerPropsLadderCard Fix');
  console.log('=' * 50);
  
  let browser;
  let consoleLogs = [];
  let fixIndicators = {
    currentDateFix: false,
    gameSeparation: false,
    structuredData: false
  };

  try {
    browser = await puppeteer.launch({ 
      headless: false,
      slowMo: 50,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();
    
    // Capture ALL console messages with detailed logging
    page.on('console', msg => {
      const logText = msg.text();
      const timestamp = new Date().toISOString();
      
      console.log(`[${timestamp}] ${msg.type().toUpperCase()}: ${logText}`);
      
      consoleLogs.push({
        type: msg.type(),
        text: logText,
        timestamp
      });
      
      // Check for fix indicators
      if (logText.includes('FIXED: Using actual current date instead of selected app date')) {
        fixIndicators.currentDateFix = true;
        console.log('✅ DETECTED: Current date fix working!');
      }
      
      if (logText.includes('Separated:') && logText.includes('recent games') && logText.includes('opponent history games')) {
        fixIndicators.gameSeparation = true;
        console.log('✅ DETECTED: Game separation working!');
      }
      
      if (logText.includes('Returning structured data:') && logText.includes('recent')) {
        fixIndicators.structuredData = true;
        console.log('✅ DETECTED: Structured data return working!');
      }
    });

    console.log('🌐 Navigating to application...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    console.log('⏳ Waiting for initial load...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🎯 Looking for PlayerPropsLadderCard...');
    const propsCard = await page.$('.player-props-ladder-card');
    
    if (!propsCard) {
      console.log('❌ PlayerPropsLadderCard not found');
      return false;
    }

    console.log('✅ Found PlayerPropsLadderCard');

    // Wait for data to load
    console.log('📊 Waiting for prop data to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('👑 Looking for Aaron Judge...');
    const judgeCandidates = await page.$$eval('.player-item .player-name', elements =>
      elements
        .map((el, index) => ({ text: el.textContent.trim(), index }))
        .filter(item => item.text.includes('Judge') || item.text.includes('A. Judge') || item.text.includes('Aaron Judge'))
    );

    console.log(`🔍 Found ${judgeCandidates.length} Aaron Judge candidates:`, judgeCandidates);

    if (judgeCandidates.length > 0) {
      const judgeIndex = judgeCandidates[0].index;
      console.log(`🖱️  Clicking on Aaron Judge at index ${judgeIndex}...`);
      
      const playerItems = await page.$$('.player-item');
      if (playerItems[judgeIndex]) {
        await playerItems[judgeIndex].click();
        console.log('✅ Clicked on Aaron Judge');
        
        // Wait for data loading and watch console closely
        console.log('⏳ Watching console for 10 seconds after click...');
        
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log(`⏲️  Second ${i + 1}/10 - Watching for debug logs...`);
        }
      } else {
        console.log('❌ Could not click Aaron Judge - element not found');
      }
    } else {
      console.log('❌ Aaron Judge not found in player list');
      
      // Show first few players for debugging
      console.log('🔍 First 10 players found:');
      const firstPlayers = await page.$$eval('.player-item .player-name', elements =>
        elements.slice(0, 10).map(el => el.textContent.trim())
      );
      firstPlayers.forEach((player, i) => console.log(`  ${i + 1}. ${player}`));
    }

    // Final wait and summary
    console.log('⏳ Final 5-second observation period...');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Results summary
  console.log('\n📋 CONSOLE TEST RESULTS');
  console.log('=' * 30);
  
  console.log('🔧 Fix Verification:');
  console.log(`  - Current date fix detected: ${fixIndicators.currentDateFix ? '✅' : '❌'}`);
  console.log(`  - Game separation detected: ${fixIndicators.gameSeparation ? '✅' : '❌'}`);
  console.log(`  - Structured data detected: ${fixIndicators.structuredData ? '✅' : '❌'}`);
  
  console.log('\n📈 Relevant Console Logs:');
  const relevantLogs = consoleLogs.filter(log => 
    log.text.includes('FIXED') ||
    log.text.includes('Separated:') ||
    log.text.includes('recent games') ||
    log.text.includes('Returning structured data') ||
    log.text.includes('Loading games for') ||
    log.text.includes('Loading comprehensive data') ||
    log.text.includes('UNLIMITED')
  );
  
  if (relevantLogs.length > 0) {
    relevantLogs.forEach((log, i) => {
      console.log(`  ${i + 1}. [${log.type}] ${log.text}`);
    });
  } else {
    console.log('  No relevant debug logs found');
  }
  
  // Overall assessment
  const overallSuccess = fixIndicators.currentDateFix && fixIndicators.gameSeparation;
  console.log('\n🏆 OVERALL ASSESSMENT:');
  console.log(`The recent games fix is ${overallSuccess ? '✅ WORKING' : '❌ NEEDS ATTENTION'}`);
  
  if (!overallSuccess) {
    console.log('\n💡 RECOMMENDATIONS:');
    if (!fixIndicators.currentDateFix) {
      console.log('  - Check if loadPlayerDataUnlimited function is being called');
      console.log('  - Verify console.log statement at line 79 is active');
    }
    if (!fixIndicators.gameSeparation) {
      console.log('  - Check if loadPlayerRecentGames function is being called'); 
      console.log('  - Verify console.log statement at line 451 is active');
    }
  }
  
  console.log(`\n📊 Total console messages captured: ${consoleLogs.length}`);
  
  return overallSuccess;
}

// Run the focused test
focusedConsoleTest().then(success => {
  console.log(`\n🎯 Test completed. Fix working: ${success ? 'YES' : 'NO'}`);
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});