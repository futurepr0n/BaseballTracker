// PitcherAnalysis.js
// Handles pitcher recent performance analysis including home/away splits

export const getLastNGamesPitcher = (pitcherName, dailyData, rosterData, nGames = 7) => {
  console.log(`Getting pitcher performance for ${pitcherName}`);
  
  // Find pitcher's name as used in daily data
  let dailyPitcherName = null;
  
  // First try to find via roster
  for (const player of rosterData) {
    if (player.fullName === pitcherName || player.name === pitcherName) {
      dailyPitcherName = player.name;
      break;
    }
  }
  
  // If not found, search in daily data
  if (!dailyPitcherName && Object.keys(dailyData).length > 0) {
    const recentDates = Object.keys(dailyData).sort().reverse().slice(0, 5);
    for (const date of recentDates) {
      const dayData = dailyData[date];
      for (const player of dayData.players || []) {
        if (player.playerType === 'pitcher' && 
            (player.name === pitcherName || player.fullName === pitcherName)) {
          dailyPitcherName = player.name;
          break;
        }
      }
      if (dailyPitcherName) break;
    }
  }
  
  if (!dailyPitcherName) {
    console.log(`Could not find pitcher ${pitcherName} in daily data`);
    return [];
  }
  
  console.log(`Found pitcher in daily data as: ${dailyPitcherName}`);
  
  // Collect games in chronological order
  const gamesChronological = [];
  const sortedDates = Object.keys(dailyData).sort();
  
  for (const dateStr of sortedDates) {
    const dayData = dailyData[dateStr];
    let pitcherDataToday = null;
    
    // Get game info to determine home/away
    const gameInfo = dayData.game_info || {};
    const homeTeam = gameInfo.home_team || '';
    const awayTeam = gameInfo.away_team || '';
    
    for (const player of dayData.players || []) {
      if (player.name === dailyPitcherName && player.playerType === 'pitcher') {
        pitcherDataToday = player;
        break;
      }
    }
    
    if (pitcherDataToday) {
      try {
        // Determine if pitcher is at home or away
        const pitcherTeam = pitcherDataToday.team || '';
        const isHomeGame = (pitcherTeam === homeTeam);
        
        const gameStats = {
          date: dateStr,
          IP: parseFloat(pitcherDataToday.IP || 0),
          H: parseInt(pitcherDataToday.H || 0),
          R: parseInt(pitcherDataToday.R || 0),
          ER: parseInt(pitcherDataToday.ER || 0),
          HR: parseInt(pitcherDataToday.HR || 0),
          BB: parseInt(pitcherDataToday.BB || 0),
          K: parseInt(pitcherDataToday.K || 0),
          ERA: parseFloat(pitcherDataToday.ERA || 0),
          WHIP: parseFloat(pitcherDataToday.WHIP || 0),
          team: pitcherTeam,
          is_home: isHomeGame,
          opponent: isHomeGame ? awayTeam : homeTeam
        };
        
        gamesChronological.push(gameStats);
        console.log(`Added game ${dateStr}: ${gameStats.IP} IP, ${gameStats.H} H, ${gameStats.HR} HR, ${gameStats.K} K, Home: ${isHomeGame}`);
      } catch (error) {
        console.error(`Error processing pitcher data for ${dateStr}:`, error);
      }
    }
  }
  
  // Return last N games in reverse chronological order (most recent first)
  return gamesChronological.slice(-nGames).reverse();
};

export const calculatePitcherRecentTrends = (gamesPerformance) => {
  if (!gamesPerformance || gamesPerformance.length === 0) {
    console.log("No pitcher games to analyze");
    return {};
  }
  
  const numGames = gamesPerformance.length;
  console.log(`Calculating pitcher trends for ${numGames} games`);
  
  // Calculate totals
  const totals = gamesPerformance.reduce((acc, g) => ({
    ip: acc.ip + g.IP,
    h: acc.h + g.H,
    hr: acc.hr + g.HR,
    bb: acc.bb + g.BB,
    k: acc.k + g.K,
    er: acc.er + g.ER
  }), { ip: 0, h: 0, hr: 0, bb: 0, k: 0, er: 0 });
  
  // Separate home/away stats
  const homeGames = gamesPerformance.filter(g => g.is_home);
  const awayGames = gamesPerformance.filter(g => !g.is_home);
  
  const homeStats = {
    games: homeGames.length,
    h: homeGames.reduce((sum, g) => sum + g.H, 0),
    hr: homeGames.reduce((sum, g) => sum + g.HR, 0),
    k: homeGames.reduce((sum, g) => sum + g.K, 0),
    ip: homeGames.reduce((sum, g) => sum + g.IP, 0)
  };
  
  const awayStats = {
    games: awayGames.length,
    h: awayGames.reduce((sum, g) => sum + g.H, 0),
    hr: awayGames.reduce((sum, g) => sum + g.HR, 0),
    k: awayGames.reduce((sum, g) => sum + g.K, 0),
    ip: awayGames.reduce((sum, g) => sum + g.IP, 0)
  };
  
  // Calculate averages and rates
  const avgERA = gamesPerformance
    .filter(g => g.IP > 0)
    .reduce((sum, g) => sum + g.ERA, 0) / gamesPerformance.filter(g => g.IP > 0).length || 0;
    
  const avgWHIP = gamesPerformance
    .filter(g => g.IP > 0)
    .reduce((sum, g) => sum + g.WHIP, 0) / gamesPerformance.filter(g => g.IP > 0).length || 0;
  
  const recentStats = {
    total_games: numGames,
    total_ip: totals.ip,
    total_h: totals.h,
    total_hr: totals.hr,
    total_bb: totals.bb,
    total_k: totals.k,
    total_er: totals.er,
    avg_era: avgERA,
    avg_whip: avgWHIP,
    h_per_9: totals.ip > 0 ? (totals.h / totals.ip) * 9 : 0,
    hr_per_9: totals.ip > 0 ? (totals.hr / totals.ip) * 9 : 0,
    k_per_9: totals.ip > 0 ? (totals.k / totals.ip) * 9 : 0,
    bb_per_9: totals.ip > 0 ? (totals.bb / totals.ip) * 9 : 0,
    h_per_game: numGames > 0 ? totals.h / numGames : 0,
    hr_per_game: numGames > 0 ? totals.hr / numGames : 0,
    k_per_game: numGames > 0 ? totals.k / numGames : 0,
    home_stats: homeStats,
    away_stats: awayStats
  };
  
  // Calculate home/away per-game averages
  if (homeStats.games > 0) {
    recentStats.home_h_per_game = homeStats.h / homeStats.games;
    recentStats.home_hr_per_game = homeStats.hr / homeStats.games;
    recentStats.home_k_per_game = homeStats.k / homeStats.games;
  } else {
    recentStats.home_h_per_game = 0;
    recentStats.home_hr_per_game = 0;
    recentStats.home_k_per_game = 0;
  }
  
  if (awayStats.games > 0) {
    recentStats.away_h_per_game = awayStats.h / awayStats.games;
    recentStats.away_hr_per_game = awayStats.hr / awayStats.games;
    recentStats.away_k_per_game = awayStats.k / awayStats.games;
  } else {
    recentStats.away_h_per_game = 0;
    recentStats.away_hr_per_game = 0;
    recentStats.away_k_per_game = 0;
  }
  
  // Calculate trends (first half vs second half)
  if (numGames >= 2) {
    const midPoint = Math.floor(numGames / 2);
    const recentHalf = gamesPerformance.slice(0, midPoint); // More recent games
    const earlierHalf = gamesPerformance.slice(midPoint); // Earlier games
    
    if (recentHalf.length > 0 && earlierHalf.length > 0) {
      // ERA trend
      const recentERA = recentHalf
        .filter(g => g.IP > 0)
        .reduce((sum, g) => sum + g.ERA, 0) / recentHalf.filter(g => g.IP > 0).length || 0;
      const earlyERA = earlierHalf
        .filter(g => g.IP > 0)
        .reduce((sum, g) => sum + g.ERA, 0) / earlierHalf.filter(g => g.IP > 0).length || 0;
      
      const trendDirection = recentERA < earlyERA ? 'improving' : 
                            recentERA > earlyERA ? 'declining' : 'stable';
      
      recentStats.trend_metric = 'ERA';
      recentStats.trend_recent_val = Math.round(recentERA * 1000) / 1000;
      recentStats.trend_early_val = Math.round(earlyERA * 1000) / 1000;
      recentStats.trend_direction = trendDirection;
      recentStats.trend_magnitude = Math.abs(recentERA - earlyERA);
      
      console.log(`Pitcher ERA trend: ${trendDirection} (${earlyERA.toFixed(3)} -> ${recentERA.toFixed(3)})`);
      
      // HR rate trend
      const recentHRIP = recentHalf.reduce((sum, g) => sum + g.IP, 0);
      const recentHRAllowed = recentHalf.reduce((sum, g) => sum + g.HR, 0);
      const recentHRRate = recentHRIP > 0 ? (recentHRAllowed / recentHRIP) * 9 : 0;
      
      const earlyHRIP = earlierHalf.reduce((sum, g) => sum + g.IP, 0);
      const earlyHRAllowed = earlierHalf.reduce((sum, g) => sum + g.HR, 0);
      const earlyHRRate = earlyHRIP > 0 ? (earlyHRAllowed / earlyHRIP) * 9 : 0;
      
      recentStats.hr_rate_trend = {
        early_val: Math.round(earlyHRRate * 1000) / 1000,
        recent_val: Math.round(recentHRRate * 1000) / 1000,
        direction: recentHRRate < earlyHRRate ? 'improving' : 
                  recentHRRate > earlyHRRate ? 'declining' : 'stable',
        magnitude: Math.abs(recentHRRate - earlyHRRate)
      };
    }
  }
  
  console.log(`Pitcher stats summary - Games: ${numGames}, ERA: ${recentStats.avg_era.toFixed(3)}, H/game: ${recentStats.h_per_game.toFixed(1)}, HR/game: ${recentStats.hr_per_game.toFixed(1)}, K/game: ${recentStats.k_per_game.toFixed(1)}`);
  console.log(`Pitcher trend direction: ${recentStats.trend_direction || 'N/A'}`);
  
  return recentStats;
};