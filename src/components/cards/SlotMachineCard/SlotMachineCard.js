import React, { useState, useEffect, useRef } from 'react';

// Sample data for demonstration
const sampleTeams = {
  "LAD": { name: "Los Angeles Dodgers", primaryColor: "#005A9C", logoUrl: "/data/logos/los-angeles-dodgers.svg" },
  "NYY": { name: "New York Yankees", primaryColor: "#003087", logoUrl: "/data/logos/new-york-yankees.svg" },
  "HOU": { name: "Houston Astros", primaryColor: "#002D62", logoUrl: "/data/logos/houston-astros.svg" },
  "ATL": { name: "Atlanta Braves", primaryColor: "#CE1141", logoUrl: "/data/logos/atlanta-braves.svg" },
  "SD": { name: "San Diego Padres", primaryColor: "#2F241D", logoUrl: "/data/logos/san-diego-padres.svg" }
};

const samplePlayers = [
  { name: "Mookie Betts", team: "LAD", playerType: "hitter", HR: 15, AVG: ".285" },
  { name: "Aaron Judge", team: "NYY", playerType: "hitter", HR: 22, AVG: ".312" },
  { name: "Jose Altuve", team: "HOU", playerType: "hitter", HR: 8, AVG: ".298" },
  { name: "Ronald Acuña Jr.", team: "ATL", playerType: "hitter", HR: 18, AVG: ".276" },
  { name: "Manny Machado", team: "SD", playerType: "hitter", HR: 12, AVG: ".267" },
  { name: "Shohei Ohtani", team: "LAD", playerType: "hitter", HR: 25, AVG: ".305" },
  { name: "Gerrit Cole", team: "NYY", playerType: "pitcher", K: 45, ERA: "3.21" },
  { name: "Spencer Strider", team: "ATL", playerType: "pitcher", K: 52, ERA: "2.95" }
];

