const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    console.log('Waiting for dashboard to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 1: Check WeakSpotExploiters card
    console.log('\n=== Testing WeakSpotExploiters Card ===');
    const weakSpotCard = await page.$('.card-header h3');
    if (weakSpotCard) {
      const cardTitle = await page.evaluate(el => el.textContent, weakSpotCard);
      console.log('Found card:', cardTitle);
    }
    
    // Look for any error messages
    const errorMessages = await page.$$eval('*', elements => 
      elements.filter(el => el.textContent && el.textContent.includes('No games scheduled'))
        .map(el => el.textContent)
    );
    
    if (errorMessages.length > 0) {
      console.log('❌ Found error messages:', errorMessages);
    } else {
      console.log('✅ No "No games scheduled" errors found');
    }
    
    // Test 2: Check HR Prediction card
    console.log('\n=== Testing HR Prediction Card ===');
    const hrPredictions = await page.$$eval('.hr-prediction-item, .prediction-item', elements => 
      elements.map(el => el.textContent)
    );
    
    if (hrPredictions.length > 0) {
      console.log('✅ HR Predictions found:', hrPredictions.length, 'items');
      console.log('Sample:', hrPredictions.slice(0, 2));
    } else {
      console.log('❌ No HR predictions found');
    }
    
    // Test 3: Check Player Props Ladder
    console.log('\n=== Testing Player Props Ladder ===');
    
    // First, look for scratchpad controls
    const scratchpadControls = await page.$$('.scratchpad-controls, .filter-controls');
    console.log('Scratchpad controls found:', scratchpadControls.length);
    
    // Look for the filter checkbox/toggle
    const filterToggle = await page.$('input[type="checkbox"], .filter-toggle');
    if (filterToggle) {
      console.log('Found filter toggle, testing scratchpad functionality...');
      
      // Try to add a player to scratchpad first
      const addButtons = await page.$$('.add-to-scratchpad, .scratchpad-add');
      if (addButtons.length > 0) {
        console.log('Found add to scratchpad buttons:', addButtons.length);
        await addButtons[0].click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Toggle the filter
      await filterToggle.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check for warning message
      const warning = await page.$('.scratchpad-warning, .filter-warning');
      if (warning) {
        const warningText = await page.evaluate(el => el.textContent, warning);
        console.log('✅ Filter warning found:', warningText);
        
        // Check for Show All button
        const showAllButton = await page.$('.show-all-button, .clear-filter');
        if (showAllButton) {
          console.log('✅ Show All button found');
          
          // Test the button
          await showAllButton.click();
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('✅ Show All button clicked successfully');
        } else {
          console.log('❌ Show All button not found');
        }
      } else {
        console.log('❌ Filter warning not found');
      }
    } else {
      console.log('❌ Filter toggle not found');
    }
    
    console.log('\n=== Taking screenshot ===');
    await page.screenshot({ path: 'dashboard-test.png', fullPage: true });
    console.log('Screenshot saved as dashboard-test.png');
    
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await browser.close();
  }
})();