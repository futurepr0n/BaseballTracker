import React, { useState, useEffect } from 'react';
import './Dashboard.css';

// Import reusable tooltip utilities
import { createSafeId } from './utils/tooltipUtils';

// Import individual card components
import StatsSummaryCard from './cards/StatsSummaryCard/StatsSummaryCard';
import HRPredictionCard from './cards/HRPredictionCard/HRPredictionCard';
import HRRateCard from './cards/HRRateCard/HRRateCard';
import DayOfWeekHitsCard from './cards/DayOfWeekHitsCard/DayOfWeekHitsCard';
import HitStreakCard from './cards/HitStreakCard/HitStreakCard';
import LikelyToHitCard from './cards/LikelyToHitCard/LikelyToHitCard';
import ContinueStreakCard from './cards/ContinueStreakCard/ContinueStreakCard';
import PitcherMatchupCard from './cards/PitcherMatchupCard/PitcherMatchupCard';
import RecentUpdatesCard from './cards/RecentUpdatesCard/RecentUpdatesCard';
import TopHittersCard from './cards/TopHittersCard/TopHittersCard';
import HomeRunLeadersCard from './cards/HomeRunLeadersCard/HomeRunLeadersCard';
import ImprovedRateCard from './cards/ImprovedRateCard/ImprovedRateCard';
import RecentHomersCard from './cards/RecentHomersCard/RecentHomersCard';
import PerformanceCard from './cards/PerformanceCard/PerformanceCard';

/**
 * Dashboard component - Home page displaying summary of MLB data
 * Refactored to use modular card components with fixed tooltips
 */
