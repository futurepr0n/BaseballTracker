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
    // Make sure header count matches data columns
    csvContent += "Player,Team,Last HR,Last AB,Last H,Game 1 Date,Game 1 HR,Game 1 AB,Game 1 H,Game 2 Date,Game 2 HR,Game 2 AB,Game 2 H,Game 3 Date,Game 3 HR,Game 3 AB,Game 3 H,Pitcher,Pitcher ID,Opponent Team,Throws,Exp SO,Stadium,Game O/U,Bet H,Bet HR,Bet B\n";
    selectedPlayers.hitters.forEach(p => {
      const row = [
        `"${p.name.replace(/"/g, '""')}"`, p.team, 
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
    // Make sure header count matches data columns
    csvContent += "Player,Team,Last IP,Last K,Last ER,Game 1 Date,Game 1 IP,Game 1 K,Game 1 ER,Game 2 Date,Game 2 IP,Game 2 K,Game 2 ER,Game 3 Date,Game 3 IP,Game 3 K,Game 3 ER,Opponent,Pitch Count,Exp K,Stadium,Game O/U,Bet K,Bet O/U\n";
    selectedPlayers.pitchers.forEach(p => {
      const row = [
        `"${p.name.replace(/"/g, '""')}"`, p.team, 
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
  if (handicappers && handicappers.length > 0 && 
      ((selectedPlayers.hitters && selectedPlayers.hitters.length > 0) || 
       (selectedPlayers.pitchers && selectedPlayers.pitchers.length > 0))) {
    
    csvContent += "HANDICAPPER PICKS\n";
    csvContent += "Handicapper ID,Handicapper Name,Player Name,Player Team,Player Type,Public,Private,Straight,Bet Type H,Bet Type HR,Bet Type B,Bet Type K,Bet Type OU\n";

    const addPicksToCSV = (player, playerType) => {
      if (!player.handicapperPicks) return;
      
      Object.entries(player.handicapperPicks).forEach(([handicapperId, pick]) => {
        // Only include rows where there is at least one pick
        if (pick && (pick.public || pick.private || pick.straight || 
            pick.H || pick.HR || pick.B || pick.K || pick.OU)) {
          
          const handicapper = handicappers.find(h => h.id === handicapperId);
          const row = [
            handicapperId,
            `"${(handicapper ? handicapper.name : handicapperId).replace(/"/g, '""')}"`,
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
        }
      });
    };
    
    if (selectedPlayers.hitters) {
      selectedPlayers.hitters.forEach(p => addPicksToCSV(p, 'Hitter'));
    }
    if (selectedPlayers.pitchers) {
      selectedPlayers.pitchers.forEach(p => addPicksToCSV(p, 'Pitcher'));
    }
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
 * Parse CSV content from imported file
 * @param {string} content - CSV file content
 * @param {Array} handicappers - Array of handicapper objects
 * @returns {Object|null} Parsed player data or null if error
 */
export const parseImportedCSV = (content, handicappers) => {
  try {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l); // Trim lines and remove empty ones

    let currentSection = '';
    const importedHitters = [];
    const importedPitchers = [];
    const importedPicks = {}; // Store picks temporarily: { 'playerName-playerTeam': { 'handicapperId': {...picks} } }

    let headerMap = {};

    lines.forEach((line, index) => {
      // Detect section headers
      if (line === 'HITTERS') { currentSection = 'hitters'; headerMap = {}; return; }
      if (line === 'PITCHERS') { currentSection = 'pitchers'; headerMap = {}; return; }
      if (line === 'HANDICAPPER PICKS') { currentSection = 'picks'; headerMap = {}; return; }

      // Skip empty lines just in case
      if (!line) return;

      // Process Header Row
      if (Object.keys(headerMap).length === 0 && index > 0) { // Check index > 0 to avoid processing section header as data header
        const headers = line.split(',').map(h => h.trim());
        headers.forEach((h, i) => { headerMap[h] = i; });
        console.log(`[CapSheet Import] Detected ${currentSection} headers:`, headerMap);
        return; // Skip processing the header row itself
      }

      // Process data rows based on section
      const values = line.split(','); // Simple split, assumes no commas in quoted fields for now

      if (currentSection === 'hitters' && headerMap['Player'] !== undefined) {
        // Use headerMap to get indices safely
        const name = values[headerMap['Player']]?.replace(/^"|"$/g, '');
        const team = values[headerMap['Team']];
        if (!name || !team) return; // Skip row if essential data missing

        // Create basic hitter object with standard fields
        const hitter = {
          id: `${name}-${team}`, name, team, playerType: 'hitter',
          handicapperPicks: {} // Initialize, will be populated later
        };
        
        // Map all possible fields from CSV
        // Note: This approach handles both old and new CSV formats
        const fieldMappings = {
          'Last HR': 'prevGameHR',
          'Last AB': 'prevGameAB', 
          'Last H': 'prevGameH',
          'Prev Game HR': 'prevGameHR', 
          'Prev Game AB': 'prevGameAB', 
          'Prev Game H': 'prevGameH',
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
          'Avg HR (3G)': 'avgHR',
          'Avg AB (3G)': 'avgAB',
          'Avg H (3G)': 'avgH',
          'Pitcher': 'pitcher',
          'Pitcher ID': 'pitcherId',
          'Opponent Team': 'opponentTeam',
          'Throws': 'pitcherHand',
          'Exp SO': 'expectedSO',
          'Stadium': 'stadium',
          'Game O/U': 'gameOU',
          'Bet H': 'betH',
          'Bet HR': 'betHR',
          'Bet B': 'betB'
        };
        
        // Add each field that exists in the CSV
        Object.entries(fieldMappings).forEach(([csvField, objectField]) => {
          if (headerMap[csvField] !== undefined) {
            // Special handling for fields that need cleanup
            if (csvField === 'Pitcher' || csvField === 'Stadium') {
              hitter[objectField] = values[headerMap[csvField]]?.replace(/^"|"$/g, '') || '';
            } 
            // Special handling for boolean fields
            else if (csvField.startsWith('Bet ')) {
              if (!hitter.betTypes) hitter.betTypes = {};
              const betType = csvField.replace('Bet ', '');
              hitter.betTypes[betType] = values[headerMap[csvField]] === 'Yes';
            }
            // Normal field handling
            else {
              hitter[objectField] = values[headerMap[csvField]] || '';
            }
          }
        });
        
        // Ensure betTypes exists
        if (!hitter.betTypes) {
          hitter.betTypes = { H: false, HR: false, B: false };
        }
        
        importedHitters.push(hitter);
      } else if (currentSection === 'pitchers' && headerMap['Player'] !== undefined) {
        const name = values[headerMap['Player']]?.replace(/^"|"$/g, '');
        const team = values[headerMap['Team']];
        if (!name || !team) return;

        // Create basic pitcher object
        const pitcher = {
          id: `${name}-${team}`, 
          name, 
          team, 
          playerType: 'pitcher',
          handicapperPicks: {} // Initialize
        };
        
        // Map fields from CSV
        const fieldMappings = {
          'Last IP': 'prevGameIP',
          'Last K': 'prevGameK', 
          'Last ER': 'prevGameER',
          'Prev Game IP': 'prevGameIP', 
          'Prev Game K': 'prevGameK', 
          'Prev Game ER': 'prevGameER',
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
          'Avg IP (3G)': 'avgIP',
          'Avg K (3G)': 'avgK',
          'Avg ER (3G)': 'avgER',
          'Opponent': 'opponent',
          'Pitch Count': 'expectedPitch',
          'Exp K': 'expectedK',
          'Stadium': 'stadium',
          'Game O/U': 'gameOU',
          'Bet K': 'betK',
          'Bet O/U': 'betOU'
        };
        
        // Add each field that exists in the CSV
        Object.entries(fieldMappings).forEach(([csvField, objectField]) => {
          if (headerMap[csvField] !== undefined) {
            // Special handling for fields that need cleanup
            if (csvField === 'Opponent' || csvField === 'Stadium') {
              pitcher[objectField] = values[headerMap[csvField]]?.replace(/^"|"$/g, '') || '';
            } 
            // Special handling for boolean fields
            else if (csvField.startsWith('Bet ')) {
              if (!pitcher.betTypes) pitcher.betTypes = {};
              const betType = csvField.replace('Bet ', '');
              pitcher.betTypes[betType] = values[headerMap[csvField]] === 'Yes';
            }
            // Normal field handling
            else {
              pitcher[objectField] = values[headerMap[csvField]] || '';
            }
          }
        });
        
        // Ensure betTypes exists
        if (!pitcher.betTypes) {
          pitcher.betTypes = { K: false, OU: false };
        }
        
        importedPitchers.push(pitcher);
      } else if (currentSection === 'picks' && headerMap['Player Name'] !== undefined) {
        const playerName = values[headerMap['Player Name']]?.replace(/^"|"$/g, '');
        const playerTeam = values[headerMap['Player Team']];
        const handicapperId = values[headerMap['Handicapper ID']];
        if (!playerName || !playerTeam || !handicapperId) return; // Skip if key info missing

        const playerKey = `${playerName}-${playerTeam}`;
        if (!importedPicks[playerKey]) importedPicks[playerKey] = {};

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
      }
    });

    // Combine imported players with their picks
    const assignPicks = (player) => {
      const playerKey = `${player.name}-${player.team}`;
      const picksForPlayer = importedPicks[playerKey];
      if (picksForPlayer) {
        // Initialize all known handicappers first
        const initialPicks = handicappers.reduce((acc, h) => {
          acc[h.id] = player.playerType === 'hitter'
            ? { public: false, private: false, straight: false, H: false, HR: false, B: false }
            : { public: false, private: false, straight: false, K: false, OU: false };
          return acc;
        }, {});
        // Merge imported picks over the defaults
        player.handicapperPicks = { ...initialPicks, ...picksForPlayer };
      } else {
        // If no picks found in CSV, initialize with defaults for known handicappers
        player.handicapperPicks = handicappers.reduce((acc, h) => {
          acc[h.id] = player.playerType === 'hitter'
            ? { public: false, private: false, straight: false, H: false, HR: false, B: false }
            : { public: false, private: false, straight: false, K: false, OU: false };
          return acc;
        }, {});
      }
      return player;
    };

    const finalHitters = importedHitters.map(assignPicks);
    const finalPitchers = importedPitchers.map(assignPicks);

    // Return the parsed data
    return {
      hitters: finalHitters,
      pitchers: finalPitchers
    };
  } catch (error) {
    console.error('Error parsing imported CSV:', error);
    return null;
  }
};