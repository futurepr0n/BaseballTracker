#!/bin/bash

# Safe processing script for August 10th CSV files
# Uses enhanced validation to prevent roster corruption

CSV_DIR="../BaseballData/CSV_BACKUPS"
ROSTERS_BACKUP_DIR="../BaseballData/data/roster_processing_backups"

# Create backup directory
mkdir -p "$ROSTERS_BACKUP_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_status $BLUE "🛡️  Starting safe processing of August 10th CSV files"
print_status $BLUE "📋 Enhanced validation enabled to prevent roster corruption"

# Create pre-processing backup of rosters
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$ROSTERS_BACKUP_DIR/rosters_before_aug10_processing_$TIMESTAMP.json"
cp ../BaseballData/data/rosters.json "$BACKUP_FILE"
print_status $GREEN "💾 Created rosters backup: $BACKUP_FILE"

# Count total files to process
TOTAL_FILES=$(find "$CSV_DIR" -name "*august_10_2025*.csv" -type f | wc -l)
print_status $BLUE "📊 Found $TOTAL_FILES August 10th CSV files"

PROCESSED=0
ERRORS=0

# Process each August 10th CSV file
find "$CSV_DIR" -name "*august_10_2025*.csv" -type f | sort | while IFS= read -r file; do
    filename=$(basename "$file")
    
    print_status $YELLOW "🔄 Processing ($((++PROCESSED))/$TOTAL_FILES): $filename"
    
    # Create individual backup before processing this file
    INDIVIDUAL_BACKUP="$ROSTERS_BACKUP_DIR/rosters_before_${filename%.csv}_$TIMESTAMP.json"
    cp ../BaseballData/data/rosters.json "$INDIVIDUAL_BACKUP"
    
    # Process the file with enhanced validation
    if node src/services/statLoader.js "$file"; then
        print_status $GREEN "✅ Success: $filename"
        
        # Verify rosters.json hasn't been corrupted (check key players remain with correct teams)
        if grep -q '"B\. Lowe"' ../BaseballData/data/rosters.json && \
           grep -q '"Bobby Witt Jr\."' ../BaseballData/data/rosters.json; then
            # Check that B. Lowe is still with TB and not ARI (corruption pattern)
            if grep '"B\. Lowe"' ../BaseballData/data/rosters.json | grep -q '"team": "ARI"'; then
                print_status $RED "🚨 ROSTER CORRUPTION DETECTED! B. Lowe incorrectly assigned to ARI"
                cp "$INDIVIDUAL_BACKUP" ../BaseballData/data/rosters.json
                print_status $GREEN "🔄 Roster restored from: $INDIVIDUAL_BACKUP"
            else
                print_status $GREEN "🛡️  Roster integrity verified for $filename"
                # Remove individual backup if successful
                rm "$INDIVIDUAL_BACKUP"
            fi
        else
            print_status $RED "🚨 KEY PLAYERS MISSING! Restoring from backup"
            cp "$INDIVIDUAL_BACKUP" ../BaseballData/data/rosters.json
            print_status $GREEN "🔄 Roster restored from: $INDIVIDUAL_BACKUP"
        fi
        
    else
        print_status $RED "❌ Error processing: $filename"
        ((ERRORS++))
        
        # Restore rosters from backup on error
        cp "$INDIVIDUAL_BACKUP" ../BaseballData/data/rosters.json
        print_status $GREEN "🔄 Roster restored after error: $filename"
    fi
    
    # Small delay between files
    sleep 0.2
    echo
done

print_status $BLUE "🏁 August 10th Processing Complete"
print_status $BLUE "=========================="
print_status $GREEN "✅ Files processed: $PROCESSED"
print_status $RED "❌ Files with errors: $ERRORS"

# Final roster integrity check
if grep -q '"B\. Lowe"' ../BaseballData/data/rosters.json; then
    if grep '"B\. Lowe"' ../BaseballData/data/rosters.json | grep -q '"team": "ARI"'; then
        print_status $RED "🚨 Final roster integrity check: FAILED - B. Lowe incorrectly assigned to ARI"
        print_status $YELLOW "🔄 Restoring from main backup: $BACKUP_FILE"
        cp "$BACKUP_FILE" ../BaseballData/data/rosters.json
    else
        print_status $GREEN "🛡️  Final roster integrity check: PASSED"
        print_status $GREEN "   B. Lowe correctly maintained in original team"
    fi
else
    print_status $RED "🚨 Final roster integrity check: FAILED - B. Lowe missing"
    print_status $YELLOW "🔄 Restoring from main backup: $BACKUP_FILE"
    cp "$BACKUP_FILE" ../BaseballData/data/rosters.json
fi

print_status $BLUE "📁 Backups saved in: $ROSTERS_BACKUP_DIR"
print_status $GREEN "✅ Safe processing complete"