import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line } from 'recharts';
import _ from 'lodash';

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

  // Enhanced helper function to convert player names between formats
  const convertPlayerName = (name, format = 'lastFirst') => {
    if (!name) return null;
    
    // If name is an object with name and fullName properties
    if (typeof name === 'object' && name !== null) {
      // If fullName is available and we want lastFirst format
      if (format === 'lastFirst' && name.fullName) {
        const parts = name.fullName.split(' ');
        if (parts.length >= 2) {
          const firstName = parts[0];
          const lastName = parts.slice(1).join(' ');
          return `${lastName}, ${firstName}`;
        }
      }
      // Use the name property if we can't convert
      name = name.name;
    }
    
    // Continue with string-based name
    if (typeof name !== 'string') return null;
    
    // Format: "A. Lastname" to "Lastname, A."
    if (name.includes('.') && format === 'lastFirst') {
      const parts = name.split(' ');
      if (parts.length === 2) {
        return `${parts[1]}, ${parts[0]}`;
      }
    }
    
    // Format: "Firstname Lastname" to "Lastname, Firstname"
    if (name.includes(' ') && !name.includes(',') && format === 'lastFirst') {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ');
        return `${lastName}, ${firstName}`;
      }
    }
    
    // Format: "Lastname, Firstname" to "Firstname Lastname"
    if (name.includes(',') && format === 'firstLast') {
      const parts = name.split(', ');
      if (parts.length === 2) {
        return `${parts[1]} ${parts[0]}`;
      }
    }
    
    // If we can't convert, return original
    return name;
  };

  // Enhanced findBestMatch function
  const findBestMatch = (targetPlayer, playerList) => {
    if (!targetPlayer || !playerList || !playerList.length) return null;
    
    const targetName = typeof targetPlayer === 'object' ? targetPlayer.name : targetPlayer;
    let debugOutput = {};
    
    debugOutput.searchingFor = targetPlayer;
    debugOutput.inListOfSize = playerList.length;
    debugOutput.firstFewItems = playerList.slice(0, 3);
    
    console.log(`Finding best match for ${targetName} in a list of ${playerList.length} players`);
    
    // Try exact match first
    let match = playerList.find(p => p.name === targetName);
    if (match) {
      console.log(`Found exact name match: ${match.name}`);
      debugOutput.foundExactMatch = match;
      return match;
    }
    
    // Try converting fullName to "Last, First" format
    if (typeof targetPlayer === 'object' && targetPlayer.fullName) {
      const convertedFullName = convertPlayerName({ fullName: targetPlayer.fullName }, 'lastFirst');
      debugOutput.convertedFullName = convertedFullName;
      
      match = playerList.find(p => p.name === convertedFullName);
      if (match) {
        console.log(`Found match using converted fullName: ${match.name}`);
        debugOutput.foundByConvertedFullName = match;
        return match;
      }
    }
    
    // Try converting name to "Last, First" format
    const convertedName = convertPlayerName(targetName, 'lastFirst');
    debugOutput.convertedName = convertedName;
    
    if (convertedName && convertedName !== targetName) {
      match = playerList.find(p => p.name === convertedName);
      if (match) {
        console.log(`Found match using converted name: ${match.name}`);
        debugOutput.foundByConvertedName = match;
        return match;
      }
    }
    
    // Try last name matching (for "A. Lastname" format)
    if (targetName.includes(' ')) {
      let lastName;
      
      // Handle "A. Lastname" format
      if (targetName.includes('.')) {
        lastName = targetName.split(' ')[1];
      } 
      // Handle "Firstname Lastname" format from fullName
      else if (typeof targetPlayer === 'object' && targetPlayer.fullName) {
        const parts = targetPlayer.fullName.split(' ');
        if (parts.length >= 2) {
          lastName = parts[parts.length - 1];
        }
      }
      
      debugOutput.extractedLastName = lastName;
      
      if (lastName) {
        const lastNameMatches = playerList.filter(p => 
          p.name.startsWith(lastName + ',') || 
          p.name.includes(`, ${lastName}`) ||
          (p.fullName && p.fullName.includes(lastName))
        );
        
        debugOutput.lastNameMatches = lastNameMatches;
        
        if (lastNameMatches.length === 1) {
          console.log(`Found unique last name match: ${lastNameMatches[0].name}`);
          debugOutput.foundUniqueLastNameMatch = lastNameMatches[0];
          return lastNameMatches[0];
        } else if (lastNameMatches.length > 1) {
          // If multiple matches, try to find one with matching team
          if (typeof targetPlayer === 'object' && targetPlayer.team) {
            const teamMatch = lastNameMatches.find(p => p.team === targetPlayer.team);
            if (teamMatch) {
              console.log(`Found last name + team match: ${teamMatch.name}`);
              debugOutput.foundByLastNameAndTeam = teamMatch;
              return teamMatch;
            }
          }
          console.log(`Found multiple last name matches, using first: ${lastNameMatches[0].name}`);
          debugOutput.foundFirstOfMultipleLastNameMatches = lastNameMatches[0];
          return lastNameMatches[0];
        }
      }
    }
    
    // Special handling for common cases based on the data we've seen
    if (typeof targetPlayer === 'object' && targetPlayer.fullName) {
      // Split fullName for special case matching
      const fullNameParts = targetPlayer.fullName.split(' ');
      const firstName = fullNameParts[0];
      const lastName = fullNameParts.slice(1).join(' ');
      
      // Try to find CSV entries with lastName, firstName or close patterns
      const specialCaseMatches = playerList.filter(p => 
        // Try "Last, First" or parts thereof
        (p.name.toLowerCase().startsWith(lastName.toLowerCase() + ',')) ||
        
        // Try for a more general last name match
        (p.name.toLowerCase().split(',')[0] === lastName.toLowerCase())
      );
      
      debugOutput.specialCaseMatches = specialCaseMatches;
      
      if (specialCaseMatches.length === 1) {
        console.log(`Found special case match: ${specialCaseMatches[0].name}`);
        debugOutput.foundBySpecialCase = specialCaseMatches[0];
        return specialCaseMatches[0];
      } else if (specialCaseMatches.length > 1) {
        // If multiple, try to narrow by first name or initial
        const firstNameMatch = specialCaseMatches.find(p => {
          const csvFirstName = p.name.split(', ')[1];
          return csvFirstName && 
                 (csvFirstName.toLowerCase() === firstName.toLowerCase() || 
                  csvFirstName.toLowerCase().startsWith(firstName.toLowerCase().charAt(0)));
        });
        
        if (firstNameMatch) {
          console.log(`Found first name special case match: ${firstNameMatch.name}`);
          debugOutput.foundBySpecialCaseAndFirstName = firstNameMatch;
          return firstNameMatch;
        }
        
        // If no first name match, try team
        if (targetPlayer.team) {
          const teamMatch = specialCaseMatches.find(p => p.team === targetPlayer.team);
          if (teamMatch) {
            console.log(`Found special case + team match: ${teamMatch.name}`);
            debugOutput.foundBySpecialCaseAndTeam = teamMatch;
            return teamMatch;
          }
        }
        
        // Just use the first one
        console.log(`Using first special case match: ${specialCaseMatches[0].name}`);
        debugOutput.foundFirstSpecialCaseMatch = specialCaseMatches[0];
        return specialCaseMatches[0];
      }
    }
    
    // Final direct check for specific test cases
    if (typeof targetPlayer === 'object') {
      // Check for specific players that might need special handling
      if (targetPlayer.fullName) {
        // Generic approach to match by last name
        const lastName = targetPlayer.fullName.split(' ').pop().toLowerCase();
        const nameMatch = playerList.find(p => 
          p.name.toLowerCase().includes(lastName)
        );
        
        if (nameMatch) {
          console.log(`Found match by last name for ${targetPlayer.fullName}: ${nameMatch.name}`);
          debugOutput.directNameMatch = nameMatch;
          return nameMatch;
        }
      }
    }
    
    // Last resort: try checking for partial matches in either direction
    for (const player of playerList) {
      // Check various forms of the name
      if (player.name.includes(targetName) || 
          targetName.includes(player.name) ||
          (player.fullName && player.fullName.includes(targetName)) ||
          (typeof targetPlayer === 'object' && targetPlayer.fullName && 
           player.name.includes(targetPlayer.fullName)) ||
          // Try to match by last name specifically
          (typeof targetPlayer === 'object' && targetPlayer.fullName && 
           player.name.split(',')[0] && 
           player.name.split(',')[0].toLowerCase().includes(targetPlayer.fullName.split(' ').pop().toLowerCase()))) {
          
        console.log(`Found partial name match: ${player.name}`);
        debugOutput.foundByPartialMatch = player;
        return player;
      }
    }
    
    // Store debug info for rendering
    setDebugInfo(prev => ({...prev, [targetName]: debugOutput}));
    
    console.log(`No match found for ${targetName}`);
    return null;
  };

  // Improved data loading function with better error handling
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setDataLoadError(null);

        // Use Promise.all to fetch all data in parallel
        const [hitterResponse, pitcherResponse, rosterResponse] = await Promise.all([
          fetch('/data/stats/hitterpitcharsenalstats.csv')
            .then(response => {
              if (!response.ok) {
                throw new Error(`Failed to fetch hitter data: ${response.status} ${response.statusText}`);
              }
              return response.text();
            }),
          fetch('/data/stats/pitcherpitcharsenalstats.csv')
            .then(response => {
              if (!response.ok) {
                throw new Error(`Failed to fetch pitcher data: ${response.status} ${response.statusText}`);
              }
              return response.text();
            }),
          fetch('/data/rosters.json')
            .then(response => {
              if (!response.ok) {
                throw new Error(`Failed to fetch roster data: ${response.status} ${response.statusText}`);
              }
              return response.json();
            })
        ]).catch(error => {
          console.error("Error in parallel data fetching:", error);
          throw error;
        });

        // Parse CSV data
        const parsedHitterData = Papa.parse(hitterResponse, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          transformHeader: header => header.replace(/"/g, '')
        });

        const parsedPitcherData = Papa.parse(pitcherResponse, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          transformHeader: header => header.replace(/"/g, '')
        });

        // Log some sample data to debug
        console.log("Hitter data sample:", parsedHitterData.data.slice(0, 2));
        console.log("Pitcher data sample:", parsedPitcherData.data.slice(0, 2));
        console.log("Roster data sample:", rosterResponse.slice(0, 2));

        // Store the parsed data
        setHitterData(parsedHitterData.data);
        setPitcherData(parsedPitcherData.data);
        setRosterData(rosterResponse);

        // Validate column names to ensure data is properly formatted
        const hitterColumns = parsedHitterData.meta.fields;
        const pitcherColumns = parsedPitcherData.meta.fields;

        console.log("Hitter columns:", hitterColumns);
        console.log("Pitcher columns:", pitcherColumns);

        // Check for required columns
        const requiredHitterColumns = ['last_name, first_name', 'player_id', 'team_name_alt', 'pitch_type'];
        const requiredPitcherColumns = ['last_name, first_name', 'player_id', 'team_name_alt', 'pitch_type'];

        const missingHitterColumns = requiredHitterColumns.filter(col => !hitterColumns.includes(col));
        const missingPitcherColumns = requiredPitcherColumns.filter(col => !pitcherColumns.includes(col));

        if (missingHitterColumns.length > 0) {
          throw new Error(`Hitter CSV missing required columns: ${missingHitterColumns.join(', ')}`);
        }

        if (missingPitcherColumns.length > 0) {
          throw new Error(`Pitcher CSV missing required columns: ${missingPitcherColumns.join(', ')}`);
        }

        // Extract unique hitters from CSV
        const uniqueHitters = Array.from(
          new Set(parsedHitterData.data.map(row => row['last_name, first_name']))
        ).filter(Boolean).map(name => {
          const row = parsedHitterData.data.find(r => r['last_name, first_name'] === name);
          
          // Try to find matching roster entry
          const nameParts = name.split(', ');
          const lastName = nameParts[0];
          
          // Try to match with roster data
          const rosterEntry = rosterResponse.find(r => 
            (r.fullName && r.fullName.includes(lastName)) ||
            (r.name && r.name.includes(lastName)) ||
            (nameParts.length > 1 && r.fullName && r.fullName.includes(nameParts[1]))
          );
          
          return {
            name,
            id: row ? row.player_id : undefined,
            team: row ? row.team_name_alt : undefined,
            bats: rosterEntry ? (rosterEntry.bats || "Unknown") : "Unknown",
            fullName: rosterEntry ? rosterEntry.fullName : null
          };
        });
        
        // Extract unique pitchers from CSV
        const uniquePitchers = Array.from(
          new Set(parsedPitcherData.data.map(row => row['last_name, first_name']))
        ).filter(Boolean).map(name => {
          const row = parsedPitcherData.data.find(r => r['last_name, first_name'] === name);
          
          // Try to find matching roster entry
          const nameParts = name.split(', ');
          const lastName = nameParts[0];
          
          // Try to match with roster data
          const rosterEntry = rosterResponse.find(r => 
            (r.fullName && r.fullName.includes(lastName)) ||
            (r.name && r.name.includes(lastName)) ||
            (nameParts.length > 1 && r.fullName && r.fullName.includes(nameParts[1]))
          );
          
          return {
            name,
            id: row ? row.player_id : undefined,
            team: row ? row.team_name_alt : undefined,
            throws: rosterEntry ? (rosterEntry.ph || "Unknown") : "Unknown",
            fullName: rosterEntry ? rosterEntry.fullName : null
          };
        });
        
        // Get pitch types
        const pitchTypeMap = {};
        [...parsedHitterData.data, ...parsedPitcherData.data].forEach(row => {
          if (!pitchTypeMap[row.pitch_type] && row.pitch_name) {
            pitchTypeMap[row.pitch_type] = row.pitch_name;
          }
        });
        
        console.log(`CSV Players: First hitter: ${uniqueHitters[0]?.name}, First pitcher: ${uniquePitchers[0]?.name}`);
        console.log(`Loaded ${uniqueHitters.length} unique hitters from CSV data`);
        console.log(`Loaded ${uniquePitchers.length} unique pitchers from CSV data`);
        
        setHitters(uniqueHitters);
        setPitchers(uniquePitchers);
        setPitchTypes(pitchTypeMap);
        setLoading(false);
        
      } catch (error) {
        console.error("Error loading data:", error);
        setDataLoadError(`Error loading data: ${error.message}`);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Separate useEffect to handle matching preselected players after data is loaded
  useEffect(() => {
    if (!loading && hitters.length > 0 && pitchers.length > 0) {
      console.log("Data loaded completely. Now trying to match preselected players...");
      
      // Show some sample data to help with debugging
      console.log("Sample hitters from CSV:", hitters.slice(0, 5).map(h => h.name));
      console.log("Sample pitchers from CSV:", pitchers.slice(0, 5).map(p => p.name));
      
      if (preSelectedHitter) {
        console.log("Finding match for preselected hitter:", preSelectedHitter);
        
        // Generate expected formats for easier debugging
        const hitterLastName = preSelectedHitter.fullName?.split(' ').pop() || 
                             preSelectedHitter.name?.split(' ').pop() || '';
        
        // Log any potential hitter matches by last name
        const possibleHitterMatches = hitters.filter(h => 
          h.name.toLowerCase().includes(hitterLastName.toLowerCase())
        );
        console.log(`Found ${possibleHitterMatches.length} potential matches for hitter by last name:`, 
          possibleHitterMatches.map(h => h.name));
        
        // Try to find the match
        const foundHitter = findBestMatch(preSelectedHitter, hitters);
        
        if (foundHitter) {
          console.log("✅ Found matching hitter:", foundHitter);
          setSelectedHitter(foundHitter);
        } else {
          console.log("⚠️ Could not find matching hitter in the database");
          // Fall back to using just the name to try to find a close match
          if (preSelectedHitter.fullName) {
            const lastName = preSelectedHitter.fullName.split(' ').pop();
            const fallbackMatch = hitters.find(h => h.name.toLowerCase().includes(lastName.toLowerCase()));
            
            if (fallbackMatch) {
              console.log("Found fallback match by last name:", fallbackMatch);
              setSelectedHitter(fallbackMatch);
            } else {
              console.error("No match found for hitter, even with fallback methods");
            }
          }
        }
      }
      
      if (preSelectedPitcher) {
        console.log("Finding match for preselected pitcher:", preSelectedPitcher);
        
        // Generate expected formats for easier debugging
        const pitcherLastName = preSelectedPitcher.fullName?.split(' ').pop() || 
                              preSelectedPitcher.name?.split(' ').pop() || '';
        
        // Log any potential pitcher matches by last name
        const possiblePitcherMatches = pitchers.filter(p => 
          p.name.toLowerCase().includes(pitcherLastName.toLowerCase())
        );
        console.log(`Found ${possiblePitcherMatches.length} potential matches for pitcher by last name:`, 
          possiblePitcherMatches.map(p => p.name));
        
        // Try to find the match
        const foundPitcher = findBestMatch(preSelectedPitcher, pitchers);
        
        if (foundPitcher) {
          console.log("✅ Found matching pitcher:", foundPitcher);
          setSelectedPitcher(foundPitcher);
        } else {
          console.log("⚠️ Could not find matching pitcher in the database");
          // Fall back to using just the name to try to find a close match
          if (preSelectedPitcher.fullName) {
            const lastName = preSelectedPitcher.fullName.split(' ').pop();
            const fallbackMatch = pitchers.find(p => p.name.toLowerCase().includes(lastName.toLowerCase()));
            
            if (fallbackMatch) {
              console.log("Found fallback match by last name:", fallbackMatch);
              setSelectedPitcher(fallbackMatch);
            } else {
              console.error("No match found for pitcher, even with fallback methods");
            }
          }
        }
      }
    }
  }, [loading, hitters, pitchers, preSelectedHitter, preSelectedPitcher]);

  useEffect(() => {
    if (selectedHitter && selectedPitcher) {
      analyzeMatchup(selectedHitter, selectedPitcher);
    } else {
      setMatchupResults(null);
      setOverallPrediction(null);
      setPlatoonAdvantage(null);
    }
  }, [selectedHitter, selectedPitcher]);

  const calculatePlatoonAdvantage = (hitter, pitcher) => {
    if (!hitter.bats || !pitcher.throws || hitter.bats === "Unknown" || pitcher.throws === "Unknown") {
      return {
        advantage: "Unknown",
        description: "Handedness data not available",
        color: "text-gray-500",
        factor: 1.0 // Neutral adjustment factor
      };
    }

    // Platoon advantages (general MLB averages)
    const platoonFactors = {
      "R-R": { advantage: "Pitcher", description: "RHB vs RHP slightly favors pitcher", color: "text-blue-500", factor: 0.95 },
      "L-L": { advantage: "Pitcher", description: "LHB vs LHP strongly favors pitcher", color: "text-blue-700", factor: 0.90 },
      "R-L": { advantage: "Pitcher", description: "RHB vs LHP slightly favors hitter", color: "text-red-500", factor: 1.05 },
      "L-R": { advantage: "Hitter", description: "LHB vs RHP strongly favors hitter", color: "text-red-700", factor: 1.10 },
      "S-R": { advantage: "Hitter", description: "Switch hitter vs RHP slightly favors hitter", color: "text-red-500", factor: 1.05 },
      "S-L": { advantage: "Even", description: "Switch hitter vs LHP is generally neutral", color: "text-gray-500", factor: 1.0 }
    };

    const matchupKey = `${hitter.bats}-${pitcher.throws}`;
    return platoonFactors[matchupKey] || {
      advantage: "Unknown",
      description: "Unusual handedness combination",
      color: "text-gray-500",
      factor: 1.0
    };
  };

  const analyzeMatchup = (hitter, pitcher) => {
    console.log(`Analyzing matchup between ${hitter.name} and ${pitcher.name}`);
    
    // Get all pitches for the selected pitcher
    const pitcherPitches = pitcherData.filter(
      row => row['last_name, first_name'] === pitcher.name
    );
    
    if (pitcherPitches.length === 0) {
      console.log(`No pitch data found for pitcher: ${pitcher.name}`);
    }
    
    // Get all pitch data for the selected hitter
    const hitterPitches = hitterData.filter(
      row => row['last_name, first_name'] === hitter.name
    );
    
    if (hitterPitches.length === 0) {
      console.log(`No pitch data found for hitter: ${hitter.name}`);
    }
    
    // Calculate platoon advantage based on handedness
    const platoon = calculatePlatoonAdvantage(hitter, pitcher);
    setPlatoonAdvantage(platoon);
    
    // For each pitch type that the pitcher throws, check how the hitter performs against it
    const results = [];

    pitcherPitches.forEach(pitcherPitch => {
      // Find how the hitter performs against this pitch type
      const hitterVsPitch = hitterPitches.find(pitch => pitch.pitch_type === pitcherPitch.pitch_type);
      
      if (hitterVsPitch) {
        // Apply platoon adjustment factor to the prediction
        const platoonAdjustedBA = hitterVsPitch.ba * platoon.factor;
        const platoonAdjustedSLG = hitterVsPitch.slg * platoon.factor;
        const platoonAdjustedWOBA = hitterVsPitch.woba * platoon.factor;
        
        results.push({
          pitch_type: pitcherPitch.pitch_type,
          pitch_name: pitcherPitch.pitch_name,
          
          // Pitcher stats
          pitcher_usage: pitcherPitch.pitch_usage,
          pitcher_run_value: pitcherPitch.run_value,
          pitcher_ba_against: pitcherPitch.ba,
          pitcher_slg_against: pitcherPitch.slg,
          pitcher_woba_against: pitcherPitch.woba,
          pitcher_whiff_percent: pitcherPitch.whiff_percent,
          pitcher_k_percent: pitcherPitch.k_percent,
          
          // Hitter stats
          hitter_run_value: hitterVsPitch.run_value,
          hitter_ba: hitterVsPitch.ba,
          hitter_slg: hitterVsPitch.slg,
          hitter_woba: hitterVsPitch.woba,
          hitter_whiff_percent: hitterVsPitch.whiff_percent,
          hitter_k_percent: hitterVsPitch.k_percent,
          
          // Original prediction (without platoon adjustment)
          base_predicted_ba: (hitterVsPitch.ba + (1 - pitcherPitch.ba)) / 2,
          base_predicted_slg: (hitterVsPitch.slg + (1 - pitcherPitch.slg)) / 2,
          base_predicted_woba: (hitterVsPitch.woba + (1 - pitcherPitch.woba)) / 2,
          
          // Platoon-adjusted prediction
          predicted_ba: ((platoonAdjustedBA + (1 - pitcherPitch.ba)) / 2),
          predicted_slg: ((platoonAdjustedSLG + (1 - pitcherPitch.slg)) / 2),
          predicted_woba: ((platoonAdjustedWOBA + (1 - pitcherPitch.woba)) / 2),
          
          // Matchup advantage calculation
          matchup_advantage: (hitterVsPitch.run_value_per_100 - pitcherPitch.run_value_per_100) * platoon.factor
        });
      }
    });

    setMatchupResults(results);
    
    // Calculate overall matchup prediction
    if (results.length > 0) {
      // Weight predictions by pitcher's pitch usage
      const totalUsage = results.reduce((sum, pitch) => sum + pitch.pitcher_usage, 0);
      
      const weightedPredictions = results.reduce((acc, pitch) => {
        const weight = pitch.pitcher_usage / totalUsage;
        return {
          // Base predictions (without platoon)
          base_ba: acc.base_ba + (pitch.base_predicted_ba * weight),
          base_slg: acc.base_slg + (pitch.base_predicted_slg * weight),
          base_woba: acc.base_woba + (pitch.base_predicted_woba * weight),
          
          // Platoon-adjusted predictions
          ba: acc.ba + (pitch.predicted_ba * weight),
          slg: acc.slg + (pitch.predicted_slg * weight),
          woba: acc.woba + (pitch.predicted_woba * weight),
          advantage: acc.advantage + (pitch.matchup_advantage * weight),
          
          // Calculate probabilities for different outcomes
          hit_probability: acc.hit_probability + (pitch.predicted_ba * weight),
          extra_base_probability: acc.extra_base_probability + 
            ((pitch.predicted_slg - pitch.predicted_ba) / 3 * weight),
          strikeout_probability: acc.strikeout_probability + 
            ((pitch.hitter_k_percent * platoon.factor + pitch.pitcher_k_percent) / 2 * weight / 100),
            
          // Store the platoon factor
          platoon_factor: platoon.factor
        };
      }, { 
        base_ba: 0, base_slg: 0, base_woba: 0,
        ba: 0, slg: 0, woba: 0, advantage: 0, 
        hit_probability: 0, extra_base_probability: 0, strikeout_probability: 0,
        platoon_factor: platoon.factor
      });
      
      setOverallPrediction(weightedPredictions);
    } else {
      console.log("No matching pitch type data found for this matchup");
      setOverallPrediction(null);
    }
  };

  const formatPitchName = (type) => {
    return pitchTypes[type] || type;
  };

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
    if (value === undefined || value === null) return "N/A";
    return typeof value === 'number' ? value.toFixed(3) : value;
  };

  const PlatoonAdvantageCard = () => {
    if (!platoonAdvantage) return null;
    
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
               selectedHitter.bats === "S" ? "Switch" : "Unknown"}
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
        
        <div className="mt-2 text-sm text-center">
          {platoonAdvantage.description}
        </div>
      </div>
    );
  };

  const PitchBreakdown = () => {
    if (!matchupResults || matchupResults.length === 0) return null;
    
    // Prepare data for the bar chart
    const chartData = matchupResults.map(pitch => ({
      name: formatPitchName(pitch.pitch_type),
      usage: pitch.pitcher_usage,
      advantage: parseFloat(pitch.matchup_advantage.toFixed(2)),
      predictedBA: parseFloat(pitch.predicted_ba.toFixed(3)),
      predictedSLG: parseFloat(pitch.predicted_slg.toFixed(3))
    }));
    
    return (
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-4">Pitch-by-Pitch Breakdown</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-medium mb-2">Pitch Usage & Matchup Advantage</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" label={{ value: "Usage %", angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: "Advantage", angle: 90, position: 'insideRight' }} />
                <Tooltip formatter={(value, name) => {
                  if (name === 'usage') return [`${value.toFixed(1)}%`, 'Usage'];
                  if (name === 'advantage') return [value, 'Advantage'];
                  return [value, name];
                }} />
                <Legend />
                <Bar yAxisId="left" dataKey="usage" fill="#8884d8" name="Pitch Usage %" />
                <Bar yAxisId="right" dataKey="advantage" fill="#82ca9d" name="Matchup Advantage" />
              </BarChart>
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
                <YAxis domain={[0, 1]} />
                <Tooltip formatter={(value) => value.toFixed(3)} />
                <Legend />
                <Bar dataKey="predictedBA" fill="#3182ce" name="Pred. Batting Avg" />
                <Bar dataKey="predictedSLG" fill="#e53e3e" name="Pred. Slugging" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="mt-6">
          <h4 className="text-md font-medium mb-2">Detailed Stats by Pitch Type</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pitch</th>
                  <th className="py-2 px-4 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                  <th className="py-2 px-4 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matchup</th>
                  <th className="py-2 px-4 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pred. BA</th>
                  <th className="py-2 px-4 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pred. SLG</th>
                  <th className="py-2 px-4 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batter BA</th>
                  <th className="py-2 px-4 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pitcher BA</th>
                </tr>
              </thead>
              <tbody>
                {matchupResults.map((pitch, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-4 border-b border-gray-200">{formatPitchName(pitch.pitch_type)}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{pitch.pitcher_usage.toFixed(1)}%</td>
                    <td className={`py-2 px-4 border-b border-gray-200 ${getMatchupColor(pitch.matchup_advantage)}`}>
                      {pitch.matchup_advantage.toFixed(2)}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200">{pitch.predicted_ba.toFixed(3)}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{pitch.predicted_slg.toFixed(3)}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{pitch.hitter_ba.toFixed(3)}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{pitch.pitcher_ba_against.toFixed(3)}</td>
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
    
    // Prepare data for radar chart
    const radarData = [
      {
        stat: "Batting Average",
        value: overallPrediction.ba,
        baseValue: overallPrediction.base_ba,
        fullMark: 0.500
      },
      {
        stat: "Slugging",
        value: overallPrediction.slg,
        baseValue: overallPrediction.base_slg,
        fullMark: 0.800
      },
      {
        stat: "wOBA",
        value: overallPrediction.woba,
        baseValue: overallPrediction.base_woba,
        fullMark: 0.600
      },
      {
        stat: "Hit Probability",
        value: overallPrediction.hit_probability,
        baseValue: overallPrediction.hit_probability / overallPrediction.platoon_factor,
        fullMark: 0.500
      },
      {
        stat: "XBH Probability",
        value: overallPrediction.extra_base_probability,
        baseValue: overallPrediction.extra_base_probability / overallPrediction.platoon_factor,
        fullMark: 0.300
      }
    ];
    
    // Prepare data for outcome probability chart
    const outcomeData = [
      { name: "Hit", value: overallPrediction.hit_probability },
      { name: "Extra Base Hit", value: overallPrediction.extra_base_probability },
      { name: "Strikeout", value: overallPrediction.strikeout_probability },
      { name: "Other Out", value: 1 - overallPrediction.hit_probability - overallPrediction.strikeout_probability }
    ];
    
    return (
      <div className="mt-8 bg-gray-50 p-6 rounded-lg shadow">
        <h3 className="text-xl font-medium mb-4">Overall Matchup Prediction</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 bg-white p-4 rounded shadow-sm">
            <div className="text-center">
              <h4 className="text-lg font-medium">Matchup Advantage</h4>
              <div className={`mt-2 text-3xl font-bold ${getMatchupColor(overallPrediction.advantage)}`}>
                {overallPrediction.advantage.toFixed(2)}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                {getMatchupAdvantageText(overallPrediction.advantage)}
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Predicted BA</div>
                <div className="text-xl font-medium">{overallPrediction.ba.toFixed(3)}</div>
                <div className="text-xs text-gray-500">
                  Base: {overallPrediction.base_ba.toFixed(3)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Predicted SLG</div>
                <div className="text-xl font-medium">{overallPrediction.slg.toFixed(3)}</div>
                <div className="text-xs text-gray-500">
                  Base: {overallPrediction.base_slg.toFixed(3)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Predicted wOBA</div>
                <div className="text-xl font-medium">{overallPrediction.woba.toFixed(3)}</div>
                <div className="text-xs text-gray-500">
                  Base: {overallPrediction.base_woba.toFixed(3)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Hit Probability</div>
                <div className="text-xl font-medium">{(overallPrediction.hit_probability * 100).toFixed(1)}%</div>
                <div className="text-xs text-gray-500">
                  Platoon Factor: {overallPrediction.platoon_factor.toFixed(2)}×
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-span-1 lg:col-span-2">
            <h4 className="text-md font-medium mb-2">Predicted Performance Metrics</h4>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart outerRadius={90} data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="stat" />
                <PolarRadiusAxis domain={[0, 'auto']} />
                <Radar name="With Handedness" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                <Radar name="Base Prediction" dataKey="baseValue" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.4} />
                <Tooltip formatter={(value) => value.toFixed(3)} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="mt-6">
          <h4 className="text-md font-medium mb-2">Predicted Outcome Probabilities</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={outcomeData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} domain={[0, 1]} />
              <Tooltip formatter={(value) => `${(value * 100).toFixed(1)}%`} />
              <Legend />
              <Bar dataKey="value" fill="#3182ce" />
            </BarChart>
          </ResponsiveContainer>
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
          <pre className="overflow-auto bg-white p-2 rounded border border-red-200">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  const LoadingMessage = () => (
    <div className="text-center p-8">
      <div className="text-lg">Loading data...</div>
      <div className="text-sm text-gray-500 mt-2">Fetching player statistics from the database...</div>
    </div>
  );

  const ErrorMessage = () => (
    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md mb-4">
      <h3 className="text-lg font-medium mb-2">Data Loading Error</h3>
      <p>{dataLoadError}</p>
      <p className="mt-3 text-sm text-red-600">
        Please make sure the server has the following data files available:
      </p>
      <ul className="list-disc list-inside mt-2 text-sm text-red-600">
        <li>/data/stats/hitterpitcharsenalstats.csv</li>
        <li>/data/stats/pitcherpitcharsenalstats.csv</li>
        <li>/data/rosters.json</li>
      </ul>
    </div>
  );

  const NoMatchupDataMessage = () => (
    <div className="text-center p-8">
      <div className="text-lg text-amber-700">
        {matchupResults === null 
          ? "Select both a hitter and pitcher to see matchup predictions." 
          : "No matchup data available for these players."}
      </div>
      <div className="text-sm text-gray-500 mt-2">
        Either the selected players don't have enough data in our system, or there's an issue with the player matching.
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">MLB Batter-Pitcher Matchup Predictor</h1>
      
      {loading ? (
        <LoadingMessage />
      ) : dataLoadError ? (
        <ErrorMessage />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Hitter
              </label>
              <select
                className="w-full p-2 border rounded-md"
                onChange={(e) => {
                  const selected = hitters.find(h => h.name === e.target.value);
                  setSelectedHitter(selected);
                }}
                value={selectedHitter?.name || ""}
              >
                <option value="">Select a hitter...</option>
                {hitters.map((hitter) => (
                  <option key={hitter.id || hitter.name} value={hitter.name}>
                    {hitter.name} ({hitter.team}) {hitter.bats !== "Unknown" ? `- ${hitter.bats === "L" ? "Left" : hitter.bats === "R" ? "Right" : "Switch"}` : ""}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Pitcher
              </label>
              <select
                className="w-full p-2 border rounded-md"
                onChange={(e) => {
                  const selected = pitchers.find(p => p.name === e.target.value);
                  setSelectedPitcher(selected);
                }}
                value={selectedPitcher?.name || ""}
              >
                <option value="">Select a pitcher...</option>
                {pitchers.map((pitcher) => (
                  <option key={pitcher.id || pitcher.name} value={pitcher.name}>
                    {pitcher.name} ({pitcher.team}) {pitcher.throws !== "Unknown" ? `- ${pitcher.throws === "L" ? "Left" : "Right"}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Debug info showing preselected players */}
          {(preSelectedHitter || preSelectedPitcher) && (
            <div className="mt-4 text-sm text-gray-500 bg-gray-100 p-3 rounded">
              <div>Preselected players:</div>
              {preSelectedHitter && (
                <div className="mt-1">
                  <span className="font-semibold">Hitter:</span> {preSelectedHitter.fullName || preSelectedHitter.name} ({preSelectedHitter.team})
                  {selectedHitter && <span className="text-green-600 ml-2">→ Matched to: {selectedHitter.name}</span>}
                  {!selectedHitter && <span className="text-red-600 ml-2">→ No match found in database</span>}
                </div>
              )}
              {preSelectedPitcher && (
                <div className="mt-1">
                  <span className="font-semibold">Pitcher:</span> {preSelectedPitcher.fullName || preSelectedPitcher.name} ({preSelectedPitcher.team})
                  {selectedPitcher && <span className="text-green-600 ml-2">→ Matched to: {selectedPitcher.name}</span>}
                  {!selectedPitcher && <span className="text-red-600 ml-2">→ No match found in database</span>}
                </div>
              )}
            </div>
          )}
          
          {selectedHitter && selectedPitcher ? (
            <div className="mt-8">
              <div className="bg-gray-100 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="text-xl font-medium">
                    {selectedHitter.name} ({selectedHitter.team})
                    {selectedHitter.bats !== "Unknown" && (
                      <span className="ml-2 text-sm bg-gray-200 px-2 py-1 rounded">
                        {selectedHitter.bats === "L" ? "Left" : selectedHitter.bats === "R" ? "Right" : "Switch"}
                      </span>
                    )}
                  </div>
                  <div className="text-lg">vs</div>
                  <div className="text-xl font-medium">
                    {selectedPitcher.name} ({selectedPitcher.team})
                    {selectedPitcher.throws !== "Unknown" && (
                      <span className="ml-2 text-sm bg-gray-200 px-2 py-1 rounded">
                        {selectedPitcher.throws === "L" ? "Left" : "Right"}
                      </span>
                    )}
                  </div>
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
        <p>Note: Predictions are based on historical performance against pitch types and handedness matchups. The model weights predictions by the pitcher's pitch usage rates and applies platoon advantages based on batter/pitcher handedness.</p>
        <p>Positive matchup advantage values favor the hitter, while negative values favor the pitcher.</p>
      </div>
    </div>
  );
};

export default BatterPitcherMatchup;