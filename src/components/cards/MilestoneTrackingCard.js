import React, { useState, useEffect, useRef } from 'react';
import { useTeamFilter } from '../TeamFilterContext';
import { usePlayerScratchpad } from '../../contexts/PlayerScratchpadContext';
import SimpleDesktopScratchpadIcon from '../common/SimpleDesktopScratchpadIcon';
import { initializeCollapsibleGlass } from '../../utils/collapsibleGlass';
import '../../styles/CollapsibleGlass.css';
import './MilestoneTrackingCard.css';

const MilestoneTrackingCard = ({ currentDate }) => {
  const [milestoneData, setMilestoneData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHeatLevel, setSelectedHeatLevel] = useState('ALL');
  const [selectedStat, setSelectedStat] = useState('ALL');
  const [sortBy, setSortBy] = useState('urgency'); // urgency, timeline, player
  
  const { shouldIncludePlayer, isFiltering } = useTeamFilter();
  const { filterEnabled: scratchpadFilterEnabled } = usePlayerScratchpad();
  const headerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const loadMilestoneData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Format date for file name
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Try to load specific date file first
        let response = await fetch(`/data/predictions/milestone_tracking_${dateStr}.json`);
        
        // If not found, try latest
        if (!response.ok) {
          response = await fetch('/data/predictions/milestone_tracking_latest.json');
        }
        
        if (!response.ok) {
          throw new Error('No milestone data available');
        }
        
        const data = await response.json();
        setMilestoneData(data);
      } catch (err) {
        console.error('Error loading milestone data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadMilestoneData();
  }, [currentDate, scratchpadFilterEnabled]);

  // Initialize collapsible functionality
  useEffect(() => {
    console.log('🔍 MilestoneTrackingCard: useEffect running for collapsible initialization');
    console.log('🔍 HeaderRef:', headerRef.current);
    console.log('🔍 ContainerRef:', containerRef.current);
    
    if (headerRef.current && containerRef.current) {
      console.log('🔍 Both refs available, initializing collapsible...');
      const cleanup = initializeCollapsibleGlass(
        headerRef.current, 
        containerRef.current,
        'milestone-tracking-card'
      );
      return cleanup;
    } else {
      console.log('🔍 Refs not ready yet, will try again...');
    }
  }, [milestoneData]); // Add milestoneData as dependency to ensure it runs after data loads

  const filterMilestones = () => {
    if (!milestoneData || !milestoneData.milestones) return [];
    
    let filtered = milestoneData.milestones;
    
    // Apply team filter
    if (isFiltering) {
      filtered = filtered.filter(m => {
        const playerName = m.player || m.playerName || '';
        return shouldIncludePlayer(m.team, playerName);
      });
    }
    
    // Apply heat level filter
    if (selectedHeatLevel !== 'ALL') {
      filtered = filtered.filter(m => m.milestone.heatLevel === selectedHeatLevel);
    }
    
    // Apply stat filter
    if (selectedStat !== 'ALL') {
      filtered = filtered.filter(m => m.milestone.stat === selectedStat);
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'timeline':
          return a.timeline.bestEstimate.games - b.timeline.bestEstimate.games;
        case 'player':
          return a.player.localeCompare(b.player);
        case 'urgency':
        default:
          // First by urgency score, then by estimated games
          if (a.milestone.urgencyScore !== b.milestone.urgencyScore) {
            return b.milestone.urgencyScore - a.milestone.urgencyScore;
          }
          return a.timeline.bestEstimate.games - b.timeline.bestEstimate.games;
      }
    });
    
    return filtered;
  };

  const formatMilestone = (current, target, stat) => {
    return `${current} → ${target} ${stat}`;
  };

  const getStatColor = (stat) => {
    switch (stat) {
      case 'HR': return '#FFD700'; // Gold
      case 'H': return '#4CAF50';  // Green
      case 'RBI': return '#2196F3'; // Blue
      case 'R': return '#FF9800';  // Orange
      default: return '#666';
    }
  };

  if (loading) {
    return (
      <div className="milestone-tracking-card">
        <div className="card-header">
          <h3>🎯 Milestone Tracking</h3>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading milestone data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="milestone-tracking-card">
        <div className="card-header">
          <h3>🎯 Milestone Tracking</h3>
        </div>
        <div className="error-state">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  const filteredMilestones = filterMilestones();
  const summary = milestoneData?.summary || {};

  return (
    <div className="card milestone-tracking-card">
      <div className="glass-card-container" ref={containerRef}>
        <div className="glass-header" ref={headerRef}>
          <div className="header-title-row">
            <h3>🎯 Milestone Tracking</h3>
            <div className="header-stats">
              <span className="stat-badge blazing">🔥🔥🔥 {summary.byHeatLevel?.BLAZING || 0}</span>
              <span className="stat-badge hot">🔥🔥 {summary.byHeatLevel?.HOT || 0}</span>
              <span className="stat-badge warm">🔥 {summary.byHeatLevel?.WARM || 0}</span>
            </div>
          </div>
          
          <div className="filters-row">
            <div className="filter-group">
              <label>Heat Level:</label>
              <select 
                value={selectedHeatLevel} 
                onChange={(e) => setSelectedHeatLevel(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="ALL">All Heat Levels</option>
                <option value="BLAZING">🔥🔥🔥 Blazing</option>
                <option value="HOT">🔥🔥 Hot</option>
                <option value="WARM">🔥 Warm</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Stat:</label>
              <select 
                value={selectedStat} 
                onChange={(e) => setSelectedStat(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="ALL">All Stats</option>
                <option value="HR">Home Runs</option>
                <option value="H">Hits</option>
                <option value="RBI">RBI</option>
                <option value="R">Runs</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Sort By:</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="urgency">Urgency</option>
                <option value="timeline">Timeline</option>
                <option value="player">Player Name</option>
              </select>
            </div>
          </div>
          
          {/* Tonight's watch list */}
          {summary.tonightWatch && summary.tonightWatch.length > 0 && (
            <div className="tonight-watch">
              <h4>⚡ Tonight's Watch List</h4>
              <div className="tonight-list">
                {summary.tonightWatch.slice(0, 5).map((player, idx) => (
                  <span key={idx} className="tonight-player">
                    {player.player} ({player.team}): {player.milestone}
                  </span>
                ))}
                {summary.tonightWatch.length > 5 && (
                  <span className="more-count">+{summary.tonightWatch.length - 5} more</span>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Collapsible Content */}
        <div className="glass-content expanded">
          <div className="scrollable-container">

      <div className="milestones-container">
        <div className="milestones-list">
          {filteredMilestones.slice(0, 20).map((milestone, idx) => {
            // Normalize player data for scratchpad
            const playerForScratchpad = {
              name: milestone.player,
              team: milestone.team,
              playerType: 'hitter' // milestone tracking is typically for hitters
            };
            
            return (
              <div key={idx} className={`milestone-item heat-${milestone.milestone.heatLevel.toLowerCase()}`}>
                {/* Add scratchpad icon */}
                <SimpleDesktopScratchpadIcon player={playerForScratchpad} />
                
                <div className="milestone-header">
                  <div className="player-info">
                    <span className="heat-emoji">{milestone.milestone.heatEmoji}</span>
                    <span className="player-name">{milestone.player}</span>
                    <span className="team">({milestone.team})</span>
                  </div>
                  <div className="milestone-target">
                    <span 
                      className="stat-value"
                      style={{ color: getStatColor(milestone.milestone.stat) }}
                    >
                      {formatMilestone(
                        milestone.milestone.current,
                        milestone.milestone.target,
                        milestone.milestone.stat
                      )}
                    </span>
                  </div>
                </div>
                
                <div className="milestone-timeline">
                  <div className="timeline-item">
                    <span className="timeline-label">Best Estimate:</span>
                    <span className="timeline-value">
                      {milestone.timeline.bestEstimate.games.toFixed(1)} games
                      <span className="confidence">({milestone.timeline.bestEstimate.confidence}% conf)</span>
                    </span>
                  </div>
                  
                  <div className="timeline-comparison">
                    <div className="pace-item">
                      <span className="pace-label">Season:</span>
                      <span className="pace-value">{milestone.timeline.seasonPace.gamesNeeded.toFixed(1)}g</span>
                    </div>
                    <div className="pace-item">
                      <span className="pace-label">Recent:</span>
                      <span className="pace-value">
                        {milestone.timeline.recentPace.gamesNeeded.toFixed(1)}g
                        <span className="trend">{milestone.timeline.recentPace.trend}</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                {milestone.alerts && milestone.alerts.length > 0 && (
                  <div className="milestone-alerts">
                    {milestone.alerts.map((alert, alertIdx) => (
                      <span key={alertIdx} className="alert-badge">{alert}</span>
                    ))}
                  </div>
                )}
                
                <div className="milestone-momentum">
                  {milestone.momentum.percentAboveSeason > 0 && (
                    <span className="momentum-indicator">
                      📈 {milestone.momentum.percentAboveSeason > 100 ? '+' : ''}{milestone.momentum.percentAboveSeason}% vs season avg
                    </span>
                  )}
                  <span className="recent-performance">
                    Last 3: {milestone.momentum.last3Games} {milestone.milestone.stat}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        
        {filteredMilestones.length > 20 && (
          <div className="more-milestones">
            <p>+{filteredMilestones.length - 20} more milestones tracked</p>
          </div>
        )}
      </div>
      
      {summary.hottestPlayers && summary.hottestPlayers.length > 0 && (
        <div className="hottest-players">
          <h4>🔥 Hottest Multi-Milestone Players</h4>
          <div className="hot-players-list">
            {summary.hottestPlayers.map((player, idx) => (
              <span key={idx} className="hot-player">{player}</span>
            ))}
          </div>
        </div>
      )}
      
          <div className="card-footer">
            <small>
              Last updated: {milestoneData?.lastUpdated ? 
                new Date(milestoneData.lastUpdated).toLocaleString() : 
                'Unknown'
              }
            </small>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilestoneTrackingCard;