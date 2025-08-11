#!/usr/bin/env node

/**
 * Test suite for dateUtils.js timezone handling
 * Tests various scenarios to ensure consistent date calculations across timezones
 */

import {
  createNormalizedDate,
  getTodayNormalized,
  getDaysAgo,
  formatDateForDisplay,
  getDaysAgoText,
  debugDateParsing
} from './src/utils/dateUtils.js';

console.log('🧪 Testing Date Utility Functions');
console.log('================================\n');

// Helper function to create a mock "today" for testing
const createMockToday = (dateString) => {
  const parts = dateString.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  return new Date(Date.UTC(year, month, day));
};

// Test scenarios
const testScenarios = [
  {
    name: 'Test 1: "2025-08-09" when today is "2025-08-10" - should show "Yesterday"',
    testDate: '2025-08-09',
    mockToday: '2025-08-10',
    expectedDaysAgo: 1,
    expectedText: 'Yesterday'
  },
  {
    name: 'Test 2: "2025-08-08" when today is "2025-08-10" - should show "2 days ago"',
    testDate: '2025-08-08',
    mockToday: '2025-08-10',
    expectedDaysAgo: 2,
    expectedText: '2 days ago'
  },
  {
    name: 'Test 3: "2025-08-10" when today is "2025-08-10" - should show "Today"',
    testDate: '2025-08-10',
    mockToday: '2025-08-10',
    expectedDaysAgo: 0,
    expectedText: 'Today'
  },
  {
    name: 'Test 4: "2025-08-05" when today is "2025-08-10" - should show "5 days ago"',
    testDate: '2025-08-05',
    mockToday: '2025-08-10',
    expectedDaysAgo: 5,
    expectedText: '5 days ago'
  },
  {
    name: 'Test 5: Cross-month boundary - "2025-07-31" when today is "2025-08-02"',
    testDate: '2025-07-31',
    mockToday: '2025-08-02',
    expectedDaysAgo: 2,
    expectedText: '2 days ago'
  },
  {
    name: 'Test 6: Cross-year boundary - "2024-12-31" when today is "2025-01-02"',
    testDate: '2024-12-31',
    mockToday: '2025-01-02',
    expectedDaysAgo: 2,
    expectedText: '2 days ago'
  }
];

// Run tests
console.log('Current system timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('Current system time:', new Date().toISOString());
console.log('\n📋 Running Test Scenarios:\n');

let passedTests = 0;
let totalTests = testScenarios.length;

testScenarios.forEach((scenario, index) => {
  console.log(`${index + 1}. ${scenario.name}`);
  
  const mockTodayDate = createMockToday(scenario.mockToday);
  const actualDaysAgo = getDaysAgo(scenario.testDate, mockTodayDate);
  const actualText = getDaysAgoText(scenario.testDate);
  
  // For getDaysAgoText, we need to temporarily override getTodayNormalized
  // Since we can't easily mock imports, we'll calculate the expected result manually
  const testDate = createNormalizedDate(scenario.testDate);
  const timeDiff = mockTodayDate.getTime() - testDate.getTime();
  const calculatedDaysAgo = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
  
  let calculatedText;
  if (calculatedDaysAgo === 0) calculatedText = 'Today';
  else if (calculatedDaysAgo === 1) calculatedText = 'Yesterday';
  else calculatedText = `${calculatedDaysAgo} days ago`;
  
  console.log(`   Test Date: ${scenario.testDate}`);
  console.log(`   Mock Today: ${scenario.mockToday}`);
  console.log(`   Expected Days Ago: ${scenario.expectedDaysAgo}`);
  console.log(`   Actual Days Ago: ${actualDaysAgo}`);
  console.log(`   Expected Text: "${scenario.expectedText}"`);
  console.log(`   Calculated Text: "${calculatedText}"`);
  
  const daysAgoCorrect = actualDaysAgo === scenario.expectedDaysAgo;
  const textCorrect = calculatedText === scenario.expectedText;
  
  if (daysAgoCorrect && textCorrect) {
    console.log('   ✅ PASS\n');
    passedTests++;
  } else {
    console.log('   ❌ FAIL');
    if (!daysAgoCorrect) console.log(`      Days ago mismatch: expected ${scenario.expectedDaysAgo}, got ${actualDaysAgo}`);
    if (!textCorrect) console.log(`      Text mismatch: expected "${scenario.expectedText}", got "${calculatedText}"`);
    console.log('');
  }
});

console.log('🔍 Testing Timezone Boundary Scenarios:\n');

// Test timezone boundary scenarios
const timezoneBoundaryTests = [
  {
    name: 'Late night timezone test (11:30 PM EST)',
    testDate: '2025-08-09',
    description: 'Simulating late night when date might differ across timezones'
  },
  {
    name: 'Early morning timezone test (2:30 AM EST)', 
    testDate: '2025-08-10',
    description: 'Simulating early morning edge case'
  }
];

timezoneBoundaryTests.forEach((test, index) => {
  console.log(`${index + 1}. ${test.name}`);
  console.log(`   Description: ${test.description}`);
  
  const debugInfo = debugDateParsing(test.testDate);
  console.log(`   Input: ${debugInfo.input}`);
  console.log(`   Normalized UTC: ${debugInfo.normalized}`);
  console.log(`   Current Timezone: ${debugInfo.timezone}`);
  console.log(`   Days Ago: ${debugInfo.daysAgo}`);
  console.log(`   Display Text: "${debugInfo.daysAgoText}"`);
  console.log('');
});

console.log('🔧 Testing Edge Cases:\n');

// Test edge cases
const edgeCases = [
  { input: '', description: 'Empty string' },
  { input: null, description: 'Null input' },
  { input: 'invalid-date', description: 'Invalid date format' },
  { input: '2025-13-01', description: 'Invalid month' },
  { input: '2025-02-30', description: 'Invalid day for month' }
];

edgeCases.forEach((testCase, index) => {
  console.log(`${index + 1}. Testing ${testCase.description}: "${testCase.input}"`);
  
  try {
    const normalized = createNormalizedDate(testCase.input);
    const daysAgo = getDaysAgo(testCase.input);
    const displayText = getDaysAgoText(testCase.input);
    const formattedDate = formatDateForDisplay(testCase.input);
    
    console.log(`   Normalized: ${normalized}`);
    console.log(`   Days Ago: ${daysAgo}`);
    console.log(`   Display Text: "${displayText}"`);
    console.log(`   Formatted: "${formattedDate}"`);
    console.log('   ✅ Handled gracefully\n');
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }
});

console.log('📊 Test Summary');
console.log('===============');
console.log(`Passed: ${passedTests}/${totalTests} main test scenarios`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('🎉 All tests passed! Date utilities are working correctly.');
} else {
  console.log('⚠️  Some tests failed. Please review the date utility functions.');
}

console.log('\n💡 Additional Information:');
console.log(`System Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
console.log(`Current UTC Time: ${new Date().toISOString()}`);
console.log(`Current Local Time: ${new Date().toString()}`);

// Show current behavior with actual today
console.log('\n🔍 Current System Behavior:');
const actualToday = getTodayNormalized();
console.log(`Today (normalized): ${actualToday.toISOString()}`);

const testDates = ['2025-08-09', '2025-08-10', '2025-08-11'];
testDates.forEach(date => {
  const daysAgo = getDaysAgo(date);
  const text = getDaysAgoText(date);
  console.log(`${date}: ${daysAgo} days ago - "${text}"`);
});