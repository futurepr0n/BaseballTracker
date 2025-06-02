/**
 * Get stadiums with best home run performance for specific day of week
 * @param {string} dayOfWeek - Day name (e.g., "Sunday", "Monday")
 * @param {number} limit - Number of stadiums to return
 * @param {number} minGames - Minimum games required for inclusion
 * @returns {Promise<Array>} Stadiums sorted by HR average for that day
 */
export const getStadiumsByDayOfWeek = async (dayOfWeek, limit = 10, minGames = 3) => {
  const data = await fetchStadiumData();
  const stadiums = Object.values(data.stadiums || {});
  
  const dayResults = [];
  
  stadiums.forEach(stadium => {
    const dayStats = stadium.timingStats?.byDayOfWeek?.[dayOfWeek];
    if (dayStats && dayStats.games >= minGames) {
      const average = (dayStats.homeRuns / dayStats.games).toFixed(2);
      dayResults.push({
        stadiumName: stadium.name,
        homeTeam: stadium.homeTeam,
        games: dayStats.games,
        homeRuns: dayStats.homeRuns,
        averageHRs: parseFloat(average),
        dayOfWeek
      });
    }
  });
  
  return dayResults
    .sort((a, b) => b.averageHRs - a.averageHRs)
    .slice(0, limit);
};/**
 * Stadium Data Service
 * src/services/stadiumDataService.js
 * 
 * Service for consuming stadium home run analysis data in dashboard components
 */

// Cache for stadium data
let stadiumDataCache = null;
let lastFetchTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch stadium home run analysis data
 * @returns {Promise<Object>} Stadium analysis data
 */
export const fetchStadiumData = async () => {
  // Check cache first
  if (stadiumDataCache && lastFetchTime && 
      (Date.now() - lastFetchTime) < CACHE_DURATION) {
    return stadiumDataCache;
  }
  
  try {
    console.log('📊 Fetching stadium HR analysis data...');
    const response = await fetch('/data/stadium/stadium_hr_analysis.json');
    
    if (!response.ok) {
      console.warn('Stadium HR analysis data not found');
      return getDefaultStadiumData();
    }
    
    const data = await response.json();
    
    // Cache the data
    stadiumDataCache = data;
    lastFetchTime = Date.now();
    
    console.log(`✅ Loaded stadium data for ${data.metadata?.totalStadiums || 0} stadiums`);
    return data;
    
  } catch (error) {
    console.error('Error fetching stadium data:', error);
    return getDefaultStadiumData();
  }
};

/**
 * Get default empty stadium data structure
 */
const getDefaultStadiumData = () => ({
  metadata: {
    totalStadiums: 0,
    totalGamesProcessed: 0,
    totalHomeRunsTracked: 0,
    generatedAt: new Date().toISOString()
  },
  summary: {
    totalStadiums: 0,
    totalGames: 0,
    totalHomeRuns: 0,
    topStadiumsByTotalHRs: [],
    topStadiumsByAverage: [],
    homeVsAwayAnalysis: {
      totalHomeTeamHRs: 0,
      totalAwayTeamHRs: 0,
      homeAdvantage: false
    }
  },
  stadiums: {}
});

/**
 * Get top stadiums by total home runs
 * @param {number} limit - Number of stadiums to return
 * @returns {Promise<Array>} Top stadiums by total HRs
 */
export const getTopStadiumsByTotal = async (limit = 10) => {
  const data = await fetchStadiumData();
  return data.summary?.topStadiumsByTotalHRs?.slice(0, limit) || [];
};

/**
 * Get top stadiums by home run average per game
 * @param {number} limit - Number of stadiums to return
 * @param {number} minGames - Minimum games required for inclusion
 * @returns {Promise<Array>} Top stadiums by HR average
 */
export const getTopStadiumsByAverage = async (limit = 10, minGames = 5) => {
  const data = await fetchStadiumData();
  
  // Filter by minimum games if different from default
  if (minGames !== 5) {
    const stadiums = Object.values(data.stadiums || {});
    return stadiums
      .filter(stadium => stadium.totalGames >= minGames)
      .sort((a, b) => parseFloat(b.averageHRsPerGame) - parseFloat(a.averageHRsPerGame))
      .slice(0, limit)
      .map(s => ({
        name: s.name,
        homeTeam: s.homeTeam,
        averagePerGame: s.averageHRsPerGame,
        totalGames: s.totalGames,
        totalHomeRuns: s.totalHomeRuns
      }));
  }
  
  return data.summary?.topStadiumsByAverage?.slice(0, limit) || [];
};

