import React, { useState, useEffect, useCallback } from 'react';
import './PitcherMatchupCard.css';
import { createSafeId, positionTooltip, setupTooltipCloseHandler } from '../../utils/tooltipUtils';
import { useTeamFilter } from '../../TeamFilterContext';
import PitcherArsenalDisplay from '../PitcherArsenalDisplay/PitcherArsenalDisplay';

/**
 * PitcherMatchupCard - Displays pitcher matchup analysis with arsenal details
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
  const [expandedPitchers, setExpandedPitchers] = useState(new Set()); // New state for arsenal expansion

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

  // Set up teams list
  useEffect(() => {
    if (pitcherMatchups && pitcherMatchups.allPitchersByTeam) {
      const teams = ['ALL', ...Object.keys(pitcherMatchups.allPitchersByTeam).sort()];
      setAllTeams(teams);
    }
  }, [pitcherMatchups]);

  // Filter and sort pitchers based on selection
  useEffect(() => {
    if (!pitcherMatchups || !pitcherMatchups.allPitchersByTeam) {
      setFilteredPitchers([]);
      return;
    }

    let filteredTeams = [];
    
    // Determine which teams to show based on filter state
    if (isFiltering) {
      filteredTeams = [selectedTeam];
      if (includeMatchup && matchupTeam && matchupTeam !== selectedTeam) {
        filteredTeams.push(matchupTeam);
      }
    } else if (selectedPitcherTeam === 'ALL') {
      filteredTeams = Object.keys(pitcherMatchups.allPitchersByTeam);
    } else {
      filteredTeams = [selectedPitcherTeam];
    }

    // Collect pitchers from filtered teams
    if (selectedPitcherTeam === 'ALL' && !isFiltering) {
      // For ALL teams view, show top 3 from each team
      const limitedPitchers = [];
      
      Object.keys(pitcherMatchups.allPitchersByTeam).sort().forEach(team => {
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
      });
      
      // Final sort for the combined list
      if (pitcherSortMethod === 'sameHanded') {
        limitedPitchers.sort((a, b) => b.sameHandednessPercentage - a.sameHandednessPercentage);
      } else {
        limitedPitchers.sort((a, b) => b.oppositeHandednessPercentage - a.oppositeHandednessPercentage);
      }
      
      setFilteredPitchers(limitedPitchers);
    } else {
      // For specific team(s), collect all pitchers
      const allFilteredPitchers = [];
      
      filteredTeams.forEach(team => {
        const teamPitchers = [...(pitcherMatchups.allPitchersByTeam[team] || [])];
        allFilteredPitchers.push(...teamPitchers);
      });
      
      // Filter out hidden pitchers
      const visiblePitchers = allFilteredPitchers.filter(p => !hiddenPitchers.has(createSafeId(p.name, p.team)));
      
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

  // Helper to determine if a pitcher is favorable or tough based on sort method
  const getMatchupClass = (pitcher) => {
    if (pitcherSortMethod === 'sameHanded') {
      return pitcher.sameHandednessPercentage > 60 ? 'favorable' : 
             pitcher.sameHandednessPercentage < 40 ? 'tough' : 'neutral';
    } else {
      return pitcher.oppositeHandednessPercentage > 60 ? 'tough' : 
             pitcher.oppositeHandednessPercentage < 40 ? 'favorable' : 'neutral';
    }
  };

  // Team selection handler
  const handleTeamChange = useCallback((team) => {
    if (!isFiltering) {
      setSelectedPitcherTeam(team);
    }
  }, [isFiltering]);

  // Sort method toggle
  const toggleSortMethod = useCallback((method) => {
    setPitcherSortMethod(method);
  }, []);

  // Hide a pitcher
  const hidePitcher = useCallback((pitcherId) => {
    setHiddenPitchers(prev => new Set(prev).add(pitcherId));
  }, []);

  // Restore all hidden pitchers
  const restoreAllPitchers = useCallback(() => {
    setHiddenPitchers(new Set());
  }, []);

  // Toggle pitcher arsenal expansion
  const togglePitcherExpanded = useCallback((pitcherId) => {
    setExpandedPitchers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pitcherId)) {
        newSet.delete(pitcherId);
      } else {
        newSet.add(pitcherId);
      }
      return newSet;
    });
  }, []);

  // Tooltip handlers
  const showTooltip = useCallback((event, pitcher, handType) => {
    const tooltipId = `${createSafeId(pitcher.name, pitcher.team)}_${handType}`;
    
    // If clicking the same tooltip, hide it
    if (activeTooltip === tooltipId) {
      setActiveTooltip(null);
      return;
    }
    
    setActiveTooltip(tooltipId);
    
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      const tooltip = document.getElementById(tooltipId);
      if (tooltip) {
        positionTooltip(event, tooltip);
        
        // Set up click outside handler
        setupTooltipCloseHandler(tooltip, () => {
          setActiveTooltip(null);
        });
      }
    }, 10);
  }, [activeTooltip]);

  // Loading state
  if (isLoading) {
    return (
      <div className="pitcher-matchup-card">
        <h2 className="card-title">Pitcher Matchup Analysis</h2>
        <p>Loading pitcher matchup data...</p>
      </div>
    );
  }

  return (
    <div className="pitcher-matchup-card">
      <h2 className="card-title">Pitcher Matchup Analysis</h2>
      
      {filteredPitchers && filteredPitchers.length > 0 ? (
        <>
          <div className="team-selector">
            {allTeams.map(team => (
              <div 
                key={team} 
                className={`team-item ${selectedPitcherTeam === team ? 'active' : ''} ${isFiltering ? 'disabled' : ''}`} 
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
                Favorable Matchups [Pitchers Advantage (Same Hand)]
              </button>
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
            {selectedPitcherTeam !== 'ALL' ? ` for ${selectedPitcherTeam}` : ''}
            {hiddenPitchers.size > 0 ? ` (${hiddenPitchers.size} hidden)` : ''}
          </div>
          
          <div className="scrollable-container">
            <ul className="player-list">
              {filteredPitchers.map((pitcher, index) => {
                const safeId = createSafeId(pitcher.name, pitcher.team);
                const isExpanded = expandedPitchers.has(safeId);
                
                return (
                  <li key={safeId} className={`player-item pitcher-matchup-item ${isExpanded ? 'expanded' : ''}`}>
                    <div className="pitcher-main-row">
                      <div className={`player-rank ${getMatchupClass(pitcher)}`}>
                        {index + 1}
                      </div>
                      
                      <div className="player-info">
                        <div className="player-name-container">
                          <span className="player-name">{pitcher.name}</span>
                          <span className="player-team">{pitcher.team}</span>
                          {pitcher.estimated && <span className="estimated-badge">EST</span>}
                          <button
                            className="hide-pitcher-button"
                            onClick={() => hidePitcher(safeId)}
                            title="Hide this pitcher"
                          >
                            ✕
                          </button>
                        </div>
                        
                        <div className="pitcher-details">
                          <span className="handedness-badge">{pitcher.hand}</span>
                          {pitcher.pitches && pitcher.pitches.length > 0 && (
                            <span className="pitch-count">{pitcher.pitches.length} pitches</span>
                          )}
                          <button
                            className="arsenal-toggle-btn"
                            onClick={() => togglePitcherExpanded(safeId)}
                            aria-label={isExpanded ? 'Hide arsenal' : 'Show arsenal'}
                          >
                            {isExpanded ? '▼' : '▶'} Arsenal
                          </button>
                        </div>
                        
                        <span className="opposing-team">vs {pitcher.opposingTeam}</span>
                      </div>
                      
                      <div className="matchup-stats">
                        <div 
                          className={`matchup-stat ${pitcher.sameHandednessPercentage > 60 ? 'favorable' : ''}`}
                          onClick={(e) => showTooltip(e, pitcher, 'same')}
                        >
                          <span className="matchup-value">{pitcher.sameHandednessPercentage}%</span>
                          <span className="matchup-label">same hand</span>
                        </div>
                        
                        <div 
                          className={`matchup-stat ${pitcher.oppositeHandednessPercentage > 60 ? 'tough' : ''}`}
                          onClick={(e) => showTooltip(e, pitcher, 'opposite')}
                        >
                          <span className="matchup-value">{pitcher.oppositeHandednessPercentage}%</span>
                          <span className="matchup-label">opposite hand</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Arsenal display when expanded */}
                    {isExpanded && (
                      <div className="pitcher-arsenal-container">
                        <PitcherArsenalDisplay
                          pitcher={{
                            name: pitcher.name,
                            fullName: pitcher.fullName || pitcher.name,
                            team: pitcher.team,
                            pitches: pitcher.pitches
                          }}
                          opponentBatters={pitcher.opposingBattersList || []}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          
          {/* Hidden Tooltips - for batter lists */}
          {filteredPitchers.map(pitcher => {
            const safeId = createSafeId(pitcher.name, pitcher.team);
            const sameTooltipId = `${safeId}_same`;
            const oppositeTooltipId = `${safeId}_opposite`;
            
            return (
              <React.Fragment key={safeId}>
                {/* Same Hand Tooltip */}
                {activeTooltip === sameTooltipId && (
                  <div id={sameTooltipId} className="batter-tooltip">
                    <div className="tooltip-header">
                      <span>Same-Handed Batters ({pitcher.sameHandedBattersList?.length || 0})</span>
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
                )}
                
                {/* Opposite Hand Tooltip */}
                {activeTooltip === oppositeTooltipId && (
                  <div id={oppositeTooltipId} className="batter-tooltip">
                    <div className="tooltip-header">
                      <span>Opposite-Handed Batters ({pitcher.oppositeHandedBattersList?.length || 0})</span>
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
                )}
              </React.Fragment>
            );
          })}
          
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