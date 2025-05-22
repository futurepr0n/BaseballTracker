import React, { useState, useEffect, useCallback } from 'react';
import './MatchupAnalyzer.css';
import { fetchRosterData } from '../services/dataService';
import Papa from 'papaparse';
import _ from 'lodash';

// Define the years of data you want to load (same as BatterPitcherMatchup)
const DATA_YEARS = [2025, 2024, 2023, 2022];
const CURRENT_YEAR = Math.max(...DATA_YEARS);

/**
 * Matchup Analyzer Component - With Year Selection
 * Analyzes all batter-pitcher matchups for selected games with configurable years
 */
function MatchupAnalyzer({ gameData, playerData, teamData, currentDate }) {
  // State for data
  const [rosterData, setRosterData] = useState([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(true);
  
  // State for CSV data loading
  const [hitterData, setHitterData] = useState([]);
  const [pitcherData, setPitcherData] = useState([]);
  const [isLoadingCSV, setIsLoadingCSV] = useState(true);
  const [dataLoadError, setDataLoadError] = useState(null);
  
  // State for year selection (similar to BatterPitcherMatchup)
  const [activeYears, setActiveYears] = useState([...DATA_YEARS].sort((a, b) => b - a));
  
  // State for selected games and configured pitchers
  const [selectedGames, setSelectedGames] = useState({});
  const [gamePitchers, setGamePitchers] = useState({});
  const [analysisResults, setAnalysisResults] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Format date for display
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Load roster data when component mounts
  useEffect(() => {
    const loadRoster = async () => {
      setIsLoadingRoster(true);
      try {
        console.log("Loading roster data...");
        const roster = await fetchRosterData();
        console.log(`Loaded ${roster.length} players from roster data`);
        setRosterData(roster);
        
        // Initialize selected games using array indices as keys
        const gameSelections = {};
        gameData.forEach((game, index) => {
          gameSelections[index] = true;
        });
        setSelectedGames(gameSelections);
        
      } catch (error) {
        console.error("Error loading roster data:", error);
      } finally {
        setIsLoadingRoster(false);
      }
    };
    
    loadRoster();
  }, [gameData]);

  // Load CSV data for all years when component mounts
  useEffect(() => {
    const loadAllCSVData = async () => {
      setIsLoadingCSV(true);
      setDataLoadError(null);
      
      try {
        console.log("Loading CSV data for all years...");
        
        let allHitterStats = [];
        let allPitcherStats = [];
        let successfullyLoadedYears = [];

        for (const year of DATA_YEARS.sort((a,b) => b-a)) { 
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

            const parsedHitterData = Papa.parse(hitterResponseText, { 
              header: true, 
              dynamicTyping: true, 
              skipEmptyLines: true, 
              transformHeader: header => header.replace(/"/g, '') 
            });
            
            const parsedPitcherData = Papa.parse(pitcherResponseText, { 
              header: true, 
              dynamicTyping: true, 
              skipEmptyLines: true, 
              transformHeader: header => header.replace(/"/g, '') 
            });

            if (parsedHitterData.data.length > 0 || parsedPitcherData.data.length > 0) {
                successfullyLoadedYears.push(year);
            }

            allHitterStats.push(...parsedHitterData.data.map(row => ({ ...row, year })));
            allPitcherStats.push(...parsedPitcherData.data.map(row => ({ ...row, year })));
            
            console.log(`Successfully loaded data for year ${year}`);
          } catch (yearError) {
            console.warn(`Warning: Could not load data for year ${year}. Skipping. Error: ${yearError.message}`);
          }
        }
        
        // Update active years to only include successfully loaded years
        setActiveYears(_.uniq(successfullyLoadedYears).sort((a,b) => b-a));
        
        if (allHitterStats.length === 0 || allPitcherStats.length === 0) {
          throw new Error("No player statistics data could be loaded. Please check CSV file availability.");
        }

        setHitterData(allHitterStats);
        setPitcherData(allPitcherStats);
        
        console.log(`Loaded ${allHitterStats.length} hitter records and ${allPitcherStats.length} pitcher records`);
        
      } catch (error) {
        console.error("Error loading CSV data:", error);
        setDataLoadError(`Error loading data: ${error.message}. Ensure CSV files are available in /public/data/stats/`);
      } finally {
        setIsLoadingCSV(false);
      }
    };

    loadAllCSVData();
  }, []);
  
  // Get all available pitchers for a team
  const getPitchersForTeam = useCallback((teamCode) => {
    if (!rosterData || !teamCode) return [];
    
    return rosterData
      .filter(player => 
        player.team === teamCode && 
        player.type === 'pitcher'
      )
      .map(pitcher => ({
        value: `${pitcher.name}-${pitcher.team}`,
        label: `${pitcher.name}${pitcher.throwingArm || pitcher.ph ? ` (${pitcher.throwingArm || pitcher.ph})` : ''}`,
        data: pitcher
      }));
  }, [rosterData]);
  
  // Get all batters for a team
  const getBattersForTeam = useCallback((teamCode) => {
    if (!rosterData || !teamCode) return [];
    
    return rosterData
      .filter(player => 
        player.team === teamCode && 
        player.type === 'hitter'
      );
  }, [rosterData]);

  // Toggle game selection
  const handleGameSelect = (gameIndex) => {
    setSelectedGames(prev => ({
      ...prev,
      [gameIndex]: !prev[gameIndex]
    }));
  };

  // Handle pitcher selection
  const handlePitcherSelect = (gameIndex, teamCode, pitcherId) => {
    const key = `${gameIndex}_${teamCode}`;
    setGamePitchers(prev => ({
      ...prev,
      [key]: pitcherId
    }));
  };

  // Reset all selections
  const resetSelections = () => {
    setGamePitchers({});
    setAnalysisResults([]);
  };

  // Get pitcher by ID (name-team format)
  const getPitcherById = (pitcherId) => {
    if (!pitcherId || !rosterData.length) return null;
    
    const [pitcherName, pitcherTeam] = pitcherId.split('-');
    return rosterData.find(p => 
      p.name === pitcherName && 
      p.team === pitcherTeam && 
      p.type === 'pitcher'
    );
  };

  // Enhanced name matching function (similar to BatterPitcherMatchup)
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

  // Find best match function (similar to BatterPitcherMatchup)
  const findBestMatch = (targetPlayer, playerList) => {
    if (!targetPlayer || !playerList || !playerList.length) return null;
    const targetName = typeof targetPlayer === 'object' ? targetPlayer.name : targetPlayer;
    
    let match = playerList.find(p => p['last_name, first_name'] === targetName);
    if (match) return match;
    
    if (typeof targetPlayer === 'object' && targetPlayer.fullName) {
      const convertedFullName = convertPlayerName({ fullName: targetPlayer.fullName }, 'lastFirst');
      match = playerList.find(p => p['last_name, first_name'] === convertedFullName);
      if (match) return match;
    }
    
    const convertedName = convertPlayerName(targetName, 'lastFirst');
    if (convertedName && convertedName !== targetName) {
      match = playerList.find(p => p['last_name, first_name'] === convertedName);
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
      
      if (lastName) {
        const lastNameMatches = playerList.filter(p => 
          p['last_name, first_name'] && (
            p['last_name, first_name'].startsWith(lastName + ',') || 
            p['last_name, first_name'].includes(`, ${lastName}`)
          )
        );
        
        if (lastNameMatches.length === 1) return lastNameMatches[0];
        else if (lastNameMatches.length > 1) {
          if (typeof targetPlayer === 'object' && targetPlayer.team) {
            const teamMatch = lastNameMatches.find(p => p.team_name_alt === targetPlayer.team);
            if (teamMatch) return teamMatch;
          }
          return lastNameMatches[0]; 
        }
      }
    }
    
    return null;
  };

  // Analyze matchup using CSV data (simplified version of BatterPitcherMatchup logic)
  const analyzeMatchupWithCSV = (batter, pitcher) => {
    // Filter data by active years
    const currentHitterDataForPlayer = hitterData.filter(row => 
      activeYears.includes(row.year) && 
      findBestMatch(batter, [row])
    );
    
    const currentPitcherDataForPlayer = pitcherData.filter(row => 
      activeYears.includes(row.year) && 
      findBestMatch(pitcher, [row])
    );

    // Basic handedness advantage
    let handednessAdvantage = 0;
    if (batter.bats && (pitcher.throwingArm || pitcher.ph)) {
      const pitcherHand = pitcher.throwingArm || pitcher.ph;
      
      if (batter.bats === 'B') {
        handednessAdvantage = 1.5;
      } else if (batter.bats === pitcherHand) {
        handednessAdvantage = -1.2;
      } else {
        handednessAdvantage = 1.2;
      }
    }

    // Add some analysis based on CSV data if available
    let csvAdvantage = 0;
    if (currentHitterDataForPlayer.length > 0 && currentPitcherDataForPlayer.length > 0) {
      // Example: Use average wOBA from hitter data vs average wOBA allowed by pitcher
      const avgHitterWOBA = _.meanBy(currentHitterDataForPlayer, 'woba') || 0.320;
      const avgPitcherWOBA = _.meanBy(currentPitcherDataForPlayer, 'woba') || 0.320;
      
      csvAdvantage = (avgHitterWOBA - avgPitcherWOBA) * 3; // Scale the difference
    }

    const totalAdvantage = handednessAdvantage + csvAdvantage;
    
    return {
      advantage: totalAdvantage,
      advantageLabel: getAdvantageLabel(totalAdvantage),
      hitPotential: getPotentialRating(totalAdvantage, 0),
      hrPotential: getPotentialRating(totalAdvantage, -0.8),
      tbPotential: getPotentialRating(totalAdvantage, -0.3),
      kPotential: getPotentialRating(-totalAdvantage, -0.2),
      details: {
        predictedBA: Math.min(0.350, Math.max(0.180, 0.250 + totalAdvantage * 0.04)).toFixed(3),
        predictedHR: Math.min(0.080, Math.max(0.010, 0.030 + totalAdvantage * 0.01)).toFixed(3),
        predictedSLG: Math.min(0.600, Math.max(0.300, 0.420 + totalAdvantage * 0.06)).toFixed(3),
        predictedWOBA: Math.min(0.450, Math.max(0.280, 0.340 + totalAdvantage * 0.05)).toFixed(3),
        strikeoutRate: Math.min(0.40, Math.max(0.10, 0.22 - totalAdvantage * 0.03)).toFixed(3),
        yearsUsed: activeYears.join(', '),
        hitterDataPoints: currentHitterDataForPlayer.length,
        pitcherDataPoints: currentPitcherDataForPlayer.length
      }
    };
  };

  // Run the analysis for selected games and pitchers
  const runAnalysis = async () => {
    console.log("Starting analysis...");
    setIsAnalyzing(true);
    setAnalysisResults([]);
    
    // Get selected game indices
    const selectedGameIndices = Object.entries(selectedGames)
      .filter(([_, isSelected]) => isSelected)
      .map(([index]) => Number(index));
    
    console.log(`Selected games: ${selectedGameIndices.length}, Active years: ${activeYears.join(', ')}`);
    
    // Collect all configured matchups
    const matchups = [];
    
    for (const gameIndex of selectedGameIndices) {
      const game = gameData[gameIndex];
      if (!game) {
        console.log(`Game at index ${gameIndex} not found`);
        continue;
      }
      
      console.log(`Processing game: ${game.awayTeam} @ ${game.homeTeam}`);
      
      // Home team pitcher vs away team batters
      const homePitcherId = gamePitchers[`${gameIndex}_${game.homeTeam}`];
      if (homePitcherId) {
        const homePitcher = getPitcherById(homePitcherId);
        if (homePitcher) {
          console.log(`Found home pitcher: ${homePitcher.name}`);
          const awayBatters = getBattersForTeam(game.awayTeam);
          console.log(`Found ${awayBatters.length} away batters`);
          
          awayBatters.forEach(batter => {
            matchups.push({
              gameIndex,
              game: `${game.awayTeam} @ ${game.homeTeam}`,
              batter,
              pitcher: homePitcher
            });
          });
        }
      }
      
      // Away team pitcher vs home team batters
      const awayPitcherId = gamePitchers[`${gameIndex}_${game.awayTeam}`];
      if (awayPitcherId) {
        const awayPitcher = getPitcherById(awayPitcherId);
        if (awayPitcher) {
          console.log(`Found away pitcher: ${awayPitcher.name}`);
          const homeBatters = getBattersForTeam(game.homeTeam);
          console.log(`Found ${homeBatters.length} home batters`);
          
          homeBatters.forEach(batter => {
            matchups.push({
              gameIndex,
              game: `${game.awayTeam} @ ${game.homeTeam}`,
              batter,
              pitcher: awayPitcher
            });
          });
        }
      }
    }
    
    console.log(`Total matchups to analyze: ${matchups.length}`);
    
    if (matchups.length === 0) {
      console.log("No matchups to analyze. Make sure pitchers are selected.");
      setIsAnalyzing(false);
      return;
    }
    
    try {
      // Process each matchup using CSV data
      const results = matchups.map(matchup => {
        const analysis = analyzeMatchupWithCSV(matchup.batter, matchup.pitcher);
        
        return {
          ...matchup,
          result: analysis,
          explanation: mockGetExplanation(analysis)
        };
      });
      
      // Sort by strongest batter advantage
      results.sort((a, b) => b.result.advantage - a.result.advantage);
      
      setAnalysisResults(results);
    } catch (error) {
      console.error("Error analyzing matchups:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper functions
  const getAdvantageLabel = (advantage) => {
    if (advantage > 2) return 'Strong Batter Advantage';
    if (advantage > 1) return 'Batter Advantage';
    if (advantage > 0.3) return 'Slight Batter Advantage';
    if (advantage > -0.3) return 'Neutral Matchup';
    if (advantage > -1) return 'Slight Pitcher Advantage';
    if (advantage > -2) return 'Pitcher Advantage';
    return 'Strong Pitcher Advantage';
  };
  
  const getPotentialRating = (advantage, adjustment = 0) => {
    const adjustedAdvantage = advantage + adjustment;
    
    if (adjustedAdvantage > 1.5) return 'High';
    if (adjustedAdvantage > 0) return 'Medium';
    return 'Low';
  };
  
  const mockGetExplanation = (analysis) => {
    const { advantageLabel, hitPotential, hrPotential, tbPotential, kPotential, details } = analysis;
    
    return `
    Betting Prop Insights:
    🎯
    Hit Potential: ${hitPotential}
    Predicted Hit Rate: ${(parseFloat(details.predictedBA) * 100).toFixed(1)}%. Expected BA of ${details.predictedBA}.

    💣
    Home Run Potential: ${hrPotential}
    Predicted HR Rate: ${(parseFloat(details.predictedHR) * 100).toFixed(1)}%. This suggests about 1 HR every ${Math.round(1 / parseFloat(details.predictedHR))} Plate Appearances.

    📊
    Total Bases Potential: ${tbPotential}
    Driven by Predicted SLG of ${details.predictedSLG} and wOBA of ${details.predictedWOBA}.

    ⚾
    Batter K Potential: ${kPotential}
    Batter's Strikeout Rate: ${(parseFloat(details.strikeoutRate) * 100).toFixed(1)}%. This is a ${kPotential} indicator for pitcher strikeout props.
    
    📈 Analysis based on ${details.yearsUsed} data (${details.hitterDataPoints} hitter records, ${details.pitcherDataPoints} pitcher records)
    `;
  };

  const getAdvantageClass = (advantage) => {
    if (advantage > 2) return 'strong-advantage';
    if (advantage > 1) return 'medium-advantage';
    if (advantage > 0.3) return 'slight-advantage';
    if (advantage > -0.3) return 'neutral';
    if (advantage > -1) return 'slight-disadvantage';
    if (advantage > -2) return 'medium-disadvantage';
    return 'strong-disadvantage';
  };

  const canRunAnalysis = () => {
    const hasSelectedGames = Object.values(selectedGames).some(isSelected => isSelected);
    const hasPitcherConfigured = Object.keys(gamePitchers).length > 0;
    
    return hasSelectedGames && hasPitcherConfigured && !isAnalyzing && !isLoadingRoster && !isLoadingCSV && activeYears.length > 0;
  };

  return (
    <div className="matchup-analyzer">
      <header className="analyzer-header">
        <h2>Matchup Analyzer</h2>
        <p className="date">{formattedDate}</p>
      </header>


      
      <section className="game-selection-section">
        <h3>Select Games & Configure Pitchers</h3>
        <div className="games-grid">
          {gameData.map((game, index) => (
            <div 
              key={index} 
              className={`game-card ${selectedGames[index] ? 'selected' : ''}`}
            >
              <div className="game-header">
                <span>{game.awayTeam} @ {game.homeTeam}</span>
                <button 
                  className="select-btn" 
                  onClick={() => handleGameSelect(index)}
                >
                  {selectedGames[index] ? 'Selected' : 'Select'}
                </button>
              </div>
              
              <div className="game-pitchers">
                <div className="team-pitcher">
                  <label>{game.awayTeam} Pitcher:</label>
                  <select 
                    value={gamePitchers[`${index}_${game.awayTeam}`] || ''}
                    onChange={(e) => handlePitcherSelect(index, game.awayTeam, e.target.value)}
                    disabled={!selectedGames[index] || isLoadingRoster}
                  >
                    <option value="">Select Pitcher</option>
                    {getPitchersForTeam(game.awayTeam).map(pitcher => (
                      <option key={pitcher.value} value={pitcher.value}>
                        {pitcher.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="team-pitcher">
                  <label>{game.homeTeam} Pitcher:</label>
                  <select 
                    value={gamePitchers[`${index}_${game.homeTeam}`] || ''}
                    onChange={(e) => handlePitcherSelect(index, game.homeTeam, e.target.value)}
                    disabled={!selectedGames[index] || isLoadingRoster}
                  >
                    <option value="">Select Pitcher</option>
                    {getPitchersForTeam(game.homeTeam).map(pitcher => (
                      <option key={pitcher.value} value={pitcher.value}>
                        {pitcher.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="analyzer-controls">
          <button 
            className="analyze-btn"
            onClick={runAnalysis}
            disabled={!canRunAnalysis()}
          >
            {isAnalyzing ? (
              <>
                <div className="spinner"></div>
                Analyzing...
              </>
            ) : (
              'Run Analysis'
            )}
          </button>
          <button className="clear-btn" onClick={resetSelections}>
            Clear All
          </button>
        </div>
      </section>
      
      {analysisResults.length > 0 && (
        <section className="results-section">
          <h3>Matchup Analysis Results ({analysisResults.length} matchups)</h3>
          
          {/* Year Selection - Now positioned correctly under results heading */}
          <div className="analysis-years-control">
            <div className="years-header">
              <span className="years-label">Analysis Years (Successfully Loaded: {activeYears.join(', ')}):</span>
            </div>
            <div className="year-checkboxes-inline">
              {DATA_YEARS.sort((a,b) => b-a).map(year => (
                <label key={year} className="year-checkbox-inline">
                  <input 
                    type="checkbox" 
                    className="form-checkbox"
                    value={year}
                    checked={activeYears.includes(year)}
                    onChange={(e) => {
                      const yearVal = parseInt(e.target.value);
                      if (e.target.checked) {
                        setActiveYears(prev => _.uniq([...prev, yearVal]).sort((a,b) => b-a));
                        // Re-run analysis with new year selection
                        if (analysisResults.length > 0) {
                          setTimeout(() => runAnalysis(), 100);
                        }
                      } else {
                        if (activeYears.length > 1) { // Prevent unchecking all years
                          setActiveYears(prev => prev.filter(y => y !== yearVal));
                          // Re-run analysis with new year selection
                          setTimeout(() => runAnalysis(), 100);
                        }
                      }
                    }}
                    disabled={isLoadingCSV || isAnalyzing}
                  />
                  <span className="year-label-inline">{year}</span>
                </label>
              ))}
            </div>
            <div className="csv-status">
              {isLoadingCSV ? (
                <span className="loading-text">Loading CSV data...</span>
              ) : dataLoadError ? (
                <span className="error-text">{dataLoadError}</span>
              ) : (
                <span className="success-text">
                  ({hitterData.length} hitter records, {pitcherData.length} pitcher records)
                </span>
              )}
            </div>
          </div>
          
          <div className="results-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Batter</th>
                  <th>Pitcher</th>
                  <th>Advantage</th>
                  <th>Hit</th>
                  <th>HR</th>
                  <th>TB</th>
                  <th>K</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {analysisResults.map((result, index) => (
                  <tr key={index}>
                    <td>{result.game}</td>
                    <td className="player-cell">
                      <div className="player-info">
                        <span className="player-name">{result.batter.name}</span>
                        <span className="player-team">{result.batter.team}</span>
                        {result.batter.bats && (
                          <span className="player-hand">Bats: {result.batter.bats}</span>
                        )}
                      </div>
                    </td>
                    <td className="player-cell">
                      <div className="player-info">
                        <span className="player-name">{result.pitcher.name}</span>
                        <span className="player-team">{result.pitcher.team}</span>
                        {(result.pitcher.throwingArm || result.pitcher.ph) && (
                          <span className="player-hand">
                            Throws: {result.pitcher.throwingArm || result.pitcher.ph}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`advantage-cell ${getAdvantageClass(result.result.advantage)}`}>
                      <div className="advantage-value">
                        {result.result.advantage.toFixed(1)}
                      </div>
                      <div className="advantage-label">{result.result.advantageLabel}</div>
                    </td>
                    <td className={`potential-cell potential-${result.result.hitPotential.toLowerCase()}`}>
                      {result.result.hitPotential}
                    </td>
                    <td className={`potential-cell potential-${result.result.hrPotential.toLowerCase()}`}>
                      {result.result.hrPotential}
                    </td>
                    <td className={`potential-cell potential-${result.result.tbPotential.toLowerCase()}`}>
                      {result.result.tbPotential}
                    </td>
                    <td className={`potential-cell potential-${result.result.kPotential.toLowerCase()}`}>
                      {result.result.kPotential}
                    </td>
                    <td>
                      <pre className="betting-insights">
                        {result.explanation}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default MatchupAnalyzer;