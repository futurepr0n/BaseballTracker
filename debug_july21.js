const fs = require('fs');
const path = require('path');

// Test: Check if July 21st data exists and what dates are valid
function checkJuly21Data() {
    console.log('🔍 Testing July 21st data availability...\n');
    
    // Check if July 21st file exists
    const july21Path = './public/data/2025/july/july_21_2025.json';
    const exists = fs.existsSync(july21Path);
    console.log(`📁 July 21st file exists: ${exists}`);
    
    if (exists) {
        try {
            const data = JSON.parse(fs.readFileSync(july21Path, 'utf8'));
            console.log(`🎮 Games on July 21st: ${data.games?.length || 0}`);
            
            // Check for Yankees and Aaron Judge
            const nyy_games = data.games?.filter(game => 
                game.homeTeam === 'NYY' || game.awayTeam === 'NYY'
            ) || [];
            console.log(`⚾ Yankees games: ${nyy_games.length}`);
            
            if (nyy_games.length > 0) {
                const game = nyy_games[0];
                const players = [
                    ...(game.homeStats || []), 
                    ...(game.awayStats || [])
                ];
                const judgeData = players.filter(p => 
                    p.name && p.name.toLowerCase().includes('judge')
                );
                console.log(`👨‍⚖️ Aaron Judge entries: ${judgeData.length}`);
                
                if (judgeData.length > 0) {
                    console.log('📊 Judge data sample:', {
                        name: judgeData[0].name,
                        team: judgeData[0].team,
                        hits: judgeData[0].hits,
                        abs: judgeData[0].abs,
                        gameId: judgeData[0].gameId
                    });
                }
            }
        } catch (error) {
            console.error('❌ Error reading July 21st data:', error.message);
        }
    }
    
    // Check date generation logic (simplified version)
    const today = new Date('2025-07-22'); // Simulating today as July 22nd
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 120); // Go back 120 days
    
    console.log('\n📅 Date generation test:');
    console.log(`Start date: ${startDate.toISOString().split('T')[0]}`);
    console.log(`End date: ${today.toISOString().split('T')[0]}`);
    
    // Generate some sample dates around July 21st
    const sampleDates = [];
    for (let i = -5; i <= 5; i++) {
        const date = new Date('2025-07-21');
        date.setDate(date.getDate() + i);
        sampleDates.push(date.toISOString().split('T')[0]);
    }
    
    console.log('\n📍 Dates around July 21st:');
    sampleDates.forEach((date, index) => {
        const filePath = `./public/data/2025/${getMonthName(date)}/july_${date.split('-')[2]}_2025.json`;
        const exists = fs.existsSync(filePath);
        console.log(`  ${date}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    });
}

function getMonthName(dateStr) {
    const months = ['january', 'february', 'march', 'april', 'may', 'june',
                   'july', 'august', 'september', 'october', 'november', 'december'];
    const month = parseInt(dateStr.split('-')[1]) - 1;
    return months[month];
}

checkJuly21Data();