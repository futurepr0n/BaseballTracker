import React, { useState, useEffect, useCallback } from 'react';
import MatchupSelector from './components/MatchupSelector';
import AnalysisTabs from './components/AnalysisTabs';
import OpportunityClassifier from './components/OpportunityClassifier';
import ExportTools from './components/ExportTools';
import { useBaseballAnalysis } from '../../services/baseballAnalysisService';
import { weakspotService } from './services/weakspotService';
import { normalizeGamesVenues } from '../../utils/venueNormalizer';
import './DailyWeakspotAnalysis.css';

const DailyWeakspotAnalysis = ({ playerData, teamData, gameData, currentDate }) => {
  // Ensure proper date format (YYYY-MM-DD string)
  const formatDateForInput = (date) => {
    if (!date) return new Date().toISOString().split('T')[0];
    if (typeof date === 'string') return date;
    return date.toISOString().split('T')[0];
  };

  // State management
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(currentDate));
  const [selectedGames, setSelectedGames] = useState([]);
  const [weakspotAnalysis, setWeakspotAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [classificationMode, setClassificationMode] = useState('confidence');
  const [filteredOpportunities, setFilteredOpportunities] = useState([]);
  const [currentMatchups, setCurrentMatchups] = useState([]);
  
  // Baseball API integration
  const { 
    initialized, 
    loading: apiLoading, 
    error: apiError, 
    analyzePitcherVsTeam,
    // batchAnalysis,
    service
  } = useBaseballAnalysis();

  // Sync with currentDate changes from app-level date selector
  useEffect(() => {
    if (currentDate) {
      setSelectedDate(formatDateForInput(currentDate));
    }
  }, [currentDate]);

  // Load scheduled games for selected date
  useEffect(() => {
    const loadScheduledGames = async () => {
      if (!selectedDate) return;

      try {
        const dateStr = new Date(selectedDate).toISOString().split('T')[0];
        const response = await fetch(`/data/lineups/starting_lineups_${dateStr}.json`);
        
        if (response.ok) {
          const lineupData = await response.json();
          // Normalize venue data to handle object/string inconsistencies
          const normalizedGames = normalizeGamesVenues(lineupData.games || []);
          setSelectedGames(normalizedGames);
        } else {
          // Fallback to game data if lineups not available
          const games = gameData?.filter(game => 
            new Date(game.date).toISOString().split('T')[0] === dateStr
          ) || [];
          // Normalize venues for consistency
          const normalizedGames = normalizeGamesVenues(games);
          setSelectedGames(normalizedGames);
        }
      } catch (error) {
        console.error('Error loading scheduled games:', error);
        setSelectedGames([]);
      }
    };

    loadScheduledGames();
  }, [selectedDate, gameData]);

  // Enhance results with Baseball API
  const enhanceWithBaseballAPI = useCallback(async (weakspotResults, matchups) => {
    const enhancedOpportunities = [];

    for (const opportunity of weakspotResults.opportunities || []) {
      try {
        // Call Baseball API for this pitcher vs opposing team
        const apiResult = await analyzePitcherVsTeam(
          opportunity.pitcher,
          opportunity.opposing_team
        );

        const enhanced = {
          ...opportunity,
          apiEnhanced: true,
          predictions: apiResult.predictions || [],
          confidence_score: apiResult.confidence_score || opportunity.confidence_score,
          additional_metrics: {
            hr_probability: apiResult.predictions?.[0]?.hr_probability,
            hit_probability: apiResult.predictions?.[0]?.hit_probability,
            api_score: apiResult.predictions?.[0]?.hr_score
          }
        };

        enhancedOpportunities.push(enhanced);
      } catch (error) {
        console.warn(`Failed to enhance ${opportunity.pitcher} vs ${opportunity.team}:`, error);
        enhancedOpportunities.push(opportunity);
      }
    }

    return {
      ...weakspotResults,
      opportunities: enhancedOpportunities,
      enhanced_with_api: true
    };
  }, [analyzePitcherVsTeam]);

  // Main analysis function
  const runWeakspotAnalysis = useCallback(async (games = selectedGames) => {
    if (!games || games.length === 0) {
      setAnalysisError('No games available for the selected date');
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      // Extract pitchers from games - handle both lineup and fallback formats
      const matchups = games.map(game => {
        // Handle lineup data format
        if (game.teams && game.pitchers) {
          const matchup = {
            awayPitcher: game.pitchers.away?.name,
            awayTeam: game.teams.away?.abbr,
            homePitcher: game.pitchers.home?.name,
            homeTeam: game.teams.home?.abbr,
            gameId: game.gameId,
            venue: game.venue?.name || game.venue,
            gameTime: game.gameTime
          };
          console.log('🎯 DAILY WEAKSPOT: Lineup format matchup:', matchup);
          return matchup;
        } else {
          // Handle fallback game data format
          const matchup = {
            awayPitcher: game.away_pitcher || game.awayPitcher,
            awayTeam: game.away_team || game.awayTeam,
            homePitcher: game.home_pitcher || game.homePitcher,
            homeTeam: game.home_team || game.homeTeam,
            gameId: game.id || game.gameId,
            venue: game.venue,
            gameTime: game.time || game.gameTime
          };
          console.log('🎯 DAILY WEAKSPOT: Fallback format matchup:', matchup);
          return matchup;
        }
      });

      // Store matchups for use in BatterOpportunitySection
      setCurrentMatchups(matchups);

      // Run weakspot analysis using our play-by-play data integration
      const weakspotResults = await weakspotService.runDailyWeakspotAnalysis(
        matchups, 
        new Date(selectedDate).toISOString().split('T')[0]
      );

      // Enhance with Baseball API if available
      let enhancedResults = weakspotResults;
      if (initialized && service) {
        try {
          enhancedResults = await enhanceWithBaseballAPI(weakspotResults, matchups);
        } catch (apiError) {
          console.warn('Failed to enhance with Baseball API:', apiError);
          // Continue with basic results
        }
      }

      console.log('🎯 WEAKSPOT ANALYSIS RESULTS:', enhancedResults);
      console.log('🎯 OPPORTUNITIES COUNT:', enhancedResults.weakspot_opportunities?.length || 0);
      console.log('🎯 MATCHUP ANALYSIS:', enhancedResults.matchup_analysis);
      
      setWeakspotAnalysis(enhancedResults);
      setFilteredOpportunities(enhancedResults.weakspot_opportunities || []);
      
    } catch (error) {
      setAnalysisError(`Analysis failed: ${error.message}`);
      setWeakspotAnalysis(null);
      setFilteredOpportunities([]);
    } finally {
      setAnalysisLoading(false);
    }
  }, [selectedGames, selectedDate, initialized, service, enhanceWithBaseballAPI]);


  // Handle classification mode change
  const handleClassificationChange = useCallback((mode) => {
    setClassificationMode(mode);
    
    if (!weakspotAnalysis?.weakspot_opportunities) return;
    
    let filtered = [...weakspotAnalysis.weakspot_opportunities];
    
    switch (mode) {
      case 'confidence':
        filtered.sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0));
        break;
      case 'position':
        filtered.sort((a, b) => (b.position_vulnerability || 0) - (a.position_vulnerability || 0));
        break;
      case 'timing':
        filtered.sort((a, b) => (b.inning_vulnerability || 0) - (a.inning_vulnerability || 0));
        break;
      case 'arsenal':
        filtered.sort((a, b) => (b.arsenal_advantage || 0) - (a.arsenal_advantage || 0));
        break;
      default:
        break;
    }
    
    setFilteredOpportunities(filtered);
  }, [weakspotAnalysis]);

  // Loading states
  if (apiLoading) {
    return (
      <div className="daily-matchup-analysis loading-container">
        <div className="loading-spinner"></div>
        <h2>Loading Analysis System...</h2>
        <p>Initializing baseball data and models...</p>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="daily-matchup-analysis error-container">
        <h2>System Error</h2>
        <p>{apiError}</p>
        <button onClick={() => window.location.reload()}>Reload Page</button>
      </div>
    );
  }

  return (
    <div className="daily-matchup-analysis">
      <div className="analysis-header">
        <h1>Daily Weakspot Analysis</h1>
        <p>Comprehensive weakspot and opportunity intelligence for scheduled games</p>
      </div>

      <div className="analysis-content">
        {/* Date and Game Selection */}
        <MatchupSelector
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedGames={selectedGames}
          onGamesChange={setSelectedGames}
          onAnalyze={(selectedGamesList) => runWeakspotAnalysis(selectedGamesList)}
          loading={analysisLoading}
          gamesCount={selectedGames.length}
        />

        {/* Error Display */}
        {analysisError && (
          <div className="analysis-error">
            <h3>Analysis Error</h3>
            <p>{analysisError}</p>
            <button onClick={() => runWeakspotAnalysis()}>Retry Analysis</button>
          </div>
        )}

        {/* Analysis Results */}
        {weakspotAnalysis && (
          <>
            {/* Opportunity Classification */}
            <OpportunityClassifier
              opportunities={filteredOpportunities}
              classificationMode={classificationMode}
              onClassificationChange={handleClassificationChange}
              totalOpportunities={weakspotAnalysis.opportunities?.length || 0}
            />

            {/* Tabbed Analysis Interface */}
            <AnalysisTabs
              analysis={weakspotAnalysis}
              opportunities={filteredOpportunities}
              loading={analysisLoading}
              enhanced={weakspotAnalysis.enhanced_with_api}
              matchups={currentMatchups}
            />

            {/* Export Tools */}
            <ExportTools
              analysis={weakspotAnalysis}
              opportunities={filteredOpportunities}
              selectedDate={selectedDate}
              classificationMode={classificationMode}
            />
          </>
        )}

        {/* Help Section */}
        <div className="analysis-help">
          <h3>How to Use Daily Weakspot Analysis</h3>
          <div className="help-grid">
            <div className="help-item">
              <h4>1. Select Date</h4>
              <p>Choose the game date you want to analyze. The system will load scheduled games and lineups.</p>
            </div>
            <div className="help-item">
              <h4>2. Run Analysis</h4>
              <p>Click "Analyze Matchups" to run comprehensive weakspot analysis on all pitchers for the day.</p>
            </div>
            <div className="help-item">
              <h4>3. Review Opportunities</h4>
              <p>Browse classified opportunities by confidence, position vulnerabilities, timing windows, and arsenal advantages.</p>
            </div>
            <div className="help-item">
              <h4>4. Research & Export</h4>
              <p>Use export tools to save your analysis and compare across different dates for season-long insights.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyWeakspotAnalysis;