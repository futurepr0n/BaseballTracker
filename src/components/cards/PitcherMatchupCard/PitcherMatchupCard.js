import React, { useState, useEffect, useCallback } from 'react';
import './PitcherMatchupCard.css';
import { createSafeId, positionTooltip, setupTooltipCloseHandler } from '../../utils/tooltipUtils';
import { useTeamFilter } from '../../TeamFilterContext'; // Import the team filter context

/**
 * PitcherMatchupCard - Displays pitcher matchup analysis
 */
const PitcherMatchupCard = ({ 
  pitcherMatchups,
  isLoading,
  currentDate 
}) => {

  // Get team filter context
  const { 
    selectedTeam, 
    includeMatchup, 
    matchupTeam,
    isFiltering
  } = useTeamFilter();


  // State variables for the pitcher matchup display
  const [selectedPitcherTeam, setSelectedPitcherTeam] = useState('ALL');
  const [allTeams, setAllTeams] = useState([]);
  const [filteredPitchers, setFilteredPitchers] = useState([]);
  const [pitcherSortMethod, setPitcherSortMethod] = useState('sameHanded');
  const [hiddenPitchers, setHiddenPitchers] = useState(new Set());
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [previousFilterState, setPreviousFilterState] = useState({ isFiltering, selectedTeam });

  // Handle team filter changes
  useEffect(() => {
    // Only run this effect if the filter state has changed
    if (isFiltering !== previousFilterState.isFiltering || 
        selectedTeam !== previousFilterState.selectedTeam) {
      
      // Store current filter state to compare in future renders
      setPreviousFilterState({ isFiltering, selectedTeam });
      
      if (isFiltering) {
        // If filtering is enabled, set the selected team in this component
        setSelectedPitcherTeam(selectedTeam);
        // Reset hidden pitchers when filter changes
        setHiddenPitchers(new Set());
      } else {
        // If filtering is disabled, reset to ALL TEAMS
        setSelectedPitcherTeam('ALL');
      }
    }
  }, [isFiltering, selectedTeam, previousFilterState]);

  // Set up available teams when pitcher data changes
  useEffect(() => {
    if (pitcherMatchups.allPitchersByTeam) {
      const teams = Object.keys(pitcherMatchups.allPitchersByTeam || {}).sort();
      setAllTeams(teams);
    }
  }, [pitcherMatchups]);

  // Close tooltips when date changes
  useEffect(() => {
    setActiveTooltip(null);
  }, [currentDate]);

  // Set up document-level click handler to close tooltips when clicking outside
  useEffect(() => {
    return setupTooltipCloseHandler(setActiveTooltip);
  }, []);

    useEffect(() => {
    // Only run this effect if the filter state has changed
    if (isFiltering !== previousFilterState.isFiltering || 
        selectedTeam !== previousFilterState.selectedTeam) {
      
      // Store current filter state to compare in future renders
      setPreviousFilterState({ isFiltering, selectedTeam });
      
      if (isFiltering) {
        // If filtering is enabled, set the selected team in this component
        setSelectedPitcherTeam(selectedTeam);
        // Reset hidden pitchers when filter changes
        setHiddenPitchers(new Set());
      } else {
        // If filtering is disabled, reset to ALL TEAMS
        setSelectedPitcherTeam('ALL');
      }
    }
  }, [isFiltering, selectedTeam, previousFilterState]);

  // Filter pitchers based on selected team, sort method, and hidden pitchers
  useEffect(() => {
    if (selectedPitcherTeam === 'ALL') {
      // For "All Teams," combine pitchers from all teams but limit to top 3 from each
      const limitedPitchers = [];
      Object.keys(pitcherMatchups.allPitchersByTeam || {}).forEach(team => {
        // If filtering is active, only include the selected team and matchup team
        if (!isFiltering || 
            team === selectedTeam || 
            (includeMatchup && team === matchupTeam)) {
          
          const teamPitchers = [...(pitcherMatchups.allPitchersByTeam[team] || [])];
          
          // Filter out hidden pitchers
          const visiblePitchers = teamPitchers.filter(p => !hiddenPitchers.has(createSafeId(p.name, p.team)));
          
          // Sort based on selected method
          if (pitcherSortMethod === 'sameHanded') {
            visiblePitchers.sort((a, b) => b.sameHandednessPercentage - a.sameHandednessPercentage);
          } else {
            visiblePitchers.sort((a, b) => b.oppositeHandednessPercentage - a.oppositeHandednessPercentage);
          }
          
          // Add top 3 pitchers from this team
          limitedPitchers.push(...visiblePitchers.slice(0, 3));
        }
      });
      
      // Final sort for the combined list
      if (pitcherSortMethod === 'sameHanded') {
        limitedPitchers.sort((a, b) => b.sameHandednessPercentage - a.sameHandednessPercentage);
      } else {
        limitedPitchers.sort((a, b) => b.oppositeHandednessPercentage - a.oppositeHandednessPercentage);
      }
      
      setFilteredPitchers(limitedPitchers);
    } else {
      // For a specific team, show all pitchers from that team
      const teamPitchers = [...(pitcherMatchups.allPitchersByTeam[selectedPitcherTeam] || [])];
      
      // Filter out hidden pitchers
      const visiblePitchers = teamPitchers.filter(p => !hiddenPitchers.has(createSafeId(p.name, p.team)));
      
      // Sort based on selected method
      if (pitcherSortMethod === 'sameHanded') {
        visiblePitchers.sort((a, b) => b.sameHandednessPercentage - a.sameHandednessPercentage);
      } else {
        visiblePitchers.sort((a, b) => b.oppositeHandednessPercentage - a.oppositeHandednessPercentage);
      }
      
      setFilteredPitchers(visiblePitchers);
    }
  }, [
    selectedPitcherTeam, 
    pitcherMatchups, 
    pitcherSortMethod, 
    hiddenPitchers, 
    isFiltering, 
    selectedTeam, 
    includeMatchup, 
    matchupTeam
  ]);

  // Helper to determine if a team button should be disabled
  const isTeamDisabled = useCallback((team) => {
    if (!isFiltering) return false;
    if (team === 'ALL') return false;
    return team !== selectedTeam && (!includeMatchup || team !== matchupTeam);
  }, [isFiltering, selectedTeam, includeMatchup, matchupTeam]);

  const handleTeamChange = (team) => {
    // Only allow changing to enabled teams
    if (!isTeamDisabled(team)) {
      setSelectedPitcherTeam(team);
      setActiveTooltip(null); // Close any open tooltips when changing teams
    }
  };

  // Helper function for toggling sort method
  const toggleSortMethod = (method) => {
    setPitcherSortMethod(method);
    setActiveTooltip(null); // Close any open tooltips when changing sort method
  };

  // Helper function to hide/remove a pitcher
  const hidePitcher = (pitcher) => {
    const pitcherId = createSafeId(pitcher.name, pitcher.team);
    setHiddenPitchers(prev => {
      const newSet = new Set(prev);
      newSet.add(pitcherId);
      return newSet;
    });
    setActiveTooltip(null); // Close any open tooltips when hiding a pitcher
  };

  // Helper function to restore all hidden pitchers
  const restoreAllPitchers = () => {
    setHiddenPitchers(new Set());
    setActiveTooltip(null); // Close any open tooltips when restoring pitchers
  };

  // Helper function to show/hide a tooltip
  const toggleTooltip = (pitcher, type) => {
    const safeId = createSafeId(pitcher.name, pitcher.team);
    const tooltipKey = `pitcher_${type}_${safeId}`;
    
    if (activeTooltip === tooltipKey) {
      setActiveTooltip(null);
    } else {
      setActiveTooltip(tooltipKey);
      
      // Position the tooltip
      positionTooltip(
        `.tooltip-${tooltipKey}`, 
        `[data-tooltip-id="${tooltipKey}"]`
      );
    }
  };

  return (
    <div className="card pitcher-matchup-card">
      <h3>Pitcher Matchup Analysis</h3>
      {isLoading ? (
        <div className="loading-indicator">Loading matchups...</div>
      ) : filteredPitchers.length > 0 ? (
        <>
          <div className="team-selector">
            <div 
              className={`team-button ${selectedTeam === 'ALL' ? 'active' : ''}`} 
              onClick={() => handleTeamChange('ALL')}
            >
              ALL TEAMS
            </div>
            {allTeams.map(team => (
              <div 
                key={team} 
                className={`team-button ${selectedTeam === team ? 'active' : ''}`} 
                onClick={() => handleTeamChange(team)}
              >
                {team}
              </div>
            ))}
          </div>
          
          <div className="matchup-actions">
            <div className="sort-toggle">
              <span>Sort by: </span>
              <button 
                className={`sort-button ${pitcherSortMethod === 'sameHanded' ? 'active' : ''}`} 
                onClick={() => toggleSortMethod('sameHanded')}
              >
                Favorable Matchups [Pitchers Advantage (Same Hand)]              </button>
              <button 
                className={`sort-button ${pitcherSortMethod === 'oppositeHanded' ? 'active' : ''}`} 
                onClick={() => toggleSortMethod('oppositeHanded')}
              >
                Tough Matchups [Hitters Advantage (Opposite Hand)]
              </button>
            </div>
            
            {hiddenPitchers.size > 0 && (
              <button className="restore-button" onClick={restoreAllPitchers}>
                Restore All Pitchers ({hiddenPitchers.size})
              </button>
            )}
          </div>
          
          <div className="pitchers-count">
            Showing {filteredPitchers.length} pitchers
            {selectedTeam !== 'ALL' ? ` for ${selectedTeam}` : ''}
            {hiddenPitchers.size > 0 ? ` (${hiddenPitchers.size} hidden)` : ''}
          </div>
          
          <div className="scrollable-container">
            <ul className="player-list">
              {filteredPitchers.map((pitcher, index) => {
                const safeId = createSafeId(pitcher.name, pitcher.team);
                
                return (
                  <li key={safeId} className="player-item pitcher-matchup-item">
                    <div className={`player-rank ${
                      pitcherSortMethod === 'sameHanded' 
                        ? pitcher.sameHandednessPercentage > 0.6 ? 'favorable' : 'neutral'
                        : pitcher.oppositeHandednessPercentage > 0.6 ? 'tough' : 'neutral'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="player-info">
                      <div className="player-name-row">
                        <span className="player-name">{pitcher.name}</span>
                        <button 
                          className="hide-pitcher-button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            hidePitcher(pitcher);
                          }} 
                          title="Remove pitcher"
                          aria-label="Remove pitcher"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="pitcher-details">
                        <span className="player-team">{pitcher.team}</span>
                        <span className="handedness-badge">
                          {pitcher.pitchingHand === 'L' ? 'LHP' : 'RHP'}
                        </span>
                        {pitcher.isEstimated && (
                          <span className="estimated-badge" title="Using estimated opposing lineup data">est</span>
                        )}
                      </div>
                    </div>
                    <div className="player-stat matchup-stats">
                      {/* Same-handed stats with tooltip */}
                      <div 
                        className={`matchup-stat ${pitcher.sameHandednessPercentage > 0.6 ? 'favorable' : ''} tooltip-container`}
                        data-tooltip-id={`pitcher_same_${safeId}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTooltip(pitcher, 'same');
                        }}
                      >
                        <span className="matchup-value">{(pitcher.sameHandednessPercentage * 100).toFixed(1)}%</span>
                        <span className="matchup-label">same hand</span>
                        <small>{pitcher.sameHandedBatters} of {pitcher.totalBatters}</small>
                      </div>
                      
                      {/* Opposite-handed stats with tooltip */}
                      <div 
                        className={`matchup-stat ${pitcher.oppositeHandednessPercentage > 0.6 ? 'tough' : ''} tooltip-container`}
                        data-tooltip-id={`pitcher_opposite_${safeId}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTooltip(pitcher, 'opposite');
                        }}
                      >
                        <span className="matchup-value">{(pitcher.oppositeHandednessPercentage * 100).toFixed(1)}%</span>
                        <span className="matchup-label">opposite</span>
                        <small>{pitcher.oppositeHandedBatters} of {pitcher.totalBatters}</small>
                      </div>
                      
                      <div className="opposing-team">
                        vs {pitcher.opposingTeam}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          
          {/* Tooltips rendered outside card to avoid clipping */}
          {activeTooltip && activeTooltip.startsWith('pitcher_same_') && (
            <>
              {filteredPitchers.map(pitcher => {
                const safeId = createSafeId(pitcher.name, pitcher.team);
                const tooltipKey = `pitcher_same_${safeId}`;
                
                if (activeTooltip === tooltipKey) {
                  return (
                    <div 
                      key={tooltipKey} 
                      className={`batter-tooltip tooltip-${tooltipKey}`}
                    >
                      <div className="tooltip-header">
                        <span>Same-handed batters vs {pitcher.name}</span>
                        <button 
                          className="close-tooltip" 
                          onClick={() => setActiveTooltip(null)}
                        >
                          ✕
                        </button>
                      </div>
                      {pitcher.sameHandedBattersList && pitcher.sameHandedBattersList.length > 0 ? (
                        <ul className="batter-list">
                          {pitcher.sameHandedBattersList.map((batter, idx) => (
                            <li key={idx} className="batter-item">
                              <span className="batter-name">{batter.name}</span>
                              <span className={`batter-hand ${batter.isSwitch ? 'switch' : ''}`}>
                                {batter.hand}
                                {batter.isSwitch && ' (Switch)'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="no-batters">No specific batter data available</p>
                      )}
                    </div>
                  );
                }
                return null;
              })}
            </>
          )}
          
          {activeTooltip && activeTooltip.startsWith('pitcher_opposite_') && (
            <>
              {filteredPitchers.map(pitcher => {
                const safeId = createSafeId(pitcher.name, pitcher.team);
                const tooltipKey = `pitcher_opposite_${safeId}`;
                
                if (activeTooltip === tooltipKey) {
                  return (
                    <div 
                      key={tooltipKey} 
                      className={`batter-tooltip tooltip-${tooltipKey}`}
                    >
                      <div className="tooltip-header">
                        <span>Opposite-handed batters vs {pitcher.name}</span>
                        <button 
                          className="close-tooltip" 
                          onClick={() => setActiveTooltip(null)}
                        >
                          ✕
                        </button>
                      </div>
                      {pitcher.oppositeHandedBattersList && pitcher.oppositeHandedBattersList.length > 0 ? (
                        <ul className="batter-list">
                          {pitcher.oppositeHandedBattersList.map((batter, idx) => (
                            <li key={idx} className="batter-item">
                              <span className="batter-name">{batter.name}</span>
                              <span className={`batter-hand ${batter.isSwitch ? 'switch' : ''}`}>
                                {batter.hand}
                                {batter.isSwitch && ' (Switch)'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="no-batters">No specific batter data available</p>
                      )}
                    </div>
                  );
                }
                return null;
              })}
            </>
          )}
          
          <div className="matchup-legend">
            <div className="legend-item">
              <div className="legend-color tough"></div>
              <span>Tough matchup (opposite-handed batters)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color favorable"></div>
              <span>Favorable matchup (same-handed batters)</span>
            </div>
            <div className="legend-item">
              <div className="legend-icon">👆</div>
              <span>Click percentages to see specific batters</span>
            </div>
          </div>
        </>
      ) : (
        <p className="no-data">
          {hiddenPitchers.size > 0 
            ? `All pitchers are hidden. Click "Restore All Pitchers" to show them.` 
            : `No pitcher matchup data available`}
        </p>
      )}
    </div>
  );
};

export default PitcherMatchupCard;