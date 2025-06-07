// Enhanced HomeRunLeadersCard.js - Add this to your existing HomeRunLeadersCard component

import React from 'react';
import { useTeamFilter } from '../../TeamFilterContext';
import './HomeRunLeadersCard.css';

/**
 * HomeRunLeadersCard - Shows home run leaders
 * Enhanced to show comprehensive team data when filtering
 */
const HomeRunLeadersCard = ({ 
  homers,
  isLoading,
  timePeriodText,
  teams 
}) => {
  const { isFiltering, selectedTeam, getTeamName, includeMatchup, matchupTeam } = useTeamFilter();

  // Get appropriate display limit based on filtering
  const getDisplayLimit = () => {
    if (isFiltering) {
      // When filtering by team, show more comprehensive results
      return Math.min(homers.length, 50);
    }
    return 25; // Default global limit
  };

  const displayHomers = homers.slice(0, getDisplayLimit());

  // Get team context information
  const getTeamContext = () => {
    if (!isFiltering || !selectedTeam) return null;
    
    const teamName = getTeamName(selectedTeam);
    const matchupName = matchupTeam ? getTeamName(matchupTeam) : null;
    const totalHomers = homers.length;
    
    return {
      teamName,
      matchupName,
      includeMatchup,
      totalHomers,
      showing: displayHomers.length
    };
  };

  const teamContext = getTeamContext();

  // Calculate team HR summary when filtering
  const getTeamHRSummary = () => {
    if (!isFiltering || displayHomers.length === 0) return null;
    
    const totalHRs = displayHomers.reduce((sum, player) => sum + (Number(player.HR) || 0), 0);
    const playersWithHRs = displayHomers.filter(player => Number(player.HR) > 0).length;
    const topHRHitter = displayHomers[0];
    const avgHRsPerPlayer = playersWithHRs > 0 ? (totalHRs / playersWithHRs).toFixed(1) : '0.0';
    
    return {
      totalHRs,
      playersWithHRs,
      avgHRsPerPlayer,
      topHRHitter: topHRHitter ? { name: topHRHitter.name, hrs: Number(topHRHitter.HR) } : null
    };
  };

  const teamHRSummary = getTeamHRSummary();

  return (
    <div className="card hr-leaders-card">
      <h3>💥 Home Run Leaders ({timePeriodText})</h3>
      
      {/* Enhanced subtitle with team context */}
      {teamContext && (
        <div className="card-subtitle team-context">
          {teamContext.includeMatchup && teamContext.matchupName 
            ? `${teamContext.teamName} vs ${teamContext.matchupName} power hitting`
            : `${teamContext.teamName} power hitting performance`
          }
          <br />
          <span className="context-details">
            {teamContext.showing} of {teamContext.totalHomers} team players with home runs
          </span>
        </div>
      )}

      {/* Team HR summary when filtering */}
      {teamHRSummary && (
        <div className="team-hr-summary">
          <div className="summary-stats">
            <div className="summary-stat">
              <span className="stat-value">{teamHRSummary.totalHRs}</span>
              <span className="stat-label">Total HRs</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{teamHRSummary.playersWithHRs}</span>
              <span className="stat-label">Players with HRs</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{teamHRSummary.avgHRsPerPlayer}</span>
              <span className="stat-label">Avg per Player</span>
            </div>
            {teamHRSummary.topHRHitter && (
              <div className="summary-stat highlight">
                <span className="stat-value">{teamHRSummary.topHRHitter.hrs}</span>
                <span className="stat-label">Team Leader ({teamHRSummary.topHRHitter.name})</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="loading-indicator">Loading home run stats...</div>
      ) : displayHomers.length > 0 ? (
        <div className="scrollable-container">
          <ul className="player-list">
            {displayHomers.map((player, index) => {
              // Get team logo URL if teams data is available
              const teamAbbr = player.team;
              const teamData = teams && teamAbbr ? teams[teamAbbr] : null;
              const logoUrl = teamData ? teamData.logoUrl : null;
              const teamColor = teamData ? teamData.primaryColor : "#e63946";

              const hrs = Number(player.HR) || 0;
              const rate = player.rate || (player.games > 0 ? (hrs / player.games).toFixed(2) : '0.00');

              return (
                <li key={index} className="player-item hr-leader-item">
                  {/* Enhanced rank indicator with logo inside */}
                  <div className="player-rank" style={{ backgroundColor: teamColor }}>
                    {logoUrl && (
                      <>
                        <img 
                          src={logoUrl} 
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
                    <span className="player-name">{player.name}</span>
                    <span className="player-team">{player.team}</span>
                  </div>
                  
                  <div className="player-stat hr-stats">
                    <div className="primary-stat">
                      <span className="stat-value">{hrs}</span>
                      <span className="stat-label">HRs</span>
                    </div>
                    <div className="secondary-stats">
                      <span className="hr-rate">{rate}/game</span>
                      {player.games > 1 && (
                        <span className="games-played">({player.games} games)</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Keep the larger background logo */}
                  {logoUrl && (
                    <img 
                      src={logoUrl} 
                      alt="" 
                      className="team-logo-bg" 
                      loading="lazy"
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ul>
          
          {/* Show summary when team filtering */}
          {teamContext && teamContext.totalHomers > teamContext.showing && (
            <div className="team-filter-summary">
              Showing top {teamContext.showing} of {teamContext.totalHomers} {teamContext.teamName} players with home runs
            </div>
          )}
        </div>
      ) : (
        <p className="no-data">
          {isFiltering 
            ? `No home run data available for ${teamContext?.teamName || 'selected team'}`
            : 'No home run data available for this period'
          }
        </p>
      )}
    </div>
  );
};

export default HomeRunLeadersCard;