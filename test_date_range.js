// Test the date range generation logic used in fetchFullSeasonPlayerData
function testDateRangeGeneration() {
    console.log('🧪 Testing date range generation for fetchFullSeasonPlayerData\n');
    
    // Simulate today as July 22, 2025 (current date in test environment)
    const today = new Date('2025-07-22');
    console.log(`Today: ${today.toISOString().split('T')[0]}`);
    
    // This is the logic from fetchFullSeasonPlayerData
    const validDates = [];
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 120); // 120 days back
    
    console.log(`Start date: ${startDate.toISOString().split('T')[0]}`);
    console.log(`End date: ${today.toISOString().split('T')[0]}\n`);
    
    // Generate all dates
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
        validDates.push(d.toISOString().split('T')[0]);
    }
    
    console.log(`Total dates generated: ${validDates.length}`);
    
    // Find July 21st specifically
    const july21Index = validDates.indexOf('2025-07-21');
    console.log(`July 21st position: ${july21Index} ${july21Index >= 0 ? '✅ INCLUDED' : '❌ MISSING'}`);
    
    // Show dates around July 21st
    console.log('\n📅 Dates around July 21st:');
    const july21DateIndex = validDates.indexOf('2025-07-21');
    if (july21DateIndex >= 0) {
        const start = Math.max(0, july21DateIndex - 5);
        const end = Math.min(validDates.length, july21DateIndex + 6);
        
        for (let i = start; i < end; i++) {
            const indicator = i === july21DateIndex ? '👉' : '  ';
            console.log(`${indicator} ${i + 1}. ${validDates[i]}`);
        }
    }
    
    // Test the reverse chronological sorting (newest first)
    console.log('\n🔄 Testing reverse chronological sorting:');
    const sortedDates = [...validDates].sort((a, b) => b.localeCompare(a));
    console.log('First 10 dates (newest first):');
    sortedDates.slice(0, 10).forEach((date, index) => {
        console.log(`  ${index + 1}. ${date}`);
    });
    
    const july21SortedIndex = sortedDates.indexOf('2025-07-21');
    console.log(`\nJuly 21st position after sorting: ${july21SortedIndex + 1} (should be position 2 after 2025-07-22)`);
}

testDateRangeGeneration();