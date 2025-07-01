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

**Handedness Data Setup (One-time or when CSV files updated):**
```bash
# Convert handedness CSV files to JSON for real-time performance
# Run this whenever you get new bat-tracking CSV files
node scripts/convertHandednessData.js

# This creates/updates:
# - public/data/handedness/rhp.json
# - public/data/handedness/lhp.json  
# - public/data/handedness/all.json (weighted averages)
```

**Required CSV Files for Handedness System:**
- `bat-tracking-swing-path-RHP.csv` - Right-handed pitcher data
- `bat-tracking-swing-path-LHP.csv` - Left-handed pitcher data  
- `bat-tracking-swing-path-all.csv` - Combined/weighted data

**Daily Handedness Data Update:**
```bash
# If you have new CSV files, convert them:
node scripts/convertHandednessData.js

# The system automatically loads JSON files for real-time switching
# No server restart needed after conversion
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

**Strategic Matchup Context (New Feature):**
- **Integrated Analysis Component**: Real-time strategic analysis with 5 tabs (Targets, Avoids, Hot Streaks, Team Trends, Pitcher Intel)
- **Real Team Trends Service**: `realTeamTrendsService.js` - Analyzes actual game data over last 7 days for comprehensive team performance
- **Enhanced CSS Styling**: Professional styling with flex-based badge layout preventing stacking issues, matches PropFinder quality
- **Team Performance Metrics**: Runs/game, hits/game, HRs/game, momentum analysis, hot/cold players, key trends identification
- **Strategic Intelligence**: Target scoring with confidence levels, risk assessment, pitcher vulnerability analysis with explanatory context
- **Data Integration**: Uses `fetchPlayerData()` from dataService for historical game analysis across multiple dates

**Handedness Analysis System (Launch Angle Masters & Barrel Analysis):**
- **Real-time Handedness Toggle**: Switch between ALL/RHP/LHP data instantly without page reload
- **Shared Context**: Launch Angle Masters and Barrel Analysis cards synchronize handedness selection
- **Enhanced Swing Metrics**: Attack angle, bat speed, swing path optimization specific to pitcher handedness
- **Weighted Averages**: ALL combines RHP/LHP data using competitive swing counts as weights
- **Data Sources**: CSV conversion to JSON for optimal performance (`convertHandednessData.js`)
- **Player Name Matching**: Intelligent matching between "Cal Raleigh" and "Raleigh, Cal" formats
- **SwingScore Precision**: Rounded to 1 decimal place for readability
- **Performance Context**: Shows data source (handedness type + swing count) for transparency

**Enhanced Tooltip System (Updated):**
- **Poor Performance Card**: Updated tooltip to match PositiveMomentumCard style with enhanced game-by-game table
- **Detailed Game Table**: 10-game performance history with AB, H, HR, RBI, K, AVG columns and visual indicators
- **Performance Classification**: Games marked as poor, exceptional, multi-hit, power games with color coding
- **Statistical Summary**: Automatic totals calculation for recent performance overview
- **Visual Indicators**: Rest day markers (💤), performance level styling, and comprehensive game analysis

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

**Data Service Import Pattern (CRITICAL):**
- **dataService.js uses named exports only** - no default export available
- **Correct import**: `import { fetchPlayerData, fetchGameData } from './dataService'`
- **Available functions**: fetchPlayerData, fetchPlayerDataForDateRange, fetchTeamData, fetchGameData, fetchRosterData, checkDataExists, findClosestDateWithData
- **Common Error**: Using `import dataService from './dataService'` will cause build failures
- **Historical Data**: Use `fetchPlayerData(dateStr)` for daily player data, returns array of player objects
- **Team Filtering**: Filter by `player.team === teamAbbr || player.Team === teamAbbr` for consistent team matching

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

## Pitcher Intelligence System (BatchSummaryService)

### Current Implementation Overview

The Pinheads Playhouse pitcher intelligence system provides vulnerability and dominance analysis through `batchSummaryService.js`, specifically the `getPitcherIntelligence()` method. This system analyzes pitcher performance across all batters in a matchup to determine threat levels and classification.

### Vulnerability Index Calculation

**Core Formula (Current Implementation):**
```javascript
vulnerabilityIndex = avgHRScore + (hrRate * 10) + (toughBatterCount * 5)
```

**Component Breakdown:**
- **avgHRScore**: Average HR score across all analyzed batters for this pitcher
- **hrRate**: `pitcher_home_hr_total / pitcher_home_games` (season HR rate)
- **toughBatterCount**: Count of batters with HR score > 70 against this pitcher

**Pitcher Statistics Integration:**
```javascript
pitcherStats: {
  era: prediction.pitcher_era,           // Season ERA
  whip: prediction.pitcher_whip,         // Walks + Hits per IP
  hrPerGame: hrTotal / games,            // HR rate calculation
  trendDirection: prediction.pitcher_trend_dir  // General trend indicator
}
```

### Classification Logic

**Vulnerable Pitchers (High Vulnerability):**
- **Selection**: Top 5 highest vulnerability index scores
- **Threat Assessment**: Batters with HR scores > 70 counted as "tough matchups"
- **Risk Factors**: High season HR rate (>1.2 HR/game), high average batter HR scores

**Dominant Pitchers (Low Vulnerability):**
- **Selection**: Bottom 3 lowest vulnerability index scores (reversed for display)
- **Strength Indicators**: Low HR rates, low average batter HR scores
- **Dominance Metrics**: Consistent low vulnerability across multiple batters

### Current Methodology Limitations

**Season-Long Statistical Bias:**
- All HR totals are season-long cumulative without recent form weighting
- A pitcher with 5 HRs in first 10 games but 0 HRs in last 10 games still shows high vulnerability
- No differentiation between early season struggles and current form

**Oversimplified Calculation:**
- Three-factor formula lacks contextual depth
- No consideration of opposition quality or ballpark factors
- Missing pitcher fatigue, rest days, or workload analysis

**Example Issue:**
```javascript
// Pitcher A: 5 HR in 20 games = 0.25 HR/game
// Pitcher B: 3 HR in 5 games = 0.6 HR/game
// Current system ranks Pitcher A as less vulnerable despite potentially concerning recent trends
```

**Missing Context Integration:**
- No team offensive context (is opposing team in hot streak?)
- Ballpark factors available in stadiumContextService but not integrated
- Weather conditions not considered in vulnerability assessment
- No series or head-to-head matchup history

### Data Sources and Dependencies

**Required Data Fields:**
- `pitcher_era` - Season earned run average
- `pitcher_whip` - Season walks + hits per inning pitched  
- `pitcher_home_hr_total` - Total home runs allowed at home (season)
- `pitcher_home_games` - Total home games pitched (season)
- `pitcher_trend_dir` - General performance trend direction

**Generated Intelligence Tables:**
- **vulnerablePitchers**: Array of top 5 high-risk matchups
- **dominantPitchers**: Array of top 3 low-risk matchups  
- **pitcherCount**: Total number of unique pitchers analyzed

### Enhancement Opportunities

**Identified Critical Improvements:**

1. **Recent Performance Weighting**
   - Weight last 5 starts at 60%, season at 40%
   - Track HR trends over recent games vs season average
   - Include recent ERA and WHIP calculations

2. **Team Offensive Context**
   - Integrate opposing team's last 10 games scoring average
   - Consider team power surge/slump indicators (recent SLG, HR rate)
   - Factor in key lineup injuries or changes

3. **Ballpark and Situational Factors**
   - Integrate stadium HR factors from existing `stadiumContextService`
   - Include weather impact from `weatherContextService`  
   - Add home/away performance splits for pitchers

4. **Opposition Quality Adjustment**
   - Adjust vulnerability scores based on strength of recent opponents
   - Consider lineup quality metrics (team wOBA, ISO, etc.)
   - Factor in key player injuries affecting opposing offense

5. **Pitcher Fatigue and Form Analysis**
   - Rest days since last start
   - Recent pitch count trends and workload
   - Quality start consistency over last 5 appearances
   - Strikeout rate trends (improving/declining effectiveness)

**Enhanced Formula Proposal:**
```javascript
enhancedVulnerabilityIndex = 
  (recentFormScore * 0.6 + seasonScore * 0.4) +
  (adjustedHRRate * ballparkFactor * weatherFactor * 10) +
  (qualityAdjustedToughBatters * 5) +
  (teamOffensiveStrength * 3) +
  (pitcherFatigueIndex * 2)
```

## Pitcher Intelligence Enhancements (IMPLEMENTED)

### Enhanced Vulnerability Calculation

**New Implementation Features:**
- **Recent Form Weighting**: ERA ratio analysis comparing recent vs season performance
- **Team Offensive Context**: Integration with `teamPerformanceService` for opponent strength analysis
- **Explanatory Reasoning**: Detailed vulnerability and dominance explanations with specific metrics
- **Threat/Strength Levels**: Categorical assessments (extreme, high, moderate, low) with supporting evidence

**Enhanced Vulnerability Formula (Now Active):**
```javascript
baseVulnerability = avgHRScore + (seasonHRRate * 10) + (toughBatterCount * 5);
enhancedVulnerability = baseVulnerability + 
                        (recentFormAdjustment * 15) + 
                        (teamContextAdjustment * 8) + 
                        (ballparkAdjustment * 12);
```

**Recent Form Assessment:**
- **Struggling**: Recent ERA > 1.3x season ERA or HR rate > 1.5/game (+15 vulnerability points)
- **Concerning**: Recent ERA > 1.15x season ERA or HR rate > 1.0/game (+10.5 points)
- **Dominant**: Recent ERA < 0.8x season ERA and HR rate < 0.7/game (-4.5 points)
- **Improving**: Recent ERA < 0.9x season ERA (-1.5 points)

### Team Performance Integration

**New `teamPerformanceService.js`:**
- **Offensive Classification**: Elite, strong, average, below_average, weak
- **Trend Analysis**: Surging, improving, stable, declining, struggling  
- **Handedness Splits**: Performance vs RHP/LHP with advantage calculation
- **Power Metrics**: ISO, barrel rate, hard contact rate analysis
- **Momentum Factors**: Hot streaks, recent form, lineup changes

**Strength/Weakness Identification:**
- **Offensive Strengths**: Power, plate discipline, extra base hits, hard contact, momentum
- **Offensive Weaknesses**: Lack of power, poor discipline, contact issues, weak contact, cold streaks
- **Matchup Recommendations**: Target, favorable, neutral, avoid

### Explanatory Intelligence

**Vulnerability Reasons (Auto-Generated):**
- High HR rate (X.XX/game)
- High ERA (X.XX)
- Recent struggles/concerning form
- X high-threat batters
- High avg HR score (XX.X)

**Dominance Reasons (Auto-Generated):**
- Low HR rate (X.XX/game)
- Strong ERA (X.XX)
- Dominant/improving recent form
- No high-threat batters
- Low avg HR score (XX.X)

**Threat Level Classification:**
- **Extreme**: Vulnerability index > 90 or 4+ tough batters
- **High**: Vulnerability index > 75 or 3+ tough batters  
- **Moderate**: Vulnerability index > 60 or 2+ tough batters
- **Low**: Below moderate thresholds

### Advanced Matchup Analysis

**New `matchupStrengthAnalyzer.js` Utility:**
- **Comprehensive Pitcher Analysis**: Recent form, effectiveness, durability, situational strength
- **Offensive Threat Assessment**: Power threat level, contact quality, hot/cold batters
- **Contextual Integration**: Stadium, weather, timing, series momentum, injury impact
- **Strategic Recommendations**: Opportunity alerts, strategy suggestions, contextual insights
- **Confidence Scoring**: Data quality assessment with adjustment factors

**Analysis Categories:**
1. **Pitcher Strength Factors**: Form, effectiveness, vulnerabilities, advantages
2. **Offensive Strength Factors**: Team metrics, power threat, lineup depth, momentum
3. **Contextual Factors**: Historical, stadium, weather, timing, series context

### Usage Examples

**Enhanced Pitcher Intelligence:**
```javascript
// Now returns detailed analysis with reasoning
const pitcherIntelligence = await batchSummaryService.getPitcherIntelligence(predictions, matchups);

// Enhanced vulnerability data
pitcherIntelligence.vulnerablePitchers[0] = {
  pitcher: "Pitcher Name",
  vulnerabilityIndex: 87.3,
  reason: "High HR rate (1.45/game), Recent struggles, 3 high-threat batters",
  threatLevel: "high",
  classification: "vulnerable"
};
```

**Team Performance Analysis:**
```javascript
import teamPerformanceService from './services/teamPerformanceService';

const teamMetrics = await teamPerformanceService.analyzeTeamOffensivePerformance('SEA');
// Returns: classification, trend, strengthFactors, weaknessFactors, splits
```

**Comprehensive Matchup Analysis:**
```javascript
import matchupStrengthAnalyzer from './utils/matchupStrengthAnalyzer';

const analysis = await matchupStrengthAnalyzer.analyzeMatchupStrength(pitcher, batters, gameContext);
// Returns: detailed strength/weakness analysis with strategic recommendations
```

This implementation addresses the core issues identified in the original pitcher intelligence system while maintaining backward compatibility and providing extensive explanatory context for vulnerability and dominance classifications.

## Enhanced Bounce Back Analysis (CRITICAL FIX IMPLEMENTED)

### Problem Identified and Resolved

**Original Issue:** The bounce back analysis system had a fundamental flaw where players continued to receive "bounce back potential" points despite repeatedly failing to actually bounce back from poor performance. A player could have 10 consecutive poor games and still receive the same bounce back score.

**Root Cause:** The system treated each poor game as an independent bounce back opportunity without tracking failed attempts or considering the cumulative impact of repeated failures.

### Enhanced Implementation

**New `enhancedBounceBackAnalyzer.js`:**

**Key Improvements:**
1. **Failed Attempt Tracking**: Monitors how many bounce back opportunities a player has failed and penalizes accordingly
2. **Rolling Expectation**: Bounce back potential decreases with each failed attempt (15% penalty per failure)
3. **Historical Pattern Matching**: Compares current cold streaks to similar historical situations for that player
4. **Adaptive Analysis Windows**: Extends analysis beyond 5 games if needed to find meaningful patterns
5. **Confidence Decay**: Lower confidence with extended cold streaks and repeated failures

**Enhanced Formula:**
```javascript
baseBounceBackPotential = historicalSuccessRate;
failurePenalty = failedAttempts * 0.15; // 15% penalty per failed attempt
streakPenalty = (consecutivePoorGames - 4) * 0.08; // 8% penalty per game beyond 4
stalePenalty = (daysSinceGoodGame - 6) * 0.03; // Penalty for stale situations

