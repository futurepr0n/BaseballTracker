import React, { useState, useEffect, useMemo } from 'react';

// Using simple symbols that don't require external dependencies
const ChevronDown = () => <span style={{ fontSize: '12px' }}>▼</span>;
const ChevronUp = () => <span style={{ fontSize: '12px' }}>▲</span>;

const PinheadsPlayhouse = ({ currentDate }) => {
  // Component state
  const [selectedPitcher, setSelectedPitcher] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [analysisResults, setAnalysisResults] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'HR_Score', direction: 'desc' });
  const [filters, setFilters] = useState({
    minHRScore: '',
    minHRProb: '',
    maxKProb: '',
    trendFilter: '',
    contactTrend: ''
  });

  // Data stores
  const [masterPlayerData, setMasterPlayerData] = useState({});
  const [rosterData, setRosterData] = useState([]);
  const [teamData, setTeamData] = useState({});
  const [dailyGameData, setDailyGameData] = useState({});
  const [nameToIdMap, setNameToIdMap] = useState({});

  // League averages and metric ranges (from Python config)
  const leagueAverages = {
    AVG: 0.245, SLG: 0.400, ISO: 0.155, K_PERCENT: 0.22, BB_PERCENT: 0.08,
    HARD_HIT_PERCENT: 0.35, BRL_PERCENT: 0.06, BRL_PA_PERCENT: 0.035
  };

  const metricRanges = {
    slg: { min: 0.250, max: 0.650 }, iso: { min: 0.050, max: 0.350 },
    hard_hit_percent: { min: 0.20, max: 0.60 }, brl_percent: { min: 0.02, max: 0.20 }
  };

  // Python weights (from config.py)
  const WEIGHTS = {
    batter_vs_pitch_slg: 1.5, batter_vs_pitch_hr: 2.0, batter_vs_pitch_hard_hit: 1.0,
    batter_overall_brl_percent: 2.5, batter_overall_hard_hit: 1.2, batter_overall_iso: 1.5,
    pitcher_overall_brl_percent_allowed: 2.0, pitcher_overall_hard_hit_allowed: 1.0,
    historical_trend_bonus: 0.7, recent_performance_bonus: 1.5, ev_matchup_bonus: 1.0,
    due_for_hr_factor: 0.5, due_for_hr_hits_factor: 0.3, heating_up_contact_factor: 0.4,
    cold_batter_factor: 0.4, trend_2025_vs_2024_bonus: 0.8
  };

  const W_ARSENAL_MATCHUP = 0.40, W_BATTER_OVERALL = 0.15, W_PITCHER_OVERALL = 0.10;
  const W_HISTORICAL_YOY_CSV = 0.05, W_RECENT_DAILY_GAMES = 0.10, W_CONTEXTUAL = 0.20;

  // Helper functions
  const cleanPlayerName = (nameInput) => {
    if (!nameInput) return null;
    let name = String(nameInput);
    if (name.includes(',')) {
      const parts = name.split(',');
      if (parts.length === 2) name = `${parts[1].trim()} ${parts[0].trim()}`;
    }
    name = name.replace(/\s+/g, ' ').trim();
    name = name.replace(/\b\w/g, l => l.toUpperCase());
    name = name.replace(/\s+(Jr|Sr|Ii|Iii|Iv)\.?$/i, (match, suffix) => {
      return ` ${suffix.toUpperCase().replace('II', 'II').replace('III', 'III').replace('IV', 'IV')}`;
    });
    return name.replace(/(?<=\b[A-Z])\.(?=\s|$)/g, '');
  };

  const normalizeCalculated = (value, metricName, higherIsBetter = true) => {
    if (value == null || isNaN(value)) return 0;
    const range = metricRanges[metricName];
    if (!range) return value * 100;
    
    const { min, max } = range;
    if (max === min) return 50;
    
    let norm = (value - min) / (max - min);
    if (!higherIsBetter) norm = 1 - norm;
    return Math.max(0, Math.min(1, norm)) * 100;
  };

  const adjustStatWithConfidence = (playerStat, playerPA, leagueAvg, confidenceThreshold = 100) => {
    if (playerStat == null || playerPA == null || playerPA < 0) return playerStat;
    const confidence = playerPA / (playerPA + confidenceThreshold);
    return confidence * playerStat + (1 - confidence) * leagueAvg;
  };

  const getApproximatedPA = (stats) => {
    return (stats.AB || 0) + (stats.BB || 0) + (stats.HBP || 0) + (stats.SF || 0) + (stats.SAC || 0);
  };

  // Load data functions
  const loadCSVData = async (filename) => {
    try {
      const response = await fetch(`/data/${filename}`);
      if (!response.ok) return [];
      
      const csvText = await response.text();
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length === 0) return [];
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.length !== headers.length) continue;
        
        const row = {};
        headers.forEach((header, index) => {
          const value = values[index];
          if (value !== '' && !isNaN(value) && !isNaN(parseFloat(value))) {
            row[header] = parseFloat(value);
          } else {
            row[header] = value;
          }
        });
        
        if (row.name) row.cleaned_name = cleanPlayerName(row.name);
        if (row.fullName) row.cleaned_fullName = cleanPlayerName(row.fullName);
        if (row['last_name, first_name']) row.cleaned_fullName = cleanPlayerName(row['last_name, first_name']);
        
        data.push(row);
      }
      
      console.log(`Loaded ${data.length} records from ${filename}`);
      return data;
    } catch (error) {
      console.error(`Error loading ${filename}:`, error);
      return [];
    }
  };

  const loadJSONData = async (filename) => {
    try {
      const response = await fetch(`/data/${filename}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error(`Error loading ${filename}:`, error);
      return null;
    }
  };

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        // Load all data files
        const [rosters, teams, hitterEV, pitcherEV, hitterArsenal, pitcherArsenal] = await Promise.all([
          loadJSONData('rosters.json'),
          loadJSONData('teams.json'),
          loadCSVData('hitter_exit_velocity_2025.csv'),
          loadCSVData('pitcher_exit_velocity_2025.csv'),
          loadCSVData('hitterpitcharsenalstats_2025.csv'),
          loadCSVData('pitcherpitcharsenalstats_2025.csv')
        ]);

        setTeamData(teams || {});

        // Load daily game data
        const dailyData = {};
        const today = new Date();
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const year = date.getFullYear();
          const month = date.toLocaleString('default', { month: 'long' }).toLowerCase();
          const day = String(date.getDate()).padStart(2, '0');
          
          const filename = `${year}/${month}/${month}_${day}_${year}.json`;
          const dayData = await loadJSONData(filename);
          if (dayData) {
            const dateKey = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-${day}`;
            dailyData[dateKey] = dayData;
          }
        }
        setDailyGameData(dailyData);

        // Build master player data
        const masterData = {};
        const nameMap = {};
        
        if (rosters) {
          const cleanedRosters = rosters.map(player => ({
            ...player,
            cleaned_name: cleanPlayerName(player.name),
            cleaned_fullName: cleanPlayerName(player.fullName)
          }));
          setRosterData(cleanedRosters);

          cleanedRosters.forEach(player => {
            const playerId = String(player.id || Math.random());
            const cleanedName = player.cleaned_fullName || player.cleaned_name;
            
            masterData[playerId] = {
              roster_info: { ...player, mlbam_id: playerId, fullName_resolved: cleanedName }
            };
            
            if (cleanedName) nameMap[cleanedName] = playerId;
          });
        }

        // Merge CSV data
        const mergeCSVData = (csvData, dataKey) => {
          csvData.forEach(row => {
            const playerName = row.cleaned_fullName || row.cleaned_name;
            if (playerName && nameMap[playerName]) {
              const playerId = nameMap[playerName];
              if (!masterData[playerId][dataKey]) masterData[playerId][dataKey] = {};
              
              if (dataKey.includes('arsenal') && row.pitch_type) {
                if (!masterData[playerId][dataKey][row.pitch_type]) {
                  masterData[playerId][dataKey][row.pitch_type] = {};
                }
                Object.assign(masterData[playerId][dataKey][row.pitch_type], row);
              } else {
                Object.assign(masterData[playerId][dataKey], row);
              }
            }
          });
        };

        mergeCSVData(hitterEV, 'hitter_overall_ev_stats');
        mergeCSVData(pitcherEV, 'pitcher_overall_ev_stats');
        mergeCSVData(hitterArsenal, 'hitter_pitch_arsenal_stats');
        mergeCSVData(pitcherArsenal, 'pitcher_pitch_arsenal_stats');

        // Process daily stats and build aggregated data
        Object.entries(dailyData).forEach(([dateKey, dayData]) => {
          if (dayData.players) {
            dayData.players.forEach(playerStat => {
              const cleanedName = cleanPlayerName(playerStat.name);
              if (cleanedName && nameMap[cleanedName]) {
                const playerId = nameMap[cleanedName];
                if (!masterData[playerId].stats_2025_aggregated) {
                  masterData[playerId].stats_2025_aggregated = {
                    games: 0, AB: 0, H: 0, HR: 0, BB: 0, K: 0, R: 0, RBI: 0,
                    last_HR_date: null, current_AB_since_last_HR: 0, current_H_since_last_HR: 0,
                    game_dates: []
                  };
                }
                
                const stats = masterData[playerId].stats_2025_aggregated;
                const gameHR = Number(playerStat.HR) || 0;
                
                if (!stats.game_dates.includes(dateKey)) {
                  stats.games += 1;
                  stats.game_dates.push(dateKey);
                }
                
                const currentAB = stats.AB;
                const currentH = stats.H;
                
                stats.AB += Number(playerStat.AB) || 0;
                stats.H += Number(playerStat.H) || 0;
                stats.BB += Number(playerStat.BB) || 0;
                stats.K += Number(playerStat.K) || 0;
                stats.R += Number(playerStat.R) || 0;
                stats.RBI += Number(playerStat.RBI) || 0;
                
                if (gameHR > 0) {
                  stats.HR += gameHR;
                  stats.last_HR_date = dateKey;
                  stats.current_AB_since_last_HR = 0;
                  stats.current_H_since_last_HR = 0;
                } else if (stats.last_HR_date) {
                  stats.current_AB_since_last_HR += Number(playerStat.AB) || 0;
                  stats.current_H_since_last_HR += Number(playerStat.H) || 0;
                } else {
                  stats.current_AB_since_last_HR += Number(playerStat.AB) || 0;
                  stats.current_H_since_last_HR += Number(playerStat.H) || 0;
                }
              }
            });
          }
        });

        // Calculate PA for each player
        Object.values(masterData).forEach(player => {
          if (player.stats_2025_aggregated) {
            player.stats_2025_aggregated.PA_approx = getApproximatedPA(player.stats_2025_aggregated);
          }
        });

        setMasterPlayerData(masterData);
        setNameToIdMap(nameMap);
        console.log(`Built master data for ${Object.keys(masterData).length} players`);

      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  // Get available pitchers and teams
  const availablePitchers = useMemo(() => {
    return Object.values(masterPlayerData)
      .filter(player => player.roster_info?.type === 'pitcher')
      .map(pitcher => ({
        id: pitcher.roster_info.mlbam_id,
        name: pitcher.roster_info.fullName_resolved || pitcher.roster_info.name,
        team: pitcher.roster_info.team,
        throws: pitcher.roster_info.ph || 'R'
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [masterPlayerData]);

  const availableTeams = useMemo(() => {
    return Object.entries(teamData)
      .map(([code, team]) => ({
        code, name: team.name, abbreviation: team.abbreviation || code
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teamData]);

  // Enhanced analysis functions (mirrors Python enhanced_hr_likelihood_score)
  const analyzeArsenalMatchup = (batterId, pitcherId) => {
    const batter = masterPlayerData[batterId];
    const pitcher = masterPlayerData[pitcherId];
    
    const hitterArsenal = batter.hitter_pitch_arsenal_stats || {};
    const pitcherArsenal = pitcher.pitcher_pitch_arsenal_stats || {};
    const pitcherUsage = {};
    
    // Extract usage from pitcher arsenal
    Object.entries(pitcherArsenal).forEach(([pitch, stats]) => {
      if (stats.pitch_usage && stats.pitch_usage > 5) {
        pitcherUsage[pitch] = stats.pitch_usage;
      }
    });

    let weightedSLGHitter = 0, weightedSLGPitcher = 0, totalUsage = 0;
    const pitchMatchups = [];

    Object.entries(pitcherUsage).forEach(([pitch, usage]) => {
      const usageWeight = usage / 100.0;
      const hitterStats = hitterArsenal[pitch] || {};
      const pitcherStats = pitcherArsenal[pitch] || {};
      
      const hitterSLG = hitterStats.slg || leagueAverages.SLG;
      const pitcherSLG = pitcherStats.slg || leagueAverages.SLG;
      
      weightedSLGHitter += hitterSLG * usageWeight;
      weightedSLGPitcher += pitcherSLG * usageWeight;
      totalUsage += usageWeight;
      
      pitchMatchups.push({
        pitch_type: pitch,
        usage: usage,
        hitter_slg: hitterSLG,
        pitcher_slg: pitcherSLG
      });
    });

    if (totalUsage > 0) {
      weightedSLGHitter /= totalUsage;
      weightedSLGPitcher /= totalUsage;
    }

    return {
      overall_summary_metrics: {
        hitter_avg_slg: weightedSLGHitter,
        pitcher_avg_slg: weightedSLGPitcher
      },
      pitch_matchups: pitchMatchups
    };
  };

  const calculateRecentTrends = (gamesPerformance) => {
    if (!gamesPerformance || gamesPerformance.length === 0) return {};
    
    const numGames = gamesPerformance.length;
    const totalAB = gamesPerformance.reduce((sum, g) => sum + (g.AB || 0), 0);
    const totalH = gamesPerformance.reduce((sum, g) => sum + (g.H || 0), 0);
    const totalHR = gamesPerformance.reduce((sum, g) => sum + (g.HR || 0), 0);
    const totalBB = gamesPerformance.reduce((sum, g) => sum + (g.BB || 0), 0);
    const totalK = gamesPerformance.reduce((sum, g) => sum + (g.K || 0), 0);
    const totalPA = gamesPerformance.reduce((sum, g) => sum + getApproximatedPA(g), 0);

    const recentStats = {
      total_games: numGames,
      total_ab: totalAB,
      total_hits: totalH,
      total_hrs: totalHR,
      total_bb: totalBB,
      total_k: totalK,
      total_pa_approx: totalPA,
      avg_avg: totalAB > 0 ? totalH / totalAB : 0,
      hit_rate: totalAB > 0 ? totalH / totalAB : 0,
      hr_rate: totalAB > 0 ? totalHR / totalAB : 0,
      hr_per_pa: totalPA > 0 ? totalHR / totalPA : 0,
      k_rate: totalPA > 0 ? totalK / totalPA : 0,
      bb_rate: totalPA > 0 ? totalBB / totalPA : 0
    };

    // Calculate trends (first half vs second half)
    if (numGames >= 2) {
      const midPoint = Math.floor(numGames / 2);
      const recentHalf = gamesPerformance.slice(0, midPoint);
      const earlierHalf = gamesPerformance.slice(midPoint);
      
      const recentHRRate = recentHalf.reduce((sum, g) => sum + (g.HR || 0), 0) / 
                          Math.max(1, recentHalf.reduce((sum, g) => sum + getApproximatedPA(g), 0));
      const earlierHRRate = earlierHalf.reduce((sum, g) => sum + (g.HR || 0), 0) / 
                           Math.max(1, earlierHalf.reduce((sum, g) => sum + getApproximatedPA(g), 0));
      
      recentStats.trend_metric = 'HR_per_PA';
      recentStats.trend_recent_val = recentHRRate;
      recentStats.trend_early_val = earlierHRRate;
      recentStats.trend_direction = recentHRRate > earlierHRRate ? 'improving' : 
                                   recentHRRate < earlierHRRate ? 'declining' : 'stable';
      recentStats.trend_magnitude = Math.abs(recentHRRate - earlierHRRate);
    }

    return recentStats;
  };

  const enhancedHRLikelihoodScore = (batterId, pitcherId, recentBatterStats) => {
    const batter = masterPlayerData[batterId];
    const pitcher = masterPlayerData[pitcherId];
    
    if (!batter || !pitcher) return { score: 0, details: {}, components: {} };

    const batterRoster = batter.roster_info || {};
    const pitcherRoster = pitcher.roster_info || {};
    const batterStats2025 = batter.stats_2025_aggregated || {};
    const batterPA2025 = batterStats2025.PA_approx || 0;

    // 1. Arsenal analysis
    const arsenalAnalysis = analyzeArsenalMatchup(batterId, pitcherId);
    let avgMatchupScore = 50;
    
    if (arsenalAnalysis.overall_summary_metrics) {
      const hitterSLG = arsenalAnalysis.overall_summary_metrics.hitter_avg_slg;
      const pitcherSLG = arsenalAnalysis.overall_summary_metrics.pitcher_avg_slg;
      
      if (hitterSLG && pitcherSLG) {
        const normHitterSLG = normalizeCalculated(hitterSLG, 'slg', true);
        const normPitcherSLG = normalizeCalculated(pitcherSLG, 'slg', true);
        avgMatchupScore = (normHitterSLG * 0.6 + normPitcherSLG * 0.4);
      }
    }

    // 2. Batter overall evaluation
    let batterOverallScore = 0;
    const hitterEVStats = batter.hitter_overall_ev_stats || {};
    
    const isoOverall = adjustStatWithConfidence(
      hitterEVStats.iso_percent,
      batterPA2025,
      leagueAverages.ISO
    );
    const brlOverall = (hitterEVStats.brl_percent || leagueAverages.BRL_PERCENT * 100) / 100.0;
    const hhOverall = (hitterEVStats.hard_hit_percent || leagueAverages.HARD_HIT_PERCENT * 100) / 100.0;
    
    batterOverallScore += WEIGHTS.batter_overall_iso * normalizeCalculated(isoOverall, 'iso');
    batterOverallScore += WEIGHTS.batter_overall_brl_percent * normalizeCalculated(brlOverall, 'brl_percent');
    batterOverallScore += WEIGHTS.batter_overall_hard_hit * normalizeCalculated(hhOverall, 'hard_hit_percent');

    // 3. Pitcher overall evaluation
    let pitcherOverallScore = 0;
    const pitcherEVStats = pitcher.pitcher_overall_ev_stats || {};
    
    const brlAllowed = (pitcherEVStats.brl_percent || leagueAverages.BRL_PERCENT * 100) / 100.0;
    const hhAllowed = (pitcherEVStats.hard_hit_percent || leagueAverages.HARD_HIT_PERCENT * 100) / 100.0;
    
    pitcherOverallScore += WEIGHTS.pitcher_overall_brl_percent_allowed * normalizeCalculated(brlAllowed, 'brl_percent', true);
    pitcherOverallScore += WEIGHTS.pitcher_overall_hard_hit_allowed * normalizeCalculated(hhAllowed, 'hard_hit_percent', true);

    // 4. Historical trends (simplified)
    const historicalScore = 0; // Would need multi-year data

    // 5. Recent performance
    let recentPerformanceScore = 0;
    if (recentBatterStats) {
      if (recentBatterStats.trend_direction === 'improving') recentPerformanceScore += 15;
      else if (recentBatterStats.trend_direction === 'declining') recentPerformanceScore -= 12;
      
      const recentHRRate = recentBatterStats.hr_per_pa || 0;
      if (recentHRRate > 0.05) recentPerformanceScore += 20;
      else if (recentHRRate > 0.03) recentPerformanceScore += 10;
      else if (recentHRRate < 0.01) recentPerformanceScore -= 10;
      
      const recentAVG = recentBatterStats.avg_avg || 0;
      if (recentAVG > 0.300) recentPerformanceScore += 15;
      else if (recentAVG > 0.275) recentPerformanceScore += 8;
      else if (recentAVG < 0.200) recentPerformanceScore -= 12;
    }

    // 6. Contextual factors
    let contextualScore = 0;
    
    // Due for HR factors
    const hr2025 = batterStats2025.HR || 0;
    const ab2025 = batterStats2025.AB || 1;
    const h2025 = batterStats2025.H || 0;
    
    const expectedHRPerAB = 1 / 25.0; // Default
    const expectedHRs = ab2025 * expectedHRPerAB;
    const abSinceHR = batterStats2025.current_AB_since_last_HR || 0;
    const expectedABPerHR = 1 / expectedHRPerAB;
    
    let dueForHRABScore = 0;
    if (abSinceHR > expectedABPerHR * 1.25) {
      dueForHRABScore = Math.min((abSinceHR / expectedABPerHR - 1.25) * 20, 25);
    }
    
    const hSinceHR = batterStats2025.current_H_since_last_HR || 0;
    const expectedHPerHR = 10.0; // Default
    let dueForHRHitsScore = 0;
    if (hSinceHR > expectedHPerHR * 1.5) {
      dueForHRHitsScore = Math.min(((hSinceHR / expectedHPerHR) - 1.5) * 15, 20);
    }
    
    contextualScore += WEIGHTS.due_for_hr_factor * (dueForHRABScore / 25);
    contextualScore += WEIGHTS.due_for_hr_hits_factor * (dueForHRHitsScore / 20);
    
    // Contact trend
    let contactTrend = 'N/A';
    let heatingUpScore = 0, coldBatterScore = 0;
    
    if (recentBatterStats && recentBatterStats.total_pa_approx >= 20) {
      const recentHitRate = recentBatterStats.hit_rate;
      const recentHRPerPA = recentBatterStats.hr_per_pa;
      const lgAvgBatting = leagueAverages.AVG;
      
      if (recentHitRate > (lgAvgBatting + 0.050) && recentHRPerPA < (expectedHRPerAB * 0.4)) {
        heatingUpScore = 15;
        contactTrend = 'Heating Up (High Contact, Low Recent Power)';
        contextualScore += WEIGHTS.heating_up_contact_factor * (heatingUpScore / 15);
      } else if (recentHitRate < (lgAvgBatting - 0.060)) {
        coldBatterScore = -20;
        contactTrend = 'Cold Batter (Low Recent Contact)';
        contextualScore += WEIGHTS.cold_batter_factor * (coldBatterScore / 20);
      }
    }

    // Final score calculation
    const finalScore = (
      W_ARSENAL_MATCHUP * avgMatchupScore +
      W_BATTER_OVERALL * batterOverallScore +
      W_PITCHER_OVERALL * pitcherOverallScore +
      W_HISTORICAL_YOY_CSV * historicalScore +
      W_RECENT_DAILY_GAMES * recentPerformanceScore +
      W_CONTEXTUAL * contextualScore
    );

    const baseProbFactor = finalScore / 100.0;
    
    // Calculate outcome probabilities
    const probabilities = {
      homerun: Math.min(40, Math.max(0.5, baseProbFactor * 10 + batterPA2025 * 0.005)),
      hit: Math.min(60, Math.max(5, baseProbFactor * 20 + batterPA2025 * 0.02)),
      reach_base: Math.min(70, Math.max(8, baseProbFactor * 25 + batterPA2025 * 0.03)),
      strikeout: Math.max(10, Math.min(80, 70 - baseProbFactor * 15 + batterPA2025 * 0.01))
    };

    return {
      batter_name: batterRoster.fullName_resolved || batterRoster.name,
      batter_team: batterRoster.team,
      pitcher_name: pitcherRoster.fullName_resolved || pitcherRoster.name,
      pitcher_team: pitcherRoster.team,
      batter_hand: batterRoster.bats || 'R',
      pitcher_hand: pitcherRoster.ph || 'R',
      score: Math.max(0, Math.min(100, finalScore)),
      outcome_probabilities: probabilities,
      details: {
        batter_pa_2025: batterPA2025,
        batter_overall_adj_iso: isoOverall,
        batter_overall_brl: brlOverall,
        batter_overall_hh: hhOverall,
        pitcher_overall_brl_allowed: brlAllowed,
        pitcher_overall_hh_allowed: hhAllowed,
        ab_since_last_hr: abSinceHR,
        expected_ab_per_hr: expectedABPerHR,
        due_for_hr_ab_raw_score: dueForHRABScore,
        h_since_last_hr: hSinceHR,
        expected_h_per_hr: expectedHPerHR,
        due_for_hr_hits_raw_score: dueForHRHitsScore,
        contact_trend: contactTrend,
        heating_up_contact_raw_score: heatingUpScore,
        cold_batter_contact_raw_score: coldBatterScore,
        arsenal_analysis: arsenalAnalysis
      },
      matchup_components: {
        arsenal_matchup: avgMatchupScore,
        batter_overall: batterOverallScore,
        pitcher_overall: pitcherOverallScore,
        historical_yoy_csv: historicalScore,
        recent_daily_games: recentPerformanceScore,
        contextual: contextualScore
      }
    };
  };

  const getLastNGamesPerformance = (playerName, teamCode, nGames = 7) => {
    const games = [];
    const sortedDates = Object.keys(dailyGameData).sort().reverse();
    
    for (const dateKey of sortedDates) {
      const dayData = dailyGameData[dateKey];
      if (dayData.players) {
        const playerData = dayData.players.find(p => 
          cleanPlayerName(p.name) === playerName && p.team === teamCode
        );
        
        if (playerData && playerData.playerType === 'hitter') {
          games.push({
            date: dateKey,
            AB: Number(playerData.AB) || 0,
            H: Number(playerData.H) || 0,
            HR: Number(playerData.HR) || 0,
            BB: Number(playerData.BB) || 0,
            K: Number(playerData.K) || 0,
            AVG: Number(playerData.AVG) || 0,
            OBP: Number(playerData.OBP) || 0,
            SLG: Number(playerData.SLG) || 0
          });
          
          if (games.length >= nGames) break;
        }
      }
    }
    
    return games;
  };

  const runAnalysis = async () => {
    if (!selectedPitcher || !selectedTeam) {
      alert('Please select both a pitcher and opposing team');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const pitcherId = nameToIdMap[selectedPitcher];
      if (!pitcherId || !masterPlayerData[pitcherId]) {
        alert('Pitcher not found in master data');
        return;
      }

      const teamHitters = Object.entries(masterPlayerData)
        .filter(([id, player]) => 
          player.roster_info?.type === 'hitter' && 
          player.roster_info?.team === selectedTeam
        );

      if (teamHitters.length === 0) {
        alert('No hitters found for selected team');
        return;
      }

      const results = [];
      
      for (const [batterId, batter] of teamHitters) {
        const batterName = batter.roster_info.fullName_resolved || batter.roster_info.name;
        const recentGames = getLastNGamesPerformance(batterName, selectedTeam);
        const recentTrends = calculateRecentTrends(recentGames);
        
        const prediction = enhancedHRLikelihoodScore(batterId, pitcherId, recentTrends);
        
        if (prediction.score > 0) {
          const details = prediction.details;
          const components = prediction.matchup_components;
          const stats2025 = batter.stats_2025_aggregated || {};
          
          // Calculate 2024 stats (simplified - would need actual 2024 data)
          const iso2024 = 0.150; // Placeholder
          const iso2025 = details.batter_overall_adj_iso || 0;
          
          const result = {
            Rank: 0, // Will be set after sorting
            Batter: prediction.batter_name,
            Batter_Team: prediction.batter_team,
            B_Hand: prediction.batter_hand,
            Pitcher: prediction.pitcher_name,
            Pitcher_Team: prediction.pitcher_team,
            P_Hand: prediction.pitcher_hand,
            HR_Score: prediction.score,
            PA_2025: details.batter_pa_2025,
            HR_Prob: prediction.outcome_probabilities.homerun,
            Hit_Prob: prediction.outcome_probabilities.hit,
            OB_Prob: prediction.outcome_probabilities.reach_base,
            K_Prob: prediction.outcome_probabilities.strikeout,
            AB_since_HR: details.ab_since_last_hr,
            Exp_AB_HR: details.expected_ab_per_hr,
            AB_Due_Score: details.due_for_hr_ab_raw_score,
            H_since_HR: details.h_since_last_hr,
            Exp_H_HR: details.expected_h_per_hr,
            H_Due_Score: details.due_for_hr_hits_raw_score,
            Contact_Trend: details.contact_trend,
            Heat_Score: details.heating_up_contact_raw_score,
            Cold_Score: details.cold_batter_contact_raw_score,
            ISO_2024: iso2024,
            ISO_2025: iso2025,
            ISO_Trend: iso2025 - iso2024,
            Recent_Trend_Dir: recentTrends.trend_direction || 'stable',
            Recent_HR_Rate: recentTrends.hr_rate || 0,
            Recent_AVG: recentTrends.avg_avg || 0,
            Recent_Games: recentTrends.total_games || 0,
            
            // Pitcher recent data (simplified - would need pitcher game tracking)
            Pitcher_Trend_Dir: 'N/A',
            Pitcher_Recent_ERA: 'N/A',
            Pitcher_Recent_WHIP: 'N/A',
            Pitcher_H_Per_Game: 'N/A',
            Pitcher_HR_Per_Game: 'N/A',
            Pitcher_K_Per_Game: 'N/A',
            Pitcher_Home_H_Total: 'N/A',
            Pitcher_Home_HR_Total: 'N/A',
            Pitcher_Home_K_Total: 'N/A',
            Pitcher_Away_H_Total: 'N/A',
            Pitcher_Away_HR_Total: 'N/A',
            Pitcher_Away_K_Total: 'N/A',
            Pitcher_Home_H_Per_Game: 'N/A',
            Pitcher_Home_HR_Per_Game: 'N/A',
            Pitcher_Home_K_Per_Game: 'N/A',
            Pitcher_Away_H_Per_Game: 'N/A',
            Pitcher_Away_HR_Per_Game: 'N/A',
            Pitcher_Away_K_Per_Game: 'N/A',
            Pitcher_Recent_Games: 'N/A',
            Pitcher_Home_Games: 'N/A',
            Pitcher_Away_Games: 'N/A',
            
            // Arsenal analysis
            H_Wtd_SLG_vs_Ars: details.arsenal_analysis?.overall_summary_metrics?.hitter_avg_slg || 'N/A',
            P_Wtd_SLG_A_w_Ars: details.arsenal_analysis?.overall_summary_metrics?.pitcher_avg_slg || 'N/A',
            
            // Component scores
            Comp_arsenal_matchup: components.arsenal_matchup,
            Comp_batter_overall: components.batter_overall,
            Comp_pitcher_overall: components.pitcher_overall,
            Comp_historical_yoy_csv: components.historical_yoy_csv,
            Comp_recent_daily_games: components.recent_daily_games,
            Comp_contextual: components.contextual
          };
          
          results.push(result);
        }
      }

      // Sort by HR_Score
      results.sort((a, b) => b.HR_Score - a.HR_Score);
      results.forEach((result, index) => {
        result.Rank = index + 1;
      });

      setAnalysisResults(results);
      console.log(`Analysis complete: ${results.length} results generated`);
      
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Error running analysis: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Sorting logic
  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedResults = useMemo(() => {
    if (!analysisResults.length) return [];
    
    const sorted = [...analysisResults].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      // Handle 'N/A' values
      if (aValue === 'N/A' && bValue === 'N/A') return 0;
      if (aValue === 'N/A') return 1;
      if (bValue === 'N/A') return -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      const numA = Number(aValue) || 0;
      const numB = Number(bValue) || 0;
      
      return sortConfig.direction === 'asc' 
        ? numA - numB 
        : numB - numA;
    });
    
    // Update ranks after sorting
    sorted.forEach((result, index) => {
      result.Rank = index + 1;
    });
    
    return sorted;
  }, [analysisResults, sortConfig]);

  // Filtering logic
  const filteredResults = useMemo(() => {
    return sortedResults.filter(result => {
      if (filters.minHRScore && result.HR_Score < Number(filters.minHRScore)) return false;
      if (filters.minHRProb && result.HR_Prob < Number(filters.minHRProb)) return false;
      if (filters.maxKProb && result.K_Prob > Number(filters.maxKProb)) return false;
      if (filters.trendFilter && result.Recent_Trend_Dir !== filters.trendFilter) return false;
      if (filters.contactTrend && !result.Contact_Trend.toLowerCase().includes(filters.contactTrend.toLowerCase())) return false;
      return true;
    });
  }, [sortedResults, filters]);

  // CSV Export
  const exportToCSV = () => {
    if (!filteredResults.length) return;
    
    const headers = Object.keys(filteredResults[0]);
    const csvContent = [
      headers.join(','),
      ...filteredResults.map(result => 
        headers.map(header => {
          const value = result[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pinheads_analysis_${selectedPitcher.replace(/\s+/g, '_')}_vs_${selectedTeam}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const SortableHeader = ({ column, children, className = "" }) => (
    <th 
      className={`px-2 py-1 text-left cursor-pointer hover:bg-gray-100 ${className}`}
      onClick={() => handleSort(column)}
      style={{ fontSize: '11px', minWidth: '60px' }}
    >
      <div className="flex items-center gap-1">
        <span style={{ fontSize: '11px' }}>{children}</span>
        {sortConfig.key === column && (
          sortConfig.direction === 'asc' ? <ChevronUp /> : <ChevronDown />
        )}
      </div>
    </th>
  );

  if (isLoading) {
    return (
      <div className="max-w-full mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
            <h1 className="text-2xl font-bold">🎯 Pinheads Playhouse</h1>
            <p className="text-blue-100 mt-1">Advanced HR Prediction Analysis - Loading Data...</p>
          </div>
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Loading Baseball Data</h3>
            <p className="text-gray-600">Loading rosters, CSV files, and building analysis engine...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
          <h1 className="text-xl font-bold">🎯 Pinheads Playhouse</h1>
          <p className="text-blue-100 text-sm">Advanced HR Prediction Analysis - Pitcher vs Team</p>
          <div className="text-xs text-blue-200 mt-1">
            Loaded: {Object.keys(masterPlayerData).length} players • {availablePitchers.length} pitchers • {Object.keys(dailyGameData).length} days of data
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Pitcher</label>
              <select
                value={selectedPitcher}
                onChange={(e) => setSelectedPitcher(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a pitcher...</option>
                {availablePitchers.map((pitcher) => (
                  <option key={pitcher.id} value={pitcher.name}>
                    {pitcher.name} ({pitcher.team}) - {pitcher.throws}H
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opposing Team</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose opposing team...</option>
                {availableTeams.map((team) => (
                  <option key={team.code} value={team.code}>
                    {team.name} ({team.abbreviation})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={runAnalysis}
                disabled={!selectedPitcher || !selectedTeam || isAnalyzing}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {isAnalyzing ? 'Analyzing...' : '▶️ Run Analysis'}
              </button>
            </div>
          </div>

          {/* Filters */}
          {analysisResults.length > 0 && (
            <div className="mt-3 p-3 bg-white rounded border">
              <div className="flex items-center gap-2 mb-2">
                <span>🔍</span>
                <span className="font-medium text-sm">Filters</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                <input
                  type="number"
                  placeholder="Min HR Score"
                  value={filters.minHRScore}
                  onChange={(e) => setFilters(prev => ({...prev, minHRScore: e.target.value}))}
                  className="p-1 border rounded text-xs"
                />
                <input
                  type="number"
                  placeholder="Min HR Prob %"
                  value={filters.minHRProb}
                  onChange={(e) => setFilters(prev => ({...prev, minHRProb: e.target.value}))}
                  className="p-1 border rounded text-xs"
                />
                <input
                  type="number"
                  placeholder="Max K Prob %"
                  value={filters.maxKProb}
                  onChange={(e) => setFilters(prev => ({...prev, maxKProb: e.target.value}))}
                  className="p-1 border rounded text-xs"
                />
                <select
                  value={filters.trendFilter}
                  onChange={(e) => setFilters(prev => ({...prev, trendFilter: e.target.value}))}
                  className="p-1 border rounded text-xs"
                >
                  <option value="">All Trends</option>
                  <option value="improving">Improving</option>
                  <option value="declining">Declining</option>
                  <option value="stable">Stable</option>
                </select>
                <input
                  type="text"
                  placeholder="Contact Trend"
                  value={filters.contactTrend}
                  onChange={(e) => setFilters(prev => ({...prev, contactTrend: e.target.value}))}
                  className="p-1 border rounded text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {analysisResults.length > 0 && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">
                Analysis Results: {selectedPitcher} vs {teamData[selectedTeam]?.name || selectedTeam}
                <span className="text-gray-500 ml-2">({filteredResults.length} hitters)</span>
              </h2>
              <button
                onClick={exportToCSV}
                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
              >
                💾 Export CSV
              </button>
            </div>

            <div className="overflow-x-auto border rounded" style={{ maxHeight: '600px' }}>
              <table className="w-full text-xs">
                <thead className="bg-gray-100 border-b sticky top-0">
                  <tr>
                    <SortableHeader column="Rank">#</SortableHeader>
                    <SortableHeader column="Batter">Batter</SortableHeader>
                    <SortableHeader column="B_Hand">Hand</SortableHeader>
                    <SortableHeader column="HR_Score">HR Score</SortableHeader>
                    <SortableHeader column="HR_Prob">HR %</SortableHeader>
                    <SortableHeader column="Hit_Prob">Hit %</SortableHeader>
                    <SortableHeader column="OB_Prob">OB %</SortableHeader>
                    <SortableHeader column="K_Prob">K %</SortableHeader>
                    <SortableHeader column="PA_2025">PA</SortableHeader>
                    <SortableHeader column="AB_since_HR">AB since HR</SortableHeader>
                    <SortableHeader column="Exp_AB_HR">Exp AB/HR</SortableHeader>
                    <SortableHeader column="AB_Due_Score">AB Due</SortableHeader>
                    <SortableHeader column="H_since_HR">H since HR</SortableHeader>
                    <SortableHeader column="Exp_H_HR">Exp H/HR</SortableHeader>
                    <SortableHeader column="H_Due_Score">H Due</SortableHeader>
                    <SortableHeader column="Contact_Trend">Contact</SortableHeader>
                    <SortableHeader column="Heat_Score">Heat</SortableHeader>
                    <SortableHeader column="Cold_Score">Cold</SortableHeader>
                    <SortableHeader column="ISO_2024">ISO 2024</SortableHeader>
                    <SortableHeader column="ISO_2025">ISO 2025</SortableHeader>
                    <SortableHeader column="ISO_Trend">ISO Trend</SortableHeader>
                    <SortableHeader column="Recent_Trend_Dir">Trend</SortableHeader>
                    <SortableHeader column="Recent_HR_Rate">HR Rate</SortableHeader>
                    <SortableHeader column="Recent_AVG">AVG</SortableHeader>
                    <SortableHeader column="Recent_Games">Games</SortableHeader>
                    <SortableHeader column="H_Wtd_SLG_vs_Ars">H SLG</SortableHeader>
                    <SortableHeader column="P_Wtd_SLG_A_w_Ars">P SLG</SortableHeader>
                    <SortableHeader column="Comp_arsenal_matchup">Arsenal</SortableHeader>
                    <SortableHeader column="Comp_batter_overall">Batter</SortableHeader>
                    <SortableHeader column="Comp_pitcher_overall">Pitcher</SortableHeader>
                    <SortableHeader column="Comp_contextual">Context</SortableHeader>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((result) => (
                    <tr key={result.Rank} className="border-b hover:bg-gray-50">
                      <td className="px-2 py-1 font-medium">{result.Rank}</td>
                      <td className="px-2 py-1">
                        <div className="font-medium">{result.Batter}</div>
                        <div className="text-gray-500">{result.Batter_Team}</div>
                      </td>
                      <td className="px-2 py-1 text-center">{result.B_Hand}</td>
                      <td className="px-2 py-1">
                        <span className={`font-bold ${
                          result.HR_Score >= 70 ? 'text-green-600' :
                          result.HR_Score >= 60 ? 'text-blue-600' :
                          result.HR_Score >= 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {typeof result.HR_Score === 'number' ? result.HR_Score.toFixed(1) : result.HR_Score}
                        </span>
                      </td>
                      <td className="px-2 py-1">{typeof result.HR_Prob === 'number' ? result.HR_Prob.toFixed(1) : result.HR_Prob}%</td>
                      <td className="px-2 py-1">{typeof result.Hit_Prob === 'number' ? result.Hit_Prob.toFixed(1) : result.Hit_Prob}%</td>
                      <td className="px-2 py-1">{typeof result.OB_Prob === 'number' ? result.OB_Prob.toFixed(1) : result.OB_Prob}%</td>
                      <td className="px-2 py-1">{typeof result.K_Prob === 'number' ? result.K_Prob.toFixed(1) : result.K_Prob}%</td>
                      <td className="px-2 py-1">{result.PA_2025}</td>
                      <td className="px-2 py-1">{result.AB_since_HR}</td>
                      <td className="px-2 py-1">{typeof result.Exp_AB_HR === 'number' ? result.Exp_AB_HR.toFixed(1) : result.Exp_AB_HR}</td>
                      <td className="px-2 py-1">{typeof result.AB_Due_Score === 'number' ? result.AB_Due_Score.toFixed(1) : result.AB_Due_Score}</td>
                      <td className="px-2 py-1">{result.H_since_HR}</td>
                      <td className="px-2 py-1">{typeof result.Exp_H_HR === 'number' ? result.Exp_H_HR.toFixed(1) : result.Exp_H_HR}</td>
                      <td className="px-2 py-1">{typeof result.H_Due_Score === 'number' ? result.H_Due_Score.toFixed(1) : result.H_Due_Score}</td>
                      <td className="px-2 py-1" style={{ maxWidth: '100px', fontSize: '10px' }}>
                        {result.Contact_Trend || 'N/A'}
                      </td>
                      <td className="px-2 py-1">{result.Heat_Score}</td>
                      <td className="px-2 py-1">{result.Cold_Score}</td>
                      <td className="px-2 py-1">{typeof result.ISO_2024 === 'number' ? result.ISO_2024.toFixed(3) : result.ISO_2024}</td>
                      <td className="px-2 py-1">{typeof result.ISO_2025 === 'number' ? result.ISO_2025.toFixed(3) : result.ISO_2025}</td>
                      <td className="px-2 py-1">{typeof result.ISO_Trend === 'number' ? result.ISO_Trend.toFixed(3) : result.ISO_Trend}</td>
                      <td className="px-2 py-1">
                        <span className={`text-xs px-1 py-0 rounded ${
                          result.Recent_Trend_Dir === 'improving' ? 'bg-green-100 text-green-700' :
                          result.Recent_Trend_Dir === 'declining' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {result.Recent_Trend_Dir}
                        </span>
                      </td>
                      <td className="px-2 py-1">{typeof result.Recent_HR_Rate === 'number' ? result.Recent_HR_Rate.toFixed(3) : result.Recent_HR_Rate}</td>
                      <td className="px-2 py-1">{typeof result.Recent_AVG === 'number' ? result.Recent_AVG.toFixed(3) : result.Recent_AVG}</td>
                      <td className="px-2 py-1">{result.Recent_Games}</td>
                      <td className="px-2 py-1">{typeof result.H_Wtd_SLG_vs_Ars === 'number' ? result.H_Wtd_SLG_vs_Ars.toFixed(3) : result.H_Wtd_SLG_vs_Ars}</td>
                      <td className="px-2 py-1">{typeof result.P_Wtd_SLG_A_w_Ars === 'number' ? result.P_Wtd_SLG_A_w_Ars.toFixed(3) : result.P_Wtd_SLG_A_w_Ars}</td>
                      <td className="px-2 py-1">{typeof result.Comp_arsenal_matchup === 'number' ? result.Comp_arsenal_matchup.toFixed(1) : result.Comp_arsenal_matchup}</td>
                      <td className="px-2 py-1">{typeof result.Comp_batter_overall === 'number' ? result.Comp_batter_overall.toFixed(1) : result.Comp_batter_overall}</td>
                      <td className="px-2 py-1">{typeof result.Comp_pitcher_overall === 'number' ? result.Comp_pitcher_overall.toFixed(1) : result.Comp_pitcher_overall}</td>
                      <td className="px-2 py-1">{typeof result.Comp_contextual === 'number' ? result.Comp_contextual.toFixed(1) : result.Comp_contextual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {analysisResults.length === 0 && !isAnalyzing && (
          <div className="p-12 text-center text-gray-500">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-lg font-medium mb-2">Ready for Analysis</h3>
            <p>Select a pitcher and opposing team, then click "Run Analysis".</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PinheadsPlayhouse;