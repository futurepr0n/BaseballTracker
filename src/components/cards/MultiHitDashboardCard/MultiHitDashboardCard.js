import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Target, Loader2, AlertCircle } from 'lucide-react';
import './MultiHitDashboardCard.css'; // Import your custom styles if needed

const MultiHitDashboardCard = () => {
  const [activeMetric, setActiveMetric] = useState('hits'); // 'hits' or 'homeruns'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameData, setGameData] = useState({});
  const [rosterData, setRosterData] = useState([]);

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
        
        console.log(`Loaded pre-processed multi-hit data: ${multiHitData.allMultiHitPerformers?.length || 0} multi-hit performers, ${multiHitData.allMultiHRPerformers?.length || 0} multi-HR performers`);
        
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
    
    return activeData.map(player => ({
      name: player.name,
      team: player.team,
      totalMultiGames: activeMetric === 'hits' ? player.totalMultiHitGames : player.totalMultiHRGames,
      totalGames: player.totalGames,
      multiGameRate: activeMetric === 'hits' ? player.multiHitRate : player.multiHRRate,
      average: activeMetric === 'hits' ? player.avgHitsPerGame : player.avgHRsPerGame,
      performanceCounts: activeMetric === 'hits' ? player.hitDistribution : player.hrDistribution,
      maxPerformance: activeMetric === 'hits' ? player.maxHitsInGame : player.maxHRsInGame
    })).slice(0, 20); // Top 20 for display
  }, [gameData, activeMetric]);

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
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BarChart3 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Multi-Performance Leaders</h2>
            <p className="text-sm text-gray-600">
              Players ranked by {activeMetric === 'hits' ? 'multi-hit games (2+ hits)' : 'home run games (1+ HR)'}
            </p>
          </div>
        </div>
        
        {/* Toggle Switch */}
        <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveMetric('hits')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
              activeMetric === 'hits'
                ? 'bg-green-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Target className="h-4 w-4" />
            Hits
          </button>
          <button
            onClick={() => setActiveMetric('homeruns')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
              activeMetric === 'homeruns'
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Home Runs
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-600">Total Leaders</div>
          <div className="text-2xl font-bold text-blue-900">{processedData.length}</div>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
          <div className="text-sm font-medium text-green-600">Avg Multi-Games</div>
          <div className="text-2xl font-bold text-green-900">
            {gameData.summary ? (activeMetric === 'hits' ? gameData.summary.avgMultiHitGames : gameData.summary.avgMultiHRGames) : '0.0'}
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="text-sm font-medium text-purple-600">Highest Rate</div>
          <div className="text-2xl font-bold text-purple-900">
            {gameData.summary ? (activeMetric === 'hits' ? gameData.summary.highestMultiHitRate : gameData.summary.highestMultiHRRate).toFixed(1) : '0.0'}%
          </div>
        </div>
      </div>

      {/* Player Rankings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 px-4">
          <span className="w-8">Rank</span>
          <span className="flex-1">Player</span>
          <span className="w-20">Multi-Games</span>
          <span className="w-16">Rate</span>
          <span className="w-16">Avg</span>
          <span className="flex-1">Distribution</span>
        </div>
        
        {processedData.map((player, index) => (
          <div
            key={player.name}
            className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {/* Rank */}
            <div className="w-8 text-center">
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                index === 0 ? 'bg-yellow-100 text-yellow-800' :
                index === 1 ? 'bg-gray-100 text-gray-800' :
                index === 2 ? 'bg-orange-100 text-orange-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {index + 1}
              </span>
            </div>
            
            {/* Player Name */}
            <div className="flex-1">
              <div className="font-semibold text-gray-900">{player.name}</div>
              <div className="text-xs text-gray-500">{player.team}</div>
            </div>
            
            {/* Multi-Games Count */}
            <div className="w-20 text-center">
              <span className="text-lg font-bold text-gray-900">{player.totalMultiGames}</span>
              <span className="text-xs text-gray-500">/{player.totalGames}</span>
            </div>
            
            {/* Rate */}
            <div className="w-16 text-center">
              <span className="text-sm font-medium text-gray-700">{player.multiGameRate.toFixed(1)}%</span>
            </div>
            
            {/* Average */}
            <div className="w-16 text-center">
              <span className="text-sm font-medium text-gray-700">{player.average.toFixed(2)}</span>
            </div>
            
            {/* Performance Distribution */}
            <div className="flex-1">
              <div className="flex items-center gap-1 h-8">
                {Object.entries(player.performanceCounts)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([level, count]) => {
                    const levelNum = parseInt(level);
                    const width = Math.max((count / player.totalGames) * 100, 0);
                    
                    return (
                      <div
                        key={level}
                        className="relative group"
                        style={{ width: `${width}%` }}
                      >
                        <div
                          className="h-6 rounded-sm flex items-center justify-center text-xs font-medium text-white"
                          style={{
                            backgroundColor: getPerformanceColor(levelNum, player.maxPerformance),
                            minWidth: count > 0 ? '24px' : '0px'
                          }}
                        >
                          {count > 0 && <span>{count}</span>}
                        </div>
                        
                        {/* Tooltip */}
                        {count > 0 && (
                          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {formatMetricLabel(levelNum)}: {count} games ({((count / player.totalGames) * 100).toFixed(1)}%)
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
              
              {/* Legend */}
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                {Object.entries(player.performanceCounts)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .filter(([, count]) => count > 0)
                  .slice(0, 5) // Show first 5 levels in legend
                  .map(([level]) => (
                    <span key={level} className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded-sm"
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

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Showing {activeMetric === 'hits' ? 'multi-hit games (2+ hits)' : 'home run games (1+ HR)'} from pre-processed data
            {gameData.targetDate && <span className="ml-2 text-gray-400">({gameData.targetDate})</span>}
          </div>
          <div className="flex items-center gap-4">
            <span>Distribution shows frequency of each performance level</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-300 rounded-sm"></div>
              <span>Lower frequency</span>
              <div className="w-3 h-3 bg-gray-700 rounded-sm"></div>
              <span>Higher frequency</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiHitDashboardCard;