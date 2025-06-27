import React, { useState, useEffect } from 'react';
import comprehensiveMatchupService from '../../services/comprehensiveMatchupService';
import { formatDateString } from '../../services/dataService';
import GameMatchupCard from './GameMatchupCard';
import BatterMatchupTable from './BatterMatchupTable';
import PitcherStatsSection from './PitcherStatsSection';
import ExpandableOpportunityCards from './ExpandableOpportunityCards';
import './HRMatchupHub.css';

/**
 * HR Matchup Hub - Ultimate venue psychology and matchup analysis
 * Inspired by professional sports analytics platforms
 */
const HRMatchupHub = ({ playerData, teamData, gameData, currentDate }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [sortOption, setSortOption] = useState('totalScore');
  const [filterOption, setFilterOption] = useState('all');

  useEffect(() => {
    loadComprehensiveAnalysis();
  }, [currentDate, gameData]);

  const loadComprehensiveAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!gameData || gameData.length === 0) {
        setAnalysis(null);
        return;
      }

      // Ensure currentDate is a valid Date object
      const dateToUse = currentDate instanceof Date ? currentDate : new Date(currentDate);
      
      const comprehensiveAnalysis = await comprehensiveMatchupService.generateComprehensiveMatchups(
        dateToUse,
        gameData
      );

      setAnalysis(comprehensiveAnalysis);
      
      // Auto-select first game
      if (comprehensiveAnalysis.gameAnalyses && comprehensiveAnalysis.gameAnalyses.length > 0) {
        setSelectedGame(comprehensiveAnalysis.gameAnalyses[0]);
      }

    } catch (err) {
      console.error('Error loading comprehensive analysis:', err);
      setError('Failed to load matchup analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleGameSelect = (gameAnalysis) => {
    setSelectedGame(gameAnalysis);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const getFilteredPlayers = () => {
    if (!selectedGame) return [];

    const allPlayers = [
      ...(selectedGame.homeTeamAnalysis?.playerAnalyses || []),
      ...(selectedGame.awayTeamAnalysis?.playerAnalyses || [])
    ];

    // Apply filters
    let filteredPlayers = allPlayers;
    
    switch (filterOption) {
      case 'targets':
        filteredPlayers = allPlayers.filter(p => 
          p.recommendation.action === 'STRONG_TARGET' || p.recommendation.action === 'TARGET'
        );
        break;
      case 'home':
        filteredPlayers = allPlayers.filter(p => p.isHome);
        break;
      case 'away':
        filteredPlayers = allPlayers.filter(p => !p.isHome);
        break;
      case 'high_confidence':
        filteredPlayers = allPlayers.filter(p => p.confidenceLevel >= 80);
        break;
      default:
        break;
    }

    // Apply sorting
    return filteredPlayers.sort((a, b) => {
      switch (sortOption) {
        case 'totalScore':
          return b.comprehensiveScore.totalScore - a.comprehensiveScore.totalScore;
        case 'venueImpact':
          return Math.abs(b.comprehensiveScore.adjustments.venue) - Math.abs(a.comprehensiveScore.adjustments.venue);
        case 'travelImpact':
          return Math.abs(b.comprehensiveScore.adjustments.travel) - Math.abs(a.comprehensiveScore.adjustments.travel);
        case 'confidence':
          return b.confidenceLevel - a.confidenceLevel;
        case 'basePerformance':
          return b.comprehensiveScore.baseScore - a.comprehensiveScore.baseScore;
        default:
          return 0;
      }
    });
  };

  // Get top opportunities for the selected game
  const getSelectedGameOpportunities = () => {
    if (!selectedGame) return analysis?.topOpportunities || [];
    
    const allPlayers = [
      ...(selectedGame.homeTeamAnalysis?.playerAnalyses || []),
      ...(selectedGame.awayTeamAnalysis?.playerAnalyses || [])
    ];

    return allPlayers
      .filter(p => p.recommendation.action === 'STRONG_TARGET' || p.recommendation.action === 'TARGET')
      .sort((a, b) => b.comprehensiveScore.totalScore - a.comprehensiveScore.totalScore)
      .slice(0, 8)  // Increased to show more opportunities
      .map(p => ({
        playerName: p.playerName,
        team: p.team,
        score: parseFloat(p.comprehensiveScore.totalScore),
        venue: selectedGame.venue,
        reason: p.recommendation.reason,
        isHome: p.isHome,
        gameId: selectedGame.gameId,
        // Include additional properties for enhanced insights
        hrScore: p.hrScore,
        basePerformance: p.comprehensiveScore.baseScore,
        venueAdjustment: p.comprehensiveScore.adjustments.venue,
        travelAdjustment: p.comprehensiveScore.adjustments.travel,
        confidenceLevel: p.confidenceLevel,
        recommendation: p.recommendation
      }));
  };

  // Get risk warnings for the selected game
  const getSelectedGameWarnings = () => {
    if (!selectedGame) return analysis?.riskWarnings || [];
    
    const allPlayers = [
      ...(selectedGame.homeTeamAnalysis?.playerAnalyses || []),
      ...(selectedGame.awayTeamAnalysis?.playerAnalyses || [])
    ];

    return allPlayers
      .filter(p => p.recommendation.action === 'AVOID' || p.recommendation.action === 'CAUTION')
      .sort((a, b) => a.comprehensiveScore.totalScore - b.comprehensiveScore.totalScore)
      .slice(0, 5)  // Increased to show more warnings
      .map(p => ({
        playerName: p.playerName,
        team: p.team,
        score: parseFloat(p.comprehensiveScore.totalScore),
        venue: selectedGame.venue,
        reason: p.recommendation.reason,
        isHome: p.isHome,
        gameId: selectedGame.gameId,
        // Include additional properties for enhanced insights
        hrScore: p.hrScore,
        basePerformance: p.comprehensiveScore.baseScore,
        venueAdjustment: p.comprehensiveScore.adjustments.venue,
        travelAdjustment: p.comprehensiveScore.adjustments.travel,
        confidenceLevel: p.confidenceLevel,
        recommendation: p.recommendation
      }));
  };

  const renderOverviewTab = () => {
    const selectedOpportunities = getSelectedGameOpportunities();
    const selectedWarnings = getSelectedGameWarnings();

    return (
      <div className="overview-tab">
        <div className="analysis-summary">
          <div className="summary-header">
            <h3>
              {selectedGame ? 
                `${selectedGame.awayTeam} @ ${selectedGame.homeTeam} Analysis` : 
                'Daily Analysis Summary'
              }
            </h3>
            <div className="summary-stats">
              <div className="stat-box">
                <span className="stat-label">Total Games</span>
                <span className="stat-value">{analysis?.totalGames || 0}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Top Opportunities</span>
                <span className="stat-value">{selectedOpportunities.length}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Risk Warnings</span>
                <span className="stat-value risk">{selectedWarnings.length}</span>
              </div>
            </div>
          </div>

          {selectedOpportunities.length > 0 && (
            <ExpandableOpportunityCards
              players={selectedOpportunities}
              currentDate={currentDate instanceof Date ? currentDate : new Date(currentDate)}
              title={`🎯 ${selectedGame ? 'Game' : 'Top'} Opportunities`}
            />
          )}

          {selectedWarnings.length > 0 && (
            <ExpandableOpportunityCards
              players={selectedWarnings}
              currentDate={currentDate instanceof Date ? currentDate : new Date(currentDate)}
              title={`⚠️ ${selectedGame ? 'Game' : 'Risk'} Warnings`}
            />
          )}
        </div>
        <h3>Game Matchups</h3>
        <div className="games-grid">
          
          <div className="games-container">
            {analysis?.gameAnalyses?.map((gameAnalysis, index) => (
              <GameMatchupCard
                key={gameAnalysis.gameId || index}
                gameAnalysis={gameAnalysis}
                isSelected={selectedGame?.gameId === gameAnalysis.gameId}
                onSelect={() => handleGameSelect(gameAnalysis)}
                teamData={teamData}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderAnalysisTab = () => (
    <div className="analysis-tab">
      {selectedGame ? (
        <div className="selected-game-analysis">
          <div className="game-header">
            <h3>
              {selectedGame.awayTeam} @ {selectedGame.homeTeam}
            </h3>
            <div className="game-meta">
              <span className="game-time">{selectedGame.gameTime}</span>
              <span className="game-rating rating-{selectedGame.overallGameRating?.classification?.toLowerCase()}">
                {selectedGame.overallGameRating?.score}/100
              </span>
            </div>
          </div>

          <div className="analysis-controls">
            <div className="filter-controls">
              <label>Filter:</label>
              <select value={filterOption} onChange={(e) => setFilterOption(e.target.value)}>
                <option value="all">All Players</option>
                <option value="targets">Targets Only</option>
                <option value="home">Home Team</option>
                <option value="away">Away Team</option>
                <option value="high_confidence">High Confidence</option>
              </select>
            </div>
            
            <div className="sort-controls">
              <label>Sort by:</label>
              <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                <option value="totalScore">Total Score</option>
                <option value="venueImpact">Venue Impact</option>
                <option value="travelImpact">Travel Impact</option>
                <option value="confidence">Confidence</option>
                <option value="basePerformance">Base Performance</option>
              </select>
            </div>
          </div>

          <BatterMatchupTable 
            players={getFilteredPlayers()}
            sortOption={sortOption}
            onSortChange={setSortOption}
          />
        </div>
      ) : (
        <div className="no-game-selected">
          <p>Select a game from the Overview tab to view detailed analysis</p>
        </div>
      )}
    </div>
  );

  const renderPitcherTab = () => (
    <div className="pitcher-tab">
      {selectedGame ? (
        <PitcherStatsSection 
          gameAnalysis={selectedGame}
          apiPredictions={selectedGame.apiPredictions}
        />
      ) : (
        <div className="no-game-selected">
          <p>Select a game to view pitcher analysis</p>
        </div>
      )}
    </div>
  );

  const renderVenueTab = () => (
    <div className="venue-tab">
      <div className="venue-insights">
        <h3>Venue Psychology Insights</h3>
        {analysis?.venueInsights && analysis.venueInsights.length > 0 ? (
          <div className="venue-insights-grid">
            {analysis.venueInsights.map((insight, index) => (
              <div key={index} className="venue-insight-card">
                <h4>{insight.venue}</h4>
                <div className="insight-details">
                  <div className="insight-stat">
                    <span className="label">Players with Venue Advantage:</span>
                    <span className="value">{insight.advantagePlayers}</span>
                  </div>
                  <div className="insight-stat">
                    <span className="label">Environmental Factor:</span>
                    <span className="value">{insight.environmentalFactor}</span>
                  </div>
                  <div className="insight-recommendations">
                    <h5>Key Insights:</h5>
                    <ul>
                      {insight.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No venue insights available for today's games</p>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="hr-matchup-hub loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Generating Comprehensive Matchup Analysis...</h2>
          <p>Analyzing venue psychology, travel patterns, and environmental factors</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hr-matchup-hub error">
        <div className="error-container">
          <h2>Analysis Error</h2>
          <p>{error}</p>
          <button onClick={loadComprehensiveAnalysis} className="retry-button">
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  if (!analysis || !analysis.gameAnalyses || analysis.gameAnalyses.length === 0) {
    return (
      <div className="hr-matchup-hub no-data">
        <div className="no-data-container">
          <h2>No Games Available</h2>
          <p>No games found for {currentDate.toLocaleDateString()}</p>
          <p>Try selecting a different date or check back later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="hr-matchup-hub">
      <div className="hub-header">
        <div className="header-content">
          <h1>HR Matchup Hub</h1>
          <p className="subtitle">
            Ultimate venue psychology and comprehensive matchup analysis for {currentDate.toLocaleDateString()}
          </p>
        </div>
        
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabChange('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => handleTabChange('analysis')}
          >
            Player Analysis
          </button>
          <button 
            className={`tab-button ${activeTab === 'pitcher' ? 'active' : ''}`}
            onClick={() => handleTabChange('pitcher')}
          >
            Pitcher Intel
          </button>
          <button 
            className={`tab-button ${activeTab === 'venue' ? 'active' : ''}`}
            onClick={() => handleTabChange('venue')}
          >
            Venue Psychology
          </button>
        </div>
      </div>

      <div className="hub-content">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'analysis' && renderAnalysisTab()}
        {activeTab === 'pitcher' && renderPitcherTab()}
        {activeTab === 'venue' && renderVenueTab()}
      </div>
    </div>
  );
};

export default HRMatchupHub;