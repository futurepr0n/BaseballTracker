// HRPredictionCard.js - Modified to handle display limiting properly

import React, { useMemo } from 'react';
import { useTeamFilter } from '../../TeamFilterContext'; // Import to check filtering status
import './HRPredictionCard.css'; // Import your styles

const HRPredictionCard = ({ playersWithHomeRunPrediction, isLoading, teams }) => {
  // Get filtering context to determine if we should limit display
  const { isFiltering } = useTeamFilter();
  
  // Process the players for display
  const displayPlayers = useMemo(() => {
    if (!playersWithHomeRunPrediction || playersWithHomeRunPrediction.length === 0) {
      return [];
    }
    
    // If filtering is active, show all filtered players (already filtered in Dashboard.js)
    // If not filtering, limit to top 25 players
    if (isFiltering) {
      // When filtering, show all due players from the selected team(s)
      return playersWithHomeRunPrediction;
    } else {
      // When not filtering, limit to top 25 for better display
      return playersWithHomeRunPrediction.slice(0, 25);
    }
  }, [playersWithHomeRunPrediction, isFiltering]);
  
  // Calculate some stats for the header
  const totalDuePlayers = playersWithHomeRunPrediction?.length || 0;
  const displayingCount = displayPlayers.length;
  
  // Helper function to get team colors
  const getTeamColor = (teamAbbr) => {
    const team = teams?.[teamAbbr];
    return team?.primaryColor || '#0056b3';
  };
  
  // Helper function to format deficit text
  const formatDeficitText = (player) => {
    if (player.gamesSinceLastHR > 0) {
      return `${player.gamesSinceLastHR} games since last HR`;
    } else if (player.homeRunsThisSeason === 0) {
      return `${player.gamesPlayed} games, no HRs this season`;
    } else {
      return `Due for next HR`;
    }
  };
  
  return (
    <div className="card hr-prediction">
      <h3>
        Players Due for Home Runs
        {!isLoading && (
          <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#666', marginLeft: '10px' }}>
            {isFiltering 
              ? `Showing ${displayingCount} due player${displayingCount !== 1 ? 's' : ''} from selected team${displayingCount !== 1 ? 's' : ''}`
              : `Showing top ${displayingCount} of ${totalDuePlayers} due players`
            }
          </span>
        )}
      </h3>
      
      {isLoading ? (
        <div className="loading-indicator">Loading HR predictions</div>
      ) : displayPlayers.length === 0 ? (
        <div className="no-data">
          {isFiltering 
            ? "No players from selected team(s) are currently due for home runs."
            : "No players are currently due for home runs."
          }
        </div>
      ) : (
        <div className="scrollable-container">
          <ul className="player-list">
            {displayPlayers.map((player, index) => {
              const teamColor = getTeamColor(player.team);
              const teamLogo = teams?.[player.team]?.logoUrl;
              
              return (
                <li key={`${player.name}-${player.team}`} className="player-item">
                  {teamLogo && (
                    <img 
                      src={teamLogo} 
                      alt={`${player.team} logo`} 
                      className="team-logo-bg"
                    />
                  )}
                  
                  <div 
                    className="player-rank" 
                    style={{ backgroundColor: teamColor }}
                  >
                    {teamLogo && <img src={teamLogo} alt="" className="rank-logo" />}
                    <div className="rank-overlay"></div>
                    <span className="rank-number">{index + 1}</span>
                  </div>
                  
                  <div className="player-info">
                    <span className="player-name">{player.fullName || player.name}</span>
                    <span className="player-team">{player.team}</span>
                  </div>
                  
                  <div className="player-stat">
                    <span 
                      className="hr-deficit"
                      style={{ color: teamColor }}
                    >
                      Due Score: {player.dueScore.toFixed(2)}
                    </span>
                    <span className="hr-detail">
                      {formatDeficitText(player)}
                    </span>
                    <span className="hr-detail">
                      {player.homeRunsThisSeason} HR{player.homeRunsThisSeason !== 1 ? 's' : ''} in {player.gamesPlayed} games
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      
      {/* Show note about data completeness when not filtering */}
      {!isLoading && !isFiltering && totalDuePlayers > 25 && (
        <div style={{ 
          fontSize: '0.8rem', 
          color: '#666', 
          marginTop: '10px', 
          padding: '8px', 
          backgroundColor: '#f9f9f9', 
          borderRadius: '4px' 
        }}>
          💡 Showing top 25 players. Use team filter to see all due players from specific teams.
        </div>
      )}
    </div>
  );
};

export default HRPredictionCard;