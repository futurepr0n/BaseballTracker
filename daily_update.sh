#!/bin/bash
# daily_update.sh - Script to generate static predictions and update the dashboard data

# Set working directory to script location
cd "$(dirname "$0")"

# Define date for processing (defaults to today)
DATE=$(date +"%Y-%m-%d")
if [ "$1" != "" ]; then
  DATE=$1
fi

echo "====================================="
echo "MLB Stats Tracker - Daily Update"
echo "Date: $DATE"
echo "====================================="

# 1. Generate all data (HR predictions and player performance)
echo "Generating data files..."
node src/services/generateHRPredictions3.js $DATE

# Check if generation was successful
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to generate data files"
  exit 1
fi

echo "Data generation completed successfully!"
echo "====================================="

# 2. Generate team statistics
echo "Generating team statistics..."
node src/services/generateTeamStats.js $DATE

if [ $? -ne 0 ]; then
  echo "WARNING: Failed to generate team stats (non-critical)"
else
  echo "✓ Team stats generated successfully"
fi

echo "====================================="

# 2. Verify files were created
HR_PRED_FILE="public/data/predictions/hr_predictions_${DATE}.json"
PERF_FILE="public/data/predictions/player_performance_${DATE}.json"

if [ -f "$HR_PRED_FILE" ] && [ -f "$PERF_FILE" ]; then
  echo "✓ HR Predictions file created: $HR_PRED_FILE"
  echo "✓ Player Performance file created: $PERF_FILE"
else
  echo "WARNING: One or more files were not created properly"
fi

# 3. Log completion
echo "====================================="
echo "Daily update completed at $(date)"
echo "Data is ready for the dashboard"
echo "====================================="

exit 0