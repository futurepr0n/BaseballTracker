// src/services/matchupEngine.js
import _ from 'lodash';

// --- Player Name Matching Utilities (moved from MatchupAnalyzer.js) ---
export const convertPlayerName = (name, format = 'lastFirst') => {
    if (!name) return null;
    if (typeof name === 'object' && name !== null) {
        if (format === 'lastFirst' && name.fullName) {
            const parts = name.fullName.split(' ');
            if (parts.length >= 2) {
                const firstName = parts[0];
                const lastName = parts.slice(1).join(' ');
                return `${lastName}, ${firstName}`;
            }
        }
        name = name.name; // Assuming roster data has a 'name' field if not 'fullName'
    }
    if (typeof name !== 'string') return null;

    // Handle "Last, First" format from CSV if target is "First Last"
    if (name.includes(',') && format === 'firstLast') {
        const parts = name.split(', ');
        if (parts.length === 2) {
            return `${parts[1]} ${parts[0]}`;
        }
    }
    // Handle "First Last" or "F. Last" format from roster to "Last, First" for CSV
    if (!name.includes(',') && format === 'lastFirst') {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            const firstName = parts[0];
            const lastName = parts.slice(1).join(' ');
            return `${lastName}, ${firstName}`;
        }
    }
    return name;
};

export const findBestMatch = (targetPlayer, playerList) => {
    if (!targetPlayer || !playerList || !playerList.length) return null;
    
    // Assuming playerList items are rows from CSV with 'last_name, first_name'
    // And targetPlayer is from rosterData { name: "First Last", fullName: "First Last", team: "XXX", ... }
    
    const targetCsvName = convertPlayerName(targetPlayer, 'lastFirst');

    let match = playerList.find(p => p['last_name, first_name'] === targetCsvName);
    if (match) return match;

    // Fallback for partial matches or slight name variations (simplified)
    if (targetPlayer.name) {
        const lastName = targetPlayer.name.split(' ').pop();
        const potentialMatches = playerList.filter(p => 
            p['last_name, first_name'] && p['last_name, first_name'].startsWith(lastName + ',')
        );
        if (potentialMatches.length === 1) return potentialMatches[0];
        if (potentialMatches.length > 1 && targetPlayer.team) {
            // Try to disambiguate by team if team_name_alt exists in CSV
            const teamMatch = potentialMatches.find(p => p.team_name_alt === targetPlayer.team);
            if (teamMatch) return teamMatch;
            return potentialMatches[0]; // Default to first if still ambiguous
        }
    }
    return null;
};


// --- Stat Calculation Utilities ---
function getPAWeightedAverage(records, statField, paField, minPaForStat = 1) {
    let totalProduct = 0;
    let totalPA = 0;
    records.forEach(record => {
        const stat = parseFloat(record[statField]);
        const pa = parseInt(record[paField], 10);
        if (!isNaN(stat) && !isNaN(pa) && pa >= minPaForStat) {
            totalProduct += stat * pa;
            totalPA += pa;
        }
    });
    return totalPA > 0 ? totalProduct / totalPA : null;
}

// --- League Average Calculation ---
const STAT_CATEGORIES = {
    hitter: ['woba', 'ba', 'iso', 'k_percentage'],
    pitcher: ['woba_allowed', 'ba_allowed', 'iso_allowed', 'k_percentage_vs_batters']
};

const safeGetPAWeightedAverage = (data, stat, paKey) => {
    const values = data.map(d => ({ stat: d[stat], pa: d[paKey] })).filter(d => d.stat != null && d.pa != null && d.pa > 0);
    if (values.length === 0) return null;
    const totalStatPa = values.reduce((sum, curr) => sum + (parseFloat(curr.stat) * parseInt(curr.pa)), 0);
    const totalPa = values.reduce((sum, curr) => sum + parseInt(curr.pa), 0);
    return totalPa > 0 ? totalStatPa / totalPa : null;
};


