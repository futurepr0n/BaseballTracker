// src/components/cards/MostHomeRunsAtHome/MostHomeRunsAtHome.js
import React from 'react';
import './MostHomeRunsAtHomeCard.css';

/**
 * MostHomeRunsAtHome - Shows stadiums with the most home runs
 */
const MostHomeRunsAtHomeCard = ({ 
  stadiumData,
  isLoading,
  teams
}) => {
  return (
    <div className="card most-home-runs-at-home-card">
      <h3>🏟️ Most Home Runs by Stadium</h3>
      {isLoading ? (
        <div className="loading-indicator">Loading stadium data...</div>
      ) : stadiumData && stadiumData.summary && stadiumData.summary.topStadiumsByTotalHRs ? (
        <div className="scrollable-container">
          <div className="stadium-summary">
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-value">{stadiumData.summary.totalStadiums}</span>
                <span className="stat-label">Stadiums</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stadiumData.summary.totalHomeRuns}</span>
                <span className="stat-label">Total HRs</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stadiumData.summary.averageHRsPerStadium}</span>
                <span className="stat-label">Avg per Stadium</span>
              </div>
            </div>
          </div>
          
          <ul className="stadium-list">
            {stadiumData.summary.topStadiumsByTotalHRs.slice(0, 15).map((stadium, index) => {
              // Get team data for logo and colors
              const teamData = teams && stadium.homeTeam ? teams[stadium.homeTeam] : null;
              const logoUrl = teamData ? teamData.logoUrl : null;
              const teamColor = teamData ? teamData.primaryColor : '#0056b3';
              
              return (
                <li key={index} className="stadium-item">
                  <div 
                    className="stadium-rank"
                    style={{ backgroundColor: teamColor }}
                  >
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
                  
                  <div className="stadium-info">
                    <span className="stadium-name">{stadium.name}</span>
                    <span className="stadium-team">{stadium.homeTeam}</span>
                  </div>
                  
                  <div className="stadium-stats">
                    <div className="stat-highlight" style={{ color: teamColor }}>
                      {stadium.totalHomeRuns} HRs
                    </div>
                    <small>
                      {stadium.averagePerGame} per game
                      <br />
                      {stadium.totalGames} games
                    </small>
                  </div>
                  
                  {/* Enhanced background logo */}
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
          
          {stadiumData.summary.homeVsAwayAnalysis && (
            <div className="home-away-analysis">
              <h4>Home vs Away Analysis</h4>
              <div className="analysis-stats">
                <div className="analysis-item">
                  <span className="analysis-label">Home Team HRs:</span>
                  <span className="analysis-value">{stadiumData.summary.homeVsAwayAnalysis.totalHomeTeamHRs}</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">Away Team HRs:</span>
                  <span className="analysis-value">{stadiumData.summary.homeVsAwayAnalysis.totalAwayTeamHRs}</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">Home Advantage:</span>
                  <span className={`analysis-value ${stadiumData.summary.homeVsAwayAnalysis.homeAdvantage ? 'positive' : 'negative'}`}>
                    {stadiumData.summary.homeVsAwayAnalysis.homeAdvantage ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="no-data">No stadium home run data available</p>
      )}
    </div>
  );
};

export default MostHomeRunsAtHomeCard;