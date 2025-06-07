// src/components/cards/SlotMachineCard/SlotMachineCard.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './SlotMachineCard.css';

// Enhanced prop types with rarity system
const PROP_TYPES = [
  // Bases: 2+, 3+, 4+ (rarity: 2,2,2,2,2,3,3,4)
  { key: 'bases-2+', label: 'Total Bases 2+', emoji: '🏃', numbers: [2], rarity: 2 },
  { key: 'bases-2+', label: 'Total Bases 2+', emoji: '🏃', numbers: [2], rarity: 2 },
  { key: 'bases-2+', label: 'Total Bases 2+', emoji: '🏃', numbers: [2], rarity: 2 },
  { key: 'bases-2+', label: 'Total Bases 2+', emoji: '🏃', numbers: [2], rarity: 2 },
  { key: 'bases-2+', label: 'Total Bases 2+', emoji: '🏃', numbers: [2], rarity: 2 },
  { key: 'bases-2+', label: 'Total Bases 2+', emoji: '🏃', numbers: [2], rarity: 2 },
  { key: 'bases-2+', label: 'Total Bases 2+', emoji: '🏃', numbers: [2], rarity: 2 },
  { key: 'bases-2+', label: 'Total Bases 2+', emoji: '🏃', numbers: [2], rarity: 2 },
  { key: 'bases-2+', label: 'Total Bases 2+', emoji: '🏃', numbers: [2], rarity: 2 },
  { key: 'bases-2+', label: 'Total Bases 2+', emoji: '🏃', numbers: [2], rarity: 2 },
  { key: 'bases-3+', label: 'Total Bases 3+', emoji: '🏃‍♂️', numbers: [3], rarity: 3 },
  { key: 'bases-3+', label: 'Total Bases 3+', emoji: '🏃‍♂️', numbers: [3], rarity: 3 },
  { key: 'bases-4+', label: 'Total Bases 4+', emoji: '💨', numbers: [4], rarity: 4 },
  
  // Hits: 1+, 2+, 3+ (rarity: 1,1,1,1,1,1,2,2,3)
  { key: 'hits-1+', label: 'Hits 1+', emoji: '💥', numbers: [1], rarity: 1 },
  { key: 'hits-1+', label: 'Hits 1+', emoji: '💥', numbers: [1], rarity: 1 },
  { key: 'hits-1+', label: 'Hits 1+', emoji: '💥', numbers: [1], rarity: 1 },
  { key: 'hits-1+', label: 'Hits 1+', emoji: '💥', numbers: [1], rarity: 1 },
  { key: 'hits-1+', label: 'Hits 1+', emoji: '💥', numbers: [1], rarity: 1 },
  { key: 'hits-1+', label: 'Hits 1+', emoji: '💥', numbers: [1], rarity: 1 },
  { key: 'hits-1+', label: 'Hits 1+', emoji: '💥', numbers: [1], rarity: 1 },
  { key: 'hits-1+', label: 'Hits 1+', emoji: '💥', numbers: [1], rarity: 1 },
  { key: 'hits-1+', label: 'Hits 1+', emoji: '💥', numbers: [1], rarity: 1 },
  { key: 'hits-1+', label: 'Hits 1+', emoji: '💥', numbers: [1], rarity: 1 },
  { key: 'hits-1+', label: 'Hits 1+', emoji: '💥', numbers: [1], rarity: 1 },
  { key: 'hits-1+', label: 'Hits 1+', emoji: '💥', numbers: [1], rarity: 1 },
  { key: 'hits-2+', label: 'Hits 2+', emoji: '💥💥', numbers: [2], rarity: 2 },
  { key: 'hits-2+', label: 'Hits 2+', emoji: '💥💥', numbers: [2], rarity: 2 },
  { key: 'hits-3+', label: 'Hits 3+', emoji: '🔥', numbers: [3], rarity: 3 },
  
  // Home Runs: 1+, 2+ (rarity: 1,1,1,1,1,1,2)
  { key: 'homeruns-1+', label: 'Home Runs 1+', emoji: '⚾', numbers: [1], rarity: 1 },
  { key: 'homeruns-1+', label: 'Home Runs 1+', emoji: '⚾', numbers: [1], rarity: 1 },
  { key: 'homeruns-1+', label: 'Home Runs 1+', emoji: '⚾', numbers: [1], rarity: 1 },
  { key: 'homeruns-1+', label: 'Home Runs 1+', emoji: '⚾', numbers: [1], rarity: 1 },
  { key: 'homeruns-1+', label: 'Home Runs 1+', emoji: '⚾', numbers: [1], rarity: 1 },
  { key: 'homeruns-1+', label: 'Home Runs 1+', emoji: '⚾', numbers: [1], rarity: 1 },
  { key: 'homeruns-1+', label: 'Home Runs 1+', emoji: '⚾', numbers: [1], rarity: 1 },
  { key: 'homeruns-1+', label: 'Home Runs 1+', emoji: '⚾', numbers: [1], rarity: 1 },
  { key: 'homeruns-1+', label: 'Home Runs 1+', emoji: '⚾', numbers: [1], rarity: 1 },
  { key: 'homeruns-1+', label: 'Home Runs 1+', emoji: '⚾', numbers: [1], rarity: 1 },
  { key: 'homeruns-1+', label: 'Home Runs 1+', emoji: '⚾', numbers: [1], rarity: 1 },
  { key: 'homeruns-1+', label: 'Home Runs 1+', emoji: '⚾', numbers: [1], rarity: 1 },
  { key: 'homeruns-2+', label: 'Home Runs 2+', emoji: '🚀', numbers: [2], rarity: 2 },
  
  // Hits Runs RBI: 1+, 2+, 3+ (rarity: 1,1,1,1,1,1,2,2,3)
  { key: 'hrs-rbi-1+', label: 'H+R+RBI 1+', emoji: '📊', numbers: [1], rarity: 1 },
  { key: 'hrs-rbi-1+', label: 'H+R+RBI 1+', emoji: '📊', numbers: [1], rarity: 1 },
  { key: 'hrs-rbi-1+', label: 'H+R+RBI 1+', emoji: '📊', numbers: [1], rarity: 1 },
  { key: 'hrs-rbi-1+', label: 'H+R+RBI 1+', emoji: '📊', numbers: [1], rarity: 1 },
  { key: 'hrs-rbi-1+', label: 'H+R+RBI 1+', emoji: '📊', numbers: [1], rarity: 1 },
  { key: 'hrs-rbi-1+', label: 'H+R+RBI 1+', emoji: '📊', numbers: [1], rarity: 1 },
  { key: 'hrs-rbi-1+', label: 'H+R+RBI 1+', emoji: '📊', numbers: [1], rarity: 1 },
  { key: 'hrs-rbi-1+', label: 'H+R+RBI 1+', emoji: '📊', numbers: [1], rarity: 1 },
  { key: 'hrs-rbi-1+', label: 'H+R+RBI 1+', emoji: '📊', numbers: [1], rarity: 1 },
  { key: 'hrs-rbi-1+', label: 'H+R+RBI 1+', emoji: '📊', numbers: [1], rarity: 1 },
  { key: 'hrs-rbi-1+', label: 'H+R+RBI 1+', emoji: '📊', numbers: [1], rarity: 1 },
  { key: 'hrs-rbi-1+', label: 'H+R+RBI 1+', emoji: '📊', numbers: [1], rarity: 1 },
  { key: 'hrs-rbi-2+', label: 'H+R+RBI 2+', emoji: '📈', numbers: [2], rarity: 2 },
  { key: 'hrs-rbi-2+', label: 'H+R+RBI 2+', emoji: '📈', numbers: [2], rarity: 2 },
  { key: 'hrs-rbi-3+', label: 'H+R+RBI 3+', emoji: '🎯', numbers: [3], rarity: 3 },
  
  // Single hit types (rarity: 1 each)
  { key: 'single', label: 'To Hit a Single', emoji: '1️⃣', numbers: [1], rarity: 1 },
  { key: 'double', label: 'To Hit a Double', emoji: '2️⃣', numbers: [1], rarity: 1 },
  { key: 'triple', label: 'To Hit a Triple', emoji: '3️⃣', numbers: [1], rarity: 1 },
  
  // RBI: 1+, 2+, 3+ (rarity: 1,1,1,1,1,1,2,2,3)
  { key: 'rbi-1+', label: 'RBI 1+', emoji: '🎯', numbers: [1], rarity: 1 },
  { key: 'rbi-1+', label: 'RBI 1+', emoji: '🎯', numbers: [1], rarity: 1 },
  { key: 'rbi-1+', label: 'RBI 1+', emoji: '🎯', numbers: [1], rarity: 1 },
  { key: 'rbi-1+', label: 'RBI 1+', emoji: '🎯', numbers: [1], rarity: 1 },
  { key: 'rbi-1+', label: 'RBI 1+', emoji: '🎯', numbers: [1], rarity: 1 },
  { key: 'rbi-1+', label: 'RBI 1+', emoji: '🎯', numbers: [1], rarity: 1 },
  { key: 'rbi-2+', label: 'RBI 2+', emoji: '🎯🎯', numbers: [2], rarity: 2 },
  { key: 'rbi-2+', label: 'RBI 2+', emoji: '🎯🎯', numbers: [2], rarity: 2 },
  { key: 'rbi-3+', label: 'RBI 3+', emoji: '🔥🎯', numbers: [3], rarity: 3 }
];

