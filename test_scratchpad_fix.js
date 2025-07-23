/**
 * Browser Console Test Script for Scratchpad Toggle Fix
 * 
 * Run this in browser console at localhost:3000 to test the scratchpad fix.
 * This will help verify that toggling scratchpad players doesn't cause unnecessary re-renders.
 */

(function() {
    console.log('🧪 Starting Scratchpad Toggle Fix Test...');
    
    // Store original console methods to monitor calls
    const originalLog = console.log;
    const originalWarn = console.warn;
    const logCounts = { 
        dataLoading: 0, 
        scratchpadOps: 0, 
        cardReloads: 0,
        total: 0
    };
    
    // Keywords that indicate data is being reloaded (BAD)
    const dataLoadingKeywords = [
        'Loading HR predictions',
        'Loading rolling stats',
        'Loading hit streak data',
        'Refreshing card data',
        'Data reload triggered',
        'Loading data for date',
        'useEffect triggered'
    ];
    
    // Keywords that indicate scratchpad operations (GOOD)
    const scratchpadKeywords = [
        'Added',
        'Removed',
        'scratchpad',
        'Cleared all players'
    ];
    
    // Keywords that indicate card reloads (BAD)
    const cardReloadKeywords = [
        'Card refreshing',
        'Reloading card',
        'Card data updated',
        'Card component rendered'
    ];
    
    // Override console.log to monitor what's being logged
    console.log = function(...args) {
        const message = args.join(' ');
        logCounts.total++;
        
        // Check for data loading messages (these are bad)
        if (dataLoadingKeywords.some(keyword => message.includes(keyword))) {
            logCounts.dataLoading++;
            originalLog('🚨 UNEXPECTED DATA LOADING:', ...args);
            return originalLog.apply(console, args);
        }
        
        // Check for card reload messages (these are bad)
        if (cardReloadKeywords.some(keyword => message.includes(keyword))) {
            logCounts.cardReloads++;
            originalLog('🚨 UNEXPECTED CARD RELOAD:', ...args);
            return originalLog.apply(console, args);
        }
        
        // Check for scratchpad operations (these are good)
        if (scratchpadKeywords.some(keyword => message.includes(keyword))) {
            logCounts.scratchpadOps++;
            originalLog('✅ SCRATCHPAD OP:', ...args);
            return originalLog.apply(console, args);
        }
        
        // Pass through all other logs normally
        return originalLog.apply(console, args);
    };
    
    // Function to find all star icons on the page
    function findStarIcons() {
        const stars = [];
        
        // Look for star characters in the DOM
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let textNode;
        while (textNode = walker.nextNode()) {
            if (textNode.textContent.includes('★') || textNode.textContent.includes('☆')) {
                const element = textNode.parentElement;
                if (element && element.onclick) {
                    stars.push({
                        element: element,
                        text: textNode.textContent.trim(),
                        playerInfo: element.closest('.player-row, .player-card, .card')?.textContent || 'Unknown player'
                    });
                }
            }
        }
        
        // Also look for clickable elements with star content
        const clickableStars = document.querySelectorAll('[onclick*="star"], .star-icon, .scratchpad-icon');
        clickableStars.forEach(star => {
            if (star.textContent.includes('★') || star.textContent.includes('☆')) {
                stars.push({
                    element: star,
                    text: star.textContent.trim(),
                    playerInfo: star.closest('.player-row, .player-card, .card')?.textContent || 'Unknown player'
                });
            }
        });
        
        return stars;
    }
    
    // Function to test scratchpad toggling
    function testScratchpadToggling() {
        const stars = findStarIcons();
        
        if (stars.length === 0) {
            console.log('❌ No star icons found on the page. Make sure the dashboard has loaded.');
            return false;
        }
        
        console.log(`🎯 Found ${stars.length} star icons to test`);
        
        // Reset counters
        logCounts.dataLoading = 0;
        logCounts.scratchpadOps = 0;
        logCounts.cardReloads = 0;
        logCounts.total = 0;
        
        // Test each star icon
        stars.slice(0, 5).forEach((star, index) => {
            setTimeout(() => {
                console.log(`\n🔄 Testing star ${index + 1}/${Math.min(5, stars.length)}`);
                console.log(`Player context: ${star.playerInfo.substring(0, 100)}...`);
                
                // Click the star
                star.element.click();
                
                // Wait a bit then click again to remove
                setTimeout(() => {
                    star.element.click();
                }, 100);
                
            }, index * 300);
        });
        
        // Report results after all tests
        setTimeout(() => {
            console.log('\n📊 TEST RESULTS:');
            console.log(`✅ Scratchpad operations: ${logCounts.scratchpadOps}`);
            console.log(`🚨 Unexpected data loading: ${logCounts.dataLoading}`);
            console.log(`🚨 Unexpected card reloads: ${logCounts.cardReloads}`);
            console.log(`📝 Total console messages: ${logCounts.total}`);
            
            if (logCounts.dataLoading === 0 && logCounts.cardReloads === 0) {
                console.log('🎉 SUCCESS: No unexpected data loading or card reloads detected!');
                console.log('✅ The scratchpad toggle fix appears to be working correctly.');
            } else {
                console.log('❌ FAILURE: Detected unexpected data loading or card reloads.');
                console.log('🔧 The fix may not be working properly or there are other issues.');
            }
            
        }, stars.length * 300 + 1000);
        
        return true;
    }
    
    // Function to get current dashboard state
    function getDashboardState() {
        const cards = document.querySelectorAll('.card');
        const players = document.querySelectorAll('.player-name, .player-row');
        const stars = findStarIcons();
        
        return {
            cardCount: cards.length,
            playerCount: players.length,
            starIconCount: stars.length,
            timestamp: new Date().toISOString()
        };
    }
    
    // Main test function
    function runScratchpadTest() {
        console.log('🚀 Running comprehensive scratchpad toggle test...');
        
        const initialState = getDashboardState();
        console.log('📊 Initial dashboard state:', initialState);
        
        if (initialState.starIconCount === 0) {
            console.log('⚠️ No star icons found. Waiting 3 seconds for page to load...');
            setTimeout(() => {
                const retryState = getDashboardState();
                if (retryState.starIconCount > 0) {
                    testScratchpadToggling();
                } else {
                    console.log('❌ Still no star icons found. The dashboard might not be fully loaded or there might be an issue.');
                }
            }, 3000);
        } else {
            testScratchpadToggling();
        }
    }
    
    // Expose functions to global scope for manual use
    window.scratchpadTest = {
        run: runScratchpadTest,
        findStars: findStarIcons,
        getState: getDashboardState,
        logCounts: logCounts
    };
    
    console.log('🔧 Scratchpad test utilities loaded!');
    console.log('📖 Usage:');
    console.log('  - scratchpadTest.run() - Run full automated test');
    console.log('  - scratchpadTest.findStars() - Find all star icons');
    console.log('  - scratchpadTest.getState() - Get current dashboard state');
    console.log('  - scratchpadTest.logCounts - View current log counts');
    console.log('\n⚡ To start testing, run: scratchpadTest.run()');
    
})();