// Individual slot reel component
const SlotReel = ({ players, isSpinning, finalPlayer, reelIndex, onSpinComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayPlayer, setDisplayPlayer] = useState(players[0] || null);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (isSpinning && players.length > 0) {
      // Start spinning animation
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % players.length);
      }, 100); // Fast spinning

      // Stop spinning after a delay (staggered for each reel)
      const spinDuration = 2000 + (reelIndex * 500); // Each reel stops 500ms after the previous
      timeoutRef.current = setTimeout(() => {
        clearInterval(intervalRef.current);
        
        // Find the final player in our list
        const finalIndex = players.findIndex(p => 
          p.name === finalPlayer.name && p.team === finalPlayer.team
        );
        
        if (finalIndex !== -1) {
          setCurrentIndex(finalIndex);
          setDisplayPlayer(finalPlayer);
        }
        
        // Notify parent that this reel has finished
        setTimeout(() => onSpinComplete(reelIndex), 200);
      }, spinDuration);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isSpinning, finalPlayer, players, reelIndex, onSpinComplete]);

  useEffect(() => {
    if (players.length > 0) {
      setDisplayPlayer(players[currentIndex]);
    }
  }, [currentIndex, players]);

  if (!displayPlayer) return null;

  const team = sampleTeams[displayPlayer.team] || {};

  return (
    <div className={`slot-reel ${isSpinning ? 'spinning' : ''}`}>
      <div className="reel-container">
        <div className="player-slot">
          <div 
            className="player-rank"
            style={{ backgroundColor: team.primaryColor || '#0056b3' }}
          >
            <img 
              src={team.logoUrl} 
              alt={team.name}
              className="rank-logo"
            />
            <div className="rank-overlay"></div>
            <span className="rank-number">{reelIndex + 1}</span>
          </div>
          
          <div className="player-info">
            <div className="player-name">{displayPlayer.name}</div>
            <div className="player-team" style={{ color: team.primaryColor || '#666' }}>
              {displayPlayer.team}
            </div>
          </div>
          
          <div className="player-stats">
            {displayPlayer.playerType === 'hitter' ? (
              <>
                <div className="stat-item">
                  <span className="stat-value">{displayPlayer.HR}</span>
                  <span className="stat-label">HR</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{displayPlayer.AVG}</span>
                  <span className="stat-label">AVG</span>
                </div>
              </>
            ) : (
              <>
                <div className="stat-item">
                  <span className="stat-value">{displayPlayer.K}</span>
                  <span className="stat-label">K</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{displayPlayer.ERA}</span>
                  <span className="stat-label">ERA</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Player picker component
const PlayerPicker = ({ availablePlayers, selectedPlayers, onTogglePlayer }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState('all');

  const filteredPlayers = availablePlayers.filter(player => {
    if (filter === 'hitters') return player.playerType === 'hitter' || !player.playerType;
    if (filter === 'pitchers') return player.playerType === 'pitcher';
    return true;
  });

  return (
    <div className="player-picker">
      <div className="picker-header">
        <h4>Select Players ({selectedPlayers.length} selected)</h4>
        <button 
          className="expand-btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="picker-content">
          <div className="filter-tabs">
            <button 
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button 
              className={`filter-tab ${filter === 'hitters' ? 'active' : ''}`}
              onClick={() => setFilter('hitters')}
            >
              Hitters
            </button>
            <button 
              className={`filter-tab ${filter === 'pitchers' ? 'active' : ''}`}
              onClick={() => setFilter('pitchers')}
            >
              Pitchers
            </button>
          </div>
          
          <div className="players-grid">
            {filteredPlayers.map((player, index) => {
              const isSelected = selectedPlayers.some(p => 
                p.name === player.name && p.team === player.team
              );
              const team = sampleTeams[player.team] || {};
              
              return (
                <div 
                  key={`${player.name}-${player.team}`}
                  className={`player-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => onTogglePlayer(player)}
                >
                  <div className="option-info">
                    <span className="option-name">{player.name}</span>
                    <span className="option-team" style={{ color: team.primaryColor }}>
                      {player.team}
                    </span>
                  </div>
                  <div className="selection-indicator">
                    {isSelected ? '✓' : '+'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Main slot machine component
const SlotMachineCard = () => {
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [results, setResults] = useState([null, null, null]);
  const [completedReels, setCompletedReels] = useState([false, false, false]);
  const [hasSpun, setHasSpun] = useState(false);

  const handleTogglePlayer = (player) => {
    setSelectedPlayers(prev => {
      const isAlreadySelected = prev.some(p => 
        p.name === player.name && p.team === player.team
      );
      
      if (isAlreadySelected) {
        return prev.filter(p => !(p.name === player.name && p.team === player.team));
      } else {
        return [...prev, player];
      }
    });
  };

  const handleSpin = () => {
    if (selectedPlayers.length < 3) {
      alert('Please select at least 3 players to spin!');
      return;
    }

    setIsSpinning(true);
    setHasSpun(true);
    setCompletedReels([false, false, false]);

    // Randomly select 3 unique players
    const shuffled = [...selectedPlayers].sort(() => Math.random() - 0.5);
    const newResults = shuffled.slice(0, 3);
    setResults(newResults);
  };

  const handleReelComplete = (reelIndex) => {
    setCompletedReels(prev => {
      const updated = [...prev];
      updated[reelIndex] = true;
      return updated;
    });
  };

  const handleReset = () => {
    setIsSpinning(false);
    setResults([null, null, null]);
    setCompletedReels([false, false, false]);
    setHasSpun(false);
  };

  const allReelsComplete = completedReels.every(completed => completed);

  useEffect(() => {
    if (allReelsComplete && isSpinning) {
      setTimeout(() => {
        setIsSpinning(false);
      }, 500);
    }
  }, [allReelsComplete, isSpinning]);

  return (
    <div className="card slot-machine-card">
      <div className="card-header">
        <h3>🎰 Pick 'Em Opt Machine</h3>
        <div className="header-subtitle">
          Select your players and spin for 3 random picks!
        </div>
      </div>

      <PlayerPicker 
        availablePlayers={samplePlayers}
        selectedPlayers={selectedPlayers}
        onTogglePlayer={handleTogglePlayer}
      />

      <div className="slot-machine">
        <div className="machine-display">
          <div className="reels-container">
            {[0, 1, 2].map(reelIndex => (
              <SlotReel
                key={reelIndex}
                players={selectedPlayers}
                isSpinning={isSpinning}
                finalPlayer={results[reelIndex]}
                reelIndex={reelIndex}
                onSpinComplete={handleReelComplete}
              />
            ))}
          </div>
          
          {selectedPlayers.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <p>Select players above to get started!</p>
            </div>
          )}
        </div>

        <div className="machine-controls">
          <button 
            className={`spin-btn ${isSpinning ? 'spinning' : ''}`}
            onClick={handleSpin}
            disabled={isSpinning || selectedPlayers.length < 3}
          >
            {isSpinning ? (
              <>
                <span className="spinner">🎰</span>
                Spinning...
              </>
            ) : (
              <>
                <span className="lever">🎰</span>
                SPIN IT!
              </>
            )}
          </button>
          
          {hasSpun && !isSpinning && (
            <button className="reset-btn" onClick={handleReset}>
              Reset Machine
            </button>
          )}
        </div>

        {allReelsComplete && !isSpinning && (
          <div className="results-banner">
            <div className="banner-content">
              <h4>🎉 Your Picks Are In! 🎉</h4>
              <p>Here are your 3 random selections for today's bets!</p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .slot-machine-card {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: white;
          min-height: 500px;
          border: 2px solid #ffd700;
          box-shadow: 0 8px 32px rgba(255, 215, 0, 0.3);
          position: relative;
          overflow: hidden;
        }

        .slot-machine-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 10% 20%, rgba(255, 215, 0, 0.1) 0%, transparent 20%),
            radial-gradient(circle at 80% 80%, rgba(255, 215, 0, 0.1) 0%, transparent 20%),
            radial-gradient(circle at 40% 40%, rgba(255, 215, 0, 0.05) 0%, transparent 20%);
          pointer-events: none;
        }

        .card-header {
          position: relative;
          z-index: 2;
          border-bottom: 2px solid #ffd700;
          margin-bottom: 20px;
          padding-bottom: 15px;
        }

        .card-header h3 {
          color: #ffd700;
          font-size: 1.5rem;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
          margin-bottom: 5px;
          font-weight: 700;
        }

        .header-subtitle {
          color: #e0e0e0;
          font-size: 0.9rem;
          font-style: italic;
        }

        .player-picker {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          margin-bottom: 20px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 215, 0, 0.3);
        }

        .picker-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          cursor: pointer;
        }

        .picker-header h4 {
          color: #ffd700;
          margin: 0;
          font-size: 1rem;
        }

        .expand-btn {
          background: none;
          border: none;
          color: #ffd700;
          font-size: 1.2rem;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .expand-btn:hover {
          transform: scale(1.1);
        }

        .picker-content {
          border-top: 1px solid rgba(255, 215, 0, 0.3);
          padding: 16px;
        }

        .filter-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .filter-tab {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 215, 0, 0.3);
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s ease;
        }

        .filter-tab:hover {
          background: rgba(255, 215, 0, 0.2);
        }

        .filter-tab.active {
          background: #ffd700;
          color: #1a1a2e;
          font-weight: 600;
        }

        .players-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 8px;
          max-height: 200px;
          overflow-y: auto;
        }

        .player-option {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }

        .player-option:hover {
          background: rgba(255, 215, 0, 0.1);
          border-color: rgba(255, 215, 0, 0.3);
        }

        .player-option.selected {
          background: rgba(255, 215, 0, 0.2);
          border-color: #ffd700;
        }

        .option-info {
          display: flex;
          flex-direction: column;
        }

        .option-name {
          font-size: 0.85rem;
          font-weight: 500;
          color: white;
        }

        .option-team {
          font-size: 0.75rem;
          font-weight: 600;
        }

        .selection-indicator {
          font-size: 1.2rem;
          font-weight: bold;
          color: #ffd700;
        }

        .slot-machine {
          position: relative;
          z-index: 2;
        }

        .machine-display {
          background: rgba(0, 0, 0, 0.4);
          border-radius: 12px;
          padding: 20px;
          border: 2px solid #ffd700;
          margin-bottom: 20px;
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .reels-container {
          display: flex;
          gap: 20px;
          width: 100%;
          justify-content: center;
        }

        .slot-reel {
          flex: 1;
          max-width: 200px;
        }

        .reel-container {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          transition: transform 0.3s ease;
        }

        .slot-reel.spinning .reel-container {
          animation: shake 0.1s infinite;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }

        .player-slot {
          display: flex;
          align-items: center;
          padding: 12px;
          background: white;
          color: #333;
          gap: 12px;
        }

        .player-rank {
          width: 40px;
          height: 40px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-weight: bold;
          overflow: hidden;
          flex-shrink: 0;
        }

        .rank-logo {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 4px;
          opacity: 0.7;
        }

        .rank-overlay {
          position: absolute;
          inset: 0;
          background-color: currentColor;
          opacity: 0.3;
        }

        .rank-number {
          position: relative;
          z-index: 10;
          color: white;
          font-size: 0.9rem;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .player-info {
          flex: 1;
          min-width: 0;
        }

        .player-name {
          font-weight: 600;
          font-size: 0.9rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .player-team {
          font-size: 0.75rem;
          font-weight: 600;
          margin-top: 2px;
        }

        .player-stats {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: center;
          flex-shrink: 0;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 40px;
        }

        .stat-value {
          font-weight: bold;
          font-size: 0.85rem;
          color: #0056b3;
        }

        .stat-label {
          font-size: 0.65rem;
          color: #666;
          text-transform: uppercase;
        }

        .empty-state {
          text-align: center;
          color: #ccc;
          padding: 40px 20px;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 16px;
          opacity: 0.7;
        }

        .machine-controls {
          display: flex;
          gap: 16px;
          justify-content: center;
          align-items: center;
        }

        .spin-btn {
          background: linear-gradient(45deg, #ff6b6b, #ffd700);
          border: none;
          padding: 16px 32px;
          border-radius: 8px;
          color: #1a1a2e;
          font-weight: bold;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
          display: flex;
          align-items: center;
          gap: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .spin-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 215, 0, 0.6);
        }

        .spin-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .spin-btn.spinning {
          background: linear-gradient(45deg, #ffd700, #ff6b6b);
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .spinner {
          animation: spin 0.5s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .reset-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 215, 0, 0.5);
          color: #ffd700;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .reset-btn:hover {
          background: rgba(255, 215, 0, 0.1);
          border-color: #ffd700;
        }

        .results-banner {
          background: linear-gradient(45deg, #28a745, #20c997);
          margin-top: 20px;
          padding: 16px;
          border-radius: 8px;
          text-align: center;
          animation: slideIn 0.5s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .banner-content h4 {
          margin: 0 0 8px 0;
          font-size: 1.2rem;
          color: white;
        }

        .banner-content p {
          margin: 0;
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.9rem;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .reels-container {
            flex-direction: column;
            gap: 12px;
            align-items: center;
          }

          .slot-reel {
            width: 100%;
            max-width: 280px;
          }

          .players-grid {
            grid-template-columns: 1fr;
          }

          .machine-controls {
            flex-direction: column;
            gap: 12px;
          }

          .spin-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default SlotMachineCard;