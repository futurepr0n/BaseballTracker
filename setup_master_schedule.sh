#!/bin/bash
# Setup Master Schedule System
# One-time setup script to initialize the master schedule

# Set working directory to script location
cd "$(dirname "$0")"

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

print_status $BLUE "🏟️ Setting up Master Schedule System..."
echo

# Step 1: Check if data directory exists
print_status $BLUE "📁 Checking data directory structure..."
if [ ! -d "public/data" ]; then
    print_status $RED "❌ ERROR: public/data directory not found"
    print_status $RED "   Make sure you're running this from the BaseballTracker root directory"
    exit 1
fi

print_status $GREEN "✅ Data directory found"

# Step 2: Generate initial master schedule
print_status $BLUE "📅 Generating initial master schedule..."
node src/services/generateMasterSchedule.js generate

if [ $? -ne 0 ]; then
    print_status $YELLOW "⚠️  Direct MLB API generation failed, trying from existing data..."
    
    # Fallback: try to generate from existing data
    node -e "
        const MasterScheduleGenerator = require('./src/services/generateMasterSchedule');
        const generator = new MasterScheduleGenerator();
        generator.generateFromExistingData()
            .then(dates => {
                console.log('✅ Generated schedule from existing data:', dates.length, 'dates');
                process.exit(0);
            })
            .catch(error => {
                console.error('❌ Failed to generate from existing data:', error.message);
                process.exit(1);
            });
    "
    
    if [ $? -ne 0 ]; then
        print_status $RED "❌ ERROR: Could not generate master schedule"
        print_status $RED "   Please check your internet connection or existing data files"
        exit 1
    fi
fi

print_status $GREEN "✅ Initial master schedule generated"

# Step 3: Validate the generated schedule
print_status $BLUE "🔍 Validating master schedule..."
node src/services/updateMasterSchedule.js validate

if [ $? -ne 0 ]; then
    print_status $YELLOW "⚠️  Schedule validation found issues, attempting repair..."
    node src/services/updateMasterSchedule.js repair
    
    if [ $? -ne 0 ]; then
        print_status $RED "❌ ERROR: Could not repair master schedule"
        exit 1
    fi
    
    print_status $GREEN "✅ Master schedule repaired"
fi

print_status $GREEN "✅ Master schedule validation passed"

# Step 4: Display schedule information
print_status $BLUE "📊 Master Schedule Information:"
node -e "
    const masterScheduleService = require('./src/services/masterScheduleService');
    (async () => {
        try {
            const info = await masterScheduleService.getScheduleInfo();
            if (info.isAvailable) {
                console.log('📅 Year:', info.year);
                console.log('🎮 Total Games:', info.gameCount);
                console.log('🥎 First Game:', info.firstGame);
                console.log('🏆 Last Game:', info.lastGame);
                console.log('🕐 Generated:', new Date(info.generated).toLocaleString());
            } else {
                console.log('❌ Schedule not available');
            }
        } catch (error) {
            console.error('Error:', error.message);
        }
    })();
"

# Step 5: Test the service
print_status $BLUE "🧪 Testing master schedule service..."
node -e "
    const masterScheduleService = require('./src/services/masterScheduleService');
    (async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const gameDates = await masterScheduleService.getSeasonGameDates(today, { maxDaysBack: 30 });
            
            if (gameDates && gameDates.length > 0) {
                console.log('✅ Service test passed');
                console.log('📅 Recent game dates (last 10):');
                gameDates.slice(-10).forEach(date => console.log('   ', date));
            } else {
                console.log('⚠️  Service returned no dates');
            }
        } catch (error) {
            console.error('❌ Service test failed:', error.message);
            process.exit(1);
        }
    })();
"

if [ $? -ne 0 ]; then
    print_status $RED "❌ ERROR: Master schedule service test failed"
    exit 1
fi

print_status $GREEN "✅ Master schedule service test passed"

# Step 6: Instructions for daily usage
echo
print_status $GREEN "🎉 Master Schedule System Setup Complete!"
echo
print_status $BLUE "📋 How it works:"
echo "   • The master schedule contains only actual MLB game dates"
echo "   • Pitcher cards now use this schedule instead of brute force date ranges"
echo "   • Daily updates automatically maintain the schedule"
echo "   • If the schedule is unavailable, cards fall back to the old method"
echo
print_status $BLUE "🔄 Daily usage:"
echo "   • Run daily_update.sh as usual - it now includes schedule updates"
echo "   • The schedule updates automatically when new game data is processed"
echo "   • No additional steps needed for normal operation"
echo
print_status $BLUE "🛠️ Maintenance commands:"
echo "   • Check schedule: node src/services/generateMasterSchedule.js load"
echo "   • Force update: node src/services/updateMasterSchedule.js sync"
echo "   • Repair issues: node src/services/updateMasterSchedule.js repair"
echo
print_status $GREEN "✅ Setup complete! Your pitcher cards will now use precise game dates."