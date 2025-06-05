#!/bin/bash
# generate_rolling_stats.sh - Script to generate comprehensive rolling statistics

# Set working directory to script location
cd "$(dirname "$0")"

# Define date for processing (defaults to today)
DATE=$(date +"%Y-%m-%d")
if [ "$1" != "" ]; then
  DATE=$1
fi

echo "====================================="
echo "MLB Stats - Rolling Statistics Generation"
echo "Date: $DATE"
echo "====================================="

# 1. Generate rolling statistics
echo "Generating comprehensive rolling statistics..."
node src/services/generateRollingStats.js $DATE

# Check if generation was successful
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to generate rolling statistics"
  exit 1
fi

echo "Rolling statistics generation completed successfully!"
echo "====================================="

# 2. Verify files were created
ROLLING_DIR="public/data/rolling_stats"

echo "Checking generated files:"
for period in "season" "last_30" "last_7" "current"; do
  STATS_FILE="${ROLLING_DIR}/rolling_stats_${period}_${DATE}.json"
  LATEST_FILE="${ROLLING_DIR}/rolling_stats_${period}_latest.json"
  
  if [ -f "$STATS_FILE" ]; then
    echo "✓ ${period} stats file created: $STATS_FILE"
  else
    echo "⚠ ${period} stats file missing: $STATS_FILE"
  fi
  
  if [ -f "$LATEST_FILE" ]; then
    echo "✓ ${period} latest file created: $LATEST_FILE"
  else
    echo "⚠ ${period} latest file missing: $LATEST_FILE"
  fi
done

# 3. Show summary
echo "====================================="
echo "Rolling Statistics Summary:"

if [ -f "${ROLLING_DIR}/rolling_stats_season_latest.json" ]; then
  echo "Season stats available:"
  node -e "
    const fs = require('fs');
    try {
      const data = JSON.parse(fs.readFileSync('${ROLLING_DIR}/rolling_stats_season_latest.json', 'utf8'));
      console.log(\`  Total players processed: \${data.totalPlayers}\`);
      console.log(\`  Top hitters available: \${data.topHitters.length}\`);
      console.log(\`  HR leaders available: \${data.topHRLeaders.length}\`);
      console.log(\`  Strikeout leaders available: \${data.topStrikeoutPitchers.length}\`);
      if (data.topHRLeaders.length > 0) {
        console.log(\`  HR leader: \${data.topHRLeaders[0].name} (\${data.topHRLeaders[0].team}) - \${data.topHRLeaders[0].HR} HRs\`);
      }
      if (data.topHitters.length > 0) {
        console.log(\`  Hit leader: \${data.topHitters[0].name} (\${data.topHitters[0].team}) - \${data.topHitters[0].H} hits\`);
      }
    } catch (error) {
      console.log('  Could not parse season stats file');
    }
  "
fi

echo "====================================="
echo "Rolling statistics generation completed at $(date)"
echo "Files are ready for the dashboard"
echo "====================================="

exit 0