/**
 * Get stadium data for specific team(s)
 * @param {string|Array} teams - Team abbreviation(s)
 * @returns {Promise<Array>} Stadium data for specified teams
 */
export const getStadiumsForTeams = async (teams) => {
  const data = await fetchStadiumData();
  const stadiums = Object.values(data.stadiums || {});
  
  const teamArray = Array.isArray(teams) ? teams : [teams];
  
  return stadiums
    .filter(stadium => teamArray.includes(stadium.homeTeam))
    .map(stadium => ({
      name: stadium.name,
      homeTeam: stadium.homeTeam,
      totalHomeRuns: stadium.totalHomeRuns,
      totalGames: stadium.totalGames,
      averageHRsPerGame: stadium.averageHRsPerGame,
      homeTeamHomeRuns: stadium.homeTeamHomeRuns,
      awayTeamHomeRuns: stadium.awayTeamHomeRuns,
      trends: stadium.trends
    }));
};

/**
 * Get stadiums with best home run performance for specific game hour
 * @param {number} gameHour - Game hour in UTC (0-23)
 * @param {number} limit - Number of stadiums to return
 * @param {number} minGames - Minimum games required for inclusion
 * @returns {Promise<Array>} Stadiums sorted by HR average for that hour
 */
export const getStadiumsByGameHour = async (gameHour, limit = 10, minGames = 3) => {
  const data = await fetchStadiumData();
  const stadiums = Object.values(data.stadiums || {});
  
  const hourResults = [];
  
  stadiums.forEach(stadium => {
    const hourStats = stadium.timingStats?.byGameHour?.[gameHour];
    if (hourStats && hourStats.games >= minGames) {
      const average = (hourStats.homeRuns / hourStats.games).toFixed(2);
      hourResults.push({
        stadiumName: stadium.name,
        homeTeam: stadium.homeTeam,
        games: hourStats.games,
        homeRuns: hourStats.homeRuns,
        averageHRs: parseFloat(average),
        gameHour,
        timeString: `${gameHour.toString().padStart(2, '0')}:00`
      });
    }
  });
  
  return hourResults
    .sort((a, b) => b.averageHRs - a.averageHRs)
    .slice(0, limit);
};

/**
 * Get stadiums with best home run performance for specific hour range
 * @param {number} startHour - Start hour in UTC (0-23)
 * @param {number} endHour - End hour in UTC (0-23)
 * @param {number} limit - Number of stadiums to return
 * @param {number} minGames - Minimum games required for inclusion
 * @returns {Promise<Array>} Stadiums sorted by HR average for that hour range
 */
export const getStadiumsByHourRange = async (startHour, endHour, limit = 10, minGames = 3) => {
  const data = await fetchStadiumData();
  const stadiums = Object.values(data.stadiums || {});
  
  const rangeResults = [];
  
  stadiums.forEach(stadium => {
    let totalGames = 0;
    let totalHomeRuns = 0;
    
    // Sum stats for all hours in the range
    for (let hour = startHour; hour <= endHour; hour++) {
      const hourStats = stadium.timingStats?.byGameHour?.[hour];
      if (hourStats) {
        totalGames += hourStats.games;
        totalHomeRuns += hourStats.homeRuns;
      }
    }
    
    if (totalGames >= minGames) {
      const average = (totalHomeRuns / totalGames).toFixed(2);
      rangeResults.push({
        stadiumName: stadium.name,
        homeTeam: stadium.homeTeam,
        games: totalGames,
        homeRuns: totalHomeRuns,
        averageHRs: parseFloat(average),
        hourRange: `${startHour.toString().padStart(2, '0')}:00-${endHour.toString().padStart(2, '0')}:00`
      });
    }
  });
  
  return rangeResults
    .sort((a, b) => b.averageHRs - a.averageHRs)
    .slice(0, limit);
};

/**
 * Get peak hours analysis across all stadiums
 * @param {number} minGames - Minimum games per hour for inclusion
 * @returns {Promise<Object>} Peak hours analysis
 */