finalPotential = Math.max(0.05, baseBounceBackPotential - failurePenalty - streakPenalty - stalePenalty);
```

**Classification System:**
- **Strong Bounce Back Candidate**: Potential ≥ 60%, Confidence ≥ 70%
- **Moderate Bounce Back Candidate**: Potential ≥ 40%, Confidence ≥ 50%  
- **Weak Bounce Back Candidate**: Potential ≥ 25%
- **Avoid**: Below thresholds or high failure rate

### Current Situation Analysis

**Tracks:**
- **Current Cold Streak**: Consecutive poor games
- **Failed Bounce Back Attempts**: Recent opportunities where player failed to recover
- **Failure Rate**: Percentage of recent bounce back attempts that failed
- **Days Since Good Game**: Time elapsed since last quality performance

**Example Analysis Output:**
```javascript
{
  currentSituation: {
    consecutivePoorGames: 5,
    failedBounceBackAttempts: 3,
    failureRate: 0.75, // 75% recent failure rate
    daysSinceGoodGame: 8
  },
  classification: 'avoid',
  bounceBackPotential: 0.12, // 12% (heavily penalized)
  confidence: 0.25,
  warnings: [
    '3 recent failed bounce back attempts - reduced potential',
    'Extended 5-game cold streak - significantly reduced potential'
  ]
}
```

### Integration Points

**generatePositivePlayerPerformance.js Enhancement:**
- Replaced `analyzeBounceBackPatterns()` with `analyzeEnhancedBounceBackPatterns()`
- Enhanced scoring considers failure tracking and confidence levels
- Explicit warnings for players with poor bounce back patterns
- Detailed explanatory context in positive factors

**Before Enhancement:**
```javascript
// Old system gave same score regardless of failed attempts
if (bounceBackRate > 0.5) {
  positiveScore += 20; // Always gave bonus for "pattern"
}
```

**After Enhancement:**
```javascript
// New system penalizes repeated failures
if (bounceBackAnalysis.recommendAction && bounceBackAnalysis.confidence >= 0.3) {
  const bounceBackBonus = Math.min(25, bounceBackAnalysis.score * 0.3);
  // Score is reduced by: (failedAttempts * 15%) + (streakLength * 8%) + (staleness * 3%)
}
```

### Usage Examples

**Testing Enhanced System:**
```javascript
// Test comparison between old and new systems
const { runBounceBackComparisonTest } = require('./utils/bounceBackComparisonTest');
runBounceBackComparisonTest();

// Test specific player case  
const { testSpecificCase } = require('./utils/bounceBackComparisonTest');
testSpecificCase(playerGameHistory, 'Player Name');
```

**Enhanced Bounce Back Analysis:**
```javascript
const { analyzeEnhancedBounceBackPatterns } = require('./services/enhancedBounceBackAnalyzer');