// Individual slot reel component for players
const PlayerReel = ({ players, isSpinning, finalPlayer, reelIndex, onSpinComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayPlayer, setDisplayPlayer] = useState(players[0] || null);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const hasCompletedRef = useRef(false);

  // Reset internal state when spinning starts
  useEffect(() => {
    if (isSpinning) {
      hasCompletedRef.current = false;
      setCurrentIndex(0);
      if (players.length > 0) {
        setDisplayPlayer(players[0]);
      }
    }
  }, [isSpinning, players]);

  useEffect(() => {
    // Cleanup function
    const cleanup = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    if (isSpinning && players.length > 0 && finalPlayer && !hasCompletedRef.current) {
      // Start spinning animation
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % players.length);
      }, 80);

      // Set timeout to stop spinning
      const spinDuration = 2000 + (reelIndex * 800);
      timeoutRef.current = setTimeout(() => {
        cleanup();
        
        // Find final player index
        const finalIndex = players.findIndex(p => 
          p.name === finalPlayer.name && p.team === finalPlayer.team
        );
        
        if (finalIndex !== -1) {
          setCurrentIndex(finalIndex);
          setDisplayPlayer(finalPlayer);
        }
        
        hasCompletedRef.current = true;
        setTimeout(() => {
          if (onSpinComplete) {
            onSpinComplete('player', reelIndex);
          }
        }, 200);
      }, spinDuration);
    }

    return cleanup;
  }, [isSpinning, finalPlayer, reelIndex, players]);

  useEffect(() => {
    if (players.length > 0) {
      setDisplayPlayer(players[currentIndex] || players[0]);
    }
  }, [currentIndex, players]);

  return (
    <div className={`slot-reel player-reel ${isSpinning ? 'spinning' : ''}`}>
      <div className="reel-container">
        <div className="player-slot">
          <div 
            className="player-rank"
            style={{ backgroundColor: displayPlayer?.teamColor || '#0056b3' }}
          >
            {displayPlayer?.teamLogo && (
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
            <div className="player-name">{displayPlayer?.name || 'Loading...'}</div>
            <div className="player-team" style={{ color: displayPlayer?.teamColor || '#666' }}>
              {displayPlayer?.team || '---'}
            </div>
          </div>
          
          <div className="player-stats">
            <div className="stat-item">
              <span className="stat-value">{displayPlayer?.HR || 0}</span>
              <span className="stat-label">HR</span>
            </div>
          </div>
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
  const hasCompletedRef = useRef(false);

  // Reset internal state when spinning starts
  useEffect(() => {
    if (isSpinning) {
      hasCompletedRef.current = false;
      setCurrentIndex(0);
      setDisplayNumber(availableNumbers[0] || 1);
    }
  }, [isSpinning, availableNumbers]);

  useEffect(() => {
    const cleanup = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    if (isSpinning && finalNumber && !hasCompletedRef.current) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % availableNumbers.length);
      }, 150);

      const spinDuration = 2500 + (reelIndex * 800);
      timeoutRef.current = setTimeout(() => {
        cleanup();
        
        const finalIndex = availableNumbers.findIndex(num => num === finalNumber);
        if (finalIndex !== -1) {
          setCurrentIndex(finalIndex);
          setDisplayNumber(finalNumber);
        }
        
        hasCompletedRef.current = true;
        setTimeout(() => {
          if (onSpinComplete) {
            onSpinComplete('number', reelIndex);
          }
        }, 200);
      }, spinDuration);
    }

    return cleanup;
  }, [isSpinning, finalNumber, reelIndex, availableNumbers]);

  useEffect(() => {
    setDisplayNumber(availableNumbers[currentIndex] || availableNumbers[0] || 1);
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

// Prop type reel component
const PropReel = ({ isSpinning, finalProp, reelIndex, onSpinComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayProp, setDisplayProp] = useState(PROP_TYPES[0]);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const hasCompletedRef = useRef(false);

  // Reset internal state when spinning starts
  useEffect(() => {
    if (isSpinning) {
      hasCompletedRef.current = false;
      setCurrentIndex(0);
      setDisplayProp(PROP_TYPES[0]);
    }
  }, [isSpinning]);

  useEffect(() => {
    const cleanup = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    if (isSpinning && finalProp && !hasCompletedRef.current) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % PROP_TYPES.length);
      }, 120);

      const spinDuration = 2300 + (reelIndex * 800);
      timeoutRef.current = setTimeout(() => {
        cleanup();
        
        const finalIndex = PROP_TYPES.findIndex(p => p.key === finalProp.key);
        if (finalIndex !== -1) {
          setCurrentIndex(finalIndex);
          setDisplayProp(finalProp);
        }
        
        hasCompletedRef.current = true;
        setTimeout(() => {
          if (onSpinComplete) {
            onSpinComplete('prop', reelIndex);
          }
        }, 200);
      }, spinDuration);
    }

    return cleanup;
  }, [isSpinning, finalProp, reelIndex]);

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

