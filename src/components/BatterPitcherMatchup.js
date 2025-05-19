// BatterPitcherMatchup.js

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, ComposedChart } from 'recharts';
import _ from 'lodash';

import PlayerInfoDisplay from './PlayerInfoDisplay';

// Define the years of data you want to load
const DATA_YEARS = [2025, 2024, 2023, 2022]; // Updated as per your files
const CURRENT_YEAR = Math.max(...DATA_YEARS); // This will be 2025

const BatterPitcherMatchup = ({ preSelectedHitter = null, preSelectedPitcher = null }) => {
  console.log('Received preselected players:', preSelectedHitter, preSelectedPitcher);
  
  const [loading, setLoading] = useState(true);
  const [hitters, setHitters] = useState([]);
  const [pitchers, setPitchers] = useState([]);
  const [selectedHitter, setSelectedHitter] = useState(null);
  const [selectedPitcher, setSelectedPitcher] = useState(null);
  const [matchupResults, setMatchupResults] = useState(null);
  const [overallPrediction, setOverallPrediction] = useState(null);
  const [hitterData, setHitterData] = useState([]); 
  const [pitcherData, setPitcherData] = useState([]); 
  const [rosterData, setRosterData] = useState([]);
  const [pitchTypes, setPitchTypes] = useState({});
  const [platoonAdvantage, setPlatoonAdvantage] = useState(null);
  const [dataLoadError, setDataLoadError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [activeYears, setActiveYears] = useState([...DATA_YEARS].sort((a, b) => b - a)); // Default to all, sorted


  // Enhanced helper function to convert player names between formats
  const convertPlayerName = (name, format = 'lastFirst') => {
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
      name = name.name;
    }
    if (typeof name !== 'string') return null;
    if (name.includes('.') && format === 'lastFirst') {
      const parts = name.split(' ');
      if (parts.length === 2) {
        return `${parts[1]}, ${parts[0]}`;
      }
    }
    if (name.includes(' ') && !name.includes(',') && format === 'lastFirst') {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ');
        return `${lastName}, ${firstName}`;
      }
    }
    if (name.includes(',') && format === 'firstLast') {
      const parts = name.split(', ');
      if (parts.length === 2) {
        return `${parts[1]} ${parts[0]}`;
      }
    }
    return name;
  };

  // Enhanced findBestMatch function
  const findBestMatch = (targetPlayer, playerList) => {
    if (!targetPlayer || !playerList || !playerList.length) return null;
    const targetName = typeof targetPlayer === 'object' ? targetPlayer.name : targetPlayer;
    let debugOutput = { searchingFor: targetPlayer, inListOfSize: playerList.length, firstFewItems: playerList.slice(0,3) };
    let match = playerList.find(p => p.name === targetName);
    if (match) return match;
    if (typeof targetPlayer === 'object' && targetPlayer.fullName) {
      const convertedFullName = convertPlayerName({ fullName: targetPlayer.fullName }, 'lastFirst');
      debugOutput.convertedFullName = convertedFullName;
      match = playerList.find(p => p.name === convertedFullName);
      if (match) return match;
    }
    const convertedName = convertPlayerName(targetName, 'lastFirst');
    debugOutput.convertedName = convertedName;
    if (convertedName && convertedName !== targetName) {
      match = playerList.find(p => p.name === convertedName);
      if (match) return match;
    }
    if (targetName.includes(' ')) {
      let lastName;
      if (targetName.includes('.')) {
        lastName = targetName.split(' ')[1];
      } else if (typeof targetPlayer === 'object' && targetPlayer.fullName) {
        const parts = targetPlayer.fullName.split(' ');
        if (parts.length >= 2) lastName = parts[parts.length - 1];
      }
      debugOutput.extractedLastName = lastName;
      if (lastName) {
        const lastNameMatches = playerList.filter(p => 
          p.name.startsWith(lastName + ',') || 
          p.name.includes(`, ${lastName}`) ||
          (p.fullName && p.fullName.includes(lastName))
        );
        debugOutput.lastNameMatches = lastNameMatches;
        if (lastNameMatches.length === 1) return lastNameMatches[0];
        else if (lastNameMatches.length > 1) {
          if (typeof targetPlayer === 'object' && targetPlayer.team) {
            const teamMatch = lastNameMatches.find(p => p.team === targetPlayer.team);
            if (teamMatch) return teamMatch;
          }
          return lastNameMatches[0]; 
        }
      }
    }
    if (typeof targetPlayer === 'object' && targetPlayer.fullName) {
      const fullNameParts = targetPlayer.fullName.split(' ');
      const firstName = fullNameParts[0];
      const lastName = fullNameParts.slice(1).join(' ');
      const specialCaseMatches = playerList.filter(p => 
        (p.name.toLowerCase().startsWith(lastName.toLowerCase() + ',')) ||
        (p.name.toLowerCase().split(',')[0] === lastName.toLowerCase())
      );
      debugOutput.specialCaseMatches = specialCaseMatches;
      if (specialCaseMatches.length === 1) return specialCaseMatches[0];
      else if (specialCaseMatches.length > 1) {
        const firstNameMatch = specialCaseMatches.find(p => {
          const csvFirstName = p.name.split(', ')[1];
          return csvFirstName && (csvFirstName.toLowerCase() === firstName.toLowerCase() || csvFirstName.toLowerCase().startsWith(firstName.toLowerCase().charAt(0)));
        });
        if (firstNameMatch) return firstNameMatch;
        if (targetPlayer.team) {
          const teamMatch = specialCaseMatches.find(p => p.team === targetPlayer.team);
          if (teamMatch) return teamMatch;
        }
        return specialCaseMatches[0];
      }
    }
    if (typeof targetPlayer === 'object' && targetPlayer.fullName) {
      const lastName = targetPlayer.fullName.split(' ').pop().toLowerCase();
      const nameMatch = playerList.find(p => p.name.toLowerCase().includes(lastName));
      if (nameMatch) return nameMatch;
    }
    for (const player of playerList) {
      if (player.name.includes(targetName) || targetName.includes(player.name) ||
          (player.fullName && player.fullName.includes(targetName)) ||
          (typeof targetPlayer === 'object' && targetPlayer.fullName && player.name.includes(targetPlayer.fullName)) ||
          (typeof targetPlayer === 'object' && targetPlayer.fullName && player.name.split(',')[0] && 
           player.name.split(',')[0].toLowerCase().includes(targetPlayer.fullName.split(' ').pop().toLowerCase()))) {
        return player;
      }
    }
    setDebugInfo(prev => ({...prev, [targetName]: debugOutput }));
    return null;
  };

  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        setDataLoadError(null);

        let allHitterStats = [];
        let allPitcherStats = [];
        let firstYearColumnsChecked = false;
        let successfullyLoadedYears = [];

        for (const year of DATA_YEARS.sort((a,b) => b-a)) { 
          // ALL files now use the _YYYY suffix as per user's provided file list
          const hitterFile = `hitterpitcharsenalstats_${year}.csv`;
          const pitcherFile = `pitcherpitcharsenalstats_${year}.csv`;
          
          console.log(`Fetching data for year ${year}: /data/stats/${hitterFile}, /data/stats/${pitcherFile}`);

          try {
            const [hitterResponseText, pitcherResponseText] = await Promise.all([
              fetch(`/data/stats/${hitterFile}`)
                .then(response => {
                  if (!response.ok) throw new Error(`Failed to fetch ${hitterFile}: ${response.status} ${response.statusText}`);
                  return response.text();
                }),
              fetch(`/data/stats/${pitcherFile}`)
                .then(response => {
                  if (!response.ok) throw new Error(`Failed to fetch ${pitcherFile}: ${response.status} ${response.statusText}`);
                  return response.text();
                })
            ]);

            const parsedHitterData = Papa.parse(hitterResponseText, { header: true, dynamicTyping: true, skipEmptyLines: true, transformHeader: header => header.replace(/"/g, '') });
            const parsedPitcherData = Papa.parse(pitcherResponseText, { header: true, dynamicTyping: true, skipEmptyLines: true, transformHeader: header => header.replace(/"/g, '') });

            if (parsedHitterData.data.length > 0 || parsedPitcherData.data.length > 0) {
                successfullyLoadedYears.push(year);
            }

            allHitterStats.push(...parsedHitterData.data.map(row => ({ ...row, year })));
            allPitcherStats.push(...parsedPitcherData.data.map(row => ({ ...row, year })));
            
            if (!firstYearColumnsChecked && (parsedHitterData.data.length > 0 || parsedPitcherData.data.length > 0)) {
                const hitterColumns = parsedHitterData.meta.fields;
                const pitcherColumns = parsedPitcherData.meta.fields;
                const requiredHitterColumns = ['last_name, first_name', 'player_id', 'team_name_alt', 'pitch_type'];
                const requiredPitcherColumns = ['last_name, first_name', 'player_id', 'team_name_alt', 'pitch_type'];
                if (hitterColumns) { // Only check if columns exist (data might be empty but file exists)
                    const missingHitterColumns = requiredHitterColumns.filter(col => !hitterColumns.includes(col));
                    if (missingHitterColumns.length > 0) throw new Error(`Hitter CSV (${hitterFile}) missing required columns: ${missingHitterColumns.join(', ')}`);
                }
                 if (pitcherColumns) {
                    const missingPitcherColumns = requiredPitcherColumns.filter(col => !pitcherColumns.includes(col));
                    if (missingPitcherColumns.length > 0) throw new Error(`Pitcher CSV (${pitcherFile}) missing required columns: ${missingPitcherColumns.join(', ')}`);
                 }
                firstYearColumnsChecked = true;
            }
          } catch (yearError) {
            console.warn(`Warning: Could not load data for year ${year}. Skipping. Error: ${yearError.message}`);
          }
        }
        setActiveYears(_.uniq(successfullyLoadedYears).sort((a,b) => b-a));
        
        const rosterResponseJson = await fetch('/data/rosters.json')
            .then(response => {
              if (!response.ok) throw new Error(`Failed to fetch roster data: ${response.status} ${response.statusText}`);
              return response.json();
            });

        if (allHitterStats.length === 0 || allPitcherStats.length === 0) {
            throw new Error("No player statistics data could be loaded. Please check CSV file availability (e.g. hitterpitcharsenalstats_2023.csv) and naming for all specified years in /public/data/stats/.");
        }

        setHitterData(allHitterStats);
        setPitcherData(allPitcherStats);
        setRosterData(rosterResponseJson);

        const uniqueHittersList = _.uniqBy(allHitterStats.map(row => {
          const name = row['last_name, first_name'];
          if (!name) return null;
          const nameParts = name.split(', ');
          const lastName = nameParts[0];
          const rosterEntry = rosterResponseJson.find(r => 
            (r.fullName && r.fullName.includes(lastName)) ||
            (r.name && r.name.includes(lastName)) ||
            (nameParts.length > 1 && r.fullName && r.fullName.includes(nameParts[1]))
          );
          return {
            name,
            id: row.player_id,
            team: row.team_name_alt, 
            bats: rosterEntry ? (rosterEntry.bats || "Unknown") : "Unknown",
            fullName: rosterEntry ? rosterEntry.fullName : null
          };
        }).filter(Boolean), 'name');
        
        const uniquePitchersList = _.uniqBy(allPitcherStats.map(row => {
          const name = row['last_name, first_name'];
          if (!name) return null;
          const nameParts = name.split(', ');
          const lastName = nameParts[0];
          const rosterEntry = rosterResponseJson.find(r => 
            (r.fullName && r.fullName.includes(lastName)) ||
            (r.name && r.name.includes(lastName)) ||
            (nameParts.length > 1 && r.fullName && r.fullName.includes(nameParts[1]))
          );
          return {
            name,
            id: row.player_id,
            team: row.team_name_alt,
            throws: rosterEntry ? (rosterEntry.ph || "Unknown") : "Unknown",
            fullName: rosterEntry ? rosterEntry.fullName : null
          };
        }).filter(Boolean), 'name');
        
        const allPitchTypeMap = {};
        [...allHitterStats, ...allPitcherStats].forEach(row => {
          if (row.pitch_type && !allPitchTypeMap[row.pitch_type] && row.pitch_name) {
            allPitchTypeMap[row.pitch_type] = row.pitch_name;
          }
        });
        
        setHitters(uniqueHittersList);
        setPitchers(uniquePitchersList);
        setPitchTypes(allPitchTypeMap);
        
      } catch (error) {
        console.error("Error loading data:", error);
        setDataLoadError(`Error loading data: ${error.message}. Ensure CSV files (e.g., hitterpitcharsenalstats_YYYY.csv) and rosters.json are in /public/data/`);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, []); 

  useEffect(() => {
    if (!loading && hitters.length > 0 && pitchers.length > 0) {
      if (preSelectedHitter) {
        const foundHitter = findBestMatch(preSelectedHitter, hitters);
        if (foundHitter) {
          const enrichedHitter = { ...foundHitter, bats: preSelectedHitter.bats || foundHitter.bats };
          setSelectedHitter(enrichedHitter);
        } else {
          console.warn("Could not find preselected hitter in loaded data, using provided data.", preSelectedHitter);
          setSelectedHitter(preSelectedHitter); 
        }
      }
      if (preSelectedPitcher) {
        const foundPitcher = findBestMatch(preSelectedPitcher, pitchers);
        if (foundPitcher) {
          const enrichedPitcher = { ...foundPitcher, throws: preSelectedPitcher.throws || foundPitcher.throws };
          setSelectedPitcher(enrichedPitcher);
        } else {
          console.warn("Could not find preselected pitcher in loaded data, using provided data.", preSelectedPitcher);
          setSelectedPitcher(preSelectedPitcher);
        }
      }
    }
  }, [loading, hitters, pitchers, preSelectedHitter, preSelectedPitcher]);

  useEffect(() => {
    if (selectedHitter && selectedPitcher && hitterData.length > 0 && pitcherData.length > 0 && activeYears.length > 0) {
      analyzeMatchup(selectedHitter, selectedPitcher);
    } else {
      setMatchupResults(null);
      setOverallPrediction(null);
      setPlatoonAdvantage(null);
    }
  }, [selectedHitter, selectedPitcher, hitterData, pitcherData, activeYears]); 

  const calculatePlatoonAdvantage = (hitter, pitcher) => {
    if (!hitter.bats || !pitcher.throws || hitter.bats === "Unknown" || pitcher.throws === "Unknown") {
      return { advantage: "Unknown", description: "Handedness data not available", color: "text-gray-500", factor: 1.0 };
    }
    const platoonFactors = {
      "R-R": { advantage: "Pitcher", description: "RHB vs RHP slightly favors pitcher", color: "text-blue-500", factor: 0.95 },
      "L-L": { advantage: "Pitcher", description: "LHB vs LHP strongly favors pitcher", color: "text-blue-700", factor: 0.90 },
      "R-L": { advantage: "Hitter", description: "RHB vs LHP slightly favors hitter", color: "text-red-500", factor: 1.05 }, 
      "L-R": { advantage: "Hitter", description: "LHB vs RHP strongly favors hitter", color: "text-red-700", factor: 1.10 },
      "S-R": { advantage: "Hitter", description: "Switch hitter (batting L) vs RHP strongly favors hitter", color: "text-red-700", factor: 1.10 }, 
      "S-L": { advantage: "Even", description: "Switch hitter (batting R) vs LHP is generally neutral", color: "text-gray-500", factor: 1.00 } 
    };
    const matchupKey = `${hitter.bats}-${pitcher.throws}`;
    return platoonFactors[matchupKey] || { advantage: "Unknown", description: "Unusual handedness combination", color: "text-gray-500", factor: 1.0 };
  };

  const analyzeMatchup = (hitter, pitcher) => {
    console.log(`Analyzing matchup between ${hitter.name} and ${pitcher.name} for years: ${activeYears.join(', ')}`);
    
    const platoon = calculatePlatoonAdvantage(hitter, pitcher);
    setPlatoonAdvantage(platoon);

    const currentHitterDataForPlayer = hitterData.filter(row => activeYears.includes(row.year) && row['last_name, first_name'] === hitter.name);
    const currentPitcherDataForPlayer = pitcherData.filter(row => activeYears.includes(row.year) && row['last_name, first_name'] === pitcher.name);

    const aggregatedPitcherPitches = _(currentPitcherDataForPlayer)
      .groupBy('pitch_type')
      .map((pitchesInYears, pitch_type) => {
        const totalPitchesForType = _.sumBy(pitchesInYears, p => p.pitches || 0);
        if (pitchesInYears.length === 0) return null;
        
        const useSimpleAverage = totalPitchesForType === 0;

        const weightedAvg = (statName) => {
            if (useSimpleAverage) return _.meanBy(pitchesInYears, p => p[statName] || 0);
            const relevantPitches = pitchesInYears.filter(p => p.pitches > 0); // Only use years with >0 pitches for weighted average
            if (relevantPitches.length === 0) return _.meanBy(pitchesInYears, p => p[statName] || 0); // Fallback if all years have 0 pitches
            const sumOfPitches = _.sumBy(relevantPitches, p => p.pitches);
            return _.sumBy(relevantPitches, p => (p[statName] || 0) * (p.pitches || 0)) / sumOfPitches;
        }
        
        return {
          pitch_type,
          pitch_name: pitchesInYears[0]?.pitch_name || pitch_type,
          pitcher_usage: weightedAvg('pitch_usage'),
          pitcher_run_value_per_100: weightedAvg('run_value_per_100'),
          pitcher_ba_against: weightedAvg('ba'),
          pitcher_slg_against: weightedAvg('slg'),
          pitcher_woba_against: weightedAvg('woba'),
          pitcher_whiff_percent: weightedAvg('whiff_percent'),
          pitcher_k_percent: weightedAvg('k_percent'),
          yearlyData: pitchesInYears.map(p => ({
              year: p.year, usage: p.pitch_usage, run_value_per_100: p.run_value_per_100, 
              ba_against: p.ba, slg_against: p.slg, woba_against: p.woba,
              k_percent: p.k_percent, whiff_percent: p.whiff_percent, pitches: p.pitches
          })).sort((a,b) => a.year - b.year)
        };
      })
      .filter(Boolean)
      .value();

    let totalAggregatedPitcherUsageSum = _.sumBy(aggregatedPitcherPitches, 'pitcher_usage');
    if (totalAggregatedPitcherUsageSum > 0) {
        aggregatedPitcherPitches.forEach(p => {
            p.pitcher_usage = (p.pitcher_usage / totalAggregatedPitcherUsageSum) * 100;
        });
    }


    if (aggregatedPitcherPitches.length === 0) {
      console.log(`No aggregated pitch data found for pitcher: ${pitcher.name} in active years.`);
    }
    
    const results = [];

    aggregatedPitcherPitches.forEach(pitcherPitch => {
      const hitterVsPitchTypeInYears = currentHitterDataForPlayer.filter(row => row.pitch_type === pitcherPitch.pitch_type);
      
      if (hitterVsPitchTypeInYears.length > 0) {
        const totalHitterPitchesVsType = _.sumBy(hitterVsPitchTypeInYears, p => p.pitches || 0);
        const useSimpleHitterAverage = totalHitterPitchesVsType === 0;
        
        const hitterWeightedAvg = (statName) => {
            if (useSimpleHitterAverage) return _.meanBy(hitterVsPitchTypeInYears, p => p[statName] || 0);
            const relevantPitches = hitterVsPitchTypeInYears.filter(p => p.pitches > 0);
            if (relevantPitches.length === 0) return _.meanBy(hitterVsPitchTypeInYears, p => p[statName] || 0);
            const sumOfPitches = _.sumBy(relevantPitches, p => p.pitches);
            return _.sumBy(relevantPitches, p => (p[statName] || 0) * (p.pitches || 0)) / sumOfPitches;
        }

        const aggregateHitterStats = {
            run_value_per_100: hitterWeightedAvg('run_value_per_100'),
            ba: hitterWeightedAvg('ba'),
            slg: hitterWeightedAvg('slg'),
            woba: hitterWeightedAvg('woba'),
            whiff_percent: hitterWeightedAvg('whiff_percent'),
            k_percent: hitterWeightedAvg('k_percent'),
            yearlyData: hitterVsPitchTypeInYears.map(h => ({
                year: h.year, run_value_per_100: h.run_value_per_100, ba: h.ba, slg: h.slg, woba: h.woba,
                k_percent: h.k_percent, whiff_percent: h.whiff_percent, pitches: h.pitches
            })).sort((a,b) => a.year - b.year)
        };

        const platoonAdjustedBA = (aggregateHitterStats.ba || 0) * platoon.factor;
        const platoonAdjustedSLG = (aggregateHitterStats.slg || 0) * platoon.factor;
        const platoonAdjustedWOBA = (aggregateHitterStats.woba || 0) * platoon.factor;
        
        results.push({
          pitch_type: pitcherPitch.pitch_type,
          pitch_name: pitcherPitch.pitch_name,
          pitcher_usage: pitcherPitch.pitcher_usage || 0,
          pitcher_run_value_per_100: pitcherPitch.pitcher_run_value_per_100 || 0,
          pitcher_ba_against: pitcherPitch.pitcher_ba_against || 0,
          pitcher_slg_against: pitcherPitch.pitcher_slg_against || 0,
          pitcher_woba_against: pitcherPitch.pitcher_woba_against || 0,
          pitcher_k_percent: pitcherPitch.pitcher_k_percent || 0,
          pitcher_yearly_data: pitcherPitch.yearlyData,
          
          hitter_run_value_per_100: aggregateHitterStats.run_value_per_100 || 0,
          hitter_ba: aggregateHitterStats.ba || 0,
          hitter_slg: aggregateHitterStats.slg || 0,
          hitter_woba: aggregateHitterStats.woba || 0,
          hitter_k_percent: aggregateHitterStats.k_percent || 0,
          hitter_yearly_data: aggregateHitterStats.yearlyData,
          
          base_predicted_ba: ((aggregateHitterStats.ba || 0) + (1 - (pitcherPitch.pitcher_ba_against || 0))) / 2,
          base_predicted_slg: ((aggregateHitterStats.slg || 0) + (1 - (pitcherPitch.pitcher_slg_against || 0))) / 2,
          base_predicted_woba: ((aggregateHitterStats.woba || 0) + (1 - (pitcherPitch.pitcher_woba_against || 0))) / 2,
          
          predicted_ba: (platoonAdjustedBA + (1 - (pitcherPitch.pitcher_ba_against || 0))) / 2,
          predicted_slg: (platoonAdjustedSLG + (1 - (pitcherPitch.pitcher_slg_against || 0))) / 2,
          predicted_woba: (platoonAdjustedWOBA + (1 - (pitcherPitch.pitcher_woba_against || 0))) / 2,
          
          matchup_advantage: ((aggregateHitterStats.run_value_per_100 || 0) - (pitcherPitch.pitcher_run_value_per_100 || 0)) * platoon.factor
        });
      }
    });

    setMatchupResults(results);
    
    if (results.length > 0) {
      const totalUsageOverall = results.reduce((sum, pitch) => sum + (pitch.pitcher_usage || 0), 0);
      
      const weightedPredictions = results.reduce((acc, pitch) => {
        const weight = totalUsageOverall > 0 ? (pitch.pitcher_usage || 0) / totalUsageOverall : (1 / results.length);
        
        const estimated_hr_prob_pitch = Math.max(0, (pitch.predicted_slg - pitch.predicted_ba) / 3);

        return {
          base_ba: acc.base_ba + ((pitch.base_predicted_ba || 0) * weight),
          base_slg: acc.base_slg + ((pitch.base_predicted_slg || 0) * weight),
          base_woba: acc.base_woba + ((pitch.base_predicted_woba || 0) * weight),
          ba: acc.ba + ((pitch.predicted_ba || 0) * weight),
          slg: acc.slg + ((pitch.predicted_slg || 0) * weight),
          woba: acc.woba + ((pitch.predicted_woba || 0) * weight),
          advantage: acc.advantage + ((pitch.matchup_advantage || 0) * weight),
          hit_probability: acc.hit_probability + ((pitch.predicted_ba || 0) * weight),
          home_run_probability: acc.home_run_probability + (estimated_hr_prob_pitch * weight),
          strikeout_probability: acc.strikeout_probability + 
            (((pitch.hitter_k_percent || 0) * platoon.factor + (pitch.pitcher_k_percent || 0)) / 2 * weight / 100),
          platoon_factor: platoon.factor
        };
      }, { 
        base_ba: 0, base_slg: 0, base_woba: 0,
        ba: 0, slg: 0, woba: 0, advantage: 0, 
        hit_probability: 0, home_run_probability: 0, strikeout_probability: 0,
        platoon_factor: platoon.factor
      });
      
      setOverallPrediction(weightedPredictions);
    } else {
      console.log("No matching pitch type data found for this matchup with current year settings.");
      setOverallPrediction(null);
    }
  };

  const formatPitchName = (type) => pitchTypes[type] || type;
  const getMatchupAdvantageText = (advantage) => {
    if (advantage > 1.5) return "Strong Hitter Advantage";
    if (advantage > 0.5) return "Hitter Advantage";
    if (advantage > -0.5) return "Even Matchup";
    if (advantage > -1.5) return "Pitcher Advantage";
    return "Strong Pitcher Advantage";
  };
  const getMatchupColor = (advantage) => {
    if (advantage > 1.5) return "text-red-600";
    if (advantage > 0.5) return "text-red-400";
    if (advantage > -0.5) return "text-gray-600";
    if (advantage > -1.5) return "text-blue-400";
    return "text-blue-600";
  };
  const formatStat = (value) => {
    if (value === undefined || value === null || isNaN(value)) return "N/A";
    return typeof value === 'number' ? value.toFixed(3) : value;
  };

  const PlatoonAdvantageCard = () => {
    if (!platoonAdvantage || !selectedHitter || !selectedPitcher) return null;
    
    return (
      <div className="bg-white p-4 rounded shadow-sm mb-6">
        <h3 className="text-lg font-medium mb-2">Handedness Matchup</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center border-r">
            <div className="text-sm text-gray-500">Batter</div>
            <div className="font-medium">{selectedHitter.name}</div>
            <div className="text-lg font-bold">
              {selectedHitter.bats === "L" ? "Left" : 
               selectedHitter.bats === "R" ? "Right" : 
               selectedHitter.bats === "B" || selectedHitter.bats === "S" ? "Switch" : "Unknown"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500">Advantage</div>
            <div className={`text-xl font-bold ${platoonAdvantage.color}`}>
              {platoonAdvantage.advantage}
            </div>
            <div className="text-xs text-gray-500">
              Factor: {platoonAdvantage.factor.toFixed(2)}×
            </div>
          </div>
          <div className="text-center border-l">
            <div className="text-sm text-gray-500">Pitcher</div>
            <div className="font-medium">{selectedPitcher.name}</div>
            <div className="text-lg font-bold">
              {selectedPitcher.throws === "L" ? "Left" : 
               selectedPitcher.throws === "R" ? "Right" : "Unknown"}
            </div>
          </div>
        </div>
        <div className="mt-2 text-sm text-center text-gray-600">
          {platoonAdvantage.description}
        </div>
      </div>
    );
  };

  const PitchBreakdown = () => {
    if (!matchupResults || matchupResults.length === 0) return null;
    
    const chartData = matchupResults.map(pitch => ({
      name: formatPitchName(pitch.pitch_type),
      usage: pitch.pitcher_usage,
      advantage: parseFloat(pitch.matchup_advantage.toFixed(2)),
      predictedBA: parseFloat(pitch.predicted_ba.toFixed(3)),
      predictedSLG: parseFloat(pitch.predicted_slg.toFixed(3)),
      hitterYearly: pitch.hitter_yearly_data,
      pitcherYearly: pitch.pitcher_yearly_data,
      hitterBA: parseFloat(pitch.hitter_ba.toFixed(3)),
      pitcherBAAgainst: parseFloat(pitch.pitcher_ba_against.toFixed(3))
    }));
    
    return (
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-4">Pitch-by-Pitch Breakdown</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="text-md font-medium mb-2">Pitch Usage & Matchup Advantage</h4>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" label={{ value: "Usage %", angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: "Advantage", angle: 90, position: 'insideRight' }} />
                <Tooltip formatter={(value, name) => {
                  if (name === 'usage') return [`${(value || 0).toFixed(1)}%`, 'Usage'];
                  if (name === 'advantage') return [(value || 0).toFixed(2), 'Advantage'];
                  return [value, name];
                }} />
                <Legend />
                <Bar yAxisId="left" dataKey="usage" fill="#8884d8" name="Pitch Usage %" />
                <Line yAxisId="right" type="monotone" dataKey="advantage" stroke="#82ca9d" name="Matchup Advantage" activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h4 className="text-md font-medium mb-2">Predicted Performance by Pitch</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 'auto']} />
                <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(3) : value} />
                <Legend />
                <Bar dataKey="predictedBA" fill="#3182ce" name="Pred. Batting Avg" />
                <Bar dataKey="predictedSLG" fill="#e53e3e" name="Pred. Slugging" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="mt-6">
          <h4 className="text-md font-medium mb-2">Detailed Stats & Trends by Pitch Type</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white table-fixed">
              <thead className="bg-gray-100">
                <tr>
                  <th className="w-1/6 py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pitch</th>
                  <th className="w-1/12 py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                  <th className="w-1/12 py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adv.</th>
                  <th className="w-1/12 py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pr. BA</th>
                  <th className="w-1/12 py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pr. SLG</th>
                  <th className="w-1/12 py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hitter BA</th>
                  <th className="w-1/12 py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pitcher BA</th>
                  <th className="w-1/3 py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hitter wOBA Trend (vs Pitch)</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((pitch, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-4 border-b border-gray-200 truncate">{pitch.name}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{(pitch.usage || 0).toFixed(1)}%</td>
                    <td className={`py-2 px-4 border-b border-gray-200 ${getMatchupColor(pitch.advantage)}`}>
                      {(pitch.advantage || 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200">{(pitch.predictedBA || 0).toFixed(3)}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{(pitch.predictedSLG || 0).toFixed(3)}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{(pitch.hitterBA || 0).toFixed(3)}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{(pitch.pitcherBAAgainst || 0).toFixed(3)}</td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      {pitch.hitterYearly && pitch.hitterYearly.length > 1 ? (
                        <ResponsiveContainer width="100%" height={50}>
                          <LineChart data={pitch.hitterYearly} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                            <XAxis dataKey="year" tick={{ fontSize: 10 }} interval={0}/>
                            <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} allowDecimals={true} />
                            <Line type="monotone" dataKey="woba" stroke="#8884d8" strokeWidth={2} dot={{r:2}}/>
                            <Tooltip 
                                formatter={(value, name, props) => [`${(value || 0).toFixed(3)} (${name})`, `Year ${props.payload.year}`]}
                                labelFormatter={() => ''}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : pitch.hitterYearly && pitch.hitterYearly.length === 1 ? `${(pitch.hitterYearly[0].woba || 0).toFixed(3)} (${pitch.hitterYearly[0].year})` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

    const OverallPrediction = () => {
    if (!overallPrediction) return null;

    // --- Define data for charts FIRST ---
    const radarData = [
      { stat: "Batting Avg", value: overallPrediction.ba, baseValue: overallPrediction.base_ba, fullMark: 0.450 },
      { stat: "Slugging", value: overallPrediction.slg, baseValue: overallPrediction.base_slg, fullMark: 0.700 },
      { stat: "wOBA", value: overallPrediction.woba, baseValue: overallPrediction.base_woba, fullMark: 0.500 },
      { stat: "Hit Prob.", value: overallPrediction.hit_probability, baseValue: overallPrediction.hit_probability / overallPrediction.platoon_factor, fullMark: 0.450 },
      { stat: "HR Prob.", value: overallPrediction.home_run_probability, baseValue: Math.max(0,(overallPrediction.base_slg - overallPrediction.base_ba) / 3), fullMark: 0.150 }
    ];
    
    const actual_hit_prob_excluding_hr = Math.max(0, overallPrediction.hit_probability - overallPrediction.home_run_probability);
    const total_accounted_prob = actual_hit_prob_excluding_hr + overallPrediction.home_run_probability + overallPrediction.strikeout_probability;
    const other_out_value = Math.max(0, 1 - total_accounted_prob);

    const outcomeData = [
      { name: "Single/Other XBH", value: actual_hit_prob_excluding_hr },
      { name: "Home Run", value: overallPrediction.home_run_probability },
      { name: "Strikeout", value: overallPrediction.strikeout_probability },
      { name: "Other Out", value: other_out_value }
    ].filter(d => d.value > 0.001); 


    // --- Helper function to categorize probabilities ---
    const getProbabilityCategory = (prob, type, invertColors = false) => {
        // Thresholds can be adjusted based on typical league averages or desired sensitivity
        const thresholds = {
            hit: { high: 0.300, medium: 0.250, low: 0.200 }, // BA-like
            hr:  { high: 0.040, medium: 0.020, low: 0.010 }, // HR per PA
            k:   { high: 0.280, medium: 0.220, low: 0.180 }  // K rate
        };
        if (!thresholds[type]) return { text: "N/A", color: "text-gray-700", bgColor: "bg-gray-200" };

        let category = "";
        let color = "text-yellow-600"; 
        let bgColor = "bg-yellow-100";

        if (prob >= thresholds[type].high) {
            category = "High";
            color = invertColors ? "text-red-600" : "text-green-600";
            bgColor = invertColors ? "bg-red-100" : "bg-green-100";
        } else if (prob >= thresholds[type].medium) {
            category = "Medium";
            color = "text-yellow-600";
            bgColor = "bg-yellow-100";
        } else if (prob >= thresholds[type].low){
            category = "Low";
            color = invertColors ? "text-green-600" : "text-red-600";
            bgColor = invertColors ? "bg-green-100" : "bg-red-100";
        } else {
            category = "Very Low";
            color = invertColors ? "text-green-700" : "text-red-700";
            bgColor = invertColors ? "bg-green-100" : "bg-red-100";
        }
        return { text: category, color, bgColor };
    };
    
    const hitProbStats = getProbabilityCategory(overallPrediction.hit_probability, 'hit');
    const hrProbStats = getProbabilityCategory(overallPrediction.home_run_probability, 'hr');
    const kProbStatsBatter = getProbabilityCategory(overallPrediction.strikeout_probability, 'k'); 
    const kProbStatsPitcherProp = getProbabilityCategory(overallPrediction.strikeout_probability, 'k', true); 

    const getBasesPotential = (slg, woba) => {
        let text = "Low";
        let color = "text-red-600";
        let bgColor = "bg-red-100";

        if (slg >= 0.500 || woba >= 0.370) { text = "High"; color = "text-green-600"; bgColor="bg-green-100"}
        else if (slg >= 0.420 || woba >= 0.330) { text = "Medium"; color = "text-yellow-600"; bgColor="bg-yellow-100"}
        return { text, color, bgColor };
    };
    const basesPotentialStats = getBasesPotential(overallPrediction.slg, overallPrediction.woba);

    const advantageText = getMatchupAdvantageText(overallPrediction.advantage);
    const advantageColor = getMatchupColor(overallPrediction.advantage);

    let summarySentiment = "This appears to be an even matchup.";
    if (overallPrediction.advantage > 0.5) summarySentiment = `The hitter seems to have a notable advantage.`;
    else if (overallPrediction.advantage < -0.5) summarySentiment = `The pitcher seems to hold a notable advantage.`;
    if (Math.abs(overallPrediction.advantage) > 1.5) summarySentiment += " (Strong)";


    return (
      <div className="mt-8 bg-white p-6 rounded-lg shadow-xl">
        <h3 className="text-2xl font-semibold mb-6 text-center text-indigo-700 border-b pb-3">Overall Matchup Prediction</h3>

        <div className="flex flex-col md:flex-row justify-around items-center mb-6 p-4 bg-indigo-50 rounded-lg">
            <div className="text-center mb-4 md:mb-0">
                <div className="text-sm uppercase text-indigo-500 tracking-wider">Matchup Advantage</div>
                <div className={`mt-1 text-4xl font-bold ${advantageColor}`}>
                    {formatStat(overallPrediction.advantage)}
                </div>
                <div className={`text-md font-semibold ${advantageColor}`}>{advantageText}</div>
            </div>
            <div className="text-center border-t md:border-t-0 md:border-l border-indigo-200 pt-4 md:pt-0 md:pl-6">
                <div className="text-sm uppercase text-indigo-500 tracking-wider">Platoon Factor</div>
                <div className="mt-1 text-3xl font-bold text-indigo-600">
                    {overallPrediction.platoon_factor.toFixed(2)}×
                </div>
                <div className={`text-md font-semibold ${platoonAdvantage?.color || 'text-gray-700'}`}>
                    {platoonAdvantage?.advantage || 'N/A'} ({platoonAdvantage?.description || 'N/A'})
                </div>
            </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[
                { label: "Predicted BA", value: overallPrediction.ba, base: overallPrediction.base_ba, color: "text-blue-600" },
                { label: "Predicted SLG", value: overallPrediction.slg, base: overallPrediction.base_slg, color: "text-purple-600" },
                { label: "Predicted wOBA", value: overallPrediction.woba, base: overallPrediction.base_woba, color: "text-teal-600" },
            ].map(stat => (
                <div key={stat.label} className="bg-gray-50 p-4 rounded-md shadow-sm text-center">
                    <div className={`text-sm font-medium ${stat.color}`}>{stat.label}</div>
                    <div className={`text-2xl font-bold ${stat.color}`}>{formatStat(stat.value)}</div>
                    <div className="text-xs text-gray-500">Base: {formatStat(stat.base)}</div>
                </div>
            ))}
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="text-xl font-medium mb-4 text-indigo-600">Betting Prop Insights:</h4>
            <div className="space-y-3">
                <div className={`p-3 rounded-md flex items-start ${hitProbStats.bgColor}`}>
                    <span className={`text-2xl mr-3 ${hitProbStats.color}`}>🎯</span>
                    <div>
                        <strong className={`font-semibold ${hitProbStats.color}`}>Hit Potential: {hitProbStats.text}</strong>
                        <p className="text-sm text-gray-700">
                            Predicted Hit Rate: <span className="font-bold">{(overallPrediction.hit_probability * 100).toFixed(1)}%</span>.
                            Expected BA of <span className="font-bold">{formatStat(overallPrediction.ba)}</span>.
                        </p>
                    </div>
                </div>

                <div className={`p-3 rounded-md flex items-start ${hrProbStats.bgColor}`}>
                     <span className={`text-2xl mr-3 ${hrProbStats.color}`}>💣</span>
                    <div>
                        <strong className={`font-semibold ${hrProbStats.color}`}>Home Run Potential: {hrProbStats.text}</strong>
                        <p className="text-sm text-gray-700">
                            Predicted HR Rate: <span className="font-bold">{(overallPrediction.home_run_probability * 100).toFixed(1)}%</span>.
                            This suggests about 1 HR every <span className="font-bold">{(1 / Math.max(0.001, overallPrediction.home_run_probability)).toFixed(0)}</span> Plate Appearances.
                        </p>
                    </div>
                </div>

                <div className={`p-3 rounded-md flex items-start ${basesPotentialStats.bgColor}`}>
                    <span className={`text-2xl mr-3 ${basesPotentialStats.color}`}>📊</span>
                    <div>
                        <strong className={`font-semibold ${basesPotentialStats.color}`}>Total Bases Potential: {basesPotentialStats.text}</strong>
                        <p className="text-sm text-gray-700">
                            Driven by Predicted SLG of <span className="font-bold">{formatStat(overallPrediction.slg)}</span> and wOBA of <span className="font-bold">{formatStat(overallPrediction.woba)}</span>.
                        </p>
                    </div>
                </div>
                
                 <div className={`p-3 rounded-md flex items-start ${kProbStatsPitcherProp.bgColor}`}>
                    <span className={`text-2xl mr-3 ${kProbStatsPitcherProp.color}`}>⚾</span>
                    <div>
                        <strong className={`font-semibold ${kProbStatsPitcherProp.color}`}>Batter K Potential: {kProbStatsBatter.text}</strong>
                        <p className="text-sm text-gray-700">
                            Batter's Strikeout Rate: <span className="font-bold">{(overallPrediction.strikeout_probability * 100).toFixed(1)}%</span>.
                            This is a <strong className={kProbStatsPitcherProp.color}>{kProbStatsPitcherProp.text}</strong> indicator for pitcher strikeout props.
                        </p>
                    </div>
                </div>
            </div>
             <p className="mt-4 text-sm text-gray-800 bg-indigo-50 p-3 rounded-md">
                <strong>Analyst's Take:</strong> {summarySentiment} The platoon factor of <strong className={platoonAdvantage?.color || 'text-gray-700'}>{overallPrediction.platoon_factor.toFixed(2)}x</strong> {platoonAdvantage?.description || ''}.
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
             <div>
                <h4 className="text-md font-medium mb-2 text-center">Performance Profile</h4>
                <ResponsiveContainer width="100%" height={300}>
                    <RadarChart outerRadius="80%" data={radarData}> {/* radarData is used here */}
                        <PolarGrid />
                        <PolarAngleAxis dataKey="stat" tick={{fontSize: '0.8rem'}}/>
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{fontSize: '0.7rem'}}/>
                        <Radar name="Platoon Adj." dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                        <Radar name="Base Pred." dataKey="baseValue" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.4} />
                        <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(3) : value} />
                        <Legend wrapperStyle={{fontSize: "0.8rem"}}/>
                    </RadarChart>
                </ResponsiveContainer>
            </div>
            <div>
                <h4 className="text-md font-medium mb-2 text-center">Outcome Likelihoods</h4>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={outcomeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}> {/* outcomeData is used here */}
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{fontSize: '0.8rem'}} />
                        <YAxis tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} domain={[0, 'auto']} tick={{fontSize: '0.8rem'}}/>
                        <Tooltip formatter={(value) => `${(value * 100).toFixed(1)}%`} />
                        <Legend wrapperStyle={{fontSize: "0.8rem"}}/>
                        <Bar dataKey="value" fill="#3182ce" name="Probability" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    );
  };

  const DebugInfoPanel = () => {
    if (Object.keys(debugInfo).length === 0) return null;
    return (
      <div className="mt-8 bg-red-50 p-4 rounded-lg border border-red-300">
        <h3 className="text-lg font-medium mb-2">Debug Information</h3>
        <div className="text-sm">
          <pre className="overflow-auto bg-white p-2 rounded border border-red-200 max-h-96">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </div>
    );
  };
  const LoadingMessage = () => (
    <div className="text-center p-8">
      <div className="text-lg">Loading data...</div>
      <div className="text-sm text-gray-500 mt-2">Fetching player statistics from database for years: {DATA_YEARS.join(', ')}...</div>
    </div>
  );
  const ErrorMessage = () => (
    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md mb-4">
      <h3 className="text-lg font-medium mb-2">Data Loading Error</h3>
      <p>{dataLoadError}</p>
      <p className="mt-3 text-sm text-red-600">
        Please make sure the server has the following data files available in `/public/data/stats/`:
      </p>
      <ul className="list-disc list-inside mt-2 text-sm text-red-600">
        {DATA_YEARS.map(year => (
            <li key={year}>For year {year}: `hitterpitcharsenalstats_${year}.csv`, `pitcherpitcharsenalstats_${year}.csv`</li>
        ))}
        <li>And `/public/data/rosters.json`</li>
      </ul>
    </div>
  );
  const NoMatchupDataMessage = () => (
    <div className="text-center p-8">
      <div className="text-lg text-amber-700">
        {matchupResults === null 
          ? "Select both a hitter and pitcher to see matchup predictions." 
          : `No matchup data available for these players for years: ${activeYears.join(', ')}.`}
      </div>
      <div className="text-sm text-gray-500 mt-2">
        Either the selected players don't have enough data in our system for the selected years, or there's an issue with player matching.
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">MLB Batter-Pitcher Matchup Predictor</h1>
      <div className="mb-4 p-3 bg-gray-100 rounded-md">
        <label className="block text-sm font-medium text-gray-700">Analysis Years (Successfully Loaded: {activeYears.join(', ') || 'None'}):</label>
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
        {DATA_YEARS.sort((a,b) => b-a).map(year => (
          <label key={year} className="inline-flex items-center">
            <input 
              type="checkbox" 
              className="form-checkbox h-5 w-5 text-blue-600"
              value={year}
              checked={activeYears.includes(year)}
              onChange={(e) => {
                const yearVal = parseInt(e.target.value);
                if (e.target.checked) {
                  setActiveYears(prev => _.uniq([...prev, yearVal]).sort((a,b) => b-a));
                } else {
                  if (activeYears.length > 1) { // Prevent unchecking all years
                    setActiveYears(prev => prev.filter(y => y !== yearVal));
                  }
                }
              }}
            />
            <span className="ml-2 text-gray-700">{year}</span>
          </label>
        ))}
        </div>
      </div>
      
      {loading ? (
        <LoadingMessage />
      ) : dataLoadError ? (
        <ErrorMessage />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Hitter</label>
              <select
                className="w-full p-2 border rounded-md"
                onChange={(e) => {
                  const selected = hitters.find(h => h.name === e.target.value);
                  setSelectedHitter(selected);
                }}
                value={selectedHitter?.name || ""}
              >
                <option value="">Select a hitter...</option>
                {hitters.sort((a,b) => a.name.localeCompare(b.name)).map((hitter) => (
                  <option key={`hitter-${hitter.id || hitter.name}`} value={hitter.name}>
                    {hitter.name} {hitter.team ? `(${hitter.team})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Pitcher</label>
              <select
                className="w-full p-2 border rounded-md"
                onChange={(e) => {
                  const selected = pitchers.find(p => p.name === e.target.value);
                  setSelectedPitcher(selected);
                }}
                value={selectedPitcher?.name || ""}
              >
                <option value="">Select a pitcher...</option>
                {pitchers.sort((a,b) => a.name.localeCompare(b.name)).map((pitcher) => (
                  <option key={`pitcher-${pitcher.id || pitcher.name}`} value={pitcher.name}>
                    {pitcher.name} {pitcher.team ? `(${pitcher.team})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {(preSelectedHitter || preSelectedPitcher) && (
            <div className="mt-4 text-sm text-gray-500 bg-gray-100 p-3 rounded">
              <div>Preselected players:</div>
              {preSelectedHitter && (
                <div className="mt-1">
                  <span className="font-semibold">Hitter:</span> {preSelectedHitter.fullName || preSelectedHitter.name} ({preSelectedHitter.team})
                  {preSelectedHitter.bats && <span className="ml-2">Bats: {preSelectedHitter.bats}</span>}
                  {selectedHitter && <span className="text-green-600 ml-2">→ Matched to: {selectedHitter.name}</span>}
                  {!selectedHitter && <span className="text-red-600 ml-2">→ No match found in database for preselection.</span>}
                </div>
              )}
              {preSelectedPitcher && (
                <div className="mt-1">
                  <span className="font-semibold">Pitcher:</span> {preSelectedPitcher.fullName || preSelectedPitcher.name} ({preSelectedPitcher.team})
                  {preSelectedPitcher.throws && <span className="ml-2">Throws: {preSelectedPitcher.throws}</span>}
                  {selectedPitcher && <span className="text-green-600 ml-2">→ Matched to: {selectedPitcher.name}</span>}
                  {!selectedPitcher && <span className="text-red-600 ml-2">→ No match found in database for preselection.</span>}
                </div>
              )}
            </div>
          )}
          
          {selectedHitter && selectedPitcher ? (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Selected Matchup <span className="text-base text-gray-500">(Data from: {activeYears.join(', ')})</span></h3>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <PlayerInfoDisplay player={selectedHitter} role="batter"/>
                </div>
                <div className="flex items-center justify-center"><div className="text-lg font-bold">vs</div></div>
                <div className="flex-1">
                  <PlayerInfoDisplay player={selectedPitcher} role="pitcher"/>
                </div>
              </div>
              
              {matchupResults && matchupResults.length > 0 ? (
                <>
                  <PlatoonAdvantageCard />
                  <OverallPrediction />
                  <PitchBreakdown />
                </>
              ) : (
                <NoMatchupDataMessage />
              )}
            </div>
          ) : null}
          
          <DebugInfoPanel />
        </>
      )}
      
      <div className="mt-10 text-sm text-gray-500">
        <p>Note: Predictions are based on historical performance against pitch types and handedness matchups, aggregated from selected years. The model weights predictions by the pitcher's pitch usage rates and applies platoon advantages based on batter/pitcher handedness.</p>
        <p>Positive matchup advantage values favor the hitter, while negative values favor the pitcher. Trends show hitter's wOBA vs specific pitch types over available years.</p>
      </div>
    </div>
  );
};

export default BatterPitcherMatchup;