import React, { useEffect, useRef } from 'react';
import { useTeamFilter } from '../../TeamFilterContext';
import MobilePlayerCard from '../../common/MobilePlayerCard';
import SimpleDesktopScratchpadIcon from '../../common/SimpleDesktopScratchpadIcon';
import { getTeamLogoUrl } from '../../../utils/teamUtils';
// import { initializeCollapsibleGlass } from '../../../utils/collapsibleGlass';
import './TopHittersCard.css';
import '../../common/MobilePlayerCard.css';
import '../../../styles/CollapsibleGlass.css';

/**
 * TopHittersCard - Shows top hitting performers
 * Enhanced to show comprehensive team data when filtering
 */
const TopHittersCard = ({ 
  hitters, 
  isLoading, 
  timePeriodText, 
  teams 
}) => {
  const { isFiltering, selectedTeam, getTeamName, includeMatchup, matchupTeam } = useTeamFilter();
  const headerRef = useRef(null);
  const containerRef = useRef(null);

  // Get appropriate display limit based on filtering
  const getDisplayLimit = () => {
    if (isFiltering) {
      // When filtering by team, show more comprehensive results
      return Math.min(hitters.length, 50);
    }
    return 25; // Default global limit
  };

  const displayHitters = hitters.slice(0, getDisplayLimit());

  // Get team context information
  const getTeamContext = () => {
    if (!isFiltering || !selectedTeam) return null;
    
    const teamName = getTeamName(selectedTeam);
    const matchupName = matchupTeam ? getTeamName(matchupTeam) : null;
    const totalHitters = hitters.length;
    
    return {
      teamName,
      matchupName,
      includeMatchup,
      totalHitters,
      showing: displayHitters.length
    };
  };

  const teamContext = getTeamContext();

  // Calculate team hitting summary when filtering
  const getTeamSummary = () => {
    if (!isFiltering || displayHitters.length === 0) return null;
    
    const totalHits = displayHitters.reduce((sum, player) => sum + (Number(player.H) || 0), 0);
    const playersWithHits = displayHitters.filter(player => Number(player.H) > 0).length;
    const topHitter = displayHitters[0];
    
    return {
      totalHits,
      playersWithHits,
      topHitter: topHitter ? { name: topHitter.name, hits: Number(topHitter.H) } : null
    };
  };

  const teamSummary = getTeamSummary();

  // Initialize collapsible functionality
  // useEffect(() => {
  //   if (headerRef.current && containerRef.current) {
  //     const cleanup = initializeCollapsibleGlass(
  //       headerRef.current, 
  //       containerRef.current, // Use the glass-card-container ref
  //       'top-hitters-card'
  //     );
  //     return cleanup;
  //   }
  // }, []);

  return (
    <div className="card top-hitters-card">
      <div className="glass-card-container" ref={containerRef}>
        <div className="glass-header" ref={headerRef}>
          <h3>🎯 Top Hitters ({timePeriodText})</h3>
          
          {/* Enhanced subtitle with team context */}
          {teamContext && (
            <div className="card-subtitle team-context">
              {teamContext.includeMatchup && teamContext.matchupName 
                ? `${teamContext.teamName} vs ${teamContext.matchupName} hitting performance`
                : `${teamContext.teamName} hitting performance`
              }
              <br />
              <span className="context-details">
                {teamContext.showing} of {teamContext.totalHitters} team hitters
              </span>
            </div>
          )}

          {/* Team hitting summary when filtering */}
          {teamSummary && (
            <div className="team-hitting-summary">
              <div className="summary-stats">
                <div className="summary-stat">
                  <span className="stat-value">{teamSummary.totalHits}</span>
                  <span className="stat-label">Total Hits</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-value">{teamSummary.playersWithHits}</span>
                  <span className="stat-label">Players with Hits</span>
                </div>
                {teamSummary.topHitter && (
                  <div className="summary-stat">
                    <span className="stat-value">{teamSummary.topHitter.hits}</span>
                    <span className="stat-label">Team Leader ({teamSummary.topHitter.name})</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Collapsible Content */}
        <div className="glass-content expanded">
        
        {/* Desktop View */}
        <div className="desktop-view">
          {isLoading ? (
            <div className="loading-indicator">Loading hitting stats...</div>
          ) : displayHitters.length > 0 ? (
            <div className="scrollable-container">
            <ul className="player-list">
              {displayHitters.map((player, index) => {
                // Get team logo URL if teams data is available
                const teamAbbr = player.team;
                const teamData = teams && teamAbbr ? teams[teamAbbr] : null;
                const logoUrl = teamData ? teamData.logoUrl : getTeamLogoUrl(player.team);
                const teamColor = teamData ? teamData.primaryColor : "#4f46e5";

                const hits = Number(player.H) || 0;
                const avg = player.avg || (player.AB > 0 ? (hits / player.AB).toFixed(3) : '.000');

                return (
                  <li key={index} className="player-item hitter-item">
                    {/* Simple scratchpad icon - always visible */}
                    <SimpleDesktopScratchpadIcon player={player} />
                    
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
                    
                    <div className="hitting-stats">
                      <div className="primary-stat">
                        <span className="stat-value">{hits}</span>
                        <span className="stat-label">Hits</span>
                      </div>
                      <div className="secondary-stats">
                        <span className="batting-avg">{avg} AVG</span>
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
            {teamContext && teamContext.totalHitters > teamContext.showing && (
              <div className="team-filter-summary">
                Showing top {teamContext.showing} of {teamContext.totalHitters} {teamContext.teamName} hitters
              </div>
            )}
            </div>
          ) : (
            <p className="no-data">
              {isFiltering 
                ? `No hitting data available for ${teamContext?.teamName || 'selected team'}`
                : 'No hitting data available for this period'
              }
            </p>
          )}
        </div>

        {/* Mobile View */}
        <div className="mobile-view">
          {isLoading ? (
            <div className="loading-indicator">Loading hitting stats...</div>
          ) : displayHitters.length > 0 ? (
            <div className="mobile-cards">
              {displayHitters.map((player, index) => {
                const hits = Number(player.H) || 0;
                const avg = player.avg || (player.AB > 0 ? (hits / player.AB).toFixed(3) : '.000');

                const secondaryMetrics = [
                  { label: 'AVG', value: avg },
                  { label: 'Games', value: player.games || 1 }
                ];

                return (
                  <MobilePlayerCard
                    key={index}
                    item={{
                      name: player.name,
                      team: player.team
                    }}
                    index={index}
                    showRank={true}
                    primaryMetric={{
                      value: hits,
                      label: 'Hits'
                    }}
                    secondaryMetrics={secondaryMetrics}
                  />
                );
              })}

              {/* Show summary when team filtering */}
              {teamContext && teamContext.totalHitters > teamContext.showing && (
                <div className="team-filter-summary mobile-summary">
                  Showing top {teamContext.showing} of {teamContext.totalHitters} {teamContext.teamName} hitters
                </div>
              )}
            </div>
          ) : (
            <p className="no-data">
              {isFiltering 
                ? `No hitting data available for ${teamContext?.teamName || 'selected team'}`
                : 'No hitting data available for this period'
              }
            </p>
          )}
        </div>
        
        </div> {/* End collapsible content */}
      </div>
    </div>
  );
};

export default TopHittersCard;