export const getPeakHoursAnalysis = async (minGames = 10) => {
  const data = await fetchStadiumData();
  const stadiums = Object.values(data.stadiums || {});
  
  // Aggregate by hour across all stadiums
  const hourlyTotals = {};
  
  stadiums.forEach(stadium => {
    Object.entries(stadium.timingStats?.byGameHour || {}).forEach(([hour, stats]) => {
      const hourNum = parseInt(hour);
      if (!hourlyTotals[hourNum]) {
        hourlyTotals[hourNum] = { games: 0, homeRuns: 0 };
      }
      hourlyTotals[hourNum].games += stats.games;
      hourlyTotals[hourNum].homeRuns += stats.homeRuns;
    });
  });
  
  // Calculate averages and find peak hours
  const hourlyAnalysis = Object.entries(hourlyTotals)
    .map(([hour, stats]) => ({
      hour: parseInt(hour),
      timeString: `${hour.padStart(2, '0')}:00`,
      games: stats.games,
      homeRuns: stats.homeRuns,
      average: stats.games >= minGames ? (stats.homeRuns / stats.games).toFixed(2) : null
    }))
    .filter(item => item.average !== null)
    .sort((a, b) => parseFloat(b.average) - parseFloat(a.average));
  
  return {
    allHours: hourlyAnalysis,
    peakHour: hourlyAnalysis[0] || null,
    topThreeHours: hourlyAnalysis.slice(0, 3),
    dayGameHours: hourlyAnalysis.filter(h => h.hour < 17),
    nightGameHours: hourlyAnalysis.filter(h => h.hour >= 18),
    totalGamesAnalyzed: Object.values(hourlyTotals).reduce((sum, stats) => sum + stats.games, 0),
    totalHomeRunsAnalyzed: Object.values(hourlyTotals).reduce((sum, stats) => sum + stats.homeRuns, 0)
  };
};

/**
 * Get games filtered by specific hour or hour range
 * @param {Object} filters - Filter options
 * @param {number} filters.hour - Specific hour filter (optional)
 * @param {number} filters.startHour - Start hour for range filter (optional)
 * @param {number} filters.endHour - End hour for range filter (optional)
 * @param {string} filters.dayOfWeek - Day of week filter (optional)
 * @param {string} filters.stadium - Stadium name filter (optional)
 * @param {number} filters.minHomeRuns - Minimum home runs in game (optional)
 * @param {number} limit - Maximum games to return
 * @returns {Promise<Array>} Filtered games
 */
export const getGamesByTimeFilters = async (filters = {}, limit = 50) => {
  const data = await fetchStadiumData();
  const stadiums = Object.values(data.stadiums || {});
  
  const {
    hour,
    startHour,
    endHour,
    dayOfWeek,
    stadium,
    minHomeRuns = 0
  } = filters;
  
  const filteredGames = [];
  
  stadiums.forEach(stadiumData => {
    // Skip if stadium filter doesn't match
    if (stadium && stadiumData.name !== stadium) {
      return;
    }
    
    stadiumData.games?.forEach(game => {
      // Skip if HR filter doesn't match
      if (game.totalHRs < minHomeRuns) {
        return;
      }
      
      // Skip if day of week filter doesn't match
      if (dayOfWeek && game.timing?.dayName !== dayOfWeek) {
        return;
      }
      
      // Skip if hour filters don't match
      if (hour !== undefined && game.timing?.gameHour !== hour) {
        return;
      }
      
      if (startHour !== undefined && endHour !== undefined) {
        const gameHour = game.timing?.gameHour;
        if (gameHour < startHour || gameHour > endHour) {
          return;
        }
      }
      
      filteredGames.push({
        ...game,
        stadiumName: stadiumData.name,
        homeTeam: stadiumData.homeTeam
      });
    });
  });
  
  return filteredGames
    .sort((a, b) => {
      // Sort by total HRs first, then by date (most recent)
      if (b.totalHRs !== a.totalHRs) {
        return b.totalHRs - a.totalHRs;
      }
      return new Date(b.date) - new Date(a.date);
    })
    .slice(0, limit);
};

/**
 * Get stadiums with best home run performance for specific time slot
 * @param {string} timeSlot - Time slot (e.g., "Weekend Afternoon", "Weekday Night")
 * @param {number} limit - Number of stadiums to return
 * @param {number} minGames - Minimum games required for inclusion
 * @returns {Promise<Array>} Stadiums sorted by HR average for that time slot
 */
