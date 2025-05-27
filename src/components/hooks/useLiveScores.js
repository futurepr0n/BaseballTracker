// src/hooks/useLiveScores.js
import { useState, useEffect, useCallback } from 'react';

export const useLiveScores = (refreshInterval = 30000) => { // 30 seconds default
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchScores = useCallback(async () => {
    try {
      setError(null);
      
      // Use the same ESPN API from your scraper
      const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform the data similar to your scraper
      const games = data.events.map(event => {
        const competition = event.competitions[0];
        const home = competition.competitors.find(c => c.homeAway === 'home');
        const away = competition.competitors.find(c => c.homeAway === 'away');
        
        return {
          id: event.id,
          date: event.date,
          name: event.name,
          shortName: event.shortName,
          homeTeam: {
            name: home.team.displayName,
            abbreviation: home.team.abbreviation,
            score: home.score,
            logo: home.team.logo
          },
          awayTeam: {
            name: away.team.displayName,
            abbreviation: away.team.abbreviation,
            score: away.score,
            logo: away.team.logo
          },
          status: {
            description: competition.status.type.description,
            detail: competition.status.type.detail,
            state: competition.status.type.state,
            inning: competition.status.period,
            displayClock: competition.status.displayClock
          },
          isLive: competition.status.type.state === 'in',
          isCompleted: competition.status.type.state === 'post',
          isScheduled: competition.status.type.state === 'pre'
        };
      });
      
      setScores(games);
      setLastUpdated(new Date());
      setLoading(false);
      
    } catch (err) {
      console.error('Error fetching live scores:', err);
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
      const interval = setInterval(fetchScores, refreshInterval);
      return () => clearInterval(interval);
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