// Enhanced Player picker component with roster search
const PlayerPicker = ({ availablePlayers, selectedPlayers, onTogglePlayer, teams }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [rosterPlayers, setRosterPlayers] = useState([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);

  // Load roster data for player search
  useEffect(() => {
    const loadRosterData = async () => {
      try {
        setIsLoadingRoster(true);
        const response = await fetch('/data/rosters.json');
        if (response.ok) {
          const rosterData = await response.json();
          
          // Filter for hitters only and add team info
          const hitters = rosterData
            .filter(player => player.type === 'hitter' || player.playerType === 'hitter')
            .map(player => {
              const team = teams[player.team] || {};
              return {
                ...player,
                name: player.fullName || player.name,
                teamColor: team.primaryColor,
                teamLogo: team.logoUrl,
                teamName: team.name,
                HR: 0 // Default HR count
              };
            });
          
          setRosterPlayers(hitters);
          console.log(`[SlotMachine] Loaded ${hitters.length} hitters from roster`);
        }
      } catch (error) {
        console.error('[SlotMachine] Error loading roster data:', error);
      } finally {
        setIsLoadingRoster(false);
      }
    };

    loadRosterData();
  }, [teams]);

  // Combine available players with roster players for search
  const allPlayersForSearch = [...availablePlayers, ...rosterPlayers].reduce((unique, player) => {
    // Remove duplicates based on name and team
    const exists = unique.find(p => p.name === player.name && p.team === player.team);
    if (!exists) {
      unique.push(player);
    }
    return unique;
  }, []);

  const filteredPlayers = allPlayersForSearch.filter(player => {
    const isHitter = player.playerType === 'hitter' || player.type === 'hitter' || !player.playerType;
    if (!isHitter) return false;
    
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
                placeholder={isLoadingRoster ? "Loading players..." : "Search players by name or team..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                disabled={isLoadingRoster}
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
            
            {filteredPlayers.length === 0 && !isLoadingRoster && (
              <div className="no-players-found">
                <p>No players found matching your criteria.</p>
              </div>
            )}
            
            {isLoadingRoster && (
              <div className="no-players-found">
                <p>Loading roster data...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Quick add buttons with more card options
const QuickAddButtons = ({ onQuickAdd, isLoading, cardData }) => {
  const quickAddOptions = [
    { 
      label: 'HR Leaders', 
      key: 'hr-leaders',
      description: 'Add top home run hitters',
      dataPath: 'rollingStats.homers'
    },
    { 
      label: 'Hit Streaks', 
      key: 'hit-streaks',
      description: 'Add players with active hit streaks',
      dataPath: 'hitStreakData.hitStreaks'
    },
    { 
      label: 'Hot Hitters', 
      key: 'hot-hitters',
      description: 'Add recently performing hitters',
      dataPath: 'topPerformers.recent'
    },
    {
      label: 'Series Hits',
      key: 'current-series-hits',
      description: 'Add current series hit leaders',
      dataPath: 'currentSeriesHits'
    },
    {
      label: 'Series HRs', 
      key: 'current-series-hrs',
      description: 'Add current series HR leaders',
      dataPath: 'currentSeriesHRs'
    },
    {
      label: 'Time Slot Hits',
      key: 'time-slot-hits', 
      description: 'Add hits by game time leaders',
      dataPath: 'timeSlotHits'
    },
    {
      label: 'vs Opponent Hits',
      key: 'opponent-hits',
      description: 'Add hits vs current opponent',
      dataPath: 'opponentHits'
    },
    {
      label: 'vs Opponent HRs',
      key: 'opponent-hrs', 
      description: 'Add HRs vs current opponent',
      dataPath: 'opponentHRs'
    },
    {
      label: 'Continue Streaks',
      key: 'continue-streaks',
      description: 'Add streaks likely to continue',
      dataPath: 'hitStreakData.likelyToContinueStreak'
    },
    {
      label: 'Friday Leaders',
      key: 'friday-leaders',
      description: 'Add Friday hit leaders',
      dataPath: 'fridayHitLeaders'
    },
    {
      label: 'Current Streaks', 
      key: 'current-hit-streaks',
      description: 'Add current hit streaks',
      dataPath: 'hitStreakData.hitStreaks'
    },
    {
      label: 'Recent HRs',
      key: 'recent-homers',
      description: 'Add most recent home runs',
      dataPath: 'topPerformers.recent'
    },
    {
      label: 'Due for HR',
      key: 'due-for-hr',
      description: 'Add players due for home runs',
      dataPath: 'playersWithHomeRunPrediction'
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

// Helper functions for prop generation
const generateNumbersForProp = (prop, player) => {
  if (!prop) return [1];
  
  // Return the specific numbers defined for each prop type
  return prop.numbers || [1];
};

const selectFinalNumber = (availableNumbers) => {
  if (!availableNumbers || availableNumbers.length === 0) return 1;
  return availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
};

// Main slot machine component
const SlotMachineCard = ({ 
  playerData = [], 
  teamData = {},
  rollingStats = { homers: [], hitters: [] },
  topPerformers = { recent: [], overPerforming: [], underPerforming: [], improved: [] },
  hitStreakData = { hitStreaks: [], likelyToContinueStreak: [], likelyToGetHit: [] },
  playersWithHomeRunPrediction = [],
  // Additional card data props that will be passed from Dashboard
  currentSeriesHits = [],
  currentSeriesHRs = [],
  timeSlotHits = [],
  opponentHits = [],
  opponentHRs = [],
  fridayHitLeaders = []
}) => {
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [results, setResults] = useState({
    players: [null, null, null],
    props: [null, null, null],
    numbers: [null, null, null]
  });
  const [completedReels, setCompletedReels] = useState({
    player: [false, false, false],
    prop: [false, false, false],
    number: [false, false, false]
  });
  const [spinKey, setSpinKey] = useState(0);

  // Process player data and add team information
  const processedPlayerData = playerData.map(player => {
    const team = teamData[player.team] || {};
    return {
      ...player,
      name: player.fullName || player.name,
      teamColor: team.primaryColor,
      teamLogo: team.logoUrl,
      teamName: team.name
    };
  });

  const handleTogglePlayer = (player) => {
    setSelectedPlayers(prev => {
      const isSelected = prev.some(p => 
        p.name === player.name && p.team === player.team
      );
      
      if (isSelected) {
        return prev.filter(p => 
          !(p.name === player.name && p.team === player.team)
        );
      } else {
        return [...prev, player];
      }
    });
  };

  const handleQuickAdd = (type) => {
    let playersToAdd = [];
    
    console.log(`[SlotMachine] Quick-adding ${type}`);
    
    switch (type) {
      case 'hr-leaders':
        playersToAdd = (rollingStats.homers || []).slice(0, 8);
        break;
      case 'hit-streaks':
        let hitStreakPlayers = [];
        if (hitStreakData.hitStreaks && Array.isArray(hitStreakData.hitStreaks)) {
          hitStreakPlayers = hitStreakData.hitStreaks;
        } else if (hitStreakData.likelyToContinueStreak && Array.isArray(hitStreakData.likelyToContinueStreak)) {
          hitStreakPlayers = hitStreakData.likelyToContinueStreak;
        } else if (Array.isArray(hitStreakData)) {
          hitStreakPlayers = hitStreakData;
        }
        playersToAdd = hitStreakPlayers.slice(0, 6);
        break;
      case 'hot-hitters':
        playersToAdd = (topPerformers.recent || []).slice(0, 8);
        break;
      case 'current-series-hits':
        playersToAdd = (currentSeriesHits || []).slice(0, 6);
        break;
      case 'current-series-hrs':
        playersToAdd = (currentSeriesHRs || []).slice(0, 6);
        break;
      case 'time-slot-hits':
        playersToAdd = (timeSlotHits || []).slice(0, 6);
        break;
      case 'opponent-hits':
        playersToAdd = (opponentHits || []).slice(0, 6);
        break;
      case 'opponent-hrs':
        playersToAdd = (opponentHRs || []).slice(0, 6);
        break;
      case 'continue-streaks':
        playersToAdd = (hitStreakData.likelyToContinueStreak || []).slice(0, 6);
        break;
      case 'friday-leaders':
        playersToAdd = (fridayHitLeaders || []).slice(0, 6);
        break;
      case 'current-hit-streaks':
        playersToAdd = (hitStreakData.hitStreaks || []).slice(0, 6);
        break;
      case 'recent-homers':
        playersToAdd = (topPerformers.recent || []).slice(0, 8);
        break;
      case 'due-for-hr':
        playersToAdd = (playersWithHomeRunPrediction || []).slice(0, 8);
        break;
      default:
        return;
    }

    if (playersToAdd.length === 0) {
      console.warn(`[SlotMachine] No players found for ${type}`);
      return;
    }

    const processedPlayersToAdd = playersToAdd
      .map(player => {
        const team = teamData[player.team] || {};
        return {
          ...player,
          name: player.fullName || player.name,
          teamColor: team.primaryColor,
          teamLogo: team.logoUrl,
          teamName: team.name
        };
      })
      .filter(player => !selectedPlayers.some(p => 
        p.name === player.name && p.team === player.team
      ));

    setSelectedPlayers(prev => [...prev, ...processedPlayersToAdd]);
  };

  const handleSpin = () => {
    if (selectedPlayers.length < 3) {
      alert('Please select at least 3 hitters to spin!');
      return;
    }

    console.log('[SlotMachine] Starting new spin');
    
    // Increment spin key to force reel component re-render
    setSpinKey(prev => prev + 1);
    
    setIsSpinning(true);
    setHasSpun(true);
    
    // Reset completion tracking
    setCompletedReels({
      player: [false, false, false],
      prop: [false, false, false],
      number: [false, false, false]
    });

    // Generate new results
    const shuffledPlayers = [...selectedPlayers].sort(() => Math.random() - 0.5);
    const selectedPlayersForSpin = shuffledPlayers.slice(0, 3);

    const selectedProps = Array(3).fill().map(() => {
      const randomIndex = Math.floor(Math.random() * PROP_TYPES.length);
      return PROP_TYPES[randomIndex];
    });

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

  // Memoize the completion handler to prevent unnecessary re-renders
  const handleReelComplete = useCallback((componentType, reelIndex) => {
    console.log(`[SlotMachine] ${componentType} reel ${reelIndex} completed`);
    
    setCompletedReels(prev => {
      const updated = {
        ...prev,
        [componentType]: prev[componentType].map((completed, index) => 
          index === reelIndex ? true : completed
        )
      };
      
      const reelComplete = updated.player[reelIndex] && updated.prop[reelIndex] && updated.number[reelIndex];
      
      console.log(`[SlotMachine] Reel ${reelIndex} completion status:`, {
        player: updated.player[reelIndex],
        prop: updated.prop[reelIndex], 
        number: updated.number[reelIndex],
        reelComplete
      });
      
      return updated;
    });
  }, []);

  const handleReset = () => {
    console.log('[SlotMachine] Resetting machine');
    
    setIsSpinning(false);
    setHasSpun(false);
    
    // Increment spin key to force reel component re-render
    setSpinKey(prev => prev + 1);
    
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
  };

  const handleClearAll = () => {
    setSelectedPlayers([]);
    handleReset();
  };

  // Helper function to copy results to clipboard
  const copyResultsToClipboard = () => {
    if (!allReelsComplete || !results.players[0]) return;
    
    let resultsText = "🎰 Slot Machine Prop Bets 🎰\n\n";
    
    [0, 1, 2].forEach(index => {
      const player = results.players[index];
      const prop = results.props[index];
      const number = results.numbers[index];
      
      if (player && prop) {
        resultsText += `Bet #${index + 1}: ${player.name} (${player.team}) - ${prop.label} ${number}+\n`;
      }
    });
    
    resultsText += "\nGenerated by MLB Statistics Dashboard";
    
    navigator.clipboard.writeText(resultsText).then(() => {
      alert('Results copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy results');
    });
  };

  // Helper function to share results
  const shareResults = () => {
    if (!allReelsComplete || !results.players[0]) return;
    
    let shareText = "🎰 My Slot Machine Prop Bets:\n\n";
    
    [0, 1, 2].forEach(index => {
      const player = results.players[index];
      const prop = results.props[index];
      const number = results.numbers[index];
      
      if (player && prop) {
        shareText += `${prop.emoji} ${player.name} (${player.team}) - ${prop.label} ${number}+\n`;
      }
    });
    
    if (navigator.share) {
      navigator.share({
        title: 'MLB Prop Bets',
        text: shareText
      });
    } else {
      // Fallback to copying
      copyResultsToClipboard();
    }
  };

  // Check if all reels are complete
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
    if (allReelsComplete && isSpinning) {
      console.log('[SlotMachine] All reels complete, stopping spin');
      setTimeout(() => {
        setIsSpinning(false);
      }, 500);
    }
  }, [allReelsComplete, isSpinning]);

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
        cardData={{
          rollingStats,
          topPerformers,
          hitStreakData,
          playersWithHomeRunPrediction,
          currentSeriesHits,
          currentSeriesHRs,
          timeSlotHits,
          opponentHits,
          opponentHRs,
          fridayHitLeaders
        }}
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
              <h4>🎯 Select Players to Begin</h4>
              <p>Choose at least 3 hitters from the Quick Add buttons or manual search above to start spinning!</p>
            </div>
          ) : (
            <div className="reels-section">
              <div className="reel-row">
                <div className="row-label">Players</div>
                <div className="reels-container">
                  {[0, 1, 2].map(reelIndex => (
                    <PlayerReel
                      key={`player-${reelIndex}-${spinKey}`}
                      players={selectedPlayers}
                      isSpinning={isSpinning}
                      finalPlayer={results.players[reelIndex]}
                      reelIndex={reelIndex}
                      onSpinComplete={handleReelComplete}
                    />
                  ))}
                </div>
              </div>

              <div className="reel-row">
                <div className="row-label">Props</div>
                <div className="reels-container">
                  {[0, 1, 2].map(reelIndex => (
                    <PropReel
                      key={`prop-${reelIndex}-${spinKey}`}
                      isSpinning={isSpinning}
                      finalProp={results.props[reelIndex]}
                      reelIndex={reelIndex}
                      onSpinComplete={handleReelComplete}
                    />
                  ))}
                </div>
              </div>

              <div className="reel-row">
                <div className="row-label">Count</div>
                <div className="reels-container">
                  {[0, 1, 2].map(reelIndex => {
                    const prop = results.props[reelIndex];
                    const player = results.players[reelIndex];
                    const availableNumbers = prop ? generateNumbersForProp(prop, player) : [1, 2, 3];
                    
                    return (
                      <NumberReel
                        key={`number-${reelIndex}-${spinKey}`}
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
          <div className="results-section">
            <div className="results-banner">
              <div className="banner-content">
                <h4>🎉 Your Prop Bets Are Ready!</h4>
                <p>Here are your 3 randomized prop betting options. Good luck!</p>
              </div>
            </div>
            
            <div className="results-summary">
              <h4>📋 Your Prop Bet Summary</h4>
              <div className="prop-bet-cards">
                {[0, 1, 2].map(index => {
                  const player = results.players[index];
                  const prop = results.props[index];
                  const number = results.numbers[index];
                  
                  if (!player || !prop) return null;
                  
                  return (
                    <div key={index} className="prop-bet-card">
                      <div className="bet-header">
                        <span className="bet-number">Bet #{index + 1}</span>
                        <span className="bet-emoji">{prop.emoji}</span>
                      </div>
                      
                      <div className="player-info">
                        <div className="player-name">{player.name}</div>
                        <div className="player-team" style={{ color: player.teamColor }}>
                          {player.team}
                        </div>
                      </div>
                      
                      <div className="prop-details">
                        <div className="prop-type">{prop.label}</div>
                        <div className="prop-target">
                          Target: <strong>{number}+</strong>
                        </div>
                      </div>
                      
                      <div className="bet-summary">
                        <strong>{player.name}</strong> to record <strong>{prop.label.toLowerCase()}</strong> of <strong>{number}+</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="results-actions">
                <button className="copy-results-btn" onClick={() => copyResultsToClipboard()}>
                  📋 Copy Results
                </button>
                <button className="share-results-btn" onClick={() => shareResults()}>
                  📤 Share Results
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlotMachineCard;