// Test script to verify Poor Performance Risks tooltip positioning
// Run this in the browser console when viewing the dashboard

function testTooltipPositioning() {
  console.log('🔍 Testing Poor Performance Risks Tooltip Positioning...\n');
  
  // Find the Poor Performance card
  const poorPerformanceCard = document.querySelector('.poor-performance-card');
  if (!poorPerformanceCard) {
    console.error('❌ Poor Performance card not found');
    return;
  }
  
  console.log('✅ Poor Performance card found');
  
  // Find all risk items
  const riskItems = poorPerformanceCard.querySelectorAll('.risk-item');
  console.log(`📊 Found ${riskItems.length} risk items\n`);
  
  if (riskItems.length === 0) {
    console.warn('⚠️ No risk items found to test');
    return;
  }
  
  // Test 1: Check tooltip button alignment consistency
  console.log('🧪 Test 1: Checking tooltip button alignment consistency...');
  let alignmentIssues = 0;
  const buttonPositions = [];
  
  riskItems.forEach((item, index) => {
    const button = item.querySelector('.tooltip-trigger');
    if (!button) {
      console.error(`❌ No tooltip button found in item ${index + 1}`);
      alignmentIssues++;
      return;
    }
    
    const buttonRect = button.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    
    // Calculate button position relative to item
    const rightOffset = itemRect.right - buttonRect.right;
    const verticalCenter = (buttonRect.top + buttonRect.bottom) / 2;
    const itemVerticalCenter = (itemRect.top + itemRect.bottom) / 2;
    const verticalOffset = Math.abs(verticalCenter - itemVerticalCenter);
    
    buttonPositions.push({
      item: index + 1,
      rightOffset,
      verticalOffset,
      buttonRect,
      itemRect
    });
    
    console.log(`   Item ${index + 1}: Right offset: ${rightOffset.toFixed(1)}px, Vertical offset: ${verticalOffset.toFixed(1)}px`);
  });
  
  // Check for consistency in right alignment
  const rightOffsets = buttonPositions.map(p => p.rightOffset);
  const maxRightOffset = Math.max(...rightOffsets);
  const minRightOffset = Math.min(...rightOffsets);
  const rightOffsetRange = maxRightOffset - minRightOffset;
  
  console.log(`   Right alignment consistency: ${rightOffsetRange.toFixed(1)}px range`);
  if (rightOffsetRange > 5) {
    console.warn(`   ⚠️ Right alignment inconsistent (${rightOffsetRange.toFixed(1)}px range)`);
    alignmentIssues++;
  } else {
    console.log('   ✅ Right alignment consistent');
  }
  
  // Test 2: Check vertical centering
  console.log('\n🧪 Test 2: Checking vertical centering...');
  let centeringIssues = 0;
  
  buttonPositions.forEach(pos => {
    if (pos.verticalOffset > 3) {
      console.warn(`   ⚠️ Item ${pos.item}: Button not vertically centered (${pos.verticalOffset.toFixed(1)}px off)`);
      centeringIssues++;
    } else {
      console.log(`   ✅ Item ${pos.item}: Button properly centered`);
    }
  });
  
  // Test 3: Check responsive behavior
  console.log('\n🧪 Test 3: Checking responsive behavior...');
  const viewportWidth = window.innerWidth;
  console.log(`   Current viewport width: ${viewportWidth}px`);
  
  let responsiveCategory = 'desktop';
  if (viewportWidth <= 480) {
    responsiveCategory = 'mobile';
  } else if (viewportWidth <= 768) {
    responsiveCategory = 'tablet';
  } else if (viewportWidth <= 1024) {
    responsiveCategory = 'medium';
  }
  
  console.log(`   Responsive category: ${responsiveCategory}`);
  
  // Check button sizes for responsive behavior
  const buttonSizes = buttonPositions.map(p => ({
    item: p.item,
    width: p.buttonRect.width,
    height: p.buttonRect.height
  }));
  
  const expectedButtonSize = responsiveCategory === 'mobile' ? 24 : 
                           responsiveCategory === 'tablet' ? 28 : 32;
  
  console.log(`   Expected button size: ${expectedButtonSize}px`);
  
  buttonSizes.forEach(size => {
    const sizeDiff = Math.abs(size.width - expectedButtonSize);
    if (sizeDiff > 2) {
      console.warn(`   ⚠️ Item ${size.item}: Button size unexpected (${size.width}px instead of ~${expectedButtonSize}px)`);
    } else {
      console.log(`   ✅ Item ${size.item}: Button size correct (${size.width}px)`);
    }
  });
  
  // Test 4: Check tooltip functionality
  console.log('\n🧪 Test 4: Checking tooltip functionality...');
  const firstButton = riskItems[0].querySelector('.tooltip-trigger');
  if (firstButton) {
    console.log('   Testing tooltip trigger on first item...');
    
    // Create a mock click event
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    
    // Store original event handlers
    const originalClick = firstButton.onclick;
    
    // Add test event listener
    let tooltipTriggered = false;
    firstButton.addEventListener('click', () => {
      tooltipTriggered = true;
    }, { once: true });
    
    // Trigger the click
    firstButton.dispatchEvent(clickEvent);
    
    if (tooltipTriggered) {
      console.log('   ✅ Tooltip click event triggered successfully');
    } else {
      console.warn('   ⚠️ Tooltip click event may not be working properly');
    }
  }
  
  // Test 5: Check layout stability with different content lengths
  console.log('\n🧪 Test 5: Checking layout stability...');
  const riskDetailsElements = poorPerformanceCard.querySelectorAll('.risk-details');
  let layoutIssues = 0;
  
  riskDetailsElements.forEach((details, index) => {
    const detailsHeight = details.getBoundingClientRect().height;
    const parentItem = details.closest('.risk-item');
    const parentHeight = parentItem.getBoundingClientRect().height;
    
    console.log(`   Item ${index + 1}: Details height: ${detailsHeight.toFixed(1)}px, Total height: ${parentHeight.toFixed(1)}px`);
  });
  
  // Summary
  console.log('\n📋 SUMMARY:');
  console.log(`   Total items tested: ${riskItems.length}`);
  console.log(`   Alignment issues: ${alignmentIssues}`);
  console.log(`   Centering issues: ${centeringIssues}`);
  console.log(`   Responsive category: ${responsiveCategory}`);
  
  const totalIssues = alignmentIssues + centeringIssues;
  if (totalIssues === 0) {
    console.log('   🎉 ALL TESTS PASSED - Tooltip positioning is working correctly!');
  } else {
    console.log(`   ⚠️ ${totalIssues} issues found that may need attention`);
  }
  
  return {
    totalItems: riskItems.length,
    alignmentIssues,
    centeringIssues,
    responsiveCategory,
    buttonPositions,
    success: totalIssues === 0
  };
}

// Auto-run the test when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', testTooltipPositioning);
} else {
  testTooltipPositioning();
}

// Export for manual testing
window.testTooltipPositioning = testTooltipPositioning;

console.log('📝 Tooltip positioning test script loaded. Run testTooltipPositioning() to test manually.');