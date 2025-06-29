import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Target, Loader2, AlertCircle } from 'lucide-react';
import { useTeamFilter } from '../../TeamFilterContext';
import { debugLog } from '../../../utils/debugConfig';
import './MultiHitDashboardCard.css'; // Import your CSS styles

const MultiHitDashboardCard = ({ teams = {} }) => {
  const [activeMetric, setActiveMetric] = useState('hits'); // 'hits' or 'homeruns'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameData, setGameData] = useState({});
  const [rosterData, setRosterData] = useState([]);
  const { selectedTeam, includeMatchup, matchupTeam, shouldIncludePlayer } = useTeamFilter();

  // Clean player names utility function
  const cleanPlayerName = (nameInput) => {
    if (!nameInput) return null;
    
    let name = String(nameInput);
    
    // Handle "LastName, FirstName" format
    if (name.includes(',')) {
      const parts = name.split(',', 2);
      if (parts.length === 2) {
        name = `${parts[1].trim()} ${parts[0].trim()}`;
      }
    }
    
    // Standardize whitespace and title case
    name = name.replace(/\s+/g, ' ').trim();
    name = name.replace(/\b\w/g, l => l.toUpperCase());
    
    // Standardize suffixes
    name = name.replace(/\s+(Jr|Sr|Ii|Iii|Iv)\.?$/i, (match, suffix) => {
      return ` ${suffix.toUpperCase().replace('II','II').replace('III','III').replace('IV','IV')}`;
    });
    
    // Remove periods from initials
    name = name.replace(/(?<=\b[A-Z])\.(?=\s|$)/g, '');
    
    return name;
  };

  // Match player name to roster
  const matchPlayerNameToRoster = (playerName, rosterList) => {
    const cleanedName = cleanPlayerName(playerName);
    if (!cleanedName) return null;
    
    for (const rosterPlayer of rosterList) {
      const rosterFullName = cleanPlayerName(rosterPlayer.fullName);
      const rosterShortName = cleanPlayerName(rosterPlayer.name);
      
      if (cleanedName === rosterFullName || cleanedName === rosterShortName) {
        return rosterFullName || rosterShortName;
      }
    }
    return null;
  };

  // Load pre-processed data from rolling stats service
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load pre-processed multi-hit data from rolling stats service
        const multiHitResponse = await fetch('/data/multi_hit_stats/multi_hit_stats_latest.json');
        if (!multiHitResponse.ok) {
          throw new Error(`Failed to load multi-hit stats: ${multiHitResponse.status}`);
        }
        const multiHitData = await multiHitResponse.json();
        
        debugLog.log('CARDS', `Loaded pre-processed multi-hit data: ${multiHitData.allMultiHitPerformers?.length || 0} multi-hit performers, ${multiHitData.allMultiHRPerformers?.length || 0} multi-HR performers`);
        
        // Transform the pre-processed data for our component
        const transformedData = {
          multiHitPerformers: multiHitData.allMultiHitPerformers || [],
          multiHRPerformers: multiHitData.allMultiHRPerformers || [],
          summary: multiHitData.summary || {
            totalMultiHitPerformers: 0,
            totalMultiHRPerformers: 0,
            avgMultiHitGames: 0,
            avgMultiHRGames: 0,
            highestMultiHitRate: 0,
            highestMultiHRRate: 0
          },
          generatedAt: multiHitData.generatedAt,
          targetDate: multiHitData.targetDate
        };
        
        setGameData(transformedData);
        
      } catch (err) {
        console.error('Error loading pre-processed data:', err);
        setError(`Failed to load data: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Process the pre-processed data for display
  const processedData = useMemo(() => {
    if (!gameData || !gameData.multiHitPerformers || !gameData.multiHRPerformers) {
      return [];
    }

    const activeData = activeMetric === 'hits' ? gameData.multiHitPerformers : gameData.multiHRPerformers;
    const threshold = activeMetric === 'hits' ? 2 : 1;
    
    // Apply team filtering before mapping and slicing
    const filteredData = activeData.filter(player => shouldIncludePlayer(player.team));
    
    return filteredData.map(player => ({
      name: player.name,
      team: player.team,
      totalMultiGames: activeMetric === 'hits' ? player.totalMultiHitGames : player.totalMultiHRGames,
      totalGames: player.totalGames,
      multiGameRate: activeMetric === 'hits' ? player.multiHitRate : player.multiHRRate,
      average: activeMetric === 'hits' ? player.avgHitsPerGame : player.avgHRsPerGame,
      performanceCounts: activeMetric === 'hits' ? player.hitDistribution : player.hrDistribution,
      maxPerformance: activeMetric === 'hits' ? player.maxHitsInGame : player.maxHRsInGame
    })).slice(0, 20); // Top 20 for display
  }, [gameData, activeMetric, selectedTeam, includeMatchup, matchupTeam, shouldIncludePlayer]);

  const getPerformanceColor = (level, maxLevel) => {
    const intensity = Math.min(level / Math.max(maxLevel, 4), 1);
    if (activeMetric === 'hits') {
      return `rgba(34, 197, 94, ${0.3 + intensity * 0.7})`; // Green scale
    } else {
      return `rgba(239, 68, 68, ${0.3 + intensity * 0.7})`; // Red scale
    }
  };

  const formatMetricLabel = (level) => {
    if (activeMetric === 'hits') {
      return level === 1 ? '1H' : `${level}H`;
    } else {
      return level === 1 ? '1HR' : `${level}HR`;
    }
  };

  const getTeamLogo = (teamCode) => {
    if (!teams[teamCode]) return null;
    return teams[teamCode].logoUrl || `/data/logos/${teamCode.toLowerCase()}_logo.png`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Loading multi-hit data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <p className="text-red-600 text-center">{error}</p>
            <p className="text-gray-500 text-sm text-center">
              Make sure your data files are available and properly formatted
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (processedData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="h-8 w-8 text-gray-400" />
            <p className="text-gray-600">No player data available</p>
            <p className="text-gray-500 text-sm text-center">
              No {activeMetric === 'hits' ? 'multi-hit' : 'home run'} games found in the loaded data
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="multi-hit-dashboard">
      <div className="glass-card-container">
        {/* Glass Header */}
        <div className="glass-header">
          <div className="dashboard-header">
            <div className="header-content">
              <div className="header-icon">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div className="header-text">
                <h2 className="text-xl font-bold text-gray-900">Multi-Performance Leaders</h2>
                <p className="text-sm text-gray-600">
                  Players ranked by {activeMetric === 'hits' ? 'multi-hit games (2+ hits)' : 'home run games (1+ HR)'}
                </p>
              </div>
            </div>
            
            {/* Toggle Switch */}
            <div className="metric-toggle">
              <button
                onClick={() => setActiveMetric('hits')}
                className={`toggle-button hits ${activeMetric === 'hits' ? 'active' : ''}`}
              >
                <Target className="h-4 w-4" />
                Hits
              </button>
              <button
                onClick={() => setActiveMetric('homeruns')}
                className={`toggle-button homeruns ${activeMetric === 'homeruns' ? 'active' : ''}`}
              >
                <TrendingUp className="h-4 w-4" />
                Home Runs
              </button>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="summary-stats">
            <div className="summary-card blue">
              <div className="summary-label">Total Leaders</div>
              <div className="summary-value">{processedData.length}</div>
            </div>
            <div className="summary-card green">
              <div className="summary-label">Avg Multi-Games</div>
              <div className="summary-value">
                {gameData.summary ? (activeMetric === 'hits' ? gameData.summary.avgMultiHitGames : gameData.summary.avgMultiHRGames) : '0.0'}
              </div>
            </div>
            <div className="summary-card purple">
              <div className="summary-label">Highest Rate</div>
              <div className="summary-value">
                {gameData.summary ? (activeMetric === 'hits' ? gameData.summary.highestMultiHitRate : gameData.summary.highestMultiHRRate).toFixed(1) : '0.0'}%
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="scrollable-container">
          {/* Scrollable Player Rankings */}
          <div className="rankings-container">
            <div className="rankings-header">
              <span>Rank</span>
              <span>Player</span>
              <span>Multi-Games</span>
              <span>Rate</span>
              <span>Avg</span>
              <span>Distribution</span>
            </div>
            
            <div className="rankings-scroll">
              {processedData.map((player, index) => (
                <div key={player.name} className="player-row">
                  {/* Mobile two-row wrapper */}
                  <div className="player-row-top">
                    {/* Rank */}
                    <div className="player-rank" style={{ backgroundColor: '#6b7280' }}>
                      {getTeamLogo(player.team) && (
                        <>
                          <img 
                            src={getTeamLogo(player.team)} 
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
                    
                    {/* Player Info */}
                    <div className="player-info">
                      <div className="player-name">{player.name}</div>
                      <div className="player-team">{player.team}</div>
                    </div>
                    
                    {/* Multi-Games Count */}
                    <div className="multi-games-stat">
                      <span className="multi-games-count">{player.totalMultiGames}</span>
                      <span className="multi-games-total">/{player.totalGames}</span>
                    </div>
                    
                    {/* Rate and Average in single column for mobile */}
                    <div className="stat-column stats-combined">
                      <span className="stat-value stat-rate">{player.multiGameRate.toFixed(1)}%</span>
                      <span className="stat-value stat-avg">{player.average.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Performance Distribution - Second row on mobile */}
                  <div className="performance-distribution">
                    <div className="distribution-bars">
                      {Object.entries(player.performanceCounts)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .filter(([level]) => parseInt(level) > 0) // EXCLUDE 0s from display
                        .map(([level, count]) => {
                          const levelNum = parseInt(level);
                          const nonZeroGames = player.totalGames - (player.performanceCounts[0] || 0);
                          const width = nonZeroGames > 0 ? Math.max((count / nonZeroGames) * 100, 0) : 0;
                          
                          return (
                            <div
                              key={level}
                              className="distribution-bar"
                              style={{
                                width: `${width}%`,
                                backgroundColor: getPerformanceColor(levelNum, player.maxPerformance),
                                minWidth: count > 0 ? '20px' : '0px'
                              }}
                            >
                              {count > 0 && <span>{count}</span>}
                              
                              {/* Tooltip */}
                              {count > 0 && (
                                <div className="performance-tooltip">
                                  {formatMetricLabel(levelNum)}: {count} games ({((count / player.totalGames) * 100).toFixed(1)}%)
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                    
                    {/* Legend - shown on mobile in compact form */}
                    <div className="distribution-legend mobile-legend">
                      {Object.entries(player.performanceCounts)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .filter(([level, count]) => count > 0 && parseInt(level) > 0)
                        .slice(0, 3) // Show only top 3 on mobile
                        .map(([level]) => (
                          <span key={level} className="legend-item">
                            <div
                              className="legend-color"
                              style={{ backgroundColor: getPerformanceColor(parseInt(level), player.maxPerformance) }}
                            />
                            {formatMetricLabel(parseInt(level))}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Footer */}
          <div className="dashboard-footer">
            <div className="footer-content">
              <div className="footer-info">
                Showing {activeMetric === 'hits' ? 'multi-hit games (2+ hits)' : 'home run games (1+ HR)'} - Season-long statistics
                {gameData.seasonYear && <span className="ml-2 text-gray-400">({gameData.seasonYear} Season)</span>}
              </div>
              <div className="footer-stats">
                <span>Distribution shows frequency of each performance level</span>
                <div className="footer-legend">
                  <div className="footer-legend-item">
                    <div className="footer-legend-color" style={{ backgroundColor: '#d1d5db' }}></div>
                    <span>Lower frequency</span>
                  </div>
                  <div className="footer-legend-item">
                    <div className="footer-legend-color" style={{ backgroundColor: '#374151' }}></div>
                    <span>Higher frequency</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiHitDashboardCard;