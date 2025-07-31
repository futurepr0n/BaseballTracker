# Weakspot Exploiter Scripts Guide

## 🚀 **RECOMMENDED SCRIPT TO USE**

**Use this script for the best results:**
```bash
python3 generate_enhanced_weakspot_exploiters.py 2025-07-28
```

## 📋 **All Available Scripts (For Reference)**

### ✅ **Enhanced Version (V3.0) - RECOMMENDED**
**File:** `generate_enhanced_weakspot_exploiters.py`
**Features:**
- Advanced vulnerability detection with league context
- Recent performance trend integration  
- Situational advantage detection
- Park factor adjustments
- Platoon advantage analysis
- Enhanced UI integration

### ⚡ **Professional Version (V2.0)**
**File:** `generate_professional_weakspot_exploiters.py`
**Features:**
- Real barrel rate analysis
- Exit velocity percentiles
- Expected vs actual performance regression
- Professional batter classification

### 📊 **CSV Version**
**File:** `generate_csv_weakspot_exploiters.py`
**Features:**
- CSV-based analysis
- Basic vulnerability detection

### 🎯 **Comprehensive Version**
**File:** `generate_comprehensive_weakspot_exploiters.py`
**Features:**
- Multi-factor analysis
- Standard vulnerability patterns

### 📝 **JavaScript Versions**
**Files:** `generate_weakspot_exploiters.js`, `generate_legitimate_weakspot_exploiters.js`
**Status:** Legacy - Use Python versions instead

## 🔧 **How to Run the Enhanced Script**

1. **For a specific date with lineup data:**
   ```bash
   python3 generate_enhanced_weakspot_exploiters.py 2025-07-28
   ```

2. **For today's date (if lineup data exists):**
   ```bash
   python3 generate_enhanced_weakspot_exploiters.py
   ```

3. **Check what dates have lineup data:**
   ```bash
   ls public/data/lineups/
   ```

## 📁 **Output Files**

The enhanced script creates these files:
- `public/data/weakspot_exploiters/enhanced_weakspot_exploiters_latest.json`
- `public/data/weakspot_exploiters/weakspot_exploiters_latest.json` (compatibility)
- `public/data/weakspot_exploiters/enhanced_weakspot_exploiters_YYYY-MM-DD.json`

## 🎯 **Current Status**

- ✅ Enhanced script generates data for July 28, 2025
- ✅ UI components updated to display enhanced features
- ✅ Data should now appear in the Weakspot Exploiters card

## 🔍 **Troubleshooting**

**If no data appears:**
1. Check if the script ran successfully (should see "✅ Enhanced analysis results saved")
2. Make sure your server is serving from the correct date
3. Try setting the dashboard date to July 28, 2025
4. Check browser console for any loading errors

**Common issues:**
- "No starting lineups found" - Use a date that has lineup data (July 28 works)
- Empty exploiters array - Normal if no strong matchups found on that date


Make sure you have the enhanced data sources in your BaseballTracker directory:

  Required CSV Files (in public/data/stats/):
  # Modern analytics files
  hitter_exit_velocity_2025.csv
  pitcher_exit_velocity_2025.csv
  hitterpitcharsenalstats_2025.csv
  pitcherpitcharsenalstats_2025.csv

  # Handedness matchup files
  batters-batted-ball-bat-left-pitch-hand-left-2025.csv
  batters-batted-ball-bat-left-pitch-hand-right-2025.csv
  batters-batted-ball-bat-right-pitch-hand-left-2025.csv
  batters-batted-ball-bat-right-pitch-hand-right-2025.csv

  # Swing path optimization files
  batters-swing-path-all.csv
  batters-swing-path-LHP.csv
  batters-swing-path-RHP.csv

  # Historical multi-year data (2022-2024)
  hitter_exit_velocity_2022.csv, hitter_exit_velocity_2023.csv, hitter_exit_velocity_2024.csv
  pitcher_exit_velocity_2022.csv, pitcher_exit_velocity_2023.csv, pitcher_exit_velocity_2024.csv
  hitterpitcharsenalstats_2022.csv, hitterpitcharsenalstats_2023.csv, hitterpitcharsenalstats_2024.csv
  pitcherpitcharsenalstats_2022.csv, pitcherpitcharsenalstats_2023.csv, pitcherpitcharsenalstats_2024.csv

  Daily Generation Commands

  Option 1: Generate for Today's Date
  cd BaseballTracker
  python generate_enhanced_weakspot_exploiters.py

  Option 2: Generate for Specific Date
  cd BaseballTracker
  python generate_enhanced_weakspot_exploiters.py --date 2025-07-31

  Integration with Daily Workflow

  Enhanced daily_update.sh Integration:
  Add this to your daily_update.sh script after the main data processing:

  #!/bin/bash
  DATE=${1:-$(date +%Y-%m-%d)}

  echo "🚀 Starting daily update for $DATE..."

  # ... existing daily update commands ...

  # Generate Enhanced Weakspot Exploiters (NEW)
  echo "🎯 Generating Enhanced Weakspot Exploiters for $DATE..."
  python generate_enhanced_weakspot_exploiters.py --date $DATE

  if [ $? -eq 0 ]; then
      echo "✅ Enhanced Weakspot Exploiters generated successfully"
  else
      echo "❌ Failed to generate Enhanced Weakspot Exploiters"
  fi

  echo "✅ Daily update complete for $DATE"

  Automated Daily Generation (Recommended)

  Add to your crontab for automatic daily generation:
  # Edit crontab
  crontab -e

  # Add this line for 9:00 AM daily generation (after scraper runs at 8:00 AM)
  0 9 * * * cd /path/to/BaseballTracker && python generate_enhanced_weakspot_exploiters.py >> logs/weakspot_exploiters.log 2>&1

  Or integrate with your existing morning automation:
  # In your smart_morning_run.py or similar automation script
  import subprocess
  import os

  def generate_weakspot_exploiters(date_str):
      """Generate enhanced weakspot exploiters for the given date"""
      try:
          os.chdir('/path/to/BaseballTracker')
          result = subprocess.run([
              'python', 'generate_enhanced_weakspot_exploiters.py',
              '--date', date_str
          ], capture_output=True, text=True)

          if result.returncode == 0:
              print(f"✅ Enhanced Weakspot Exploiters generated for {date_str}")
              return True
          else:
              print(f"❌ Failed to generate Enhanced Weakspot Exploiters: {result.stderr}")
              return False
      except Exception as e:
          print(f"❌ Error generating Enhanced Weakspot Exploiters: {e}")
          return False

  # Add to your morning workflow
  if __name__ == "__main__":
      today = datetime.now().strftime('%Y-%m-%d')

      # ... existing scraping and processing ...

      # Generate enhanced weakspot exploiters
      generate_weakspot_exploiters(today)

  Output Files Generated

  The enhanced system creates these files in public/data/predictions/:

  # Main enhanced output file
  enhanced_weakspot_exploiters_2025-07-31.json  # Date-specific file

  # Latest file (for easy access)
  enhanced_weakspot_exploiters_latest.json      # Always points to most recent

  File Structure and Content

  Enhanced Output Format:
  {
    "generated_date": "2025-07-31",
    "games_analyzed": 15,
    "exploiters_found": 431,
    "average_exploit_score": 87.4,
    "average_confidence": 0.554,
    "average_combined_score": 48.5,
    "data_quality": "excellent",
    "exploiters": [
      {
        "playerName": "C. Hummel",
        "team": "HOU",
        "opponentPitcher": "MacKenzie Gore",
        "opponentTeam": "WSH",
        "exploitIndex": 220.2,
        "confidence": 0.578,
        "combinedScore": 127.2,
        "classification": "elite_opportunity",
        "venue": "Daikin Park",
        "keyAdvantages": [
          "RHB vs LHP platoon advantage",
          "Hot streak (0.875 last 5 games)"
        ],
        "situationalAdvantages": [
          "RHB vs LHP platoon advantage",
          "Hot streak (0.875 last 5 games)"
        ],
        "exploitFactors": [
          "Elite barrel rate (15.2%)",
          "Strong arsenal matchup (23 pts)"
        ],
        "dataQuality": "excellent",
        "modernAnalytics": {
          "batterQualityMultiplier": 1.245,
          "pitcherVulnerabilityMultiplier": 1.123,
          "situationalMultiplier": 1.087
        }
      }
    ]
  }

  Monitoring and Validation

  Check generation success:
  # Check if file was created today
  ls -la public/data/predictions/enhanced_weakspot_exploiters_$(date +%Y-%m-%d).json

  # Check file size (should be substantial with enhanced data)
  du -h public/data/predictions/enhanced_weakspot_exploiters_latest.json

  # View summary statistics
  cat public/data/predictions/enhanced_weakspot_exploiters_latest.json | grep -E
  '"exploiters_found"|"average_combined_score"|"data_quality"'

  Quality validation:
  - Exploiters found: Should be 300-600+ with enhanced system
  - Average combined score: Should be 45-60+ (much higher than before)
  - Average confidence: Should be 0.5-0.6+ (vs 0.33 before)
  - Data quality: Should show "excellent" or "good" for most analyses

  Troubleshooting

  Common issues and solutions:

  1. "Could not load comprehensive batter stats" error:
  # Check if stats files exist
  ls public/data/stats/hitter_exit_velocity_2025.csv
  2. Low number of exploiters found:
  # Check if roster files are current
  ls public/data/rosters.json

  # Verify starting pitchers are loaded
  grep "Found.*starting pitchers" logs/weakspot_exploiters.log
  3. Missing handedness data:
  # Verify handedness CSV files exist
  ls public/data/stats/batters-batted-ball-bat-*-2025.csv

  Performance Expectations

  With Enhanced System:
  - Generation time: 30-60 seconds
  - Exploiters found: 300-600+ opportunities
  - Combined scores: 20-130+ range (vs 10-40 before)
  - Data utilization: All 1888+ data points properly weighted
  - Classification: More meaningful elite/strong/good tiers

  Integration with React Frontend

  The enhanced data automatically works with your existing WeakspotExploitersCard component - no frontend changes needed! The higher
  combined scores and better classifications will immediately improve the user experience.

  Daily workflow summary:
  1. 8:00 AM: Automated scraping (existing)
  2. 8:30 AM: Process daily stats (existing)
  3. 9:00 AM: Generate enhanced weakspot exploiters (NEW)
  4. 9:15 AM: Enhanced data available in React app

  This enhanced system will provide much more actionable and meaningful exploiter recommendations for your daily fantasy and betting
  analysis!
