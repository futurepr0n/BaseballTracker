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

**Pinheads Playhouse Strategic Intelligence:**
- **BatchSummarySection**: Comprehensive strategic analysis dashboard with collapsible tabs
- **Strategic Intelligence Tables**: Top opportunities, pitcher intelligence, category breakdown
- **Stadium & Weather Context Integration**: Park factors, wind analysis, temperature effects
- **Enhanced Badge System**: 23 badge types including stadium, weather, and performance indicators
- **Responsive Design**: Mobile-first with full-viewport scrollable tables
- **Real-time Enhancement**: Automatic batch summary generation with actionable insights

**Component Patterns:**
- **Hook-based State**: Custom hooks in `hooks/` for reusable logic
- **CSS Modules**: Component-specific styling with `.css` files
- **Context Providers**: TeamFilterContext wraps main application routes
- **Strategic Intelligence Components**: Modular analysis components with caching and fallback support

### Data Processing Services

**Key Services:**
- `generateHRPredictions3.js` - Home run prediction algorithm
- `generateAdditionalStats.js` - Player performance metrics
- `generatePitcherMatchups.js` - Pitcher vs batter analysis
- `generateRollingStats.js` - Rolling statistical windows (7/30/season)

**Strategic Intelligence Services:**
- `batchSummaryService.js` - Comprehensive batch analysis with strategic categorization
- `stadiumContextService.js` - Stadium HR analysis integration with park factors
- `weatherContextService.js` - Weather context integration with wind/temperature analysis
- `dashboardContextService.js` - Enhanced dashboard context with badge aggregation
- `playerBadgeSystem.js` - 23-badge classification system with confidence boost calculations

**Analysis Features:**
- **Opponent Matchup Analysis**: Historical player vs team performance with game verification
- **Time Slot Performance**: Day-of-week and time-based performance patterns  
- **Streak Analysis**: Hit streaks, drought predictions, continuation probabilities
- **Multi-Hit Analysis**: Players likely to record multiple hits
- **Strategic Intelligence**: Top opportunities, hidden gems, must-play alerts, risk warnings
- **Stadium Context**: Park factors, HR-friendly vs pitcher-friendly venue analysis
- **Weather Integration**: Wind factors, temperature effects, dome game detection
- **Pitcher Intelligence**: Vulnerability analysis, dominance rankings, recent form assessment

### File Organization
- `src/components/cards/` - Dashboard card components
- `src/components/BatchSummarySection.js/.css` - Strategic intelligence dashboard component
- `src/services/` - Data processing and analysis services
- `src/utils/playerBadgeSystem.js` - Badge classification and confidence boost system
- `public/data/` - JSON data files organized by year/month
- `public/data/predictions/` - Generated analysis files
- `public/data/stadium/` - Stadium HR analysis data with park factors
- `public/data/multi_hit_stats/` - Multi-hit performance tracking data
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
- **Pinheads Playhouse**: Uses enhanced `useBaseballAnalysis()` hook with confidence indicators and strategic intelligence
- **BatchSummarySection**: Real-time integration with BaseballAPI predictions for strategic analysis
- **Dashboard Context Enhancement**: Automatic enhancement of API predictions with badge system
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

## Strategic Intelligence System

### Overview
The Strategic Intelligence system transforms raw BaseballAPI predictions into actionable insights through comprehensive analysis and categorization. Implemented in Pinheads Playhouse, it provides strategic recommendations for daily fantasy and betting decisions.

### Core Components

**BatchSummarySection Component:**
- **Collapsible Interface**: Expandable dashboard with strategic insights overview
- **Tabbed Navigation**: Opportunities, Pitcher Intelligence, Category Breakdown
- **Responsive Design**: Desktop tables (600-700px width) and mobile full-viewport scrolling
- **Real-time Updates**: Automatic generation when prediction data changes

**Strategic Analysis Categories:**
1. **Top Opportunities**:
   - **Best Hit Opportunities**: High hit probability players with context boost
   - **Power Play Targets**: HR candidates with favorable indicators
   - **Hot Streaks to Ride**: Active hitting streak players
   - **Hidden Gems**: High context boost with lower base scores
   - **Must-Play Alerts**: 3+ badges or 20+ confidence boost players

2. **Pitcher Intelligence**:
   - **Vulnerability Analysis**: Pitcher susceptibility to HRs with threat assessment
   - **Dominance Rankings**: Top performing pitchers with low vulnerability
   - **Recent Form Analysis**: Pitcher performance trends and HR rates

3. **Category Breakdown**:
   - **Player Classification**: Risk warning, high confidence, hidden gem, hot hand, power play, situational, enhanced, standard
   - **Performance Metrics**: Average HR scores and player counts per category

### Badge System (23 Badge Types)

