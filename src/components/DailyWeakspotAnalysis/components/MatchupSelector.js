import React from 'react';
import { getVenueName } from '../../../utils/venueNormalizer';

const MatchupSelector = ({ 
  selectedDate, 
  onDateChange, 
  selectedGames, 
  onGamesChange, 
  onAnalyze, 
  loading, 
  gamesCount 
}) => {
  const [selectedGameIds, setSelectedGameIds] = React.useState([]);

  // Initialize all games as selected when games change
  React.useEffect(() => {
    if (selectedGames.length > 0) {
      const gameIds = selectedGames.map((game, index) => game.id || game.gameId || index);
      setSelectedGameIds(gameIds);
    } else {
      setSelectedGameIds([]);
    }
  }, [selectedGames]);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    onDateChange(newDate);
  };

  const handleGameSelection = (gameId, isChecked) => {
    let updatedIds;
    if (isChecked) {
      updatedIds = [...selectedGameIds, gameId];
    } else {
      updatedIds = selectedGameIds.filter(id => id !== gameId);
    }
    setSelectedGameIds(updatedIds);
  };

  const handleSelectAll = () => {
    const allGameIds = selectedGames.map((game, index) => game.id || game.gameId || index);
    setSelectedGameIds(allGameIds);
  };

  const handleSelectNone = () => {
    setSelectedGameIds([]);
  };

  const getSelectedGames = () => {
    return selectedGames.filter((game, index) => {
      const gameId = game.id || game.gameId || index;
      return selectedGameIds.includes(gameId);
    });
  };

  const handleAnalyze = () => {
    const selectedGamesToAnalyze = getSelectedGames();
    onAnalyze(selectedGamesToAnalyze);
  };

  const formatTime = (gameTime) => {
    if (!gameTime) return 'TBD';
    
    try {
      // Handle UTC time from lineup data (format: "22:10" or ISO string)
      let date;
      if (typeof gameTime === 'string' && gameTime.includes(':') && !gameTime.includes('T')) {
        // Handle "22:10" format - assume UTC and convert to local
        date = new Date(`${selectedDate}T${gameTime}:00.000Z`);
      } else {
        date = new Date(gameTime);
      }
      
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return gameTime;
    }
  };

  const formatGameDisplay = (game) => {
    // Handle both lineup data format and fallback game data format
    let awayTeam, homeTeam, awayPitcher, homePitcher, time;
    
    if (game.teams && game.pitchers) {
      // Lineup data format
      awayTeam = game.teams.away?.abbr || 'TBD';
      homeTeam = game.teams.home?.abbr || 'TBD';
      awayPitcher = game.pitchers.away?.name || 'TBD';
      homePitcher = game.pitchers.home?.name || 'TBD';
      time = formatTime(game.gameTime);
      
      // Check pitcher confirmation status
      const awayConfirmed = game.pitchers.away?.status === 'probable' || 
                           game.pitchers.away?.status === 'confirmed' ||
                           (game.pitchers.away?.confidence && game.pitchers.away.confidence >= 80);
      const homeConfirmed = game.pitchers.home?.status === 'probable' ||
                           game.pitchers.home?.status === 'confirmed' ||
                           (game.pitchers.home?.confidence && game.pitchers.home.confidence >= 80);
      
      return {
        awayTeam,
        homeTeam,
        awayPitcher,
        homePitcher,
        time,
        displayText: `${awayTeam} @ ${homeTeam}`,
        pitcherText: `${awayPitcher} vs ${homePitcher}`,
        isValidForAnalysis: awayConfirmed && homeConfirmed && awayPitcher !== 'TBD' && homePitcher !== 'TBD'
      };
    } else {
      // Fallback game data format
      awayTeam = game.away_team || game.awayTeam || 'TBD';
      homeTeam = game.home_team || game.homeTeam || 'TBD';
      awayPitcher = game.away_pitcher || game.awayPitcher || 'TBD';
      homePitcher = game.home_pitcher || game.homePitcher || 'TBD';
      time = formatTime(game.time || game.gameTime);

      return {
        awayTeam,
        homeTeam,
        awayPitcher,
        homePitcher,
        time,
        displayText: `${awayTeam} @ ${homeTeam}`,
        pitcherText: `${awayPitcher} vs ${homePitcher}`,
        isValidForAnalysis: awayPitcher !== 'TBD' && homePitcher !== 'TBD'
      };
    }
  };

  const selectedValidGames = getSelectedGames().filter(game => {
    const formatted = formatGameDisplay(game);
    return formatted.isValidForAnalysis;
  });

  const totalValidGamesCount = selectedGames.filter(game => {
    const formatted = formatGameDisplay(game);
    return formatted.isValidForAnalysis;
  }).length;

  const canAnalyze = selectedValidGames.length > 0 && !loading;

  return (
    <div className="matchup-selector">
      <div className="selector-header">
        <h2>Select Date & Games</h2>
        <p>Choose the date and games you want to analyze for weakspot opportunities</p>
      </div>

      <div className="selector-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="analysis-date">Analysis Date:</label>
            <input
              id="analysis-date"
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              max={new Date().toISOString().split('T')[0]}
              className="date-input"
            />
          </div>
          
          <div className="form-group">
            <label>Games Available:</label>
            <div className="games-summary">
              <span className="games-count">
                {gamesCount} total games, {totalValidGamesCount} with confirmed pitchers
              </span>
              <span className="selected-count">
                ({selectedValidGames.length} selected for analysis)
              </span>
            </div>
          </div>
        </div>

        {/* Game Selection Controls */}
        {selectedGames.length > 0 && (
          <div className="game-selection-controls">
            <div className="selection-buttons">
              <button 
                type="button"
                onClick={handleSelectAll}
                className="select-all-button"
                disabled={selectedGameIds.length === selectedGames.length}
              >
                Select All
              </button>
              <button 
                type="button"
                onClick={handleSelectNone}
                className="select-none-button"
                disabled={selectedGameIds.length === 0}
              >
                Select None
              </button>
            </div>
            <div className="selection-info">
              {selectedGameIds.length} of {selectedGames.length} games selected
            </div>
          </div>
        )}

        {/* Games List */}
        {selectedGames.length > 0 && (
          <div className="games-list">
            <h3>Scheduled Games for {new Date(selectedDate).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</h3>
            <div className="games-grid">
              {selectedGames.map((game, index) => {
                const gameInfo = formatGameDisplay(game);
                const gameId = game.id || game.gameId || index;
                const isSelected = selectedGameIds.includes(gameId);
                
                return (
                  <div 
                    key={game.id || index} 
                    className={`game-card ${!gameInfo.isValidForAnalysis ? 'incomplete' : ''} ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="game-selection">
                      <input
                        type="checkbox"
                        id={`game-${gameId}`}
                        checked={isSelected}
                        onChange={(e) => handleGameSelection(gameId, e.target.checked)}
                        className="game-checkbox"
                      />
                      <label htmlFor={`game-${gameId}`} className="game-checkbox-label">
                        Select for analysis
                      </label>
                    </div>
                    <div className="game-matchup">
                      <span className="teams">{gameInfo.displayText}</span>
                      {gameInfo.time && (
                        <span className="game-time">{gameInfo.time}</span>
                      )}
                    </div>
                    <div className="game-pitchers">
                      <span className={`pitchers ${!gameInfo.isValidForAnalysis ? 'incomplete' : ''}`}>
                        {gameInfo.pitcherText}
                      </span>
                    </div>
                    {game.venue && (
                      <div className="game-venue">
                        <span className="venue">{getVenueName(game.venue)}</span>
                      </div>
                    )}
                    {!gameInfo.isValidForAnalysis && (
                      <div className="incomplete-warning">
                        <span>⚠️ Pitchers not confirmed</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Games Message */}
        {selectedGames.length === 0 && (
          <div className="no-games-message">
            <div className="no-games-content">
              <span className="no-games-icon">📅</span>
              <h3>No games scheduled</h3>
              <p>No games found for the selected date. Try selecting a different date with scheduled MLB games.</p>
            </div>
          </div>
        )}

        {/* Analysis Button */}
        <div className="analysis-controls">
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className={`analyze-button ${loading ? 'loading' : ''} ${!canAnalyze ? 'disabled' : ''}`}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Analyzing Matchups...
              </>
            ) : (
              <>
                <span className="analyze-icon">🎯</span>
                Analyze {selectedValidGames.length} Selected Matchup{selectedValidGames.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
          
          {!canAnalyze && !loading && (
            <div className="analyze-help">
              {gamesCount === 0 ? (
                <p>Select a date with scheduled games to begin analysis</p>
              ) : selectedGameIds.length === 0 ? (
                <p>Select at least one game to analyze</p>
              ) : selectedValidGames.length === 0 ? (
                <p>Selected games need confirmed pitcher assignments</p>
              ) : (
                <p>Ready to analyze selected matchups</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Analysis Info */}
      <div className="analysis-info">
        <div className="info-grid">
          <div className="info-item">
            <h4>Weakspot Analysis</h4>
            <p>Identifies pitcher vulnerabilities by lineup position and inning patterns</p>
          </div>
          <div className="info-item">
            <h4>Predictability Scoring</h4>
            <p>Measures how predictable a pitcher's sequences are for strategic advantage</p>
          </div>
          <div className="info-item">
            <h4>Arsenal Matchups</h4>
            <p>Analyzes hitter success rates against specific pitch types and arsenals</p>
          </div>
          <div className="info-item">
            <h4>Confidence Levels</h4>
            <p>Every opportunity includes confidence scoring based on sample sizes and reliability</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchupSelector;