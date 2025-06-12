import React, { useState, useEffect, useMemo } from 'react';
import './Dashboard.css';

// Import TeamFilter components
import TeamFilter from './TeamFilter';
import FilterIndicator from './FilterIndicator';
import { useTeamFilter } from './TeamFilterContext';

// Import reusable tooltip utilities
import { createSafeId } from './utils/tooltipUtils';

import PoorPerformanceCard from './cards/PoorPerformanceCard/PoorPerformanceCard';


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
import PitcherHRsAllowedCard from './cards/PitcherHRsAllowedCard/PitcherHRsAllowedCard';
import PitcherHitsAllowedCard from './cards/PitcherHitsAllowedCard/PitcherHitsAllowedCard';
import SlotMachineCard from './cards/SlotMachineCard/SlotMachineCard';

import LiveScoresCard from './cards/LiveScoresCard/LiveScoresCard';
import MLBWeatherCard from './cards/MLBWeatherCard/MLBWeatherCard';

import MultiHitDashboardCard from './cards/MultiHitDashboardCard/MultiHitDashboardCard';

import { TeamComingOffWinCard, TeamComingOffLossCard } from './cards/TeamLastResultCards/TeamLastResultCards';

import { CurrentSeriesHitsCard, CurrentSeriesHRCard } from './cards/CurrentSeriesCards/CurrentSeriesCards';
import { TimeSlotHitsCard, TimeSlotHRCard } from './cards/TimeSlotHitsCard/TimeSlotHitsCard';

import MostHomeRunsAtHomeCard from './cards/MostHomeRunsAtHomeCard/MostHomeRunsAtHomeCard';
import { 
  OpponentMatchupHitsCard,
  OpponentMatchupHRCard
} from './cards/OpponentMatchupHitsCard/OpponentMatchupHitsCard';

import HitDroughtBounceBackCard from './cards/HitDroughtBounceBackCard/HitDroughtBounceBackCard';

/**
 * Dashboard component - Home page displaying summary of MLB data
 * Enhanced with team filtering capability and visit tracking
 */