**Performance Badges:**
- `HOT_STREAK` (🔥): 8+ game hitting streaks (+15% boost)
- `ACTIVE_STREAK` (🔥): 5-7 game hitting streaks (+10% boost)  
- `DUE_FOR_HR` (⚡): Top 5 HR predictions (+12% boost)
- `HR_CANDIDATE` (⚡): Top 15 HR predictions (+8% boost)
- `LIKELY_HIT` (📈): High hit probability (+8% boost)
- `MULTI_HIT` (🎯): Multi-hit candidate (+10% boost)
- `RISK` (⚠️): Poor performance risk (-15% boost)

**Situational Badges:**
- `HOME_ADVANTAGE` (🏠): Strong home performance (+6% boost)
- `TIME_SLOT` (⏰): Favorable game time (+5% boost)
- `MATCHUP_EDGE` (🆚): Historical opponent advantage (+8% boost)
- `BOUNCE_BACK` (📉): Due to break slump (+7% boost)
- `IMPROVED_FORM` (📊): Recent improvement (+6% boost)

**Stadium Context Badges:**
- `LAUNCH_PAD` (🚀): Extreme hitter-friendly stadium (+12% boost)
- `HITTER_PARADISE` (🏟️): Hitter-friendly stadium (+8% boost)
- `PITCHER_FORTRESS` (🛡️): Extreme pitcher-friendly stadium (-10% boost)
- `PITCHER_FRIENDLY` (⚾): Pitcher-friendly stadium (-6% boost)

**Weather Context Badges:**
- `WIND_BOOST` (🌪️): Strong favorable wind (+10% boost)
- `WIND_HELPER` (💨): Favorable wind conditions (+6% boost)
- `HOT_WEATHER` (🔥): Hot weather helps ball carry (+5% boost)
- `DOME_GAME` (🏟️): Indoor controlled conditions (0% boost)
- `COLD_WEATHER` (🥶): Cold weather reduces flight (-8% boost)
- `WIND_AGAINST` (🌬️): Unfavorable wind conditions (-6% boost)

**Multi-Hit Context Badges:**
- `MULTI_HIT_SPECIALIST` (🎯): High multi-hit rate (+8% boost)
- `DUE_MULTI_HIT` (📈): Due for multi-hit game (+6% boost)
- `MULTI_HIT_STREAK` (🔥): Recent multi-hit performance (+7% boost)

### Data Integration

**Stadium Context Service:**
- **Data Source**: `public/data/stadium/stadium_hr_analysis.json`
- **Park Factors**: HR production multipliers (>1.1 hitter-friendly, <0.9 pitcher-friendly)
- **Venue Analysis**: Category classification and ranking system
- **Caching**: 30-minute cache for performance optimization

**Weather Context Service:**
- **Integration**: MLBWeatherCard ballpark data and wind utilities
- **Dome Detection**: Automatic indoor venue identification
- **Wind Analysis**: Wind factor calculations with park orientation
- **Temperature Impact**: Heat/cold effects on ball flight distance

**Dashboard Context Service:**
- **Data Aggregation**: Multi-source context from prediction files
- **Player Name Matching**: Enhanced matching with initial and format handling
- **Badge Assignment**: Automatic badge creation based on context data
- **Performance Optimization**: Prioritizes latest files for faster loading

### Technical Implementation

**Service Architecture:**
- **Singleton Pattern**: Shared service instances with caching
- **Async Processing**: Promise-based data loading with parallel requests
- **Error Handling**: Graceful fallbacks and empty state management
- **Performance Optimization**: Map-based caching with timeout management

**Responsive Design:**
- **Desktop**: Larger tables (1400px+ screens) with increased height limits
- **Mobile**: Full-viewport tables with horizontal/vertical scrolling
- **Touch-Friendly**: Optimized scrolling behavior and font sizing
- **Accessibility**: Proper semantic markup and color contrast

### Usage Examples

**Generating Strategic Analysis:**
```javascript
import batchSummaryService from './services/batchSummaryService';

const summary = await batchSummaryService.generateBatchSummary(predictions, matchups);
// Returns comprehensive analysis with opportunities, pitcher intelligence, alerts
```

**Creating Player Badges:**
```javascript
import { badgeManager } from './utils/playerBadgeSystem';

const badge = badgeManager.createBadge('HOT_STREAK', { source: 'dashboard_context' });
const category = badgeManager.categorizePlayer(badges, baseScore);
```

**Stadium Context Integration:**
```javascript
import stadiumContextService from './services/stadiumContextService';

const context = await stadiumContextService.getStadiumContext('Yankee Stadium');
// Returns park factor, category, and HR impact analysis
```

### Data Dependencies
This application requires:
1. **BaseballScraper** CSV files in `../BaseballScraper/` directory
2. **BaseballAPI** running on localhost:8000 for advanced analysis features
3. MLB schedule data (generated by scheduleGenerator.js)
4. Daily statistics JSON files in the date-based directory structure
5. Prediction files must be generated before dashboard displays complete data
6. **Stadium HR analysis data** in `public/data/stadium/` for park factor calculations
7. **Multi-hit statistics** in `public/data/multi_hit_stats/` for context enhancement

The application handles missing data gracefully and will find the closest available date when specific data is not available.