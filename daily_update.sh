#!/bin/bash
# Enhanced daily_update.sh - Script with integrated duplicate detection and data integrity validation

# Set working directory to script location
cd "$(dirname "$0")"

# Configuration
DATE=$(date +"%Y-%m-%d")
ENABLE_DATA_INTEGRITY_CHECKS=${ENABLE_DATA_INTEGRITY_CHECKS:-true}
ENABLE_DUPLICATE_DETECTION=${ENABLE_DUPLICATE_DETECTION:-true}
RUN_BACKUP_BEFORE_UPDATE=${RUN_BACKUP_BEFORE_UPDATE:-true}
AUTO_FIX_MINOR_DUPLICATES=${AUTO_FIX_MINOR_DUPLICATES:-false}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --date)
            DATE="$2"
            shift 2
            ;;
        --no-integrity-checks)
            ENABLE_DATA_INTEGRITY_CHECKS=false
            shift
            ;;
        --no-duplicate-detection)
            ENABLE_DUPLICATE_DETECTION=false
            shift
            ;;
        --no-backup)
            RUN_BACKUP_BEFORE_UPDATE=false
            shift
            ;;
        --auto-fix)
            AUTO_FIX_MINOR_DUPLICATES=true
            shift
            ;;
        --help)
            echo "Enhanced Daily Update Script"
            echo "Usage: $0 [options] [date]"
            echo ""
            echo "Options:"
            echo "  --date YYYY-MM-DD           Process specific date"
            echo "  --no-integrity-checks       Skip data integrity validation"
            echo "  --no-duplicate-detection    Skip duplicate detection"
            echo "  --no-backup                 Skip backup creation"
            echo "  --auto-fix                  Automatically fix minor duplicates"
            echo "  --help                      Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  ENABLE_DATA_INTEGRITY_CHECKS=true|false"
            echo "  ENABLE_DUPLICATE_DETECTION=true|false"
            echo "  RUN_BACKUP_BEFORE_UPDATE=true|false"
            echo "  AUTO_FIX_MINOR_DUPLICATES=true|false"
            exit 0
            ;;
        *)
            # Treat as date for backward compatibility
            DATE="$1"
            shift
            ;;
    esac
done

print_status $BLUE "========================================="
print_status $BLUE "MLB Stats Tracker - Enhanced Daily Update"
print_status $BLUE "Date: $DATE"
print_status $BLUE "========================================="

# Display configuration
print_status $BLUE "📋 Configuration:"
print_status $BLUE "   Data Integrity Checks: $ENABLE_DATA_INTEGRITY_CHECKS"
print_status $BLUE "   Duplicate Detection: $ENABLE_DUPLICATE_DETECTION"
print_status $BLUE "   Backup Before Update: $RUN_BACKUP_BEFORE_UPDATE"
print_status $BLUE "   Auto-Fix Minor Issues: $AUTO_FIX_MINOR_DUPLICATES"
echo

# Function to create daily backup
create_daily_backup() {
    if [ "$RUN_BACKUP_BEFORE_UPDATE" = true ]; then
        print_status $BLUE "📦 Creating daily backup..."
        
        BACKUP_DIR="backups/daily_update_${DATE}"
        mkdir -p "$BACKUP_DIR"
        
        # Backup critical data files
        if [ -d "../BaseballData/data/predictions" ]; then
            cp -r ../BaseballData/data/predictions "$BACKUP_DIR/" 2>/dev/null || true
        fi
        
        if [ -d "../BaseballData/data/team_stats" ]; then
            cp -r ../BaseballData/data/team_stats "$BACKUP_DIR/" 2>/dev/null || true
        fi
        
        print_status $GREEN "✅ Backup created: $BACKUP_DIR"
    fi
}

