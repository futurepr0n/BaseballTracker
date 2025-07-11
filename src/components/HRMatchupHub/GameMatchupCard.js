import React from 'react';
import './GameMatchupCard.css';

/**
 * Game Matchup Card - Individual game analysis card
 */
const GameMatchupCard = ({ gameAnalysis, isSelected, onSelect, teamData }) => {
  if (!gameAnalysis) {
    return null;
  }

  const { homeTeam, awayTeam, overallGameRating, homeTeamAnalysis, awayTeamAnalysis, pitcher, pitchers } = gameAnalysis;

  const getTeamInfo = (teamCode) => {
    return teamData[teamCode] || {
      name: teamCode,
      primaryColor: '#666666',
      logoUrl: null
    };
  };

  const homeTeamInfo = getTeamInfo(homeTeam);
  const awayTeamInfo = getTeamInfo(awayTeam);

  const formatTime = (gameTime) => {
    if (!gameTime) return 'TBD';
    
    try {
      const date = new Date(gameTime);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return gameTime;
    }
  };

  const getRatingColor = (classification) => {
    switch (classification) {
      case 'ELITE_GAME': return '#4ecdc4';
      case 'HIGH_QUALITY': return '#f7931e';
      case 'ABOVE_AVERAGE': return '#4caf50';
      case 'AVERAGE': return '#9e9e9e';
      case 'BELOW_AVERAGE': return '#ff9800';
      case 'LOW_QUALITY': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getTopPlayers = (teamAnalysis, count = 3) => {
    if (!teamAnalysis || !teamAnalysis.playerAnalyses) return [];
    
    return teamAnalysis.playerAnalyses
      .sort((a, b) => b.comprehensiveScore.totalScore - a.comprehensiveScore.totalScore)
      .slice(0, count);
  };

  const homeTopPlayers = getTopPlayers(homeTeamAnalysis);
  const awayTopPlayers = getTopPlayers(awayTeamAnalysis);

  return (
    <div 
      className={`game-matchup-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="card-header">
        <div className="matchup-display">
          <div className="team away-team">
            {awayTeamInfo.logoUrl && (
              <img 
                src={awayTeamInfo.logoUrl} 
                alt={`${awayTeamInfo.name} logo`}
                className="team-logo"
              />
            )}
            <span className="team-code">{awayTeam}</span>
          </div>
          
          <div className="vs-separator">@</div>
          
          <div className="team home-team">
            <span className="team-code">{homeTeam}</span>
            {homeTeamInfo.logoUrl && (
              <img 
                src={homeTeamInfo.logoUrl} 
                alt={`${homeTeamInfo.name} logo`}
                className="team-logo"
              />
            )}
          </div>
        </div>

        <div className="game-info">
          <div className="game-time">{formatTime(gameAnalysis.gameTime)}</div>
          <div 
            className="game-rating"
            style={{ 
              backgroundColor: getRatingColor(overallGameRating?.classification),
              color: overallGameRating?.classification === 'HIGH_QUALITY' ? '#000' : '#fff'
            }}
          >
            {overallGameRating?.score || 50}/100
          </div>
        </div>
      </div>

      <div className="card-content">
        {(pitchers?.home || pitchers?.away) && (
          <div className="pitcher-matchup">
            <div className="pitcher-vs">
              <span className="away-pitcher">
                {pitchers?.away?.name || 'TBD'}
              </span>
              <span className="vs-text">vs</span>
              <span className="home-pitcher">
                {pitchers?.home?.name || 'TBD'}
              </span>
            </div>
          </div>
        )}

        <div className="team-summaries">
          <div className="team-summary away">
            <div className="team-header">
              <span className="team-label">
                {awayTeam} (Away) - vs {pitchers?.home?.name || 'TBD'}
              </span>
              <span className="team-strength">
                {awayTeamAnalysis?.teamSummary?.teamStrength || 'N/A'}
              </span>
            </div>

            {/* Travel Impact Summary for Away Team */}
            {(() => {
              const firstPlayerWithTravel = awayTeamAnalysis?.playerAnalyses?.find(p => 
                p.travelAnalysis && p.travelAnalysis.travelType !== 'UNKNOWN' && p.travelAnalysis.travelDistance > 0
              );
              
              if (firstPlayerWithTravel && firstPlayerWithTravel.travelAnalysis) {
                const travel = firstPlayerWithTravel.travelAnalysis;
                return (
                  <div className="travel-summary">
                    <div className="travel-label">Travel Impact:</div>
                    <div className="travel-details">
                      <span className="travel-distance">{travel.travelDistance} miles</span>
                      <span className="travel-classification">
                        {travel.travelClassification?.replace('_', ' ') || 'N/A'}
                      </span>
                      <span className={`travel-impact ${travel.travelImpact < 0 ? 'negative' : 'positive'}`}>
                        {travel.travelImpact > 0 ? '+' : ''}{travel.travelImpact}
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            <div className="top-players">
              <div className="players-label">Top Targets:</div>
              {awayTopPlayers.length > 0 ? (
                <div className="players-list">
                  {awayTopPlayers.map((player, index) => (
                    <div key={index} className="player-item">
                      <span className="player-name">{player.playerName}</span>
                      <span className="player-score">{parseFloat(player.comprehensiveScore.totalScore).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-players">No player analysis</div>
              )}
            </div>
          </div>

          <div className="team-summary home">
            <div className="team-header">
              <span className="team-label">
                {homeTeam} (Home) - vs {pitchers?.away?.name || 'TBD'}
              </span>
              <span className="team-strength">
                {homeTeamAnalysis?.teamSummary?.teamStrength || 'N/A'}
              </span>
            </div>

            {/* Travel Impact Summary for Home Team */}
            {(() => {
              const firstPlayerWithTravel = homeTeamAnalysis?.playerAnalyses?.find(p => 
                p.travelAnalysis && p.travelAnalysis.travelType !== 'UNKNOWN' && p.travelAnalysis.travelDistance > 0
              );
              
              if (firstPlayerWithTravel && firstPlayerWithTravel.travelAnalysis) {
                const travel = firstPlayerWithTravel.travelAnalysis;
                return (
                  <div className="travel-summary">
                    <div className="travel-label">Travel Impact:</div>
                    <div className="travel-details">
                      <span className="travel-distance">{travel.travelDistance} miles</span>
                      <span className="travel-classification">
                        {travel.travelClassification?.replace('_', ' ') || 'N/A'}
                      </span>
                      <span className={`travel-impact ${travel.travelImpact < 0 ? 'negative' : 'positive'}`}>
                        {travel.travelImpact > 0 ? '+' : ''}{travel.travelImpact}
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            <div className="top-players">
              <div className="players-label">Top Targets:</div>
              {homeTopPlayers.length > 0 ? (
                <div className="players-list">
                  {homeTopPlayers.map((player, index) => (
                    <div key={index} className="player-item">
                      <span className="player-name">{player.playerName}</span>
                      <span className="player-score">{parseFloat(player.comprehensiveScore.totalScore).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-players">No player analysis</div>
              )}
            </div>
          </div>
        </div>

        <div className="card-footer">
          <div className="analysis-indicators">
            {gameAnalysis.apiPredictions && (
              <div className="indicator api">
                <span className="indicator-label">API</span>
                <span className="indicator-value">
                  {gameAnalysis.apiPredictions.predictions?.length || 0}
                </span>
              </div>
            )}
            
            <div className="indicator players">
              <span className="indicator-label">Players</span>
              <span className="indicator-value">
                {(homeTeamAnalysis?.totalPlayers || 0) + (awayTeamAnalysis?.totalPlayers || 0)}
              </span>
            </div>

            <div className="indicator confidence">
              <span className="indicator-label">High Confidence</span>
              <span className="indicator-value">
                {(homeTeamAnalysis?.teamSummary?.highConfidencePlayers || 0) + 
                 (awayTeamAnalysis?.teamSummary?.highConfidencePlayers || 0)}
              </span>
            </div>
          </div>

          <div className="select-hint">
            {isSelected ? 'Selected' : 'Click to analyze'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameMatchupCard;