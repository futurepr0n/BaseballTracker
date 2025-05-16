/**
 * Roster Rebuilder Script
 * 
 * This script scans all daily JSON game files in the data directory and rebuilds
 * the rosters.json file to ensure it contains all players who have ever appeared
 * in any game data. Run this once to fix roster issues without reprocessing CSVs.
 * 
 * Usage: node rebuildRoster.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BASE_DATA_DIR = path.join('public', 'data');
const ROSTER_FILE_PATH = path.join(BASE_DATA_DIR, 'rosters.json');

/**
 * Recursively scans a directory for JSON files
 * @param {string} dir - Directory to scan
 * @param {Array} fileList - Array to collect file paths
 * @returns {Array} List of JSON file paths
 */
function scanForJsonFiles(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Recursively scan subdirectories
        scanForJsonFiles(filePath, fileList);
      } else if (file.endsWith('.json') && !file.includes('rosters') && !file.includes('predictions')) {
        // Only include game data JSON files (exclude rosters.json and prediction files)
        fileList.push(filePath);
      }
    }
    
    return fileList;
  } catch (error) {
    console.error(`Error scanning directory ${dir}: ${error.message}`);
    return fileList;
  }
}

/**
 * Extracts unique players from a JSON game file
 * @param {string} filePath - Path to the JSON file
 * @returns {Array} Array of player objects
 */
function extractPlayersFromFile(filePath) {
  try {
    console.log(`Processing file: ${filePath}`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!data.players || !Array.isArray(data.players)) {
      console.log(`No players found in ${filePath}`);
      return [];
    }
    
    return data.players.map(player => ({
      name: player.name,
      team: player.team,
      playerType: player.playerType || (player.IP !== undefined ? 'pitcher' : 'hitter')
    }));
  } catch (error) {
    console.error(`Error processing file ${filePath}: ${error.message}`);
    return [];
  }
}

/**
 * Load the roster.json file or create a new one if it doesn't exist
 * @returns {Object} The roster data object
 */
function loadRosterFile() {
  try {
    // Check if the roster file exists
    if (!fs.existsSync(ROSTER_FILE_PATH)) {
      console.log(`Roster file not found at ${ROSTER_FILE_PATH}, creating a new one.`);
      const emptyRoster = { players: [] };
      fs.writeFileSync(ROSTER_FILE_PATH, JSON.stringify(emptyRoster, null, 2), 'utf8');
      return emptyRoster;
    }
    
    // Read and parse the existing roster file
    const rosterContent = fs.readFileSync(ROSTER_FILE_PATH, 'utf8');
    const rosterData = JSON.parse(rosterContent);
    
    // Ensure the roster has a players array
    if (!rosterData.players) {
      rosterData.players = [];
    }
    
    console.log(`Loaded roster file with ${rosterData.players.length} players.`);
    return rosterData;
  } catch (error) {
    console.error(`Error loading roster file: ${error.message}`);
    // Create a new roster file if there was an error
    const emptyRoster = { players: [] };
    try {
      fs.writeFileSync(ROSTER_FILE_PATH, JSON.stringify(emptyRoster, null, 2), 'utf8');
    } catch (writeError) {
      console.error(`Failed to create new roster file: ${writeError.message}`);
    }
    return emptyRoster;
  }
}

/**
 * Save the roster file
 * @param {Object} rosterData - The roster data to save
 * @returns {boolean} Whether the save was successful
 */
function saveRosterFile(rosterData) {
  try {
    fs.writeFileSync(ROSTER_FILE_PATH, JSON.stringify(rosterData, null, 2), 'utf8');
    console.log(`Successfully saved roster file with ${rosterData.players.length} players.`);
    return true;
  } catch (error) {
    console.error(`Error saving roster file: ${error.message}`);
    return false;
  }
}

/**
 * Main function to rebuild the roster
 */
async function rebuildRoster() {
  console.log('Starting roster rebuild process...');
  
  // 1. Find all JSON files with game data
  console.log(`Scanning for game data files in ${BASE_DATA_DIR}...`);
  const jsonFiles = scanForJsonFiles(BASE_DATA_DIR);
  console.log(`Found ${jsonFiles.length} JSON files to process.`);
  
  // 2. Load the current roster file
  const rosterData = loadRosterFile();
  
  // 3. Create a set to track unique player keys
  const uniquePlayerKeys = new Set();
  // Track existing players in roster
  rosterData.players.forEach(player => {
    uniquePlayerKeys.add(`${player.name}_${player.team}`);
  });
  
  // 4. Process each file and collect unique players
  let totalPlayers = 0;
  let newPlayersAdded = 0;
  
  for (const filePath of jsonFiles) {
    const players = extractPlayersFromFile(filePath);
    totalPlayers += players.length;
    
    for (const player of players) {
      const playerKey = `${player.name}_${player.team}`;
      
      // Add the player to the roster if they don't exist
      if (!uniquePlayerKeys.has(playerKey)) {
        console.log(`Adding new player to roster: ${player.name} (${player.team})`);
        rosterData.players.push(player);
        uniquePlayerKeys.add(playerKey);
        newPlayersAdded++;
      }
    }
  }
  
  // 5. Save the updated roster file
  console.log(`\nProcessed ${totalPlayers} total player entries from ${jsonFiles.length} files.`);
  console.log(`Found ${newPlayersAdded} new players to add to roster.`);
  
  if (newPlayersAdded > 0) {
    saveRosterFile(rosterData);
    console.log(`Roster rebuild complete! Added ${newPlayersAdded} new players.`);
  } else {
    console.log('No new players found. Roster file unchanged.');
  }
}

// Run the main function
rebuildRoster().catch(error => {
  console.error('Error during roster rebuild:', error);
  process.exit(1);
});