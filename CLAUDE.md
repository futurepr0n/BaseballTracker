# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start the React application:**
```bash
npm install
npm start
```
- Runs on localhost:3000
- React development server with hot reloading

**Build for production:**
```bash
npm run build
```

**Data Processing Pipeline:**
```bash
# 1. Generate schedule data (run first)
node src/services/scheduleGenerator.js

# 2. Process all CSV stats files from BaseballScraper
./process_all_stats.sh

# 3. Generate additional analysis files
node src/services/generateAdditionalStats.js
node src/services/generatePitcherMatchups.js

# 4. Run daily update (generates predictions)
./daily_update.sh [YYYY-MM-DD]
```

**Rolling stats generation:**
```bash
./generate_rolling_stats.sh
```

## Architecture Overview

### Core Application Structure
- **React Router SPA** with main routes: `/` (Dashboard), `/players`, `/teams`, `/games`, `/capsheet`, `/matchup-analyzer`, `/pinheads-playhouse`
- **Data Service Layer** (`src/services/dataService.js`) - Centralized data loading with caching for JSON files
- **Team Filter Context** - Global state for filtering players/games by team with matchup analysis

### Data Flow Architecture
1. **Raw Data Sources**: 
   - Daily JSON files: `public/data/YYYY/month/month_DD_YYYY.json`
   - Static data: `teams.json`, `rosters.json`, `handicappers.json`
   - Generated predictions: `public/data/predictions/`

2. **Processing Pipeline**:
   - CSV files (from external BaseballScraper) → `statLoader.js` → Daily JSON
   - Daily JSON → Prediction services → Analysis JSON files
   - Historical data aggregation via `fetchPlayerDataForDateRange()`

3. **Frontend Data Loading**:
   - Lazy loading with fallback to closest available date
   - Multi-level caching (dataCache object)
   - Date-based file resolution with month name conversion

### Component Architecture

**Dashboard System:**
- **Modular Card System**: Individual card components in `src/components/cards/`
- **Card Registry**: `cardRegistry.js` contains configuration-driven card definitions
- **Dynamic Loading**: Cards fetch their own data sources with fallback mechanisms
- **Team Filtering**: Context-based filtering applied across all dashboard cards

**CapSheet System:**
- **Handicapping Tools**: Bet slip management, player analysis, performance tracking
- **Multi-game History**: `findMultiGamePlayerStats()` for detailed player analysis
- **Export/Import**: Handicapper data persistence and sharing

**Component Patterns:**
- **Hook-based State**: Custom hooks in `hooks/` for reusable logic
- **CSS Modules**: Component-specific styling with `.css` files
- **Context Providers**: TeamFilterContext wraps main application routes

### Data Processing Services

**Key Services:**
- `generateHRPredictions3.js` - Home run prediction algorithm
- `generateAdditionalStats.js` - Player performance metrics
- `generatePitcherMatchups.js` - Pitcher vs batter analysis
- `generateRollingStats.js` - Rolling statistical windows (7/30/season)

**Analysis Features:**
- **Opponent Matchup Analysis**: Historical player vs team performance with game verification
- **Time Slot Performance**: Day-of-week and time-based performance patterns  
- **Streak Analysis**: Hit streaks, drought predictions, continuation probabilities
- **Multi-Hit Analysis**: Players likely to record multiple hits

### File Organization
- `src/components/cards/` - Dashboard card components
- `src/services/` - Data processing and analysis services
- `public/data/` - JSON data files organized by year/month
- `public/data/predictions/` - Generated analysis files
- `public/data/logos/` - Team and application logos

### Development Notes
- **Date Format**: All dates use YYYY-MM-DD format internally
- **Player Identification**: Combination of name + team for uniqueness
- **Performance Caching**: Extensive caching to minimize file reads
- **Error Handling**: Graceful fallbacks for missing data files
- **Team Abbreviations**: Consistent 3-letter abbreviations throughout

## External Dependencies

### BaseballAPI Integration
This application integrates with a **FastAPI-based analysis engine** located at `../BaseballAPI/` for advanced pitcher vs team matchup analysis.

