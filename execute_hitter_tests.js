/**
 * Browser Console Test Execution Script for HittersTable
 * Copy and paste this entire script into the browser console at http://localhost:3000/capsheet
 */

console.log("🧪 HITTERSTABLE TESTING SUITE");
console.log("=" .repeat(60));

// Wait for page to load completely
const waitForElement = (selector, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) return resolve(element);
    
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
};

// Test 1: Check for opponent column
const testOpponentColumn = () => {
  console.log("\n📋 TEST 1: Opponent Column Verification");
  console.log("-".repeat(40));
  
  const headers = Array.from(document.querySelectorAll('th'));
  const opponentHeader = headers.find(th => 
    th.textContent.trim().toLowerCase() === 'opponent'
  );
  
  if (opponentHeader) {
    console.log("✅ PASS: Opponent column found in HittersTable");
    console.log(`   📍 Position: ${headers.indexOf(opponentHeader) + 1} of ${headers.length}`);
    return true;
  } else {
    console.log("❌ FAIL: Opponent column NOT found");
    console.log("   📝 Available headers:", headers.map(h => h.textContent.trim()));
    return false;
  }
};

// Test 2: Check hitter selector functionality
const testHitterSelector = () => {
  console.log("\n👤 TEST 2: Hitter Selector Functionality");
  console.log("-".repeat(40));
  
  const hitterSelector = document.querySelector('#hitter-selector');
  const selectorContainer = document.querySelector('.css-2b097c-container');
  
  if (hitterSelector || selectorContainer) {
    console.log("✅ PASS: Hitter selector found");
    
    // Try to click to see if it opens
    if (selectorContainer) {
      console.log("   🖱️  Attempting to open dropdown...");
      const input = selectorContainer.querySelector('input');
      if (input) {
        input.click();
        input.focus();
        console.log("   📝 Manual step: Please select a hitter from the dropdown");
      }
    }
    return true;
  } else {
    console.log("❌ FAIL: Hitter selector not found or not loaded");
    return false;
  }
};

// Test 3: Check auto-fill button
const testAutoFillButton = () => {
  console.log("\n🔄 TEST 3: Auto-fill Pitchers Button");
  console.log("-".repeat(40));
  
  const autoFillBtn = document.querySelector('.auto-fill-btn');
  
  if (autoFillBtn) {
    console.log("✅ PASS: Auto-fill button found");
    console.log(`   📊 Button text: "${autoFillBtn.textContent.trim()}"`);
    console.log(`   🎛️  Disabled status: ${autoFillBtn.disabled}`);
    
    if (autoFillBtn.disabled) {
      console.log("   ℹ️  Button correctly disabled (no hitters added yet)");
    } else {
      console.log("   ⚠️  Button is enabled - may indicate hitters are present");
    }
    return true;
  } else {
    console.log("❌ FAIL: Auto-fill button not found");
    return false;
  }
};

// Test 4: Check for table structure and opponent inputs
const testTableStructure = () => {
  console.log("\n🏗️  TEST 4: Table Structure and Opponent Inputs");
  console.log("-".repeat(40));
  
  const table = document.querySelector('.capsheet-hitters-table');
  
  if (!table) {
    console.log("❌ FAIL: HittersTable not found");
    return false;
  }
  
  console.log("✅ PASS: HittersTable found");
  
  // Check for no-data row or actual data rows
  const noDataRow = table.querySelector('td.no-data');
  const dataRows = table.querySelectorAll('tbody tr:not(:has(.no-data))');
  
  if (noDataRow) {
    console.log("   📝 Table is empty (expected initially)");
    console.log(`   📏 No-data colspan: ${noDataRow.colSpan}`);
  }
  
  if (dataRows.length > 0) {
    console.log(`   📊 Found ${dataRows.length} data row(s)`);
    
    // Check for opponent inputs
    const opponentInputs = table.querySelectorAll('input[placeholder="Enter team"]');
    console.log(`   🏟️  Opponent inputs found: ${opponentInputs.length}`);
    
    if (opponentInputs.length > 0) {
      console.log("   ✅ Opponent input fields are present");
    }
  }
  
  return true;
};

// Test 5: Monitor console for debugging logs
const testConsoleLogging = () => {
  console.log("\n📝 TEST 5: Console Logging Monitor");
  console.log("-".repeat(40));
  
  console.log("✅ PASS: Monitoring enabled");
  console.log("   ℹ️  Watch for [HitterRow] prefixed logs when:");
  console.log("   • Adding hitters");
  console.log("   • Entering opponent teams");  
  console.log("   • Selecting pitchers");
  console.log("   • Using auto-fill functionality");
  
  // Set up console monitoring
  const originalLog = console.log;
  let hitterRowLogs = [];
  
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('[HitterRow]')) {
      hitterRowLogs.push(message);
      console.log("   🔍 HitterRow Log:", message);
    }
    return originalLog.apply(console, args);
  };
  
  // Restore after 30 seconds
  setTimeout(() => {
    console.log = originalLog;
    console.log(`\n📊 Captured ${hitterRowLogs.length} HitterRow logs during monitoring period`);
  }, 30000);
  
  return true;
};

// Execute all automated tests
const runAllTests = async () => {
  console.log("⏳ Waiting for page elements to load...");
  
  try {
    // Wait for key elements
    await waitForElement('.capsheet-hitters-table, .loading-indicator', 5000);
    
    console.log("✅ Page loaded, starting tests...\n");
    
    const results = {
      opponentColumn: testOpponentColumn(),
      hitterSelector: testHitterSelector(), 
      autoFillButton: testAutoFillButton(),
      tableStructure: testTableStructure(),
      consoleLogging: testConsoleLogging()
    };
    
    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 AUTOMATED TEST RESULTS");
    console.log("=".repeat(60));
    
    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    
    Object.entries(results).forEach(([test, result]) => {
      const status = result ? "✅ PASS" : "❌ FAIL";
      console.log(`${status} - ${test}`);
    });
    
    console.log(`\n🏁 Automated Tests: ${passed}/${total} passed`);
    
    if (passed === total) {
      console.log("🎉 All automated tests PASSED!");
    } else {
      console.log("⚠️  Some automated tests failed - check implementation");
    }
    
    // Manual testing instructions
    console.log("\n" + "=".repeat(60));
    console.log("📋 MANUAL TESTING CHECKLIST");
    console.log("=".repeat(60));
    console.log("1. ✋ Add a hitter using the dropdown selector");
    console.log("2. 🏟️  Enter opponent team (e.g., 'SEA', 'NYY', 'LAD')");
    console.log("3. 🎯 Verify pitcher dropdown shows filtered options");
    console.log("4. 🔄 Click 'Auto-fill Pitchers' button");
    console.log("5. 👁️  Check console for [HitterRow] debugging logs");
    console.log("6. ⚖️  Compare with PitchersTable functionality");
    console.log("7. 📝 Note any issues or differences");
    
    console.log("\n💡 TIP: Keep console open to see HitterRow logs in real-time");
    
    return results;
    
  } catch (error) {
    console.error("❌ Test execution failed:", error);
    return null;
  }
};

// Start the test suite
console.log("🚀 Starting HittersTable test suite...");
runAllTests();

// Make functions available globally for manual use
window.testHittersTable = {
  runAllTests,
  testOpponentColumn,
  testHitterSelector,
  testAutoFillButton,
  testTableStructure,
  testConsoleLogging
};