// src/components/CapSheet/utils/exportImport.js
import { formatDateForFilename } from './formatters';

/**
 * Export player data to CSV
 * @param {Object} selectedPlayers - Object containing hitters and pitchers arrays
 * @param {Array} handicappers - Array of handicapper objects
 * @returns {void}
 */
export const exportToCSV = (selectedPlayers, handicappers = []) => {
  let csvContent = "data:text/csv;charset=utf-8,";
  
  // Hitters
  if (selectedPlayers.hitters && selectedPlayers.hitters.length > 0) {
    csvContent += "HITTERS\n";
    // Enhanced header to include handedness data
    csvContent += "Player,Team,Bats,Full Name,Last HR,Last AB,Last H,Game 1 Date,Game 1 HR,Game 1 AB,Game 1 H,Game 2 Date,Game 2 HR,Game 2 AB,Game 2 H,Game 3 Date,Game 3 HR,Game 3 AB,Game 3 H,Pitcher,Pitcher ID,Opponent Team,Throws,Exp SO,Stadium,Game O/U,Bet H,Bet HR,Bet B\n";
    selectedPlayers.hitters.forEach(p => {
      const row = [
        `"${p.name?.replace(/"/g, '""') || ''}"`, p.team || '', 
        p.bats || '', // Include handedness data
        `"${p.fullName?.replace(/"/g, '""') || p.name || ''}"`, // Include full name
        p.prevGameHR || '', p.prevGameAB || '', p.prevGameH || '',
        p.game1Date || '', p.game1HR || '', p.game1AB || '', p.game1H || '',
        p.game2Date || '', p.game2HR || '', p.game2AB || '', p.game2H || '',
        p.game3Date || '', p.game3HR || '', p.game3AB || '', p.game3H || '',
        `"${(p.pitcher || '').replace(/"/g, '""')}"`, 
        p.pitcherId || '', 
        p.opponentTeam || '', 
        p.pitcherHand || '', p.expectedSO || '',
        `"${(p.stadium || '').replace(/"/g, '""')}"`, p.gameOU || '', 
        p.betTypes?.H ? "Yes" : "No", p.betTypes?.HR ? "Yes" : "No", p.betTypes?.B ? "Yes" : "No"
      ];
      csvContent += row.join(",") + "\n";
    });
    csvContent += "\n";
  }
  
  // Pitchers
  if (selectedPlayers.pitchers && selectedPlayers.pitchers.length > 0) {
    csvContent += "PITCHERS\n";
    // Enhanced header to include handedness data
    csvContent += "Player,Team,Throws,Full Name,Last IP,Last K,Last ER,Game 1 Date,Game 1 IP,Game 1 K,Game 1 ER,Game 2 Date,Game 2 IP,Game 2 K,Game 2 ER,Game 3 Date,Game 3 IP,Game 3 K,Game 3 ER,Opponent,Pitch Count,Exp K,Stadium,Game O/U,Bet K,Bet O/U\n";
    selectedPlayers.pitchers.forEach(p => {
      const row = [
        `"${p.name?.replace(/"/g, '""') || ''}"`, p.team || '', 
        p.throwingArm || '', // Include handedness data
        `"${p.fullName?.replace(/"/g, '""') || p.name || ''}"`, // Include full name
        p.prevGameIP || '', p.prevGameK || '', p.prevGameER || '',
        p.game1Date || '', p.game1IP || '', p.game1K || '', p.game1ER || '',
        p.game2Date || '', p.game2IP || '', p.game2K || '', p.game2ER || '',
        p.game3Date || '', p.game3IP || '', p.game3K || '', p.game3ER || '',
        `"${(p.opponent || '').replace(/"/g, '""')}"`, p.expectedPitch || '', p.expectedK || '',
        `"${(p.stadium || '').replace(/"/g, '""')}"`, p.gameOU || '', 
        p.betTypes?.K ? "Yes" : "No", p.betTypes?.OU ? "Yes" : "No"
      ];
      csvContent += row.join(",") + "\n";
    });
    csvContent += "\n";
  }
  
  // Handicapper Picks - only add this section if we have handicappers
  if (handicappers?.length > 0 && 
      ((selectedPlayers.hitters?.length > 0) || 
       (selectedPlayers.pitchers?.length > 0))) {
    
    csvContent += "HANDICAPPER PICKS\n";
    csvContent += "Handicapper ID,Handicapper Name,Player Name,Player Team,Player Type,Public,Private,Straight,Bet Type H,Bet Type HR,Bet Type B,Bet Type K,Bet Type OU\n";

    // Create a list to store all handicapper names for reference
    const allHandicapperNames = {};
    handicappers.forEach(h => {
      allHandicapperNames[h.id] = h.name;
    });

    const addPicksToCSV = (player, playerType) => {
      if (!player.handicapperPicks) return;
      
      Object.entries(player.handicapperPicks).forEach(([handicapperId, pick]) => {
        // Only include rows where there is at least one pick
        if (pick && (pick.public || pick.private || pick.straight || 
            pick.H || pick.HR || pick.B || pick.K || pick.OU)) {
          
          const handicapper = handicappers.find(h => h.id === handicapperId);
          const row = [
            handicapperId,
            `"${(handicapper?.name || allHandicapperNames[handicapperId] || handicapperId).replace(/"/g, '""')}"`,
            `"${player.name.replace(/"/g, '""')}"`,
            player.team,
            playerType,
            pick.public ? "Yes" : "No",
            pick.private ? "Yes" : "No",
            pick.straight ? "Yes" : "No",
            pick.H ? "Yes" : "No",
            pick.HR ? "Yes" : "No",
            pick.B ? "Yes" : "No",
            pick.K ? "Yes" : "No",
            pick.OU ? "Yes" : "No"
          ];
          csvContent += row.join(",") + "\n";
          
          // Store the handicapper name for potential import
          if (handicapper && handicapper.name) {
            allHandicapperNames[handicapperId] = handicapper.name;
          }
        }
      });
    };
    
    if (selectedPlayers.hitters) {
      selectedPlayers.hitters.forEach(p => addPicksToCSV(p, 'Hitter'));
    }
    if (selectedPlayers.pitchers) {
      selectedPlayers.pitchers.forEach(p => addPicksToCSV(p, 'Pitcher'));
    }
    
    // Also export the handicapper names section for better import
    csvContent += "\nHANDICAPPER NAMES\n";
    csvContent += "Handicapper ID,Handicapper Name\n";
    Object.entries(allHandicapperNames).forEach(([id, name]) => {
      csvContent += `${id},"${name?.replace(/"/g, '""')}"\n`;
    });
  }

  // Add date information to the CSV
  csvContent += "\nEXPORT INFO\n";
  csvContent += "Export Date," + new Date().toISOString() + "\n";
  csvContent += "Target Date," + formatDateForFilename(new Date()) + "\n";

  // Trigger download
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `capsheet_${formatDateForFilename(new Date())}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Parse CSV content from imported file with improved error handling and CSV parsing
 * Enhanced with roster data integration to preserve handedness information
 * @param {string} content - CSV file content
 * @param {Array} rosterData - Optional roster data for player enhancement
 * @returns {Object|null} Parsed player data or null if error
 */
export const parseImportedCSV = async (content, rosterData = []) => {
  try {
    console.log("[Import] Starting CSV parsing");
    
    // First, check if content exists and is not empty
    if (!content || content.trim() === '') {
      console.error("[Import] CSV content is empty");
      return null;
    }
    
    // Split content into lines and remove empty ones
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
    console.log(`[Import] Found ${lines.length} non-empty lines in CSV`);
    
    // Basic validation - check for required headers
    if (!lines.some(line => line === 'HITTERS' || line === 'PITCHERS')) {
      console.error("[Import] CSV missing required section headers (HITTERS or PITCHERS)");
      return null;
    }
    
    let currentSection = '';
    const importedHitters = [];
    const importedPitchers = [];
    const importedPicks = {}; // Store picks temporarily
    let exportInfo = {}; // Store export metadata
    const handicapperNames = {}; // Store handicapper names for reference
    
    let headerMap = {};
    
    // Parse CSV with improved handling for quoted fields
    const parseCSVLine = (line) => {
      const values = [];
      let inQuotes = false;
      let currentValue = '';
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && i < line.length - 1 && line[i + 1] === '"') {
            // Handle escaped quotes (two quotes together)
            currentValue += '"';
            i++; // Skip the next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          values.push(currentValue);
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      
      // Add the last value
      values.push(currentValue);
      
      return values;
    };
    
    // Process each line
    lines.forEach((line, index) => {
      // Detect section headers
      if (line === 'HITTERS') { 
        console.log("[Import] Found HITTERS section");
        currentSection = 'hitters'; 
        headerMap = {}; 
        return; 
      }
      if (line === 'PITCHERS') { 
        console.log("[Import] Found PITCHERS section");
        currentSection = 'pitchers'; 
        headerMap = {}; 
        return; 
      }
      if (line === 'HANDICAPPER PICKS') { 
        console.log("[Import] Found HANDICAPPER PICKS section");
        currentSection = 'picks'; 
        headerMap = {}; 
        return; 
      }
      if (line === 'HANDICAPPER NAMES') { 
        console.log("[Import] Found HANDICAPPER NAMES section");
        currentSection = 'handicappers'; 
        headerMap = {}; 
        return; 
      }
      if (line === 'EXPORT INFO') { 
        console.log("[Import] Found EXPORT INFO section");
        currentSection = 'info'; 
        headerMap = {}; 
        return; 
      }
      
      // Skip empty lines
      if (!line) return;
      
      // Skip lines in unrecognized sections
      if (!currentSection) return;
      
      try {
        // Process header row
        if (Object.keys(headerMap).length === 0) {
          try {
            // For simple header parsing, we'll use the split method
            // This is less likely to cause issues with headers
            const headers = line.split(',').map(h => h.trim());
            headers.forEach((h, i) => { headerMap[h] = i; });
            console.log(`[Import] Detected ${currentSection} headers:`, headerMap);
            return; // Skip processing the header row itself
          } catch (err) {
            console.error(`[Import] Error parsing header for ${currentSection}:`, err);
            return;
          }
        }
        
        // Process data rows based on section
        // For data rows, use the more robust parsing
        let values;
        try {
          values = parseCSVLine(line);
        } catch (err) {
          console.error(`[Import] Error parsing line ${index}, falling back to simple split:`, err);
          values = line.split(','); // Fallback to simple split
        }
        
        if (currentSection === 'hitters' && headerMap['Player'] !== undefined) {
          const playerIndex = headerMap['Player'];
          const teamIndex = headerMap['Team'];
          
          if (playerIndex === undefined || teamIndex === undefined || 
              !values[playerIndex] || !values[teamIndex]) {
            console.warn(`[Import] Skipping invalid hitter row at line ${index}`);
            return;
          }
          
          // Extract player name, removing quotes if present
          const name = values[playerIndex].replace(/^"|"$/g, '');
          const team = values[teamIndex];
          
          // Create basic hitter object
          const hitter = {
            id: `${name}-${team}`,
            name,
            team,
            playerType: 'hitter',
            handicapperPicks: {}
          };
          
          // Map all possible fields from CSV including handedness
          const fieldMappings = {
            'Bats': 'bats', // Handedness data
            'Full Name': 'fullName', // Full name data
            'Last HR': 'prevGameHR',
            'Last AB': 'prevGameAB', 
            'Last H': 'prevGameH',
            'Game 1 Date': 'game1Date',
            'Game 1 HR': 'game1HR',
            'Game 1 AB': 'game1AB',
            'Game 1 H': 'game1H',
            'Game 2 Date': 'game2Date',
            'Game 2 HR': 'game2HR',
            'Game 2 AB': 'game2AB',
            'Game 2 H': 'game2H',
            'Game 3 Date': 'game3Date',
            'Game 3 HR': 'game3HR',
            'Game 3 AB': 'game3AB',
            'Game 3 H': 'game3H',
            'Pitcher': 'pitcher',
            'Pitcher ID': 'pitcherId',
            'Opponent Team': 'opponentTeam',
            'Throws': 'pitcherHand',
            'Exp SO': 'expectedSO',
            'Stadium': 'stadium',
            'Game O/U': 'gameOU'
          };
          
          // Add each field that exists in the CSV
          Object.entries(fieldMappings).forEach(([csvField, objectField]) => {
            if (headerMap[csvField] !== undefined) {
              const value = values[headerMap[csvField]];
              if (value !== undefined) {
                // Special handling for text fields with quotes
                if (csvField === 'Pitcher' || csvField === 'Stadium' || csvField === 'Full Name') {
                  hitter[objectField] = value.replace(/^"|"$/g, '') || '';
                } else {
                  hitter[objectField] = value || '';
                }
              }
            }
          });
          
          // Handle bet types
          hitter.betTypes = {
            H: values[headerMap['Bet H']] === 'Yes',
            HR: values[headerMap['Bet HR']] === 'Yes',
            B: values[headerMap['Bet B']] === 'Yes'
          };
          
          importedHitters.push(hitter);
          console.log(`[Import] Added hitter: ${name} (${team})`);
        }
        else if (currentSection === 'pitchers' && headerMap['Player'] !== undefined) {
          const playerIndex = headerMap['Player'];
          const teamIndex = headerMap['Team']; 
          
          if (playerIndex === undefined || teamIndex === undefined || 
              !values[playerIndex] || !values[teamIndex]) {
            console.warn(`[Import] Skipping invalid pitcher row at line ${index}`);
            return;
          }
          
          // Extract player name, removing quotes if present
          const name = values[playerIndex].replace(/^"|"$/g, '');
          const team = values[teamIndex];
          
          // Create basic pitcher object
          const pitcher = {
            id: `${name}-${team}`,
            name,
            team,
            playerType: 'pitcher',
            handicapperPicks: {}
          };
          
          // Map fields from CSV including handedness
          const fieldMappings = {
            'Throws': 'throwingArm', // Handedness data
            'Full Name': 'fullName', // Full name data
            'Last IP': 'prevGameIP',
            'Last K': 'prevGameK', 
            'Last ER': 'prevGameER',
            'Game 1 Date': 'game1Date',
            'Game 1 IP': 'game1IP',
            'Game 1 K': 'game1K',
            'Game 1 ER': 'game1ER',
            'Game 2 Date': 'game2Date',
            'Game 2 IP': 'game2IP',
            'Game 2 K': 'game2K',
            'Game 2 ER': 'game2ER',
            'Game 3 Date': 'game3Date',
            'Game 3 IP': 'game3IP',
            'Game 3 K': 'game3K',
            'Game 3 ER': 'game3ER',
            'Opponent': 'opponent',
            'Pitch Count': 'expectedPitch',
            'Exp K': 'expectedK',
            'Stadium': 'stadium',
            'Game O/U': 'gameOU'
          };
          
          // Add each field that exists in the CSV
          Object.entries(fieldMappings).forEach(([csvField, objectField]) => {
            if (headerMap[csvField] !== undefined) {
              const value = values[headerMap[csvField]];
              if (value !== undefined) {
                // Special handling for text fields with quotes
                if (csvField === 'Opponent' || csvField === 'Stadium' || csvField === 'Full Name') {
                  pitcher[objectField] = value.replace(/^"|"$/g, '') || '';
                } else {
                  pitcher[objectField] = value || '';
                }
              }
            }
          });
          
          // Handle bet types
          pitcher.betTypes = {
            K: values[headerMap['Bet K']] === 'Yes',
            OU: values[headerMap['Bet O/U']] === 'Yes'
          };
          
          importedPitchers.push(pitcher);
          console.log(`[Import] Added pitcher: ${name} (${team})`);
        }
        else if (currentSection === 'picks' && headerMap['Player Name'] !== undefined) {
          const playerNameIndex = headerMap['Player Name'];
          const playerTeamIndex = headerMap['Player Team'];
          const handicapperIdIndex = headerMap['Handicapper ID'];
          const handicapperNameIndex = headerMap['Handicapper Name'];
          const playerTypeIndex = headerMap['Player Type'];
          
          if (playerNameIndex === undefined || playerTeamIndex === undefined || 
              handicapperIdIndex === undefined || playerTypeIndex === undefined ||
              !values[playerNameIndex] || !values[playerTeamIndex] || 
              !values[handicapperIdIndex] || !values[playerTypeIndex]) {
            console.warn(`[Import] Skipping invalid handicapper pick row at line ${index}`);
            return;
          }
          
          const playerName = values[playerNameIndex].replace(/^"|"$/g, '');
          const playerTeam = values[playerTeamIndex];
          const handicapperId = values[handicapperIdIndex];
          const handicapperName = values[handicapperNameIndex]?.replace(/^"|"$/g, '') || handicapperId;
          const playerType = values[playerTypeIndex];
          
          // Store handicapper name for reference
          if (handicapperName && !handicapperNames[handicapperId]) {
            handicapperNames[handicapperId] = handicapperName;
          }
          
          const playerKey = `${playerName}-${playerTeam}`;
          if (!importedPicks[playerKey]) {
            importedPicks[playerKey] = {};
          }
          
          importedPicks[playerKey][handicapperId] = {
            public: values[headerMap['Public']] === 'Yes',
            private: values[headerMap['Private']] === 'Yes',
            straight: values[headerMap['Straight']] === 'Yes',
            H: values[headerMap['Bet Type H']] === 'Yes',
            HR: values[headerMap['Bet Type HR']] === 'Yes',
            B: values[headerMap['Bet Type B']] === 'Yes',
            K: values[headerMap['Bet Type K']] === 'Yes',
            OU: values[headerMap['Bet Type OU']] === 'Yes'
          };
          
          console.log(`[Import] Added pick for ${playerName} (${playerTeam}) - handicapper: ${handicapperId}`);
        }
        else if (currentSection === 'handicappers' && 
                 headerMap['Handicapper ID'] !== undefined && 
                 headerMap['Handicapper Name'] !== undefined) {
          
          const id = values[headerMap['Handicapper ID']];
          const name = values[headerMap['Handicapper Name']]?.replace(/^"|"$/g, '') || id;
          
          if (id && name) {
            handicapperNames[id] = name;
            console.log(`[Import] Stored handicapper name mapping: ${id} => ${name}`);
          }
        }
        else if (currentSection === 'info') {
          // Process export info - simpler parsing for key-value pairs
          if (values.length >= 2) {
            const key = values[0]?.trim();
            const value = values[1]?.trim();
            if (key && value) {
              exportInfo[key] = value;
              console.log(`[Import] Export info: ${key} = ${value}`);
            }
          }
        }
      } catch (err) {
        console.error(`[Import] Error processing line ${index} in ${currentSection}:`, err, "Line:", line);
      }
    });
    
    // Create handicapper objects from the names we've collected
    const extractedHandicappers = [];
    Object.entries(handicapperNames).forEach(([id, name]) => {
      extractedHandicappers.push({
        id,
        name: name.startsWith('@') ? name : `@${name}`
      });
    });
    
    // Combine imported players with their picks
    // For hitters
    importedHitters.forEach(player => {
      const playerKey = `${player.name}-${player.team}`;
      if (importedPicks[playerKey]) {
        player.handicapperPicks = importedPicks[playerKey];
      }
    });
    
    // For pitchers
    importedPitchers.forEach(player => {
      const playerKey = `${player.name}-${player.team}`;
      if (importedPicks[playerKey]) {
        player.handicapperPicks = importedPicks[playerKey];
      }
    });
    
    console.log(`[Import] Parsed ${importedHitters.length} hitters, ${importedPitchers.length} pitchers, ${extractedHandicappers.length} handicappers`);
    
    // PHASE 3 ENHANCEMENT: Enhance players with roster data to preserve handedness
    console.log(`[Import] Enhancing players with roster data (${rosterData.length} roster entries available)`);
    const enhancedHitters = await enhancePlayersWithRosterData(importedHitters, rosterData, 'hitter');
    const enhancedPitchers = await enhancePlayersWithRosterData(importedPitchers, rosterData, 'pitcher');
    
    console.log(`[Import] Enhanced ${enhancedHitters.length} hitters and ${enhancedPitchers.length} pitchers with roster data`);
    
    // Return the enhanced data
    return {
      hitters: enhancedHitters,
      pitchers: enhancedPitchers,
      handicappers: extractedHandicappers,
      exportInfo
    };
    
  } catch (error) {
    console.error('[Import] Error parsing imported CSV:', error);
    return null;
  }
};

/**
 * Enhance imported players with roster data to preserve handedness information
 * @param {Array} players - Array of imported player objects
 * @param {Array} rosterData - Array of roster data objects
 * @param {string} playerType - 'hitter' or 'pitcher'
 * @returns {Array} Enhanced player objects
 */
const enhancePlayersWithRosterData = async (players, rosterData, playerType) => {
  if (!rosterData || rosterData.length === 0) {
    console.log(`[Import] No roster data available for ${playerType} enhancement`);
    return players;
  }
  
  return players.map(player => {
    // Find matching player in roster data
    const rosterMatch = rosterData.find(r => 
      r.name === player.name && 
      r.team === player.team &&
      r.type === playerType
    );
    
    if (rosterMatch) {
      console.log(`[Import] Enhanced ${player.name} (${player.team}) with roster data`);
      
      // Create enhanced player object
      const enhancedPlayer = {
        ...player, // Keep all imported data (picks, game history, etc.)
        
        // Add/preserve handedness and roster data
        bats: player.bats || rosterMatch.bats || (playerType === 'hitter' ? 'R' : undefined),
        throwingArm: player.throwingArm || rosterMatch.throwingArm || rosterMatch.ph || (playerType === 'pitcher' ? 'R' : undefined),
        fullName: player.fullName || rosterMatch.fullName || player.name,
        
        // Add any other roster data that might be useful
        position: rosterMatch.position || player.position,
        pitches: rosterMatch.pitches || player.pitches || [],
        
        // Mark as enhanced for debugging
        _enhanced: true,
        _rosterMatch: true
      };
      
      return enhancedPlayer;
    } else {
      console.log(`[Import] No roster match found for ${player.name} (${player.team}), using CSV data only`);
      
      // No roster match - preserve CSV data but add defaults if missing
      return {
        ...player,
        bats: player.bats || (playerType === 'hitter' ? 'R' : undefined),
        throwingArm: player.throwingArm || (playerType === 'pitcher' ? 'R' : undefined),
        fullName: player.fullName || player.name,
        _enhanced: false,
        _rosterMatch: false
      };
    }
  });
};