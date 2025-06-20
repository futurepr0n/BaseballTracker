/**
 * MINIMAL VERSION - generatePositivePlayerPerformance.js
 * 
 * This is a stripped-down version to identify what's causing the hanging issue.
 * We'll progressively add complexity once we confirm basic functionality works.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROSTER_PATH = path.join(__dirname, '../../public/data/rosters.json');
const SEASON_DATA_DIR = path.join(__dirname, '../../public/data/2025');
const OUTPUT_DIR = path.join(__dirname, '../../public/data/predictions');

/**
 * Read JSON file safely
 */
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}

/**
 * Write JSON file safely
 */
function writeJsonFile(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Successfully wrote to ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
    return false;
  }
}

/**
 * Load all season data
 */
function loadAllSeasonData() {
  console.log('Loading season data...');
  const seasonData = {};
  const months = ['january', 'february', 'march', 'april', 'may', 'june'];
  
  let totalDates = 0;
  months.forEach(month => {
    const monthDir = path.join(SEASON_DATA_DIR, month);
    if (fs.existsSync(monthDir)) {
      const files = fs.readdirSync(monthDir);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(monthDir, file);
            const data = readJsonFile(filePath);
            if (data) {
              seasonData[data.date] = data;
              totalDates++;
            }
          } catch (error) {
            console.warn(`Skipping ${file}: ${error.message}`);
          }
        }
      });
    }
  });
  
  console.log(`Loaded data for ${totalDates} dates`);
  return seasonData;
}

/**
 * Minimal positive performance calculation - just basic stats
 */
function calculateMinimalPositiveScore(player, seasonData) {
  console.log(`🔍 Minimal analysis for ${player.name} (${player.team})`);
  
  // Just return a simple score based on team name for testing
  const teamScore = player.team.length * 5; // Simple calculation
  
  return {
    playerName: player.name,
    team: player.team,
    totalPositiveScore: teamScore,
    positiveFactors: [
      {
        type: 'test_factor',
        description: 'Test factor for debugging',
        positivePoints: teamScore
      }
    ],
    momentumLevel: teamScore > 15 ? 'HIGH' : 'LOW'
  };
}

/**
 * Main minimal generation function
 */
async function generateMinimalPositivePerformancePredictions(targetDate = new Date()) {
  console.log(`Generating MINIMAL positive performance predictions for ${targetDate.toDateString()}`);
  
  const rosterData = readJsonFile(ROSTER_PATH);
  if (!rosterData) {
    console.error('Failed to load roster data');
    return false;
  }
  
  const seasonData = loadAllSeasonData();
  const allHitters = rosterData.filter(player => player.type === 'hitter' || !player.type);
  
  console.log(`Testing with ${allHitters.length} hitters...`);
  const startTime = new Date();
  console.log(`🚀 MINIMAL Analysis started at ${startTime.toLocaleTimeString()}`);
  
  const positivePerformancePredictions = [];
  
  // Process only first 50 players for testing
  const testHitters = allHitters.slice(0, 50);
  
  for (let index = 0; index < testHitters.length; index++) {
    const player = testHitters[index];
    
    try {
      console.log(`Processing ${index + 1}/${testHitters.length}: ${player.name} (${player.team})`);
      
      const positiveAnalysis = calculateMinimalPositiveScore(player, seasonData);
      
      if (positiveAnalysis && positiveAnalysis.totalPositiveScore >= 10) {
        positivePerformancePredictions.push(positiveAnalysis);
      }
      
      // Small delay to prevent system overload
      if (index % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
    } catch (error) {
      console.error(`Error analyzing ${player.name}:`, error);
    }
  }
  
  const endTime = new Date();
  const analysisTime = ((endTime - startTime) / 1000).toFixed(1);
  console.log(`✅ MINIMAL Analysis completed in ${analysisTime}s`);
  console.log(`📈 Found ${positivePerformancePredictions.length} test predictions`);
  
  // Sort by positive score
  positivePerformancePredictions.sort((a, b) => b.totalPositiveScore - a.totalPositiveScore);
  
  // Save test predictions
  const outputFileName = `minimal_positive_performance_test.json`;
  const outputPath = path.join(OUTPUT_DIR, outputFileName);
  
  const outputData = {
    date: targetDate.toISOString().split('T')[0],
    generatedAt: new Date().toISOString(),
    testMode: true,
    totalPlayersAnalyzed: testHitters.length,
    playersWithPositiveMomentum: positivePerformancePredictions.length,
    predictions: positivePerformancePredictions
  };
  
  return writeJsonFile(outputPath, outputData);
}

// Export for use in other modules
module.exports = {
  generateMinimalPositivePerformancePredictions
};

// Run if called directly
if (require.main === module) {
  generateMinimalPositivePerformancePredictions()
    .then(success => {
      if (success) {
        console.log('✅ MINIMAL test completed successfully');
        console.log('🔍 If this works, the issue is in the complex analysis functions');
        process.exit(0);
      } else {
        console.error('❌ MINIMAL test failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 MINIMAL test error:', error);
      process.exit(1);
    });
}