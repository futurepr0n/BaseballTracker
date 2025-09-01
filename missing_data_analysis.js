const fs = require('fs');
const path = require('path');

// Analysis results storage
const analysisResults = {
    criticalMissingDates: [],
    partialDataDates: [],
    doubleheaderIssues: [],
    highProfilePlayerGaps: [],
    filesMissing: [],
    suspiciouslyLowCounts: []
};

// High-profile players to specifically track
const highProfilePlayers = [
    'A. Judge', 'Aaron Judge', 'S. Ohtani', 'Shohei Ohtani', 
    'M. Betts', 'Mookie Betts', 'F. Tatis Jr.', 'Fernando Tatis Jr.',
    'R. Acuna Jr.', 'Ronald Acuna Jr.', 'V. Guerrero Jr.', 'Vladimir Guerrero Jr.',
    'M. Trout', 'Mike Trout', 'B. Harper', 'Bryce Harper',
    'J. Soto', 'Juan Soto', 'P. Alonso', 'Pete Alonso'
];

// MLB team abbreviations
const mlbTeams = [
    'NYY', 'LAD', 'HOU', 'ATL', 'PHI', 'SD', 'NYM', 'BOS', 'TEX', 'TOR',
    'BAL', 'MIN', 'CLE', 'TB', 'SF', 'MIL', 'STL', 'SEA', 'ARI', 'DET',
    'LAA', 'CHC', 'CWS', 'MIA', 'COL', 'CIN', 'PIT', 'KC', 'WAS', 'OAK'
];