export const getStadiumsByTimeSlot = async (timeSlot, limit = 10, minGames = 3) => {
  const data = await fetchStadiumData();
  const stadiums = Object.values(data.stadiums || {});
  
  const slotResults = [];
  
  stadiums.forEach(stadium => {
    const slotStats = stadium.timingStats?.byTimeSlot?.[timeSlot];
    if (slotStats && slotStats.games >= minGames) {
      const average = (slotStats.homeRuns / slotStats.games).toFixed(2);
      slotResults.push({
        stadiumName: stadium.name,
        homeTeam: stadium.homeTeam,
        games: slotStats.games,
        homeRuns: slotStats.homeRuns,
        averageHRs: parseFloat(average),
        timeSlot
      });
    }
  });
  
  return slotResults
    .sort((a, b) => b.averageHRs - a.averageHRs)
    .slice(0, limit);
};

/**
 * Get day vs night analysis across all stadiums
 * @returns {Promise<Object>} Day vs night HR analysis
 */
export const getDayVsNightAnalysis = async () => {
  const data = await fetchStadiumData();
  const stadiums = Object.values(data.stadiums || {});
  
  let totalDayGames = 0;
  let totalDayHRs = 0;
  let totalNightGames = 0;
  let totalNightHRs = 0;
  
  const stadiumBreakdown = [];
  
  stadiums.forEach(stadium => {
    const dayStats = stadium.timingStats?.dayVsNight?.dayGames;
    const nightStats = stadium.timingStats?.dayVsNight?.nightGames;
    
    if (dayStats) {
      totalDayGames += dayStats.games;
      totalDayHRs += dayStats.homeRuns;
    }
    
    if (nightStats) {
      totalNightGames += nightStats.games;
      totalNightHRs += nightStats.homeRuns;
    }
    
    // Only include stadiums with both day and night games
    if (dayStats?.games > 0 && nightStats?.games > 0) {
      const dayAvg = dayStats.homeRuns / dayStats.games;
      const nightAvg = nightStats.homeRuns / nightStats.games;
      
      stadiumBreakdown.push({
        stadiumName: stadium.name,
        homeTeam: stadium.homeTeam,
        dayGames: dayStats.games,
        dayHRs: dayStats.homeRuns,
        dayAverage: dayAvg.toFixed(2),
        nightGames: nightStats.games,
        nightHRs: nightStats.homeRuns,
        nightAverage: nightAvg.toFixed(2),
        preference: stadium.trends?.dayVsNightPreference?.preference || 'neutral',
        difference: (nightAvg - dayAvg).toFixed(2)
      });
    }
  });
  
  return {
    overall: {
      dayGames: totalDayGames,
      dayHRs: totalDayHRs,
      dayAverage: totalDayGames > 0 ? (totalDayHRs / totalDayGames).toFixed(2) : '0.00',
      nightGames: totalNightGames,
      nightHRs: totalNightHRs,
      nightAverage: totalNightGames > 0 ? (totalNightHRs / totalNightGames).toFixed(2) : '0.00',
      totalAdvantage: totalNightHRs > totalDayHRs ? 'night' : 'day'
    },
    stadiumBreakdown: stadiumBreakdown.sort((a, b) => Math.abs(parseFloat(b.difference)) - Math.abs(parseFloat(a.difference)))
  };
};

/**
 * Get weekday vs weekend analysis across all stadiums
 * @returns {Promise<Object>} Weekday vs weekend HR analysis
 */
