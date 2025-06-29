// src/components/cards/MostHomeRunsAtHome/MostHomeRunsAtHome.js
import React, { useMemo } from 'react';
import { useTeamFilter } from '../../TeamFilterContext';
import './MostHomeRunsAtHomeCard.css';

/**
 * MostHomeRunsAtHome - Shows stadiums with the most home runs
 * Now supports team filtering and matchup filtering
 */
const MostHomeRunsAtHomeCard = ({ 
  stadiumData,
  isLoading,
  teams,
  gameData = [] // Add gameData prop for matchup filtering
}) => {
  // Get team filter context
  const { 
    selectedTeam, 
    includeMatchup, 
    matchupTeam, 
    isFiltering 
  } = useTeamFilter();

  // Filter stadium data based on team selection
  const filteredStadiumData = useMemo(() => {
    // If not filtering or no stadium data, return original data
    if (!isFiltering || !stadiumData?.summary?.topStadiumsByTotalHRs) {
      return stadiumData;
    }

    console.log('[MostHomeRunsAtHomeCard] Debug - Team filter state:', { 
      selectedTeam, 
      includeMatchup, 
      matchupTeam,
      gameDataLength: gameData.length,
      stadiumDataLength: stadiumData.summary.topStadiumsByTotalHRs.length
    });

    // Debug: Log first few games and stadiums to see structure
    if (gameData.length > 0) {
      console.log('[MostHomeRunsAtHomeCard] First game structure:', gameData[0]);
    }
    if (stadiumData.summary.topStadiumsByTotalHRs.length > 0) {
      console.log('[MostHomeRunsAtHomeCard] First stadium structure:', stadiumData.summary.topStadiumsByTotalHRs[0]);
    }

    // Find games involving the selected team
    const teamGames = gameData.filter(game => 
      game.homeTeam === selectedTeam || game.awayTeam === selectedTeam
    );

    console.log('[MostHomeRunsAtHomeCard] Games for selected team:', teamGames);

    // If no games found, but we have a selected team, show stadiums for that team
    if (teamGames.length === 0 && selectedTeam) {
      console.log('[MostHomeRunsAtHomeCard] No games found, showing stadiums for team:', selectedTeam);
      
      // Filter stadiums by the selected team (show their home stadium)
      const filteredStadiums = stadiumData.summary.topStadiumsByTotalHRs.filter(stadium => 
        stadium.homeTeam === selectedTeam
      );

      if (filteredStadiums.length > 0) {
        return {
          ...stadiumData,
          summary: {
            ...stadiumData.summary,
            topStadiumsByTotalHRs: filteredStadiums,
            totalStadiums: filteredStadiums.length,
            totalHomeRuns: filteredStadiums.reduce((sum, stadium) => sum + stadium.totalHomeRuns, 0),
            averageHRsPerStadium: filteredStadiums.length > 0 ? 
              Math.round((filteredStadiums.reduce((sum, stadium) => sum + stadium.totalHomeRuns, 0) / filteredStadiums.length) * 10) / 10 : 0
          }
        };
      }
    }

    // If we have games, determine target stadiums
    let targetStadiums = new Set();

    if (includeMatchup && matchupTeam && teamGames.length > 0) {
      // For matchup, find the specific game between these two teams
      const matchupGame = teamGames.find(game => 
        (game.homeTeam === selectedTeam && game.awayTeam === matchupTeam) ||
        (game.homeTeam === matchupTeam && game.awayTeam === selectedTeam)
      );

      if (matchupGame) {
        targetStadiums.add(matchupGame.homeTeam);
        console.log('[MostHomeRunsAtHomeCard] Matchup stadium:', matchupGame.homeTeam);
      }
    } else if (teamGames.length > 0) {
      // For single team filter, show stadium(s) where this team is playing
      teamGames.forEach(game => {
        targetStadiums.add(game.homeTeam);
      });
      console.log('[MostHomeRunsAtHomeCard] Team stadiums:', Array.from(targetStadiums));
    }

    // If we still don't have target stadiums, fall back to showing the team's home stadium
    if (targetStadiums.size === 0 && selectedTeam) {
      targetStadiums.add(selectedTeam);
      console.log('[MostHomeRunsAtHomeCard] Fallback to home stadium:', selectedTeam);
    }

    // Filter the stadium data
    const filteredStadiums = stadiumData.summary.topStadiumsByTotalHRs.filter(stadium => 
      targetStadiums.has(stadium.homeTeam)
    );

    console.log('[MostHomeRunsAtHomeCard] Filtered stadiums result:', filteredStadiums);

    // If filtering results in no stadiums, return original data as fallback
    if (filteredStadiums.length === 0) {
      console.warn('[MostHomeRunsAtHomeCard] Filtering resulted in no stadiums, returning original data');
      return stadiumData;
    }

    // Recalculate summary stats for filtered data
    const totalStadiums = filteredStadiums.length;
    const totalHomeRuns = filteredStadiums.reduce((sum, stadium) => sum + stadium.totalHomeRuns, 0);
    const averageHRsPerStadium = totalStadiums > 0 ? 
      Math.round((totalHomeRuns / totalStadiums) * 10) / 10 : 0;

    return {
      ...stadiumData,
      summary: {
        ...stadiumData.summary,
        topStadiumsByTotalHRs: filteredStadiums,
        totalStadiums,
        totalHomeRuns,
        averageHRsPerStadium
      }
    };
  }, [stadiumData, selectedTeam, includeMatchup, matchupTeam, isFiltering, gameData]);

  // Get the appropriate title based on filtering
  const getCardTitle = () => {
    if (!isFiltering) {
      return '🏟️ Most Home Runs by Stadium';
    }

    if (includeMatchup && matchupTeam && selectedTeam) {
      const teamName1 = teams[selectedTeam]?.name || selectedTeam;
      const teamName2 = teams[matchupTeam]?.name || matchupTeam;
      return `🏟️ Stadium: ${teamName1} vs ${teamName2}`;
    }

    if (selectedTeam) {
      const teamName = teams[selectedTeam]?.name || selectedTeam;
      return `🏟️ ${teamName} Stadium Stats`;
    }

    return '🏟️ Most Home Runs by Stadium';
  };

  // Get subtitle for filtered view
  const getCardSubtitle = () => {
    if (!isFiltering) return null;

    const filteredStadiums = filteredStadiumData?.summary?.topStadiumsByTotalHRs || [];
    
    if (includeMatchup && matchupTeam) {
      return 'Showing stadium where the matchup is being played';
    }

    if (selectedTeam) {
      return `Showing stadiums for ${teams[selectedTeam]?.name || selectedTeam}`;
    }

    return 'Filtered view';
  };

  return (
    <div className="card most-home-runs-at-home-card">
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>{getCardTitle()}</h3>
          {getCardSubtitle() && (
            <div className="card-subtitle" style={{ 
              fontSize: '0.85rem', 
              color: '#666', 
              marginTop: '5px',
              textAlign: 'center',
              fontStyle: 'italic' 
            }}>
              {getCardSubtitle()}
            </div>
          )}
        </div>
        
        {isLoading ? (
          <div className="loading-indicator">Loading stadium data...</div>
        ) : filteredStadiumData && filteredStadiumData.summary && filteredStadiumData.summary.topStadiumsByTotalHRs ? (
          <div className="scrollable-container">
          <div className="stadium-summary">
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-value">{filteredStadiumData.summary.totalStadiums}</span>
                <span className="stat-label">Stadium{filteredStadiumData.summary.totalStadiums !== 1 ? 's' : ''}</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{filteredStadiumData.summary.totalHomeRuns}</span>
                <span className="stat-label">Total HRs</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{filteredStadiumData.summary.averageHRsPerStadium}</span>
                <span className="stat-label">Avg per Stadium</span>
              </div>
            </div>
          </div>
          
          <ul className="stadium-list">
            {filteredStadiumData.summary.topStadiumsByTotalHRs.slice(0, 15).map((stadium, index) => {
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
          
          {filteredStadiumData.summary.homeVsAwayAnalysis && (
            <div className="home-away-analysis">
              <h4>Home vs Away Analysis</h4>
              <div className="analysis-stats">
                <div className="analysis-item">
                  <span className="analysis-label">Home Team HRs:</span>
                  <span className="analysis-value">{filteredStadiumData.summary.homeVsAwayAnalysis.totalHomeTeamHRs}</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">Away Team HRs:</span>
                  <span className="analysis-value">{filteredStadiumData.summary.homeVsAwayAnalysis.totalAwayTeamHRs}</span>
                </div>
                <div className="analysis-item">
                  <span className="analysis-label">Home Advantage:</span>
                  <span className={`analysis-value ${filteredStadiumData.summary.homeVsAwayAnalysis.homeAdvantage ? 'positive' : 'negative'}`}>
                    {filteredStadiumData.summary.homeVsAwayAnalysis.homeAdvantage ? 'Yes' : 'No'}
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
    </div>
  );
};

export default MostHomeRunsAtHomeCard;