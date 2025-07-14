#!/bin/bash

# Enhanced CSV Processing Script with Pre-Processing Validation
# Prevents duplicate processing and adds comprehensive validation

# Configuration
CSV_DIR="../BaseballScraper"
VALIDATION_SCRIPT="scripts/data-validation/csvProcessingValidator.js"
PROCESSING_LOG="scripts/data-validation/processing_log.json"
BACKUP_DIR="backups/csv_processing_backups"

# Enhanced options (can be overridden by environment variables)
ENABLE_VALIDATION=${ENABLE_VALIDATION:-true}
ENABLE_BACKUP=${ENABLE_BACKUP:-true}
DRY_RUN=${DRY_RUN:-false}
FORCE_REPROCESS=${FORCE_REPROCESS:-false}

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

# Function to create directory if it doesn't exist
create_dir_if_not_exists() {
    local dir=$1
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        print_status $BLUE "📁 Created directory: $dir"
    fi
}

# Function to validate CSV file format
validate_csv_format() {
    local file=$1
    local filename=$(basename "$file")
    
    # Check if filename matches expected pattern: TEAM_[hitting|pitching]_month_day_year_gameId.csv
    if [[ ! $filename =~ ^[A-Z]{2,3}_(hitting|pitching)_[a-zA-Z]+_[0-9]{1,2}_[0-9]{4}_[0-9]+\.csv$ ]]; then
        print_status $RED "❌ Invalid filename format: $filename"
        print_status $YELLOW "   Expected: TEAM_[hitting|pitching]_month_day_year_gameId.csv"
        return 1
    fi
    
    # Check if file is not empty
    if [ ! -s "$file" ]; then
        print_status $RED "❌ Empty CSV file: $filename"
        return 1
    fi
    
    return 0
}

# Function to check if file needs processing
needs_processing() {
    local file=$1
    
    if [ "$FORCE_REPROCESS" = true ]; then
        return 0  # Always process if forced
    fi
    
    # Check processing log (this will be handled by statLoader.js enhanced logic)
    # For now, we'll let statLoader.js handle the duplicate checking
    return 0
}

# Function to create backup before processing
create_backup() {
    local file=$1
    
    if [ "$ENABLE_BACKUP" = true ]; then
        create_dir_if_not_exists "$BACKUP_DIR"
        
        local timestamp=$(date +"%Y%m%d_%H%M%S")
        local filename=$(basename "$file")
        local backup_file="$BACKUP_DIR/${filename}_${timestamp}"
        
        cp "$file" "$backup_file"
        print_status $BLUE "📄 Created backup: $backup_file"
    fi
}

# Function to run pre-processing validation
run_pre_validation() {
    if [ "$ENABLE_VALIDATION" = true ] && [ -f "$VALIDATION_SCRIPT" ]; then
        print_status $BLUE "🛡️  Running pre-processing validation..."
        node "$VALIDATION_SCRIPT" "$CSV_DIR"
        local validation_result=$?
        
        if [ $validation_result -ne 0 ]; then
            print_status $RED "❌ Pre-processing validation failed"
            return 1
        fi
        
        print_status $GREEN "✅ Pre-processing validation passed"
    fi
    
    return 0
}

