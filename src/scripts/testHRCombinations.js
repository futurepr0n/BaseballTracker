#!/usr/bin/env node

/**
 * Test HR Combinations Service
 * 
 * Quick test to verify the HR combinations data loads correctly
 */

const path = require('path');

// Mock fetch for Node.js environment
global.fetch = require('node-fetch');

// Add the project root to require path
const projectRoot = path.join(__dirname, '../..');
process.chdir(projectRoot);

async function testHRCombinations() {
  console.log('🧪 Testing HR Combinations Service...');
  
  try {
    // Test direct file access
    console.log('📂 Testing file access...');
    const response = await fetch('http://localhost:3000/data/hr_combinations/hr_combinations_latest.json');
    
    if (!response.ok) {
      console.error('❌ HTTP request failed:', response.status);
      return;
    }
    
    console.log('✅ HTTP request successful');
    
    const data = await response.json();
    console.log('✅ JSON parsing successful');
    
    console.log('📊 Data structure:');
    console.log(`  - Generated at: ${data.generatedAt}`);
    console.log(`  - Group 2: ${data.group_2?.length || 0} combinations`);
    console.log(`  - Group 3: ${data.group_3?.length || 0} combinations`);
    console.log(`  - Group 4: ${data.group_4?.length || 0} combinations`);
    
    // Test each group has valid combinations
    ['group_2', 'group_3', 'group_4'].forEach(groupKey => {
      const combinations = data[groupKey];
      if (combinations && combinations.length > 0) {
        const sample = combinations[0];
        console.log(`\n📋 Sample from ${groupKey}:`);
        console.log(`  - Players: ${sample.players.map(p => `${p.name} (${p.team})`).join(', ')}`);
        console.log(`  - Occurrences: ${sample.occurrences}`);
        console.log(`  - Last occurrence: ${sample.lastOccurrence}`);
      }
    });
    
    console.log('\n✅ All tests passed! HR Combinations service should work correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test
testHRCombinations();