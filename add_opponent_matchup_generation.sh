#!/bin/bash

# Addition for daily_update.sh
# Add this section after the "Generate team statistics" step (around line ~270)

# Step 7.5: Generate opponent matchup statistics
print_status $BLUE "🎯 Generating opponent matchup statistics..."
node src/services/generateOpponentMatchupStats.js $DATE

if [ $? -ne 0 ]; then
    print_status $YELLOW "⚠️  WARNING: Failed to generate opponent matchup stats (non-critical)"
else
    print_status $GREEN "✅ Opponent matchup stats generated successfully"
    ((files_created++))
fi