# Main processing function
main() {
    print_status $BLUE "🚀 Enhanced CSV Processing Started"
    print_status $BLUE "======================================"
    
    # Check if CSV_DIR exists and is a directory
    if [ ! -d "$CSV_DIR" ]; then
        print_status $RED "❌ Error: Directory '$CSV_DIR' not found."
        exit 1
    fi
    
    # Create necessary directories
    create_dir_if_not_exists "scripts/data-validation"
    
    # Print configuration
    print_status $BLUE "📋 Configuration:"
    print_status $BLUE "   CSV Directory: $CSV_DIR"
    print_status $BLUE "   Validation: $ENABLE_VALIDATION"
    print_status $BLUE "   Backup: $ENABLE_BACKUP"
    print_status $BLUE "   Dry Run: $DRY_RUN"
    print_status $BLUE "   Force Reprocess: $FORCE_REPROCESS"
    echo
    
    # Run pre-processing validation
    if ! run_pre_validation; then
        print_status $RED "❌ Stopping due to validation failure"
        exit 1
    fi
    
    # Count total CSV files
    local total_files=$(find "$CSV_DIR" -maxdepth 1 -name "*.csv" -type f | wc -l)
    print_status $BLUE "📊 Found $total_files CSV files to process"
    echo
    
    local processed_count=0
    local skipped_count=0
    local error_count=0
    
    # Process CSV files
    find "$CSV_DIR" -maxdepth 1 -name "*.csv" -type f | sort | while IFS= read -r file; do
        local filename=$(basename "$file")
        
        print_status $YELLOW "🔄 Processing: $filename"
        
        # Validate CSV format
        if ! validate_csv_format "$file"; then
            print_status $RED "⏭️  Skipping invalid file: $filename"
            ((skipped_count++))
            continue
        fi
        
        # Check if processing is needed
        if ! needs_processing "$file"; then
            print_status $YELLOW "⏭️  File already processed: $filename"
            ((skipped_count++))
            continue
        fi
        
        # Create backup if enabled
        if [ "$ENABLE_BACKUP" = true ]; then
            create_backup "$file"
        fi
        
        # Process the file
        if [ "$DRY_RUN" = true ]; then
            print_status $BLUE "🔍 [DRY RUN] Would process: $filename"
            ((processed_count++))
        else
            print_status $GREEN "⚡ Processing: $filename"
            
            # Run statLoader.js with enhanced validation
            if node src/services/statLoader.js "$file"; then
                print_status $GREEN "✅ Successfully processed: $filename"
                ((processed_count++))
            else
                print_status $RED "❌ Error processing: $filename"
                ((error_count++))
            fi
        fi
        
        # Small delay between files
        sleep 0.2
        echo
    done
    
    # Print final summary
    print_status $BLUE "🏁 Processing Complete"
    print_status $BLUE "====================="
    print_status $GREEN "✅ Files processed: $processed_count"
    print_status $YELLOW "⏭️  Files skipped: $skipped_count"
    print_status $RED "❌ Files with errors: $error_count"
    
    if [ $error_count -gt 0 ]; then
        print_status $RED "⚠️  Some files had errors. Check logs above for details."
        exit 1
    fi
    
    if [ "$DRY_RUN" = true ]; then
        print_status $BLUE "💡 This was a dry run. To actually process files, run without DRY_RUN=true"
    else
        print_status $GREEN "🎯 All files processed successfully!"
        
        if [ $processed_count -gt 0 ]; then
            print_status $BLUE "💡 Next steps:"
            print_status $BLUE "   1. Run milestone tracking: npm run generate-milestones"
            print_status $BLUE "   2. Update rolling stats: ./generate_rolling_stats.sh"
            print_status $BLUE "   3. Run duplicate detection if needed: node scripts/data-validation/batchDuplicateRemoval.js --dry-run"
        fi
    fi
}

# Show usage information
show_usage() {
    echo "Enhanced CSV Processing Script"
    echo "Usage: $0 [options]"
    echo
    echo "Options:"
    echo "  --dry-run           Run in dry-run mode (no actual processing)"
    echo "  --force-reprocess   Force reprocessing of all files"
    echo "  --no-validation     Skip pre-processing validation"
    echo "  --no-backup         Skip backup creation"
    echo "  --help             Show this help message"
    echo
    echo "Environment Variables:"
    echo "  ENABLE_VALIDATION=true|false    Enable/disable validation (default: true)"
    echo "  ENABLE_BACKUP=true|false        Enable/disable backups (default: true)"
    echo "  DRY_RUN=true|false              Enable/disable dry run (default: false)"
    echo "  FORCE_REPROCESS=true|false      Force reprocessing (default: false)"
    echo
    echo "Examples:"
    echo "  $0                              # Normal processing"
    echo "  $0 --dry-run                    # Dry run"
    echo "  $0 --force-reprocess            # Force reprocess all files"
    echo "  DRY_RUN=true $0                 # Using environment variable"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force-reprocess)
            FORCE_REPROCESS=true
            shift
            ;;
        --no-validation)
            ENABLE_VALIDATION=false
            shift
            ;;
        --no-backup)
            ENABLE_BACKUP=false
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_status $RED "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Run main function
main