const analysis = analyzeEnhancedBounceBackPatterns(gameHistory, playerName);
// Returns detailed analysis with failure tracking and confidence scoring
```

### Impact Assessment

**Scenarios Correctly Identified:**
1. **Extended Cold Streaks**: Players with 5+ consecutive poor games now receive appropriate warnings
2. **Repeated Failures**: Players with multiple failed bounce back attempts get reduced scores
3. **Stale Situations**: Players who haven't had good games in 7+ days receive staleness penalties
4. **Historical Context**: Current situation compared to similar past cold streaks

**Risk Mitigation:**
- Prevents overconfidence in players with concerning patterns
- Provides transparent reasoning for bounce back recommendations
- Maintains opportunity identification for legitimate bounce back candidates
- Includes detailed warnings for high-risk situations

This critical enhancement ensures that bounce back analysis reflects realistic expectations based on recent performance patterns rather than treating each poor game as an independent opportunity for recovery.

## Critical Development Patterns and Lessons Learned

### Avoiding Infinite Positive Expectation Loops

**Core Problem Pattern:**
When analyzing player performance trends, avoid treating each negative event as an independent opportunity for positive rebound without tracking the success/failure history of such expectations.

**Examples of This Anti-Pattern:**
```javascript
// BAD: Infinite optimism without failure tracking
if (recentPoorPerformance) {
  bounceBackScore += 20; // Same bonus regardless of past failures
}

// GOOD: Failure-aware analysis  
if (recentPoorPerformance && failedAttempts < 3) {
  bounceBackScore += Math.max(5, 20 - (failedAttempts * 5));
}
```

**Implementation Guidelines:**
1. **Track Historical Patterns**: Always look at how similar situations resolved historically
2. **Implement Decay Functions**: Reduce confidence/scores with repeated failures
3. **Use Adaptive Windows**: Extend analysis timeframes when clear patterns aren't evident
4. **Provide Failure Context**: Show why expectations are reduced (e.g., "3 failed bounce back attempts")

### Enhanced Analysis Architecture Principles

**Rolling Expectation Framework:**
- Base expectations on historical success rates in similar situations
- Apply penalties for repeated failures to meet expectations
- Include confidence decay for extended negative patterns
- Compare current streaks to historical similar situations

**Contextual Intelligence Requirements:**
- Recent performance weighted more heavily than season averages
- Team/opponent context integrated into individual analysis
- Environmental factors (stadium, weather) considered in predictions
- Explanatory reasoning provided for all classifications

**Data Quality Awareness:**
- Confidence scoring based on data completeness and sample size
- Graceful fallbacks when primary data unavailable
- Transparent indication of data quality in predictions
- Regular validation of fallback strategy effectiveness

### Service Architecture Best Practices

**Analysis Service Integration:**
```javascript
// Services should be composable and context-aware
const analysis = await comprehensiveAnalysis({
  playerHistory: gameHistory,
  teamContext: await teamPerformanceService.analyze(team),
  opponentContext: await opponentAnalysis.analyze(opponent),
  environmentalContext: await environmentService.analyze(venue, weather)
});
```

**Caching and Performance:**
- Use intelligent caching with appropriate timeout strategies
- Batch analysis operations when possible
- Implement singleton patterns for shared service instances
- Optimize for both individual and batch prediction scenarios

### Testing and Validation Patterns

**Comparative Analysis Testing:**
- Always test enhanced systems against legacy implementations
- Create test scenarios that highlight improvement areas
- Include edge cases (extended streaks, repeated failures)
- Document expected behavior changes

**Performance Monitoring:**
- Track prediction accuracy vs actual outcomes
- Monitor confidence score calibration
- Validate that enhanced metrics correlate with real performance
- Regular assessment of penalty factor effectiveness

### Future Development Guidelines

**When Adding New Analysis Features:**
1. Consider how repeated failures should affect future predictions
2. Implement confidence/quality scoring from the start
3. Provide explanatory context for recommendations
4. Include comparative testing against simpler approaches
5. Document the specific problems being solved

**Integration with Existing Systems:**
- Maintain backward compatibility where possible
- Provide migration paths for enhanced features
- Include detailed reasoning in prediction outputs
- Support both individual and batch analysis scenarios

**Data Pipeline Considerations:**
- Design for missing data scenarios from the beginning
- Implement fallback hierarchies (individual → team → league → defaults)
- Include data freshness and quality indicators
- Support real-time and batch processing patterns

### Service Dependencies and Integration

**Core Service Relationships:**
- `batchSummaryService` ← Enhanced with team performance integration
- `teamPerformanceService` ← New service for opponent context
- `enhancedBounceBackAnalyzer` ← Replaces simple bounce back logic
- `matchupStrengthAnalyzer` ← Comprehensive matchup assessment utility

**External Integration Points:**
- BaseballAPI provides core prediction foundation
- Stadium context service for environmental factors
- Weather context service for game conditions
- Player badge system for enhanced categorization

This architectural foundation ensures that future enhancements maintain analytical rigor while avoiding the pitfalls of oversimplified positive expectation systems.

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