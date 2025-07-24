import React, { useState } from 'react';
import { usePlayerScratchpad } from '../../contexts/PlayerScratchpadContext';
import { useDraggable } from '../../hooks/useDraggable';
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
    widgetPosition,
    positionPreset,
    removePlayer,
    clearAllPlayers,
    toggleFilter,
    toggleWidget,
    updateWidgetPosition,
    setPositionToLeft,
    setPositionToRight,
    setPositionToCenter,
    resetWidgetPosition
  } = usePlayerScratchpad();

  const [showPlayerList, setShowPlayerList] = useState(false);
  const [showPositionControls, setShowPositionControls] = useState(false);

  // Set up draggable functionality
  const draggable = useDraggable({
    initialPosition: widgetPosition,
    onPositionChange: updateWidgetPosition,
    boundaries: {
      minX: 10,
      maxX: window.innerWidth - 320, // Widget width + padding
      minY: 60,                       // Below header
      maxY: window.innerHeight - 100  // Above bottom
    }
  });

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
    toggleFilter();
    // Show success feedback
    const message = filterEnabled 
      ? 'Scratchpad filter disabled - showing all players'
      : 'Scratchpad filter enabled - showing only selected players';
    
    // You could add a toast notification here
    console.log(message);
  };

  return (
    <div 
      className={`scratchpad-widget ${widgetMinimized ? 'minimized' : 'expanded'} ${draggable.isDragging ? 'dragging' : ''}`}
      {...draggable.dragHandlers}
      ref={draggable.ref}
    >
      {/* Widget Header */}
      <div className="scratchpad-header">
        {/* Drag Handle */}
        <div className="drag-handle" title="Drag to move">
          <div className="drag-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>

        {/* Title Section */}
        <div className="scratchpad-title" onClick={toggleWidget}>
          <span className="scratchpad-icon">📝</span>
          <span className="scratchpad-text">Scratchpad</span>
          <span className="player-count-badge">{playerCount}</span>
        </div>

        {/* Header Controls */}
        <div className="header-controls">
          {/* Position Controls Button */}
          <button 
            className={`position-button ${showPositionControls ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowPositionControls(!showPositionControls);
            }}
            title="Position controls"
          >
            📍
          </button>

          {/* Minimize Button */}
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
      </div>

      {/* Position Controls (shown when active) */}
      {showPositionControls && !widgetMinimized && (
        <div className="position-controls">
          <div className="position-buttons">
            <button 
              className={`pos-btn ${positionPreset === 'left' ? 'active' : ''}`}
              onClick={setPositionToLeft}
              title="Move to left"
            >
              ← Left
            </button>
            <button 
              className={`pos-btn ${positionPreset === 'center' ? 'active' : ''}`}
              onClick={setPositionToCenter}
              title="Move to center"
            >
              ↑ Center
            </button>
            <button 
              className={`pos-btn ${positionPreset === 'right' ? 'active' : ''}`}
              onClick={setPositionToRight}
              title="Move to right"
            >
              → Right
            </button>
            <button 
              className="pos-btn reset"
              onClick={resetWidgetPosition}
              title="Reset position"
            >
              🔄 Reset
            </button>
          </div>
          <div className="position-info">
            Current: {positionPreset === 'custom' ? `Custom (${Math.round(draggable.position.x)}, ${Math.round(draggable.position.y)})` : positionPreset}
          </div>
        </div>
      )}

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