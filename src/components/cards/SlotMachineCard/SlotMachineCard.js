// src/components/cards/SlotMachineCard/SlotMachineCard.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './SlotMachineCard.css';

// Available prop types
const PROP_TYPES = [
  { key: 'hits', label: 'Hits', emoji: '💥', numbers: [1, 2, 3] },
  { key: 'homeruns', label: 'Home Runs', emoji: '⚾', numbers: [1, 2] },
  { key: 'bases', label: 'Total Bases', emoji: '🏃', numbers: [1, 2, 3] }
];

// Individual slot reel component for players
const PlayerReel = ({ players, isSpinning, finalPlayer, reelIndex, onSpinComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayPlayer, setDisplayPlayer] = useState(players[0] || null);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (isSpinning && players.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % players.length);
      }, 80);

      // Each reel stops at different times: reel 1, then reel 2, then reel 3
      const spinDuration = 2000 + (reelIndex * 800); // More staggered timing
      timeoutRef.current = setTimeout(() => {
        clearInterval(intervalRef.current);
        
        const finalIndex = players.findIndex(p => 
          p.name === finalPlayer.name && p.team === finalPlayer.team
        );
        
        if (finalIndex !== -1) {
          setCurrentIndex(finalIndex);
          setDisplayPlayer(finalPlayer);
        }
        
        setTimeout(() => onSpinComplete('player', reelIndex), 200);
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

  return (
    <div className={`slot-reel player-reel ${isSpinning ? 'spinning' : ''}`}>
      <div className="reel-container">
        <div className="player-slot">
          <div 
            className="player-rank"
            style={{ backgroundColor: displayPlayer.teamColor || '#0056b3' }}
          >
            {displayPlayer.teamLogo && (
              <img 
                src={displayPlayer.teamLogo} 
                alt={displayPlayer.teamName}
                className="rank-logo"
              />
            )}
            <div className="rank-overlay"></div>
            <span className="rank-number">{reelIndex + 1}</span>
          </div>
          
          <div className="player-info">
            <div className="player-name">{displayPlayer.name}</div>
            <div className="player-team" style={{ color: displayPlayer.teamColor || '#666' }}>
              {displayPlayer.team}
            </div>
          </div>
          
          <div className="player-stats">
            <div className="stat-item">
              <span className="stat-value">{displayPlayer.HR || 0}</span>
              <span className="stat-label">HR</span>
            </div>
{/*             <div className="stat-item">
              <span className="stat-value">{displayPlayer.H || 0}</span>
              <span className="stat-label">H</span>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

// Prop type reel component
const PropReel = ({ isSpinning, finalProp, reelIndex, onSpinComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayProp, setDisplayProp] = useState(PROP_TYPES[0]);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (isSpinning) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % PROP_TYPES.length);
      }, 120);

      // Stop 300ms after the player reel for this column
      const spinDuration = 2300 + (reelIndex * 800);
      timeoutRef.current = setTimeout(() => {
        clearInterval(intervalRef.current);
        
        const finalIndex = PROP_TYPES.findIndex(p => p.key === finalProp.key);
        if (finalIndex !== -1) {
          setCurrentIndex(finalIndex);
          setDisplayProp(finalProp);
        }
        
        setTimeout(() => onSpinComplete('prop', reelIndex), 200);
      }, spinDuration);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isSpinning, finalProp, reelIndex, onSpinComplete]);

  useEffect(() => {
    setDisplayProp(PROP_TYPES[currentIndex]);
  }, [currentIndex]);

  return (
    <div className={`slot-reel prop-reel ${isSpinning ? 'spinning' : ''}`}>
      <div className="reel-container">
        <div className="prop-slot">
          <div className="prop-emoji">{displayProp.emoji}</div>
          <div className="prop-label">{displayProp.label}</div>
        </div>
      </div>
    </div>
  );
};

// Number reel component
const NumberReel = ({ isSpinning, finalNumber, availableNumbers, reelIndex, onSpinComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayNumber, setDisplayNumber] = useState(availableNumbers[0] || 1);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (isSpinning && availableNumbers.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % availableNumbers.length);
      }, 90);

      // Stop 300ms after the prop reel for this column
      const spinDuration = 2600 + (reelIndex * 800);
      timeoutRef.current = setTimeout(() => {
        clearInterval(intervalRef.current);
        
        const finalIndex = availableNumbers.findIndex(n => n === finalNumber);
        if (finalIndex !== -1) {
          setCurrentIndex(finalIndex);
          setDisplayNumber(finalNumber);
        }
        
        setTimeout(() => onSpinComplete('number', reelIndex), 200);
      }, spinDuration);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isSpinning, finalNumber, availableNumbers, reelIndex, onSpinComplete]);

  useEffect(() => {
    if (availableNumbers.length > 0) {
      setDisplayNumber(availableNumbers[currentIndex]);
    }
  }, [currentIndex, availableNumbers]);

  return (
    <div className={`slot-reel number-reel ${isSpinning ? 'spinning' : ''}`}>
      <div className="reel-container">
        <div className="number-slot">
          <div className="number-display">{displayNumber}</div>
          <div className="number-label">Count</div>
        </div>
      </div>
    </div>
  );
};

// Player picker component
const PlayerPicker = ({ availablePlayers, selectedPlayers, onTogglePlayer, teams }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState('hitters'); // Default to hitters only
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPlayers = availablePlayers.filter(player => {
    // Apply type filter - only allow hitters
    const isHitter = player.playerType === 'hitter' || !player.playerType;
    if (!isHitter) return false;
    
    // Apply search filter
    const passesSearchFilter = !searchTerm || 
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.team.toLowerCase().includes(searchTerm.toLowerCase());
    
    return passesSearchFilter;
  });

  return (
    <div className="player-picker">
      <div className="picker-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h4>Select Hitters ({selectedPlayers.length} selected)</h4>
        <button className="expand-btn">
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="picker-content">
          <div className="picker-controls">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
          
          <div className="players-grid">
            {filteredPlayers.map((player, index) => {
              const isSelected = selectedPlayers.some(p => 
                p.name === player.name && p.team === player.team
              );
              
              return (
                <div 
                  key={`${player.name}-${player.team}`}
                  className={`player-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => onTogglePlayer(player)}
                >
                  <div className="option-info">
                    <span className="option-name">{player.name}</span>
                    <span className="option-team" style={{ color: player.teamColor }}>
                      {player.team}
                    </span>
                  </div>
                  <div className="option-stats">
                    <span className="option-stat">{player.HR || 0} HR</span>
                  </div>
                  <div className="selection-indicator">
                    {isSelected ? '✓' : '+'}
                  </div>
                </div>
              );
            })}
            
            {filteredPlayers.length === 0 && (
              <div className="no-players-found">
                <p>No players found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Quick add buttons for popular card data
const QuickAddButtons = ({ onQuickAdd, isLoading }) => {
  const quickAddOptions = [
    { 
      label: 'HR Leaders', 
      key: 'hr-leaders',
      description: 'Add top home run hitters'
    },
    { 
      label: 'Hit Streaks', 
      key: 'hit-streaks',
      description: 'Add players with active hit streaks'
    },
    { 
      label: 'Hot Hitters', 
      key: 'hot-hitters',
      description: 'Add recently performing hitters'
    }
  ];

  return (
    <div className="quick-add-section">
      <h4>Quick Add From Dashboard Cards</h4>
      <div className="quick-add-buttons">
        {quickAddOptions.map(option => (
          <button
            key={option.key}
            className="quick-add-btn"
            onClick={() => onQuickAdd(option.key)}
            disabled={isLoading}
          >
            <span className="quick-add-label">{option.label}</span>
            <span className="quick-add-desc">{option.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Main slot machine component
const SlotMachineCard = ({ 
  playerData = [], 
  teamData = {}, 
  rollingStats = {}, 
  topPerformers = {}, 
  hitStreakData = {},
  playersWithHomeRunPrediction = []
}) => {
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [results, setResults] = useState({
    players: [null, null, null],
    props: [null, null, null],
    numbers: [null, null, null]
  });
  // Track completion by component type AND reel index
  const [completedReels, setCompletedReels] = useState({
    player: [false, false, false],
    prop: [false, false, false],
    number: [false, false, false]
  });
  const [hasSpun, setHasSpun] = useState(false);

  // Process player data to include team info and filter to hitters only
  const processedPlayerData = playerData
    .filter(player => player.playerType === 'hitter' || !player.playerType)
    .map(player => {
      const team = teamData[player.team] || {};
      return {
        ...player,
        teamColor: team.primaryColor,
        teamLogo: team.logoUrl,
        teamName: team.name
      };
    });

  // Check if a player is in top 5 of any category
  const isTopPerformer = (player) => {
    // Check if player appears in top 5 of any card category
    const inHRLeaders = (rollingStats.homers || []).slice(0, 5).some(p => 
      p.name === player.name && p.team === player.team);
    const inHitLeaders = (rollingStats.hitters || []).slice(0, 5).some(p => 
      p.name === player.name && p.team === player.team);
    const inHRRate = (topPerformers.hrRate || []).slice(0, 5).some(p => 
      (p.fullName || p.name) === player.name && p.team === player.team);
    const inHitStreaks = (hitStreakData.hitStreaks || []).slice(0, 5).some(p => 
      p.name === player.name && p.team === player.team);
    const inRecent = (topPerformers.recent || []).slice(0, 5).some(p => 
      (p.fullName || p.name) === player.name && p.team === player.team);
    
    return inHRLeaders || inHitLeaders || inHRRate || inHitStreaks || inRecent;
  };

  // Generate numbers based on prop type and player performance
  const generateNumbersForProp = (propType, player) => {
  if (propType.key === 'homeruns') {
    const numbers = [1];
    
    // Only add 2 if player is top performer
    if (isTopPerformer(player)) {
      // Low probability for 2 HRs - add multiple 1s to weight against 2
      numbers.push(1, 1, 1, 2); // 20% chance for 2, 80% for 1
    }
    
    return numbers;
  } else if (propType.key === 'hits' || propType.key === 'bases') {
    const numbers = [1];
    numbers.push(1, 1, 1, 2, 2, 3); // Weighted: 1: 50%, 2: 33.3%, 3: 16.7%
  }
  
  // Fallback for other prop types
  return propType.numbers;
};

  // Select final number with weighted probability
  const selectFinalNumber = (availableNumbers) => {
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    return availableNumbers[randomIndex];
  };

  const handleTogglePlayer = (player) => {
    // Only allow hitters
    if (player.playerType === 'pitcher') return;
    
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

  const handleQuickAdd = (type) => {
    let playersToAdd = [];
    
    console.log(`[SlotMachine] Quick-adding ${type}`);
    console.log('[SlotMachine] Available data:', {
      hrLeaders: rollingStats.homers?.length || 0,
      hitStreaks: hitStreakData.hitStreaks?.length || 0,
      hotHitters: topPerformers.recent?.length || 0,
      hitStreakDataStructure: Object.keys(hitStreakData)
    });
    
    switch (type) {
      case 'hr-leaders':
        playersToAdd = (rollingStats.homers || []).slice(0, 8);
        console.log('[SlotMachine] HR Leaders added:', playersToAdd.length);
        break;
      case 'hit-streaks':
        // Try different possible data structures for hit streaks
        let hitStreakPlayers = [];
        if (hitStreakData.hitStreaks && Array.isArray(hitStreakData.hitStreaks)) {
          hitStreakPlayers = hitStreakData.hitStreaks;
        } else if (hitStreakData.likelyToContinueStreak && Array.isArray(hitStreakData.likelyToContinueStreak)) {
          hitStreakPlayers = hitStreakData.likelyToContinueStreak;
        } else if (Array.isArray(hitStreakData)) {
          hitStreakPlayers = hitStreakData;
        }
        
        playersToAdd = hitStreakPlayers.slice(0, 6);
        console.log('[SlotMachine] Hit Streaks found:', hitStreakPlayers.length, 'adding:', playersToAdd.length);
        console.log('[SlotMachine] Hit Streak sample data:', playersToAdd.slice(0, 2));
        break;
      case 'hot-hitters':
        playersToAdd = (topPerformers.recent || []).slice(0, 8);
        console.log('[SlotMachine] Hot Hitters added:', playersToAdd.length);
        break;
      default:
        console.log('[SlotMachine] Unknown quick-add type:', type);
        return;
    }

    if (playersToAdd.length === 0) {
      console.warn(`[SlotMachine] No players found for ${type}`);
      return;
    }

    // Process and add players that aren't already selected
    const processedPlayersToAdd = playersToAdd
      .map(player => {
        const team = teamData[player.team] || {};
        return {
          ...player,
          name: player.fullName || player.name, // Use fullName if available
          teamColor: team.primaryColor,
          teamLogo: team.logoUrl,
          teamName: team.name
        };
      })
      .filter(player => !selectedPlayers.some(p => 
        p.name === player.name && p.team === player.team
      ));

    console.log('[SlotMachine] Processed players to add:', processedPlayersToAdd.length);
    setSelectedPlayers(prev => [...prev, ...processedPlayersToAdd]);
  };

  const handleSpin = () => {
    if (selectedPlayers.length < 3) {
      alert('Please select at least 3 hitters to spin!');
      return;
    }

    setIsSpinning(true);
    setHasSpun(true);
    // Reset completion tracking for all components
    setCompletedReels({
      player: [false, false, false],
      prop: [false, false, false],
      number: [false, false, false]
    });

    // Randomly select 3 unique players
    const shuffledPlayers = [...selectedPlayers].sort(() => Math.random() - 0.5);
    const selectedPlayersForSpin = shuffledPlayers.slice(0, 3);

    // Randomly select props for each reel
    const selectedProps = Array(3).fill().map(() => {
      const randomIndex = Math.floor(Math.random() * PROP_TYPES.length);
      return PROP_TYPES[randomIndex];
    });

    // Generate numbers based on props and players
    const selectedNumbers = selectedPlayersForSpin.map((player, index) => {
      const prop = selectedProps[index];
      const availableNumbers = generateNumbersForProp(prop, player);
      return selectFinalNumber(availableNumbers);
    });

    setResults({
      players: selectedPlayersForSpin,
      props: selectedProps,
      numbers: selectedNumbers
    });
  };

  // Updated completion handler - tracks by component type AND reel index
  const handleReelComplete = useCallback((componentType, reelIndex) => {
    console.log(`[SlotMachine] ${componentType} reel ${reelIndex} completed`);
    
    setCompletedReels(prev => {
      const updated = {
        ...prev,
        [componentType]: prev[componentType].map((completed, index) => 
          index === reelIndex ? true : completed
        )
      };
      
      // Check if this entire reel (column) is now complete
      const reelComplete = updated.player[reelIndex] && updated.prop[reelIndex] && updated.number[reelIndex];
      
      console.log(`[SlotMachine] ${componentType} reel ${reelIndex} completed. Reel status:`, {
        player: updated.player[reelIndex],
        prop: updated.prop[reelIndex], 
        number: updated.number[reelIndex],
        reelComplete
      });
      
      return updated;
    });
  }, []);

  const handleReset = () => {
    setIsSpinning(false);
    setResults({
      players: [null, null, null],
      props: [null, null, null],
      numbers: [null, null, null]
    });
    setCompletedReels({
      player: [false, false, false],
      prop: [false, false, false],
      number: [false, false, false]
    });
    setHasSpun(false);
  };

  const handleClearAll = () => {
    setSelectedPlayers([]);
    handleReset();
  };

  // Check if all reels (columns) are complete - each reel needs all 3 components complete
  const allReelsComplete = [0, 1, 2].every(reelIndex => 
    completedReels.player[reelIndex] && 
    completedReels.prop[reelIndex] && 
    completedReels.number[reelIndex]
  );

  const completedReelCount = [0, 1, 2].filter(reelIndex => 
    completedReels.player[reelIndex] && 
    completedReels.prop[reelIndex] && 
    completedReels.number[reelIndex]
  ).length;

  useEffect(() => {
    console.log(`[SlotMachine] Completion check: ${completedReelCount}/3 reels complete, allComplete: ${allReelsComplete}, isSpinning: ${isSpinning}`);
    console.log('[SlotMachine] Completion details:', completedReels);
    
    if (allReelsComplete && isSpinning) {
      console.log('[SlotMachine] All reels complete, stopping spin in 500ms');
      setTimeout(() => {
        console.log('[SlotMachine] Setting isSpinning to false');
        setIsSpinning(false);
      }, 500);
    }
  }, [allReelsComplete, isSpinning, completedReelCount, completedReels]);

  // Debug logging
  useEffect(() => {
    console.log('[SlotMachine] Component mounted with data:', {
      playerDataCount: playerData.length,
      hitStreakDataKeys: Object.keys(hitStreakData),
      hitStreaksCount: hitStreakData.hitStreaks?.length || 0,
      rollingStatsKeys: Object.keys(rollingStats),
      topPerformersKeys: Object.keys(topPerformers)
    });
  }, []);

  return (
    <div className="card slot-machine-card">
      <div className="card-header">
        <h3>🎰 Pick 'Em Prop Machine</h3>
        <div className="header-subtitle">
          Build your player pool and spin for 3 random prop betting options!
        </div>
      </div>

      <QuickAddButtons 
        onQuickAdd={handleQuickAdd}
        isLoading={isSpinning}
      />

      <PlayerPicker 
        availablePlayers={processedPlayerData}
        selectedPlayers={selectedPlayers}
        onTogglePlayer={handleTogglePlayer}
        teams={teamData}
      />

      <div className="slot-machine">
        <div className="machine-display">
          {selectedPlayers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <p>Select hitters above or use quick add buttons to get started!</p>
            </div>
          ) : (
            <div className="reels-section">
              {/* Player Row */}
              <div className="reel-row player-row">
                <div className="row-label">Player</div>
                <div className="reels-container">
                  {[0, 1, 2].map(reelIndex => (
                    <PlayerReel
                      key={`player-${reelIndex}`}
                      players={selectedPlayers}
                      isSpinning={isSpinning}
                      finalPlayer={results.players[reelIndex]}
                      reelIndex={reelIndex}
                      onSpinComplete={handleReelComplete}
                    />
                  ))}
                </div>
              </div>

              {/* Prop Type Row */}
              <div className="reel-row prop-row">
                <div className="row-label">Prop</div>
                <div className="reels-container">
                  {[0, 1, 2].map(reelIndex => (
                    <PropReel
                      key={`prop-${reelIndex}`}
                      isSpinning={isSpinning}
                      finalProp={results.props[reelIndex]}
                      reelIndex={reelIndex}
                      onSpinComplete={handleReelComplete}
                    />
                  ))}
                </div>
              </div>

              {/* Number Row */}
              <div className="reel-row number-row">
                <div className="row-label">Count</div>
                <div className="reels-container">
                  {[0, 1, 2].map(reelIndex => {
                    const player = results.players[reelIndex];
                    const prop = results.props[reelIndex];
                    // Use default numbers when not spinning or no results yet
                    const availableNumbers = (player && prop && isSpinning) ? 
                      generateNumbersForProp(prop, player) : [1, 2, 3];
                    
                    return (
                      <NumberReel
                        key={`number-${reelIndex}`}
                        isSpinning={isSpinning}
                        finalNumber={results.numbers[reelIndex]}
                        availableNumbers={availableNumbers}
                        reelIndex={reelIndex}
                        onSpinComplete={handleReelComplete}
                      />
                    );
                  })}
                </div>
              </div>
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
                SPIN FOR PROPS!
              </>
            )}
          </button>
          
          <div className="control-buttons">
            {hasSpun && !isSpinning && (
              <button className="reset-btn" onClick={handleReset}>
                🔄 New Spin
              </button>
            )}
            
            {selectedPlayers.length > 0 && (
              <button className="clear-btn" onClick={handleClearAll}>
                🗑️ Clear All
              </button>
            )}
          </div>
        </div>

        {allReelsComplete && !isSpinning && (
          <div className="results-banner">
            <div className="banner-content">
              <h4>🎉 Your Prop Bets Are Ready! 🎉</h4>
              <p>Here are your 3 random prop bet selections:</p>
              <div className="results-summary">
                {results.players.map((player, index) => {
                  const prop = results.props[index];
                  const number = results.numbers[index];
                  const isTopPlayer = isTopPerformer(player);
                  
                  return (
                    <div key={index} className="result-item">
                      <div className="result-main">
                        <strong>{player.name}</strong> - {number}+ {prop.label}
                        {isTopPlayer && prop.key === 'homeruns' && number === 2 && (
                          <span className="rare-indicator">⭐ RARE BET!</span>
                        )}
                      </div>
                      <div className="result-detail">
                        {player.team} • {prop.emoji} {prop.label} • Count: {number}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlotMachineCard;