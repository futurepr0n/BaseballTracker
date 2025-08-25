import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTeamFilter } from '../../TeamFilterContext';
import hrCombinationService from './HRCombinationService';
import { debugLog } from '../../../utils/debugConfig';
import '../GlassCard/GlassCard.css';
import './HRCombinationTrackerCard.css';

const HRCombinationTrackerCard = ({ gameData, playerData, currentDate }) => {
  const [combinations, setCombinations] = useState([]);
  const [filteredCombinations, setFilteredCombinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupSize, setGroupSize] = useState(3);
  const [stats, setStats] = useState(null);
  const [scheduledPlayers, setScheduledPlayers] = useState([]);
  const [showAllResults, setShowAllResults] = useState(false);
  const [selectedCombination, setSelectedCombination] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailTooltip, setShowDetailTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [playerSearch, setPlayerSearch] = useState('');
  
  const { selectedTeam, matchupTeam, includeMatchup, getTeamName, shouldIncludePlayer } = useTeamFilter();

  // Player search filtering function
  const filterCombinationsByPlayer = useCallback((combinations, searchTerm) => {
    if (!searchTerm.trim()) {
      debugLog.card('HRCombinationTracker', '🔍 No search term, returning all combinations:', combinations?.length || 0);
      return combinations || [];
    }
    
    if (!combinations || !Array.isArray(combinations)) {
      debugLog.card('HRCombinationTracker', '🔍 No valid combinations array provided:', combinations);
      return [];
    }
    
    const normalizedSearch = searchTerm.toLowerCase().trim();
    debugLog.card('HRCombinationTracker', '🔍 Filtering with normalized search:', normalizedSearch);
    
    const filtered = combinations.filter(combo => {
      if (!combo || !combo.players || !Array.isArray(combo.players)) {
        debugLog.card('HRCombinationTracker', '🔍 Invalid combo structure:', combo);
        return false;
      }
      
      // Check if any player in the combination matches the search
      const hasMatch = combo.players.some(player => {
        const playerName = player.name || '';
        const normalizedPlayerName = playerName.toLowerCase();
        
        // Split player name into first and last name for flexible matching
        const nameParts = normalizedPlayerName.split(' ');
        const firstNameMatches = nameParts.some(part => part.startsWith(normalizedSearch));
        
        // Also check if full name contains the search term
        const fullNameContains = normalizedPlayerName.includes(normalizedSearch);
        
        const matches = firstNameMatches || fullNameContains;
        
        if (matches) {
          debugLog.card('HRCombinationTracker', `🔍 Found match: "${playerName}" matches search "${searchTerm}"`);
        }
        
        return matches;
      });
      
      return hasMatch;
    });
    
    debugLog.card('HRCombinationTracker', '🔍 Filtering complete:', {
      originalCount: combinations.length,
      filteredCount: filtered.length,
      searchTerm
    });
    
    return filtered;
  }, []);

  // Apply player search filter when search term changes
  useEffect(() => {
    debugLog.card('HRCombinationTracker', 'Player search filter triggered', {
      searchTerm: playerSearch,
      combinationsCount: combinations?.length || 0,
      combinationsSample: combinations?.[0]?.players?.map(p => p.name) || 'none'
    });
    
    const filtered = filterCombinationsByPlayer(combinations, playerSearch);
    debugLog.card('HRCombinationTracker', 'Filter result', {
      originalCount: combinations?.length || 0,
      filteredCount: filtered?.length || 0,
      searchTerm: playerSearch
    });
    
    setFilteredCombinations(filtered);
    setStats(hrCombinationService.getCombinationStats(filtered));
  }, [combinations, playerSearch, filterCombinationsByPlayer]);

  const loadCombinationData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      debugLog.card('HRCombinationTracker', `Loading HR combinations for group size: ${groupSize}`);
      
      // Load combinations directly from pre-generated data
      const rawCombinations = await hrCombinationService.analyzeHRCombinations([], groupSize, showAllResults);
      
      debugLog.card('HRCombinationTracker', `Loaded ${rawCombinations.length} combinations for group size ${groupSize}`);
      
      // Apply team filtering if active using standardized pattern
      let filteredCombinations = rawCombinations;
      if (selectedTeam || includeMatchup) {
        debugLog.card('HRCombinationTracker', 'Applying team filter', {
          selectedTeam,
          includeMatchup,
          matchupTeam
        });
        
        // Debug: Show sample combination before filtering
        if (rawCombinations.length > 0) {
          const sample = rawCombinations[0];
          debugLog.card('HRCombinationTracker', 'Sample before filtering', {
            players: sample.players.map(p => `${p.name} (${p.team})`),
            playersTeams: sample.players.map(p => p.team)
          });
        }
        
        filteredCombinations = hrCombinationService.filterCombinationsByTeam(
          rawCombinations,
          shouldIncludePlayer
        );
        debugLog.card('HRCombinationTracker', `After filtering: ${filteredCombinations.length} combinations`);
        
        // Debug: Show sample combination after filtering
        if (filteredCombinations.length > 0) {
          const sample = filteredCombinations[0];
          debugLog.card('HRCombinationTracker', 'Sample after filtering', {
            players: sample.players.map(p => `${p.name} (${p.team})`)
          });
        }
      }
      
      setCombinations(filteredCombinations);
      setFilteredCombinations(filteredCombinations);
      setStats(hrCombinationService.getCombinationStats(filteredCombinations));
      
      // Set a dummy scheduled players count for display
      setScheduledPlayers([{ name: 'Sample', team: 'MLB' }]);
      
    } catch (err) {
      console.error('🚀 Error loading HR combination data:', err);
      debugLog.error('HRCombinationTracker', 'Failed to load combination data', err);
      setError('Failed to load combination data');
    } finally {
      setLoading(false);
    }
  }, [groupSize, selectedTeam, includeMatchup, shouldIncludePlayer, showAllResults]);

  useEffect(() => {
    loadCombinationData();
  }, [loadCombinationData]);

  const handleGroupSizeChange = (newSize) => {
    setGroupSize(newSize);
  };

  const handleCombinationClick = (combination, event) => {
    debugLog.card('HRCombinationTracker', 'Combination clicked', {
      combination: combination?.players?.length || 0,
      windowWidth: window.innerWidth
    });
    
    // Check if mobile view (typically < 768px)
    const isMobile = window.innerWidth < 768;
    debugLog.card('HRCombinationTracker', `Device type: ${isMobile ? 'mobile' : 'desktop'}`);
    
    setSelectedCombination(combination);
    
    if (isMobile) {
      // Mobile: Show modal
      debugLog.card('HRCombinationTracker', 'Showing mobile modal');
      setShowModal(true);
    } else {
      // Desktop: Show centered modal (like mobile but with different styling)
      debugLog.card('HRCombinationTracker', 'Showing desktop modal');
      setShowDetailTooltip(true);
    }
  };

  const handleCloseTooltip = () => {
    setShowDetailTooltip(false);
    setSelectedCombination(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCombination(null);
  };

  // Close tooltip when clicking outside
  const handleDocumentClick = useCallback((e) => {
    if (showDetailTooltip && !e.target.closest('.combination-detail-tooltip') && !e.target.closest('.combination-item')) {
      handleCloseTooltip();
    }
  }, [showDetailTooltip]);

  useEffect(() => {
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [handleDocumentClick]);

  const formatPlayerNames = (players) => {
    return players.map(p => `${p.name} (${p.team})`).join(', ');
  };

  const formatPlayerNamesWithTeamHighlight = (players) => {
    return players.map(p => {
      const isSelectedTeam = selectedTeam === p.team || (includeMatchup && matchupTeam === p.team);
      return {
        text: `${p.name} (${p.team})`,
        isHighlighted: isSelectedTeam,
        team: p.team
      };
    });
  };

  const getTeamContext = () => {
    if (!selectedTeam) return null;
    
    const teamName = getTeamName(selectedTeam);
    const matchupName = matchupTeam ? getTeamName(matchupTeam) : null;
    
    return {
      teamName,
      matchupName,
      includeMatchup,
      description: includeMatchup && matchupName 
        ? `${teamName} vs ${matchupName} matchup context`
        : `${teamName} team focus`
    };
  };

  const teamContext = getTeamContext();

  return (
    <div className="card hr-combination-tracker-card glass-card glass-fade-in">
      <div className="card-header">
        <h3>🚀 HR Combination Tracker</h3>
        <div className="card-subtitle">
          Historical analysis: Groups of {groupSize} players who have all hit HRs on the same days (2025 season)
        </div>
        
        {teamContext && (
          <div className="team-context-banner">
            <span className="context-icon">🎯</span>
            <span className="context-text">{teamContext.description}</span>
            <span className="context-help">Showing combinations with players from selected team(s)</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="combination-controls">
        {/* Player Search */}
        <div className="player-search-controls">
          <label className="control-label">Search Player:</label>
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Enter first or last name..."
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              disabled={loading}
              className="player-search-input"
            />
            {playerSearch && (
              <button 
                className="clear-search-button"
                onClick={() => setPlayerSearch('')}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
          {playerSearch && (
            <div className="control-hint">
              Showing combinations containing "{playerSearch}"
            </div>
          )}
        </div>
        
        {/* Group Size Controls */}
        <div className="group-size-controls">
          <label className="control-label">Group Size:</label>
          <div className="size-buttons">
            {[2, 3, 4].map(size => (
              <button
                key={size}
                className={`size-button ${groupSize === size ? 'active' : ''}`}
                onClick={() => handleGroupSizeChange(size)}
                disabled={loading}
              >
                {size} Players
              </button>
            ))}
          </div>
        </div>
        
        {/* Show All Toggle */}
        <div className="show-all-controls">
          <label className="control-label">
            <input
              type="checkbox"
              checked={showAllResults}
              onChange={(e) => setShowAllResults(e.target.checked)}
              disabled={loading}
            />
            Show All Results
          </label>
          <div className="control-hint">
            {showAllResults ? 'Showing all combinations' : 'Showing top 50 combinations'}
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      {stats && !loading && (
        <div className="combination-stats">
          <div className="stat-item">
            <span className="stat-value">{stats.totalCombinations}</span>
            <span className="stat-label">Total Combinations</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.averageOccurrences}</span>
            <span className="stat-label">Avg Occurrences</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.recentCombinations}</span>
            <span className="stat-label">Recent (7 days)</span>
          </div>
          {stats.mostFrequent && (
            <div className="stat-item featured">
              <span className="stat-value">{stats.mostFrequent.occurrences}</span>
              <span className="stat-label">Most Frequent</span>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <div className="combinations-content">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <div className="loading-text">
              Analyzing {groupSize}-player HR combinations across the season...
            </div>
          </div>
        ) : error ? (
          <div className="error-state">
            <span className="error-icon">⚠️</span>
            <div className="error-message">{error}</div>
            <button className="retry-button" onClick={loadCombinationData}>
              Try Again
            </button>
          </div>
        ) : !filteredCombinations || filteredCombinations.length === 0 ? (
          <div className="no-combinations">
            <span className="info-icon">🔍</span>
            <div className="info-message">
              {playerSearch ? (
                <>No {groupSize}-player combinations found containing "{playerSearch}"</>
              ) : (
                <>No {groupSize}-player combinations found where all players hit HRs on the same day</>
              )}
              {teamContext && (
                <><br />with {teamContext.description.toLowerCase()}</>
              )}
            </div>
          </div>
        ) : (
          <div className="glass-scrollable">
            <div className="sticky-header">
              {filteredCombinations.length} Historical HR Combinations Found
              {playerSearch && (
                <span className="search-filter-note"> (filtered for "{playerSearch}")</span>
              )}
              {!showAllResults && !playerSearch && <span className="result-limit-note"> (limited to top 50 - use "Show All" for complete results)</span>}
            </div>
            
            {filteredCombinations && filteredCombinations.length > 0 && filteredCombinations.map((combo, index) => {
              if (!combo || !combo.players) {
                console.warn('🔍 Invalid combo data at index', index, combo);
                return null;
              }
              
              return (
                <div 
                  key={combo.combinationKey || `combo-${index}`} 
                  className="glass-player-item combination-item clickable-item"
                  onClick={(e) => handleCombinationClick(combo, e)}
                  title="Click to view occurrence details"
                >
                <div className="combination-header">
                  <div className="combination-rank">#{index + 1}</div>
                  <div className="combination-frequency">
                    <span className="frequency-count">{combo.occurrences}</span>
                    <span className="frequency-label">times</span>
                  </div>
                </div>
                
                <div className="combination-players">
                  <div className="player-names">
                    {teamContext ? (
                      <div className="player-names-highlighted">
                        {formatPlayerNamesWithTeamHighlight(combo.players).map((player, idx) => (
                          <span 
                            key={idx}
                            className={`player-name ${player.isHighlighted ? 'highlighted-team' : ''}`}
                            title={player.isHighlighted ? `${player.team} matches selected team filter` : ''}
                          >
                            {player.text}
                            {idx < combo.players.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                    ) : (
                      formatPlayerNames(combo.players)
                    )}
                  </div>
                  <div className="combination-details">
                    <span className="total-hrs">{combo.totalHRs} total HRs</span>
                    <span className="last-occurrence">
                      Last: {combo.lastOccurrence} ({combo.daysSinceLastOccurrence} days ago)
                    </span>
                  </div>
                </div>
                
                {/* Show recent indicator */}
                {combo.daysSinceLastOccurrence <= 7 && (
                  <div className="recent-indicator">🔥 Recent</div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="card-footer">
        <div className="footer-stats">
          <span className="data-info">
            Data from 2025 season analysis ({filteredCombinations.length} combinations shown)
          </span>
          {playerSearch && (
            <span className="filter-info">
              • Filtered by player search: "{playerSearch}"
            </span>
          )}
          {teamContext && (
            <span className="filter-info">
              • Filtered by {teamContext.description.toLowerCase()}
            </span>
          )}
        </div>
      </div>

      {/* Mobile Modal for HR Combination Details */}
      {showModal && selectedCombination && createPortal(
        <div className="modal-overlay mobile-modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🚀 HR Combination Details</h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <span>✕</span>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="combination-detail-content">
                <div className="combination-summary">
                  <div className="detail-players">
                    <h4>👥 Players ({selectedCombination.players.length})</h4>
                    <div className="player-grid">
                      {selectedCombination.players.map((player, idx) => {
                        // Try multiple data sources for season HRs (season_hrs is primary from accurate script)
                        const seasonHRs = player.season_hrs || 
                                         selectedCombination.playerHRDetails?.[idx]?.season_hrs || 
                                         player.seasonHRs ||
                                         player.homeRuns || 
                                         player.HR ||
                                         'N/A';
                        
                        return (
                          <div key={idx} className="detail-player-card">
                            <div className="player-name">{player.name}</div>
                            <div className="player-team">({player.team})</div>
                            <div className="player-hrs">🏠 {seasonHRs} season HRs</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="combination-stats-summary">
                    <h4>📊 Season Statistics</h4>
                    <div className="stats-grid">
                      <div className="stat-card">
                        <div className="stat-value">{selectedCombination.occurrences}</div>
                        <div className="stat-label">Times Together</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{selectedCombination.seasonTotalHRs || selectedCombination.totalHRs}</div>
                        <div className="stat-label">Combined Season HRs</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{selectedCombination.averageHRsPerGame || selectedCombination.averageHRs}</div>
                        <div className="stat-label">Avg HRs per Game</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{Math.abs(selectedCombination.daysSinceLastOccurrence)}</div>
                        <div className="stat-label">Days Since Last</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="occurrence-timeline">
                  <h4>📅 When These Players Hit HRs Together</h4>
                  <div className="timeline-chart">
                    <div className="timeline-header">
                      <span>Game</span>
                      <span>Date</span>
                      <span>Days Ago</span>
                    </div>
                    <div className="timeline-dates">
                      {selectedCombination.dates.map((date, idx) => {
                        const gameDate = new Date(date);
                        const daysAgo = Math.floor((new Date() - gameDate) / (1000 * 60 * 60 * 24));
                        return (
                          <div key={idx} className="timeline-row">
                            <div className="occurrence-number">#{idx + 1}</div>
                            <div className="date-label">
                              {gameDate.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="days-ago">
                              {daysAgo === 0 ? 'Today' : 
                               daysAgo === 1 ? 'Yesterday' : 
                               `${daysAgo} days ago`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="timeline-summary">
                    <div className="summary-item">
                      <strong>First Time:</strong> {new Date(selectedCombination.dates[0]).toLocaleDateString()}
                    </div>
                    <div className="summary-item">
                      <strong>Most Recent:</strong> {new Date(selectedCombination.lastOccurrence).toLocaleDateString()}
                    </div>
                    <div className="summary-item">
                      <strong>Frequency:</strong> {selectedCombination.occurrences} times in {Math.floor((new Date(selectedCombination.lastOccurrence) - new Date(selectedCombination.dates[0])) / (1000 * 60 * 60 * 24))} days
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        , document.body
      )}

      {/* Desktop Modal for HR Combination Details */}
      {showDetailTooltip && selectedCombination && createPortal(
        <div className="modal-overlay desktop-modal-overlay" onClick={handleCloseTooltip}>
          <div className="modal-content desktop-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🚀 HR Combination Details</h3>
              <button className="modal-close" onClick={handleCloseTooltip}>
                <span>✕</span>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="combination-detail-content">
                <div className="combination-summary">
                  <div className="detail-players">
                    <h4>👥 Players ({selectedCombination.players.length})</h4>
                    <div className="player-grid">
                      {selectedCombination.players.map((player, idx) => {
                        // Try multiple data sources for season HRs (season_hrs is primary from accurate script)
                        const seasonHRs = player.season_hrs || 
                                         selectedCombination.playerHRDetails?.[idx]?.season_hrs || 
                                         player.seasonHRs ||
                                         player.homeRuns || 
                                         player.HR ||
                                         'N/A';
                        
                        return (
                          <div key={idx} className="detail-player-card">
                            <div className="player-name">{player.name}</div>
                            <div className="player-team">({player.team})</div>
                            <div className="player-hrs">🏠 {seasonHRs} season HRs</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="combination-stats-summary">
                    <h4>📊 Season Statistics</h4>
                    <div className="stats-grid">
                      <div className="stat-card">
                        <div className="stat-value">{selectedCombination.occurrences}</div>
                        <div className="stat-label">Times Together</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{selectedCombination.seasonTotalHRs || selectedCombination.totalHRs}</div>
                        <div className="stat-label">Combined Season HRs</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{selectedCombination.averageHRsPerGame || selectedCombination.averageHRs}</div>
                        <div className="stat-label">Avg HRs per Game</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{Math.abs(selectedCombination.daysSinceLastOccurrence)}</div>
                        <div className="stat-label">Days Since Last</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="occurrence-timeline">
                  <h4>📅 When These Players Hit HRs Together</h4>
                  <div className="timeline-chart">
                    <div className="timeline-header">
                      <span>Game</span>
                      <span>Date</span>
                      <span>Days Ago</span>
                    </div>
                    <div className="timeline-dates">
                      {selectedCombination.dates.map((date, idx) => {
                        const gameDate = new Date(date);
                        const daysAgo = Math.floor((new Date() - gameDate) / (1000 * 60 * 60 * 24));
                        return (
                          <div key={idx} className="timeline-row">
                            <div className="occurrence-number">#{idx + 1}</div>
                            <div className="date-label">
                              {gameDate.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="days-ago">
                              {daysAgo === 0 ? 'Today' : 
                               daysAgo === 1 ? 'Yesterday' : 
                               `${daysAgo} days ago`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="timeline-summary">
                    <div className="summary-item">
                      <strong>First Time:</strong> {new Date(selectedCombination.dates[0]).toLocaleDateString()}
                    </div>
                    <div className="summary-item">
                      <strong>Most Recent:</strong> {new Date(selectedCombination.lastOccurrence).toLocaleDateString()}
                    </div>
                    <div className="summary-item">
                      <strong>Frequency:</strong> {selectedCombination.occurrences} times in {Math.floor((new Date(selectedCombination.lastOccurrence) - new Date(selectedCombination.dates[0])) / (1000 * 60 * 60 * 24))} days
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        , document.body
      )}
    </div>
  );
};

export default HRCombinationTrackerCard;