export const getWeekdayVsWeekendAnalysis = async () => {
  const data = await fetchStadiumData();
  const stadiums = Object.values(data.stadiums || {});
  
  let totalWeekdayGames = 0;
  let totalWeekdayHRs = 0;
  let totalWeekendGames = 0;
  let totalWeekendHRs = 0;
  
  const stadiumBreakdown = [];
  
  stadiums.forEach(stadium => {
    const weekdayStats = stadium.timingStats?.weekdayVsWeekend?.weekday;
    const weekendStats = stadium.timingStats?.weekdayVsWeekend?.weekend;
    
    if (weekdayStats) {
      totalWeekdayGames += weekdayStats.games;
      totalWeekdayHRs += weekdayStats.homeRuns;
    }
    
    if (weekendStats) {
      totalWeekendGames += weekendStats.games;
      totalWeekendHRs += weekendStats.homeRuns;
    }
    
    // Only include stadiums with both weekday and weekend games
    if (weekdayStats?.games > 0 && weekendStats?.games > 0) {
      const weekdayAvg = weekdayStats.homeRuns / weekdayStats.games;
      const weekendAvg = weekendStats.homeRuns / weekendStats.games;
      
      stadiumBreakdown.push({
        stadiumName: stadium.name,
        homeTeam: stadium.homeTeam,
        weekdayGames: weekdayStats.games,
        weekdayHRs: weekdayStats.homeRuns,
        weekdayAverage: weekdayAvg.toFixed(2),
        weekendGames: weekendStats.games,
        weekendHRs: weekendStats.homeRuns,
        weekendAverage: weekendAvg.toFixed(2),
        preference: stadium.trends?.weekdayVsWeekendPreference?.preference || 'neutral',
        difference: (weekendAvg - weekdayAvg).toFixed(2)
      });
    }
  });
  
  return {
    overall: {
      weekdayGames: totalWeekdayGames,
      weekdayHRs: totalWeekdayHRs,
      weekdayAverage: totalWeekdayGames > 0 ? (totalWeekdayHRs / totalWeekdayGames).toFixed(2) : '0.00',
      weekendGames: totalWeekendGames,
      weekendHRs: totalWeekendHRs,
      weekendAverage: totalWeekendGames > 0 ? (totalWeekendHRs / totalWeekendGames).toFixed(2) : '0.00',
      totalAdvantage: totalWeekendHRs > totalWeekdayHRs ? 'weekend' : 'weekday'
    },
    stadiumBreakdown: stadiumBreakdown.sort((a, b) => Math.abs(parseFloat(b.difference)) - Math.abs(parseFloat(a.difference)))
  };
};

/**
 * Get games filtered by day of week and/or game hour
 * @param {Object} filters - Filter options
 * @param {string} filters.dayOfWeek - Day of week filter (optional)
 * @param {number} filters.gameHour - Game hour filter in UTC (optional)
 * @param {number} filters.startHour - Start hour for range filter (optional)
 * @param {number} filters.endHour - End hour for range filter (optional)
 * @param {string} filters.stadium - Stadium name filter (optional)
 * @param {number} filters.minHomeRuns - Minimum home runs in game (optional)
 * @param {number} limit - Maximum games to return
 * @returns {Promise<Array>} Filtered games
 */
export const getFilteredGames = async (filters = {}, limit = 50) => {
  const data = await fetchStadiumData();
  const stadiums = Object.values(data.stadiums || {});
  
  const {
    dayOfWeek,
    gameHour,
    startHour,
    endHour,
    stadium,
    minHomeRuns = 0
  } = filters;
  
  const filteredGames = [];
  
  stadiums.forEach(stadiumData => {
    // Skip if stadium filter doesn't match
    if (stadium && stadiumData.name !== stadium) {
      return;
    }
    
    stadiumData.games?.forEach(game => {
      // Skip if HR filter doesn't match
      if (game.totalHRs < minHomeRuns) {
        return;
      }
      
      // Skip if day of week filter doesn't match
      if (dayOfWeek && game.timing?.dayName !== dayOfWeek) {
        return;
      }
      
      // Skip if specific hour filter doesn't match
      if (gameHour !== undefined && game.timing?.gameHour !== gameHour) {
        return;
      }
      
      // Skip if hour range filter doesn't match
      if (startHour !== undefined && endHour !== undefined) {
        const hour = game.timing?.gameHour;
        if (hour < startHour || hour > endHour) {
          return;
        }
      }
      
      filteredGames.push({
        ...game,
        stadiumName: stadiumData.name,
        homeTeam: stadiumData.homeTeam
      });
    });
  });
  
  return filteredGames
    .sort((a, b) => {
      // Sort by total HRs first, then by date (most recent)
      if (b.totalHRs !== a.totalHRs) {
        return b.totalHRs - a.totalHRs;
      }
      return new Date(b.date) - new Date(a.date);
    })
    .slice(0, limit);
};

/**
 * Get timing analysis summary for all stadiums
 * @returns {Promise<Object>} Comprehensive timing analysis
 */
