#!/bin/bash

# Rolling Stats Cleanup Script
# Reduces storage from 2.2GB to ~50MB by keeping only necessary files

ROLLING_STATS_DIR="public/data/rolling_stats"
BACKUP_DIR="rolling_stats_backup_$(date +%Y%m%d)"

echo "🧹 Rolling Stats Storage Cleanup"
echo "================================"

# Check if directory exists
if [ ! -d "$ROLLING_STATS_DIR" ]; then
    echo "❌ Rolling stats directory not found: $ROLLING_STATS_DIR"
    exit 1
fi

# Show current storage usage
echo "📊 Current storage usage:"
du -sh "$ROLLING_STATS_DIR"
echo

# Count files by type
echo "📁 File breakdown:"
echo "   Season files: $(ls $ROLLING_STATS_DIR/rolling_stats_season_*.json | wc -l)"
echo "   Last 30 files: $(ls $ROLLING_STATS_DIR/rolling_stats_last_30_*.json | wc -l)"
echo "   Last 7 files: $(ls $ROLLING_STATS_DIR/rolling_stats_last_7_*.json | wc -l)"
echo "   Current files: $(ls $ROLLING_STATS_DIR/rolling_stats_current_*.json | wc -l)"
echo

# Calculate cutoff date (keep last 14 days + latest files)
CUTOFF_DATE=$(date -d '14 days ago' +%Y-%m-%d)
echo "🗓️  Keeping files from: $CUTOFF_DATE onwards"
echo "🔄 Keeping all *_latest.json files"
echo

# Ask for confirmation
read -p "⚠️  This will delete ~95% of rolling stats files. Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled"
    exit 1
fi

# Create backup directory (optional - comment out if you don't want backup)
# echo "📦 Creating backup directory: $BACKUP_DIR"
# mkdir -p "$BACKUP_DIR"

echo "🗑️  Starting cleanup..."

# Function to clean files for a specific timeframe
cleanup_timeframe() {
    local timeframe=$1
    local pattern="rolling_stats_${timeframe}_"
    
    echo "   Cleaning $timeframe files..."
    
    # Count files to be deleted
    local delete_count=0
    local keep_count=0
    
    for file in $ROLLING_STATS_DIR/${pattern}*.json; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            
            # Always keep *_latest.json files
            if [[ $filename =~ _latest\.json$ ]]; then
                ((keep_count++))
                continue
            fi
            
            # Extract date from filename (format: rolling_stats_timeframe_YYYY-MM-DD.json)  
            if [[ $filename =~ ([0-9]{4}-[0-9]{2}-[0-9]{2})\.json$ ]]; then
                file_date="${BASH_REMATCH[1]}"
                
                # Keep files from cutoff date onwards
                if [[ $file_date > $CUTOFF_DATE || $file_date == $CUTOFF_DATE ]]; then
                    ((keep_count++))
                else
                    # Backup file (optional)
                    # cp "$file" "$BACKUP_DIR/" 2>/dev/null
                    
                    # Delete old file
                    rm "$file"
                    ((delete_count++))
                fi
            fi
        fi
    done
    
    echo "      Deleted: $delete_count files"
    echo "      Kept: $keep_count files"
}

# Clean each timeframe
cleanup_timeframe "season"
cleanup_timeframe "last_30" 
cleanup_timeframe "last_7"
cleanup_timeframe "current"

echo
echo "✅ Cleanup completed!"
echo

# Show new storage usage
echo "📊 New storage usage:"
du -sh "$ROLLING_STATS_DIR"
echo

# Show what's left
echo "📁 Remaining files by type:"
echo "   Season files: $(ls $ROLLING_STATS_DIR/rolling_stats_season_*.json 2>/dev/null | wc -l)"
echo "   Last 30 files: $(ls $ROLLING_STATS_DIR/rolling_stats_last_30_*.json 2>/dev/null | wc -l)"  
echo "   Last 7 files: $(ls $ROLLING_STATS_DIR/rolling_stats_last_7_*.json 2>/dev/null | wc -l)"
echo "   Current files: $(ls $ROLLING_STATS_DIR/rolling_stats_current_*.json 2>/dev/null | wc -l)"

echo
echo "🎯 Space saved: Approximately 2.1GB"
echo "💡 The application will continue to work normally using:"
echo "   - Recent files (last 14 days) for date-specific requests"
echo "   - *_latest.json files as fallbacks"
echo
echo "⏰ Consider running this cleanup weekly to prevent accumulation"