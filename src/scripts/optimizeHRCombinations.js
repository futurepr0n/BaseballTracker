#!/usr/bin/env node

/**
 * Optimize HR Combinations Data
 * 
 * Creates a smaller, more manageable version of the HR combinations file
 * by keeping only the top combinations for each group size.
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../../public/data/hr_combinations/hr_combinations_latest.json');
const OUTPUT_FILE = path.join(__dirname, '../../public/data/hr_combinations/hr_combinations_optimized.json');
const TEMP_OUTPUT_FILE = path.join(__dirname, '../../public/data/hr_combinations/hr_combinations_latest_backup.json');

// Configuration
const MAX_COMBINATIONS_PER_GROUP = 200; // Top 200 combinations per group
const MIN_OCCURRENCES = 2; // Only keep combinations that occurred at least twice

async function optimizeHRCombinations() {
  console.log('🔧 Starting HR combinations optimization...');
  console.log(`📂 Input file: ${INPUT_FILE}`);
  console.log(`📂 Output file: ${OUTPUT_FILE}`);
  
  try {
    // Check if input file exists
    if (!fs.existsSync(INPUT_FILE)) {
      console.error('❌ Input file not found!');
      return;
    }
    
    const stats = fs.statSync(INPUT_FILE);
    console.log(`📊 Input file size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
    
    console.log('📖 Reading input file...');
    const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
    const data = JSON.parse(rawData);
    
    console.log('🔍 Original data structure:');
    console.log(`  - Group 2: ${data.group_2?.length || 0} combinations`);
    console.log(`  - Group 3: ${data.group_3?.length || 0} combinations`);
    console.log(`  - Group 4: ${data.group_4?.length || 0} combinations`);
    
    // Optimize each group
    const optimizedData = {
      ...data,
      generatedAt: new Date().toISOString(),
      generatedBy: "Optimized HR Combinations Generator v1.0",
      optimization: {
        maxCombinationsPerGroup: MAX_COMBINATIONS_PER_GROUP,
        minOccurrences: MIN_OCCURRENCES,
        optimizedAt: new Date().toISOString()
      }
    };
    
    // Process each group
    ['group_2', 'group_3', 'group_4'].forEach(groupKey => {
      if (data[groupKey] && Array.isArray(data[groupKey])) {
        console.log(`🔧 Optimizing ${groupKey}...`);
        
        // Filter and sort combinations
        let combinations = data[groupKey]
          .filter(combo => combo.occurrences >= MIN_OCCURRENCES)
          .sort((a, b) => {
            // Sort by occurrences (descending), then by recency
            if (b.occurrences !== a.occurrences) {
              return b.occurrences - a.occurrences;
            }
            return new Date(b.lastOccurrence) - new Date(a.lastOccurrence);
          });
        
        // Take top combinations
        combinations = combinations.slice(0, MAX_COMBINATIONS_PER_GROUP);
        
        optimizedData[groupKey] = combinations;
        
        console.log(`  ✅ ${groupKey}: ${data[groupKey].length} → ${combinations.length} combinations`);
      }
    });
    
    console.log('💾 Writing optimized file...');
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(optimizedData, null, 2));
    
    const optimizedStats = fs.statSync(OUTPUT_FILE);
    console.log(`📊 Optimized file size: ${(optimizedStats.size / 1024 / 1024).toFixed(1)} MB`);
    console.log(`📈 Size reduction: ${(100 - (optimizedStats.size / stats.size * 100)).toFixed(1)}%`);
    
    // Create backup of original with new name
    console.log('💾 Creating backup of original...');
    fs.copyFileSync(INPUT_FILE, TEMP_OUTPUT_FILE);
    
    // Replace original with optimized version
    console.log('🔄 Replacing original with optimized version...');
    fs.copyFileSync(OUTPUT_FILE, INPUT_FILE);
    
    console.log('✅ Optimization complete!');
    console.log(`📂 Original backed up to: hr_combinations_latest_backup.json`);
    console.log(`📂 Optimized version saved as: hr_combinations_latest.json`);
    
  } catch (error) {
    console.error('❌ Error during optimization:', error);
  }
}

// Run if called directly
if (require.main === module) {
  optimizeHRCombinations();
}

module.exports = optimizeHRCombinations;