export const getTimingAnalysisSummary = async () => {
  const data = await fetchStadiumData();
  const stadiums = Object.values(data.stadiums || {});
  
  // Aggregate data by day of week and game hour
  const dayOfWeekTotals = {};
  const gameHourTotals = {};
  const timeSlotTotals = {};
  
  stadiums.forEach(stadium => {
    // Process day of week data
    Object.entries(stadium.timingStats?.byDayOfWeek || {}).forEach(([day, stats]) => {
      if (!dayOfWeekTotals[day]) {
        dayOfWeekTotals[day] = { games: 0, homeRuns: 0 };
      }
      dayOfWeekTotals[day].games += stats.games;
      dayOfWeekTotals[day].homeRuns += stats.homeRuns;
    });
    
    // Process game hour data
    Object.entries(stadium.timingStats?.byGameHour || {}).forEach(([hour, stats]) => {
      if (!gameHourTotals[hour]) {
        gameHourTotals[hour] = { games: 0, homeRuns: 0 };
      }
      gameHourTotals[hour].games += stats.games;
      gameHourTotals[hour].homeRuns += stats.homeRuns;
    });
    
    // Process time slot data
    Object.entries(stadium.timingStats?.byTimeSlot || {}).forEach(([slot, stats]) => {
      if (!timeSlotTotals[slot]) {
        timeSlotTotals[slot] = { games: 0, homeRuns: 0 };
      }
      timeSlotTotals[slot].games += stats.games;
      timeSlotTotals[slot].homeRuns += stats.homeRuns;
    });
  });
  
  // Calculate averages and find best performers
  const dayOfWeekAnalysis = Object.entries(dayOfWeekTotals)
    .map(([day, stats]) => ({
      dayOfWeek: day,
      games: stats.games,
      homeRuns: stats.homeRuns,
      average: stats.games > 0 ? (stats.homeRuns / stats.games).toFixed(2) : '0.00'
    }))
    .sort((a, b) => parseFloat(b.average) - parseFloat(a.average));
  
  const gameHourAnalysis = Object.entries(gameHourTotals)
    .map(([hour, stats]) => ({
      gameHour: parseInt(hour),
      timeString: `${hour.padStart(2, '0')}:00`,
      games: stats.games,
      homeRuns: stats.homeRuns,
      average: stats.games > 0 ? (stats.homeRuns / stats.games).toFixed(2) : '0.00'
    }))
    .sort((a, b) => parseFloat(b.average) - parseFloat(a.average));
  
  const timeSlotAnalysis = Object.entries(timeSlotTotals)
    .map(([slot, stats]) => ({
      timeSlot: slot,
      games: stats.games,
      homeRuns: stats.homeRuns,
      average: stats.games > 0 ? (stats.homeRuns / stats.games).toFixed(2) : '0.00'
    }))
    .sort((a, b) => parseFloat(b.average) - parseFloat(a.average));
  
  return {
    dayOfWeekAnalysis,
    gameHourAnalysis,
    timeSlotAnalysis,
    bestDay: dayOfWeekAnalysis[0] || null,
    bestGameHour: gameHourAnalysis[0] || null,
    bestTimeSlot: timeSlotAnalysis[0] || null,
    peakHours: gameHourAnalysis.slice(0, 5) // Top 5 hours
  };
};

/**
 * Get stadium-specific analysis
 * @param {string} stadiumName - Name of the stadium
 * @returns {Promise<Object|null>} Detailed stadium analysis
 */
export const getStadiumAnalysis = async (stadiumName) => {
  const data = await fetchStadiumData();
  return data.stadiums?.[stadiumName] || null;
};

/**
 * Get stadiums where specific teams have played
 * @param {string} teamAbbr - Team abbreviation
 * @returns {Promise<Array>} Stadiums where team has played with their performance
 */
export const getTeamStadiumPerformance = async (teamAbbr) => {
  const data = await fetchStadiumData();
  const stadiums = Object.values(data.stadiums || {});
  
  const teamPerformance = [];
  
  stadiums.forEach(stadium => {
    const teamStats = stadium.teamStats?.[teamAbbr];
    if (teamStats) {
      teamPerformance.push({
        stadiumName: stadium.name,
        homeTeam: stadium.homeTeam,
        isHomeStadium: stadium.homeTeam === teamAbbr,
        gamesPlayed: teamStats.gamesPlayed,
        totalHomeRuns: teamStats.homeRuns,
        homeHRs: teamStats.homeHRs,
        awayHRs: teamStats.awayHRs,
        averageHRsPerGame: teamStats.gamesPlayed > 0 
          ? (teamStats.homeRuns / teamStats.gamesPlayed).toFixed(2) 
          : '0.00'
      });
    }
  });
  
  return teamPerformance.sort((a, b) => b.totalHomeRuns - a.totalHomeRuns);
};

