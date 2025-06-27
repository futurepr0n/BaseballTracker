/**
 * Debug Configuration - Centralized control for all console logging
 * 
 * PROBLEM: 91 files with console.log statements causing message overload
 * SOLUTION: Centralized debug toggles with easy production mode
 */

const debugConfig = {
  // Global debug toggle - OFF BY DEFAULT
  ENABLED: false, // 🔧 CHANGE THIS TO TOGGLE ALL DEBUG MESSAGES
  
  // Category-specific toggles
  DATA_SERVICE: false,       // dataService.js, SharedDataManager.js
  CARDS: false,              // All dashboard cards
  SERVICES: false,           // Background services and analysis
  COMPONENTS: false,         // React components
  MATCHUP_ANALYSIS: false,   // Matchup and prediction services
  PERFORMANCE: false,        // Performance and caching messages
  API_CALLS: false,          // External API communications
  ERROR_LOGGING: true,       // Keep error logging always on
  
  // Specific high-noise sources
  SHARED_DATA_MANAGER: false,  // SharedDataManager verbose logging
  PINHEADS_PLAYHOUSE: false,   // PinheadsPlayhouse analysis
  BASEBALL_API: false,         // BaseballAPI integration
  BADGE_SYSTEM: false,         // Player badge calculations
  WEATHER_SERVICE: false,      // Weather analysis
  STADIUM_CONTEXT: false,      // Stadium analysis
};

/**
 * Wrapper functions for console methods that respect debug config
 */
export const debugLog = {
  /**
   * General debug logging
   */
  log: (category, ...args) => {
    if (!debugConfig.ENABLED) return;
    if (debugConfig[category]) {
      console.log(`[${category}]`, ...args);
    }
  },

  /**
   * Info-level logging
   */
  info: (category, ...args) => {
    if (!debugConfig.ENABLED) return;
    if (debugConfig[category]) {
      console.info(`[${category}]`, ...args);
    }
  },

  /**
   * Warning logging (usually kept on)
   */
  warn: (category, ...args) => {
    if (debugConfig[category] || debugConfig.ERROR_LOGGING) {
      console.warn(`[${category}]`, ...args);
    }
  },

  /**
   * Error logging (always on unless explicitly disabled)
   */
  error: (category, ...args) => {
    if (debugConfig.ERROR_LOGGING) {
      console.error(`[${category}]`, ...args);
    }
  },

  /**
   * Performance logging with timing
   */
  performance: (category, operation, startTime, ...args) => {
    if (!debugConfig.ENABLED || !debugConfig.PERFORMANCE) return;
    const duration = Date.now() - startTime;
    console.log(`[${category}] ${operation} completed in ${duration}ms`, ...args);
  },

  /**
   * Data service specific logging
   */
  dataService: (...args) => {
    if (debugConfig.ENABLED && debugConfig.DATA_SERVICE) {
      console.log('[DATA_SERVICE]', ...args);
    }
  },

  /**
   * Card component logging
   */
  card: (cardName, ...args) => {
    if (debugConfig.ENABLED && debugConfig.CARDS) {
      console.log(`[CARD:${cardName}]`, ...args);
    }
  },

  /**
   * Service logging
   */
  service: (serviceName, ...args) => {
    if (debugConfig.ENABLED && debugConfig.SERVICES) {
      console.log(`[SERVICE:${serviceName}]`, ...args);
    }
  }
};

/**
 * Quick configuration presets
 */
export const debugPresets = {
  /**
   * Production mode - minimal logging
   */
  production: () => {
    Object.keys(debugConfig).forEach(key => {
      if (key !== 'ERROR_LOGGING') {
        debugConfig[key] = false;
      }
    });
    debugConfig.ENABLED = false;
    debugConfig.ERROR_LOGGING = true;
  },

  /**
   * Development mode - selective logging
   */
  development: () => {
    debugConfig.ENABLED = true;
    debugConfig.DATA_SERVICE = false;  // Still noisy
    debugConfig.CARDS = false;         // Very noisy
    debugConfig.SERVICES = false;      // Noisy
    debugConfig.PERFORMANCE = true;    // Useful
    debugConfig.ERROR_LOGGING = true;  // Essential
  },

  /**
   * Debug mode - most logging enabled
   */
  debug: () => {
    Object.keys(debugConfig).forEach(key => {
      debugConfig[key] = true;
    });
    debugConfig.ENABLED = true;
  },

  /**
   * Quiet mode - errors only
   */
  quiet: () => {
    Object.keys(debugConfig).forEach(key => {
      debugConfig[key] = false;
    });
    debugConfig.ENABLED = false;
    debugConfig.ERROR_LOGGING = true;
  }
};

/**
 * Apply a preset configuration
 */
export const setDebugMode = (preset) => {
  if (debugPresets[preset]) {
    debugPresets[preset]();
    console.log(`[DEBUG CONFIG] Applied ${preset} mode`);
  } else {
    console.warn(`[DEBUG CONFIG] Unknown preset: ${preset}`);
  }
};

/**
 * Get current debug configuration
 */
export const getDebugConfig = () => {
  return { ...debugConfig };
};

/**
 * Set individual debug category
 */
export const setDebugCategory = (category, enabled) => {
  if (category in debugConfig) {
    debugConfig[category] = enabled;
    console.log(`[DEBUG CONFIG] ${category} ${enabled ? 'enabled' : 'disabled'}`);
  }
};

// Auto-apply production mode by default
debugPresets.production();

export default debugLog;