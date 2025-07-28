#!/bin/bash

# Prevent Rolling Stats Accumulation Script
# Auto-cleanup script to run after daily rolling stats generation
# Keeps only last 14 days + latest files to prevent storage bloat

ROLLING_STATS_DIR="public/data/rolling_stats"

# Function to clean old files for a timeframe
auto_cleanup_timeframe() {
    local timeframe=$1
    local pattern="rolling_stats_${timeframe}_"
    local cutoff_date=$(date -d '14 days ago' +%Y-%m-%d)
    local deleted_count=0
    
    for file in $ROLLING_STATS_DIR/${pattern}*.json; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            
            # Skip *_latest.json files  
            if [[ $filename =~ _latest\.json$ ]]; then
                continue
            fi
            
            # Extract date and delete if older than cutoff
            if [[ $filename =~ ([0-9]{4}-[0-9]{2}-[0-9]{2})\.json$ ]]; then
                file_date="${BASH_REMATCH[1]}"
                
                if [[ $file_date < $cutoff_date ]]; then
                    rm "$file"
                    ((deleted_count++))
                fi
            fi
        fi
    done
    
    if [ $deleted_count -gt 0 ]; then
        echo "🗑️  Auto-cleaned $deleted_count old $timeframe files"
    fi
}

# Only run if directory exists and has files
if [ -d "$ROLLING_STATS_DIR" ]; then
    # Count total files before cleanup
    total_before=$(ls $ROLLING_STATS_DIR/rolling_stats_*.json 2>/dev/null | wc -l)
    
    if [ $total_before -gt 60 ]; then  # Only clean if we have many files
        echo "📊 Rolling stats auto-cleanup (keeping last 14 days + latest files)"
        
        auto_cleanup_timeframe "season"
        auto_cleanup_timeframe "last_30"
        auto_cleanup_timeframe "last_7" 
        auto_cleanup_timeframe "current"
        
        total_after=$(ls $ROLLING_STATS_DIR/rolling_stats_*.json 2>/dev/null | wc -l)
        files_removed=$((total_before - total_after))
        
        if [ $files_removed -gt 0 ]; then
            echo "✅ Removed $files_removed old rolling stats files"
            echo "📁 Files remaining: $total_after"
        fi
    fi
fi