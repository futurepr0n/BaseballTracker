// Simplified useLiveScores.js focusing on available ESPN API data
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
      
      // Transform the data with enhanced information extraction
      const games = data.events.map(event => {
        const competition = event.competitions[0];
        const home = competition.competitors.find(c => c.homeAway === 'home');
        const away = competition.competitors.find(c => c.homeAway === 'away');
        
        // Extract detailed game state
        const status = competition.status;
        const situation = competition.situation || {};
        
        // Extract venue information
        const venue = competition.venue || {};
        
        // Extract weather information if available
        const weather = competition.weather || null;
        
        // Extract broadcast information
        const broadcasts = competition.broadcasts || [];
        
        // Extract notes/headlines
        const notes = competition.notes || [];
        const headlines = event.competitions[0].headlines || [];
        
        // Get team records
        const homeRecord = home.records?.[0]?.summary || '';
        const awayRecord = away.records?.[0]?.summary || '';
        
        // Extract leaders
        const leaders = competition.leaders || [];
        
        // Get odds if available
        const odds = competition.odds?.[0] || null;
        
        // Debug log for live games with situation data
        if (status.type.state === 'in') {
          console.log(`🔴 Live Game - ${event.shortName}:`, {
            period: status.period,
            situation: situation,
            displayClock: status.displayClock,
            detail: status.type.detail
          });
        }
        
        // Calculate priority for sorting (lower = higher priority)
        let priority = 0;
        if (status.type.state === 'in') {
          priority = 1; // Live games first
        } else if (status.type.state === 'pre') {
          priority = 2; // Scheduled games second
        } else {
          priority = 3; // Final games last
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
            logo: home.team.logo,
            record: homeRecord,
            color: home.team.color || '#000000',
            alternateColor: home.team.alternateColor || '#ffffff'
          },
          awayTeam: {
            name: away.team.displayName,
            abbreviation: away.team.abbreviation,
            score: away.score || '0',
            logo: away.team.logo,
            record: awayRecord,
            color: away.team.color || '#000000',
            alternateColor: away.team.alternateColor || '#ffffff'
          },
          status: {
            description: status.type.description,
            detail: status.type.detail,
            state: status.type.state,
            period: status.period, // Inning number
            displayClock: status.displayClock
          },
          // Enhanced game information
          venue: {
            name: venue.fullName || venue.name || '',
            city: venue.address?.city || '',
            state: venue.address?.state || '',
            capacity: venue.capacity || null,
            grass: venue.grass || null
          },
          weather: weather ? {
            displayValue: weather.displayValue || '',
            temperature: weather.temperature || null,
            conditions: weather.conditionId || '',
            link: weather.link || null
          } : null,
          broadcasts: broadcasts.map(b => ({
            market: b.market?.type || '',
            names: b.names || []
          })),
          notes: notes.map(n => n.headline || ''),
          headlines: headlines.map(h => h.description || ''),
          leaders: leaders,
          odds: odds ? {
            provider: odds.provider?.name || '',
            details: odds.details || '',
            overUnder: odds.overUnder || null,
            spread: odds.spread || null
          } : null,
          // Simplified game state - only use what's reliably available
          gameState: situation ? {
            balls: situation.balls,
            strikes: situation.strikes,
            outs: situation.outs,
            onFirst: situation.onFirst,
            onSecond: situation.onSecond,
            onThird: situation.onThird,
            isTopInning: situation.isTopInning,
            // Remove player info since it's not reliably available
            possessionText: situation.possessionText || null,
            downDistanceText: situation.downDistanceText || null
          } : null,
          // Competition data for additional processing
          competitions: [competition],
          isLive: status.type.state === 'in',
          isCompleted: status.type.state === 'post',
          isScheduled: status.type.state === 'pre',
          isDelayed: status.type.description?.toLowerCase().includes('delay') || false,
          isPostponed: status.type.description?.toLowerCase().includes('postponed') || false,
          priority: priority // For sorting
        };
        
        return gameData;
      });
      
      // Sort games by priority (live first, then scheduled, then final)
      const sortedGames = games.sort((a, b) => {
        // First sort by priority
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        
        // Within same priority, apply secondary sorting
        if (a.isLive && b.isLive) {
          // For live games, sort by inning (later innings first)
          const aInning = a.status.period || 0;
          const bInning = b.status.period || 0;
          return bInning - aInning;
        } else if (a.isScheduled && b.isScheduled) {
          // For scheduled games, sort by game time
          return new Date(a.date) - new Date(b.date);
        } else if (a.isCompleted && b.isCompleted) {
          // For completed games, sort by most recent first
          return new Date(b.date) - new Date(a.date);
        }
        
        return 0;
      });
      
      console.log(`✅ Processed ${sortedGames.length} games with enhanced data`);
      
      // Log game distribution for debugging
      const liveGames = sortedGames.filter(g => g.isLive);
      const scheduledGames = sortedGames.filter(g => g.isScheduled);
      const finalGames = sortedGames.filter(g => g.isCompleted);
      
      console.log(`🔴 ${liveGames.length} live games`);
      console.log(`⏰ ${scheduledGames.length} scheduled games`);
      console.log(`✅ ${finalGames.length} final games`);
      
      if (liveGames.length > 0) {
        console.log(`🔴 Live games:`, liveGames.map(g => `${g.shortName} (${g.status.period ? `${g.gameState?.isTopInning ? 'T' : 'B'}${g.status.period}` : 'Live'})`));
      }
      
      setScores(sortedGames);
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