function Dashboard({ playerData, teamData, gameData, currentDate }) {
  // Get team filter context
  const { 
    selectedTeam, 
    setSelectedTeam, 
    includeMatchup, 
    toggleMatchup, 
    matchupTeam, 
    resetFilters,
    shouldIncludePlayer,
    shouldIncludeGame,
    isFiltering,
    getTeamName
  } = useTeamFilter();
  
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
  
  // Visit tracking state
  const [visitCount, setVisitCount] = useState(0);
  const [visitLoading, setVisitLoading] = useState(true);

  const [stadiumData, setStadiumData] = useState(null);
  const [stadiumLoading, setStadiumLoading] = useState(true);

  const [rollingStatsType, setRollingStatsType] = useState('season'); // 'season', 'last_30', 'last_7', 'current'

  // Simplified slot machine data - no complex loading required
  const [slotMachineCardData, setSlotMachineCardData] = useState({
    currentSeriesHits: [],
    currentSeriesHRs: [],
    timeSlotHits: [],
    opponentHits: [],
    opponentHRs: [],
    fridayHitLeaders: []
  });

  const [poorPerformancePredictions, setPoorPerformancePredictions] = useState([]);
  const [poorPerformanceLoading, setPoorPerformanceLoading] = useState(true);

  // Simple effect to populate slot machine data from existing sources
  useEffect(() => {
    const populateSlotMachineData = () => {
      // Use existing data sources where possible
      setSlotMachineCardData({
        currentSeriesHits: [], // Can be populated later with more complex logic
        currentSeriesHRs: [],
        timeSlotHits: dayOfWeekHits.topHitsByTotal || [], // Use day of week data as proxy
        opponentHits: [],
        opponentHRs: [],
        fridayHitLeaders: dayOfWeekHits?.dayOfWeek === 'Friday' ? (dayOfWeekHits.topHitsByTotal || []) : []
      });
    };

    // Only populate if we have the required data
    if (dayOfWeekHits) {
      populateSlotMachineData();
    }
  }, [dayOfWeekHits]);

  // Helper function to generate comprehensive team-specific stats
  useEffect(() => {
    const loadStadiumData = async () => {
      try {
        setStadiumLoading(true);
        
        console.log('Loading stadium HR analysis data...');
        
        // Load the stadium analysis file
        const response = await fetch('/data/stadium/stadium_hr_analysis.json');
        
        if (!response.ok) {
          console.warn('No stadium HR analysis data found');
          setStadiumData(null);
        } else {
          const data = await response.json();
          console.log('Stadium data loaded:', data);
          setStadiumData(data);
        }
      } catch (error) {
        console.error('Error loading stadium data:', error);
        setStadiumData(null);
      } finally {
        setStadiumLoading(false);
      }
    };
    
    loadStadiumData();
  }, [currentDate]);
  

  useEffect(() => {
  const loadPoorPerformancePredictions = async () => {
    try {
      setPoorPerformanceLoading(true);
      
      // Format date for file name (matching your HR prediction pattern)
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Try to load the specific date file first
      let response = await fetch(`/data/predictions/poor_performance_predictions_${dateStr}.json`);
      
      // If not found, try to load the latest predictions
      if (!response.ok) {
        response = await fetch('/data/predictions/poor_performance_predictions_latest.json');
      }
      
      if (!response.ok) {
        console.warn('No poor performance predictions found');
        setPoorPerformancePredictions([]);
      } else {
        const data = await response.json();
        let predictions = data.predictions || [];
        
        // Apply team filtering if needed (matching your HR prediction logic)
        if (isFiltering) {
          predictions = predictions.filter(player => 
            shouldIncludePlayer(player.team)
          );
        }
        
        setPoorPerformancePredictions(predictions);
        console.log(`Loaded ${predictions.length} poor performance predictions`);
      }
    } catch (error) {
      console.error('Error loading poor performance predictions:', error);
      setPoorPerformancePredictions([]);
    } finally {
      setPoorPerformanceLoading(false);
    }
  };
  
  loadPoorPerformancePredictions();
}, [currentDate, isFiltering, shouldIncludePlayer]); // Same dependencies as your HR predictions


  // Filter player data based on team selection
  const filteredPlayerData = useMemo(() => {
    if (!isFiltering) return playerData;
    
    return playerData.filter(player => 
      shouldIncludePlayer(player.team)
    );
  }, [playerData, isFiltering, shouldIncludePlayer]);
  
  // Split filtered data into batters and pitchers
  const filteredBatterData = useMemo(() => {
    return filteredPlayerData.filter(player => 
      player.playerType === 'hitter' || !player.playerType
    );
  }, [filteredPlayerData]);
  
  const filteredPitcherData = useMemo(() => {
    return filteredPlayerData.filter(player => 
      player.playerType === 'pitcher'
    );
  }, [filteredPlayerData]);
  
  // Filter game data based on team selection
  const filteredGameData = useMemo(() => {
    if (!isFiltering) return gameData;
    
    return gameData.filter(game => 
      shouldIncludeGame(game)
    );
  }, [gameData, isFiltering, shouldIncludeGame]);

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
  
  // Track visit on component mount
  useEffect(() => {
    const trackVisit = async () => {
      console.log('🔄 Starting visit tracking...');
      try {
        setVisitLoading(true);
        
        console.log('📤 Making POST request to https://visits.capping.pro/visits');
        // Record visit
        const response = await fetch('https://visits.capping.pro/visits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('📥 Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📊 Response data:', data);
          if (data.success) {
            console.log('🔄 Setting visitCount to', data.totalPageLoads);
            setVisitCount(data.totalPageLoads);
            console.log(`📈 Page load tracked! Total loads: ${data.totalPageLoads}`);
          } else {
            console.warn('❌ API response success was false:', data);
          }
        } else {
          console.warn('❌ Page load tracking server not responding, status:', response.status);
          // Get current count even if increment failed
          console.log('🔄 Trying to get current count...');
          try {
            const getResponse = await fetch('https://visits.capping.pro/visits');
            console.log('📥 GET Response status:', getResponse.status);
            if (getResponse.ok) {
              const getData = await getResponse.json();
              console.log('📊 Current count data:', getData);
              if (getData.success) {
                console.log('🔄 Setting visitCount from GET request:', getData.totalPageLoads);
                setVisitCount(getData.totalPageLoads);
              }
            }
          } catch (getError) {
            console.error('❌ Failed to get current count:', getError);
          }
        }
      } catch (error) {
        console.error('❌ Page load tracking error:', error);
        console.error('Error details - message:', error.message);
        
        // If POST fails, try to at least get the current count
        console.log('🔄 POST failed, attempting to get current count...');
        try {
          const getResponse = await fetch('https://visits.capping.pro/visits');
          if (getResponse.ok) {
            const getData = await getResponse.json();
            console.log('📊 Fallback count data:', getData);
            if (getData.success) {
              setVisitCount(getData.totalPageLoads);
              console.log(`📊 Retrieved current count: ${getData.totalPageLoads}`);
            }
          }
        } catch (fallbackError) {
          console.error('❌ Fallback GET also failed:', fallbackError);
        }
      } finally {
        console.log('🔚 Setting visitLoading to false');
        setVisitLoading(false);
        console.log('✅ Visit tracking completed');
      }
    };
    
    console.log('⏰ Setting up visit tracking timer...');
    // Track page load after a small delay to ensure page is fully loaded
    const timer = setTimeout(() => {
      console.log('⏰ Timer fired, executing trackVisit...');
      trackVisit();
    }, 1000);
    
    return () => {
      console.log('🧹 Cleaning up visit tracking timer');
      clearTimeout(timer);
    };
  }, []); // Only run once on mount
  
  // Load HR predictions with team filtering
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
          let predictions = data.predictions || [];
          
          // Apply team filtering if needed
          if (isFiltering) {
            predictions = predictions.filter(player => 
              shouldIncludePlayer(player.team)
            );
          }
          
          setPlayersWithHomeRunPrediction(predictions);
        }
      } catch (error) {
        console.error('Error loading HR predictions:', error);
        setPlayersWithHomeRunPrediction([]);
      } finally {
        setPredictionLoading(false);
      }
    };
    
    loadHRPredictions();
  }, [currentDate, isFiltering, shouldIncludePlayer]);
  
  // Load additional stats (day of week hits and hit streak data) with filtering
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
          
          // Apply team filtering if needed
          if (isFiltering) {
            const filteredData = {
              ...data,
              topHitsByTotal: data.topHitsByTotal.filter(player => 
                shouldIncludePlayer(player.team)
              ),
              topHitsByRate: data.topHitsByRate.filter(player => 
                shouldIncludePlayer(player.team)
              )
            };
            setDayOfWeekHits(filteredData);
          } else {
            setDayOfWeekHits(data);
          }
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
          
          // Apply team filtering if needed
          if (isFiltering) {
            const filteredData = {
              hitStreaks: data.hitStreaks.filter(player => 
                shouldIncludePlayer(player.team)
              ),
              noHitStreaks: data.noHitStreaks.filter(player => 
                shouldIncludePlayer(player.team)
              ),
              likelyToGetHit: data.likelyToGetHit.filter(player => 
                shouldIncludePlayer(player.team)
              ),
              likelyToContinueStreak: data.likelyToContinueStreak.filter(player => 
                shouldIncludePlayer(player.team)
              )
            };
            setHitStreakData(filteredData);
          } else {
            setHitStreakData(data);
          }
        }
      } catch (error) {
        console.error('Error loading additional stats:', error);
      } finally {
        setAdditionalStatsLoading(false);
      }
    };
    
    loadAdditionalStats();
  }, [currentDate, isFiltering, shouldIncludePlayer]);

  // Load pitcher matchup data with filtering
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
          
          // Apply team filtering if needed
          if (isFiltering) {
            // Filter pitcher matchups
            const filteredToughMatchups = data.toughPitcherMatchups.filter(pitcher => 
              shouldIncludePlayer(pitcher.team)
            );
            
            const filteredFavorableMatchups = data.favorablePitcherMatchups.filter(pitcher => 
              shouldIncludePlayer(pitcher.team)
            );
            
            const filteredTeamAdvantages = data.teamHandednessAdvantages.filter(team => 
              shouldIncludePlayer(team.team)
            );
            
            // Filter pitchers by team
            const filteredPitchersByTeam = {};
            
            Object.keys(data.allPitchersByTeam || {}).forEach(teamCode => {
              if (shouldIncludePlayer(teamCode)) {
                filteredPitchersByTeam[teamCode] = data.allPitchersByTeam[teamCode];
              }
            });
            
            setPitcherMatchups({
              toughPitcherMatchups: filteredToughMatchups,
              favorablePitcherMatchups: filteredFavorableMatchups,
              teamHandednessAdvantages: filteredTeamAdvantages,
              allPitchersByTeam: filteredPitchersByTeam
            });
          } else {
            setPitcherMatchups(data);
          }
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
  }, [currentDate, isFiltering, shouldIncludePlayer]);
  
  // Load player performance data and calculate top performers with filtering
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
          
          // Apply team filtering if needed
          let filteredData = data;
          
          if (isFiltering) {
            // FOR TEAM FILTERING, GET COMPREHENSIVE RECENT HR DATA
            console.log("[Dashboard] Team filtering active for performance data - generating comprehensive recent HR list");
            
            // Get all players from the filtered teams with HR data
            const allTeamPlayersWithHRs = data.players ? data.players.filter(player => 
              shouldIncludePlayer(player.team) && player.lastHRDate
            ) : [];
            
            // Sort by most recent HR date, then by total HRs
            const comprehensiveRecentHRs = allTeamPlayersWithHRs.sort((a, b) => {
              const dateA = new Date(a.lastHRDate);
              const dateB = new Date(b.lastHRDate);
              if (dateB - dateA !== 0) return dateB - dateA;
              return b.homeRunsThisSeason - a.homeRunsThisSeason;
            });
            
            console.log(`[Dashboard] Found ${comprehensiveRecentHRs.length} players with HRs from filtered team(s)`);
            
            filteredData = {
              ...data,
              players: data.players ? data.players.filter(player => 
                shouldIncludePlayer(player.team)
              ) : [],
              recentHRs: comprehensiveRecentHRs // Use comprehensive list for team filtering
            };
          }
          
          setPlayerPerformance(filteredData);
          
          // Process top performers if we have player data
          if (filteredData && filteredData.players && filteredData.players.length > 0) {
            // Create a new array (don't modify the original) to ensure React detects the change
            const recent = [...filteredData.recentHRs || filteredData.players
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
            
            // Rest of your code for other categories - enhanced for team filtering
            const hrRate = [...filteredData.players]
              .filter(player => player.gamesPlayed > 0 && player.homeRunsThisSeason > 0)
              .sort((a, b) => (b.homeRunsThisSeason / b.gamesPlayed) - (a.homeRunsThisSeason / a.gamesPlayed))
              .slice(0, isFiltering ? 50 : 25); // More results when team filtering
            
            const improved = [...filteredData.players]
              .filter(player => player.actualHRRate > player.historicalHRRate)
              .sort((a, b) => (b.actualHRRate - b.historicalHRRate) - (a.actualHRRate - a.historicalHRRate))
              .slice(0, isFiltering ? 50 : 25); // More results when team filtering
            
            const overPerforming = [...filteredData.players]
              .filter(player => player.status === "over-performing")
              .sort((a, b) => b.performanceIndicator - a.performanceIndicator)
              .slice(0, isFiltering ? 50 : 25); // More results when team filtering
            
            const underPerforming = [...filteredData.players]
              .filter(player => player.status === "under-performing")
              .sort((a, b) => a.performanceIndicator - b.performanceIndicator)
              .slice(0, isFiltering ? 50 : 25); // More results when team filtering
            
            // Set state with completely new object to force re-render
            setTopPerformers({
              hrRate,
              improved,
              recent, // This will now be comprehensive for team filtering
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
  }, [currentDate, isFiltering, shouldIncludePlayer]);
  
  // Load rolling stats (with priority: today > yesterday > 7-day rolling > season)
  useEffect(() => {
  const loadEnhancedRollingStats = async () => {
    try {
      setStatsLoading(true);
      
      console.log(`[Dashboard] Loading rolling stats for type: ${rollingStatsType}, team filtering: ${isFiltering}`);
      
      // FORMAT DATE FOR FILE NAME
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Try to load rolling stats file
      let rollingStatsResponse = await fetch(`/data/rolling_stats/rolling_stats_${rollingStatsType}_${dateStr}.json`);
      
      // If specific date not found, try latest
      if (!rollingStatsResponse.ok) {
        console.log(`[Dashboard] Specific date rolling stats not found, trying latest for ${rollingStatsType}`);
        rollingStatsResponse = await fetch(`/data/rolling_stats/rolling_stats_${rollingStatsType}_latest.json`);
      }
      
      if (rollingStatsResponse.ok) {
        const text = await rollingStatsResponse.text();
        
        // Check if it's actually JSON
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          const rollingStatsData = JSON.parse(text);
          console.log(`[Dashboard] Successfully loaded rolling stats from file`);
          
          // ENHANCED: Use comprehensive data for team filtering
          if (isFiltering && selectedTeam) {
            console.log(`[Dashboard] Team filtering active - using comprehensive data`);
            
            // Use comprehensive data (allHitters, allHRLeaders) for team filtering
            const allHitters = rollingStatsData.allHitters || rollingStatsData.topHitters || [];
            const allHRLeaders = rollingStatsData.allHRLeaders || rollingStatsData.topHRLeaders || [];
            const allStrikeouts = rollingStatsData.allStrikeoutPitchers || rollingStatsData.topStrikeoutPitchers || [];
            
            console.log(`[Dashboard] Available comprehensive data: ${allHitters.length} hitters, ${allHRLeaders.length} HR leaders, ${allStrikeouts.length} strikeout pitchers`);
            
            // Filter by team using comprehensive data
            const filteredHitters = allHitters.filter(player => 
              shouldIncludePlayer(player.team)
            );
            
            const filteredHomers = allHRLeaders.filter(player => 
              shouldIncludePlayer(player.team)
            );
            
            const filteredStrikeouts = allStrikeouts.filter(player => 
              shouldIncludePlayer(player.team)
            );
            
            console.log(`[Dashboard] After team filtering: ${filteredHitters.length} hitters, ${filteredHomers.length} HR leaders, ${filteredStrikeouts.length} strikeout pitchers`);
            
            setRollingStats({
              hitters: filteredHitters.slice(0, 50), // Show up to 50 for team filtering
              homers: filteredHomers.slice(0, 50),
              strikeouts: filteredStrikeouts.slice(0, 50)
            });
            
          } else {
            // NOT filtering by team - use regular top performers for global display
            console.log(`[Dashboard] No team filtering - using top performers for global display`);
            
            let filteredHitters = rollingStatsData.topHitters || [];
            let filteredHomers = rollingStatsData.topHRLeaders || [];
            let filteredStrikeouts = rollingStatsData.topStrikeoutPitchers || [];
            
            setRollingStats({
              hitters: filteredHitters.slice(0, 25), // Limit to 25 for global display
              homers: filteredHomers.slice(0, 25),
              strikeouts: filteredStrikeouts.slice(0, 25)
            });
          }
          
          setDataDate(new Date(rollingStatsData.date || currentDate));
          setDateStatus(rollingStatsData.period || 'Season Stats');
          
        } else {
          console.warn(`[Dashboard] Rolling stats file returned HTML, not JSON`);
          await loadLegacyRollingStats();
        }
      } else {
        console.log(`[Dashboard] No rolling stats file found, falling back to legacy method`);
        await loadLegacyRollingStats();
      }
      
    } catch (error) {
      console.error('[Dashboard] Error loading enhanced rolling stats:', error);
      await loadLegacyRollingStats();
    } finally {
      setStatsLoading(false);
    }
  };
  
  // LEGACY FALLBACK METHOD - ENHANCED FOR COMPREHENSIVE TEAM FILTERING
  const loadLegacyRollingStats = async () => {
    console.log(`[Dashboard] Using legacy rolling stats method`);
    
    // Check if there's data for today
    const hasDataForToday = filteredPlayerData && filteredPlayerData.length > 0;
    
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
      
      try {
        const monthName = yesterday.toLocaleString('default', { month: 'long' }).toLowerCase();
        const filePath = `/data/${yesterdayYear}/${monthName}/${monthName}_${yesterdayDay}_${yesterdayYear}.json`;
        const response = await fetch(filePath);
        
        if (response.ok) {
          const data = await response.json();
          if (data.players && data.players.length > 0) {
            // Process previous day data with comprehensive team filtering
            let allBatters = data.players.filter(player => 
              player.playerType === 'hitter' || !player.playerType);
            let allPitchers = data.players.filter(player => 
              player.playerType === 'pitcher');
            
            if (isFiltering) {
              console.log(`[Dashboard] Legacy method with team filtering - processing ALL team players`);
              
              // Filter all players by team (not just top performers)
              allBatters = allBatters.filter(player => 
                shouldIncludePlayer(player.team)
              );
              allPitchers = allPitchers.filter(player => 
                shouldIncludePlayer(player.team)
              );
            }
            
            // Find ALL performers (not limited) for team filtering
            const topHitters = [...allBatters]
              .filter(player => player.H !== 'DNP' && player.H !== null && Number(player.H) > 0)
              .sort((a, b) => (Number(b.H) || 0) - (Number(a.H) || 0))
              .slice(0, isFiltering ? 50 : 25); // More results when filtering
            
            const topHomers = [...allBatters]
              .filter(player => player.HR !== 'DNP' && player.HR !== null && Number(player.HR) > 0)
              .sort((a, b) => (Number(b.HR) || 0) - (Number(a.HR) || 0))
              .slice(0, isFiltering ? 50 : 25); // More results when filtering
            
            const topStrikeoutPitchers = [...allPitchers]
              .filter(player => player.K !== 'DNP' && player.K !== null && Number(player.K) > 0)
              .sort((a, b) => (Number(b.K) || 0) - (Number(a.K) || 0))
              .slice(0, isFiltering ? 50 : 25); // More results when filtering
            
            setRollingStats({
              hitters: topHitters.map(player => ({...player, games: 1})),
              homers: topHomers.map(player => ({...player, games: 1})),
              strikeouts: topStrikeoutPitchers.map(player => ({...player, games: 1}))
            });
            
            // Set data date and status
            setDataDate(yesterday);
            setDateStatus('previous');
            
            console.log(`[Dashboard] Legacy previous day with team filtering: ${topHitters.length} hitters, ${topHomers.length} homers, ${topStrikeoutPitchers.length} strikeout pitchers`);
            
            return; // Exit early since we found yesterday's data
          }
        }
      } catch (e) {
        console.warn(`Could not load previous day data: ${e.message}`);
      }
      
      // If we get here, fall back to current data processing
      processCurrentData();
      setDateStatus('current');
    }
  };

  // Helper function to process current data (enhanced for comprehensive team filtering)
  const processCurrentData = () => {
    console.log(`[Dashboard] Processing current data, team filtering: ${isFiltering}`);
    
    let batters = filteredBatterData;
    let pitchers = filteredPitcherData;
    
    // If team filtering and we have comprehensive data, use ALL team players
    if (isFiltering && playerData && playerData.length > 0) {
      console.log(`[Dashboard] Team filtering active - processing ALL team players from current data`);
      
      // Get ALL team players (not pre-filtered)
      const allTeamBatters = playerData
        .filter(player => (player.playerType === 'hitter' || !player.playerType) && shouldIncludePlayer(player.team));
      const allTeamPitchers = playerData
        .filter(player => player.playerType === 'pitcher' && shouldIncludePlayer(player.team));
      
      batters = allTeamBatters;
      pitchers = allTeamPitchers;
      
      console.log(`[Dashboard] Found ${batters.length} team batters and ${pitchers.length} team pitchers in current data`);
    }
    
    // Find top performers in current data
    const topHitters = [...batters]
      .filter(player => player.H !== 'DNP' && player.H !== null && Number(player.H) > 0)
      .sort((a, b) => (Number(b.H) || 0) - (Number(a.H) || 0))
      .slice(0, isFiltering ? 50 : 25); // More results when filtering
    
    const topHomers = [...batters]
      .filter(player => player.HR !== 'DNP' && player.HR !== null && Number(player.HR) > 0)
      .sort((a, b) => (Number(b.HR) || 0) - (Number(a.HR) || 0))
      .slice(0, isFiltering ? 50 : 25); // More results when filtering
    
    const topStrikeoutPitchers = [...pitchers]
      .filter(player => player.K !== 'DNP' && player.K !== null && Number(player.K) > 0)
      .sort((a, b) => (Number(b.K) || 0) - (Number(a.K) || 0))
      .slice(0, isFiltering ? 50 : 25); // More results when filtering
    
    setRollingStats({
      hitters: topHitters.map(player => ({...player, games: 1})),
      homers: topHomers.map(player => ({...player, games: 1})),
      strikeouts: topStrikeoutPitchers.map(player => ({...player, games: 1}))
    });
    
    console.log(`[Dashboard] Current data processing complete: ${topHitters.length} hitters, ${topHomers.length} homers, ${topStrikeoutPitchers.length} strikeout pitchers`);
  };
  
  loadEnhancedRollingStats();
}, [filteredPlayerData, filteredBatterData, filteredPitcherData, currentDate, isFiltering, shouldIncludePlayer, rollingStatsType, selectedTeam, includeMatchup, matchupTeam, playerData]);