**BaseballAPI Features:**
- **Sophisticated HR Prediction**: Multi-factor scoring system (25+ variables)
- **Advanced Matchup Analysis**: Arsenal-specific batter vs pitcher predictions  
- **Real-time Integration**: React service layer (`baseballAnalysisService.js`)
- **Component Scoring**: Arsenal Matchup (40%), Contextual (20%), Batter Overall (15%), etc.

**Enhanced Features (Version 2.0):**
- **🛡️ Missing Data Fallbacks**: Automatic fallback to league averages when Baseball Savant scraping fails
- **📊 Confidence Scoring**: Every prediction includes data quality confidence (0-100%)
- **⚖️ Dynamic Weight Adjustment**: Component weights automatically adjust based on data availability
- **🏟️ Team-Based Estimates**: Use team pitching profiles when individual pitcher data unavailable
- **🎯 Position-Based Profiles**: Different analysis baselines for starters vs relievers
- **📈 Real-time League Averages**: Calculate current league performance by pitch type

**API Endpoints:**
- **Enhanced**: `POST /analyze/pitcher-vs-team` - Analysis with missing data handling
- **Original**: `POST /pitcher-vs-team` - Original analysis (requires full data)
- **Health**: `GET /health` - Check API status and data initialization
- **Quality**: `GET /analyze/data-quality` - Data quality assessment
- **Bulk**: `POST /analyze/bulk-predictions` - Multiple matchup analysis
- **Report**: `POST /analyze/generate-report` - Comprehensive analysis reports

**Integration Points:**
- **Pinheads Playhouse**: Uses enhanced `useBaseballAnalysis()` hook with confidence indicators
- **Shared Data**: BaseballAPI reads from same data sources as BaseballTracker
- **Service Layer**: `baseballAnalysisService.js` handles API communication with fallback support
- **Graceful Degradation**: Analysis continues even when external data sources fail

**Starting BaseballAPI:**
```bash
cd ../BaseballAPI

# Enhanced version (recommended)
python enhanced_main.py
# Runs on localhost:8000 with missing data handling

# Original version  
python main.py
# Runs on localhost:8000 (requires complete data)

# Data auto-initializes from ../BaseballTracker/build/data
```

**Response Format:**
```javascript
{
  pitcher_name: "MacKenzie Gore",
  team_abbr: "SEA", 
  predictions: [
    {
      player_name: "Riley Greene",
      hr_score: 83.92,
      hr_probability: 9.7,      // Already as percentage
      hit_probability: 22.0,    // Already as percentage  
      arsenal_matchup: 56.6,
      recent_avg: 0.298,
      // ... detailed scoring breakdown
    }
  ]
}
```

### Player Team Change Management
Enhanced player identification system that tracks players across team changes:

**Core Services:**
- **`playerMappingService.js`** - Sequential player IDs (665000+) with team history tracking
- **`playerLookupService.js`** - Enhanced lookup functions that aggregate across team changes
- **`playerMappings.json`** - Persistent storage of player IDs and team history

**Benefits:**
- **Statistical Continuity**: Maintain complete player history across trades
- **Historical Analysis**: Opponent matchups include all team affiliations  
- **Future-Proof**: Name updates don't break player identity
- **Backward Compatible**: Legacy functions still work

**Integration:**
- **statLoader.js**: Automatically detects team changes during data processing
- **Enhanced Lookups**: Use `playerLookupService` functions for cross-team data aggregation
- **Trade Deadline Ready**: System handles mid-season player movements seamlessly

### Data Dependencies
This application requires:
1. **BaseballScraper** CSV files in `../BaseballScraper/` directory
2. **BaseballAPI** running on localhost:8000 for advanced analysis features
3. MLB schedule data (generated by scheduleGenerator.js)
4. Daily statistics JSON files in the date-based directory structure
5. Prediction files must be generated before dashboard displays complete data

The application handles missing data gracefully and will find the closest available date when specific data is not available.