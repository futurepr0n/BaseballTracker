import React, { useState, useEffect, useCallback, Fragment, useMemo } from 'react';
import './MatchupAnalyzer.css';
import { fetchRosterData, fetchPlayerDataForDateRange } from '../services/dataService';
import { createEnhancedMatchupAnalyzer, analyzeEnhancedMatchup } from '../services/EnhancedMatchupAnalysis';
import { createArsenalAnalyzer, analyzeArsenalMatchup } from '../services/arsenalAnalysis';
import { analyzeHRMatchup } from '../services/HRAnalysis/HRAnalysisService';
import HRAnalysisCard from './HRAnalysis/HRAnalysisCard';
import './HRAnalysis/HRAnalysisCard.css';
import Papa from 'papaparse';
import _ from 'lodash';

// Define the years of data you want to load
const DATA_YEARS = [2025, 2024, 2023, 2022];
const CURRENT_YEAR = Math.max(...DATA_YEARS);

/**
 * ENHANCED MatchupAnalyzer with Arsenal Analysis and HR Analysis Integration
 * Now includes detailed pitcher arsenal analysis, pitch-by-pitch hitter breakdowns,
 * and confidence-adjusted HR analysis
 */
function MatchupAnalyzer({ gameData, playerData, teamData, currentDate }) {
  // State for data
  const [rosterData, setRosterData] = useState([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(true);
  
  // State for CSV data loading
  const [hitterData, setHitterData] = useState([]);
  const [pitcherData, setPitcherData] = useState([]);
  const [isLoadingCSV, setIsLoadingCSV] = useState(true);
  const [dataLoadError, setDataLoadError] = useState(null);
  
  // State for exit velocity data (HR analysis)
  const [exitVelocityData, setExitVelocityData] = useState(null);
  
  // State for year selection
  const [activeYears, setActiveYears] = useState([...DATA_YEARS].sort((a, b) => b - a));
  
  // State for selected games and configured pitchers
  const [selectedGames, setSelectedGames] = useState({});
  const [gamePitchers, setGamePitchers] = useState({});
  const [analysisResults, setAnalysisResults] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // State for arsenal analysis
  const [arsenalAnalyses, setArsenalAnalyses] = useState(new Map());
  const [expandedArsenal, setExpandedArsenal] = useState(new Set());
  
  // State for table functionality
  const [sortConfig, setSortConfig] = useState({ key: 'advantage', direction: 'desc' });
  const [filteredResults, setFilteredResults] = useState([]);
  const [removedResultIds, setRemovedResultIds] = useState(new Set());
  
  // Enhanced analyzer instances
  const [matchupAnalyzer, setMatchupAnalyzer] = useState(null);
  const [arsenalAnalyzer, setArsenalAnalyzer] = useState(null);
  
  // Format date for display
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Create data service for HR analysis
  const dataService = {
    fetchPlayerDataForDateRange,
    rosterData
  };

  // Team mapping helper function to handle abbreviation mismatches
  const mapTeamAbbreviation = useCallback((team) => {
    const teamMappings = {
      'ATH': 'OAK',  // Athletics
      'CWS': 'CHW',  // White Sox  
      'LAD': 'LA',   // Dodgers
      'NYM': 'NYN',  // Mets
      'NYY': 'NY',   // Yankees
      'SD': 'SDN',   // Padres
      'SF': 'SFN',   // Giants
      'TB': 'TBR',   // Rays
      'WSH': 'WAS',  // Nationals
      // Reverse mappings
      'OAK': 'ATH',
      'CHW': 'CWS', 
      'LA': 'LAD',
      'NYN': 'NYM',
      'NY': 'NYY',
      'SDN': 'SD',
      'SFN': 'SF',
      'TBR': 'TB',
      'WAS': 'WSH'
    };
    
    return teamMappings[team] || team;
  }, []);

  // Normalize roster data with team mappings
  const normalizedRosterData = useMemo(() => {
    return rosterData.map(player => ({
      ...player,
      originalTeam: player.team,
      team: mapTeamAbbreviation(player.team)
    }));
  }, [rosterData, mapTeamAbbreviation]);
  
  // Load roster data when component mounts
  useEffect(() => {
    const loadRoster = async () => {
      setIsLoadingRoster(true);
      try {
        console.log("Loading roster data...");
        const roster = await fetchRosterData();
        console.log(`Loaded ${roster.length} players from roster data`);
        setRosterData(roster);
        
        // Initialize selected games using array indices as keys
        const gameSelections = {};
        gameData.forEach((game, index) => {
          gameSelections[index] = true;
        });
        setSelectedGames(gameSelections);
        
      } catch (error) {
        console.error("Error loading roster data:", error);
      } finally {
        setIsLoadingRoster(false);
      }
    };
    
    loadRoster();
  }, [gameData]);

  // Load CSV data for all years when component mounts
  useEffect(() => {
    const loadAllCSVData = async () => {
      setIsLoadingCSV(true);
      setDataLoadError(null);
      
      try {
        console.log("Loading CSV data for all years...");
        
        let allHitterStats = [];
        let allPitcherStats = [];
        let successfullyLoadedYears = [];

        for (const year of DATA_YEARS.sort((a,b) => b-a)) { 
          const hitterFile = `hitterpitcharsenalstats_${year}.csv`;
          const pitcherFile = `pitcherpitcharsenalstats_${year}.csv`;
          
          console.log(`Fetching data for year ${year}: /data/stats/${hitterFile}, /data/stats/${pitcherFile}`);

          try {
            const [hitterResponseText, pitcherResponseText] = await Promise.all([
              fetch(`/data/stats/${hitterFile}`)
                .then(response => {
                  if (!response.ok) throw new Error(`Failed to fetch ${hitterFile}: ${response.status} ${response.statusText}`);
                  return response.text();
                }),
              fetch(`/data/stats/${pitcherFile}`)
                .then(response => {
                  if (!response.ok) throw new Error(`Failed to fetch ${pitcherFile}: ${response.status} ${response.statusText}`);
                  return response.text();
                })
            ]);

            const parsedHitterData = Papa.parse(hitterResponseText, { 
              header: true, 
              dynamicTyping: true, 
              skipEmptyLines: true, 
              transformHeader: header => header.replace(/"/g, '') 
            });
            
            const parsedPitcherData = Papa.parse(pitcherResponseText, { 
              header: true, 
              dynamicTyping: true, 
              skipEmptyLines: true, 
              transformHeader: header => header.replace(/"/g, '') 
            });

            if (parsedHitterData.data.length > 0 || parsedPitcherData.data.length > 0) {
                successfullyLoadedYears.push(year);
            }

            allHitterStats.push(...parsedHitterData.data.map(row => ({ ...row, year })));
            allPitcherStats.push(...parsedPitcherData.data.map(row => ({ ...row, year })));
            
            console.log(`Successfully loaded data for year ${year}`);
          } catch (yearError) {
            console.warn(`Warning: Could not load data for year ${year}. Skipping. Error: ${yearError.message}`);
          }
        }
        
        // Update active years to only include successfully loaded years
        setActiveYears(_.uniq(successfullyLoadedYears).sort((a,b) => b-a));
        
        if (allHitterStats.length === 0 || allPitcherStats.length === 0) {
          throw new Error("No player statistics data could be loaded. Please check CSV file availability.");
        }

        setHitterData(allHitterStats);
        setPitcherData(allPitcherStats);
        
        console.log(`Loaded ${allHitterStats.length} hitter records and ${allPitcherStats.length} pitcher records`);
        
      } catch (error) {
        console.error("Error loading CSV data:", error);
        setDataLoadError(`Error loading data: ${error.message}. Ensure CSV files are available in /public/data/stats/`);
      } finally {
        setIsLoadingCSV(false);
      }
    };

    loadAllCSVData();
  }, []);

  // Load exit velocity data for HR analysis
  useEffect(() => {
    const loadExitVelocityData = async () => {
      try {
        console.log("Loading exit velocity data for HR analysis...");
        
        const [hitterExitVeloResponse, pitcherExitVeloResponse] = await Promise.all([
          fetch('/data/stats/hitter_exit_velocity_2025.csv').then(r => r.text()),
          fetch('/data/stats/pitcher_exit_velocity_2025.csv').then(r => r.text())
        ]);
        
        const hitterExitVelo = Papa.parse(hitterExitVeloResponse, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        }).data;
        
        const pitcherExitVelo = Papa.parse(pitcherExitVeloResponse, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        }).data;
        
        setExitVelocityData({ hitter: hitterExitVelo, pitcher: pitcherExitVelo });
        console.log(`Loaded ${hitterExitVelo.length} hitter and ${pitcherExitVelo.length} pitcher exit velocity records`);
      } catch (error) {
        console.warn('Could not load exit velocity data:', error);
      }
    };
    
    if (hitterData.length > 0 && pitcherData.length > 0) {
      loadExitVelocityData();
    }
  }, [hitterData, pitcherData]);

  // Create enhanced analyzer when data is loaded AND when activeYears change
  useEffect(() => {
    if (hitterData.length > 0 && pitcherData.length > 0 && normalizedRosterData.length > 0 && activeYears.length > 0) {
      console.log('Creating enhanced matchup analyzer with years:', activeYears);
      const analyzer = createEnhancedMatchupAnalyzer(hitterData, pitcherData, normalizedRosterData, activeYears);
      setMatchupAnalyzer(analyzer);
      
      console.log('Creating arsenal analyzer with years:', activeYears);
      const arsenalAnalyzer = createArsenalAnalyzer(hitterData, pitcherData, activeYears);
      setArsenalAnalyzer(arsenalAnalyzer);
    }
  }, [hitterData, pitcherData, normalizedRosterData, activeYears]);

  // Auto re-run analysis when analyzer updates (due to year changes)
  useEffect(() => {
    if (matchupAnalyzer && arsenalAnalyzer && analysisResults.length > 0) {
      console.log('Analyzers updated, re-running analysis...');
      setTimeout(() => {
        runAnalysis();
      }, 100);
    }
  }, [matchupAnalyzer, arsenalAnalyzer]);

  // Calculate overall confidence score
  const calculateOverallConfidence = (result) => {
    const confidenceScores = [];
    let weights = [];
    
    // HR Confidence
    if (result.hrAnalysis && result.hrAnalysis.confidence !== undefined) {
      confidenceScores.push(result.hrAnalysis.confidence);
      weights.push(0.25); // 25% weight
    }
    
    // Arsenal Confidence
    if (result.arsenalInsights && result.arsenalInsights.confidence !== undefined) {
      confidenceScores.push(result.arsenalInsights.confidence);
      weights.push(0.25); // 25% weight
    }
    
    // Analysis Quality (from main analysis)
    if (result.result.details.confidence !== undefined) {
      confidenceScores.push(result.result.details.confidence);
      weights.push(0.30); // 30% weight - higher because it's the core analysis
    }
    
    // Future: Hit Confidence (placeholder - will be implemented)
    // For now, use a proxy based on PA data if available
    if (result.result.details.totalPA !== undefined && result.result.details.totalPA > 0) {
      const hitConfidence = Math.min(1, result.result.details.totalPA / 200);
      confidenceScores.push(hitConfidence);
      weights.push(0.10); // 10% weight
    }
    
    // Future: K Confidence (placeholder - will be implemented)
    // For now, use analysis quality as a proxy
    if (result.result.details.confidence !== undefined) {
      const kConfidence = result.result.details.confidence * 0.9; // Slightly lower than overall
      confidenceScores.push(kConfidence);
      weights.push(0.10); // 10% weight
    }
    
    // If we have no scores, return 0
    if (confidenceScores.length === 0) return 0;
    
    // Normalize weights to sum to 1
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);
    
    // Calculate weighted average
    let overallConfidence = 0;
    confidenceScores.forEach((score, index) => {
      overallConfidence += score * normalizedWeights[index];
    });
    
    return overallConfidence;
  };

  // Get confidence level label
  const getConfidenceLevel = (confidence) => {
    if (confidence >= 0.8) return { label: 'High', color: '#22c55e' };
    if (confidence >= 0.6) return { label: 'Med', color: '#f59e0b' };
    if (confidence >= 0.4) return { label: 'Low', color: '#ef4444' };
    return { label: 'V.Low', color: '#991b1b' };
  };

  // Get all available pitchers for a team
  const getPitchersForTeam = useCallback((teamCode) => {
    if (!normalizedRosterData || !teamCode) return [];
    
    console.log(`[getPitchersForTeam] Looking for pitchers for team: ${teamCode}`);
    console.log(`[getPitchersForTeam] Mapped team code: ${mapTeamAbbreviation(teamCode)}`);
    
    // Try both original and mapped team codes
    const originalTeamPitchers = normalizedRosterData.filter(player => 
      (player.originalTeam === teamCode || player.team === teamCode) && 
      player.type === 'pitcher'
    );
    
    console.log(`[getPitchersForTeam] Found ${originalTeamPitchers.length} pitchers`);
    
    return originalTeamPitchers.map(pitcher => ({
      value: `${pitcher.name}-${pitcher.originalTeam || pitcher.team}`, // Use original team for the key
      label: `${pitcher.name}${pitcher.throwingArm || pitcher.ph ? ` (${pitcher.throwingArm || pitcher.ph})` : ''}`,
      data: pitcher
    }));
  }, [normalizedRosterData, mapTeamAbbreviation]);
  
  // Get all batters for a team
  const getBattersForTeam = useCallback((teamCode) => {
    if (!normalizedRosterData || !teamCode) return [];
    
    return normalizedRosterData
      .filter(player => 
        (player.originalTeam === teamCode || player.team === teamCode) && 
        player.type === 'hitter'
      );
  }, [normalizedRosterData]);

  // Toggle game selection
  const handleGameSelect = (gameIndex) => {
    setSelectedGames(prev => ({
      ...prev,
      [gameIndex]: !prev[gameIndex]
    }));
  };

  // Handle pitcher selection
  const handlePitcherSelect = (gameIndex, teamCode, pitcherId) => {
    const key = `${gameIndex}_${teamCode}`;
    setGamePitchers(prev => ({
      ...prev,
      [key]: pitcherId
    }));
  };

  // Reset all selections
  const resetSelections = () => {
    setGamePitchers({});
    setAnalysisResults([]);
    setFilteredResults([]);
    setRemovedResultIds(new Set());
    setArsenalAnalyses(new Map());
    setExpandedArsenal(new Set());
  };

  // Get pitcher by ID (name-team format) with enhanced debugging
  const getPitcherById = (pitcherId) => {
    console.log('getPitcherById called with:', pitcherId);
    console.log('normalizedRosterData length:', normalizedRosterData?.length || 0);
    
    if (!pitcherId || !normalizedRosterData.length) {
      console.log('Early return: missing pitcherId or normalizedRosterData');
      return null;
    }
    
    const [pitcherName, pitcherTeam] = pitcherId.split('-');
    console.log('Looking for pitcher:', { pitcherName, pitcherTeam });
    
    const found = normalizedRosterData.find(p => {
      const nameMatch = p.name === pitcherName;
      const teamMatch = p.originalTeam === pitcherTeam || p.team === pitcherTeam;
      const typeMatch = p.type === 'pitcher' || p.type === 'Pitcher';
      
      if (nameMatch && (p.originalTeam === pitcherTeam || p.team === pitcherTeam)) {
        console.log('Found player but checking type:', {
          name: p.name,
          originalTeam: p.originalTeam,
          team: p.team,
          type: p.type,
          typeMatch
        });
      }
      
      return nameMatch && teamMatch && typeMatch;
    });
    
    if (!found) {
      console.log('Pitcher not found. Available pitchers for team:', 
        normalizedRosterData.filter(p => (p.originalTeam === pitcherTeam || p.team === pitcherTeam) && 
                                    (p.type === 'pitcher' || p.type === 'Pitcher'))
                          .map(p => ({ name: p.name, type: p.type, originalTeam: p.originalTeam, team: p.team }))
      );
    }
    
    return found || null;
  };

  // Sorting functionality
  const handleSort = (column) => {
    let direction = 'desc';
    if (sortConfig.key === column && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key: column, direction });
  };

  // Sort the results based on current sort config
  const getSortedResults = () => {
    const resultsToSort = analysisResults.filter(result => !removedResultIds.has(result.id));
    
    if (!sortConfig.key) return resultsToSort;

    return [...resultsToSort].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'advantage':
          aValue = a.result.advantage;
          bValue = b.result.advantage;
          break;
        case 'hit':
          // Sort by both rating and actual batting average
          const aHitRating = a.result.hitPotential;
          const bHitRating = b.result.hitPotential;
          
          // Get the actual batting averages
          const aBA = parseFloat(a.result.details.predictedBA) || 0;
          const bBA = parseFloat(b.result.details.predictedBA) || 0;
          
          // First sort by rating level
          aValue = getPotentialValue(aHitRating) * 1000; // Multiply by 1000 to ensure rating takes precedence
          bValue = getPotentialValue(bHitRating) * 1000;
          
          // Then add the batting average as a secondary sort within the same rating
          aValue += aBA * 1000; // Scale up BA to make differences meaningful
          bValue += bBA * 1000;
          break;
        case 'hr':
          // Sort by both rating and actual HR percentage
          const aRating = a.hrAnalysis?.potential || a.result.hrPotential;
          const bRating = b.hrAnalysis?.potential || b.result.hrPotential;
          
          // Get the actual HR rates
          const aHRRate = a.hrAnalysis?.metrics?.adjustedHRRate || 
                         (parseFloat(a.result.details.predictedHR) || 0);
          const bHRRate = b.hrAnalysis?.metrics?.adjustedHRRate || 
                         (parseFloat(b.result.details.predictedHR) || 0);
          
          // First sort by rating level
          aValue = getPotentialValue(aRating) * 1000; // Multiply by 1000 to ensure rating takes precedence
          bValue = getPotentialValue(bRating) * 1000;
          
          // Then add the HR rate as a secondary sort within the same rating
          aValue += aHRRate * 100; // Scale up HR rate to make differences meaningful
          bValue += bHRRate * 100;
          break;
        case 'tb':
          // Sort by both rating and actual slugging percentage
          const aTBRating = a.result.tbPotential;
          const bTBRating = b.result.tbPotential;
          
          // Get the actual slugging percentages
          const aSLG = parseFloat(a.result.details.predictedSLG) || 0;
          const bSLG = parseFloat(b.result.details.predictedSLG) || 0;
          
          // First sort by rating level
          aValue = getPotentialValue(aTBRating) * 1000;
          bValue = getPotentialValue(bTBRating) * 1000;
          
          // Then add the slugging percentage as secondary sort
          aValue += aSLG * 1000;
          bValue += bSLG * 1000;
          break;
        case 'k':
          // Sort by both rating and actual strikeout rate
          const aKRating = a.result.kPotential;
          const bKRating = b.result.kPotential;
          
          // Get the actual strikeout rates
          const aKRate = parseFloat(a.result.details.strikeoutRate) || 0;
          const bKRate = parseFloat(b.result.details.strikeoutRate) || 0;
          
          // First sort by rating level (note: for K, Low is better, so we invert)
          aValue = getPotentialValue(aKRating) * 1000;
          bValue = getPotentialValue(bKRating) * 1000;
          
          // Then add the K rate as secondary sort
          // For K rate, lower is better for batters, so we subtract instead of add
          aValue += (1 - aKRate) * 100;
          bValue += (1 - bKRate) * 100;
          break;
        case 'confidence':
          aValue = calculateOverallConfidence(a);
          bValue = calculateOverallConfidence(b);
          break;
        case 'batter':
          aValue = a.batter.name;
          bValue = b.batter.name;
          break;
        case 'pitcher':
          aValue = a.pitcher.name;
          bValue = b.pitcher.name;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortConfig.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  // Helper function to convert potential ratings to numeric values for sorting
  const getPotentialValue = (potential) => {
    switch (potential) {
      case 'High': return 3;
      case 'Medium': return 2;
      case 'Low': return 1;
      default: return 0;
    }
  };

  // Remove a result row
  const removeResult = (resultId) => {
    setRemovedResultIds(prev => new Set([...prev, resultId]));
  };

  // Clear all removed results
  const clearRemovedResults = () => {
    setRemovedResultIds(new Set());
  };

  // Toggle arsenal expansion for a specific pitcher-team combination
  const toggleArsenalExpansion = (pitcherKey) => {
    setExpandedArsenal(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pitcherKey)) {
        newSet.delete(pitcherKey);
      } else {
        newSet.add(pitcherKey);
      }
      return newSet;
    });
  };

  // ENHANCED: Analysis with Arsenal and HR Integration
  const runAnalysis = useCallback(async () => {
    console.log("Starting enhanced analysis with arsenal and HR integration...");
    setIsAnalyzing(true);
    setAnalysisResults([]);
    setRemovedResultIds(new Set());
    setArsenalAnalyses(new Map());
    
    if (!matchupAnalyzer || !arsenalAnalyzer) {
      console.error("Analyzers not ready");
      setIsAnalyzing(false);
      return;
    }
    
    // Get selected game indices
    const selectedGameIndices = Object.entries(selectedGames)
      .filter(([_, isSelected]) => isSelected)
      .map(([index]) => Number(index));
    
    console.log(`Selected games: ${selectedGameIndices.length}, Active years: ${activeYears.join(', ')}`);
    
    // Track pitchers for arsenal analysis
    const uniquePitchers = new Map();
    const pitcherToOpposingHitters = new Map();
    
    // Collect all configured matchups AND track pitcher-hitter relationships
    const matchups = [];
    
    for (const gameIndex of selectedGameIndices) {
      const game = gameData[gameIndex];
      if (!game) {
        console.log(`Game at index ${gameIndex} not found`);
        continue;
      }
      
      console.log(`Processing game: ${game.awayTeam} @ ${game.homeTeam}`);
      
      // Home team pitcher vs away team batters
      const homePitcherId = gamePitchers[`${gameIndex}_${game.homeTeam}`];
      if (homePitcherId) {
        const homePitcher = getPitcherById(homePitcherId);
        if (homePitcher) {
          console.log(`Found home pitcher: ${homePitcher.name}`);
          const awayBatters = getBattersForTeam(game.awayTeam);
          console.log(`Found ${awayBatters.length} away batters`);
          
          const pitcherKey = `${homePitcher.name}-${homePitcher.originalTeam || homePitcher.team}`;
          uniquePitchers.set(pitcherKey, homePitcher);
          pitcherToOpposingHitters.set(pitcherKey, awayBatters);
          
          awayBatters.forEach((batter, index) => {
            matchups.push({
              id: `${gameIndex}-home-${index}`,
              gameIndex,
              game: `${game.awayTeam} @ ${game.homeTeam}`,
              batter,
              pitcher: homePitcher,
              pitcherKey
            });
          });
        } else {
          console.error(`Could not find pitcher with ID: ${homePitcherId}`);
        }
      }
      
      // Away team pitcher vs home team batters
      const awayPitcherId = gamePitchers[`${gameIndex}_${game.awayTeam}`];
      if (awayPitcherId) {
        const awayPitcher = getPitcherById(awayPitcherId);
        if (awayPitcher) {
          console.log(`Found away pitcher: ${awayPitcher.name}`);
          const homeBatters = getBattersForTeam(game.homeTeam);
          console.log(`Found ${homeBatters.length} home batters`);
          
          const pitcherKey = `${awayPitcher.name}-${awayPitcher.originalTeam || awayPitcher.team}`;
          uniquePitchers.set(pitcherKey, awayPitcher);
          pitcherToOpposingHitters.set(pitcherKey, homeBatters);
          
          homeBatters.forEach((batter, index) => {
            matchups.push({
              id: `${gameIndex}-away-${index}`,
              gameIndex,
              game: `${game.awayTeam} @ ${game.homeTeam}`,
              batter,
              pitcher: awayPitcher,
              pitcherKey
            });
          });
        } else {
          console.error(`Could not find pitcher with ID: ${awayPitcherId}`);
        }
      }
    }
    
    console.log(`Total matchups to analyze: ${matchups.length}`);
    console.log(`Unique pitchers for arsenal analysis: ${uniquePitchers.size}`);
    
    if (matchups.length === 0) {
      console.log("No matchups to analyze. Make sure pitchers are selected.");
      setIsAnalyzing(false);
      return;
    }
    
    try {
      // First, run arsenal analysis for each unique pitcher
      console.log("Running arsenal analyses...");
      const newArsenalAnalyses = new Map();
      
      for (const [pitcherKey, pitcher] of uniquePitchers) {
        const opposingHitters = pitcherToOpposingHitters.get(pitcherKey) || [];
        console.log(`Analyzing arsenal for ${pitcher.name} vs ${opposingHitters.length} hitters`);
        
        const arsenalAnalysis = analyzeArsenalMatchup(
          pitcher, 
          opposingHitters, 
          hitterData, 
          pitcherData, 
          activeYears
        );
        
        newArsenalAnalyses.set(pitcherKey, arsenalAnalysis);
        if (arsenalAnalysis) {
          console.log(`Arsenal analysis complete for ${pitcher.name}: ${arsenalAnalysis.pitcher.arsenal.length} pitch types`);
        } else {
          console.log(`Arsenal analysis failed for ${pitcher.name}`);
        }
      }
      
      setArsenalAnalyses(newArsenalAnalyses);
      console.log("All arsenal analyses complete");
      
      // Process each matchup using enhanced analysis with HR analysis
      const results = await Promise.all(matchups.map(async matchup => {
        try {
          // Add null check here
          if (!matchup.pitcher || !matchup.batter) {
            console.error('Invalid matchup:', {
              pitcher: matchup.pitcher,
              batter: matchup.batter,
              pitcherKey: matchup.pitcherKey
            });
            return null;
          }
          
          const analysis = matchupAnalyzer.analyzeComprehensiveMatchup(matchup.batter, matchup.pitcher);
          
          // Add arsenal-specific insights to the result
          const arsenalAnalysis = newArsenalAnalyses.get(matchup.pitcherKey);
          let arsenalInsights = null;
          
          if (arsenalAnalysis) {
            const hitterArsenalAnalysis = arsenalAnalysis.hitters.find(h => h.hitter === matchup.batter.name);
            arsenalInsights = hitterArsenalAnalysis ? {
              overallAdvantage: hitterArsenalAnalysis.overallAssessment.overallAdvantage,
              keyStrengths: hitterArsenalAnalysis.overallAssessment.keyStrengths,
              keyWeaknesses: hitterArsenalAnalysis.overallAssessment.keyWeaknesses,
              pitchMatchups: hitterArsenalAnalysis.pitchMatchups,
              confidence: hitterArsenalAnalysis.confidence
            } : null;
          }
          
          // NEW: Run enhanced HR analysis
          let hrAnalysis = null;
          try {
            console.log(`Running HR analysis for ${matchup.batter.name} vs ${matchup.pitcher.name}`);
            hrAnalysis = await analyzeHRMatchup(
              matchup.batter,
              matchup.pitcher,
              dataService,
              {
                hitterCSV: hitterData,
                pitcherCSV: pitcherData,
                hitterExitVelo: exitVelocityData?.hitter || [],
                pitcherExitVelo: exitVelocityData?.pitcher || [],
                rosterData: normalizedRosterData,
                confidenceK: 100 // Adjust based on your needs
              }
            );
          } catch (error) {
            console.warn(`HR analysis failed for ${matchup.batter.name}:`, error);
          }
          
          return {
            ...matchup,
            result: analysis,
            arsenalInsights,
            hrAnalysis, // Add HR analysis to result
            explanation: generateEnhancedExplanation(analysis, matchup.batter, matchup.pitcher, arsenalInsights, hrAnalysis)
          };
        } catch (error) {
          console.error(`Error processing individual matchup:`, error);
          console.error('Matchup details:', matchup);
          return null;
        }
      }));
      
      // Filter out null results
      const validResults = results.filter(result => result !== null);
      setAnalysisResults(validResults);
      
    } catch (error) {
      console.error("Error analyzing matchups:", error);
      console.error("Analysis state:", {
        matchupsCount: matchups.length,
        normalizedRosterDataLength: normalizedRosterData.length,
        selectedGames: Object.keys(selectedGames).filter(k => selectedGames[k]),
        gamePitchers: Object.keys(gamePitchers)
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [matchupAnalyzer, arsenalAnalyzer, selectedGames, gamePitchers, gameData, getBattersForTeam, getPitcherById, activeYears, hitterData, pitcherData, exitVelocityData, normalizedRosterData, dataService]);

  // ENHANCED: Explanation generator with arsenal and HR insights
  const generateEnhancedExplanation = (analysis, batter, pitcher, arsenalInsights, hrAnalysis) => {
    const { advantageLabel, hitPotential, hrPotential, tbPotential, kPotential, details } = analysis;
    
    let explanation = `🎯 **${advantageLabel}**\n\n`;
    
    // Hit Analysis
    explanation += `**Hit Potential: ${hitPotential}**\n`;
    explanation += `• Predicted Batting Average: ${details.predictedBA}\n`;
    explanation += `• Expected hit rate: ${(parseFloat(details.predictedBA) * 100).toFixed(1)}%\n`;
    
    if (details.analysisBreakdown) {
      if (details.analysisBreakdown.handedness) {
        const handAdvantage = details.analysisBreakdown.handedness;
        if (handAdvantage > 0.3) {
          explanation += `• Handedness favors batter (${batter.bats || 'R'} vs ${pitcher.throwingArm || pitcher.ph || 'R'})\n`;
        } else if (handAdvantage < -0.3) {
          explanation += `• Handedness favors pitcher (${batter.bats || 'R'} vs ${pitcher.throwingArm || pitcher.ph || 'R'})\n`;
        }
      }
    }
    
    // Arsenal-specific insights
    if (arsenalInsights) {
      explanation += `\n🎨 **Arsenal Matchup Analysis:**\n`;
      explanation += `• Overall Arsenal Advantage: ${arsenalInsights.overallAdvantage > 0 ? 'Hitter' : 'Pitcher'} (+${arsenalInsights.overallAdvantage.toFixed(2)})\n`;
      
      if (arsenalInsights.keyStrengths.length > 0) {
        explanation += `• Strong vs: ${arsenalInsights.keyStrengths.map(s => s.pitch).join(', ')}\n`;
      }
      
      if (arsenalInsights.keyWeaknesses.length > 0) {
        explanation += `• Vulnerable to: ${arsenalInsights.keyWeaknesses.map(w => w.pitch).join(', ')}\n`;
      }
      
      explanation += `• Arsenal Analysis Confidence: ${(arsenalInsights.confidence * 100).toFixed(0)}%\n`;
    }
    
    // Enhanced HR Analysis
    if (hrAnalysis) {
      explanation += `\n💣 **Enhanced HR Analysis: ${hrAnalysis.potential}**\n`;
      explanation += `• Adjusted HR Rate: ${(hrAnalysis.metrics.adjustedHRRate * 100).toFixed(1)}%\n`;
      explanation += `• Expected: 1 HR every ${hrAnalysis.metrics.hrPerAB} at-bats\n`;
      explanation += `• Data Confidence: ${(hrAnalysis.confidence * 100).toFixed(0)}%\n`;
      
      if (hrAnalysis.insights.length > 0) {
        explanation += `• Key Insights:\n`;
        hrAnalysis.insights.forEach(insight => {
          explanation += `  - ${insight.message}\n`;
        });
      }
    } else {
      // Fallback to basic HR analysis
      explanation += `\n💣 **Home Run Potential: ${hrPotential}**\n`;
      explanation += `• Predicted HR Rate: ${(parseFloat(details.predictedHR) * 100).toFixed(1)}%\n`;
      explanation += `• Expects 1 HR every ~${Math.round(1 / parseFloat(details.predictedHR))} at-bats\n`;
    }
    
    explanation += `\n📊 **Total Bases Potential: ${tbPotential}**\n`;
    explanation += `• Predicted Slugging: ${details.predictedSLG}\n`;
    explanation += `• Predicted wOBA: ${details.predictedWOBA}\n`;
    
    explanation += `\n⚾ **Strikeout Risk: ${kPotential}**\n`;
    explanation += `• Predicted K Rate: ${(parseFloat(details.strikeoutRate) * 100).toFixed(1)}%\n`;
    
    // Arsenal information if available
    if (details.pitcherArsenal && details.pitcherArsenal.length > 0) {
      explanation += `\n🎨 **Pitcher Arsenal:**\n`;
      details.pitcherArsenal.slice(0, 3).forEach(pitch => {
        explanation += `• ${pitch.type}: ${pitch.avgSpeed.toFixed(1)} mph (${(pitch.usage * 100).toFixed(1)}% usage)\n`;
      });
    }
    
    explanation += `\n📈 **Analysis Quality:**\n`;
    explanation += `• Confidence Level: ${(details.confidence * 100).toFixed(0)}%\n`;
    explanation += `• Years Used: ${details.yearsUsed}\n`;
    
    if (details.analysisBreakdown) {
      const breakdown = details.analysisBreakdown;
      explanation += `• Analysis Components:\n`;
      if (breakdown.direct) explanation += `  - Direct matchup data\n`;
      if (breakdown.sameHanded) explanation += `  - Same-handed pitcher context\n`;
      if (breakdown.oppositeHanded) explanation += `  - Opposite-handed pitcher context\n`;
      if (breakdown.overall) explanation += `  - Overall league context\n`;
      if (breakdown.arsenal) explanation += `  - Pitcher arsenal analysis\n`;
    }
    
    return explanation;
  };

  const canRunAnalysis = () => {
    const hasSelectedGames = Object.values(selectedGames).some(isSelected => isSelected);
    const hasPitcherConfigured = Object.keys(gamePitchers).length > 0;
    
    return hasSelectedGames && hasPitcherConfigured && !isAnalyzing && !isLoadingRoster && !isLoadingCSV && activeYears.length > 0 && matchupAnalyzer && arsenalAnalyzer;
  };

  // Get the current sorted results
  const sortedResults = getSortedResults();
  const removedCount = removedResultIds.size;

  // Get sort direction indicator
  const getSortIcon = (column) => {
    if (sortConfig.key !== column) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const getAdvantageClass = (advantage) => {
    if (advantage > 2) return 'strong-advantage';
    if (advantage > 1) return 'medium-advantage';
    if (advantage > 0.3) return 'slight-advantage';
    if (advantage > -0.3) return 'neutral';
    if (advantage > -1) return 'slight-disadvantage';
    if (advantage > -2) return 'medium-disadvantage';
    return 'strong-disadvantage';
  };

  // Export results functionality
  const exportAnalysisResults = () => {
    const exportData = analysisResults.map(result => ({
      Game: result.game,
      Batter: result.batter.name,
      BatterTeam: result.batter.team,
      BatterHand: result.batter.bats,
      Pitcher: result.pitcher.name,
      PitcherTeam: result.pitcher.team,
      PitcherHand: result.pitcher.throwingArm || result.pitcher.ph,
      Advantage: result.result.advantage.toFixed(2),
      AdvantageLabel: result.result.advantageLabel,
      HitPotential: result.result.hitPotential,
      HRPotential: result.result.hrPotential,
      TBPotential: result.result.tbPotential,
      KPotential: result.result.kPotential,
      PredictedBA: result.result.details.predictedBA,
      PredictedHR: result.result.details.predictedHR,
      PredictedSLG: result.result.details.predictedSLG,
      PredictedWOBA: result.result.details.predictedWOBA,
      StrikeoutRate: result.result.details.strikeoutRate,
      Confidence: (result.result.details.confidence * 100).toFixed(0) + '%',
      YearsUsed: result.result.details.yearsUsed,
      // Arsenal analysis fields
      ArsenalAdvantage: result.arsenalInsights ? result.arsenalInsights.overallAdvantage.toFixed(3) : 'N/A',
      ArsenalConfidence: result.arsenalInsights ? (result.arsenalInsights.confidence * 100).toFixed(0) + '%' : 'N/A',
      KeyStrengths: result.arsenalInsights ? result.arsenalInsights.keyStrengths.map(s => s.pitch).join('; ') : 'N/A',
      KeyWeaknesses: result.arsenalInsights ? result.arsenalInsights.keyWeaknesses.map(w => w.pitch).join('; ') : 'N/A',
      // HR analysis fields
      HRAdjustedRate: result.hrAnalysis ? (result.hrAnalysis.metrics.adjustedHRRate * 100).toFixed(1) + '%' : 'N/A',
      HRDataConfidence: result.hrAnalysis ? (result.hrAnalysis.confidence * 100).toFixed(0) + '%' : 'N/A',
      HRTimeSinceLast: result.hrAnalysis && result.hrAnalysis.metrics.timeSinceLastHR ? 
        `${result.hrAnalysis.metrics.timeSinceLastHR.absSinceLastHR} ABs` : 'N/A'
    }));
    
    // Convert to CSV and download
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enhanced-matchup-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Year change handler with proper re-analysis
  const handleYearChange = (yearVal, isChecked) => {
    console.log(`Year change: ${yearVal}, checked: ${isChecked}`);
    
    if (isChecked) {
      setActiveYears(prev => {
        const newYears = _.uniq([...prev, yearVal]).sort((a,b) => b-a);
        console.log('Adding year:', yearVal, 'New years:', newYears);
        return newYears;
      });
    } else {
      if (activeYears.length > 1) { // Prevent unchecking all years
        setActiveYears(prev => {
          const newYears = prev.filter(y => y !== yearVal);
          console.log('Removing year:', yearVal, 'New years:', newYears);
          return newYears;
        });
      } else {
        console.log('Cannot remove last year - at least one year must be selected');
      }
    }
  };

  // Calculate filtered data counts for display
  const getFilteredDataCounts = () => {
    const filteredHitters = hitterData.filter(h => activeYears.includes(h.year));
    const filteredPitchers = pitcherData.filter(p => activeYears.includes(p.year));
    
    return {
      hitters: filteredHitters.length,
      pitchers: filteredPitchers.length
    };
  };

  const filteredCounts = getFilteredDataCounts();

  // Helper function to get arsenal analysis for a pitcher
  const getArsenalAnalysis = (pitcherKey) => {
    return arsenalAnalyses.get(pitcherKey);
  };

  // Helper function to get pitch effectiveness color
  const getPitchEffectivenessColor = (runValue) => {
    if (runValue < -2) return '#22c55e'; // Very effective (green)
    if (runValue < 0) return '#84cc16'; // Effective (light green)
    if (runValue < 2) return '#eab308'; // Neutral (yellow)
    if (runValue < 4) return '#f97316'; // Poor (orange)
    return '#ef4444'; // Very poor (red)
  };

  // Helper function to get advantage color for arsenal
  const getArsenalAdvantageColor = (advantage) => {
    if (advantage > 0.5) return '#22c55e'; // Strong hitter advantage
    if (advantage > 0.1) return '#84cc16'; // Hitter advantage
    if (advantage > -0.1) return '#eab308'; // Neutral
    if (advantage > -0.5) return '#f97316'; // Pitcher advantage
    return '#ef4444'; // Strong pitcher advantage
  };

  return (
    <div className="matchup-analyzer">
      <header className="analyzer-header">
        <h2>Enhanced Matchup Analyzer with Arsenal Analysis</h2>
        <p className="date">{formattedDate}</p>
        <div className="analyzer-status">
          {matchupAnalyzer && arsenalAnalyzer ? (
            <span className="status-ready">✅ Enhanced Analysis Ready (Active Players + Arsenal + HR Analysis)</span>
          ) : (
            <span className="status-loading">⏳ Loading Enhanced Analysis...</span>
          )}
        </div>
      </header>

      <section className="game-selection-section">
        <h3>Select Games & Configure Pitchers</h3>
        <div className="games-grid">
          {gameData.map((game, index) => (
            <div 
              key={index} 
              className={`game-card ${selectedGames[index] ? 'selected' : ''}`}
            >
              <div className="game-header">
                <span>{game.awayTeam} @ {game.homeTeam}</span>
                <button 
                  className="select-btn" 
                  onClick={() => handleGameSelect(index)}
                >
                  {selectedGames[index] ? 'Selected' : 'Select'}
                </button>
              </div>
              
              <div className="game-pitchers">
                <div className="team-pitcher">
                  <label>{game.awayTeam} Pitcher:</label>
                  <select 
                    value={gamePitchers[`${index}_${game.awayTeam}`] || ''}
                    onChange={(e) => handlePitcherSelect(index, game.awayTeam, e.target.value)}
                    disabled={!selectedGames[index] || isLoadingRoster}
                  >
                    <option value="">Select Pitcher</option>
                    {getPitchersForTeam(game.awayTeam).map(pitcher => (
                      <option key={pitcher.value} value={pitcher.value}>
                        {pitcher.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="team-pitcher">
                  <label>{game.homeTeam} Pitcher:</label>
                  <select 
                    value={gamePitchers[`${index}_${game.homeTeam}`] || ''}
                    onChange={(e) => handlePitcherSelect(index, game.homeTeam, e.target.value)}
                    disabled={!selectedGames[index] || isLoadingRoster}
                  >
                    <option value="">Select Pitcher</option>
                    {getPitchersForTeam(game.homeTeam).map(pitcher => (
                      <option key={pitcher.value} value={pitcher.value}>
                        {pitcher.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="analyzer-controls">
          <button 
            className="analyze-btn enhanced"
            onClick={runAnalysis}
            disabled={!canRunAnalysis()}
            title={!matchupAnalyzer || !arsenalAnalyzer ? "Enhanced analyzer loading..." : "Run comprehensive multi-dimensional analysis with arsenal breakdown and HR analysis"}
          >
            {isAnalyzing ? (
              <>
                <div className="spinner"></div>
                Analyzing Enhanced Matchups + Arsenal + HR...
              </>
            ) : (
              '🚀 Run Enhanced Analysis + Arsenal + HR'
            )}
          </button>
          <button className="clear-btn" onClick={resetSelections}>
            Clear All
          </button>
          {analysisResults.length > 0 && (
            <button className="export-btn" onClick={exportAnalysisResults}>
              📊 Export Results (with Arsenal + HR)
            </button>
          )}
        </div>
      </section>
      
      {analysisResults.length > 0 && (
        <section className="results-section">
          <div className="results-header">
            <h3>Enhanced Matchup Analysis Results with Arsenal & HR Analysis</h3>
            <div className="results-stats">
              <span className="total-results">
                {sortedResults.length} of {analysisResults.length} matchups shown
              </span>
              {removedCount > 0 && (
                <button 
                  className="restore-btn"
                  onClick={clearRemovedResults}
                  title="Restore all removed results"
                >
                  Restore {removedCount} removed
                </button>
              )}
            </div>
          </div>
          
          {/* Year Selection with proper change handling */}
          <div className="analysis-years-control enhanced">
            <div className="years-header">
              <span className="years-label">📊 Analysis Years (Successfully Loaded: {activeYears.join(', ')}):</span>
              <span className="data-summary">
                ({filteredCounts.hitters} hitter records, {filteredCounts.pitchers} pitcher records for selected years)
              </span>
            </div>
            <div className="year-checkboxes-inline">
              {DATA_YEARS.sort((a,b) => b-a).map(year => (
                <label key={year} className="year-checkbox-inline">
                  <input 
                    type="checkbox" 
                    className="form-checkbox"
                    value={year}
                    checked={activeYears.includes(year)}
                    onChange={(e) => handleYearChange(parseInt(e.target.value), e.target.checked)}
                    disabled={isLoadingCSV || isAnalyzing}
                  />
                  <span className="year-label-inline">{year}</span>
                </label>
              ))}
            </div>
            <div className="csv-status">
              {isLoadingCSV ? (
                <span className="loading-text">Loading CSV data...</span>
              ) : dataLoadError ? (
                <span className="error-text">{dataLoadError}</span>
              ) : (
                <span className="success-text">
                  ✅ Enhanced analysis ready - Arsenal & HR Analysis Integrated
                </span>
              )}
            </div>
          </div>
          
          <div className="enhanced-results-table-container">
            <table className="enhanced-results-table">
              <thead>
                <tr>
                  <th className="remove-column">Remove</th>
                  <th className="game-column">Game</th>
                  <th 
                    className="sortable-column player-column" 
                    onClick={() => handleSort('batter')}
                  >
                    Batter {getSortIcon('batter')}
                  </th>
                  <th 
                    className="sortable-column player-column" 
                    onClick={() => handleSort('pitcher')}
                  >
                    Pitcher {getSortIcon('pitcher')}
                  </th>
                  <th 
                    className="sortable-column advantage-column" 
                    onClick={() => handleSort('advantage')}
                  >
                    Advantage {getSortIcon('advantage')}
                  </th>
                  <th 
                    className="sortable-column potential-column" 
                    onClick={() => handleSort('hit')}
                  >
                    Hit {getSortIcon('hit')}
                  </th>
                  <th 
                    className="sortable-column potential-column" 
                    onClick={() => handleSort('hr')}
                  >
                    HR {getSortIcon('hr')}
                  </th>
                  <th 
                    className="sortable-column potential-column" 
                    onClick={() => handleSort('tb')}
                  >
                    TB {getSortIcon('tb')}
                  </th>
                  <th 
                    className="sortable-column potential-column" 
                    onClick={() => handleSort('k')}
                  >
                    K {getSortIcon('k')}
                  </th>
                  <th 
                    className="sortable-column confidence-column" 
                    onClick={() => handleSort('confidence')}
                  >
                    Confidence {getSortIcon('confidence')}
                  </th>
                  <th className="arsenal-column">Arsenal Analysis</th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((result) => (
                  <React.Fragment key={result.id}>
                    {/* Main data row */}
                    <tr className="result-row main-row">
                      <td className="remove-cell">
                        <button 
                          className="remove-result-btn"
                          onClick={() => removeResult(result.id)}
                          title="Remove this result"
                        >
                          ×
                        </button>
                      </td>
                      <td className="game-cell">
                        <span className="game-text">{result.game}</span>
                      </td>
                      <td className="player-cell">
                        <div className="player-info-compact">
                          <span className="player-name-compact">{result.batter.name}</span>
                          <div className="player-details-compact">
                            <span className="player-team-compact">{result.batter.team}</span>
                            {result.batter.bats && (
                              <span className="player-hand-compact">B: {result.batter.bats}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="player-cell">
                        <div className="player-info-compact">
                          <span className="player-name-compact">{result.pitcher.name}</span>
                          <div className="player-details-compact">
                            <span className="player-team-compact">{result.pitcher.team}</span>
                            {(result.pitcher.throwingArm || result.pitcher.ph) && (
                              <span className="player-hand-compact">
                                T: {result.pitcher.throwingArm || result.pitcher.ph}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={`advantage-cell-compact ${getAdvantageClass(result.result.advantage)}`}>
                        <div className="advantage-value-compact">
                          {result.result.advantage.toFixed(1)}
                        </div>
                        <div className="advantage-label-compact">{result.result.advantageLabel}</div>
                      </td>
                      <td className={`potential-cell-compact potential-${result.result.hitPotential.toLowerCase()}`}>
                        <div className="hit-potential-display">
                          <span className="hit-rating">{result.result.hitPotential}</span>
                          <span className="hit-percentage">
                            {result.result.details.predictedBA}
                          </span>
                        </div>
                      </td>
                      <td className={`potential-cell-compact potential-${(result.hrAnalysis?.potential || result.result.hrPotential).toLowerCase()}`}>
                        <div className="hr-potential-display">
                          <span className="hr-rating">{result.hrAnalysis?.potential || result.result.hrPotential}</span>
                          <span className="hr-percentage">
                            {(() => {
                              const hrRate = result.hrAnalysis?.metrics?.adjustedHRRate || 
                                           parseFloat(result.result.details.predictedHR);
                              return hrRate ? `${(hrRate * 100).toFixed(1)}%` : '';
                            })()}
                          </span>
                        </div>
                        {result.hrAnalysis && result.hrAnalysis.confidence < 0.3 && (
                          <span className="low-data-indicator" title={`Based on ${result.hrAnalysis.metrics.totalPA} PA`}>
                            ⚠️
                          </span>
                        )}
                      </td>
                      <td className={`potential-cell-compact potential-${result.result.tbPotential.toLowerCase()}`}>
                        <div className="tb-potential-display">
                          <span className="tb-rating">{result.result.tbPotential}</span>
                          <span className="tb-percentage">
                            {result.result.details.predictedSLG}
                          </span>
                        </div>
                      </td>
                      <td className={`potential-cell-compact potential-${result.result.kPotential.toLowerCase()}`}>
                        <div className="k-potential-display">
                          <span className="k-rating">{result.result.kPotential}</span>
                          <span className="k-percentage">
                            {(parseFloat(result.result.details.strikeoutRate) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="confidence-cell-compact">
                        {(() => {
                          const overallConfidence = calculateOverallConfidence(result);
                          const confidenceLevel = getConfidenceLevel(overallConfidence);
                          return (
                            <div className="confidence-display">
                              <div 
                                className="confidence-value"
                                style={{ color: confidenceLevel.color }}
                              >
                                {(overallConfidence * 100).toFixed(0)}%
                              </div>
                              <div className="confidence-label">{confidenceLevel.label}</div>
                              <div className="confidence-breakdown">
                                {result.result.details.confidence && (
                                  <div className="confidence-component" title="Analysis Quality">
                                    <span className="component-icon">📊</span>
                                    <span className="component-value">{(result.result.details.confidence * 100).toFixed(0)}%</span>
                                  </div>
                                )}
                                {result.hrAnalysis && (
                                  <div className="confidence-component" title="HR Confidence">
                                    <span className="component-icon">💣</span>
                                    <span className="component-value">{(result.hrAnalysis.confidence * 100).toFixed(0)}%</span>
                                  </div>
                                )}
                                {result.arsenalInsights && (
                                  <div className="confidence-component" title="Arsenal Confidence">
                                    <span className="component-icon">🎨</span>
                                    <span className="component-value">{(result.arsenalInsights.confidence * 100).toFixed(0)}%</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      {/* Arsenal Analysis Column */}
                      <td className="arsenal-cell-compact">
                        {result.arsenalInsights ? (
                          <div className="arsenal-insights-compact">
                            <div className="arsenal-advantage" 
                                 style={{ color: getArsenalAdvantageColor(result.arsenalInsights.overallAdvantage) }}>
                              {result.arsenalInsights.overallAdvantage > 0 ? '+' : ''}{result.arsenalInsights.overallAdvantage.toFixed(2)}
                            </div>
                            <div className="arsenal-details">
                              {result.arsenalInsights.keyStrengths.length > 0 && (
                                <div className="strengths">⚡ {result.arsenalInsights.keyStrengths.length}</div>
                              )}
                              {result.arsenalInsights.keyWeaknesses.length > 0 && (
                                <div className="weaknesses">🎯 {result.arsenalInsights.keyWeaknesses.length}</div>
                              )}
                            </div>
                            <div className="arsenal-confidence">
                              📊 {(result.arsenalInsights.confidence * 100).toFixed(0)}%
                            </div>
                          </div>
                        ) : (
                          <div className="no-arsenal">No arsenal data</div>
                        )}
                      </td>
                    </tr>
                    
                    {/* Enhanced Details row with Arsenal Breakdown and HR Analysis */}
                    <tr className="result-row details-row enhanced">
                      <td className="details-full-span" colSpan="11">
                        <div className="enhanced-analysis-breakdown">
                          <div className="breakdown-grid">
                            <div className="breakdown-card hit-analysis">
                              <div className="breakdown-header">
                                <span className="breakdown-icon">🎯</span>
                                <span className="breakdown-title">Hit Analysis: {result.result.hitPotential}</span>
                              </div>
                              <div className="breakdown-body">
                                <p>Predicted BA: <strong>{result.result.details.predictedBA}</strong></p>
                                <p>Hit Rate: <strong>{(parseFloat(result.result.details.predictedBA) * 100).toFixed(1)}%</strong></p>
                                {result.result.details.analysisBreakdown?.handedness && (
                                  <p className="handedness-note">
                                    Handedness: {result.result.details.analysisBreakdown.handedness > 0 ? '✅ Favors Batter' : '❌ Favors Pitcher'}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* Enhanced HR Analysis Card */}
                            <HRAnalysisCard 
                              result={result} 
                              hrAnalysis={result.hrAnalysis}
                            />
                            
                            <div className="breakdown-card power-analysis">
                              <div className="breakdown-header">
                                <span className="breakdown-icon">📊</span>
                                <span className="breakdown-title">Power: {result.result.tbPotential}</span>
                              </div>
                              <div className="breakdown-body">
                                <p>SLG: <strong>{result.result.details.predictedSLG}</strong></p>
                                <p>wOBA: <strong>{result.result.details.predictedWOBA}</strong></p>
                              </div>
                            </div>
                            
                            <div className="breakdown-card strikeout-analysis">
                              <div className="breakdown-header">
                                <span className="breakdown-icon">⚾</span>
                                <span className="breakdown-title">K Risk: {result.result.kPotential}</span>
                              </div>
                              <div className="breakdown-body">
                                <p>K Rate: <strong>{(parseFloat(result.result.details.strikeoutRate) * 100).toFixed(1)}%</strong></p>
                              </div>
                            </div>

                            {/* Arsenal Analysis Breakdown */}
                            {result.arsenalInsights && (
                              <>
                                <div className="breakdown-card arsenal-overall">
                                  <div className="breakdown-header">
                                    <span className="breakdown-icon">🎨</span>
                                    <span className="breakdown-title">Arsenal Matchup</span>
                                  </div>
                                  <div className="breakdown-body">
                                    <p>Overall Advantage: <strong 
                                       style={{ color: getArsenalAdvantageColor(result.arsenalInsights.overallAdvantage) }}>
                                      {result.arsenalInsights.overallAdvantage > 0 ? 'Hitter +' : 'Pitcher +'}
                                      {Math.abs(result.arsenalInsights.overallAdvantage).toFixed(2)}
                                    </strong></p>
                                    <p>Confidence: <strong>{(result.arsenalInsights.confidence * 100).toFixed(0)}%</strong></p>
                                  </div>
                                </div>

                                {result.arsenalInsights.keyStrengths.length > 0 && (
                                  <div className="breakdown-card arsenal-strengths">
                                    <div className="breakdown-header">
                                      <span className="breakdown-icon">⚡</span>
                                      <span className="breakdown-title">Key Strengths</span>
                                    </div>
                                    <div className="breakdown-body">
                                      {result.arsenalInsights.keyStrengths.map((strength, idx) => (
                                        <p key={idx}>
                                          <strong>{strength.pitch}:</strong> +{strength.advantage.toFixed(2)} advantage
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {result.arsenalInsights.keyWeaknesses.length > 0 && (
                                  <div className="breakdown-card arsenal-weaknesses">
                                    <div className="breakdown-header">
                                      <span className="breakdown-icon">🎯</span>
                                      <span className="breakdown-title">Key Weaknesses</span>
                                    </div>
                                    <div className="breakdown-body">
                                      {result.arsenalInsights.keyWeaknesses.map((weakness, idx) => (
                                        <p key={idx}>
                                          <strong>{weakness.pitch}:</strong> -{weakness.disadvantage.toFixed(2)} disadvantage
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                            
                            {result.result.details.pitcherArsenal && result.result.details.pitcherArsenal.length > 0 && (
                              <div className="breakdown-card arsenal-analysis">
                                <div className="breakdown-header">
                                  <span className="breakdown-icon">🎨</span>
                                  <span className="breakdown-title">Pitcher Arsenal</span>
                                </div>
                                <div className="breakdown-body">
                                  {result.result.details.pitcherArsenal.slice(0, 3).map((pitch, index) => (
                                    <p key={index}>
                                      <strong>{pitch.type}:</strong> {pitch.avgSpeed.toFixed(1)} mph ({(pitch.usage * 100).toFixed(1)}%)
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="breakdown-card confidence-analysis">
                              <div className="breakdown-header">
                                <span className="breakdown-icon">📈</span>
                                <span className="breakdown-title">Analysis Quality</span>
                              </div>
                              <div className="breakdown-body">
                                <p>Overall Confidence: <strong>{(result.result.details.confidence * 100).toFixed(0)}%</strong></p>
                                <p>Years: <strong>{result.result.details.yearsUsed}</strong></p>
                                {result.result.details.analysisBreakdown && (
                                  <div className="analysis-components">
                                    <p><strong>Components Used:</strong></p>
                                    <ul>
                                      {result.result.details.analysisBreakdown.direct && <li>✅ Direct matchup</li>}
                                      {result.result.details.analysisBreakdown.sameHanded && <li>✅ Same-handed context</li>}
                                      {result.result.details.analysisBreakdown.oppositeHanded && <li>✅ Opposite-handed context</li>}
                                      {result.result.details.analysisBreakdown.overall && <li>✅ League context</li>}
                                      {result.result.details.analysisBreakdown.arsenal && <li>✅ Arsenal analysis</li>}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Detailed Pitch-by-Pitch Arsenal Breakdown */}
                          {result.arsenalInsights && result.arsenalInsights.pitchMatchups && (
                            <div className="pitch-by-pitch-breakdown">
                              <div className="pitch-breakdown-header">
                                <h4>🎯 Pitch-by-Pitch Arsenal Analysis</h4>
                                <button 
                                  className="toggle-arsenal-btn"
                                  onClick={() => toggleArsenalExpansion(`${result.pitcher.name}-${result.pitcher.team}-${result.batter.name}`)}
                                >
                                  {expandedArsenal.has(`${result.pitcher.name}-${result.pitcher.team}-${result.batter.name}`) ? '▼ Hide Details' : '▶ Show Details'}
                                </button>
                              </div>
                              
                              {expandedArsenal.has(`${result.pitcher.name}-${result.pitcher.team}-${result.batter.name}`) && (
                                <div className="pitch-matchups-grid">
                                  {result.arsenalInsights.pitchMatchups.map((pitchMatchup, idx) => (
                                    <div key={idx} className="pitch-matchup-card">
                                      <div className="pitch-matchup-header">
                                        <span className="pitch-name">{pitchMatchup.pitchName}</span>
                                        <span className="pitch-usage">{(pitchMatchup.pitcherUsage * 100).toFixed(1)}%</span>
                                      </div>
                                      <div className="pitch-matchup-stats">
                                        <div className="matchup-advantage" 
                                             style={{ color: getArsenalAdvantageColor(pitchMatchup.matchupAdvantage) }}>
                                          {pitchMatchup.matchupAdvantage > 0 ? '+' : ''}{pitchMatchup.matchupAdvantage.toFixed(2)}
                                        </div>
                                        {pitchMatchup.hitterPerformance && (
                                          <div className="performance-details">
                                            <div>BA: {pitchMatchup.hitterPerformance.ba.toFixed(3)}</div>
                                            <div>wOBA: {pitchMatchup.hitterPerformance.woba.toFixed(3)}</div>
                                          </div>
                                        )}
                                        <div className="recommendation">
                                          {pitchMatchup.recommendation === 'strong_hitter_advantage' && '🔥 Strong Target'}
                                          {pitchMatchup.recommendation === 'hitter_advantage' && '⚡ Good Matchup'}
                                          {pitchMatchup.recommendation === 'neutral' && '➡️ Neutral'}
                                          {pitchMatchup.recommendation === 'pitcher_advantage' && '🎯 Tough Pitch'}
                                          {pitchMatchup.recommendation === 'strong_pitcher_advantage' && '⚠️ Avoid'}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      
      {/* Enhanced Analysis Info Panel */}
      <section className="analysis-info-panel">
        <h3>🚀 ENHANCED Arsenal & HR Analysis Features</h3>
        <div className="info-grid">
          <div className="info-card">
            <h4>🎯 Pitcher Arsenal Analysis</h4>
            <ul>
              <li>Complete pitch repertoire breakdown</li>
              <li>Usage rates and effectiveness metrics</li>
              <li>Year-over-year pitch development trends</li>
              <li>Pitch-specific wOBA, whiff%, and K rates</li>
            </ul>
          </div>
          <div className="info-card">
            <h4>💣 Enhanced HR Analysis</h4>
            <ul>
              <li>Confidence-adjusted HR predictions</li>
              <li>Time since last HR tracking</li>
              <li>Exit velocity matchup analysis</li>
              <li>Arsenal vulnerability detection</li>
              <li>2024 vs 2025 power trends</li>
            </ul>
          </div>
          <div className="info-card">
            <h4>📊 Data Quality Indicators</h4>
            <ul>
              <li>PA-based confidence scores</li>
              <li>Low data warnings (less than 50 PA)</li>
              <li>Raw vs adjusted stat comparisons</li>
              <li>Multi-year trend analysis</li>
            </ul>
          </div>
          <div className="info-card">
            <h4>⚖️ Comprehensive Integration</h4>
            <ul>
              <li>Arsenal + HR + Matchup analysis</li>
              <li>Home/away split consideration</li>
              <li>"Due for HR" calculations</li>
              <li>Export with all enhanced metrics</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

export default MatchupAnalyzer;