// Also update the generateTeamSpecificStats function to be more comprehensive
const generateTeamSpecificStats = (playerData, selectedTeam, includeMatchup, matchupTeam, shouldIncludePlayer) => {
  console.log(`[generateTeamSpecificStats] Generating comprehensive stats for team filter`);
  
  // Filter ALL players for the selected team(s) - this ensures we get everyone
  const teamFilteredPlayers = playerData.filter(player => shouldIncludePlayer(player.team));
  
  console.log(`[generateTeamSpecificStats] Found ${teamFilteredPlayers.length} total team players`);
  
  // Separate batters and pitchers
  const teamBatters = teamFilteredPlayers.filter(player => 
    player.playerType === 'hitter' || !player.playerType
  );
  const teamPitchers = teamFilteredPlayers.filter(player => 
    player.playerType === 'pitcher'
  );
  
  console.log(`[generateTeamSpecificStats] Team breakdown: ${teamBatters.length} batters, ${teamPitchers.length} pitchers`);
  
  // Generate comprehensive hitters list (ALL team players with hits)
  const comprehensiveHitters = [...teamBatters]
    .filter(player => player.H !== 'DNP' && player.H !== null && Number(player.H) > 0)
    .sort((a, b) => (Number(b.H) || 0) - (Number(a.H) || 0))
    .map(player => ({...player, games: 1})); // Add games field for compatibility
  
  // Generate comprehensive home run leaders (ALL team players with HRs)
  const comprehensiveHomers = [...teamBatters]
    .filter(player => player.HR !== 'DNP' && player.HR !== null && Number(player.HR) > 0)
    .sort((a, b) => (Number(b.HR) || 0) - (Number(a.HR) || 0))
    .map(player => ({...player, games: 1}));
  
  // Generate comprehensive strikeout pitchers (ALL team pitchers with Ks)
  const comprehensiveStrikeouts = [...teamPitchers]
    .filter(player => player.K !== 'DNP' && player.K !== null && Number(player.K) > 0)
    .sort((a, b) => (Number(b.K) || 0) - (Number(a.K) || 0))
    .map(player => ({...player, games: 1}));
  
  console.log(`[generateTeamSpecificStats] Generated comprehensive team stats: ${comprehensiveHitters.length} hitters with hits, ${comprehensiveHomers.length} players with HRs, ${comprehensiveStrikeouts.length} pitchers with Ks`);
  
  return {
    hitters: comprehensiveHitters,
    homers: comprehensiveHomers,
    strikeouts: comprehensiveStrikeouts
  };
};

const getTimePeriodText = () => {
  switch(rollingStatsType) {
    case 'season':
      return "Season Leaders";
    case 'last_30':
      return "Last 30 Days";
    case 'last_7':
      return "Last 7 Days";
    case 'current':
      return dateStatus === 'current' ? "Today" : 
             dateStatus === 'previous' ? dataDate.toLocaleDateString('en-US', { weekday: 'long' }) :
             "Current";
    default:
      return dateStatus === 'current' ? "Today" : 
             dateStatus === 'previous' ? dataDate.toLocaleDateString('en-US', { weekday: 'long' }) :
             dateStatus === 'historical' ? "Last 7 Days" :
             dateStatus === 'season' ? "Season Performance" : "Today";
  }
};

const StatsTimePeriodSelector = () => (
  <div className="stats-time-selector" style={{
    display: 'flex',
    gap: '8px',
    marginBottom: '15px',
    flexWrap: 'wrap'
  }}>
    <span style={{ fontSize: '0.9rem', color: '#666', alignSelf: 'center' }}>Show:</span>
    {[
      { key: 'season', label: 'Season' },
      { key: 'last_30', label: 'Last 30 Days' },
      { key: 'last_7', label: 'Last 7 Days' },
      { key: 'current', label: 'Current' }
    ].map(option => (
      <button
        key={option.key}
        onClick={() => setRollingStatsType(option.key)}
        style={{
          padding: '4px 12px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: rollingStatsType === option.key ? '#0056b3' : 'white',
          color: rollingStatsType === option.key ? 'white' : '#333',
          fontSize: '0.85rem',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        {option.label}
      </button>
    ))}
  </div>
);
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

  // Add this state for handling race conditions
const [filteringComplete, setFilteringComplete] = useState(false);

// Use this effect to delay the final check
useEffect(() => {
  if (isFiltering) {
    setFilteringComplete(false);
    // Give time for all filters to apply
    const timer = setTimeout(() => {
      setFilteringComplete(true);
    }, 250); // 250ms should be enough for all filtering to complete
    
    return () => clearTimeout(timer);
  }
}, [isFiltering]);

const isLoadingAnyData = statsLoading || 
                         predictionLoading || 
                         additionalStatsLoading || 
                         matchupsLoading||
                         stadiumLoading;
  
const noFilteredData = isFiltering && 
                      !isLoadingAnyData && 
                      filteredPlayerData.length === 0 && 
                      filteredBatterData.length === 0 &&
                      filteredPitcherData.length === 0 &&
                      // Check if all arrays in topPerformers are empty
                      Object.values(topPerformers).every(arr => !arr || arr.length === 0) &&
                      // Check if hitStreakData arrays are empty
                      hitStreakData.hitStreaks.length === 0 &&
                      hitStreakData.likelyToGetHit.length === 0 &&
                      hitStreakData.likelyToContinueStreak.length === 0 &&
                      // Check if dayOfWeekHits arrays are empty
                      (dayOfWeekHits.topHitsByTotal && dayOfWeekHits.topHitsByTotal.length === 0);

  
  
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2> <img
              src='data/logos/Major_League_Baseball_logo.svg'
              style={{
                height: '1.2em',
                verticalAlign: 'middle'
              }}
              alt="MLB Logo"
            />MLB Statistics Dashboard</h2>
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
      
      {/* Add Team Filter Component */}
      <TeamFilter 
        teamData={teamData}
        selectedTeam={selectedTeam}
        includeMatchup={includeMatchup}
        matchupTeam={matchupTeam}
        onTeamSelect={setSelectedTeam}
        onMatchupToggle={toggleMatchup}
        onReset={resetFilters}
      />
      
      {/* Add Filter Indicator when filtering is active */}
      {isFiltering && !filteringComplete ? (
  <div className="filtering-in-progress">
    <div className="loading-spinner"></div>
    <p>Applying filters...</p>
  </div>
) : noFilteredData ? (
  <div className="filtered-empty-state">
    <div className="empty-icon">🔍</div>
    <h3>No Data Found</h3>
    <p>No player data found for the selected team filter.</p>
    <button className="reset-btn" onClick={resetFilters}>
      Reset Filters
    </button>
  </div>
) : (
        <div className="dashboard-grid">

                <div className="stats-controls" style={{ gridColumn: '1 / -1' }}>
        <StatsTimePeriodSelector />
      </div>
          {/* Statistics Summary Card */}
          <StatsSummaryCard 
            batterData={filteredBatterData}
            pitcherData={filteredPitcherData}
          />

          <LiveScoresCard teams={teamData} />
          <MLBWeatherCard teams={teamData} />
          
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

        <MostHomeRunsAtHomeCard 
          stadiumData={stadiumData}
          isLoading={stadiumLoading}
          teams={teamData} 
        />
          
          <OpponentMatchupHitsCard 
            gameData={filteredGameData}
             currentDate={currentDate}
            teams={teamData}
          />

          <OpponentMatchupHRCard 
            gameData={filteredGameData}
            currentDate={currentDate}
            teams={teamData}
          />

          <CurrentSeriesHitsCard 
            gameData={filteredGameData}
            currentDate={currentDate}
            teams={teamData}
          />
          <CurrentSeriesHRCard 
            gameData={filteredGameData}
            currentDate={currentDate}
            teams={teamData}
          />
          <TimeSlotHitsCard 
            gameData={filteredGameData}
            currentDate={currentDate}
            teams={teamData}
          />
          <TimeSlotHRCard 
            gameData={filteredGameData}
            currentDate={currentDate}
            teams={teamData}
          />

                      <PitcherHRsAllowedCard 
              currentDate={currentDate}
              teams={teamData}
              maxItems={15}
            />
      
            <PitcherHitsAllowedCard 
              currentDate={currentDate}
              teams={teamData}
              maxItems={15}
            />

          <HitDroughtBounceBackCard 
            gameData={filteredGameData}
            currentDate={currentDate}
            teams={teamData}
          />

          <MultiHitDashboardCard />

          {/* Over-Performing Players Card */}
          <PerformanceCard 
  teamData={teamData}
  currentDate={currentDate}
          />
          
          {/* Under-Performing Players Card */}
  <PoorPerformanceCard 
    poorPerformancePredictions={poorPerformancePredictions}
    isLoading={poorPerformanceLoading}
    teams={teamData}
  />


          {/* Team Last Result Cards */}
<TeamComingOffWinCard 
  gameData={gameData}
  playerData={filteredBatterData.concat(filteredPitcherData)}
  teamData={teamData}
    currentDate={currentDate}  
/>

<TeamComingOffLossCard 
  teamData={teamData}
  currentDate={currentDate}
/>
          
          
          
          {/* Pitcher Matchup Analysis Card */}
          <PitcherMatchupCard 
            pitcherMatchups={pitcherMatchups}
            isLoading={matchupsLoading}
            currentDate={currentDate}
          />
          
          
          {/* 
            SLOT MACHINE CARD - FULL WIDTH
            Enhanced with all the new quick add options
          */}
          <SlotMachineCard 
            playerData={filteredPlayerData}
            teamData={teamData}
            rollingStats={rollingStats}
            topPerformers={topPerformers}
            hitStreakData={hitStreakData}
            playersWithHomeRunPrediction={playersWithHomeRunPrediction}
            // Use the simplified slot machine data
            currentSeriesHits={slotMachineCardData.currentSeriesHits}
            currentSeriesHRs={slotMachineCardData.currentSeriesHRs}
            timeSlotHits={slotMachineCardData.timeSlotHits}
            opponentHits={slotMachineCardData.opponentHits}
            opponentHRs={slotMachineCardData.opponentHRs}
            fridayHitLeaders={slotMachineCardData.fridayHitLeaders}
          />


          
          {/* Recent Updates Card */}
          <RecentUpdatesCard 
            currentDate={currentDate}
            dataDate={dataDate}
            dateStatus={dateStatus}
            topPerformers={topPerformers}
            rollingStats={rollingStats}
            visitCount={visitCount}
            visitLoading={visitLoading}
          />

          <div />
        </div>
      )}
    </div>
  );
}

export default Dashboard;