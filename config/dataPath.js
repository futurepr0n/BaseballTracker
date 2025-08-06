const path = require('path');
require('dotenv').config();

/**
 * Centralized data path configuration for BaseballTracker
 * This configuration enables the app to use centralized data storage in BaseballData
 * instead of duplicating data across public/data and build/data directories
 */

// Determine if we're in production based on environment
const isProduction = process.env.NODE_ENV === 'production';

// Get data path from environment variables or fallback to defaults
const getEnvironmentDataPath = () => {
  // First check for explicit environment variable
  if (process.env.BASEBALL_DATA_PATH) {
    return path.resolve(process.env.BASEBALL_DATA_PATH);
  }
  
  // Fallback to defaults based on environment
  if (isProduction) {
    return '/app/BaseballData/data';
  } else {
    // Development fallback - relative to config file
    return path.join(__dirname, '../../../BaseballData/data');
  }
};

// Base paths for different environments
const PATHS = {
  // Use environment-aware path resolution
  centralized: getEnvironmentDataPath(),
  
  // Legacy paths (for backward compatibility during migration)
  legacyPublic: path.join(__dirname, '../public/data'),
  legacyBuild: path.join(__dirname, '../build/data')
};

// Get the appropriate data path based on environment
const getDataPath = () => {
  return PATHS.centralized;
};

// Helper function to resolve paths within the data directory
const resolveDataPath = (...segments) => {
  return path.join(getDataPath(), ...segments);
};

// Check if we're using symlinks (for gradual migration)
const isUsingSymlinks = () => {
  const fs = require('fs');
  try {
    // Check if public/data is a symlink
    return fs.lstatSync(PATHS.legacyPublic).isSymbolicLink();
  } catch (error) {
    return false;
  }
};

// Export configuration
module.exports = {
  // Main data path
  DATA_PATH: getDataPath(),
  
  // Path resolver function
  resolveDataPath,
  
  // Individual path getters for specific data types
  paths: {
    // Base data directory
    data: getDataPath(),
    
    // Specific data subdirectories
    predictions: resolveDataPath('predictions'),
    propAnalysis: resolveDataPath('predictions'), // Prop analysis files go in predictions directory
    stats: resolveDataPath('stats'),
    rollingStats: resolveDataPath('rolling_stats'),
    teamStats: resolveDataPath('team_stats'),
    rosters: resolveDataPath('rosters.json'),
    odds: resolveDataPath('odds'),
    lineups: resolveDataPath('lineups'),
    hellraiser: resolveDataPath('hellraiser'),
    handedness: resolveDataPath('handedness'),
    stadium: resolveDataPath('stadium'),
    multiHitStats: resolveDataPath('multi_hit_stats'),
    
    // Year-based game data
    gameData: (year) => resolveDataPath(year.toString()),
    monthData: (year, month) => resolveDataPath(year.toString(), month),
    
    // Legacy paths (for components not yet migrated)
    legacyPublic: PATHS.legacyPublic,
    legacyBuild: PATHS.legacyBuild
  },
  
  // Utility functions
  isProduction,
  isUsingSymlinks,
  
  // Environment info for debugging
  env: {
    NODE_ENV: process.env.NODE_ENV,
    BASEBALL_DATA_PATH: process.env.BASEBALL_DATA_PATH,
    configuredPath: getDataPath()
  }
};