/**
 * Get recent games with high home run counts
 * @param {number} minHomeRuns - Minimum home runs in a game
 * @param {number} limit - Number of games to return
 * @returns {Promise<Array>} Recent high home run games
 */
export const getHighHomeRunGames = async (minHomeRuns = 4, limit = 20) => {
  const data = await fetchStadiumData();
  const stadiums = Object.values(data.stadiums || {});
  
  const highHRGames = [];
  
  stadiums.forEach(stadium => {
    stadium.games?.forEach(game => {
      if (game.totalHRs >= minHomeRuns) {
        highHRGames.push({
          stadiumName: stadium.name,
          homeTeam: stadium.homeTeam,
          gameDate: game.date,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          homeTeamHRs: game.homeTeamHRs,
          awayTeamHRs: game.awayTeamHRs,
          totalHRs: game.totalHRs,
          gameId: game.gameId
        });
      }
    });
  });
  
  return highHRGames
    .sort((a, b) => {
      // Sort by total HRs first, then by date (most recent)
      if (b.totalHRs !== a.totalHRs) {
        return b.totalHRs - a.totalHRs;
      }
      return new Date(b.gameDate) - new Date(a.gameDate);
    })
    .slice(0, limit);
};

/**
 * Get stadium trends analysis
 * @returns {Promise<Object>} Stadium trends summary
 */
export const getStadiumTrends = async () => {
  const data = await fetchStadiumData();
  const stadiums = Object.values(data.stadiums || {});
  
  const trends = {
    mostHRsInSingleGame: null,
    bestHRStadiums: [],
    emergingStadiums: [],
    homeFieldAdvantage: []
  };
  
  // Find game with most HRs
  let maxHRs = 0;
  stadiums.forEach(stadium => {
    if (stadium.trends?.mostHRsInGame > maxHRs) {
      maxHRs = stadium.trends.mostHRsInGame;
      trends.mostHRsInSingleGame = {
        stadiumName: stadium.name,
        homeTeam: stadium.homeTeam,
        homeRuns: stadium.trends.mostHRsInGame,
        date: stadium.trends.mostHRsInGameDate
      };
    }
  });
  
  // Best HR stadiums (high average with sufficient games)
  trends.bestHRStadiums = stadiums
    .filter(s => s.totalGames >= 10)
    .sort((a, b) => parseFloat(b.averageHRsPerGame) - parseFloat(a.averageHRsPerGame))
    .slice(0, 5)
    .map(s => ({
      name: s.name,
      homeTeam: s.homeTeam,
      averageHRsPerGame: s.averageHRsPerGame,
      totalGames: s.totalGames
    }));
  
  // Home field advantage analysis
  trends.homeFieldAdvantage = stadiums
    .filter(s => s.totalGames >= 5)
    .map(s => {
      const homeAdvantage = s.homeTeamHomeRuns - s.awayTeamHomeRuns;
      const homeAdvantagePercentage = s.totalHomeRuns > 0 
        ? ((s.homeTeamHomeRuns / s.totalHomeRuns) * 100).toFixed(1)
        : 0;
      
      return {
        stadiumName: s.name,
        homeTeam: s.homeTeam,
        homeAdvantage,
        homeAdvantagePercentage: parseFloat(homeAdvantagePercentage),
        totalGames: s.totalGames
      };
    })
    .sort((a, b) => b.homeAdvantagePercentage - a.homeAdvantagePercentage)
    .slice(0, 10);
  
  return trends;
};

/**
 * Get formatted data for dashboard display
 * @param {string} type - Type of display data needed
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Formatted data for dashboard
 */
