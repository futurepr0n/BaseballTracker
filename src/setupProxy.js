/**
 * Development proxy configuration to serve data from centralized BaseballData location
 * This allows the React dev server to serve /data/* requests from BaseballData/data/
 * instead of BaseballTracker/public/data/
 */

const express = require('express');
const path = require('path');

module.exports = function(app) {
  // Serve data files from centralized BaseballData location
  const centralizedDataPath = path.resolve(__dirname, '../../BaseballData/data');
  
  console.log(`🔗 Centralized Data Proxy: Serving /data/* from ${centralizedDataPath}`);
  
  // Middleware to serve data from centralized location
  app.use('/data', express.static(centralizedDataPath, {
    // Enable CORS for development
    setHeaders: (res, filePath) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, HEAD');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Cache-Control');
      
      // Set appropriate content types
      if (filePath.endsWith('.json')) {
        res.header('Content-Type', 'application/json');
      } else if (filePath.endsWith('.csv')) {
        res.header('Content-Type', 'text/csv');
      }
      
      // Disable caching for development
      res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.header('Pragma', 'no-cache');
      res.header('Expires', '0');
    },
    // Handle directory index requests
    index: false,
    // Set max age to 0 for development
    maxAge: 0
  }));
  
  console.log(`✅ Centralized data proxy configured successfully`);
};