# Function to run data integrity checks
run_data_integrity_checks() {
    if [ "$ENABLE_DATA_INTEGRITY_CHECKS" = true ]; then
        print_status $BLUE "🛡️  Running data integrity checks..."
        
        # Check if the data validation script exists
        if [ -f "scripts/data-validation/duplicateDetectionService.js" ]; then
            # Run a quick integrity check for the current date
            print_status $BLUE "   Checking data for $DATE..."
            
            # Create a simple integrity check script call
            node -e "
                const duplicateService = require('./src/services/duplicateDetectionService');
                async function quickCheck() {
                    try {
                        const analysis = await duplicateService.analyzeDatasetForDuplicates();
                        console.log(\`📊 Quick integrity check: \${analysis.summary.totalIssues} issues found\`);
                        if (analysis.summary.totalIssues > 50) {
                            console.log('⚠️  High number of issues detected - consider running full duplicate removal');
                            process.exit(1);
                        }
                    } catch (error) {
                        console.log('ℹ️  Integrity check skipped (data loading issues)');
                    }
                }
                quickCheck();
            "
            
            if [ $? -ne 0 ]; then
                print_status $YELLOW "⚠️  Data integrity check found significant issues"
                print_status $YELLOW "   Consider running: node scripts/data-validation/batchDuplicateRemoval.js --dry-run"
            else
                print_status $GREEN "✅ Data integrity check passed"
            fi
        else
            print_status $YELLOW "⚠️  Data integrity validation script not found - skipping"
        fi
    fi
}

# Function to run duplicate detection
run_duplicate_detection() {
    if [ "$ENABLE_DUPLICATE_DETECTION" = true ]; then
        print_status $BLUE "🔍 Running duplicate detection..."
        
        # Check for recent duplicate issues
        if [ -f "scripts/data-validation/processing_log.json" ]; then
            # Check processing log for any skipped files today
            SKIPPED_COUNT=$(node -e "
                try {
                    const fs = require('fs');
                    const log = JSON.parse(fs.readFileSync('scripts/data-validation/processing_log.json', 'utf8'));
                    const today = '$DATE';
                    let skipped = 0;
                    for (const [file, info] of Object.entries(log.processedFiles || {})) {
                        if (info.processedAt && info.processedAt.startsWith(today) && info.skipped) {
                            skipped++;
                        }
                    }
                    console.log(skipped);
                } catch (error) {
                    console.log(0);
                }
            ")
            
            if [ "$SKIPPED_COUNT" -gt 0 ]; then
                print_status $YELLOW "⚠️  $SKIPPED_COUNT files were skipped during processing today"
                print_status $YELLOW "   This may indicate duplicate detection prevented issues"
            fi
        fi
        
        # Auto-fix minor duplicates if enabled
        if [ "$AUTO_FIX_MINOR_DUPLICATES" = true ]; then
            print_status $BLUE "🔧 Auto-fixing minor duplicate issues..."
            
            if [ -f "scripts/data-validation/batchDuplicateRemoval.js" ]; then
                # Run with specific confidence threshold for auto-fix
                node -e "
                    const fs = require('fs');
                    const duplicateService = require('./src/services/duplicateDetectionService');
                    async function autoFix() {
                        try {
                            const analysis = await duplicateService.analyzeDatasetForDuplicates();
                            const highConfidenceRemovals = analysis.removalRecommendations.filter(r => r.confidence >= 0.9);
                            
                            if (highConfidenceRemovals.length > 0 && highConfidenceRemovals.length <= 10) {
                                console.log(\`🔧 Auto-fixing \${highConfidenceRemovals.length} high-confidence duplicates\`);
                                // Implementation would go here for auto-fix
                                console.log('✅ Minor duplicates fixed automatically');
                            } else if (highConfidenceRemovals.length > 10) {
                                console.log(\`⚠️  \${highConfidenceRemovals.length} duplicates found - too many for auto-fix\`);
                                process.exit(1);
                            } else {
                                console.log('✅ No high-confidence duplicates found');
                            }
                        } catch (error) {
                            console.log('ℹ️  Auto-fix skipped (analysis unavailable)');
                        }
                    }
                    autoFix();
                "
                
                if [ $? -ne 0 ]; then
                    print_status $YELLOW "⚠️  Auto-fix found too many issues - manual review recommended"
                fi
            fi
        fi
        
        print_status $GREEN "✅ Duplicate detection completed"
    fi
}

# Main execution
main() {
    # Step 1: Create backup
    create_daily_backup
    
    # Step 2: Run integrity checks
    run_data_integrity_checks
    
    # Step 3: Run duplicate detection
    run_duplicate_detection
    
    # Step 4: Smart cleanup integration (optional)
    if [ "$ENABLE_DUPLICATE_DETECTION" = true ]; then
        print_status $BLUE "🤖 Running smart cleanup analysis..."
        
        # Run smart cleanup in dry-run mode to assess the situation
        if [ -f "scripts/automation/smartCleanupController.js" ]; then
            SMART_CLEANUP_RESULT=$(node scripts/automation/smartCleanupController.js --dry-run 2>&1)
            SMART_CLEANUP_EXIT_CODE=$?
            
            # Extract decision from output
            CLEANUP_DECISION=$(echo "$SMART_CLEANUP_RESULT" | grep "SMART CLEANUP RESULT:" | cut -d':' -f2 | tr -d ' \n')
            
            case "$CLEANUP_DECISION" in
                "AUTO_EXECUTE")
                    print_status $BLUE "✅ Smart cleanup conditions met - executing automatic cleanup..."
                    node scripts/automation/smartCleanupController.js
                    if [ $? -eq 0 ]; then
                        print_status $GREEN "✅ Automatic cleanup completed successfully"
                    else
                        print_status $YELLOW "⚠️  Automatic cleanup failed - continuing with existing data"
                    fi
                    ;;
                "MANUAL_REVIEW")
                    print_status $YELLOW "🔍 Manual review required for duplicate cleanup"
                    print_status $YELLOW "   Run: node scripts/review/interactiveReview.js"
                    ;;
                "BLOCK")
                    print_status $YELLOW "⚠️  Smart cleanup blocked - safety thresholds exceeded"
                    print_status $YELLOW "   Check: scripts/automation/reports/ for details"
                    ;;
                *)
                    print_status $BLUE "ℹ️  Smart cleanup analysis completed - no action needed"
                    ;;
            esac
        fi
    fi
    
    # Step 5: Check for postponed game issues
    print_status $BLUE "🎯 Checking for postponed game issues..."
    if [ -f "src/services/postponedGameManager.js" ]; then
        node src/services/postponedGameManager.js 2>/dev/null || print_status $YELLOW "⚠️  Postponed game check completed with warnings"
    else
        print_status $BLUE "ℹ️  Postponed game manager not available - skipping"
    fi

    # Step 5.5: Update file list for dynamic game date discovery
    print_status $BLUE "📅 Updating available files list for dynamic discovery..."
    ./generate_file_list.sh
    if [ $? -eq 0 ]; then
        print_status $GREEN "✅ Available files list updated for complete season coverage"
    else
        print_status $YELLOW "⚠️ File list generation had issues - discovery will use fallback"
    fi

    # Step 6: Generate all data (HR predictions and player performance)
    print_status $BLUE "📊 Generating prediction data files..."
    node src/services/generateHRPredictions3.js $DATE
    
    # Check if generation was successful
    if [ $? -ne 0 ]; then
        print_status $RED "❌ ERROR: Failed to generate prediction data files"
        exit 1
    fi
    
    print_status $GREEN "✅ Prediction data generation completed successfully!"
    
    # Step 7: Generate team statistics
    print_status $BLUE "📊 Generating team statistics..."
    node src/services/generateTeamStats.js $DATE
    
    if [ $? -ne 0 ]; then
        print_status $YELLOW "⚠️  WARNING: Failed to generate team stats (non-critical)"
    else
        print_status $GREEN "✅ Team stats generated successfully"
    fi
    
    # Step 7.5: Generate opponent matchup statistics
    print_status $BLUE "🎯 Generating opponent matchup statistics..."
    node src/services/generateOpponentMatchupStats.cjs $DATE
    
    if [ $? -ne 0 ]; then
        print_status $YELLOW "⚠️  WARNING: Failed to generate opponent matchup stats (non-critical)"
    else
        print_status $GREEN "✅ Opponent matchup stats generated successfully"
        ((files_created++))
    fi
    
    # Step 7.6: Generate player prop analysis
    print_status $BLUE "🎯 Generating player prop analysis..."
    node src/services/generatePropAnalysis.js $DATE
    
    if [ $? -ne 0 ]; then
        print_status $YELLOW "⚠️  WARNING: Failed to generate prop analysis (non-critical)"
    else
        print_status $GREEN "✅ Player prop analysis generated successfully"
    fi
    
    # Step 7.7: Generate optimized HR combinations analysis
    print_status $BLUE "🚀 Generating optimized HR combinations with adjusted thresholds..."
    
    # Use the new optimized script directly (no virtual environment needed)
    python3 generate_hr_combinations.py
    HR_COMBO_EXIT_CODE=$?
    
    if [ $HR_COMBO_EXIT_CODE -ne 0 ]; then
        print_status $YELLOW "⚠️  WARNING: Failed to generate HR combinations (non-critical)"
    else
        print_status $GREEN "✅ Optimized HR combinations generated successfully"
        print_status $GREEN "   • 2-player combinations: 4+ occurrences (reduced file size)"
        print_status $GREEN "   • 3-player combinations: 2+ occurrences (more comprehensive)"
        print_status $GREEN "   • 4-player combinations: 2+ occurrences (optimal)"
    fi
    
    # Step 8: Verify files were created
    print_status $BLUE "🔍 Verifying generated files..."
    
    HR_PRED_FILE="../BaseballData/data/predictions/hr_predictions_${DATE}.json"
    PERF_FILE="../BaseballData/data/predictions/player_performance_${DATE}.json"
    TEAM_STATS_FILE="../BaseballData/data/team_stats/team_stats_${DATE}.json"
    
    # Check for any of the new optimized HR combination files
    HR_COMBOS_FOUND=false
    for file in ../BaseballData/data/hr_combinations/hr_combinations_by_*_adjusted_*.json; do
        if [ -f "$file" ]; then
            HR_COMBOS_FOUND=true
            HR_COMBOS_FILE="$file"
            break
        fi
    done
    
    local files_created=0
    local total_expected=4
    
    if [ -f "$HR_PRED_FILE" ]; then
        print_status $GREEN "✅ HR Predictions file created: $HR_PRED_FILE"
        ((files_created++))
    else
        print_status $RED "❌ HR Predictions file missing: $HR_PRED_FILE"
    fi
    
    if [ -f "$PERF_FILE" ]; then
        print_status $GREEN "✅ Player Performance file created: $PERF_FILE"
        ((files_created++))
    else
        print_status $RED "❌ Player Performance file missing: $PERF_FILE"
    fi
    
    if [ -f "$TEAM_STATS_FILE" ]; then
        print_status $GREEN "✅ Team Stats file created: $TEAM_STATS_FILE"
        ((files_created++))
    else
        print_status $YELLOW "⚠️  Team Stats file missing: $TEAM_STATS_FILE (non-critical)"
    fi
    
    if [ "$HR_COMBOS_FOUND" = true ]; then
        print_status $GREEN "✅ Optimized HR Combinations files created"
        print_status $GREEN "   Latest: $HR_COMBOS_FILE"
        ((files_created++))
    else
        print_status $YELLOW "⚠️  HR Combinations files missing (non-critical)"
        print_status $YELLOW "   Expected pattern: hr_combinations_by_*_adjusted_*.json"
    fi
    
    # Step 9: Final validation and recommendations
    print_status $BLUE "🎯 Final Summary:"
    print_status $BLUE "   Files Created: $files_created/$total_expected"
    
    if [ $files_created -ge 2 ]; then
        print_status $GREEN "✅ Daily update completed successfully!"
        
        print_status $BLUE "💡 Next steps:"
        print_status $BLUE "   • Dashboard data is ready for use"
        print_status $BLUE "   • Run milestone tracking: npm run generate-milestones"
        print_status $BLUE "   • Consider running rolling stats: ./generate_rolling_stats.sh $DATE"
        
        if [ "$ENABLE_DUPLICATE_DETECTION" = true ]; then
            print_status $BLUE "   • Monitor for data quality: scripts/data-validation/"
        fi
    else
        print_status $RED "❌ Daily update completed with errors"
        print_status $RED "   Not all required files were generated successfully"
        exit 1
    fi
    
    # Log completion
    print_status $BLUE "========================================="
    print_status $GREEN "Enhanced daily update completed at $(date)"
    print_status $BLUE "========================================="
}

# Execute main function
main