function generateDateRange(startDate, endDate) {
    const dates = [];
    const currentDate = new Date(startDate);
    const lastDate = new Date(endDate);
    
    while (currentDate <= lastDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
}

function getMonthName(month) {
    const months = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
    ];
    return months[month];
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getFilePath(date) {
    const year = date.getFullYear();
    const monthName = getMonthName(date.getMonth());
    const day = String(date.getDate()).padStart(2, '0');
    
    // Use centralized data path configuration
    const { DATA_PATH } = require('./config/dataPath');
    
    return path.join(
        DATA_PATH,
        year.toString(),
        monthName,
        `${monthName}_${day}_${year}.json`
    );
}

function analyzeFile(filePath, expectedDate) {
    try {
        if (!fs.existsSync(filePath)) {
            analysisResults.filesMissing.push({
                date: expectedDate,
                filePath: filePath,
                reason: 'File does not exist'
            });
            return null;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        const analysis = {
            date: expectedDate,
            filePath: filePath,
            gameCount: data.games ? data.games.length : 0,
            playerCount: data.players ? data.players.length : 0,
            games: data.games || [],
            players: data.players || [],
            issues: []
        };

        // Check for games with Final status but no players
        const finalGames = data.games ? data.games.filter(g => g.status === 'Final') : [];
        if (finalGames.length > 0 && analysis.playerCount === 0) {
            analysis.issues.push(`${finalGames.length} final games but no player data`);
            analysisResults.criticalMissingDates.push({
                date: expectedDate,
                issue: 'Final games with no player data',
                gameCount: finalGames.length,
                playerCount: 0,
                games: finalGames
            });
        }

        // Check for suspiciously low player counts when games completed
        if (finalGames.length > 0 && analysis.playerCount > 0 && analysis.playerCount < 200) {
            analysis.issues.push(`Low player count (${analysis.playerCount}) for ${finalGames.length} completed games`);
            analysisResults.suspiciouslyLowCounts.push({
                date: expectedDate,
                playerCount: analysis.playerCount,
                gameCount: finalGames.length,
                expectedRange: '200-400 players',
                games: finalGames
            });
        }

        // Check for partial team data
        const teamsInGames = new Set();
        finalGames.forEach(game => {
            teamsInGames.add(game.homeTeam);
            teamsInGames.add(game.awayTeam);
        });

        const teamsWithPlayers = new Set();
        if (data.players) {
            data.players.forEach(player => {
                teamsWithPlayers.add(player.team);
            });
        }

        const missingTeams = [...teamsInGames].filter(team => !teamsWithPlayers.has(team));
        if (missingTeams.length > 0) {
            analysis.issues.push(`Teams missing player data: ${missingTeams.join(', ')}`);
            analysisResults.partialDataDates.push({
                date: expectedDate,
                missingTeams: missingTeams,
                totalTeams: teamsInGames.size,
                games: finalGames
            });
        }

        // Check for doubleheader issues
        const gamesByTeam = {};
        finalGames.forEach(game => {
            const homeKey = game.homeTeam;
            const awayKey = game.awayTeam;
            
            gamesByTeam[homeKey] = (gamesByTeam[homeKey] || 0) + 1;
            gamesByTeam[awayKey] = (gamesByTeam[awayKey] || 0) + 1;
        });

        const teamsWithMultipleGames = Object.entries(gamesByTeam).filter(([team, count]) => count > 1);
        if (teamsWithMultipleGames.length > 0) {
            analysis.issues.push(`Potential doubleheader: ${teamsWithMultipleGames.map(([t, c]) => `${t}(${c})`).join(', ')}`);
            analysisResults.doubleheaderIssues.push({
                date: expectedDate,
                teamsWithMultipleGames: teamsWithMultipleGames,
                totalPlayerCount: analysis.playerCount,
                games: finalGames
            });
        }

        // Check for missing high-profile players
        const playersPresent = new Set();
        if (data.players) {
            data.players.forEach(player => {
                playersPresent.add(player.name);
            });
        }

        const missingStars = highProfilePlayers.filter(star => {
            // Check if the player's team played today
            const variations = [star];
            if (star.includes('.')) {
                variations.push(star.replace(/\./g, ''));
            }
            
            return !variations.some(v => playersPresent.has(v));
        });

        // Only flag if we have teams that these players should be on
        const yankeesPlayed = [...teamsInGames].includes('NYY');
        const dodgersPlayed = [...teamsInGames].includes('LAD');
        const angelsPlayed = [...teamsInGames].includes('LAA');

        const criticalMissingStars = [];
        if (yankeesPlayed && !playersPresent.has('A. Judge') && !playersPresent.has('Aaron Judge')) {
            criticalMissingStars.push('Aaron Judge (NYY)');
        }
        if (dodgersPlayed && !playersPresent.has('S. Ohtani') && !playersPresent.has('Shohei Ohtani')) {
            criticalMissingStars.push('Shohei Ohtani (LAD)');
        }
        if (angelsPlayed && !playersPresent.has('M. Trout') && !playersPresent.has('Mike Trout')) {
            criticalMissingStars.push('Mike Trout (LAA)');
        }

        if (criticalMissingStars.length > 0) {
            analysis.issues.push(`Missing high-profile players: ${criticalMissingStars.join(', ')}`);
            analysisResults.highProfilePlayerGaps.push({
                date: expectedDate,
                missingPlayers: criticalMissingStars,
                teamsPlayed: [...teamsInGames],
                playerCount: analysis.playerCount
            });
        }

        return analysis;

    } catch (error) {
        analysisResults.filesMissing.push({
            date: expectedDate,
            filePath: filePath,
            reason: `Error reading file: ${error.message}`
        });
        return null;
    }
}

function generateReport() {
    console.log('='.repeat(80));
    console.log('COMPREHENSIVE MISSING DATA ANALYSIS REPORT');
    console.log('Period: March 18, 2025 - June 19, 2025');
    console.log('='.repeat(80));

    // Critical Missing Dates
    console.log('\n📛 CRITICAL MISSING DATES (Major data gaps)');
    console.log('-'.repeat(50));
    if (analysisResults.criticalMissingDates.length === 0) {
        console.log('✅ No critical missing dates found');
    } else {
        analysisResults.criticalMissingDates.forEach(issue => {
            console.log(`🚨 ${issue.date}: ${issue.issue}`);
            console.log(`   Games: ${issue.gameCount}, Players: ${issue.playerCount}`);
            if (issue.games) {
                issue.games.forEach(game => {
                    console.log(`   - ${game.awayTeam} @ ${game.homeTeam} (${game.status})`);
                });
            }
            console.log('');
        });
    }

    // Files Missing
    console.log('\n📁 MISSING FILES');
    console.log('-'.repeat(50));
    if (analysisResults.filesMissing.length === 0) {
        console.log('✅ All expected files present');
    } else {
        analysisResults.filesMissing.forEach(missing => {
            console.log(`❌ ${missing.date}: ${missing.reason}`);
            console.log(`   Path: ${missing.filePath}`);
        });
    }

    // Suspiciously Low Counts
    console.log('\n⚠️  SUSPICIOUSLY LOW PLAYER COUNTS');
    console.log('-'.repeat(50));
    if (analysisResults.suspiciouslyLowCounts.length === 0) {
        console.log('✅ No suspiciously low player counts found');
    } else {
        analysisResults.suspiciouslyLowCounts.forEach(issue => {
            console.log(`🔢 ${issue.date}: ${issue.playerCount} players for ${issue.gameCount} games`);
            console.log(`   Expected: ${issue.expectedRange}`);
            issue.games.forEach(game => {
                console.log(`   - ${game.awayTeam} @ ${game.homeTeam}`);
            });
            console.log('');
        });
    }

    // Partial Data Dates
    console.log('\n⚠️  PARTIAL DATA DATES (Some teams/players missing)');
    console.log('-'.repeat(50));
    if (analysisResults.partialDataDates.length === 0) {
        console.log('✅ No partial data issues found');
    } else {
        analysisResults.partialDataDates.forEach(issue => {
            console.log(`📊 ${issue.date}: Missing ${issue.missingTeams.length}/${issue.totalTeams} teams`);
            console.log(`   Missing teams: ${issue.missingTeams.join(', ')}`);
            console.log('   Games affected:');
            issue.games.forEach(game => {
                const homeAffected = issue.missingTeams.includes(game.homeTeam) ? '🚨' : '✅';
                const awayAffected = issue.missingTeams.includes(game.awayTeam) ? '🚨' : '✅';
                console.log(`   - ${awayAffected}${game.awayTeam} @ ${homeAffected}${game.homeTeam}`);
            });
            console.log('');
        });
    }

    // Doubleheader Issues
    console.log('\n⚾ DOUBLEHEADER ISSUES');
    console.log('-'.repeat(50));
    if (analysisResults.doubleheaderIssues.length === 0) {
        console.log('✅ No doubleheader issues found');
    } else {
        analysisResults.doubleheaderIssues.forEach(issue => {
            console.log(`🔄 ${issue.date}: Multiple games detected`);
            console.log(`   Teams: ${issue.teamsWithMultipleGames.map(([t, c]) => `${t}(${c} games)`).join(', ')}`);
            console.log(`   Total players: ${issue.totalPlayerCount}`);
            console.log(`   Games:`);
            issue.games.forEach(game => {
                console.log(`   - ${game.awayTeam} @ ${game.homeTeam} (${game.status})`);
            });
            console.log('');
        });
    }

    // High-Profile Player Gaps
    console.log('\n⭐ HIGH-PROFILE PLAYER GAPS');
    console.log('-'.repeat(50));
    if (analysisResults.highProfilePlayerGaps.length === 0) {
        console.log('✅ No high-profile player gaps found');
    } else {
        analysisResults.highProfilePlayerGaps.forEach(issue => {
            console.log(`🌟 ${issue.date}: Missing star players`);
            console.log(`   Players: ${issue.missingPlayers.join(', ')}`);
            console.log(`   Teams played: ${issue.teamsPlayed.join(', ')}`);
            console.log(`   Total players: ${issue.playerCount}`);
            console.log('');
        });
    }

    // Summary Statistics
    console.log('\n📈 SUMMARY STATISTICS');
    console.log('-'.repeat(50));
    console.log(`Total dates analyzed: ${generateDateRange(new Date('2025-03-18'), new Date('2025-06-19')).length}`);
    console.log(`Files missing: ${analysisResults.filesMissing.length}`);
    console.log(`Critical missing dates: ${analysisResults.criticalMissingDates.length}`);
    console.log(`Partial data dates: ${analysisResults.partialDataDates.length}`);
    console.log(`Suspiciously low counts: ${analysisResults.suspiciouslyLowCounts.length}`);
    console.log(`Doubleheader issues: ${analysisResults.doubleheaderIssues.length}`);
    console.log(`High-profile player gaps: ${analysisResults.highProfilePlayerGaps.length}`);

    const totalIssues = analysisResults.filesMissing.length + 
                       analysisResults.criticalMissingDates.length + 
                       analysisResults.partialDataDates.length + 
                       analysisResults.suspiciouslyLowCounts.length + 
                       analysisResults.doubleheaderIssues.length + 
                       analysisResults.highProfilePlayerGaps.length;

    console.log(`\n🎯 TOTAL ISSUES IDENTIFIED: ${totalIssues}`);

    if (totalIssues > 0) {
        console.log('\n🔧 RECOMMENDED ACTIONS:');
        console.log('1. Re-scrape missing file dates');
        console.log('2. Verify data collection for partial data dates');
        console.log('3. Check doubleheader processing logic');
        console.log('4. Investigate high-profile player data sources');
        console.log('5. Review data processing pipeline for systematic issues');
    } else {
        console.log('\n🎉 No data issues found! All dates have complete data.');
    }
}

// Main execution
function main() {
    console.log('Starting comprehensive missing data analysis...');
    
    const dateRange = generateDateRange(new Date('2025-03-18'), new Date('2025-06-19'));
    
    console.log(`Analyzing ${dateRange.length} dates from March 18, 2025 to June 19, 2025...`);
    
    let processedCount = 0;
    
    dateRange.forEach(date => {
        const dateStr = formatDate(date);
        const filePath = getFilePath(date);
        
        const analysis = analyzeFile(filePath, dateStr);
        processedCount++;
        
        if (processedCount % 10 === 0) {
            console.log(`Processed ${processedCount}/${dateRange.length} dates...`);
        }
    });
    
    console.log(`Analysis complete. Processed ${processedCount} dates.`);
    generateReport();
}

main();