export const getStadiumDisplayData = async (type, options = {}) => {
  const {
    limit = 10,
    minGames = 5,
    teamFilter = null,
    dayOfWeek = null,
    gameHour = null,
    startHour = null,
    endHour = null,
    timeSlot = null
  } = options;
  
  switch (type) {
    case 'topTotal':
      return await getTopStadiumsByTotal(limit);
      
    case 'topAverage':
      return await getTopStadiumsByAverage(limit, minGames);
      
    case 'homeAdvantage':
      const trends = await getStadiumTrends();
      return trends.homeFieldAdvantage.slice(0, limit);
      
    case 'teamPerformance':
      if (!teamFilter) throw new Error('Team filter required for team performance data');
      return await getTeamStadiumPerformance(teamFilter);
      
    case 'highHRGames':
      return await getHighHomeRunGames(options.minHomeRuns || 4, limit);
      
    case 'dayOfWeek':
      if (!dayOfWeek) throw new Error('Day of week required for day-of-week analysis');
      return await getStadiumsByDayOfWeek(dayOfWeek, limit, minGames);
      
    case 'gameHour':
      if (gameHour === undefined) throw new Error('Game hour required for game hour analysis');
      return await getStadiumsByGameHour(gameHour, limit, minGames);
      
    case 'hourRange':
      if (startHour === undefined || endHour === undefined) {
        throw new Error('Start hour and end hour required for hour range analysis');
      }
      return await getStadiumsByHourRange(startHour, endHour, limit, minGames);
      
    case 'timeSlot':
      if (!timeSlot) throw new Error('Time slot required for time slot analysis');
      return await getStadiumsByTimeSlot(timeSlot, limit, minGames);
      
    case 'dayVsNight':
      return await getDayVsNightAnalysis();
      
    case 'weekdayVsWeekend':
      return await getWeekdayVsWeekendAnalysis();
      
    case 'peakHours':
      return await getPeakHoursAnalysis(options.minGamesPerHour || 10);
      
    case 'timingAnalysis':
      return await getTimingAnalysisSummary();
      
    case 'filteredGames':
      return await getFilteredGames({
        dayOfWeek: options.dayOfWeek,
        gameHour: options.gameHour,
        startHour: options.startHour,
        endHour: options.endHour,
        stadium: options.stadium,
        minHomeRuns: options.minHomeRuns
      }, limit);
      
    case 'hourlyGames':
      return await getGamesByTimeFilters({
        hour: options.hour,
        startHour: options.startHour,
        endHour: options.endHour,
        dayOfWeek: options.dayOfWeek,
        stadium: options.stadium,
        minHomeRuns: options.minHomeRuns
      }, limit);
      
    case 'summary':
      const data = await fetchStadiumData();
      return data.summary;
      
    default:
      throw new Error(`Unknown display type: ${type}`);
  }
};

/**
 * Get home vs away analysis
 * @returns {Promise<Object>} Home vs away HR analysis
 */
export const getHomeVsAwayAnalysis = async () => {
  const data = await fetchStadiumData();
  return data.summary?.homeVsAwayAnalysis || {
    totalHomeTeamHRs: 0,
    totalAwayTeamHRs: 0,
    homeAdvantage: false
  };
};

/**
 * Clear the stadium data cache
 */
export const clearStadiumDataCache = () => {
  stadiumDataCache = null;
  lastFetchTime = null;
  console.log('🗑️ Stadium data cache cleared');
};

/**
 * Check if stadium data is available
 * @returns {Promise<boolean>} True if data is available
 */
export const isStadiumDataAvailable = async () => {
  try {
    const response = await fetch('/data/stadium/stadium_hr_analysis.json', { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};

export default {
  fetchStadiumData,
  getTopStadiumsByTotal,
  getTopStadiumsByAverage,
  getStadiumsForTeams,
  getHomeVsAwayAnalysis,
  getStadiumAnalysis,
  getTeamStadiumPerformance,
  getHighHomeRunGames,
  getStadiumTrends,
  getStadiumDisplayData,
  clearStadiumDataCache,
  isStadiumDataAvailable,
  // Enhanced timing-based functions with specific hours
  getStadiumsByDayOfWeek,
  getStadiumsByGameHour,
  getStadiumsByHourRange,
  getStadiumsByTimeSlot,
  getDayVsNightAnalysis,
  getWeekdayVsWeekendAnalysis,
  getFilteredGames,
  getGamesByTimeFilters,
  getPeakHoursAnalysis,
  getTimingAnalysisSummary
};