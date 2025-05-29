import React, { useState, useEffect, useCallback, Fragment } from 'react';
import './MatchupAnalyzer.css';
import { fetchRosterData } from '../services/dataService';
import { createEnhancedMatchupAnalyzer, analyzeEnhancedMatchup } from '../services/EnhancedMatchupAnalysis';
import Papa from 'papaparse';
import _ from 'lodash';

// Define the years of data you want to load
const DATA_YEARS = [2025, 2024, 2023, 2022];
const CURRENT_YEAR = Math.max(...DATA_YEARS);

/**
 * Enhanced Matchup Analyzer Component - With Comprehensive Multi-Dimensional Analysis
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
  
  // State for year selection
  const [activeYears, setActiveYears] = useState([...DATA_YEARS].sort((a, b) => b - a));
  
  // State for selected games and configured pitchers
  const [selectedGames, setSelectedGames] = useState({});
  const [gamePitchers, setGamePitchers] = useState({});
  const [analysisResults, setAnalysisResults] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // State for table functionality
  const [sortConfig, setSortConfig] = useState({ key: 'advantage', direction: 'desc' });
  const [filteredResults, setFilteredResults] = useState([]);
  const [removedResultIds, setRemovedResultIds] = useState(new Set());
  
  // Enhanced analyzer instance
  const [matchupAnalyzer, setMatchupAnalyzer] = useState(null);
  
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

  // Create enhanced analyzer when data is loaded
  useEffect(() => {
    if (hitterData.length > 0 && pitcherData.length > 0 && rosterData.length > 0 && activeYears.length > 0) {
      console.log('Creating enhanced matchup analyzer...');
      const analyzer = createEnhancedMatchupAnalyzer(hitterData, pitcherData, rosterData, activeYears);
      setMatchupAnalyzer(analyzer);
    }
  }, [hitterData, pitcherData, rosterData, activeYears]);
  
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
    setFilteredResults([]);
    setRemovedResultIds(new Set());
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

  // Enhanced name matching function
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

  // Find best match function
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

  // Sorting functionality
  const handleSort = (column) => {
    let direction = 'desc';
    if (sortConfig.key === column && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key: column, direction });
  };

  // Sort the results based on current sort config
  const getSortedResults = () => {
    const resultsToSort = analysisResults.filter(result => !removedResultIds.has(result.id));
    
    if (!sortConfig.key) return resultsToSort;

    return [...resultsToSort].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'advantage':
          aValue = a.result.advantage;
          bValue = b.result.advantage;
          break;
        case 'hit':
          aValue = getPotentialValue(a.result.hitPotential);
          bValue = getPotentialValue(b.result.hitPotential);
          break;
        case 'hr':
          aValue = getPotentialValue(a.result.hrPotential);
          bValue = getPotentialValue(b.result.hrPotential);
          break;
        case 'tb':
          aValue = getPotentialValue(a.result.tbPotential);
          bValue = getPotentialValue(b.result.tbPotential);
          break;
        case 'k':
          aValue = getPotentialValue(a.result.kPotential);
          bValue = getPotentialValue(b.result.kPotential);
          break;
        case 'batter':
          aValue = a.batter.name;
          bValue = b.batter.name;
          break;
        case 'pitcher':
          aValue = a.pitcher.name;
          bValue = b.pitcher.name;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortConfig.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  // Helper function to convert potential ratings to numeric values for sorting
  const getPotentialValue = (potential) => {
    switch (potential) {
      case 'High': return 3;
      case 'Medium': return 2;
      case 'Low': return 1;
      default: return 0;
    }
  };

  // Remove a result row
  const removeResult = (resultId) => {
    setRemovedResultIds(prev => new Set([...prev, resultId]));
  };

  // Clear all removed results
  const clearRemovedResults = () => {
    setRemovedResultIds(new Set());
  };

  // Enhanced analysis using the new system
  const runAnalysis = async () => {
    console.log("Starting enhanced analysis...");
    setIsAnalyzing(true);
    setAnalysisResults([]);
    setRemovedResultIds(new Set());
    
    if (!matchupAnalyzer) {
      console.error("Enhanced analyzer not ready");
      setIsAnalyzing(false);
      return;
    }
    
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
          
          awayBatters.forEach((batter, index) => {
            matchups.push({
              id: `${gameIndex}-home-${index}`,
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
          
          homeBatters.forEach((batter, index) => {
            matchups.push({
              id: `${gameIndex}-away-${index}`,
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
      // Process each matchup using enhanced analysis
      const results = matchups.map(matchup => {
        const analysis = matchupAnalyzer.analyzeComprehensiveMatchup(matchup.batter, matchup.pitcher);
        
        return {
          ...matchup,
          result: analysis,
          explanation: generateEnhancedExplanation(analysis, matchup.batter, matchup.pitcher)
        };
      });
      
      setAnalysisResults(results);
    } catch (error) {
      console.error("Error analyzing matchups:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Enhanced explanation generator
  const generateEnhancedExplanation = (analysis, batter, pitcher) => {
    const { advantageLabel, hitPotential, hrPotential, tbPotential, kPotential, details } = analysis;
    
    let explanation = `🎯 **${advantageLabel}**\n\n`;
    
    // Hit Analysis
    explanation += `**Hit Potential: ${hitPotential}**\n`;
    explanation += `• Predicted Batting Average: ${details.predictedBA}\n`;
    explanation += `• Expected hit rate: ${(parseFloat(details.predictedBA) * 100).toFixed(1)}%\n`;
    
    if (details.analysisBreakdown) {
      if (details.analysisBreakdown.handedness) {
        const handAdvantage = details.analysisBreakdown.handedness;
        if (handAdvantage > 0.3) {
          explanation += `• Handedness favors batter (${batter.bats || 'R'} vs ${pitcher.throwingArm || pitcher.ph || 'R'})\n`;
        } else if (handAdvantage < -0.3) {
          explanation += `• Handedness favors pitcher (${batter.bats || 'R'} vs ${pitcher.throwingArm || pitcher.ph || 'R'})\n`;
        }
      }
    }
    
    explanation += `\n💣 **Home Run Potential: ${hrPotential}**\n`;
    explanation += `• Predicted HR Rate: ${(parseFloat(details.predictedHR) * 100).toFixed(1)}%\n`;
    explanation += `• Expects 1 HR every ~${Math.round(1 / parseFloat(details.predictedHR))} at-bats\n`;
    
    explanation += `\n📊 **Total Bases Potential: ${tbPotential}**\n`;
    explanation += `• Predicted Slugging: ${details.predictedSLG}\n`;
    explanation += `• Predicted wOBA: ${details.predictedWOBA}\n`;
    
    explanation += `\n⚾ **Strikeout Risk: ${kPotential}**\n`;
    explanation += `• Predicted K Rate: ${(parseFloat(details.strikeoutRate) * 100).toFixed(1)}%\n`;
    
    // Arsenal information if available
    if (details.pitcherArsenal && details.pitcherArsenal.length > 0) {
      explanation += `\n🎨 **Pitcher Arsenal:**\n`;
      details.pitcherArsenal.slice(0, 3).forEach(pitch => {
        explanation += `• ${pitch.type}: ${pitch.avgSpeed.toFixed(1)} mph (${(pitch.usage * 100).toFixed(1)}% usage)\n`;
      });
    }
    
    explanation += `\n📈 **Analysis Quality:**\n`;
    explanation += `• Confidence Level: ${(details.confidence * 100).toFixed(0)}%\n`;
    explanation += `• Years Used: ${details.yearsUsed}\n`;
    
    if (details.analysisBreakdown) {
      const breakdown = details.analysisBreakdown;
      explanation += `• Analysis Components:\n`;
      if (breakdown.direct) explanation += `  - Direct matchup data\n`;
      if (breakdown.sameHanded) explanation += `  - Same-handed pitcher context\n`;
      if (breakdown.oppositeHanded) explanation += `  - Opposite-handed pitcher context\n`;
      if (breakdown.overall) explanation += `  - Overall league context\n`;
      if (breakdown.arsenal) explanation += `  - Pitcher arsenal analysis\n`;
    }
    
    return explanation;
  };

  const canRunAnalysis = () => {
    const hasSelectedGames = Object.values(selectedGames).some(isSelected => isSelected);
    const hasPitcherConfigured = Object.keys(gamePitchers).length > 0;
    
    return hasSelectedGames && hasPitcherConfigured && !isAnalyzing && !isLoadingRoster && !isLoadingCSV && activeYears.length > 0 && matchupAnalyzer;
  };

  // Get the current sorted results
  const sortedResults = getSortedResults();
  const removedCount = removedResultIds.size;

  // Get sort direction indicator
  const getSortIcon = (column) => {
    if (sortConfig.key !== column) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
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

  // Export results functionality
  const exportAnalysisResults = () => {
    const exportData = analysisResults.map(result => ({
      Game: result.game,
      Batter: result.batter.name,
      BatterTeam: result.batter.team,
      BatterHand: result.batter.bats,
      Pitcher: result.pitcher.name,
      PitcherTeam: result.pitcher.team,
      PitcherHand: result.pitcher.throwingArm || result.pitcher.ph,
      Advantage: result.result.advantage.toFixed(2),
      AdvantageLabel: result.result.advantageLabel,
      HitPotential: result.result.hitPotential,
      HRPotential: result.result.hrPotential,
      TBPotential: result.result.tbPotential,
      KPotential: result.result.kPotential,
      PredictedBA: result.result.details.predictedBA,
      PredictedHR: result.result.details.predictedHR,
      PredictedSLG: result.result.details.predictedSLG,
      PredictedWOBA: result.result.details.predictedWOBA,
      StrikeoutRate: result.result.details.strikeoutRate,
      Confidence: (result.result.details.confidence * 100).toFixed(0) + '%'
    }));
    
    // Convert to CSV and download
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enhanced-matchup-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="matchup-analyzer">
      <header className="analyzer-header">
        <h2>Enhanced Matchup Analyzer</h2>
        <p className="date">{formattedDate}</p>
        <div className="analyzer-status">
          {matchupAnalyzer ? (
            <span className="status-ready">✅ Enhanced Analysis Ready</span>
          ) : (
            <span className="status-loading">⏳ Loading Enhanced Analysis...</span>
          )}
        </div>
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
            className="analyze-btn enhanced"
            onClick={runAnalysis}
            disabled={!canRunAnalysis()}
            title={!matchupAnalyzer ? "Enhanced analyzer loading..." : "Run comprehensive multi-dimensional analysis"}
          >
            {isAnalyzing ? (
              <>
                <div className="spinner"></div>
                Analyzing Enhanced Matchups...
              </>
            ) : (
              '🚀 Run Enhanced Analysis'
            )}
          </button>
          <button className="clear-btn" onClick={resetSelections}>
            Clear All
          </button>
          {analysisResults.length > 0 && (
            <button className="export-btn" onClick={exportAnalysisResults}>
              📊 Export Results
            </button>
          )}
        </div>
      </section>
      
      {analysisResults.length > 0 && (
        <section className="results-section">
          <div className="results-header">
            <h3>Enhanced Matchup Analysis Results</h3>
            <div className="results-stats">
              <span className="total-results">
                {sortedResults.length} of {analysisResults.length} matchups shown
              </span>
              {removedCount > 0 && (
                <button 
                  className="restore-btn"
                  onClick={clearRemovedResults}
                  title="Restore all removed results"
                >
                  Restore {removedCount} removed
                </button>
              )}
            </div>
          </div>
          
          {/* Year Selection */}
          <div className="analysis-years-control enhanced">
            <div className="years-header">
              <span className="years-label">📊 Analysis Years (Successfully Loaded: {activeYears.join(', ')}):</span>
              <span className="data-summary">
                ({hitterData.length} hitter records, {pitcherData.length} pitcher records)
              </span>
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
                      } else {
                        if (activeYears.length > 1) {
                          setActiveYears(prev => prev.filter(y => y !== yearVal));
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
                  ✅ Enhanced analysis ready with multi-dimensional matchup data
                </span>
              )}
            </div>
          </div>
          
          <div className="enhanced-results-table-container">
            <table className="enhanced-results-table">
              <thead>
                <tr>
                  <th className="remove-column">Remove</th>
                  <th className="game-column">Game</th>
                  <th 
                    className="sortable-column player-column" 
                    onClick={() => handleSort('batter')}
                  >
                    Batter {getSortIcon('batter')}
                  </th>
                  <th 
                    className="sortable-column player-column" 
                    onClick={() => handleSort('pitcher')}
                  >
                    Pitcher {getSortIcon('pitcher')}
                  </th>
                  <th 
                    className="sortable-column advantage-column" 
                    onClick={() => handleSort('advantage')}
                  >
                    Advantage {getSortIcon('advantage')}
                  </th>
                  <th 
                    className="sortable-column potential-column" 
                    onClick={() => handleSort('hit')}
                  >
                    Hit {getSortIcon('hit')}
                  </th>
                  <th 
                    className="sortable-column potential-column" 
                    onClick={() => handleSort('hr')}
                  >
                    HR {getSortIcon('hr')}
                  </th>
                  <th 
                    className="sortable-column potential-column" 
                    onClick={() => handleSort('tb')}
                  >
                    TB {getSortIcon('tb')}
                  </th>
                  <th 
                    className="sortable-column potential-column" 
                    onClick={() => handleSort('k')}
                  >
                    K {getSortIcon('k')}
                  </th>
                  <th className="stats-column">Enhanced Stats</th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((result) => (
                  <React.Fragment key={result.id}>
                    {/* Main data row */}
                    <tr className="result-row main-row">
                      <td className="remove-cell">
                        <button 
                          className="remove-result-btn"
                          onClick={() => removeResult(result.id)}
                          title="Remove this result"
                        >
                          ×
                        </button>
                      </td>
                      <td className="game-cell">
                        <span className="game-text">{result.game}</span>
                      </td>
                      <td className="player-cell">
                        <div className="player-info-compact">
                          <span className="player-name-compact">{result.batter.name}</span>
                          <div className="player-details-compact">
                            <span className="player-team-compact">{result.batter.team}</span>
                            {result.batter.bats && (
                              <span className="player-hand-compact">B: {result.batter.bats}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="player-cell">
                        <div className="player-info-compact">
                          <span className="player-name-compact">{result.pitcher.name}</span>
                          <div className="player-details-compact">
                            <span className="player-team-compact">{result.pitcher.team}</span>
                            {(result.pitcher.throwingArm || result.pitcher.ph) && (
                              <span className="player-hand-compact">
                                T: {result.pitcher.throwingArm || result.pitcher.ph}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={`advantage-cell-compact ${getAdvantageClass(result.result.advantage)}`}>
                        <div className="advantage-value-compact">
                          {result.result.advantage.toFixed(1)}
                        </div>
                        <div className="advantage-label-compact">{result.result.advantageLabel}</div>
                      </td>
                      <td className={`potential-cell-compact potential-${result.result.hitPotential.toLowerCase()}`}>
                        {result.result.hitPotential}
                      </td>
                      <td className={`potential-cell-compact potential-${result.result.hrPotential.toLowerCase()}`}>
                        {result.result.hrPotential}
                      </td>
                      <td className={`potential-cell-compact potential-${result.result.tbPotential.toLowerCase()}`}>
                        {result.result.tbPotential}
                      </td>
                      <td className={`potential-cell-compact potential-${result.result.kPotential.toLowerCase()}`}>
                        {result.result.kPotential}
                      </td>
                      <td className="stats-cell-compact enhanced">
                        <div className="enhanced-stats-compact">
                          <div className="stat-row">
                            <span className="stat-label">BA:</span>
                            <span className="stat-value">{result.result.details.predictedBA}</span>
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">HR:</span>
                            <span className="stat-value">{(parseFloat(result.result.details.predictedHR) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">SLG:</span>
                            <span className="stat-value">{result.result.details.predictedSLG}</span>
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">wOBA:</span>
                            <span className="stat-value">{result.result.details.predictedWOBA}</span>
                          </div>
                          <div className="stat-row">
                            <span className="stat-label">K:</span>
                            <span className="stat-value">{(parseFloat(result.result.details.strikeoutRate) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="stat-row confidence">
                            <span className="stat-label">Conf:</span>
                            <span className="stat-value">{(result.result.details.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Enhanced Details row - spans the entire width */}
                    <tr className="result-row details-row enhanced">
                      <td className="details-full-span" colSpan="10">
                        <div className="enhanced-analysis-breakdown">
                          <div className="breakdown-grid">
                            <div className="breakdown-card hit-analysis">
                              <div className="breakdown-header">
                                <span className="breakdown-icon">🎯</span>
                                <span className="breakdown-title">Hit Analysis: {result.result.hitPotential}</span>
                              </div>
                              <div className="breakdown-body">
                                <p>Predicted BA: <strong>{result.result.details.predictedBA}</strong></p>
                                <p>Hit Rate: <strong>{(parseFloat(result.result.details.predictedBA) * 100).toFixed(1)}%</strong></p>
                                {result.result.details.analysisBreakdown?.handedness && (
                                  <p className="handedness-note">
                                    Handedness: {result.result.details.analysisBreakdown.handedness > 0 ? '✅ Favors Batter' : '❌ Favors Pitcher'}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="breakdown-card hr-analysis">
                              <div className="breakdown-header">
                                <span className="breakdown-icon">💣</span>
                                <span className="breakdown-title">HR Analysis: {result.result.hrPotential}</span>
                              </div>
                              <div className="breakdown-body">
                                <p>HR Rate: <strong>{(parseFloat(result.result.details.predictedHR) * 100).toFixed(1)}%</strong></p>
                                <p>Expected: <strong>1 HR per {Math.round(1 / parseFloat(result.result.details.predictedHR))} AB</strong></p>
                              </div>
                            </div>
                            
                            <div className="breakdown-card power-analysis">
                              <div className="breakdown-header">
                                <span className="breakdown-icon">📊</span>
                                <span className="breakdown-title">Power: {result.result.tbPotential}</span>
                              </div>
                              <div className="breakdown-body">
                                <p>SLG: <strong>{result.result.details.predictedSLG}</strong></p>
                                <p>wOBA: <strong>{result.result.details.predictedWOBA}</strong></p>
                              </div>
                            </div>
                            
                            <div className="breakdown-card strikeout-analysis">
                              <div className="breakdown-header">
                                <span className="breakdown-icon">⚾</span>
                                <span className="breakdown-title">K Risk: {result.result.kPotential}</span>
                              </div>
                              <div className="breakdown-body">
                                <p>K Rate: <strong>{(parseFloat(result.result.details.strikeoutRate) * 100).toFixed(1)}%</strong></p>
                              </div>
                            </div>
                            
                            {result.result.details.pitcherArsenal && result.result.details.pitcherArsenal.length > 0 && (
                              <div className="breakdown-card arsenal-analysis">
                                <div className="breakdown-header">
                                  <span className="breakdown-icon">🎨</span>
                                  <span className="breakdown-title">Pitcher Arsenal</span>
                                </div>
                                <div className="breakdown-body">
                                  {result.result.details.pitcherArsenal.slice(0, 3).map((pitch, index) => (
                                    <p key={index}>
                                      <strong>{pitch.type}:</strong> {pitch.avgSpeed.toFixed(1)} mph ({(pitch.usage * 100).toFixed(1)}%)
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="breakdown-card confidence-analysis">
                              <div className="breakdown-header">
                                <span className="breakdown-icon">📈</span>
                                <span className="breakdown-title">Analysis Quality</span>
                              </div>
                              <div className="breakdown-body">
                                <p>Confidence: <strong>{(result.result.details.confidence * 100).toFixed(0)}%</strong></p>
                                <p>Years: <strong>{result.result.details.yearsUsed}</strong></p>
                                {result.result.details.analysisBreakdown && (
                                  <div className="analysis-components">
                                    <p><strong>Components Used:</strong></p>
                                    <ul>
                                      {result.result.details.analysisBreakdown.direct && <li>✅ Direct matchup</li>}
                                      {result.result.details.analysisBreakdown.sameHanded && <li>✅ Same-handed context</li>}
                                      {result.result.details.analysisBreakdown.oppositeHanded && <li>✅ Opposite-handed context</li>}
                                      {result.result.details.analysisBreakdown.overall && <li>✅ League context</li>}
                                      {result.result.details.analysisBreakdown.arsenal && <li>✅ Arsenal analysis</li>}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      
      {/* Enhanced Analysis Info Panel */}
      <section className="analysis-info-panel">
        <h3>🚀 Enhanced Analysis Features</h3>
        <div className="info-grid">
          <div className="info-card">
            <h4>📊 Multi-Dimensional Analysis</h4>
            <ul>
              <li>Direct batter vs pitcher matchups</li>
              <li>Same-handed pitcher context</li>
              <li>Opposite-handed pitcher context</li>
              <li>Overall league baseline</li>
            </ul>
          </div>
          <div className="info-card">
            <h4>⚖️ Weighted Historical Data</h4>
            <ul>
              <li>2025 data: 4x weight</li>
              <li>2024 data: 2x weight</li>
              <li>2023 data: 1x weight</li>
              <li>2022 data: 0.5x weight</li>
            </ul>
          </div>
          <div className="info-card">
            <h4>🎯 Active Player Focus</h4>
            <ul>
              <li>Only analyzes current 2025 players</li>
              <li>Uses their full historical data</li>
              <li>Eliminates irrelevant matchups</li>
              <li>Higher prediction accuracy</li>
            </ul>
          </div>
          <div className="info-card">
            <h4>🎨 Arsenal Integration</h4>
            <ul>
              <li>Actual pitch mix analysis</li>
              <li>Velocity considerations</li>
              <li>Usage rate adjustments</li>
              <li>Pitch-specific advantages</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

export default MatchupAnalyzer;