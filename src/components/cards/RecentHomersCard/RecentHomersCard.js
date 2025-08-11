import React from 'react';
import { useTeamFilter } from '../../TeamFilterContext';
import MobilePlayerCard from '../../common/MobilePlayerCard';
import SimpleDesktopScratchpadIcon from '../../common/SimpleDesktopScratchpadIcon';
import { getTeamLogoUrl } from '../../../utils/teamUtils';
import { formatDateForDisplay, getDaysAgoText } from '../../../utils/dateUtils';
import './RecentHomersCard.css';
import '../../common/MobilePlayerCard.css';

/**
 * RecentHomersCard - Shows players with most recent home runs
 * Enhanced to show comprehensive team data when filtering
 */
const RecentHomersCard = ({ 
  recentHRPlayers, 
  isLoading, 
  teams 
}) => {
  const { isFiltering, selectedTeam, getTeamName, shouldIncludePlayer } = useTeamFilter();

  // Get appropriate display limit based on filtering
  const getDisplayLimit = () => {
    if (isFiltering) {
      // When filtering by team, show more comprehensive results
      return Math.min(recentHRPlayers.length, 50);
    }
    return 25; // Default global limit
  };

  const displayPlayers = recentHRPlayers.slice(0, getDisplayLimit());

  // Get team context information
  const getTeamContext = () => {
    if (!isFiltering || !selectedTeam) return null;
    
    const teamName = getTeamName(selectedTeam);
    const teamPlayerCount = recentHRPlayers.length;
    
    return {
      teamName,
      playerCount: teamPlayerCount,
      showing: displayPlayers.length
    };
  };

  const teamContext = getTeamContext();

  return (
    <div className="card recent-homers-card">
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>⚾ Most Recent Home Runs</h3>
          
          {/* Enhanced subtitle with team context */}
          {teamContext && (
            <div className="card-subtitle team-context">
              Showing {teamContext.showing} of {teamContext.playerCount} {teamContext.teamName} players with home runs
            </div>
          )}
        </div>
        
        {/* Desktop View */}
        <div className="desktop-view">
          {isLoading ? (
            <div className="loading-indicator">Loading recent home run data...</div>
          ) : displayPlayers.length > 0 ? (
            <div className="scrollable-container">
            <ul className="player-list">
              {displayPlayers.map((player, index) => {
                // Get team logo URL if teams data is available
                const teamAbbr = player.team;
                const teamData = teams && teamAbbr ? teams[teamAbbr] : null;
                const logoUrl = teamData ? teamData.logoUrl : getTeamLogoUrl(player.team);
                const teamColor = teamData ? teamData.primaryColor : "#333333";

                // Format the date using timezone-safe utilities
                const formattedDate = formatDateForDisplay(player.lastHRDate);
                const daysAgoText = getDaysAgoText(player.lastHRDate);

                return (
                  <li key={index} className="player-item recent-homer-item">
                    <SimpleDesktopScratchpadIcon player={player} />
                    
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
                    
                    <div className="recent-hr-stats">
                      <div className="hr-date">
                        <span className="date-primary">{formattedDate}</span>
                        <span className="date-secondary">({daysAgoText})</span>
                      </div>
                      <div className="hr-totals">
                        {Number(player.homeRunsThisSeason) > 0 && (
                          <span className="season-hrs">{player.homeRunsThisSeason} HRs this season</span>
                        )}
                        {Number(player.gamesSinceLastHR) > 0 && (
                          <span className="games-since">{player.gamesSinceLastHR} games since</span>
                        )}
                      </div>
                    </div>
                    
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
            {teamContext && teamContext.playerCount > teamContext.showing && (
              <div className="team-filter-summary">
                Showing top {teamContext.showing} of {teamContext.playerCount} {teamContext.teamName} players with home runs
              </div>
            )}
            </div>
          ) : (
            <p className="no-data">
              {isFiltering 
                ? `No home run data available for ${teamContext?.teamName || 'selected team'}`
                : 'No recent home run data available'
              }
            </p>
          )}
        </div>

        {/* Mobile View */}
        <div className="mobile-view">
          {isLoading ? (
            <div className="loading-indicator">Loading recent home run data...</div>
          ) : displayPlayers.length > 0 ? (
            <div className="mobile-cards">
              {displayPlayers.map((player, index) => {
                // Format the date using timezone-safe utilities
                const formattedDate = formatDateForDisplay(player.lastHRDate);
                const daysAgoText = getDaysAgoText(player.lastHRDate);

                const secondaryMetrics = [
                  ...(Number(player.homeRunsThisSeason) > 0 ? [{ label: 'Season', value: `${player.homeRunsThisSeason} HRs` }] : []),
                  ...(Number(player.gamesSinceLastHR) > 0 ? [{ label: 'Since', value: `${player.gamesSinceLastHR} games` }] : [])
                ].filter(Boolean);

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
                      value: formattedDate,
                      label: daysAgoText
                    }}
                    secondaryMetrics={secondaryMetrics}
                  />
                );
              })}

              {/* Show summary when team filtering */}
              {teamContext && teamContext.playerCount > teamContext.showing && (
                <div className="team-filter-summary mobile-summary">
                  Showing top {teamContext.showing} of {teamContext.playerCount} {teamContext.teamName} players with home runs
                </div>
              )}
            </div>
          ) : (
            <p className="no-data">
              {isFiltering 
                ? `No home run data available for ${teamContext?.teamName || 'selected team'}`
                : 'No recent home run data available'
              }
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentHomersCard;