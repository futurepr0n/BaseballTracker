/**
 * Team Standings Service
 * Calculates team records, playoff status, and motivational factors from game data
 */

import { fetchGameData } from './dataService';

// MLB team data mapping
const MLB_TEAMS = {
  // American League East
  'BAL': { league: 'AL', division: 'East', name: 'Baltimore Orioles' },
  'BOS': { league: 'AL', division: 'East', name: 'Boston Red Sox' },
  'NYY': { league: 'AL', division: 'East', name: 'New York Yankees' },
  'TB': { league: 'AL', division: 'East', name: 'Tampa Bay Rays' },
  'TOR': { league: 'AL', division: 'East', name: 'Toronto Blue Jays' },
  
  // American League Central
  'CWS': { league: 'AL', division: 'Central', name: 'Chicago White Sox' },
  'CLE': { league: 'AL', division: 'Central', name: 'Cleveland Guardians' },
  'DET': { league: 'AL', division: 'Central', name: 'Detroit Tigers' },
  'KC': { league: 'AL', division: 'Central', name: 'Kansas City Royals' },
  'MIN': { league: 'AL', division: 'Central', name: 'Minnesota Twins' },
  
  // American League West
  'HOU': { league: 'AL', division: 'West', name: 'Houston Astros' },
  'LAA': { league: 'AL', division: 'West', name: 'Los Angeles Angels' },
  'OAK': { league: 'AL', division: 'West', name: 'Oakland Athletics' },
  'SEA': { league: 'AL', division: 'West', name: 'Seattle Mariners' },
  'TEX': { league: 'AL', division: 'West', name: 'Texas Rangers' },
  
  // National League East
  'ATL': { league: 'NL', division: 'East', name: 'Atlanta Braves' },
  'MIA': { league: 'NL', division: 'East', name: 'Miami Marlins' },
  'NYM': { league: 'NL', division: 'East', name: 'New York Mets' },
  'PHI': { league: 'NL', division: 'East', name: 'Philadelphia Phillies' },
  'WSH': { league: 'NL', division: 'East', name: 'Washington Nationals' },
  
  // National League Central
  'CHC': { league: 'NL', division: 'Central', name: 'Chicago Cubs' },
  'CIN': { league: 'NL', division: 'Central', name: 'Cincinnati Reds' },
  'MIL': { league: 'NL', division: 'Central', name: 'Milwaukee Brewers' },
  'PIT': { league: 'NL', division: 'Central', name: 'Pittsburgh Pirates' },
  'STL': { league: 'NL', division: 'Central', name: 'St. Louis Cardinals' },
  
  // National League West
  'ARI': { league: 'NL', division: 'West', name: 'Arizona Diamondbacks' },
  'COL': { league: 'NL', division: 'West', name: 'Colorado Rockies' },
  'LAD': { league: 'NL', division: 'West', name: 'Los Angeles Dodgers' },
  'SD': { league: 'NL', division: 'West', name: 'San Diego Padres' },
  'SF': { league: 'NL', division: 'West', name: 'San Francisco Giants' }
};

class TeamStandingsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get team standings with playoff implications from scraped data
   */
  async getTeamStandings() {
    const cacheKey = 'team_standings';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const scrapedData = await this.loadScrapedStandings();
      
      if (scrapedData && scrapedData.standings && scrapedData.playoffContext) {
        console.log('🏆 Successfully loaded scraped standings data');
        
        const result = {
          standings: scrapedData.standings,
          playoffContext: scrapedData.playoffContext,
          lastUpdated: scrapedData.lastUpdated || new Date().toISOString()
        };

        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });

        return result;
      } else {
        console.warn('🏆 Scraped standings data incomplete, falling back to defaults');
        return this.getDefaultStandings();
      }
    } catch (error) {
      console.error('Error loading scraped standings data:', error);
      return this.getDefaultStandings();
    }
  }

  /**
   * Load scraped wildcard standings data from JSON file
   */
  async loadScrapedStandings() {
    try {
      console.log('🏆 Loading scraped wildcard standings data...');
      
      // Try to load the latest scraped standings file
      const response = await fetch('/data/standings/wildcard_standings_latest.json');
      
      if (!response.ok) {
        console.error(`🏆 Failed to load standings file: ${response.status} ${response.statusText}`);
        return null;
      }
      
      const scrapedData = await response.json();
      console.log(`🏆 Loaded scraped standings from ${scrapedData.date || 'unknown date'}`);
      console.log(`🏆 Found ${Object.keys(scrapedData.playoffContext || {}).length} teams with playoff context`);
      
      return scrapedData;
    } catch (error) {
      console.error('🏆 Error loading scraped standings:', error);
      return null;
    }
  }

  /**
   * Calculate team records from daily game data (LEGACY - kept for fallback)
   */
  async calculateStandingsFromGameData() {
    try {
      console.log('🏆 DEBUG: Starting standings calculation from game data');
      
      // Use MLB teams data for league/division info
      const teams = MLB_TEAMS;
      
      console.log(`🏆 DEBUG: Using ${Object.keys(teams).length} MLB teams from static data`);

      // Initialize team records
      const teamRecords = {};
      Object.keys(teams).forEach(abbr => {
        teamRecords[abbr] = {
          team: abbr,
          wins: 0,
          losses: 0,
          winPct: 0.000,
          gamesBack: 0,
          league: teams[abbr].league,
          division: teams[abbr].division,
          teamName: teams[abbr].name,
          recentRecord: { wins: 0, losses: 0, games: 0 } // Last 10 games
        };
      });

      // Get recent game data (last 30 days to build standings)
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      console.log(`🏆 DEBUG: Fetching game data from ${startDate.toDateString()} to ${endDate.toDateString()}`);
      console.log(`🏆 DEBUG: Exact date range: ${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')} to ${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`);
      
      const gameData = await this.getGameDataInDateRange(startDate, endDate);
      
      console.log(`🏆 DEBUG: Retrieved ${gameData.length} total games`);
      
      // Process games to calculate records
      let processedGames = 0;
      gameData.forEach(game => {
        if (game.status === 'Final' && game.homeScore !== undefined && game.awayScore !== undefined) {
          const homeTeam = game.homeTeam;
          const awayTeam = game.awayTeam;
          
          if (teamRecords[homeTeam] && teamRecords[awayTeam]) {
            processedGames++;
            if (game.homeScore > game.awayScore) {
              // Home team won
              teamRecords[homeTeam].wins++;
              teamRecords[awayTeam].losses++;
            } else {
              // Away team won
              teamRecords[awayTeam].wins++;
              teamRecords[homeTeam].losses++;
            }

            // Update recent record (assume recent games are more recent in data)
            this.updateRecentRecord(teamRecords[homeTeam], game.homeScore > game.awayScore);
            this.updateRecentRecord(teamRecords[awayTeam], game.awayScore > game.homeScore);
          } else {
            console.warn(`🏆 DEBUG: Unknown teams in game: ${homeTeam} vs ${awayTeam}`);
          }
        }
      });
      
      console.log(`🏆 DEBUG: Processed ${processedGames} completed games`);
      
      if (processedGames === 0) {
        console.error('🏆 ERROR: No completed games found in date range');
        throw new Error('No game data available for standings calculation');
      }

      // Calculate win percentages
      Object.keys(teamRecords).forEach(team => {
        const record = teamRecords[team];
        const totalGames = record.wins + record.losses;
        record.winPct = totalGames > 0 ? record.wins / totalGames : 0.000;
      });
      
      // Log some sample team records for debugging
      const sampleTeams = Object.keys(teamRecords).slice(0, 3);
      sampleTeams.forEach(team => {
        const record = teamRecords[team];
        console.log(`🏆 DEBUG: ${team} record: ${record.wins}-${record.losses} (${record.winPct.toFixed(3)})`);
      });
      
      console.log('🏆 DEBUG: Organizing teams by divisions');
      return this.organizeByDivisions(teamRecords);
    } catch (error) {
      console.error('Error calculating standings from game data:', error);
      throw error;
    }
  }

  /**
   * Update recent record for last 10 games tracking
   */
  updateRecentRecord(teamRecord, won) {
    if (teamRecord.recentRecord.games < 10) {
      teamRecord.recentRecord.games++;
      if (won) {
        teamRecord.recentRecord.wins++;
      } else {
        teamRecord.recentRecord.losses++;
      }
    }
  }

  /**
   * Get game data in date range
   */
  async getGameDataInDateRange(startDate, endDate) {
    const allGames = [];
    const currentDate = new Date(startDate);
    let daysChecked = 0;
    let daysWithData = 0;

    console.log(`🏆 DEBUG: Checking game data from ${startDate.toDateString()} to ${endDate.toDateString()}`);

    while (currentDate <= endDate) {
      daysChecked++;
      try {
        // Format date as YYYY-MM-DD for fetchGameData compatibility
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        console.log(`🏆 DEBUG: Trying to fetch data for: ${dateStr}`);
        const gameData = await fetchGameData(dateStr);
        
        console.log(`🏆 DEBUG: Response for ${dateStr}:`, {
          hasGames: !!gameData?.games,
          gamesLength: gameData?.games?.length || 0,
          sampleGame: gameData?.games?.[0],
          dataStructure: gameData
        });
        
        if (gameData?.games && gameData.games.length > 0) {
          // Check for completed games specifically
          const completedGames = gameData.games.filter(game => 
            game.status === 'Final' && 
            game.homeScore !== undefined && 
            game.awayScore !== undefined
          );
          
          console.log(`🏆 DEBUG: Found ${completedGames.length} completed games out of ${gameData.games.length} total games on ${dateStr}`);
          
          if (completedGames.length > 0) {
            allGames.push(...completedGames);
            daysWithData++;
            
            if (daysWithData <= 3) { // Log first few successful days
              console.log(`🏆 DEBUG: Added ${completedGames.length} completed games on ${dateStr}`);
              console.log(`🏆 DEBUG: Sample completed game:`, completedGames[0]);
            }
          }
        } else {
          console.log(`🏆 DEBUG: No games found for ${dateStr}`, gameData);
        }
      } catch (error) {
        if (daysChecked <= 5) { // Log first few errors for debugging
          console.log(`🏆 DEBUG: No data for ${currentDate.toDateString()}: ${error.message}`);
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`🏆 DEBUG: Checked ${daysChecked} days, found data on ${daysWithData} days, total games: ${allGames.length}`);
    return allGames;
  }

  /**
   * Organize standings by divisions
   */
  organizeByDivisions(teamRecords) {
    const divisions = {
      AL: { East: [], Central: [], West: [] },
      NL: { East: [], Central: [], West: [] }
    };

    Object.values(teamRecords).forEach(team => {
      if (divisions[team.league] && divisions[team.league][team.division]) {
        divisions[team.league][team.division].push(team);
      }
    });

    // Sort each division by win percentage
    Object.keys(divisions).forEach(league => {
      Object.keys(divisions[league]).forEach(division => {
        divisions[league][division].sort((a, b) => {
          if (b.winPct !== a.winPct) return b.winPct - a.winPct;
          return b.wins - a.wins; // Tiebreaker by total wins
        });

        // Calculate games back within division
        const leader = divisions[league][division][0];
        if (leader) {
          divisions[league][division].forEach((team, index) => {
            if (index === 0) {
              team.gamesBack = 0;
            } else {
              team.gamesBack = ((leader.wins - team.wins) + (team.losses - leader.losses)) / 2;
            }
          });
        }
      });
    });

    return divisions;
  }

  /**
   * Calculate playoff context for all teams
   */
  calculatePlayoffContext(standings) {
    const playoffTeams = this.determinePlayoffTeams(standings);
    const wildCardRace = this.calculateWildCardRace(standings, playoffTeams);

    const context = {};

    Object.keys(standings).forEach(league => {
      Object.keys(standings[league]).forEach(division => {
        standings[league][division].forEach(team => {
          context[team.team] = this.getTeamPlayoffStatus(team, playoffTeams, wildCardRace);
        });
      });
    });

    return context;
  }

  /**
   * Determine current playoff teams (top 6 per league)
   */
  determinePlayoffTeams(standings) {
    const playoffTeams = { AL: [], NL: [] };

    ['AL', 'NL'].forEach(league => {
      const allTeams = [];
      
      // Add division leaders
      ['East', 'Central', 'West'].forEach(division => {
        if (standings[league][division].length > 0) {
          const leader = standings[league][division][0];
          leader.isDivisionLeader = true;
          allTeams.push(leader);
        }
      });

      // Add all other teams for wild card consideration
      ['East', 'Central', 'West'].forEach(division => {
        standings[league][division].slice(1).forEach(team => {
          team.isDivisionLeader = false;
          allTeams.push(team);
        });
      });

      // Sort all teams by record
      allTeams.sort((a, b) => {
        if (b.winPct !== a.winPct) return b.winPct - a.winPct;
        return b.wins - a.wins;
      });

      // Top 6 make playoffs (3 division winners + 3 wild cards)
      playoffTeams[league] = allTeams.slice(0, 6);
    });

    return playoffTeams;
  }

  /**
   * Calculate wild card race details
   */
  calculateWildCardRace(standings, playoffTeams) {
    const wildCardRace = { AL: [], NL: [] };

    ['AL', 'NL'].forEach(league => {
      const allTeams = [];
      
      // Get all non-division leaders
      ['East', 'Central', 'West'].forEach(division => {
        standings[league][division].slice(1).forEach(team => {
          allTeams.push(team);
        });
      });

      // Sort by record
      allTeams.sort((a, b) => {
        if (b.winPct !== a.winPct) return b.winPct - a.winPct;
        return b.wins - a.wins;
      });

      wildCardRace[league] = allTeams;
    });

    return wildCardRace;
  }

  /**
   * Determine individual team playoff status
   */
  getTeamPlayoffStatus(team, playoffTeams, wildCardRace) {
    const league = team.league;
    const playoffTeamsInLeague = playoffTeams[league] || [];
    const wildCardTeamsInLeague = wildCardRace[league] || [];

    // Check if team is currently in playoffs
    const isInPlayoffs = playoffTeamsInLeague.some(pTeam => pTeam.team === team.team);
    const playoffPosition = playoffTeamsInLeague.findIndex(pTeam => pTeam.team === team.team) + 1;

    // Calculate games back from final playoff spot
    let gamesBackFromPlayoffs = 0;
    if (!isInPlayoffs && playoffTeamsInLeague.length >= 6) {
      const finalPlayoffTeam = playoffTeamsInLeague[5]; // 6th playoff spot
      gamesBackFromPlayoffs = ((finalPlayoffTeam.wins - team.wins) + (team.losses - finalPlayoffTeam.losses)) / 2;
    }

    // Determine status
    let status = 'IN_HUNT';
    let description = 'In Wild Card Hunt';

    if (team.isDivisionLeader) {
      if (team.gamesBack === 0) {
        status = 'DIVISION_LEADER';
        description = 'Division Leader';
      }
    } else if (isInPlayoffs) {
      if (playoffPosition <= 3) {
        status = 'WILD_CARD_POSITION';
        description = `Wild Card #${playoffPosition - 3} Position`;
      } else {
        status = 'IN_PLAYOFFS';
        description = 'In Playoff Position';
      }
    } else if (gamesBackFromPlayoffs <= 5) {
      status = 'IN_HUNT';
      description = 'In Wild Card Hunt';
    } else if (gamesBackFromPlayoffs <= 10) {
      status = 'LONGSHOT';
      description = 'Longshot Hopes';
    } else {
      status = 'FADING';
      description = 'Playoff Hopes Fading';
    }

    // Add recent performance context
    const recentForm = this.getRecentFormDescription(team.recentRecord);

    return {
      status,
      description,
      isInPlayoffs,
      playoffPosition: isInPlayoffs ? playoffPosition : null,
      gamesBackFromPlayoffs: Math.max(0, gamesBackFromPlayoffs),
      recentForm,
      wins: team.wins,
      losses: team.losses,
      winPct: team.winPct,
      gamesBack: team.gamesBack
    };
  }

  /**
   * Get recent form description
   */
  getRecentFormDescription(recentRecord) {
    if (recentRecord.games < 5) return 'Limited Recent Games';
    
    const winRate = recentRecord.wins / recentRecord.games;
    
    if (winRate >= 0.7) return 'Hot';
    if (winRate >= 0.6) return 'Good Form';
    if (winRate >= 0.4) return 'Average';
    if (winRate >= 0.3) return 'Struggling';
    return 'Poor Form';
  }

  /**
   * Get motivational factors for a matchup
   */
  getMatchupMotivationalFactors(homeTeam, awayTeam, playoffContext) {
    const factors = [];
    
    const homeContext = playoffContext[homeTeam];
    const awayContext = playoffContext[awayTeam];

    if (!homeContext || !awayContext) return factors;

    // Division rival matchup
    if (this.areInSameDivision(homeTeam, awayTeam)) {
      factors.push({
        type: 'DIVISION_RIVAL',
        description: 'Division Rival Matchup',
        intensity: 'high'
      });
    }

    // Playoff implications
    if (homeContext.isInPlayoffs && awayContext.isInPlayoffs) {
      factors.push({
        type: 'PLAYOFF_BATTLE',
        description: 'Playoff Teams Battle',
        intensity: 'high'
      });
    } else if (homeContext.isInPlayoffs || awayContext.isInPlayoffs) {
      factors.push({
        type: 'PLAYOFF_IMPLICATIONS',
        description: 'Playoff Implications',
        intensity: 'medium'
      });
    }

    // Wild card race
    if (homeContext.status === 'IN_HUNT' && awayContext.status === 'IN_HUNT') {
      factors.push({
        type: 'WILD_CARD_RACE',
        description: 'Wild Card Race Impact',
        intensity: 'medium'
      });
    }

    // Recent form impact
    if (homeContext.recentForm === 'Hot' || awayContext.recentForm === 'Hot') {
      factors.push({
        type: 'HOT_TEAM',
        description: 'Team on Hot Streak',
        intensity: 'low'
      });
    }

    return factors;
  }

  /**
   * Check if teams are in same division
   */
  areInSameDivision(team1, team2) {
    try {
      const teams = MLB_TEAMS;
      
      return teams[team1]?.league === teams[team2]?.league &&
             teams[team1]?.division === teams[team2]?.division;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get default standings if scraped data loading fails
   */
  getDefaultStandings() {
    console.warn('🏆 Using default empty standings data');
    return {
      standings: { AL: { East: [], Central: [], West: [] }, NL: { East: [], Central: [], West: [] } },
      playoffContext: {},
      lastUpdated: new Date().toISOString(),
      source: 'default_fallback'
    };
  }

  /**
   * Get team playoff context for display
   */
  async getTeamPlayoffContext(teamAbbr) {
    try {
      console.log(`🏆 DEBUG: Getting playoff context for team: ${teamAbbr}`);
      const standingsData = await this.getTeamStandings();
      
      if (!standingsData) {
        console.error('🏆 DEBUG: No standings data returned');
        return null;
      }
      
      if (!standingsData.playoffContext) {
        console.error('🏆 DEBUG: No playoff context in standings data');
        return null;
      }
      
      const context = standingsData.playoffContext[teamAbbr];
      if (context) {
        console.log(`🏆 DEBUG: Found context for ${teamAbbr}:`, context);
      } else {
        console.warn(`🏆 DEBUG: No context found for team ${teamAbbr}. Available teams:`, Object.keys(standingsData.playoffContext));
      }
      
      return context || null;
    } catch (error) {
      console.error(`🏆 ERROR: Getting playoff context for ${teamAbbr}:`, error);
      return null;
    }
  }

  /**
   * Get matchup context including motivational factors
   */
  async getMatchupContext(homeTeam, awayTeam) {
    try {
      const standingsData = await this.getTeamStandings();
      
      return {
        homeTeamContext: standingsData.playoffContext[homeTeam],
        awayTeamContext: standingsData.playoffContext[awayTeam],
        motivationalFactors: this.getMatchupMotivationalFactors(homeTeam, awayTeam, standingsData.playoffContext)
      };
    } catch (error) {
      console.error('Error getting matchup context:', error);
      return {
        homeTeamContext: null,
        awayTeamContext: null,
        motivationalFactors: []
      };
    }
  }
}

export default new TeamStandingsService();