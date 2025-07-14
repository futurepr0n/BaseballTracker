#!/bin/bash

# Daily Cleanup Integration Script
# 
# Integrates smart cleanup into the daily data processing pipeline.
# Runs after data ingestion but before stat generation for optimal results.
# 
# Usage: ./scripts/automation/dailyCleanupIntegration.sh [date]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
DATE=${1:-$(date +%Y-%m-%d)}

echo "🔄 Daily Cleanup Integration - $DATE"
echo "================================="

cd "$BASE_DIR"

# Step 1: Check if data exists for the date
echo "📅 Checking data availability for $DATE..."

# Extract month and day from date
YEAR=$(echo $DATE | cut -d'-' -f1)
MONTH_NUM=$(echo $DATE | cut -d'-' -f2)
DAY=$(echo $DATE | cut -d'-' -f3)

# Convert month number to month name
case $MONTH_NUM in
    01) MONTH_NAME="january" ;;
    02) MONTH_NAME="february" ;;
    03) MONTH_NAME="march" ;;
    04) MONTH_NAME="april" ;;
    05) MONTH_NAME="may" ;;
    06) MONTH_NAME="june" ;;
    07) MONTH_NAME="july" ;;
    08) MONTH_NAME="august" ;;
    09) MONTH_NAME="september" ;;
    10) MONTH_NAME="october" ;;
    11) MONTH_NAME="november" ;;
    12) MONTH_NAME="december" ;;
    *) echo "❌ Invalid month: $MONTH_NUM"; exit 1 ;;
esac

DATA_FILE="public/data/2025/${MONTH_NAME}/${MONTH_NAME}_${DAY}_${YEAR}.json"
echo "🔍 Looking for: $DATA_FILE"

if [ ! -f "$DATA_FILE" ]; then
    echo "⚠️  No data found for $DATE - skipping cleanup"
    exit 0
fi

echo "✅ Data file found: $DATA_FILE"

# Step 2: Run smart cleanup controller
echo -e "\n🧠 Running smart cleanup analysis..."
CLEANUP_RESULT=$(node scripts/automation/smartCleanupController.js --dry-run 2>&1)
CLEANUP_EXIT_CODE=$?

echo "$CLEANUP_RESULT"

# Extract decision from output
DECISION=$(echo "$CLEANUP_RESULT" | grep "SMART CLEANUP RESULT:" | cut -d':' -f2 | tr -d ' \n')

echo -e "\n📊 Cleanup Decision: $DECISION"

# Step 3: Handle decision
case "$DECISION" in
    "AUTO_EXECUTE")
        echo "✅ Automatic cleanup conditions met - executing..."
        node scripts/automation/smartCleanupController.js
        CLEANUP_SUCCESS=$?
        
        if [ $CLEANUP_SUCCESS -eq 0 ]; then
            echo "✅ Automatic cleanup completed successfully"
            
            # Regenerate dependent data
            echo "🔄 Regenerating dependent data..."
            npm run generate-milestones
            ./generate_rolling_stats.sh $DATE
            
        else
            echo "❌ Automatic cleanup failed - continuing with existing data"
        fi
        ;;
        
    "MANUAL_REVIEW")
        echo "🔍 Manual review required - high-confidence duplicates detected"
        echo "💡 Run interactive review: node scripts/review/interactiveReview.js"
        echo "📋 Or detailed analysis: node scripts/review/detailedAnalysisDashboard.js"
        ;;
        
    "BLOCK")
        echo "⚠️  Safety thresholds exceeded - duplicate patterns require investigation"
        echo "📊 Review automation report in scripts/automation/reports/"
        ;;
        
    *)
        echo "❓ Unknown decision: $DECISION - proceeding without cleanup"
        ;;
esac

# Step 4: Log integration results
LOG_DIR="scripts/automation/logs"
mkdir -p "$LOG_DIR"

cat >> "$LOG_DIR/daily_integration.log" << EOF
$(date -Iseconds): DATE=$DATE DECISION=$DECISION EXIT_CODE=$CLEANUP_EXIT_CODE
EOF

echo -e "\n🎯 Daily cleanup integration completed"
echo "📝 Log entry added to $LOG_DIR/daily_integration.log"

# Step 5: Provide next steps based on decision
if [ "$DECISION" = "MANUAL_REVIEW" ] || [ "$DECISION" = "BLOCK" ]; then
    echo -e "\n💡 Next Steps:"
    echo "   1. Review duplicate analysis: node scripts/review/detailedAnalysisDashboard.js"
    echo "   2. Interactive cleanup: node scripts/review/interactiveReview.js"
    echo "   3. Manual execution: node scripts/data-validation/stagedProductionTest.js --execute"
    echo "   4. Check automation reports in scripts/automation/reports/"
fi

exit $CLEANUP_EXIT_CODE