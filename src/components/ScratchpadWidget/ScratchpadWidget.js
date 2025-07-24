import React, { useState } from 'react';
import { usePlayerScratchpad } from '../../contexts/PlayerScratchpadContext';
import './ScratchpadWidget.css';

const ScratchpadWidget = () => {
  const {
    players,
    playerCount,
    hitterCount,
    pitcherCount,
    isEmpty,
    filterEnabled,
    widgetMinimized,
    removePlayer,
    clearAllPlayers,
    toggleFilter,
    toggleWidget
  } = usePlayerScratchpad();

  const [showPlayerList, setShowPlayerList] = useState(false);

  // Don't render if empty and minimized
  if (isEmpty && widgetMinimized) {
    return null;
  }

  const handleClearAll = () => {
    if (window.confirm(`Remove all ${playerCount} players from scratchpad?`)) {
      clearAllPlayers();
      setShowPlayerList(false);
    }
  };

  const handleToggleFilter = () => {
    // Prevent enabling filter when there are no players
    if (!filterEnabled && isEmpty) {
      alert('Please add players to the scratchpad before enabling the filter.');
      return;
    }
    
    toggleFilter();
    // Show success feedback
    const message = filterEnabled 
      ? 'Scratchpad filter disabled - showing all players'
      : 'Scratchpad filter enabled - showing only selected players';
    
    // You could add a toast notification here
    console.log(message);
  };

  return (
    <div className={`scratchpad-widget ${widgetMinimized ? 'minimized' : 'expanded'}`}>
      {/* Widget Header */}
      <div className="scratchpad-header" onClick={toggleWidget}>
        <div className="scratchpad-title">
          <span className="scratchpad-icon">📝</span>
          <span className="scratchpad-text">Scratchpad</span>
          <span className="player-count-badge">{playerCount}</span>
          {filterEnabled && (
            <span className="filter-indicator" title="Scratchpad filter is active">🔍</span>
          )}
        </div>
        <button 
          className="minimize-button"
          onClick={(e) => {
            e.stopPropagation();
            toggleWidget();
          }}
          title={widgetMinimized ? 'Expand scratchpad' : 'Minimize scratchpad'}
        >
          {widgetMinimized ? '▲' : '▼'}
        </button>
      </div>

      {/* Widget Content (shown when expanded) */}
      {!widgetMinimized && (
        <div className="scratchpad-content">
          {isEmpty ? (
            <div className="empty-state">
              <p>No players selected</p>
              <small>Long-press on players to add them</small>
            </div>
          ) : (
            <>
              {/* Player Type Summary */}
              <div className="player-summary">
                <div className="summary-item">
                  <span className="summary-icon">⚾</span>
                  <span className="summary-count">{hitterCount}</span>
                  <span className="summary-label">Hitters</span>
                </div>
                <div className="summary-item">
                  <span className="summary-icon">🥎</span>
                  <span className="summary-count">{pitcherCount}</span>
                  <span className="summary-label">Pitchers</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="scratchpad-actions">
                <button
                  className={`filter-toggle-btn ${filterEnabled ? 'active' : ''}`}
                  onClick={handleToggleFilter}
                  title={filterEnabled ? 'Disable scratchpad filter' : 'Enable scratchpad filter'}
                >
                  <span className="filter-icon">🔍</span>
                  {filterEnabled ? 'Filter ON' : 'Filter OFF'}
                </button>

                <button
                  className="show-list-btn"
                  onClick={() => setShowPlayerList(!showPlayerList)}
                  title={showPlayerList ? 'Hide player list' : 'Show player list'}
                >
                  <span className="list-icon">📋</span>
                  {showPlayerList ? 'Hide List' : 'Show List'}
                </button>

                <button
                  className="clear-all-btn"
                  onClick={handleClearAll}
                  title="Clear all players"
                >
                  <span className="clear-icon">🗑️</span>
                  Clear All
                </button>
              </div>

              {/* Player List (when expanded) */}
              {showPlayerList && (
                <div className="player-list">
                  <div className="player-list-header">
                    <h4>Selected Players</h4>
                  </div>
                  <div className="player-items">
                    {players.map((player) => (
                      <div key={player.id} className="player-item">
                        <div className="player-info">
                          <span className="player-name">{player.name}</span>
                          <span className="player-team">{player.team}</span>
                          <span className={`player-type ${player.playerType}`}>
                            {player.playerType === 'hitter' ? '⚾' : '🥎'}
                          </span>
                        </div>
                        <button
                          className="remove-player-btn"
                          onClick={() => removePlayer(player.id)}
                          title={`Remove ${player.name}`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Filter Status Indicator */}
      {filterEnabled && (
        <div className="filter-active-indicator">
          <span className="filter-indicator-icon">🔍</span>
          <span className="filter-indicator-text">Filtering Active</span>
        </div>
      )}
    </div>
  );
};

export default ScratchpadWidget;