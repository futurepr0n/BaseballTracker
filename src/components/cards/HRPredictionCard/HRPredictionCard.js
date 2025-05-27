import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import './HRPredictionCard.css';

/**
 * Enhanced HR Prediction Card with betting odds integration
 */
const HRPredictionCard = ({ playersWithHomeRunPrediction, isLoading, teams }) => {
  const [oddsData, setOddsData] = useState(new Map());
  const [oddsLoading, setOddsLoading] = useState(true);
  const [oddsError, setOddsError] = useState(null);

  // Load odds data from CSV file
  useEffect(() => {
    const loadOddsData = async () => {
      try {
        setOddsLoading(true);
        setOddsError(null);

        console.log('[HRPredictionCard] Loading odds data...');

        // Try to load the HR-only CSV first (cleaner format)
        let response = await fetch('/data/odds/mlb-hr-odds-only.csv');
        let dataSource = 'HR-only file';
        
        // If HR-only file doesn't exist, try the full file
        if (!response.ok) {
          console.log('[HRPredictionCard] HR-only file not found, trying full file...');
          response = await fetch('/data/odds/mlb-hr-odds.csv');
          dataSource = 'Full file';
        }

        if (!response.ok) {
          console.warn('[HRPredictionCard] No odds data file found');
          console.log('[HRPredictionCard] Tried URLs:');
          console.log('  - /data/odds/mlb-hr-odds-only.csv');
          console.log('  - /data/odds/mlb-hr-odds.csv');
          setOddsData(new Map());
          setOddsError('Odds file not found');
          return;
        }

        console.log(`[HRPredictionCard] Loading odds from ${dataSource}`);
        const csvText = await response.text();
        console.log(`[HRPredictionCard] CSV content length: ${csvText.length} characters`);
        
        // Show first few lines of CSV for debugging
        const lines = csvText.split('\n').slice(0, 3);
        console.log('[HRPredictionCard] First few lines of CSV:', lines);
        
        // Parse CSV data
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log(`[HRPredictionCard] Parsed ${results.data.length} rows from CSV`);
            
            const oddsMap = new Map();
            let processedCount = 0;
            
            results.data.forEach((row, index) => {
              const playerName = row.player_name?.trim();
              const odds = row.odds?.trim();
              const propType = row.prop_type?.trim();
              
              // Debug first few rows
              if (index < 3) {
                console.log(`[HRPredictionCard] Row ${index}:`, {
                  player_name: playerName,
                  odds: odds,
                  prop_type: propType
                });
              }
              
              // Only process Home Runs odds (if using full CSV)
              // Or process all rows (if using HR-only CSV)
              if (playerName && odds && (!propType || propType === 'Home Runs')) {
                processedCount++;
                
                // Create comprehensive name variations for better matching
                const nameVariations = [
                  playerName,
                  playerName.toLowerCase(),
                  // Handle Jr./Sr. variations
                  playerName.replace(' Jr.', '').replace(' Sr.', ''),
                  // Handle common nickname patterns
                  playerName.replace(/\./g, ''),
                ];

                // CRITICAL: Create shortened versions (First Initial + Last Name)
                const nameParts = playerName.trim().split(' ');
                if (nameParts.length >= 2) {
                  const firstName = nameParts[0];
                  const lastName = nameParts[nameParts.length - 1];
                  
                  // Add shortened versions
                  nameVariations.push(`${firstName.charAt(0)}. ${lastName}`);  // "N. Hoerner"
                  nameVariations.push(`${firstName.charAt(0)} ${lastName}`);   // "N Hoerner"
                  nameVariations.push(`${firstName.charAt(0).toLowerCase()}. ${lastName.toLowerCase()}`); // "n. hoerner"
                  nameVariations.push(`${firstName.charAt(0).toLowerCase()} ${lastName.toLowerCase()}`);  // "n hoerner"
                  
                  // Handle middle names/multiple first names
                  if (nameParts.length === 3) {
                    const middleName = nameParts[1];
                    nameVariations.push(`${firstName.charAt(0)}. ${middleName} ${lastName}`);
                    nameVariations.push(`${firstName.charAt(0)} ${middleName} ${lastName}`);
                  }
                }

                // Store all variations
                nameVariations.forEach(variation => {
                  if (variation && variation.trim()) {
                    oddsMap.set(variation.trim(), {
                      odds: odds,
                      originalName: playerName,
                      lastUpdated: row.last_updated
                    });
                  }
                });
                
                // Debug name variations for first few players
                if (index < 3) {
                  console.log(`[HRPredictionCard] Name variations for "${playerName}":`, nameVariations);
                }
              }
            });
            
            console.log(`[HRPredictionCard] Processed ${processedCount} HR odds entries`);
            console.log(`[HRPredictionCard] Created ${oddsMap.size} total name variations`);
            
            // Show some sample entries with shortened names
            const sampleEntries = Array.from(oddsMap.entries())
              .filter(([key, value]) => key.includes('.') || key.length < value.originalName.length)
              .slice(0, 10);
            console.log('[HRPredictionCard] Sample shortened name entries:', sampleEntries);
            
            setOddsData(oddsMap);
          },
          error: (error) => {
            console.error('[HRPredictionCard] Error parsing odds CSV:', error);
            setOddsError('Failed to parse odds data');
            setOddsData(new Map());
          }
        });

      } catch (error) {
        console.error('[HRPredictionCard] Error loading odds data:', error);
        setOddsError('Failed to load odds data');
        setOddsData(new Map());
      } finally {
        setOddsLoading(false);
      }
    };

    loadOddsData();
  }, []);

  // Function to find odds for a player
  const getPlayerOdds = (playerName) => {
    if (!playerName || oddsData.size === 0) {
      return null;
    }
    
    console.log(`[HRPredictionCard] Looking for odds for: "${playerName}"`);
    
    // Create all possible variations of the search name
    const searchVariations = [
      playerName,
      playerName.toLowerCase(),
      playerName.replace(' Jr.', '').replace(' Sr.', ''),
      playerName.replace(/\./g, ''),
      playerName.replace(/\./g, '').toLowerCase()
    ];
    
    // Try each variation
    for (const variation of searchVariations) {
      const odds = oddsData.get(variation);
      if (odds) {
        console.log(`[HRPredictionCard] ✅ Found match for: "${playerName}" using variation: "${variation}" -> ${odds.odds} (original: "${odds.originalName}")`);
        return odds;
      }
    }
    
    // If no exact matches, show what names are available for debugging
    if (playerName === "N. Hoerner" || playerName === "K. Tucker" || playerName === "P. Alonso") {
      console.log(`[HRPredictionCard] 🔍 Debug for "${playerName}" - checking available names starting with same letter:`);
      const firstLetter = playerName.charAt(0).toLowerCase();
      const availableNames = Array.from(oddsData.keys())
        .filter(name => name.toLowerCase().startsWith(firstLetter))
        .slice(0, 10);
      console.log(`[HRPredictionCard] Available names starting with "${firstLetter}":`, availableNames);
    }
    
    console.log(`[HRPredictionCard] ❌ No odds found for: "${playerName}"`);
    return null;
  };

  // Function to format odds display
  const formatOdds = (odds) => {
    if (!odds) return null;
    
    // Ensure odds start with + or -
    if (!odds.startsWith('+') && !odds.startsWith('-')) {
      return `+${odds}`;
    }
    
    return odds;
  };

  // Function to get odds color based on value
  const getOddsColor = (odds) => {
    if (!odds) return '#666';
    
    const numericOdds = parseInt(odds.replace('+', '').replace('-', ''));
    
    if (odds.startsWith('-') || numericOdds <= 200) {
      return '#d4282d'; // Red for favorites/low odds
    } else if (numericOdds <= 400) {
      return '#f57c00'; // Orange for moderate odds
    } else {
      return '#2e7d32'; // Green for long shots
    }
  };

  if (isLoading) {
    return (
      <div className="card hr-prediction">
        <h3>🎯 Home Run Predictions</h3>
        <div className="loading-indicator">Loading predictions...</div>
      </div>
    );
  }

  if (!playersWithHomeRunPrediction || playersWithHomeRunPrediction.length === 0) {
    return (
      <div className="card hr-prediction">
        <h3>🎯 Home Run Predictions</h3>
        <div className="no-data">No HR prediction data available</div>
      </div>
    );
  }

  return (
    <div className="card hr-prediction">
      <div className="card-header">
        <h3>🎯 Home Run Predictions</h3>
        {oddsLoading && (
          <div className="odds-loading">Loading odds...</div>
        )}
        {oddsError && (
          <div className="odds-error">⚠️ {oddsError}</div>
        )}
        {!oddsLoading && !oddsError && oddsData.size > 0 && (
          <div className="odds-info">📊 Live odds included</div>
        )}
      </div>

      <div className="scrollable-container">
        <ul className="player-list">
          {playersWithHomeRunPrediction.slice(0, 25).map((player, index) => {
            const team = teams[player.team];
            const playerOdds = getPlayerOdds(player.name);
            const formattedOdds = formatOdds(playerOdds?.odds);
            const oddsColor = getOddsColor(playerOdds?.odds);

            return (
              <li key={`${player.name}_${player.team}_${index}`} className="player-item">
                {/* Team logo background */}
                {team?.logoUrl && (
                  <img 
                    src={team.logoUrl} 
                    alt={team.name} 
                    className="team-logo-bg"
                  />
                )}
                
                {/* Rank circle with team colors */}
                <div 
                  className="player-rank" 
                  style={{ 
                    backgroundColor: team?.primaryColor || '#0056b3',
                    color: 'white'
                  }}
                >
                  <img 
                    src={team?.logoUrl} 
                    alt={team?.name} 
                    className="rank-logo"
                  />
                  <div className="rank-overlay" style={{ backgroundColor: team?.primaryColor || '#0056b3' }}></div>
                  <span className="rank-number">{index + 1}</span>
                </div>
                
                <div className="player-info">
                  <div className="player-name">{player.fullName || player.name}</div>
                  <div className="player-team-odds">
                    <span className="player-team">{team?.abbreviation || player.team}</span>
                    {formattedOdds && (
                      <>
                        <span className="odds-separator">•</span>
                        <span 
                          className="player-odds"
                          style={{ color: oddsColor }}
                          title={`Betting odds for ${player.name} to hit a home run`}
                        >
                          {formattedOdds}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="player-stat">
                  <span className="hr-deficit">
                    {player.gamesSinceLastHR === 0 ? 'Hit HR last game' : 
                     `${player.gamesSinceLastHR} games since HR`}
                  </span>
                  <div className="hr-detail">
                    {player.homeRunsThisSeason || 0} HRs this season
                    {player.daysSinceLastHR > 0 && (
                      <span className="days-since">
                        {player.daysSinceLastHR === 1 ? '1 day ago' : `${player.daysSinceLastHR} days ago`}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {oddsData.size > 0 && (
        <div className="odds-footer">
          <small>
            Odds provided by DraftKings • Last updated: {
              Array.from(oddsData.values())[0]?.lastUpdated ? 
                new Date(Array.from(oddsData.values())[0].lastUpdated).toLocaleTimeString() : 
                'Unknown'
            }
          </small>
        </div>
      )}
    </div>
  );
};

export default HRPredictionCard;