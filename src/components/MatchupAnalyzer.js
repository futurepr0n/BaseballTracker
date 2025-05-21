import React, { useState, useEffect, useCallback } from 'react';
import './MatchupAnalyzer.css';
import { fetchRosterData } from '../services/dataService';

/**
 * Matchup Analyzer Component
 * Analyzes all batter-pitcher matchups for selected games
 */
function MatchupAnalyzer({ gameData, playerData, teamData, currentDate }) {
  // State for data
  const [rosterData, setRosterData] = useState([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(true);
  
  // State for selected games and configured pitchers
  const [selectedGames, setSelectedGames] = useState({});
  const [gamePitchers, setGamePitchers] = useState({});
  const [analysisResults, setAnalysisResults] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [currentMatchup, setCurrentMatchup] = useState(null);
  
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
        // Use the fetchRosterData function
        const roster = await fetchRosterData();
        console.log(`Loaded ${roster.length} players from roster data`);
        setRosterData(roster);
        
        // Initialize selected games using array indices as keys
        // This ensures we have reliable keys that match the gameData array
        const gameSelections = {};
        gameData.forEach((game, index) => {
          gameSelections[index] = true; // Use index as the key
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
  
  // Get all available pitchers for a team
  const getPitchersForTeam = useCallback((teamCode) => {
    if (!rosterData || !teamCode) return [];
    
    // Filter pitchers from roster data
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
    
    // Filter hitters from roster data
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

  // Show matchup analysis modal
  const showMatchupDetails = (batter, pitcher) => {
    setCurrentMatchup({ batter, pitcher });
    setShowAnalysisModal(true);
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
    
    console.log(`Selected games: ${selectedGameIndices.length}`);
    
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
    
    // We would integrate with BatterPitcherMatchup.js analysis here
    // For now, we'll use a simplified analysis to demonstrate the concept
    // In a real implementation, you'd import and use functions from BatterPitcherMatchup.js
    
    try {
      // Process each matchup
      const results = matchups.map(matchup => {
        // Analyze the matchup - in a real implementation, call into BatterPitcherMatchup.js
        const analysis = mockAnalyzeMatchup(matchup.batter, matchup.pitcher);
        
        return {
          ...matchup,
          result: analysis,
          explanation: mockGetExplanation(analysis)
        };
      });
      
      // Sort by strongest batter advantage
      results.sort((a, b) => b.result.advantage - a.result.advantage);
      
      // Update state with results
      setAnalysisResults(results);
    } catch (error) {
      console.error("Error analyzing matchups:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Mock analysis function (would use BatterPitcherMatchup.js in real implementation)
  const mockAnalyzeMatchup = (batter, pitcher) => {
    // Basic advantage calculation based on handedness
    let handednessAdvantage = 0;
    
    // Check if we have handedness data
    if (batter.bats && (pitcher.throwingArm || pitcher.ph)) {
      const pitcherHand = pitcher.throwingArm || pitcher.ph;
      
      // Switch hitters generally have advantage
      if (batter.bats === 'B') {
        handednessAdvantage = 1.5;
      }
      // Same-handed matchup (typically pitcher advantage)
      // L vs L or R vs R
      else if (batter.bats === pitcherHand) {
        handednessAdvantage = -1.2;
      }
      // Opposite-handed matchup (typically batter advantage)
      // L vs R or R vs L
      else {
        handednessAdvantage = 1.2;
      }
    }
    
    // Add some randomization for varied results
    const randomFactor = (Math.random() * 2 - 1) * 0.8;
    const advantage = handednessAdvantage + randomFactor;
    
    // Return a result object (similar to what BatterPitcherMatchup would return)
    return {
      advantage,
      advantageLabel: getAdvantageLabel(advantage),
      hitPotential: getPotentialRating(advantage, 0),
      hrPotential: getPotentialRating(advantage, -0.8),
      tbPotential: getPotentialRating(advantage, -0.3),
      kPotential: getPotentialRating(-advantage, -0.2),
      details: {
        predictedBA: Math.min(0.350, Math.max(0.180, 0.250 + advantage * 0.04)).toFixed(3),
        predictedHR: Math.min(0.080, Math.max(0.010, 0.030 + advantage * 0.01)).toFixed(3),
        predictedSLG: Math.min(0.600, Math.max(0.300, 0.420 + advantage * 0.06)).toFixed(3),
        predictedWOBA: Math.min(0.450, Math.max(0.280, 0.340 + advantage * 0.05)).toFixed(3),
        strikeoutRate: Math.min(0.40, Math.max(0.10, 0.22 - advantage * 0.03)).toFixed(3)
      }
    };
  };
  
  // Helper function to get advantage label
  const getAdvantageLabel = (advantage) => {
    if (advantage > 2) return 'Strong Batter Advantage';
    if (advantage > 1) return 'Batter Advantage';
    if (advantage > 0.3) return 'Slight Batter Advantage';
    if (advantage > -0.3) return 'Neutral Matchup';
    if (advantage > -1) return 'Slight Pitcher Advantage';
    if (advantage > -2) return 'Pitcher Advantage';
    return 'Strong Pitcher Advantage';
  };
  
  // Helper function to get potential rating
  const getPotentialRating = (advantage, adjustment = 0) => {
    const adjustedAdvantage = advantage + adjustment;
    
    if (adjustedAdvantage > 1.5) return 'High';
    if (adjustedAdvantage > 0) return 'Medium';
    return 'Low';
  };
  
  // Helper function to get explanation text
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
    `;
  };

  // Get advantage class for styling
  const getAdvantageClass = (advantage) => {
    if (advantage > 2) return 'strong-advantage';
    if (advantage > 1) return 'medium-advantage';
    if (advantage > 0.3) return 'slight-advantage';
    if (advantage > -0.3) return 'neutral';
    if (advantage > -1) return 'slight-disadvantage';
    if (advantage > -2) return 'medium-disadvantage';
    return 'strong-disadvantage';
  };

  // Function to determine if run analysis button should be enabled
  const canRunAnalysis = () => {
    // Check if any games are selected
    const hasSelectedGames = Object.values(selectedGames).some(isSelected => isSelected);
    
    // Check if at least one pitcher is configured
    const hasPitcherConfigured = Object.keys(gamePitchers).length > 0;
    
    return hasSelectedGames && hasPitcherConfigured && !isAnalyzing && !isLoadingRoster;
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