import React, { useState, useEffect } from 'react';
import './MatchupResults.css';

/**
 * MatchupResults Component 
 * Displays analysis results in a tabbed interface with detailed statistics
 * 
 * @param {Array} results - Analysis results to display
 * @param {boolean} isVisible - Whether the results container is visible
 * @param {Function} onClose - Function to call when closing the results
 */
const MatchupResults = ({ results, isVisible, onClose }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  const [sortField, setSortField] = useState('advantage');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Organize results by game and pitcher when results change
  const [resultsByGame, setResultsByGame] = useState({});
  const [resultsByPitcher, setResultsByPitcher] = useState({});
  
  useEffect(() => {
    if (results.length > 0) {
      // Group by game
      const byGame = results.reduce((acc, result) => {
        if (!acc[result.gameId]) {
          acc[result.gameId] = {
            game: result.game,
            results: []
          };
        }
        acc[result.gameId].results.push(result);
        return acc;
      }, {});
      
      // Group by pitcher
      const byPitcher = results.reduce((acc, result) => {
        const pitcherId = `${result.pitcher.name}-${result.pitcher.team}`;
        if (!acc[pitcherId]) {
          acc[pitcherId] = {
            pitcher: result.pitcher,
            results: []
          };
        }
        acc[pitcherId].results.push(result);
        return acc;
      }, {});
      
      setResultsByGame(byGame);
      setResultsByPitcher(byPitcher);
    }
  }, [results]);
  
  // Filter and sort results based on current tab, search, and sort settings
  useEffect(() => {
    let filtered = [];
    
    // Get base results based on active tab
    if (activeTab === 'all') {
      filtered = [...results];
    } else if (activeTab.startsWith('game_')) {
      const gameId = activeTab.replace('game_', '');
      filtered = resultsByGame[gameId]?.results || [];
    } else if (activeTab.startsWith('pitcher_')) {
      const pitcherId = activeTab.replace('pitcher_', '');
      filtered = resultsByPitcher[pitcherId]?.results || [];
    }
    
    // Apply search filter if present
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(result => 
        result.batter.name.toLowerCase().includes(term) ||
        result.pitcher.name.toLowerCase().includes(term) ||
        result.game.toLowerCase().includes(term)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let valueA, valueB;
      
      // Extract values based on sort field
      switch (sortField) {
        case 'advantage':
          valueA = a.result.advantage;
          valueB = b.result.advantage;
          break;
        case 'hit':
          valueA = potentialToValue(a.result.hitPotential);
          valueB = potentialToValue(b.result.hitPotential);
          break;
        case 'hr':
          valueA = potentialToValue(a.result.hrPotential);
          valueB = potentialToValue(b.result.hrPotential);
          break;
        case 'tb':
          valueA = potentialToValue(a.result.tbPotential);
          valueB = potentialToValue(b.result.tbPotential);
          break;
        case 'k':
          valueA = potentialToValue(a.result.kPotential);
          valueB = potentialToValue(b.result.kPotential);
          break;
        case 'batterName':
          valueA = a.batter.name;
          valueB = b.batter.name;
          break;
        case 'pitcherName':
          valueA = a.pitcher.name;
          valueB = b.pitcher.name;
          break;
        default:
          valueA = a.result.advantage;
          valueB = b.result.advantage;
      }
      
      // Apply sort direction
      if (sortDirection === 'asc') {
        return typeof valueA === 'string' 
          ? valueA.localeCompare(valueB)
          : valueA - valueB;
      } else {
        return typeof valueA === 'string'
          ? valueB.localeCompare(valueA)
          : valueB - valueA;
      }
    });
    
    setFilteredResults(filtered);
  }, [activeTab, searchTerm, sortField, sortDirection, results, resultsByGame, resultsByPitcher]);
  
  // Helper to convert potential string to numeric value for sorting
  const potentialToValue = (potential) => {
    switch (potential) {
      case 'High': return 3;
      case 'Medium': return 2;
      case 'Low': return 1;
      default: return 0;
    }
  };
  
  // Toggle sort field and direction
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and reset direction to desc
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Get advantage styling class
  const getAdvantageClass = (advantage) => {
    if (advantage > 2) return 'strong-advantage';
    if (advantage > 1) return 'medium-advantage';
    if (advantage > 0.3) return 'slight-advantage';
    if (advantage > -0.3) return 'neutral';
    if (advantage > -1) return 'slight-disadvantage';
    if (advantage > -2) return 'medium-disadvantage';
    return 'strong-disadvantage';
  };
  
  // Get tab title for display
  const getTabTitle = () => {
    if (activeTab === 'all') {
      return 'All Matchups';
    } else if (activeTab.startsWith('game_')) {
      const gameId = activeTab.replace('game_', '');
      return `Game: ${resultsByGame[gameId]?.game}`;
    } else if (activeTab.startsWith('pitcher_')) {
      const pitcherId = activeTab.replace('pitcher_', '');
      const pitcher = resultsByPitcher[pitcherId]?.pitcher;
      return `Pitcher: ${pitcher?.name} (${pitcher?.team})`;
    }
    return '';
  };
  
  // Count advantageous matchups
  const getBatterAdvantageCount = () => {
    return filteredResults.filter(result => result.result.advantage > 0.3).length;
  };
  
  // Count pitcher advantage matchups
  const getPitcherAdvantageCount = () => {
    return filteredResults.filter(result => result.result.advantage < -0.3).length;
  };
  
  // Count neutral matchups
  const getNeutralCount = () => {
    return filteredResults.filter(result => 
      result.result.advantage >= -0.3 && result.result.advantage <= 0.3
    ).length;
  };
  
  // Count high HR potential
  const getHighHRCount = () => {
    return filteredResults.filter(result => result.result.hrPotential === 'High').length;
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="matchup-results-container">
      <div className="results-header">
        <h2>Matchup Analysis Results</h2>
        <div className="results-actions">
          <input
            type="text"
            placeholder="Search players, teams..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button className="close-results-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      
      <div className="results-tabs">
        {/* Main tabs (All, Games, Pitchers) */}
        <div className="main-tabs">
          <button 
            className={activeTab === 'all' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('all')}
          >
            All Matchups ({results.length})
          </button>
          
          <div className="tab-dropdown">
            <button className="tab-dropdown-btn">
              Games <span className="dropdown-arrow">▼</span>
            </button>
            <div className="tab-dropdown-content">
              {Object.keys(resultsByGame).map(gameId => (
                <button 
                  key={`game_${gameId}`}
                  className={activeTab === `game_${gameId}` ? 'dropdown-item active' : 'dropdown-item'}
                  onClick={() => setActiveTab(`game_${gameId}`)}
                >
                  {resultsByGame[gameId].game} ({resultsByGame[gameId].results.length})
                </button>
              ))}
            </div>
          </div>
          
          <div className="tab-dropdown">
            <button className="tab-dropdown-btn">
              Pitchers <span className="dropdown-arrow">▼</span>
            </button>
            <div className="tab-dropdown-content">
              {Object.keys(resultsByPitcher).map(pitcherId => (
                <button 
                  key={`pitcher_${pitcherId}`}
                  className={activeTab === `pitcher_${pitcherId}` ? 'dropdown-item active' : 'dropdown-item'}
                  onClick={() => setActiveTab(`pitcher_${pitcherId}`)}
                >
                  {resultsByPitcher[pitcherId].pitcher.name} ({resultsByPitcher[pitcherId].results.length})
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Sub tabs (Overview, Batters, Advantage, Props) */}
        <div className="sub-tabs">
          <button 
            className={activeSubTab === 'overview' ? 'sub-tab-btn active' : 'sub-tab-btn'}
            onClick={() => setActiveSubTab('overview')}
          >
            Overview
          </button>
          <button 
            className={activeSubTab === 'advantage' ? 'sub-tab-btn active' : 'sub-tab-btn'}
            onClick={() => setActiveSubTab('advantage')}
          >
            Advantage
          </button>
          <button 
            className={activeSubTab === 'props' ? 'sub-tab-btn active' : 'sub-tab-btn'}
            onClick={() => setActiveSubTab('props')}
          >
            Props Potential
          </button>
        </div>
      </div>
      
      <div className="results-content">
        <h3 className="tab-title">{getTabTitle()}</h3>
        
        {/* Overview Statistics */}
        {activeSubTab === 'overview' && (
          <div className="overview-stats">
            <div className="stat-card total-matchups">
              <div className="stat-value">{filteredResults.length}</div>
              <div className="stat-label">Total Matchups</div>
            </div>
            <div className="stat-card batter-advantage">
              <div className="stat-value">{getBatterAdvantageCount()}</div>
              <div className="stat-label">Batter Advantage</div>
            </div>
            <div className="stat-card pitcher-advantage">
              <div className="stat-value">{getPitcherAdvantageCount()}</div>
              <div className="stat-label">Pitcher Advantage</div>
            </div>
            <div className="stat-card neutral-matchups">
              <div className="stat-value">{getNeutralCount()}</div>
              <div className="stat-label">Neutral Matchups</div>
            </div>
            <div className="stat-card high-hr">
              <div className="stat-value">{getHighHRCount()}</div>
              <div className="stat-label">High HR Potential</div>
            </div>
          </div>
        )}
        
        {/* Results Table */}
        <div className="results-table-container">
          <table className="results-table">
            <thead>
              <tr>
                <th>Game</th>
                <th className={sortField === 'batterName' ? `sortable ${sortDirection}` : 'sortable'} 
                    onClick={() => handleSort('batterName')}>
                  Batter {sortField === 'batterName' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className={sortField === 'pitcherName' ? `sortable ${sortDirection}` : 'sortable'} 
                    onClick={() => handleSort('pitcherName')}>
                  Pitcher {sortField === 'pitcherName' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                </th>
                
                {activeSubTab !== 'props' && (
                  <th className={sortField === 'advantage' ? `sortable ${sortDirection}` : 'sortable'} 
                      onClick={() => handleSort('advantage')}>
                    Advantage {sortField === 'advantage' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                )}
                
                {(activeSubTab === 'props' || activeSubTab === 'overview') && (
                  <>
                    <th className={sortField === 'hit' ? `sortable ${sortDirection}` : 'sortable'} 
                        onClick={() => handleSort('hit')}>
                      Hit {sortField === 'hit' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                    </th>
                    <th className={sortField === 'hr' ? `sortable ${sortDirection}` : 'sortable'} 
                        onClick={() => handleSort('hr')}>
                      HR {sortField === 'hr' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                    </th>
                    <th className={sortField === 'tb' ? `sortable ${sortDirection}` : 'sortable'} 
                        onClick={() => handleSort('tb')}>
                      TB {sortField === 'tb' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                    </th>
                    <th className={sortField === 'k' ? `sortable ${sortDirection}` : 'sortable'} 
                        onClick={() => handleSort('k')}>
                      K {sortField === 'k' && <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                    </th>
                  </>
                )}
                
                {activeSubTab === 'advantage' && (
                  <th>Explanation</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredResults.length > 0 ? (
                filteredResults.map((result, index) => (
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
                    
                    {activeSubTab !== 'props' && (
                      <td className={`advantage-cell ${getAdvantageClass(result.result.advantage)}`}>
                        <div className="advantage-value">
                          {result.result.advantage.toFixed(1)}
                        </div>
                        <div className="advantage-label">{result.result.advantageLabel}</div>
                      </td>
                    )}
                    
                    {(activeSubTab === 'props' || activeSubTab === 'overview') && (
                      <>
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
                      </>
                    )}
                    
                    {activeSubTab === 'advantage' && (
                      <td className="explanation-cell">
                        {result.explanation}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={activeSubTab === 'advantage' ? 5 : 8} className="no-results">
                    No matchups found. Try adjusting your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MatchupResults;