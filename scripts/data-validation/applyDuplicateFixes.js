#!/usr/bin/env node

/**
 * Apply Duplicate Fixes Script
 * 
 * Complete solution for production environments to detect, clean, and prevent
 * duplicate data issues in the BaseballTracker system.
 */

const fs = require('fs');
const { spawn } = require('child_process');

async function runCommand(command, args = [], description = '') {
  return new Promise((resolve, reject) => {
    console.log(`🔄 ${description || 'Running command'}: ${command} ${args.join(' ')}`);
    
    const process = spawn(command, args, { 
      stdio: 'inherit',
      shell: true 
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description || 'Command'} completed successfully\n`);
        resolve(code);
      } else {
        console.error(`❌ ${description || 'Command'} failed with code ${code}\n`);
        reject(new Error(`Command failed with code ${code}`));
      }
    });
    
    process.on('error', (error) => {
      console.error(`❌ Error running ${description || 'command'}:`, error.message);
      reject(error);
    });
  });
}

async function main() {
  console.log('🚀 COMPREHENSIVE DUPLICATE FIX PROCESS');
  console.log('=====================================\n');
  
  const steps = [
    {
      name: 'Investigation',
      command: 'node',
      args: ['scripts/data-validation/comprehensiveDuplicateDetector.js'],
      description: 'Detecting duplicates across entire dataset'
    },
    {
      name: 'Cleanup',
      command: 'node', 
      args: ['scripts/data-validation/systematicDuplicateFixer.js'],
      description: 'Removing detected duplicates systematically'
    },
    {
      name: 'Rolling Stats Regeneration',
      command: './generate_rolling_stats.sh',
      args: [],
      description: 'Regenerating rolling statistics with clean data'
    },
    {
      name: 'Milestone Tracking Update',
      command: 'node',
      args: ['src/services/generateMilestoneTracking.js'],
      description: 'Updating milestone tracking with corrected data'
    },
    {
      name: 'Final Validation',
      command: 'node',
      args: ['scripts/data-validation/crossValidatePlayerStats.js'],
      description: 'Validating that key players now have correct statistics'
    }
  ];
  
  let completedSteps = 0;
  
  try {
    for (const step of steps) {
      console.log(`📋 STEP ${completedSteps + 1}/${steps.length}: ${step.name}`);
      console.log('='.repeat(50));
      
      await runCommand(step.command, step.args, step.description);
      completedSteps++;
      
      console.log(`✅ Step ${completedSteps}/${steps.length} completed\n`);
    }
    
    console.log('🎉 ALL STEPS COMPLETED SUCCESSFULLY!');
    console.log('===================================\n');
    
    console.log('📊 SUMMARY:');
    console.log('✅ Duplicates detected and removed');
    console.log('✅ Rolling statistics regenerated');
    console.log('✅ Milestone tracking updated');
    console.log('✅ Data validation passed');
    console.log('✅ Enhanced duplicate prevention now active');
    
    console.log('\n🔧 PREVENTION MEASURES NOW IN PLACE:');
    console.log('• Enhanced duplicate detection in statLoader.js');
    console.log('• Processing lock system prevents concurrent CSV processing');
    console.log('• Automatic duplicate scanning in daily automation');
    console.log('• Comprehensive logging and monitoring');
    
    console.log('\n📈 NEXT STEPS:');
    console.log('1. Update production automation to use enhanced daily_automation.sh');
    console.log('2. Monitor logs for any duplicate prevention messages');
    console.log('3. Run weekly validation checks');
    
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ PROCESS FAILED at step ${completedSteps + 1}/${steps.length}`);
    console.error(`Error: ${error.message}`);
    
    console.log('\n🔄 RECOVERY RECOMMENDATIONS:');
    console.log('1. Check error logs above for specific issues');
    console.log('2. Verify file permissions and paths');
    console.log('3. Ensure all dependencies are installed');
    console.log('4. Try running individual steps manually');
    
    if (completedSteps > 0) {
      console.log(`\n✅ ${completedSteps} steps completed successfully before failure`);
    }
    
    process.exit(1);
  }
}

// Show usage if help requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('📖 DUPLICATE FIX SCRIPT USAGE');
  console.log('=============================\n');
  console.log('This script performs a complete duplicate detection and cleanup process:');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/data-validation/applyDuplicateFixes.js');
  console.log('');
  console.log('Steps performed:');
  console.log('1. 🔍 Comprehensive duplicate detection');
  console.log('2. 🧹 Systematic duplicate removal');
  console.log('3. 📊 Rolling statistics regeneration');
  console.log('4. 🎯 Milestone tracking update');
  console.log('5. ✅ Final validation');
  console.log('');
  console.log('Requirements:');
  console.log('• Node.js environment');
  console.log('• All duplicate detection scripts present');
  console.log('• Write access to data directories');
  console.log('• generate_rolling_stats.sh executable');
  console.log('');
  console.log('Safety:');
  console.log('• Automatic backups created before changes');
  console.log('• Processing locks prevent concurrent operations');
  console.log('• Comprehensive logging for audit trail');
  process.exit(0);
}

// Run the main process
main();