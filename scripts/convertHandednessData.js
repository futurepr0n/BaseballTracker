#!/usr/bin/env node

/**
 * Convert handedness CSV files to JSON for better React performance
 */

const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, '../public/data/stats');
const OUTPUT_DIR = path.join(__dirname, '../public/data/handedness');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // Remove BOM if present and parse headers
  const headers = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim().replace(/"/g, ''));
  
  return lines.slice(1).map(line => {
    // Handle CSV parsing with quoted fields properly
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Add the last value
    
    const row = {};
    
    headers.forEach((header, index) => {
      const value = values[index] || '';
      
      // Convert numeric fields
      if (['avg_bat_speed', 'swing_tilt', 'attack_angle', 'attack_direction', 
           'ideal_attack_angle_rate', 'avg_intercept_y_vs_plate', 
           'avg_intercept_y_vs_batter', 'competitive_swings'].includes(header)) {
        row[header] = value && value !== '' && !isNaN(parseFloat(value)) ? parseFloat(value) : 0;
      } else {
        row[header] = value;
      }
    });
    
    return row;
  }).filter(row => row.name && row.name !== '');
}

function convertCSVToJSON(filename, handedness) {
  const csvPath = path.join(INPUT_DIR, filename);
  const jsonPath = path.join(OUTPUT_DIR, `${handedness.toLowerCase()}.json`);
  
  try {
    console.log(`Converting ${filename} to JSON...`);
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const jsonData = parseCSV(csvContent);
    
    // Create the JSON structure
    const output = {
      handedness: handedness,
      lastUpdated: new Date().toISOString(),
      totalPlayers: jsonData.length,
      players: jsonData
    };
    
    fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2));
    console.log(`✅ Created ${jsonPath} with ${jsonData.length} players`);
    
    return jsonData.length;
  } catch (error) {
    console.error(`❌ Error converting ${filename}:`, error.message);
    return 0;
  }
}

function main() {
  console.log('🔄 Converting handedness CSV files to JSON...\n');
  
  const conversions = [
    { file: 'batters-swing-path-RHP.csv', handedness: 'RHP' },
    { file: 'batters-swing-path-LHP.csv', handedness: 'LHP' },
    { file: 'batters-swing-path-all.csv', handedness: 'ALL' }
  ];
  
  let totalConverted = 0;
  
  conversions.forEach(({ file, handedness }) => {
    const count = convertCSVToJSON(file, handedness);
    totalConverted += count;
  });
  
  console.log(`\n✅ Conversion complete! Total players processed: ${totalConverted}`);
  console.log(`📁 JSON files created in: ${OUTPUT_DIR}`);
  
  // Create index file for easy access
  const indexPath = path.join(OUTPUT_DIR, 'index.json');
  const indexData = {
    lastUpdated: new Date().toISOString(),
    files: {
      rhp: 'rhp.json',
      lhp: 'lhp.json',
      all: 'all.json'
    },
    description: 'Handedness-specific swing path data converted from CSV files'
  };
  
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  console.log(`📋 Created index file: ${indexPath}`);
}

if (require.main === module) {
  main();
}

module.exports = { parseCSV, convertCSVToJSON };