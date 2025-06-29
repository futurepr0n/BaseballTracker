import React, { useState, useEffect, useCallback } from 'react';
import './PitcherMatchupCard.css';
import { createSafeId } from '../../utils/tooltipUtils';
import { useTeamFilter } from '../../TeamFilterContext';
import { useTooltip } from '../../utils/TooltipContext';
import PitcherArsenalDisplay from '../PitcherArsenalDisplay/PitcherArsenalDisplay';

/**
 * PitcherMatchupCard - Displays pitcher matchup analysis with arsenal details
 */
const PitcherMatchupCard = ({ 
  pitcherMatchups,
  isLoading,
  currentDate,
  teams = {}
}) => {

  // Get team filter context
  const { 
    selectedTeam, 
    includeMatchup, 
    matchupTeam,
    isFiltering
  } = useTeamFilter();

  // Get tooltip context
  const { openTooltip } = useTooltip();

  // State variables for the pitcher matchup display
  const [selectedPitcherTeam, setSelectedPitcherTeam] = useState('ALL');
  const [allTeams, setAllTeams] = useState([]);
  const [filteredPitchers, setFilteredPitchers] = useState([]);
  const [pitcherSortMethod, setPitcherSortMethod] = useState('sameHanded');
  const [hiddenPitchers, setHiddenPitchers] = useState(new Set());
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

  // Get team logo function
  const getTeamLogo = (teamCode) => {
    if (!teams[teamCode]) return null;
    return teams[teamCode].logoUrl || `/data/logos/${teamCode.toLowerCase()}_logo.png`;
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

  // Tooltip handler using GlobalTooltip system
  const handleBatterGroupClick = useCallback((event, pitcher, handType) => {
    const safeId = createSafeId(pitcher.name, pitcher.team);
    const tooltipId = `pitcher_matchup_${safeId}_${handType}`;
    
    openTooltip(tooltipId, event.currentTarget, {
      type: 'pitcher_matchup',
      pitcher: pitcher,
      handType: handType
    });
  }, [openTooltip]);

  // Loading state
  if (isLoading) {
    return (
      <div className="pitcher-matchup-card">
        <div className="glass-card-container">
          <div className="glass-header">
            <h2 className="card-title">Pitcher Matchup Analysis</h2>
          </div>
          <div className="scrollable-container">
            <div className="loading-indicator">
              <div className="flex items-center gap-3">
                <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-gray-600 rounded-full"></div>
                <p className="text-gray-600">Loading pitcher matchup data...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pitcher-matchup-card">
      <div className="glass-card-container">
        {/* Glass Header */}
        <div className="glass-header">
          <div className="dashboard-header">
            <div className="header-content">
              <div className="header-icon">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="header-text">
                <h2 className="text-xl font-bold text-gray-900">Pitcher Matchup Analysis</h2>
                <p className="text-sm text-gray-600">
                  Arsenal analysis and handedness advantages
                </p>
              </div>
            </div>
          </div>

          {/* Team Selector */}
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
          
          {/* Matchup Actions */}
          <div className="matchup-actions">
            <div className="sort-toggle">
              <span>Sort by: </span>
              <button 
                className={`sort-button ${pitcherSortMethod === 'sameHanded' ? 'active' : ''}`} 
                onClick={() => toggleSortMethod('sameHanded')}
              >
                Favorable Matchups
              </button>
              <button 
                className={`sort-button ${pitcherSortMethod === 'oppositeHanded' ? 'active' : ''}`} 
                onClick={() => toggleSortMethod('oppositeHanded')}
              >
                Tough Matchups
              </button>
            </div>
            
            {hiddenPitchers.size > 0 && (
              <button className="restore-button" onClick={restoreAllPitchers}>
                Restore All ({hiddenPitchers.size})
              </button>
            )}
          </div>
          
          {/* Pitchers Count */}
          <div className="pitchers-count">
            Showing {filteredPitchers.length} pitchers
            {selectedPitcherTeam !== 'ALL' ? ` for ${selectedPitcherTeam}` : ''}
            {hiddenPitchers.size > 0 ? ` (${hiddenPitchers.size} hidden)` : ''}
          </div>
        </div>

        {filteredPitchers && filteredPitchers.length > 0 ? (
          <>
            {/* Scrollable Container */}
            <div className="scrollable-container">
                <ul className="player-list">
                  {filteredPitchers.map((pitcher, index) => {
                    const safeId = createSafeId(pitcher.name, pitcher.team);
                    const isExpanded = expandedPitchers.has(safeId);
                    
                    return (
                      <li key={safeId} className={`player-item pitcher-matchup-item ${isExpanded ? 'expanded' : ''}`}>
                        <div className="pitcher-main-row">
                          <div className={`player-rank ${getMatchupClass(pitcher)}`}>
                            {getTeamLogo(pitcher.team) && (
                              <>
                                <img 
                                  src={getTeamLogo(pitcher.team)} 
                                  alt="" 
                                  className="rank-logo"
                                  loading="lazy"
                                  aria-hidden="true"
                                />
                                <div className="rank-overlay"></div>
                              </>
                            )}
                            <span className="rank-number">{index + 1}</span>
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
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('SAME HAND CLICKED:', pitcher.name, 'Event:', e);
                                handleBatterGroupClick(e, pitcher, 'same');
                              }}
                              style={{ 
                                cursor: 'pointer',
                                zIndex: 10,
                                pointerEvents: 'auto',
                                position: 'relative'
                              }}
                            >
                              <span className="matchup-value">{Math.round(pitcher.sameHandednessPercentage * 100)}%</span>
                              <span className="matchup-label">same hand</span>
                            </div>
                            
                            <div 
                              className={`matchup-stat ${pitcher.oppositeHandednessPercentage > 60 ? 'tough' : ''}`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('OPPOSITE HAND CLICKED:', pitcher.name, 'Event:', e);
                                handleBatterGroupClick(e, pitcher, 'opposite');
                              }}
                              style={{ 
                                cursor: 'pointer',
                                zIndex: 10,
                                pointerEvents: 'auto',
                                position: 'relative'
                              }}
                            >
                              <span className="matchup-value">{Math.round(pitcher.oppositeHandednessPercentage * 100)}%</span>
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
              
              {/* Footer */}
              <div className="dashboard-footer">
                <div className="footer-content">
                  <div className="footer-legend">
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
                </div>
              </div>
          </>
        ) : (
        <div className="scrollable-container">
          <div className="no-data">
            {hiddenPitchers.size > 0 
              ? `All pitchers are hidden. Click "Restore All Pitchers" to show them.` 
              : `No pitcher matchup data available`}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default PitcherMatchupCard;