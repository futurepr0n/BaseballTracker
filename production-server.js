#!/usr/bin/env node

/**
 * Production server for BaseballTracker
 * Serves the built React app with proper routing to centralized data
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Path to centralized data
const CENTRALIZED_DATA_PATH = path.join(__dirname, '../BaseballData/data');

console.log('📁 Centralized data path:', CENTRALIZED_DATA_PATH);
console.log('🔍 Checking if centralized data exists:', fs.existsSync(CENTRALIZED_DATA_PATH));

// Serve static files from build directory
app.use(express.static(path.join(__dirname, 'build')));

// Route all /data requests to centralized location
app.use('/data', express.static(CENTRALIZED_DATA_PATH));

// Handle React routing - serve index.html for all non-data routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.get('/players', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.get('/teams', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.get('/games', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.get('/capsheet', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.get('/matchup-analyzer', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.get('/pinheads-playhouse', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// 404 for unknown routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/data/')) {
    return res.status(404).send('Data file not found');
  }
  res.status(404).send('Page not found');
});

app.listen(PORT, () => {
  console.log(`🚀 Production server running on http://localhost:${PORT}`);
  console.log(`📊 Serving centralized data from: ${CENTRALIZED_DATA_PATH}`);
});