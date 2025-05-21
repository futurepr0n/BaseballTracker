import React from 'react';
import './HRPredictionCard.css';
import InjuryBadge from '../../utils/InjuryBadge';
import '../../utils/InjuryBadge.css';

/**
 * HRPredictionCard - Displays players who are due for home runs based on predictions
 * Updated to use the document-level tooltip system
 */
const HRPredictionCard = ({ 
  playersWithHomeRunPrediction, 
  isLoading,
  teams,
  injuryData,
  currentDate,
  activeTooltip,
  setActiveTooltip
}) => {
  return (
    <div className="card hr-prediction-card">
      <h3>Players Due for Home Runs</h3>
      {isLoading ? (
        <div className="loading-indicator">Loading predictions...</div>
      ) : playersWithHomeRunPrediction.length > 0 ? (
        <div className="scrollable-container">
          <ul className="player-list">
            {playersWithHomeRunPrediction.map((player, index) => {
              // Get team logo URL if teams data is available
              const teamAbbr = player.team;
              const teamData = teams && teamAbbr ? teams[teamAbbr] : null;
              const logoUrl = teamData ? teamData.logoUrl : null;
              
              return (
                <li key={index} className="player-item">
                  <div className="player-rank">
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
                    <span className="player-name">
                      {player.fullName || player.name}
                      {injuryData && (
                        <InjuryBadge 
                          playerName={player.fullName || player.name}
                          playerTeam={player.team}
                          injuryData={injuryData}
                          activeTooltip={activeTooltip}
                          setActiveTooltip={setActiveTooltip}
                        />
                      )}
                    </span>
                    <span className="player-team">{player.team}</span>
                  </div>
                  <div className="player-stat">
                    <div className="hr-deficit">
                      {player.gamesSinceLastHR} games without HR
                    </div>
                    <div className="hr-detail">
                      Expected: {player.expectedHRs.toFixed(1)} / Actual: {player.actualHRs}
                    </div>
                    <div className="hr-detail">
                      Last HR: {player.daysSinceLastHR} days ago
                    </div>
                  </div>
                  
                  {/* Add team logo as background if available */}
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
        </div>
      ) : (
        <p className="no-data">No players due for home runs at this time</p>
      )}
    </div>
  );
};

export default HRPredictionCard;