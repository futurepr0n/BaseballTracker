/**
 * Console Quiet Mode - Emergency override for console methods
 * 
 * EMERGENCY FIX: Temporarily disable all console output except errors
 * This provides immediate relief from console spam while we finish
 * converting all files to use debugLog
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  trace: console.trace
};

// Quiet mode state - ULTRA AGGRESSIVE MODE FOR PERFORMANCE
let quietModeEnabled = true; // Keep quiet mode enabled to suppress legacy console.log

/**
 * Override console methods with conditional logging
 */
const setupQuietConsole = () => {
  // Override console.log - COMPLETELY SILENT in quiet mode
  console.log = (...args) => {
    if (!quietModeEnabled) {
      originalConsole.log(...args);
    }
    // In quiet mode: NO OUTPUT AT ALL (suppresses all console.log completely)
  };
  
  // Override console.info - COMPLETELY SILENT in quiet mode
  console.info = (...args) => {
    if (!quietModeEnabled) {
      originalConsole.info(...args);
    }
    // In quiet mode: NO OUTPUT AT ALL
  };
  
  // Override console.warn - MOSTLY SILENT in quiet mode
  console.warn = (...args) => {
    if (!quietModeEnabled) {
      originalConsole.warn(...args);
    } else {
      // In quiet mode, only show critical warnings
      const message = args.join(' ');
      if (message.includes('ERROR') || message.includes('FAILED') || message.includes('CRITICAL')) {
        originalConsole.warn('[CRITICAL]', ...args);
      }
      // All other warnings suppressed
    }
  };
  
  // Keep console.error always enabled (important for debugging)
  console.error = (...args) => {
    originalConsole.error(...args);
  };
  
  // Override console.debug - silent in quiet mode
  console.debug = (...args) => {
    if (!quietModeEnabled) {
      originalConsole.debug(...args);
    }
  };
  
  // Override console.trace - silent in quiet mode  
  console.trace = (...args) => {
    if (!quietModeEnabled) {
      originalConsole.trace(...args);
    }
  };
};

/**
 * Control functions available globally
 */
window.consoleQuiet = {
  /**
   * Enable quiet mode (default) - minimal console output
   */
  enable: () => {
    quietModeEnabled = true;
    originalConsole.log('🔇 Console Quiet Mode ENABLED - Minimal output');
  },
  
  /**
   * Disable quiet mode - normal console output
   */
  disable: () => {
    quietModeEnabled = false;
    originalConsole.log('🔊 Console Quiet Mode DISABLED - Normal output');
  },
  
  /**
   * Check current quiet mode status
   */
  status: () => {
    const status = quietModeEnabled ? 'ENABLED' : 'DISABLED';
    originalConsole.log(`🔍 Console Quiet Mode: ${status}`);
    return quietModeEnabled;
  },
  
  /**
   * Restore original console methods
   */
  restore: () => {
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
    console.trace = originalConsole.trace;
    originalConsole.log('🔄 Console methods restored to original');
  },
  
  /**
   * Force log something even in quiet mode
   */
  forceLog: (...args) => {
    originalConsole.log('[FORCE LOG]', ...args);
  }
};

// Set up quiet console immediately
setupQuietConsole();

// Show initial status - but only once
setTimeout(() => {
  originalConsole.log('🔇 Console Quiet Mode ACTIVE - Debug suppressed. Type consoleQuiet.help() for controls');
}, 100);

// Help function
window.consoleQuiet.help = () => {
  originalConsole.log(`
🔇 CONSOLE QUIET MODE HELP
═════════════════════════

EMERGENCY FIX: Reduces console spam while we finish debug conversion

COMMANDS:
• consoleQuiet.enable()   - Enable quiet mode (minimal output)
• consoleQuiet.disable()  - Disable quiet mode (normal output)  
• consoleQuiet.status()   - Check current mode
• consoleQuiet.restore()  - Restore original console methods
• consoleQuiet.forceLog() - Force log something in quiet mode

CURRENT BEHAVIOR:
• console.log() - ${quietModeEnabled ? 'SILENT' : 'NORMAL'}
• console.info() - ${quietModeEnabled ? 'SILENT' : 'NORMAL'}
• console.warn() - ${quietModeEnabled ? 'FILTERED' : 'NORMAL'}
• console.error() - ALWAYS ENABLED

USE WITH DEBUG CONTROL:
1. consoleQuiet.enable() - Turn off legacy console spam
2. debugControl.development() - Turn on new debug system
3. Best of both worlds!
  `);
};

export default window.consoleQuiet;