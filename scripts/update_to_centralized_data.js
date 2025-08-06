#!/usr/bin/env node

/**
 * Script to update BaseballTracker Node.js services to use centralized data configuration
 */

const fs = require('fs');
const path = require('path');

// High-priority files that need updating
const priorityFiles = [
  'src/services/dataService.js',
  'src/services/professionalDataLoader.js',
  'src/services/generateTeamStats.js',
  'src/services/generateHRPredictions3.js',
  'src/services/generateRollingStats.js',
  'src/services/generatePropAnalysis.js',
  'src/services/generateOpponentMatchupStats.js',
  'src/services/scheduleGenerator.js',
  'src/services/duplicateDetectionService.js',
];

// Pattern replacements for common path patterns
const replacements = [
  // Direct path references
  {
    pattern: /path\.join\(__dirname,\s*['"]\.\.\/\.\.\/public\/data['"]/g,
    replacement: "path.join(require('../../config/dataPath').DATA_PATH"
  },
  {
    pattern: /path\.join\(__dirname,\s*['"]\.\.\/\.\.\/build\/data['"]/g,
    replacement: "path.join(require('../../config/dataPath').DATA_PATH"
  },
  // Relative path references in services
  {
    pattern: /'\.\.\/\.\.\/public\/data'/g,
    replacement: "require('../../config/dataPath').DATA_PATH"
  },
  {
    pattern: /"\.\.\/\.\.\/public\/data"/g,
    replacement: "require('../../config/dataPath').DATA_PATH"
  },
  // Professional data loader specific
  {
    pattern: /this\.dataPath\s*=\s*path\.join\(basePath,\s*'public\/data'\)/g,
    replacement: "this.dataPath = require('../config/dataPath').DATA_PATH"
  },
  {
    pattern: /this\.statsPath\s*=\s*path\.join\(basePath,\s*'public\/data\/stats'\)/g,
    replacement: "this.statsPath = require('../config/dataPath').paths.stats"
  },
];

function updateFile(filePath) {
  // Check if file exists
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`  ✗ ${filePath} - file not found`);
    return false;
  }

  // Read file content
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;

  // Check if already using config
  if (content.includes("require('../config/dataPath')") || 
      content.includes("require('../../config/dataPath')")) {
    console.log(`  ✓ ${filePath} - already using config`);
    return false;
  }

  // Apply replacements
  let modified = false;
  replacements.forEach(({ pattern, replacement }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  });

  // If modified, write back
  if (modified) {
    // Add config import at the top if not present
    if (!content.includes("config/dataPath")) {
      // Find the right place to add the require
      const lines = content.split('\n');
      let insertIndex = 0;
      
      // Find the last require/import statement
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('require(') || lines[i].includes('import ')) {
          insertIndex = i + 1;
        } else if (insertIndex > 0 && lines[i].trim() !== '') {
          // Found non-import line after imports
          break;
        }
      }

      // Add our config import
      const configPath = filePath.startsWith('src/services/') ? 
        "const { DATA_PATH, paths } = require('../../config/dataPath');" :
        "const { DATA_PATH, paths } = require('../config/dataPath');";
      
      lines.splice(insertIndex, 0, configPath);
      content = lines.join('\n');
    }

    fs.writeFileSync(fullPath, content);
    console.log(`  ✓ ${filePath} - updated with centralized paths`);
    return true;
  }

  console.log(`  - ${filePath} - no hardcoded paths found`);
  return false;
}

function main() {
  console.log('Updating BaseballTracker services to use centralized data configuration...\n');

  let updatedCount = 0;

  // Update priority files
  console.log('Updating high-priority service files:');
  priorityFiles.forEach(file => {
    if (updateFile(file)) {
      updatedCount++;
    }
  });

  // Find and update other JavaScript files
  console.log('\nLooking for other files with data paths...');
  
  const servicesDir = path.join(__dirname, '..', 'src', 'services');
  const serviceFiles = fs.readdirSync(servicesDir)
    .filter(f => f.endsWith('.js'))
    .map(f => `src/services/${f}`)
    .filter(f => !priorityFiles.includes(f));

  serviceFiles.forEach(file => {
    if (updateFile(file)) {
      updatedCount++;
    }
  });

  console.log(`\nSummary: Updated ${updatedCount} files`);

  if (updatedCount > 0) {
    console.log('\nNext steps:');
    console.log('1. Run the migration script: ./migrate_to_centralized_data.sh');
    console.log('2. Test the application: npm start');
    console.log('3. Verify data loading works correctly');
    console.log('4. Commit changes on feature branch');
  }
}

// Run the update
main();