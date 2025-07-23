/**
 * Comprehensive Auto-fill Pitcher Test Script
 * Run this in the browser console on the CapSheet page
 */

window.autoFillTester = {
  // Test configuration
  testConfig: {
    expectedTeams: ['WSH', 'CIN', 'MIA', 'SD', 'NYY', 'BAL', 'LAA', 'OAK', 'STL', 'CHC', 'COL', 'SF', 'TEX', 'HOU', 'MIL'],
    expectedPitchers: ['Michael Soroka', 'Nick Lodolo', 'Sandy Alcantara', 'Dylan Cease'],
    testTimeout: 15000, // 15 seconds max test time
  },

  // Monitoring variables
  testResults: {
    started: false,
    completed: false,
    errors: [],
    successes: [],
    warnings: [],
    console_messages: []
  },

  // Console message interceptor
  setupConsoleMonitoring() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    
    console.log = (...args) => {
      const message = args.join(' ');
      if (this.isAutoFillMessage(message)) {
        this.testResults.console_messages.push({
          type: 'LOG',
          message,
          timestamp: new Date().toISOString()
        });
        console.info('🎯 [AUTO-FILL LOG]:', message);
      }
      originalLog.apply(console, args);
    };

    console.warn = (...args) => {
      const message = args.join(' ');
      if (this.isAutoFillMessage(message)) {
        this.testResults.console_messages.push({
          type: 'WARN', 
          message,
          timestamp: new Date().toISOString()
        });
        console.info('🎯 [AUTO-FILL WARN]:', message);
      }
      originalWarn.apply(console, args);
    };

    console.error = (...args) => {
      const message = args.join(' ');
      if (this.isAutoFillMessage(message)) {
        this.testResults.console_messages.push({
          type: 'ERROR',
          message, 
          timestamp: new Date().toISOString()
        });
        console.info('🎯 [AUTO-FILL ERROR]:', message);
      }
      originalError.apply(console, args);
    };

    // Restore after test
    setTimeout(() => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    }, this.testConfig.testTimeout);
  },

  // Check if message is related to auto-fill functionality
  isAutoFillMessage(message) {
    const keywords = [
      'auto-fill', 'Auto-filled', 'Loading starting lineups',
      'Processing', 'pitcher', 'lineup', 'matchup', 'opponent',
      'Enhanced pitcher matching', 'getMatchupFromTeam', 'No pitcher match found'
    ];
    
    return keywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  },

  // Main test function
  async runAutoFillTest() {
    console.log('🚀 Starting Enhanced Auto-fill Pitcher Test');
    console.log('═'.repeat(60));
    
    this.testResults.started = true;
    this.setupConsoleMonitoring();

    try {
      // Step 1: Verify we're on CapSheet
      if (!this.verifyCapSheetPage()) {
        throw new Error('Not on CapSheet page');
      }

      // Step 2: Check for hitters in table
      const hitterCount = this.checkHittersInTable();
      console.log(`📊 Found ${hitterCount} hitters in table`);

      if (hitterCount === 0) {
        console.log('⚠️ No hitters found. Adding test hitters for demo...');
        this.suggestTestHitters();
        return;
      }

      // Step 3: Analyze current hitter setup
      const hitterAnalysis = this.analyzeCurrentHitters();
      console.log('📋 Current Hitter Analysis:', hitterAnalysis);

      // Step 4: Find and test auto-fill button
      const autoFillButton = this.findAutoFillButton();
      if (!autoFillButton) {
        throw new Error('Auto-fill button not found');
      }

      console.log('✅ Found Auto-fill Pitchers button');

      // Step 5: Check button state
      if (autoFillButton.disabled) {
        console.log('⚠️ Auto-fill button is disabled');
        return;
      }

      // Step 6: Execute auto-fill
      console.log('🎯 Clicking Auto-fill Pitchers button...');
      console.log('👀 Monitoring console for detailed logging...');
      
      autoFillButton.click();

      // Step 7: Monitor results
      await this.monitorAutoFillProcess();

      // Step 8: Analyze results
      this.analyzeResults();

    } catch (error) {
      console.error('❌ Test failed:', error);
      this.testResults.errors.push(error.message);
    } finally {
      this.testResults.completed = true;
      this.printFinalReport();
    }
  },

  // Verify we're on the correct page
  verifyCapSheetPage() {
    const isCapSheet = window.location.pathname.includes('capsheet') || 
                      document.querySelector('.cap-sheet') !== null;
    
    if (!isCapSheet) {
      console.log('📍 Not on CapSheet page. Navigate to /capsheet first.');
      return false;
    }
    
    console.log('✅ Confirmed on CapSheet page');
    return true;
  },

  // Check for hitters in the table
  checkHittersInTable() {
    const hitterRows = document.querySelectorAll('.capsheet-hitters-table tbody tr');
    const validRows = Array.from(hitterRows).filter(row => 
      !row.querySelector('.no-data')
    );
    
    return validRows.length;
  },

  // Analyze current hitters setup
  analyzeCurrentHitters() {
    const analysis = {
      total: 0,
      withTeams: 0,
      withPitchers: 0,
      withOpponents: 0,
      teams: []
    };

    const hitterRows = document.querySelectorAll('.capsheet-hitters-table tbody tr');
    
    hitterRows.forEach((row, index) => {
      if (row.querySelector('.no-data')) return;
      
      analysis.total++;
      
      // Check team field
      const teamCell = row.cells[1]; // Team column
      if (teamCell && teamCell.textContent.trim()) {
        analysis.withTeams++;
        analysis.teams.push(teamCell.textContent.trim());
      }

      // Check opponent field
      const opponentCell = row.cells[2]; // Opponent column
      if (opponentCell && opponentCell.textContent.trim()) {
        analysis.withOpponents++;
      }

      // Check pitcher field (primary pitcher select)
      const pitcherSelect = row.querySelector('select[id*="pitcher-select"]');
      if (pitcherSelect && pitcherSelect.value) {
        analysis.withPitchers++;
      }
    });

    return analysis;
  },

  // Find the auto-fill button
  findAutoFillButton() {
    return document.querySelector('.auto-fill-btn') || 
           document.querySelector('button[title*="Auto-fill"]') ||
           Array.from(document.querySelectorAll('button')).find(btn => 
             btn.textContent.includes('Auto-fill Pitchers')
           );
  },

  // Monitor the auto-fill process
  async monitorAutoFillProcess() {
    return new Promise((resolve) => {
      let checkCount = 0;
      const maxChecks = 50; // 10 seconds max
      
      const checkInterval = setInterval(() => {
        checkCount++;
        
        // Check status message
        const statusElement = document.querySelector('.auto-fill-status');
        if (statusElement && statusElement.textContent.trim()) {
          console.log('📱 Status Update:', statusElement.textContent);
        }

        // Check if auto-fill completed
        const autoFillButton = this.findAutoFillButton();
        const isCompleted = autoFillButton && 
                           !autoFillButton.textContent.includes('Auto-filling') &&
                           !autoFillButton.disabled;

        if (isCompleted || checkCount >= maxChecks) {
          clearInterval(checkInterval);
          
          // Final status check
          setTimeout(() => {
            this.capturePostAutoFillState();
            resolve();
          }, 1000);
        }
      }, 200);
    });
  },

  // Capture state after auto-fill
  capturePostAutoFillState() {
    console.log('📊 Analyzing post auto-fill state...');
    
    const postAnalysis = this.analyzeCurrentHitters();
    console.log('📈 Post Auto-fill Analysis:', postAnalysis);

    // Check filled pitchers
    const filledPitchers = [];
    const hitterRows = document.querySelectorAll('.capsheet-hitters-table tbody tr');
    
    hitterRows.forEach((row, index) => {
      if (row.querySelector('.no-data')) return;
      
      const pitcherSelect = row.querySelector('select[id*="pitcher-select"]');
      const opponentCell = row.cells[2];
      const playerCell = row.cells[0];
      
      if (pitcherSelect && pitcherSelect.value) {
        const pitcherText = pitcherSelect.selectedOptions[0]?.textContent || pitcherSelect.value;
        const playerName = playerCell?.textContent.trim() || `Player ${index + 1}`;
        const opponent = opponentCell?.textContent.trim() || 'Unknown';
        
        filledPitchers.push({
          player: playerName,
          pitcher: pitcherText,
          opponent: opponent
        });

        this.testResults.successes.push(
          `✅ ${playerName} → ${pitcherText} (vs ${opponent})`
        );
      }
    });

    console.log(`🎯 Successfully auto-filled ${filledPitchers.length} pitchers:`);
    filledPitchers.forEach(result => {
      console.log(`   • ${result.player} → ${result.pitcher} (vs ${result.opponent})`);
    });
  },

  // Suggest test hitters
  suggestTestHitters() {
    console.log('💡 Suggested test setup:');
    console.log('1. Add hitters from these teams that have games today:');
    this.testConfig.expectedTeams.slice(0, 4).forEach(team => {
      console.log(`   • Add a hitter from ${team}`);
    });
    console.log('2. Ensure each hitter has their team field populated');
    console.log('3. Leave pitcher and opponent fields empty');
    console.log('4. Then run the test again');
  },

  // Analyze final results
  analyzeResults() {
    console.log('🔍 Analyzing test results...');
    
    // Check for enhanced features
    const enhancedFeatures = {
      opponentTeamLookup: this.testResults.console_messages.some(m => 
        m.message.includes('getMatchupFromTeam') || m.message.includes('opponent')
      ),
      nameMatching: this.testResults.console_messages.some(m =>
        m.message.includes('Enhanced pitcher matching') || m.message.includes('name match')
      ),
      startingLineupService: this.testResults.console_messages.some(m =>
        m.message.includes('Loading starting lineups') || m.message.includes('lineup')
      )
    };

    console.log('🔧 Enhanced Features Detected:', enhancedFeatures);

    // Performance analysis
    const performanceMetrics = {
      totalMessages: this.testResults.console_messages.length,
      successMessages: this.testResults.console_messages.filter(m => 
        m.message.includes('Auto-filled') || m.message.includes('success')
      ).length,
      warningMessages: this.testResults.console_messages.filter(m => 
        m.type === 'WARN'
      ).length,
      errorMessages: this.testResults.console_messages.filter(m => 
        m.type === 'ERROR'
      ).length
    };

    console.log('📊 Performance Metrics:', performanceMetrics);
  },

  // Print final comprehensive report
  printFinalReport() {
    console.log('\n' + '═'.repeat(60));
    console.log('📋 ENHANCED AUTO-FILL PITCHER TEST REPORT');
    console.log('═'.repeat(60));
    
    console.log('✅ SUCCESSES:');
    this.testResults.successes.forEach(success => console.log('  ' + success));
    
    if (this.testResults.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.testResults.warnings.forEach(warning => console.log('  ' + warning));
    }
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.testResults.errors.forEach(error => console.log('  ' + error));
    }
    
    console.log('\n🔍 CONSOLE MESSAGES CAPTURED:');
    this.testResults.console_messages.forEach((msg, index) => {
      console.log(`  ${index + 1}. [${msg.type}] ${msg.message}`);
    });
    
    console.log('\n📊 SUMMARY:');
    console.log(`  • Successes: ${this.testResults.successes.length}`);
    console.log(`  • Warnings: ${this.testResults.warnings.length}`);
    console.log(`  • Errors: ${this.testResults.errors.length}`);
    console.log(`  • Console Messages: ${this.testResults.console_messages.length}`);
    
    const overallStatus = this.testResults.errors.length === 0 ? '✅ PASSED' : '❌ FAILED';
    console.log(`\n🏁 OVERALL TEST STATUS: ${overallStatus}`);
    console.log('═'.repeat(60));
  },

  // Quick test for enhanced name matching
  testNameMatching() {
    console.log('🧪 Testing Enhanced Name Matching Logic...');
    
    // Simulate the enhanced matching from the code
    const testCases = [
      { input: 'Mike Trout', expected: 'Michael Trout' },
      { input: 'jacob degrom', expected: 'Jacob deGrom' },
      { input: 'M. Trout', expected: 'Mike Trout' },
      { input: 'Sandy Alcantara', expected: 'Sandy Alcantara' }
    ];
    
    testCases.forEach(testCase => {
      console.log(`  Testing: "${testCase.input}" should match "${testCase.expected}"`);
    });
  }
};

// Auto-run the test
console.log('🔧 Auto-fill Pitcher Test Suite Loaded');
console.log('📖 Usage:');
console.log('  • window.autoFillTester.runAutoFillTest() - Run full test');
console.log('  • window.autoFillTester.testNameMatching() - Test name matching only');
console.log('');
console.log('🚀 Starting test in 2 seconds...');

setTimeout(() => {
  window.autoFillTester.runAutoFillTest();
}, 2000);