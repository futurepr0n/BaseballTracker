/**
 * Test script for Auto-fill Pitcher functionality
 * This script will be injected into the browser console to test the enhanced auto-fill functionality
 */

// Test script for Auto-fill Pitcher functionality
const testAutoFillPitchers = async () => {
  console.log('🧪 Starting Auto-fill Pitcher Test');
  
  // Step 1: Navigate to CapSheet if not already there
  if (!window.location.pathname.includes('capsheet')) {
    console.log('📍 Navigating to CapSheet...');
    window.location.href = '/capsheet';
    return; // Wait for page to load
  }
  
  console.log('✅ On CapSheet page');
  
  // Step 2: Check if there are hitters in the table
  const hitterRows = document.querySelectorAll('.capsheet-hitters-table tbody tr');
  console.log(`📊 Found ${hitterRows.length} hitter rows`);
  
  if (hitterRows.length === 0 || hitterRows[0].querySelector('.no-data')) {
    console.log('⚠️ No hitters found. Need to add some hitters first.');
    
    // Try to find and add some hitters automatically for testing
    const hitterSelector = document.querySelector('#hitter-selector');
    if (hitterSelector) {
      console.log('🎯 Found hitter selector, will add test hitters...');
      // This would require more complex interaction with React Select
      console.log('ℹ️ Please manually add 2-3 hitters from different teams to test auto-fill');
      return;
    }
  }
  
  // Step 3: Look for the Auto-fill Pitchers button
  const autoFillButton = document.querySelector('.auto-fill-btn');
  console.log('🔍 Looking for Auto-fill Pitchers button...');
  
  if (!autoFillButton) {
    console.error('❌ Auto-fill Pitchers button not found');
    return;
  }
  
  console.log('✅ Found Auto-fill Pitchers button:', autoFillButton.textContent);
  
  // Step 4: Check if button is enabled
  if (autoFillButton.disabled) {
    console.log('⚠️ Auto-fill button is disabled. This is expected if no hitters are present.');
    return;
  }
  
  // Step 5: Monitor console for detailed logging
  console.log('👀 Monitoring console for auto-fill process...');
  console.log('🚀 Clicking Auto-fill Pitchers button...');
  
  // Click the button
  autoFillButton.click();
  
  // Step 6: Monitor the status message
  const checkStatus = () => {
    const statusElement = document.querySelector('.auto-fill-status');
    if (statusElement) {
      console.log('📱 Status:', statusElement.textContent);
    }
    
    // Check if button text changed
    console.log('🔘 Button text:', autoFillButton.textContent);
    
    // Check if any pitcher fields were populated
    const pitcherSelects = document.querySelectorAll('select[id*="pitcher-select"]');
    let filledCount = 0;
    pitcherSelects.forEach((select, index) => {
      if (select.value && select.value !== '') {
        filledCount++;
        console.log(`✅ Pitcher ${index + 1} filled: ${select.selectedOptions[0]?.textContent || select.value}`);
      }
    });
    
    console.log(`📊 Total pitchers auto-filled: ${filledCount} out of ${pitcherSelects.length}`);
  };
  
  // Check status immediately and then periodically
  setTimeout(checkStatus, 500);
  setTimeout(checkStatus, 1500);
  setTimeout(checkStatus, 3000);
  setTimeout(checkStatus, 5000);
  
  console.log('🧪 Auto-fill test initiated. Check console messages above and below for results.');
};

// Enhanced monitoring function to track the enhanced auto-fill logic
const monitorAutoFillProcess = () => {
  console.log('🔍 Setting up enhanced monitoring for auto-fill process...');
  
  // Override console.log temporarily to capture auto-fill messages
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  
  const autoFillMessages = [];
  
  const captureMessage = (type, ...args) => {
    const message = args.join(' ');
    if (message.includes('Auto-filled') || 
        message.includes('starting lineup') || 
        message.includes('pitcher') ||
        message.includes('Loading starting lineups') ||
        message.includes('Processing') ||
        message.includes('Enhanced pitcher matching')) {
      autoFillMessages.push({ type, message, timestamp: new Date().toISOString() });
      console.log(`🎯 [AUTO-FILL ${type.toUpperCase()}]:`, message);
    }
  };
  
  // Intercept console messages
  console.log = (...args) => {
    captureMessage('LOG', ...args);
    originalConsoleLog.apply(console, args);
  };
  
  console.warn = (...args) => {
    captureMessage('WARN', ...args);
    originalConsoleWarn.apply(console, args);
  };
  
  console.error = (...args) => {
    captureMessage('ERROR', ...args);
    originalConsoleError.apply(console, args);
  };
  
  // Restore original console after 10 seconds
  setTimeout(() => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    
    console.log('📊 Auto-fill monitoring complete. Captured messages:');
    autoFillMessages.forEach((msg, index) => {
      console.log(`${index + 1}. [${msg.type}] ${msg.message}`);
    });
  }, 10000);
};

// Start monitoring
monitorAutoFillProcess();

// Run the test
testAutoFillPitchers();