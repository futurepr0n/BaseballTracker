# Data Integrity Master Guide
## Comprehensive Reference for Duplicate Data Issues in Baseball Analytics System

### Table of Contents
1. [Issue Recognition and Symptoms](#issue-recognition-and-symptoms)
2. [Investigation Methodology](#investigation-methodology)
3. [Root Cause Analysis Framework](#root-cause-analysis-framework)
4. [Solution Implementation Patterns](#solution-implementation-patterns)
5. [Prevention Strategies](#prevention-strategies)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Emergency Response Procedures](#emergency-response-procedures)
8. [Historical Case Studies](#historical-case-studies)

---

## Issue Recognition and Symptoms

### 🚨 **Primary Indicators of Duplicate Data Issues**

#### **Statistical Anomalies**
- **Milestone tracking showing incorrect totals** (e.g., player at 109 hits vs expected 98)
- **Inflated season statistics** that don't match external references
- **Unrealistic performance metrics** (>4 hits per game averages)
- **"Games since last HR" calculations being incorrect**

#### **Data Structure Signs**
- **Players appearing multiple times** in same date files with identical gameIds
- **Same gameId appearing across multiple dates** (cross-date duplicates)
- **Identical player statistics** in different game entries
- **File processing taking longer than usual** due to inflated data sets

#### **Application Behavior**
- **Milestone tracking inconsistencies** between dashboard and external sources
- **Player analysis showing impossible statistics**
- **Prediction algorithms producing skewed results**
- **Team statistics not matching sum of individual players**

### 🔍 **Quick Diagnostic Commands**

```bash
# Immediate health check
node scripts/data-validation/crossValidatePlayerStats.js

# Find duplicate gameIds across dates
find public/data -name "*.json" -exec grep -l "gameId.*401696" {} \; | wc -l

# Check for players with unrealistic stats
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/data/rolling_stats/rolling_stats_season_latest.json', 'utf8'));
const suspicious = data.allHitters.filter(p => (p.H || 0) / (p.games || 1) > 3);
console.log('Suspicious players:', suspicious.length);
"

# Identify recent file modifications
find public/data -name "*.json" -mtime -1 -exec ls -la {} \;
```

---

## Investigation Methodology

### 📊 **Step-by-Step Investigation Process**

#### **Phase 1: Initial Assessment (5-10 minutes)**
1. **Symptom Confirmation**
   ```bash
   # Check specific player mentioned in issue
   node scripts/data-validation/analyzePeteCrowArmstrong.js
   
   # Quick duplicate scan
   node scripts/data-validation/comprehensiveDuplicateDetector.js
   ```

2. **Scope Determination**
   ```bash
   # Count affected players
   grep -r "duplicate" scripts/data-validation/comprehensive_duplicate_report_*.json | wc -l
   
   # Check time range
   ls -la public/data/2025/*/
   ```

#### **Phase 2: Deep Analysis (15-30 minutes)**
1. **Cross-Date Analysis**
   ```bash
   # Run comprehensive detection
   node scripts/data-validation/comprehensiveDuplicateDetector.js
   ```

2. **Statistical Validation**
   ```bash
   # Validate rolling stats
   node scripts/data-validation/crossValidatePlayerStats.js
   
   # Check milestone tracking
   grep -A 5 -B 5 "PlayerName" public/data/predictions/milestone_tracking_latest.json
   ```

3. **Processing History Review**
   ```bash
   # Check processing logs
   cat scripts/data-validation/processing_log.json
   
   # Review recent automation logs
   tail -100 logs/daily_automation.log
   ```

#### **Phase 3: Root Cause Analysis (30-60 minutes)**
1. **Pipeline Analysis**
   - Review statLoader.js logic for duplicate handling
   - Check CSV processing workflow
   - Examine daily automation sequence
   - Validate data source integrity

2. **Timeline Reconstruction**
   - Identify when clean data became corrupted
   - Map processing events to duplicate creation
   - Determine if issue is ongoing or historical

### 🔧 **Investigation Tools and Scripts**

| Tool | Purpose | Command |
|------|---------|---------|
| **comprehensiveDuplicateDetector.js** | Full system scan | `node scripts/data-validation/comprehensiveDuplicateDetector.js` |
| **crossValidatePlayerStats.js** | Key player validation | `node scripts/data-validation/crossValidatePlayerStats.js` |
| **analyzePeteCrowArmstrong.js** | Individual player analysis | `node scripts/data-validation/analyzePeteCrowArmstrong.js` |
| **validatePlayerCleanup.js** | Cleanup validation | `node scripts/data-validation/validatePlayerCleanup.js` |
| **postCleanupVerification.js** | Post-fix verification | `node scripts/data-validation/postCleanupVerification.js` |

---

## Root Cause Analysis Framework

### 🎯 **Common Root Causes and Their Signatures**

#### **1. Flawed Duplicate Detection Logic**
**Signature:**
- Different gameIds automatically trigger "add" action
- Low confidence scores (0.7-0.8) with warnings about "possible doubleheader"
- Pattern of systematic duplication across dates

**Root Cause Pattern:**
```javascript
// PROBLEMATIC PATTERN:
if (existingPlayer.gameId !== newPlayer.gameId) {
  result.action = 'add';  // ❌ Assumes legitimate without validation
  result.confidence = 0.8;
}
```

**Fix Pattern:**
```javascript
// ENHANCED PATTERN:
if (existingPlayer.gameId !== newPlayer.gameId) {
  const validation = validateDoubleheader(existingPlayer, newPlayer, ...);
  if (validation.isLegitimate) {
    result.action = 'add';
  } else {
    result.action = 'skip';
  }
}
```

#### **2. CSV Reprocessing Issues**
**Signature:**
- Same CSV files processed multiple times
- Processing logs showing duplicate entries
- File modification times inconsistent with processing times

**Detection:**
```bash
# Check processing log for duplicates
cat scripts/data-validation/processing_log.json | jq '.processedFiles | keys' | sort | uniq -d

# Check for multiple processing of same file
grep -c "filename.csv" logs/daily_automation.log
```

#### **3. Postponed Game Handling**
**Signature:**
- GameIds appearing on multiple dates
- Games in suspicious date ranges (known problematic periods)
- Inconsistent game context validation

**Detection:**
```bash
# Check for cross-date gameIds
find public/data -name "*.json" -exec grep -l "401696313" {} \;

# Look for postponement patterns
grep -r "postponed\|rescheduled" scripts/data-validation/
```

#### **4. Race Conditions in Processing**
**Signature:**
- Inconsistent duplicate patterns
- Processing errors during concurrent operations
- Lock file presence in processing directories

**Detection:**
```bash
# Check for active processing locks
ls -la scripts/data-validation/locks/

# Look for concurrent processing indicators
ps aux | grep statLoader
```

### 🔬 **Advanced Diagnostic Techniques**

#### **Statistical Pattern Analysis**
```bash
# Identify players with exact duplicate statistics
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/data/2025/july/july_11_2025.json', 'utf8'));
const duplicates = {};
data.players.forEach(p => {
  const key = \`\${p.name}_\${p.H}_\${p.AB}_\${p.gameId}\`;
  duplicates[key] = (duplicates[key] || 0) + 1;
});
const exactDuplicates = Object.entries(duplicates).filter(([k,v]) => v > 1);
console.log('Exact duplicates:', exactDuplicates.length);
"
```

#### **Cross-Reference Validation**
```bash
# Compare against external data sources
node -e "
// Load expected values from external source
const expected = { 'C. Bellinger': 96, 'P. Crow-Armstrong': 98 };
const actual = /* load from rolling stats */;
// Compare and report discrepancies
"
```

---

## Solution Implementation Patterns

### 🛠️ **Standard Resolution Workflow**

#### **Pattern 1: Historical Cleanup (Most Common)**
**When:** Duplicates already exist in data
**Approach:** Detect → Clean → Regenerate → Validate

```bash
# 1. Detection Phase
node scripts/data-validation/comprehensiveDuplicateDetector.js

# 2. Cleanup Phase  
node scripts/data-validation/systematicDuplicateFixer.js

# 3. Regeneration Phase
./generate_rolling_stats.sh
node src/services/generateMilestoneTracking.js

# 4. Validation Phase
node scripts/data-validation/crossValidatePlayerStats.js
```

#### **Pattern 2: Pipeline Prevention (Permanent Fix)**
**When:** Need to prevent future duplicates
**Approach:** Enhance → Validate → Deploy → Monitor

```bash
# 1. Enhance duplicate detection
# Update statLoader.js with enhanced logic
# Add processing locks
# Implement prevention validation

# 2. Validate enhancements
node --check src/services/statLoader.js
node -e "require('./src/services/enhancedDuplicateDetection')"

# 3. Deploy to production
# Update automation scripts
# Monitor processing logs
```

#### **Pattern 3: Emergency Response (Critical Issues)**
**When:** Production system affected, immediate fix needed
**Approach:** Quick Fix → Validate → Monitor → Permanent Fix

```bash
# Immediate response
node scripts/data-validation/applyDuplicateFixes.js

# Validation
node scripts/data-validation/crossValidatePlayerStats.js

# Monitor
tail -f logs/daily_automation.log | grep -E "(DUPLICATE|ERROR|WARN)"
```

### 🔧 **Code Enhancement Patterns**

#### **Enhanced Duplicate Detection Template**
```javascript
function detectEnhancedDuplicatesWithPrevention(existingPlayers, newPlayer, gameId, date, csvFilePath, processingLog) {
  const result = {
    isDuplicate: false,
    duplicateType: null,
    action: 'add',
    warnings: [],
    confidence: 1.0,
    confirmedDoubleheader: false
  };
  
  // 1. Find existing player
  const existingPlayerIndex = findExistingPlayer(existingPlayers, newPlayer);
  
  if (existingPlayerIndex >= 0) {
    const existingPlayer = existingPlayers[existingPlayerIndex];
    
    // 2. Check for exact duplicate
    if (existingPlayer.gameId === newPlayer.gameId) {
      return handleExactDuplicate(existingPlayer, newPlayer, csvFilePath, processingLog);
    }
    
    // 3. Validate potential doubleheader
    if (existingPlayer.gameId !== newPlayer.gameId) {
      return validateDoubleheader(existingPlayer, newPlayer, date, csvFilePath, processingLog);
    }
  }
  
  return result;
}
```

#### **Processing Lock Pattern**
```javascript
async function processWithLock(csvFilePath, processFunction) {
  const lockAcquired = await acquireProcessingLock(csvFilePath);
  if (!lockAcquired) {
    throw new Error('Could not acquire processing lock');
  }
  
  try {
    return await processFunction(csvFilePath);
  } finally {
    releaseProcessingLock(csvFilePath);
  }
}
```

---

## Prevention Strategies

### 🛡️ **Proactive Prevention Measures**

#### **1. Enhanced Data Processing Pipeline**
- **Sophisticated duplicate detection** at point of data entry
- **Processing locks** to prevent concurrent operations
- **File processing history** to prevent reprocessing
- **Statistical validation** during data loading

#### **2. Automated Monitoring**
```bash
# Daily duplicate detection
0 9 * * * cd /app/BaseballTracker && node scripts/data-validation/comprehensiveDuplicateDetector.js >> logs/duplicate-monitoring.log 2>&1

# Weekly validation
0 10 * * 1 cd /app/BaseballTracker && node scripts/data-validation/crossValidatePlayerStats.js >> logs/weekly-validation.log 2>&1

# Statistical anomaly detection
0 8 * * * cd /app/BaseballTracker && node scripts/monitoring/statisticalAnomalyDetector.js >> logs/anomaly-detection.log 2>&1
```

#### **3. Data Source Validation**
- **CSV file integrity checks** before processing
- **External reference validation** for key statistics
- **Processing log verification** for consistency
- **Backup validation** before modifications

#### **4. Workflow Integration**
```bash
# Enhanced daily automation with prevention
ENHANCED_DAILY_WORKFLOW="
1. Cleanup stale locks
2. Run duplicate detection
3. Process CSV files with enhanced validation
4. Generate statistics with validation
5. Post-processing verification
6. Alert on anomalies
"
```

### 📊 **Monitoring Dashboards and Alerts**

#### **Key Metrics to Monitor**
- **Duplicate detection rate** (should be low after fixes)
- **Processing time trends** (increases may indicate issues)
- **Statistical anomaly counts** (track unusual patterns)
- **Validation success rates** (should remain high)

#### **Alert Conditions**
```bash
# High duplicate detection rate
if [ duplicates_found -gt 10 ]; then
  alert "High duplicate rate detected: $duplicates_found"
fi

# Statistical anomalies
if [ anomaly_count -gt 5 ]; then
  alert "Statistical anomalies detected: $anomaly_count"
fi

# Validation failures
if [ validation_failures -gt 2 ]; then
  alert "Validation failures: $validation_failures"
fi
```

---

## Monitoring and Maintenance

### 📈 **Ongoing Monitoring Procedures**

#### **Daily Monitoring (Automated)**
```bash
#!/bin/bash
# daily_monitoring.sh

echo "🔍 Daily Data Integrity Check - $(date)"

# 1. Quick duplicate scan
duplicates=$(node scripts/data-validation/comprehensiveDuplicateDetector.js | grep -c "CRITICAL DUPLICATES")
echo "Duplicates found: $duplicates"

# 2. Statistical validation
node scripts/data-validation/crossValidatePlayerStats.js > /tmp/validation.log
validation_issues=$(grep -c "❌\|⚠️" /tmp/validation.log)
echo "Validation issues: $validation_issues"

# 3. Processing log health
log_health=$(jq '.lastUpdated' scripts/data-validation/processing_log.json)
echo "Last processing: $log_health"

# 4. Generate daily report
cat << EOF > logs/daily_integrity_$(date +%Y%m%d).log
Date: $(date)
Duplicates: $duplicates
Validation Issues: $validation_issues
Processing Health: OK
Status: $([ $duplicates -eq 0 ] && [ $validation_issues -lt 3 ] && echo "HEALTHY" || echo "NEEDS_ATTENTION")
EOF
```

#### **Weekly Deep Validation**
```bash
#!/bin/bash
# weekly_validation.sh

echo "📊 Weekly Deep Validation - $(date)"

# 1. Comprehensive duplicate detection
node scripts/data-validation/comprehensiveDuplicateDetector.js > logs/weekly_duplicates_$(date +%Y%m%d).log

# 2. Cross-validate all key players
node scripts/data-validation/crossValidatePlayerStats.js > logs/weekly_validation_$(date +%Y%m%d).log

# 3. Statistical trend analysis
node scripts/monitoring/statisticalTrendAnalysis.js > logs/weekly_trends_$(date +%Y%m%d).log

# 4. Processing efficiency metrics
node scripts/monitoring/processingEfficiencyReport.js > logs/weekly_efficiency_$(date +%Y%m%d).log

# 5. Generate weekly summary report
node scripts/monitoring/generateWeeklySummary.js
```

#### **Monthly Comprehensive Audit**
```bash
#!/bin/bash
# monthly_audit.sh

echo "🔍 Monthly Comprehensive Audit - $(date)"

# 1. Full data integrity scan
node scripts/audit/comprehensiveDataAudit.js

# 2. Performance benchmarking
node scripts/audit/performanceBenchmark.js

# 3. External validation
node scripts/audit/externalDataValidation.js

# 4. Backup verification
node scripts/audit/backupIntegrityCheck.js

# 5. Generate monthly report
node scripts/audit/generateMonthlyReport.js
```

### 🚨 **Alert and Escalation Procedures**

#### **Alert Levels**
1. **INFO**: Normal operation, statistical reports
2. **WARN**: Minor anomalies detected, monitoring increased
3. **ERROR**: Significant issues detected, immediate attention needed
4. **CRITICAL**: Data integrity compromised, emergency response required

#### **Response Procedures**
```bash
# INFO Level - Log and continue
log_info() {
  echo "$(date): INFO - $1" >> logs/info.log
}

# WARN Level - Log, notify, continue monitoring
log_warn() {
  echo "$(date): WARN - $1" >> logs/warn.log
  # Send notification to monitoring system
}

# ERROR Level - Log, alert, investigate
log_error() {
  echo "$(date): ERROR - $1" >> logs/error.log
  # Send immediate alert
  # Trigger investigation workflow
}

# CRITICAL Level - Log, alert, emergency response
log_critical() {
  echo "$(date): CRITICAL - $1" >> logs/critical.log
  # Immediate emergency response
  # Stop processing if necessary
  # Execute emergency procedures
}
```

---

## Emergency Response Procedures

### 🚨 **Critical Issue Response Workflow**

#### **Immediate Response (0-15 minutes)**
1. **Assess Impact**
   ```bash
   # Quick health check
   node scripts/emergency/quickHealthCheck.js
   
   # Identify affected systems
   node scripts/emergency/impactAssessment.js
   ```

2. **Stabilize System**
   ```bash
   # Stop processing if necessary
   pkill -f "statLoader.js"
   
   # Backup current state
   cp -r public/data/ backups/emergency_$(date +%Y%m%d_%H%M%S)/
   ```

3. **Communicate Status**
   ```bash
   # Log emergency response initiation
   echo "$(date): EMERGENCY RESPONSE INITIATED" >> logs/emergency.log
   
   # Notify stakeholders
   # Update status page
   ```

#### **Investigation Phase (15-60 minutes)**
1. **Rapid Diagnosis**
   ```bash
   # Run comprehensive detection
   node scripts/data-validation/comprehensiveDuplicateDetector.js
   
   # Check recent processing logs
   tail -1000 logs/daily_automation.log | grep -E "(ERROR|DUPLICATE|FAIL)"
   ```

2. **Scope Assessment**
   ```bash
   # Identify affected time range
   # Count affected players
   # Assess data corruption extent
   ```

#### **Resolution Phase (1-4 hours)**
1. **Apply Emergency Fix**
   ```bash
   # Use automated fix if appropriate
   node scripts/data-validation/applyDuplicateFixes.js
   
   # Or manual intervention if needed
   ```

2. **Validate Resolution**
   ```bash
   # Verify fix effectiveness
   node scripts/data-validation/crossValidatePlayerStats.js
   
   # Test system functionality
   node scripts/emergency/systemFunctionalityTest.js
   ```

3. **Resume Operations**
   ```bash
   # Restart processing
   # Monitor closely
   # Verify normal operation
   ```

#### **Post-Emergency Analysis (4-24 hours)**
1. **Root Cause Analysis**
   - Document timeline of events
   - Identify contributing factors
   - Analyze prevention failure points

2. **Process Improvement**
   - Update prevention measures
   - Enhance monitoring capabilities
   - Improve response procedures

3. **Documentation Update**
   - Update this guide with lessons learned
   - Revise emergency procedures
   - Share knowledge with team

### 🔧 **Emergency Toolkit**

#### **Quick Recovery Scripts**
```bash
# Emergency backup restoration
scripts/emergency/restoreFromBackup.sh <backup_timestamp>

# Emergency duplicate cleanup
scripts/emergency/emergencyDuplicateCleanup.sh

# Emergency validation
scripts/emergency/emergencyValidation.sh

# System health check
scripts/emergency/systemHealthCheck.sh
```

#### **Emergency Contacts and Procedures**
```
Primary Contact: [System Administrator]
Secondary Contact: [Data Engineer]
Escalation Path: [Team Lead] → [Manager] → [Director]

Emergency Response Team:
- Data Engineer: Initial response and technical resolution
- System Administrator: Infrastructure and backup management
- Application Owner: Business impact assessment
```

---

## Historical Case Studies

### 📚 **Case Study 1: Cody Bellinger Milestone Issue (July 2025)**

#### **Situation**
- **Reported Issue**: Cody Bellinger showing 109 hits in milestone tracker vs expected 92 hits
- **Discovery Method**: User noticed discrepancy in milestone tracking
- **Initial Assessment**: Single player issue

#### **Investigation**
- **Tools Used**: analyzePeteCrowArmstrong.js (adapted), crossValidatePlayerStats.js
- **Timeline**: Issue discovered on daily update run
- **Scope Discovery**: Found to be system-wide affecting 405 players

#### **Root Cause**
- **Primary**: Flawed duplicate detection logic in statLoader.js
- **Secondary**: Cross-date duplicate games from postponement handling
- **Contributing**: Lack of comprehensive validation in daily workflow

#### **Resolution**
```bash
# Investigation
node scripts/data-validation/duplicateDetectionService.js

# Cleanup
node scripts/review/executeApprovedBatch.js

# Regeneration
./generate_rolling_stats.sh
```

#### **Outcome**
- **405 affected players corrected**
- **Duplicate detection enhanced**
- **Prevention measures implemented**

#### **Lessons Learned**
1. **Single player issues often indicate system-wide problems**
2. **External validation is critical for detection**
3. **Milestone tracking is an excellent early warning system**
4. **Comprehensive scanning reveals true scope**

#### **Prevention Measures Added**
- Enhanced duplicate detection logic
- Daily validation checks
- Automated milestone tracking verification

---

### 📚 **Case Study 2: Pete Crow-Armstrong Duplicate Issue (July 2025)**

#### **Situation**
- **Reported Issue**: Pete Crow-Armstrong showing 109 hits vs expected 98 hits
- **Discovery Method**: Post-cleanup validation revealed persistent issues
- **Timing**: After initial cleanup, suggesting ongoing source of duplicates

#### **Investigation**
- **Tools Used**: analyzePeteCrowArmstrong.js, cleanPlayerDuplicates.js
- **Key Finding**: 5 duplicate games with 11 extra hits
- **Scope**: Player-level duplicates persisting after game-level cleanup

#### **Root Cause**
- **Primary**: Incomplete cleanup - removed games from games array but left duplicate players in players array
- **Discovery**: Original cleanup only handled one type of duplicate

#### **Resolution**
```bash
# Enhanced player-level cleanup
node scripts/data-validation/cleanPlayerDuplicates.js

# Execute cleanup of 2060 player entries
node scripts/review/executeApprovedBatch.js

# Regenerate statistics
./generate_rolling_stats.sh
```

#### **Outcome**
- **2060 player entries removed**
- **Pete Crow-Armstrong corrected to 98 hits**
- **Enhanced cleanup procedures developed**

#### **Lessons Learned**
1. **Dual-array data structure requires dual cleanup approach**
2. **Player-level and game-level duplicates are separate issues**
3. **Post-cleanup validation is essential**
4. **Specific player analysis reveals cleanup effectiveness**

#### **Prevention Measures Added**
- Dual-array cleanup procedures
- Enhanced post-processing validation
- Player-specific validation scripts

---

### 📚 **Case Study 3: Systematic Pipeline Issue (July 2025)**

#### **Situation**
- **Reported Issue**: Duplicates reappeared after clean data and daily update run
- **Discovery Method**: User noticed recurrence of previously fixed issues
- **Critical Insight**: Issue was ongoing in pipeline, not historical

#### **Investigation**
- **Tools Used**: comprehensiveDuplicateDetector.js, pipeline analysis
- **Key Finding**: 496 player duplicates across 18 games
- **Scope**: Entire data processing pipeline compromised

#### **Root Cause**
- **Primary**: statLoader.js automatic "add" for different gameIds
- **Secondary**: CSV reprocessing without proper prevention
- **Contributing**: Old daily_update.sh lacking duplicate prevention

#### **Resolution**
```bash
# Enhanced duplicate detection system
node scripts/data-validation/enhancedDuplicateDetection.js

# Processing lock implementation
node scripts/data-validation/processingLockManager.js

# Systematic cleanup
node scripts/data-validation/systematicDuplicateFixer.js

# Pipeline enhancement
# Enhanced statLoader.js with prevention logic
```

#### **Outcome**
- **496 duplicates removed systematically**
- **Enhanced pipeline with prevention**
- **Processing locks implemented**
- **Comprehensive fix script created**

#### **Lessons Learned**
1. **Prevention is more effective than cleanup**
2. **Pipeline analysis reveals root causes**
3. **Processing locks prevent race conditions**
4. **Systematic approach handles large-scale issues**

#### **Prevention Measures Added**
- Enhanced duplicate detection in statLoader.js
- Processing lock management system
- Comprehensive validation pipeline
- Automated fix script for future issues

---

## Quick Reference

### 🚀 **Emergency Commands**
```bash
# Immediate duplicate detection
node scripts/data-validation/comprehensiveDuplicateDetector.js

# One-command fix
node scripts/data-validation/applyDuplicateFixes.js

# Validate specific player
node scripts/data-validation/crossValidatePlayerStats.js

# Check system health
node scripts/emergency/systemHealthCheck.js
```

### 📊 **Monitoring Commands**
```bash
# Daily health check
./scripts/monitoring/daily_monitoring.sh

# Weekly validation
./scripts/monitoring/weekly_validation.sh

# Check processing locks
ls -la scripts/data-validation/locks/

# Monitor automation logs
tail -f logs/daily_automation.log
```

### 🔧 **Development Commands**
```bash
# Test enhanced duplicate detection
node -e "require('./src/services/enhancedDuplicateDetection')"

# Validate syntax
node --check src/services/statLoader.js

# Test processing locks
node -e "require('./src/services/processingLockManager')"
```

### 📚 **Documentation Files**
- **This Guide**: `DATA_INTEGRITY_MASTER_GUIDE.md`
- **Production Guide**: `PRODUCTION_DUPLICATE_FIX_GUIDE.md`
- **Case Summary**: `DUPLICATE_CLEANUP_SUMMARY.md`
- **Claude Instructions**: `CLAUDE.md`

---

*This master guide should be updated with each new case study and lessons learned. Version controlled and maintained as part of the critical system documentation.*

**Last Updated**: July 13, 2025  
**Version**: 1.0  
**Next Review**: August 13, 2025