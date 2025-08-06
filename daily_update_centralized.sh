#!/bin/bash

# Enhanced daily update script for centralized data storage
# This version is aware of the centralized data configuration

# Set strict error handling
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Universal path detection based on current working directory
detect_environment_and_paths() {
    local current_dir=$(pwd)
    
    # Check if we're in production (/app structure)
    if [[ "$current_dir" == /app/* ]]; then
        echo "🌐 Production environment detected"
        export BASEBALL_DATA_PATH="/app/BaseballData/data"
        export IS_PRODUCTION=true
    # Check if we're in development (Claude-Code structure)
    elif [[ "$current_dir" == */Claude-Code/* ]]; then
        echo "💻 Development environment detected"
        # Find the Claude-Code root by going up until we find it
        local claude_root="$current_dir"
        while [[ "$claude_root" != "/" && ! -d "$claude_root/BaseballData" ]]; do
            claude_root=$(dirname "$claude_root")
        done
        
        if [[ -d "$claude_root/BaseballData" ]]; then
            export BASEBALL_DATA_PATH="$claude_root/BaseballData/data"
            echo "📁 Found BaseballData at: $BASEBALL_DATA_PATH"
        else
            echo "❌ Could not locate BaseballData directory"
            exit 1
        fi
        export IS_PRODUCTION=false
    else
        echo "❓ Unknown environment structure: $current_dir"
        exit 1
    fi
}

# Auto-detect environment and set paths
if [ -z "${BASEBALL_DATA_PATH:-}" ]; then
    detect_environment_and_paths
fi

# Ensure data path exists
if [ ! -d "$BASEBALL_DATA_PATH" ]; then
    echo -e "${RED}Error: Data path not found at $BASEBALL_DATA_PATH${NC}"
    echo "Please run ./migrate_to_centralized_data.sh first"
    exit 1
fi

echo -e "${BLUE}=== Daily Baseball Data Update (Centralized Storage) ===${NC}"
echo -e "Data location: ${GREEN}$BASEBALL_DATA_PATH${NC}"
echo

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if we're using symlinks or direct centralized access
if [ -L "public/data" ]; then
    echo -e "${GREEN}✓ Using symlinked data access${NC}"
elif [ -d "public/data" ]; then
    echo -e "${YELLOW}⚠ Using legacy data directory (not symlinked)${NC}"
else
    echo -e "${BLUE}ℹ Using direct centralized data access${NC}"
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required commands
for cmd in node npm; do
    if ! command_exists "$cmd"; then
        echo -e "${RED}Error: $cmd is not installed${NC}"
        exit 1
    fi
done

# Get date parameter or use current date
if [ $# -eq 0 ]; then
    DATE=$(date +%Y-%m-%d)
    echo "No date provided, using current date: $DATE"
else
    DATE=$1
    echo "Using provided date: $DATE"
fi

# Function to run a command with status
run_with_status() {
    local description="$1"
    shift
    echo -e "\n${BLUE}$description...${NC}"
    if "$@"; then
        echo -e "${GREEN}✓ $description completed${NC}"
    else
        echo -e "${RED}✗ $description failed${NC}"
        return 1
    fi
}

# Function to create backup with centralized storage awareness
create_backup() {
    local backup_name="centralized_backup_$(date +%Y%m%d_%H%M%S)"
    local backup_dir="backups/$backup_name"
    
    echo -e "\n${BLUE}Creating backup...${NC}"
    mkdir -p "$backup_dir"
    
    # Note which data directories we're backing up
    echo "Backup created from centralized storage: $BASEBALL_DATA_PATH" > "$backup_dir/README.txt"
    echo "Date: $(date)" >> "$backup_dir/README.txt"
    
    # Only backup key generated files from centralized storage
    for dir in predictions team_stats rolling_stats; do
        if [ -d "$BASEBALL_DATA_PATH/$dir" ]; then
            echo "  Backing up $dir..."
            cp -r "$BASEBALL_DATA_PATH/$dir" "$backup_dir/" 2>/dev/null || true
        fi
    done
    
    echo -e "${GREEN}✓ Backup created in $backup_dir${NC}"
}

# Main update process
echo -e "\n${YELLOW}Starting daily update process...${NC}"

# Create backup before updates
create_backup

# Step 1: Generate available files list
run_with_status "Generating available files list" ./generate_file_list.sh

# Step 2: Process all stats
run_with_status "Processing all CSV stats" ./process_all_stats.sh

# Step 3: Generate rolling stats
run_with_status "Generating rolling statistics" ./generate_rolling_stats.sh "$DATE"

# Step 4: Generate additional stats
run_with_status "Generating additional statistics" node src/services/generateAdditionalStats.js

# Step 5: Generate HR predictions
run_with_status "Generating HR predictions" node src/services/generateHRPredictions3.js "$DATE"

# Step 6: Generate pitcher matchups
run_with_status "Generating pitcher matchups" node src/services/generatePitcherMatchups.js "$DATE"

# Step 7: Generate prop analysis
run_with_status "Generating prop analysis" node src/services/generatePropAnalysis.js "$DATE"

# Step 8: Generate opponent matchup stats
run_with_status "Generating opponent matchup stats" node src/services/generateOpponentMatchupStats.js "$DATE"

# Step 9: Generate team statistics
run_with_status "Generating team statistics" node src/services/generateTeamStats.js "$DATE"

# Step 10: Generate milestone tracking
if [ -f "src/services/generateMilestoneTracking.js" ]; then
    run_with_status "Generating milestone tracking" npm run generate-milestones
fi

# Verify key files were created in centralized location
echo -e "\n${BLUE}Verifying generated files in centralized storage...${NC}"

verify_file() {
    local file="$1"
    local full_path="$BASEBALL_DATA_PATH/$file"
    if [ -f "$full_path" ]; then
        echo -e "  ${GREEN}✓${NC} $file"
        return 0
    else
        echo -e "  ${RED}✗${NC} $file missing"
        return 1
    fi
}

# Check for key generated files
verify_file "predictions/hr_predictions_${DATE}.json"
verify_file "predictions/hr_predictions_latest.json"
verify_file "team_stats/team_stats_${DATE}.json"
verify_file "team_stats/team_stats_latest.json"
verify_file "rolling_stats/rolling_stats_season_latest.json"

# Summary
echo -e "\n${GREEN}=== Daily Update Complete ===${NC}"
echo -e "Data location: ${BLUE}$BASEBALL_DATA_PATH${NC}"
echo -e "Generated files use date: ${YELLOW}$DATE${NC}"

# Check if BaseballData needs to be committed
if command_exists git && [ -d "$BASEBALL_DATA_PATH/.git" ]; then
    cd "$BASEBALL_DATA_PATH"
    if ! git diff --quiet; then
        echo -e "\n${YELLOW}Note: BaseballData has uncommitted changes${NC}"
        echo "Consider committing the updated data to git"
    fi
    cd - > /dev/null
fi

echo -e "\n${BLUE}Next steps:${NC}"
echo "1. Start the API server: cd ../BaseballAPI && python enhanced_main.py"
echo "2. Start the React app: npm start"
echo "3. Verify data displays correctly in the dashboard"

# Remind about centralized storage
echo -e "\n${GREEN}ℹ Using centralized data storage saves ~8GB of disk space!${NC}"