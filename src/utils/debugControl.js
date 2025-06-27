/**
 * Debug Control - Easy runtime control of debug messages
 * 
 * Add this to browser console to control debug output:
 * 
 * // Turn OFF all debug messages (production mode)
 * window.debugControl.production();
 * 
 * // Turn ON selective debug messages (development mode)  
 * window.debugControl.development();
 * 
 * // Turn ON all debug messages (full debug mode)
 * window.debugControl.debug();
 * 
 * // Turn OFF everything except errors (quiet mode)
 * window.debugControl.quiet();
 * 
 * // Enable specific categories
 * window.debugControl.enable('SHARED_DATA_MANAGER');
 * window.debugControl.disable('CARDS');
 */

import { setDebugMode, setDebugCategory, getDebugConfig } from './debugConfig';

// Global debug control interface
window.debugControl = {
  /**
   * Apply debug presets
   */
  production: () => {
    setDebugMode('production');
    console.log('🔕 Debug mode: PRODUCTION (errors only)');
  },

  development: () => {
    setDebugMode('development');
    console.log('🔧 Debug mode: DEVELOPMENT (selective logging)');
  },

  debug: () => {
    setDebugMode('debug');  
    console.log('🐛 Debug mode: FULL DEBUG (all logging enabled)');
  },

  quiet: () => {
    setDebugMode('quiet');
    console.log('🤫 Debug mode: QUIET (minimal logging)');
  },

  /**
   * Enable/disable specific categories
   */
  enable: (category) => {
    setDebugCategory(category, true);
    console.log(`✅ Enabled debug category: ${category}`);
  },

  disable: (category) => {
    setDebugCategory(category, false);
    console.log(`❌ Disabled debug category: ${category}`);
  },

  /**
   * Show current configuration
   */
  status: () => {
    const config = getDebugConfig();
    console.log('🔍 Current Debug Configuration:', config);
    
    const enabledCategories = Object.entries(config)
      .filter(([key, value]) => value === true && key !== 'ENABLED')
      .map(([key]) => key);
      
    const disabledCategories = Object.entries(config)
      .filter(([key, value]) => value === false && key !== 'ENABLED')
      .map(([key]) => key);
    
    console.log('✅ Enabled categories:', enabledCategories);
    console.log('❌ Disabled categories:', disabledCategories);
    
    return config;
  },

  /**
   * Available categories for debugging
   */
  categories: () => {
    const categories = [
      'DATA_SERVICE',
      'CARDS', 
      'SERVICES',
      'COMPONENTS',
      'MATCHUP_ANALYSIS',
      'PERFORMANCE',
      'API_CALLS',
      'SHARED_DATA_MANAGER',
      'PINHEADS_PLAYHOUSE',
      'BASEBALL_API',
      'BADGE_SYSTEM',
      'WEATHER_SERVICE',
      'STADIUM_CONTEXT'
    ];
    
    console.log('📋 Available debug categories:');
    categories.forEach(cat => console.log(`  - ${cat}`));
    
    return categories;
  },

  /**
   * Help information
   */
  help: () => {
    console.log(`
🎛️  DEBUG CONTROL HELP
═════════════════════════

QUICK COMMANDS:
• debugControl.production()  - Turn OFF all debug messages
• debugControl.development() - Turn ON selective messages  
• debugControl.debug()       - Turn ON all debug messages
• debugControl.quiet()       - Errors only

CATEGORY CONTROL:
• debugControl.enable('CARDS')     - Enable card debug messages
• debugControl.disable('SERVICES') - Disable service messages
• debugControl.categories()        - List all available categories

STATUS:
• debugControl.status()     - Show current configuration
• debugControl.help()       - Show this help

CURRENT PROBLEM:
Before the fix: 10,000+ console messages causing browser freeze
After the fix: All debug messages controlled by debugConfig
Default mode: PRODUCTION (minimal logging)

USAGE EXAMPLE:
1. Start app normally (production mode - quiet)
2. If you need to debug: debugControl.development()
3. If you need specific category: debugControl.enable('SHARED_DATA_MANAGER')
4. When done debugging: debugControl.production()
    `);
  }
};

// Initialize with helpful message
console.log(`
🎛️  Debug Control Available!
Type: debugControl.help() for commands
Default: Production mode (quiet)
`);

export default window.debugControl;