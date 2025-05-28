// Enhanced useLiveScores.js with detailed game state parsing
import { useState, useEffect, useCallback } from 'react';

export const useLiveScores = (refreshInterval = 30000) => {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchScores = useCallback(async () => {
    try {
      setError(null);
      
      console.log('🔄 Fetching live scores from ESPN API...');
      
      const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 ESPN API Response:', data);
      
      // Transform the data with enhanced game state information
      const games = data.events.map(event => {
        const competition = event.competitions[0];
        const home = competition.competitors.find(c => c.homeAway === 'home');
        const away = competition.competitors.find(c => c.homeAway === 'away');
        
        // Extract detailed game state
        const status = competition.status;
        const situation = competition.situation || {};
        
        // Debug log for live games
        if (status.type.state === 'in') {
          console.log(`🔴 Live Game - ${event.shortName}:`, {
            period: status.period,
            situation: situation,
            displayClock: status.displayClock,
            detail: status.type.detail
          });
        }
        
        const gameData = {
          id: event.id,
          date: event.date,
          name: event.name,
          shortName: event.shortName,
          homeTeam: {
            name: home.team.displayName,
            abbreviation: home.team.abbreviation,
            score: home.score || '0',
            logo: home.team.logo
          },
          awayTeam: {
            name: away.team.displayName,
            abbreviation: away.team.abbreviation,
            score: away.score || '0',
            logo: away.team.logo
          },
          status: {
            description: status.type.description,
            detail: status.type.detail,
            state: status.type.state,
            period: status.period, // Inning number
            displayClock: status.displayClock
          },
          // Enhanced game state information
          competitions: [competition], // Pass the full competition data
          isLive: status.type.state === 'in',
          isCompleted: status.type.state === 'post',
          isScheduled: status.type.state === 'pre'
        };
        
        return gameData;
      });
      
      console.log(`✅ Processed ${games.length} games`);
      
      // Log live games for debugging
      const liveGames = games.filter(g => g.isLive);
      if (liveGames.length > 0) {
        console.log(`🔴 ${liveGames.length} live games found:`, liveGames.map(g => g.shortName));
      }
      
      setScores(games);
      setLastUpdated(new Date());
      setLoading(false);
      
    } catch (err) {
      console.error('❌ Error fetching live scores:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  // Set up auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      console.log(`⏰ Setting up auto-refresh every ${refreshInterval/1000} seconds`);
      const interval = setInterval(() => {
        console.log('🔄 Auto-refreshing scores...');
        fetchScores();
      }, refreshInterval);
      
      return () => {
        console.log('🛑 Clearing auto-refresh interval');
        clearInterval(interval);
      };
    }
  }, [fetchScores, refreshInterval]);

  return {
    scores,
    loading,
    error,
    lastUpdated,
    refresh: fetchScores
  };
};