export function calculateLeagueAverages(allHitterData, allPitcherData, activeYears) {
    const filteredHitterData = allHitterData.filter(h => activeYears.includes(h.year));
    const filteredPitcherData = allPitcherData.filter(p => activeYears.includes(p.year));

    const leagueAverages = {
        hitter: { overall: {}, vs_RHP: {}, vs_LHP: {} },
        pitcher: { overall: {}, vs_RHB: {}, vs_LHB: {} }
    };

    STAT_CATEGORIES.hitter.forEach(stat => {
        leagueAverages.hitter.overall[stat] = safeGetPAWeightedAverage(filteredHitterData, stat, 'PA');
        leagueAverages.hitter.vs_RHP[stat] = safeGetPAWeightedAverage(filteredHitterData, `${stat}_vs_RHP`, 'pa_vs_RHP');
        leagueAverages.hitter.vs_LHP[stat] = safeGetPAWeightedAverage(filteredHitterData, `${stat}_vs_LHP`, 'pa_vs_LHP');
    });

    STAT_CATEGORIES.pitcher.forEach(statBase => {
        // Assuming pitcher overall stats might have different PA key e.g. PA_faced
        const overallPaKey = filteredPitcherData.some(p => p.PA_faced != null) ? 'PA_faced' : 'BF'; // Or other common PA key for pitchers
        const kStatOverall = statBase === 'k_percentage_vs_batters' ? 'k_percentage_vs_batters' : statBase; // k_percentage might have a diff name overall

        leagueAverages.pitcher.overall[statBase] = safeGetPAWeightedAverage(filteredPitcherData, statBase, overallPaKey);
        if (statBase === 'k_percentage_vs_batters') { // Special handling for k_percentage name
             leagueAverages.pitcher.overall.k_percentage = leagueAverages.pitcher.overall[statBase];
        }


        // For pitcher platoon stats, k_percentage might be k_percentage_vs_RHB, etc.
        const kStatVsRHB = statBase === 'k_percentage_vs_batters' ? 'k_percentage_vs_RHB' : `${statBase}_vs_RHB`;
        const kStatVsLHB = statBase === 'k_percentage_vs_batters' ? 'k_percentage_vs_LHB' : `${statBase}_vs_LHB`;

        leagueAverages.pitcher.vs_RHB[statBase] = safeGetPAWeightedAverage(filteredPitcherData, kStatVsRHB, 'pa_faced_vs_RHB');
        leagueAverages.pitcher.vs_LHB[statBase] = safeGetPAWeightedAverage(filteredPitcherData, kStatVsLHB, 'pa_faced_vs_LHB');
         if (statBase === 'k_percentage_vs_batters') { // Store with generic name too
            leagueAverages.pitcher.vs_RHB.k_percentage = leagueAverages.pitcher.vs_RHB[statBase];
            leagueAverages.pitcher.vs_LHB.k_percentage = leagueAverages.pitcher.vs_LHB[statBase];
        }
    });
    return leagueAverages;
}

// --- Core Matchup Analysis Logic ---
function getPlayerStatsForPlatoon(playerHistoricalStats, pitcherHand, batterEffectiveHand, leagueAverages, type // 'hitter' or 'pitcher'
) {
    const stats = {};
    const relevantLeagueAvg = type === 'hitter'
        ? (pitcherHand === 'R' ? leagueAverages.hitter.vs_RHP : leagueAverages.hitter.vs_LHP)
        : (batterEffectiveHand === 'R' ? leagueAverages.pitcher.vs_RHB : leagueAverages.pitcher.vs_LHB);
    
    const overallLeagueAvg = type === 'hitter' ? leagueAverages.hitter.overall : leagueAverages.pitcher.overall;

    STAT_CATEGORIES[type].forEach(statBase => {
        const statName = type === 'hitter' ? statBase : (statBase === 'k_percentage_vs_batters' ? 'k_percentage' : statBase); // Normalize k_percentage key
        
        const primaryStatField = type === 'hitter'
            ? `${statBase}_vs_${pitcherHand}HP`
            : (statBase === 'k_percentage_vs_batters' ? `k_percentage_vs_${batterEffectiveHand}HB` : `${statBase}_vs_${batterEffectiveHand}HB`);
        
        const primaryPaField = type === 'hitter'
            ? `pa_vs_${pitcherHand}HP`
            : `pa_faced_vs_${batterEffectiveHand}HB`;

        const fallbackStatField = statBase;
        const fallbackPaField = type === 'hitter' ? 'PA' : (playerHistoricalStats.some(p => p.PA_faced != null) ? 'PA_faced' : 'BF');

        stats[statName] = getPAWeightedAverage(playerHistoricalStats, primaryStatField, primaryPaField)
                       ?? getPAWeightedAverage(playerHistoricalStats, fallbackStatField, fallbackPaField) // Fallback to overall if platoon is null
                       ?? (relevantLeagueAvg?.[statName] ?? overallLeagueAvg?.[statName]); // Fallback to league average if no player data
    });
    return stats;
}


export function enhancedAnalyzeMatchup(
    batterProfile, pitcherProfile,
    allHitterData, allPitcherData, // Pass all data for filtering
    leagueAverages, activeYears
) {
    const batterHistoricalStats = allHitterData.filter(s =>
        findBestMatch(batterProfile, [s]) && activeYears.includes(s.year)
    );
    const pitcherHistoricalStats = allPitcherData.filter(s =>
        findBestMatch(pitcherProfile, [s]) && activeYears.includes(s.year)
    );

    if (batterHistoricalStats.length === 0 || pitcherHistoricalStats.length === 0) {
        return {
            advantage: 0, advantageLabel: "Insufficient Data",
            hitPotential: "N/A", hrPotential: "N/A", tbPotential: "N/A", kPotential: "N/A",
            details: { predictedBA: "N/A", predictedHR_Pct: "N/A", predictedSLG: "N/A", predictedK_Pct: "N/A", yearsUsed: activeYears.join(', '), dataPoints: 0 }
        };
    }

    const pHand = pitcherProfile.throwingArm || pitcherProfile.ph; // 'R' or 'L'
    let bEffectiveHand = batterProfile.bats;
    if (bEffectiveHand === 'B') {
        bEffectiveHand = (pHand === 'R') ? 'L' : 'R';
    }

    const batterPlatoonStats = getPlayerStatsForPlatoon(batterHistoricalStats, pHand, bEffectiveHand, leagueAverages, 'hitter');
    const pitcherPlatoonStats = getPlayerStatsForPlatoon(pitcherHistoricalStats, pHand, bEffectiveHand, leagueAverages, 'pitcher');

    const currentLeagueAvgHitterPlatoon = pHand === 'R' ? leagueAverages.hitter.vs_RHP : leagueAverages.hitter.vs_LHP;
    const currentLeagueAvgPitcherPlatoon = bEffectiveHand === 'R' ? leagueAverages.pitcher.vs_RHB : leagueAverages.pitcher.vs_LHB;

    // Calculate advantages (player stat - league average for that split)
    // Then, (batter_advantage - pitcher_advantage_against_that_split)
    const calcAdv = (batterStat, pitcherStat, leagueHitterStat, leaguePitcherStat) => {
        if (batterStat == null || pitcherStat == null || leagueHitterStat == null || leaguePitcherStat == null) return 0;
        const batterAdv = batterStat - leagueHitterStat;
        const pitcherAdvVSLeague = pitcherStat - leaguePitcherStat; // For pitcher, lower woba_allowed is better
        return batterAdv - pitcherAdvVSLeague; // Higher is better for batter
    };
    
    const calcKAdv = (batterK, pitcherK, leagueHitterK, leaguePitcherK) => {
        if (batterK == null || pitcherK == null || leagueHitterK == null || leaguePitcherK == null) return 0;
        const batterAdv = leagueHitterK - batterK; // Batter wants lower K rate
        const pitcherAdvVSLeague = leaguePitcherK - pitcherK; // Pitcher wants higher K rate against batter
        return batterAdv - pitcherAdvVSLeague; // Higher means batter is better at avoiding K than pitcher is at getting K, vs league
    };


    const wobaAdvantage = calcAdv(batterPlatoonStats.woba, pitcherPlatoonStats.woba_allowed, currentLeagueAvgHitterPlatoon.woba, currentLeagueAvgPitcherPlatoon.woba_allowed);
    const isoAdvantage = calcAdv(batterPlatoonStats.iso, pitcherPlatoonStats.iso_allowed, currentLeagueAvgHitterPlatoon.iso, currentLeagueAvgPitcherPlatoon.iso_allowed);
    const baAdvantage = calcAdv(batterPlatoonStats.ba, pitcherPlatoonStats.ba_allowed, currentLeagueAvgHitterPlatoon.ba, currentLeagueAvgPitcherPlatoon.ba_allowed);
    const kAdvantage = calcKAdv(batterPlatoonStats.k_percentage, pitcherPlatoonStats.k_percentage, currentLeagueAvgHitterPlatoon.k_percentage, currentLeagueAvgPitcherPlatoon.k_percentage);


    // Overall advantage score (primarily wOBA-driven, scaled)
    // wOBA differences are typically small, e.g., .050 is a large difference. Scale it to be like -5 to +5.
    const overallAdvantage = (wobaAdvantage || 0) * 50;


    const getPotential = (value, high, medium, lowIsNull = false) => {
        if (value == null && lowIsNull) return "N/A";
        if (value == null) return "Low"; // Default to low if value is null but not N/A
        if (value > high) return 'High';
        if (value > medium) return 'Medium';
        return 'Low';
    };
    
    // K Potential: Higher kAdvantage means batter is less likely to K.
    // So for batter K potential, we look at -kAdvantage (or invert thresholds)
    const getKPotentialBatter = (kAdv, highThresh, medThresh) => {
      if (kAdv == null) return "N/A";
      if (kAdv < highThresh) return 'High'; // Low kAdv means high K potential for batter
      if (kAdv < medThresh) return 'Medium';
      return 'Low';
    };


    const hitPotential = getPotential(baAdvantage, 0.025, 0.005); // e.g. +25 BA points vs expected
    const hrPotential = getPotential(isoAdvantage, 0.030, 0.010); // e.g. +30 ISO points vs expected
    const tbPotential = getPotential(wobaAdvantage, 0.035, 0.015); // Based on wOBA advantage
    const kPotential = getKPotentialBatter(kAdvantage, -0.03, 0.02); // Batter K potential, higher kAdv is good for batter (low K potential)

    // Predicted Stats
    const predictedBA = Math.max(0.150, Math.min(0.400, (currentLeagueAvgHitterPlatoon.ba || 0.250) + (baAdvantage || 0))).toFixed(3);
    const predictedISO = Math.max(0.050, Math.min(0.350, (currentLeagueAvgHitterPlatoon.iso || 0.150) + (isoAdvantage || 0)));
    const predictedSLG = (parseFloat(predictedBA) + predictedISO).toFixed(3);
    const predictedHR_Pct = Math.max(0.005, Math.min(0.100, ((currentLeagueAvgHitterPlatoon.iso || 0.150) / 2.5) + ((isoAdvantage || 0) / 2.5) )).toFixed(3); // very rough HR %
    const predictedK_Pct = Math.max(0.050, Math.min(0.500, (currentLeagueAvgHitterPlatoon.k_percentage || 0.22) - (kAdvantage || 0))).toFixed(3);


    return {
        advantage: parseFloat(overallAdvantage.toFixed(1)),
        advantageLabel: getAdvantageLabel(overallAdvantage),
        hitPotential,
        hrPotential,
        tbPotential,
        kPotential,
        details: {
            predictedBA,
            predictedSLG,
            predictedHR_Pct: (parseFloat(predictedHR_Pct)*100).toFixed(1) + "%", // display as percentage string
            predictedK_Pct: (parseFloat(predictedK_Pct)*100).toFixed(1) + "%",  // display as percentage string
            // raw values for potential internal use if needed
            _wobaAdv: wobaAdvantage, _isoAdv: isoAdvantage, _baAdv: baAdvantage, _kAdv: kAdvantage,
            yearsUsed: activeYears.join(', '),
            dataPointsHitter: batterHistoricalStats.reduce((sum, s) => sum + (s.PA || s.pa_vs_RHP || s.pa_vs_LHP || 0), 0), // Example PA sum
            dataPointsPitcher: pitcherHistoricalStats.reduce((sum, s) => sum + (s.PA_faced || s.pa_faced_vs_RHB || s.pa_faced_vs_LHB || 0), 0),
        }
    };
}

export const getAdvantageLabel = (advantageScore) => {
    // Adjust thresholds based on the new `overallAdvantage` scale (now roughly -5 to +5, from wOBA*50)
    if (advantageScore > 2.5) return 'Strong Batter Advantage'; // e.g., > .050 wOBA diff
    if (advantageScore > 1.0) return 'Batter Advantage';        // e.g., > .020 wOBA diff
    if (advantageScore > 0.25) return 'Slight Batter Advantage';// e.g., > .005 wOBA diff
    if (advantageScore < -2.5) return 'Strong Pitcher Advantage';
    if (advantageScore < -1.0) return 'Pitcher Advantage';
    if (advantageScore < -0.25) return 'Slight Pitcher Advantage';
    return 'Neutral Matchup';
};