function Dashboard({ playerData, teamData, gameData, currentDate }) {
  // State for core data
  const [playersWithHomeRunPrediction, setPlayersWithHomeRunPrediction] = useState([]);
  const [predictionLoading, setPredictionLoading] = useState(true);
  const [rollingStats, setRollingStats] = useState({
    hitters: [],
    homers: [],
    strikeouts: []
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [playerPerformance, setPlayerPerformance] = useState(null);
  const [topPerformers, setTopPerformers] = useState({
    hrRate: [],
    improved: [],
    recent: [],
    overPerforming: [],
    underPerforming: []
  });
  
  // State for streak and day-of-week data
  const [dayOfWeekHits, setDayOfWeekHits] = useState({
    dayOfWeek: '',
    topHitsByTotal: [],
    topHitsByRate: []
  });
  const [hitStreakData, setHitStreakData] = useState({
    hitStreaks: [],
    noHitStreaks: [],
    likelyToGetHit: [],
    likelyToContinueStreak: []
  });
  const [additionalStatsLoading, setAdditionalStatsLoading] = useState(true);
  
  // State for pitcher matchups
  const [pitcherMatchups, setPitcherMatchups] = useState({
    toughPitcherMatchups: [],
    favorablePitcherMatchups: [],
    teamHandednessAdvantages: [],
    allPitchersByTeam: {}
  });
  const [matchupsLoading, setMatchupsLoading] = useState(true);
  
  // Track which date's data we're showing
  const [dataDate, setDataDate] = useState(currentDate);
  const [dateStatus, setDateStatus] = useState('current'); // 'current', 'previous', or 'historical'
  
  // Format date for display
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Format dataDate for display when showing previous day's data
  const formattedDataDate = dataDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Close any open tooltips when clicking outside
  useEffect(() => {
    const handleDocumentClick = (e) => {
      // Only close tooltips if clicking outside tooltip-related elements
      if (!e.target.closest('.tooltip-container') && 
          !e.target.closest('.batter-tooltip') && 
          !e.target.closest('.streak-tooltip') &&
          !e.target.closest('.day-hit-tooltip')) {
        // Dispatch a custom event that card components can listen for
        document.dispatchEvent(new CustomEvent('dashboard-click-outside'));
      }
    };
    
    document.addEventListener('click', handleDocumentClick);
    
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);
  
  // Load HR predictions
  useEffect(() => {
    const loadHRPredictions = async () => {
      try {
        setPredictionLoading(true);
        
        // Format date for file name
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Try to load the specific date file first
        let response = await fetch(`/data/predictions/hr_predictions_${dateStr}.json`);
        
        // If not found, try to load the latest predictions
        if (!response.ok) {
          response = await fetch('/data/predictions/hr_predictions_latest.json');
        }
        
        if (!response.ok) {
          console.warn('No HR predictions found, will show default data');
          setPlayersWithHomeRunPrediction([]);
        } else {
          const data = await response.json();
          setPlayersWithHomeRunPrediction(data.predictions || []);
        }
      } catch (error) {
        console.error('Error loading HR predictions:', error);
        setPlayersWithHomeRunPrediction([]);
      } finally {
        setPredictionLoading(false);
      }
    };
    
    loadHRPredictions();
  }, [currentDate]);
  
  // Load additional stats (day of week hits and hit streak data)
  useEffect(() => {
    const loadAdditionalStats = async () => {
      try {
        setAdditionalStatsLoading(true);
        
        // Format date for file name
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Try to load the specific date file first for day of week hits
        let response = await fetch(`/data/predictions/day_of_week_hits_${dateStr}.json`);
        
        // If not found, try to load the latest file
        if (!response.ok) {
          response = await fetch('/data/predictions/day_of_week_hits_latest.json');
        }
        
        if (!response.ok) {
          console.warn('No day of week hit data found');
          setDayOfWeekHits({
            dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
            topHitsByTotal: [],
            topHitsByRate: []
          });
        } else {
          const data = await response.json();
          setDayOfWeekHits(data);
        }
        
        // Load hit streak data
        response = await fetch(`/data/predictions/hit_streak_analysis_${dateStr}.json`);
        
        // If not found, try to load the latest file
        if (!response.ok) {
          response = await fetch('/data/predictions/hit_streak_analysis_latest.json');
        }
        
        if (!response.ok) {
          console.warn('No hit streak analysis data found');
          setHitStreakData({
            hitStreaks: [],
            noHitStreaks: [],
            likelyToGetHit: [],
            likelyToContinueStreak: []
          });
        } else {
          const data = await response.json();
          setHitStreakData(data);
        }
      } catch (error) {
        console.error('Error loading additional stats:', error);
      } finally {
        setAdditionalStatsLoading(false);
      }
    };
    
    loadAdditionalStats();
  }, [currentDate]);

  // Load pitcher matchup data
  useEffect(() => {
    const loadPitcherMatchups = async () => {
      try {
        setMatchupsLoading(true);
        
        // Format date for file name
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Try to load the specific date file first
        let response = await fetch(`/data/predictions/pitcher_matchups_${dateStr}.json`);
        
        // If not found, try to load the latest file
        if (!response.ok) {
          response = await fetch('/data/predictions/pitcher_matchups_latest.json');
        }
        
        if (!response.ok) {
          console.warn('No pitcher matchup data found');
          setPitcherMatchups({
            toughPitcherMatchups: [],
            favorablePitcherMatchups: [],
            teamHandednessAdvantages: [],
            allPitchersByTeam: {}
          });
        } else {
          const data = await response.json();
          setPitcherMatchups(data);
        }
      } catch (error) {
        console.error('Error loading pitcher matchup data:', error);
        setPitcherMatchups({
          toughPitcherMatchups: [],
          favorablePitcherMatchups: [],
          teamHandednessAdvantages: [],
          allPitchersByTeam: {}
        });
      } finally {
        setMatchupsLoading(false);
      }
    };
    
    loadPitcherMatchups();
  }, [currentDate]);
  
  // Load player performance data and calculate top performers
  // Load player performance data and calculate top performers
useEffect(() => {
  const loadPlayerPerformance = async () => {
    try {
      console.log("Loading performance data for date:", currentDate.toISOString());
      
      // Force cache bypass with a random query parameter
      const timestamp = new Date().getTime() + Math.random();
      const response = await fetch(`/data/predictions/player_performance_latest.json?nocache=${timestamp}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Debug the raw data
        console.log("Raw data lastHRDates:", 
          data.recentHRs?.slice(0, 5).map(p => ({ 
            name: p.name, 
            date: p.lastHRDate 
          }))
        );
        
        setPlayerPerformance(data);
        
        // Process top performers if we have player data
        if (data && data.players && data.players.length > 0) {
          // Create a new array (don't modify the original) to ensure React detects the change
          const recent = [...data.recentHRs || data.players
            .filter(player => player.lastHRDate)
            .sort((a, b) => {
              // First sort by date (newest first)
              const dateA = new Date(a.lastHRDate);
              const dateB = new Date(b.lastHRDate);
              if (dateB - dateA !== 0) return dateB - dateA;
              
              // If same date, sort by total home runs
              return b.homeRunsThisSeason - a.homeRunsThisSeason;
            })];
          
          // Debug the processed data
          console.log("Processed recent HRs:", 
            recent.slice(0, 5).map(p => ({ 
              name: p.name, 
              date: p.lastHRDate 
            }))
          );
          
          // Rest of your code for other categories
          const hrRate = [...data.players]
            .filter(player => player.gamesPlayed > 0 && player.homeRunsThisSeason > 0)
            .sort((a, b) => (b.homeRunsThisSeason / b.gamesPlayed) - (a.homeRunsThisSeason / a.gamesPlayed))
            .slice(0, 25);
          
          const improved = [...data.players]
            .filter(player => player.actualHRRate > player.historicalHRRate)
            .sort((a, b) => (b.actualHRRate - b.historicalHRRate) - (a.actualHRRate - a.historicalHRRate))
            .slice(0, 25);
          
          const overPerforming = [...data.players]
            .filter(player => player.status === "over-performing")
            .sort((a, b) => b.performanceIndicator - a.performanceIndicator)
            .slice(0, 25);
          
          const underPerforming = [...data.players]
            .filter(player => player.status === "under-performing")
            .sort((a, b) => a.performanceIndicator - b.performanceIndicator)
            .slice(0, 25);
          
          // Set state with completely new object to force re-render
          setTopPerformers({
            hrRate,
            improved,
            recent,
            overPerforming,
            underPerforming
          });
        }
      } else {
        console.warn('No player performance data found');
        setPlayerPerformance(null);
      }
    } catch (error) {
      console.error('Error loading player performance data:', error);
      setPlayerPerformance(null);
    }
  };
  
  loadPlayerPerformance();
}, [currentDate]);
  
  // Load rolling stats (with priority: today > yesterday > 7-day rolling > season)
  useEffect(() => {
    const loadRollingStats = async () => {
      try {
        setStatsLoading(true);
        
        // Check if there's data for today
        const hasDataForToday = playerData && playerData.length > 0;
        
        if (hasDataForToday) {
          // Use the current day's data
          processCurrentData();
          setDataDate(currentDate);
          setDateStatus('current');
        } else {
          // Try to load previous day's data specifically
          const yesterday = new Date(currentDate);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayYear = yesterday.getFullYear();
          const yesterdayMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
          const yesterdayDay = String(yesterday.getDate()).padStart(2, '0');
          const yesterdayDateStr = `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`;
          
          try {
            const response = await fetch(`/data/${yesterdayYear}/${yesterdayMonth}/${yesterdayDay}/daily_stats.json`);
            
            if (response.ok) {
              const data = await response.json();
              if (data.players && data.players.length > 0) {
                // Process previous day data
                const batters = data.players.filter(player => 
                  player.playerType === 'hitter' || !player.playerType);
                
                const pitchers = data.players.filter(player => 
                  player.playerType === 'pitcher');
                
                // Find top performers in previous day data
                const topHitters = [...batters]
                  .filter(player => player.H !== 'DNP' && player.H !== null)
                  .sort((a, b) => (Number(b.H) || 0) - (Number(a.H) || 0))
                  .slice(0, 25);
                
                const topHomers = [...batters]
                  .filter(player => player.HR !== 'DNP' && player.HR !== null && Number(player.HR) > 0)
                  .sort((a, b) => (Number(b.HR) || 0) - (Number(a.HR) || 0))
                  .slice(0, 25);
                
                const topStrikeoutPitchers = [...pitchers]
                  .filter(player => player.K !== 'DNP' && player.K !== null)
                  .sort((a, b) => (Number(b.K) || 0) - (Number(a.K) || 0))
                  .slice(0, 25);
                
                setRollingStats({
                  hitters: topHitters.map(player => ({...player, games: 1})),
                  homers: topHomers.map(player => ({...player, games: 1})),
                  strikeouts: topStrikeoutPitchers.map(player => ({...player, games: 1}))
                });
                
                // Set data date and status
                setDataDate(yesterday);
                setDateStatus('previous');
                
                // Exit early since we found yesterday's data
                setStatsLoading(false);
                return;
              }
            }
          } catch (e) {
            console.warn(`Could not load previous day data: ${e.message}`);
          }
          
          // If we get here, we couldn't load yesterday's data, so fall back to more historical data
          loadHistoricalStats();
        }
      } catch (error) {
        console.error('Error loading rolling stats:', error);
        processCurrentData(); // Fallback to current data
        setDateStatus('current');
      } finally {
        setStatsLoading(false);
      }
    };
    
    // Helper function to load 7-day rolling data or season data
    const loadHistoricalStats = async () => {
      console.log('No previous day data found, falling back to 7-day rolling data');
      
      // Calculate dates for the last 7 days
      const dates = [];
      for (let i = 1; i <= 7; i++) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
      }
      
      // Try to load data for each date
      let combinedData = [];
      for (const dateStr of dates) {
        try {
          const response = await fetch(`/data/${dateStr.substring(0, 4)}/${dateStr.substring(5, 7)}/${dateStr.substring(8, 10)}/daily_stats.json`);
          if (response.ok) {
            const data = await response.json();
            if (data.players && data.players.length > 0) {
              combinedData = combinedData.concat(data.players.map(player => ({
                ...player,
                dateStr
              })));
            }
          }
        } catch (e) {
          // Silently fail for individual dates
          console.warn(`Could not load data for ${dateStr}`);
        }
      }
      
      // Process the combined data
      if (combinedData.length > 0) {
        // Group by player and combine stats
        const playerMap = new Map();
        
        combinedData.forEach(player => {
          const key = `${player.name}_${player.team}`;
          if (!playerMap.has(key)) {
            playerMap.set(key, {
              ...player,
              games: 1,
              dates: [player.dateStr]
            });
          } else {
            const existing = playerMap.get(key);
            existing.games += 1;
            existing.dates.push(player.dateStr);
            
            // Combine stats (summing numeric values)
            ['H', 'R', 'HR', 'RBI', 'K'].forEach(stat => {
              if (player[stat] !== 'DNP' && player[stat] !== null) {
                existing[stat] = (existing[stat] === 'DNP' || existing[stat] === null) 
                  ? Number(player[stat]) 
                  : Number(existing[stat]) + Number(player[stat]);
              }
            });
          }
        });
        
        // Convert back to array
        const processedPlayers = Array.from(playerMap.values());
        
        // Create separate lists for batters and pitchers
        const batters = processedPlayers.filter(player => 
          player.playerType === 'hitter' || !player.playerType);
        
        const pitchers = processedPlayers.filter(player => 
          player.playerType === 'pitcher');
        
        // Find top performers
        const topHitters = [...batters]
          .filter(player => player.H !== 'DNP' && player.H !== null)
          .sort((a, b) => Number(b.H) - Number(a.H))
          .slice(0, 25);
        
        const topHomers = [...batters]
          .filter(player => player.HR !== 'DNP' && player.HR !== null && Number(player.HR) > 0)
          .sort((a, b) => Number(b.HR) - Number(a.HR))
          .slice(0, 25);
        
        const topStrikeoutPitchers = [...pitchers]
          .filter(player => player.K !== 'DNP' && player.K !== null)
          .sort((a, b) => Number(b.K) - Number(a.K))
          .slice(0, 25);
        
        setRollingStats({
          hitters: topHitters,
          homers: topHomers,
          strikeouts: topStrikeoutPitchers
        });
        
        // Set data date and status
        setDateStatus('historical');
      } else {
        // No historical data available, check if we have player performance data
        if (playerPerformance && playerPerformance.players) {
          // Transform player performance data for use in dashboard
          const players = playerPerformance.players;
          
          // Create homers list based on homeRunsThisSeason
          const homers = [...players]
            .filter(player => player.homeRunsThisSeason)
            .sort((a, b) => b.homeRunsThisSeason - a.homeRunsThisSeason)
            .slice(0, 25)
            .map(player => ({
              name: player.fullName || player.name,
              team: player.team,
              HR: player.homeRunsThisSeason,
              games: player.gamesPlayed || 1
            }));
          
          // Create hitters list based on performance indicators
          const hitters = [...players]
            .filter(player => player.performanceIndicator)
            .map(player => ({
              name: player.fullName || player.name,
              team: player.team,
              H: Math.round(player.expectedHRs * 2), // Estimated hits based on HR rate
              games: player.gamesPlayed || 1
            }))
            .sort((a, b) => b.H - a.H)
            .slice(0, 25);
          
          // We don't have pitcher data, so leave strikeouts empty
          const strikeouts = [];
          
          setRollingStats({
            hitters,
            homers,
            strikeouts
          });
          
          // Set data date and status
          setDateStatus('season');
        } else {
          // Fallback to the current playerData
          processCurrentData();
          setDateStatus('current');
        }
      }
    };
    
    // Helper function to process current data
    const processCurrentData = () => {
      const batters = playerData.filter(player => 
        player.playerType === 'hitter' || !player.playerType);
      
      const pitchers = playerData.filter(player => 
        player.playerType === 'pitcher');
      
      // Find top performers in current data
      const topHitters = [...batters]
        .filter(player => player.H !== 'DNP' && player.H !== null)
        .sort((a, b) => (Number(b.H) || 0) - (Number(a.H) || 0))
        .slice(0, 25);
      
      const topHomers = [...batters]
        .filter(player => player.HR !== 'DNP' && player.HR !== null && Number(player.HR) > 0)
        .sort((a, b) => (Number(b.HR) || 0) - (Number(a.HR) || 0))
        .slice(0, 25);
      
      const topStrikeoutPitchers = [...pitchers]
        .filter(player => player.K !== 'DNP' && player.K !== null)
        .sort((a, b) => (Number(b.K) || 0) - (Number(a.K) || 0))
        .slice(0, 25);
      
      setRollingStats({
        hitters: topHitters,
        homers: topHomers,
        strikeouts: topStrikeoutPitchers
      });
    };
    
    loadRollingStats();
  }, [playerData, currentDate, playerPerformance]);
  
  // Separate batting and pitching stats from current data
  const batterData = playerData.filter(player => 
    player.playerType === 'hitter' || !player.playerType);
  
  const pitcherData = playerData.filter(player => 
    player.playerType === 'pitcher');
  
  // Helper function to display the time period
  const getTimePeriodText = () => {
    switch(dateStatus) {
      case 'current':
        return "Today";
      case 'previous':
        return dataDate.toLocaleDateString('en-US', { weekday: 'long' });
      case 'historical':
        return "Last 7 Days";
      case 'season':
        return "Season Performance";
      default:
        return "Today";
    }
  };
  
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2>MLB Statistics Dashboard</h2>
        <p className="date">
          {formattedDate}
          {dateStatus === 'previous' && (
            <span className="date-note">
              (Showing data from {formattedDataDate})
            </span>
          )}
          {dateStatus === 'historical' && (
            <span className="date-note">
              (Showing 7-day rolling data)
            </span>
          )}
        </p>
      </header>
      
      <div className="dashboard-grid">
        {/* Statistics Summary Card */}
        <StatsSummaryCard 
          batterData={batterData}
          pitcherData={pitcherData}
        />
        
        {/* HR Prediction Card */}
        <HRPredictionCard 
          playersWithHomeRunPrediction={playersWithHomeRunPrediction}
          isLoading={predictionLoading}
          teams={teamData} 
        />
        
        {/* Top Hitters Card */}
        <TopHittersCard 
          hitters={rollingStats.hitters}
          isLoading={statsLoading}
          timePeriodText={getTimePeriodText()}
          teams={teamData} 
        />
        
        {/* Home Run Leaders Card */}
        <HomeRunLeadersCard 
          homers={rollingStats.homers}
          isLoading={statsLoading}
          timePeriodText={getTimePeriodText()}
          teams={teamData} 
        />
        
        {/* HR Rate Card */}
        <HRRateCard 
          topHRRatePlayers={topPerformers.hrRate}
          isLoading={!playerPerformance}
          teams={teamData} 
        />
        
        {/* Improved Rate Card */}
        <ImprovedRateCard 
          improvedPlayers={topPerformers.improved}
          isLoading={!playerPerformance}
          teams={teamData} 
        />
        
        {/* Recent Homers Card */}
        <RecentHomersCard 
          recentHRPlayers={topPerformers.recent}
          isLoading={!playerPerformance}
          teams={teamData} 
        />
        
        {/* Over-Performing Players Card */}
        <PerformanceCard 
          performingPlayers={topPerformers.overPerforming}
          isLoading={!playerPerformance}
          type="over"
          teams={teamData} 
        />
        
        {/* Under-Performing Players Card */}
        <PerformanceCard 
          performingPlayers={topPerformers.underPerforming}
          isLoading={!playerPerformance}
          type="under"
          teams={teamData} 
        />
        
        {/* Pitcher Matchup Analysis Card */}
        <PitcherMatchupCard 
          pitcherMatchups={pitcherMatchups}
          isLoading={matchupsLoading}
          currentDate={currentDate}
        />
        
        {/* Hit Streak Card */}
        <HitStreakCard 
          hitStreakData={hitStreakData}
          isLoading={additionalStatsLoading}
          currentDate={currentDate}
          teams={teamData} 
        />

        {/* Continue Streak Card */}
        <ContinueStreakCard
          hitStreakData={hitStreakData}
          isLoading={additionalStatsLoading}
          currentDate={currentDate}
          teams={teamData} 
        />
        
        {/* Likely to Hit Card */}
        <LikelyToHitCard 
          hitStreakData={hitStreakData}
          isLoading={additionalStatsLoading}
          currentDate={currentDate}
          teams={teamData} 
        />
        
        {/* Day of Week Hits Card */}
        <DayOfWeekHitsCard 
          dayOfWeekHits={dayOfWeekHits}
          isLoading={additionalStatsLoading}
          currentDate={currentDate}
          teams={teamData} 
        />
        
        {/* Recent Updates Card */}
        <RecentUpdatesCard 
          currentDate={currentDate}
          dataDate={dataDate}
          dateStatus={dateStatus}
          topPerformers={topPerformers}
          rollingStats={rollingStats}
        />
      </div>
    </div>
  );
}

export default Dashboard;