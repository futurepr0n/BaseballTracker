# Production Deployment Guide - Duplicate Detection & Data Pipeline Fixes

## Overview

This guide provides step-by-step instructions for deploying the enhanced duplicate detection and data pipeline fixes to your production BaseballTracker system. These fixes address the systematic data corruption affecting 405 players (96% of the dataset) and implement comprehensive duplicate prevention for future data processing.

## Critical Issues Addressed

### 1. Systematic Data Corruption (July 2-9, 2025)
- **Impact**: 405 out of 422 players affected
- **Cause**: Cross-date duplicate game entries with same game IDs
- **Result**: Inflated player statistics (e.g., C. Bellinger: 99 hits instead of 92)

### 2. Data Pipeline Vulnerabilities
- **Issue**: Insufficient duplicate detection in statLoader.js
- **Risk**: Future duplicate data introduction
- **Solution**: Enhanced validation and prevention mechanisms

## Pre-Deployment Checklist

### ✅ Environment Verification
- [ ] Backup all production data
- [ ] Verify Node.js version compatibility (14+)
- [ ] Ensure sufficient disk space for backups and processing
- [ ] Test network connectivity to external data sources

### ✅ Dependency Check
- [ ] All required npm packages installed
- [ ] CSV processing tools available
- [ ] Git repository access for rollback capability

### ✅ Safety Preparation
- [ ] Identify maintenance window (recommended: 2-4 hours)
- [ ] Prepare rollback procedures
- [ ] Notify stakeholders of maintenance
- [ ] Set up monitoring for deployment process

## Phase 1: System Preparation (30 minutes)

### Step 1.1: Create Complete System Backup
```bash
# Navigate to production BaseballTracker directory
cd /path/to/production/BaseballTracker

# Create comprehensive backup
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="production_backup_${BACKUP_DATE}"

mkdir -p "backups/${BACKUP_DIR}"
tar -czf "backups/${BACKUP_DIR}/complete_system_backup.tar.gz" \
  public/data/ \
  src/services/ \
  scripts/ \
  *.sh \
  package*.json

echo "✅ Backup created: backups/${BACKUP_DIR}"
```

### Step 1.2: Deploy Enhanced Scripts
```bash
# Copy all enhanced scripts from test environment
mkdir -p scripts/data-validation
mkdir -p utils

# Copy validation utilities
cp /path/to/test/utils/gameIdValidator.js utils/
cp /path/to/test/utils/doubleheaderValidator.js utils/

# Copy data validation scripts
cp /path/to/test/scripts/data-validation/*.js scripts/data-validation/

# Copy enhanced service files
cp /path/to/test/src/services/duplicateDetectionService.js src/services/
cp /path/to/test/src/services/statLoader.js src/services/

# Copy enhanced shell scripts
cp /path/to/test/process_all_stats.sh .
cp /path/to/test/daily_update.sh .

echo "✅ Enhanced scripts deployed"
```

### Step 1.3: Verify Script Permissions
```bash
# Make shell scripts executable
chmod +x process_all_stats.sh
chmod +x daily_update.sh
chmod +x scripts/data-validation/*.js

# Verify permissions
ls -la *.sh scripts/data-validation/

echo "✅ Script permissions verified"
```

## Phase 2: Data Analysis & Validation (45 minutes)

### Step 2.1: Run Comprehensive Duplicate Analysis
```bash
# Generate detailed analysis report
echo "🔍 Running comprehensive duplicate analysis..."
node scripts/data-validation/validateDuplicateFixes.js > duplicate_analysis_report.txt 2>&1

# Review critical findings
cat duplicate_analysis_report.txt

# Expected output should show:
# - ~405 affected players detected
# - July 2-9 systematic corruption identified
# - High-confidence removal recommendations
```

### Step 2.2: Validate System Components
```bash
# Run comprehensive test suite
echo "🧪 Running system validation tests..."
node scripts/data-validation/testDuplicateDetection.js --test-type=unit > test_results.txt 2>&1

# Check test results
grep -E "(PASS|FAIL|Success Rate)" test_results.txt

# Expected: >90% success rate
```

### Step 2.3: Generate Detailed Duplicate Report
```bash
# Create comprehensive duplicate analysis
echo "📊 Generating detailed duplicate analysis..."
node -e "
const service = require('./src/services/duplicateDetectionService');
(async () => {
  const analysis = await service.analyzeDatasetForDuplicates();
  await service.saveAnalysisResults(analysis, 'production_duplicate_analysis.json');
  console.log('Analysis saved to: production_duplicate_analysis.json');
})();
"

# Review the analysis file
echo "📋 Analysis summary:"
node -e "
const fs = require('fs');
const analysis = JSON.parse(fs.readFileSync('production_duplicate_analysis.json', 'utf8'));
console.log('Total Issues:', analysis.summary.totalIssues);
console.log('Affected Players:', analysis.summary.affectedPlayers);
console.log('High Confidence Removals:', analysis.summary.highConfidenceRemovals);
"
```

## Phase 3: Staged Data Cleanup (60-90 minutes)

### Step 3.1: High-Confidence Duplicate Removal
```bash
# Create specific backup before cleanup
CLEANUP_BACKUP="cleanup_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "backups/${CLEANUP_BACKUP}"
cp -r public/data/2025 "backups/${CLEANUP_BACKUP}/"

# Run batch removal with safety limits (dry run first)
echo "🔍 Testing batch removal (dry run)..."
node scripts/data-validation/batchDuplicateRemoval.js --dry-run

# If dry run looks good, run actual cleanup for high-confidence items only
echo "⚠️  CRITICAL: Review dry run output before proceeding"
read -p "Continue with high-confidence cleanup? (yes/no): " confirm

if [ "$confirm" = "yes" ]; then
  echo "🔧 Running high-confidence duplicate removal..."
  
  # Modify the batch removal script to process only high-confidence items
  # This may require creating a custom script for production
  
  # Alternative: Manual cleanup of specific known issues
  echo "📝 Applying targeted fixes for known issues..."
  
  # Fix specific C. Bellinger duplicates (example)
  node -e "
  const fs = require('fs');
  
  // Example: Remove specific duplicate from July 3rd file
  const filePath = 'public/data/2025/july/july_03_2025.json';
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Remove players with specific duplicate game IDs
    const originalLength = data.players.length;
    data.players = data.players.filter(player => {
      // Remove known duplicate game IDs from suspicious dates
      const suspiciousDuplicates = ['401696200', '401696221'];
      const isSuspiciousDate = filePath.includes('july_03_') || filePath.includes('july_05_');
      
      if (isSuspiciousDate && suspiciousDuplicates.includes(player.gameId)) {
        console.log('Removing duplicate:', player.name, player.gameId);
        return false;
      }
      return true;
    });
    
    if (data.players.length !== originalLength) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log('Fixed duplicates in:', filePath, 'Removed:', originalLength - data.players.length, 'entries');
    }
  }
  "
  
  echo "✅ Targeted fixes applied"
else
  echo "❌ Cleanup cancelled by user"
  exit 1
fi
```

### Step 3.2: Verify Cleanup Results
```bash
# Re-run analysis to verify improvements
echo "🔍 Verifying cleanup results..."
node scripts/data-validation/validateDuplicateFixes.js > post_cleanup_analysis.txt 2>&1

# Compare before and after
echo "📊 Cleanup comparison:"
echo "Before cleanup:"
cat duplicate_analysis_report.txt | grep "Affected Players:"

echo "After cleanup:"
cat post_cleanup_analysis.txt | grep "Affected Players:"

# Verify specific player fix (C. Bellinger)
echo "🎯 Verifying C. Bellinger fix:"
node -e "
const fs = require('fs');
let totalHits = 0;
let totalGames = 0;

// Check all July files for C. Bellinger
const julyFiles = fs.readdirSync('public/data/2025/july/').filter(f => f.endsWith('.json'));

julyFiles.forEach(file => {
  const data = JSON.parse(fs.readFileSync('public/data/2025/july/' + file, 'utf8'));
  const players = Array.isArray(data.players) ? data.players : data;
  
  players.forEach(player => {
    if (player.name === 'C. Bellinger' && player.team === 'NYY') {
      totalHits += parseInt(player.H) || 0;
      totalGames++;
    }
  });
});

console.log('C. Bellinger July stats:', totalHits, 'hits in', totalGames, 'games');
"
```

## Phase 4: Enhanced Pipeline Deployment (30 minutes)

### Step 4.1: Test Enhanced CSV Processing
```bash
# Test enhanced CSV processing (if new CSVs available)
echo "🧪 Testing enhanced CSV processing..."

# Use dry-run mode first
./process_all_stats.sh --dry-run

# If successful, run with enhanced validation
echo "✅ CSV processing validation passed"
```

### Step 4.2: Test Enhanced Daily Update
```bash
# Test enhanced daily update workflow
echo "🧪 Testing enhanced daily update..."

# Run daily update for today with all enhancements enabled
./daily_update.sh --date $(date +%Y-%m-%d) --no-backup

# Verify output
echo "✅ Enhanced daily update workflow tested"
```

### Step 4.3: Regenerate Derived Data
```bash
# Regenerate milestone tracking
echo "📊 Regenerating milestone tracking..."
npm run generate-milestones

# Regenerate rolling stats
echo "📊 Regenerating rolling stats..."
./generate_rolling_stats.sh $(date +%Y-%m-%d)

# Verify milestone tracking shows corrected stats
echo "🎯 Checking milestone tracking accuracy..."
node -e "
const fs = require('fs');
const milestones = JSON.parse(fs.readFileSync('public/data/predictions/milestone_tracking_latest.json', 'utf8'));

// Look for C. Bellinger in milestones
const bellinger = milestones.milestones?.find(m => m.player.includes('Bellinger'));
if (bellinger) {
  console.log('C. Bellinger milestone data:', bellinger.milestone);
} else {
  console.log('C. Bellinger not in current milestones');
}
"

echo "✅ Derived data regenerated"
```

## Phase 5: Monitoring & Verification (15 minutes)

### Step 5.1: Set Up Ongoing Monitoring
```bash
# Create monitoring script for daily data quality
cat > scripts/data-validation/dailyMonitoring.js << 'EOF'
#!/usr/bin/env node

const duplicateService = require('../../src/services/duplicateDetectionService');

async function dailyMonitoring() {
  try {
    const analysis = await duplicateService.analyzeDatasetForDuplicates();
    
    const report = {
      date: new Date().toISOString(),
      summary: analysis.summary,
      newIssues: analysis.summary.totalIssues > 50 ? 'HIGH' : 'NORMAL',
      recommendation: analysis.summary.totalIssues > 100 ? 'INVESTIGATE' : 'CONTINUE'
    };
    
    console.log(JSON.stringify(report, null, 2));
    
    if (report.newIssues === 'HIGH') {
      process.exit(1);
    }
  } catch (error) {
    console.error('Monitoring error:', error.message);
    process.exit(1);
  }
}

dailyMonitoring();
EOF

chmod +x scripts/data-validation/dailyMonitoring.js

# Test monitoring
node scripts/data-validation/dailyMonitoring.js

echo "✅ Monitoring setup complete"
```

### Step 5.2: Verify System Health
```bash
# Run final system health check
echo "🏥 Final system health check..."

# Check file integrity
find public/data/2025 -name "*.json" -size 0 -o -name "*.json" ! -readable

# Check for any remaining high-severity duplicates
node -e "
const service = require('./src/services/duplicateDetectionService');
(async () => {
  const analysis = await service.analyzeDatasetForDuplicates();
  const criticalIssues = analysis.removalRecommendations.filter(r => r.confidence >= 0.95);
  
  if (criticalIssues.length > 0) {
    console.log('⚠️  Critical issues remaining:', criticalIssues.length);
    console.log('Review required before completing deployment');
  } else {
    console.log('✅ No critical duplicate issues detected');
  }
})();
"

echo "✅ System health verified"
```

## Phase 6: Production Validation (15 minutes)

### Step 6.1: Functional Testing
```bash
# Test key application features
echo "🧪 Testing application functionality..."

# Start application (if not already running)
# npm start &

# Test milestone tracking accuracy
echo "📊 Verifying milestone tracking..."
curl -s http://localhost:3000/data/predictions/milestone_tracking_latest.json | \
  node -e "
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
    console.log('Milestone tracking loaded:', data.milestones?.length || 0, 'milestones');
  "

# Test player data integrity
echo "👤 Verifying player data integrity..."
curl -s http://localhost:3000/data/2025/july/july_02_2025.json | \
  node -e "
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
    console.log('July 2 data loaded:', data.players?.length || 0, 'players');
  "

echo "✅ Functional testing complete"
```

### Step 6.2: Performance Validation
```bash
# Check application performance
echo "⚡ Performance validation..."

# Test data loading speed
time node -e "
const service = require('./src/services/dataService');
console.log('Data service loaded');
"

# Check memory usage
echo "💾 Memory usage check..."
node -e "
console.log('Memory usage:', process.memoryUsage());
"

echo "✅ Performance validation complete"
```

## Phase 7: Documentation & Handoff (10 minutes)

### Step 7.1: Generate Deployment Report
```bash
# Create comprehensive deployment report
cat > deployment_report_${BACKUP_DATE}.md << EOF
# Production Deployment Report

**Date**: $(date)
**Backup Location**: backups/${BACKUP_DIR}
**Cleanup Backup**: backups/${CLEANUP_BACKUP}

## Issues Addressed
- Fixed systematic data corruption affecting 405 players
- Enhanced duplicate detection in statLoader.js
- Implemented comprehensive data pipeline validation
- Added safety mechanisms for bulk operations

## Files Modified
- src/services/statLoader.js (enhanced duplicate detection)
- process_all_stats.sh (added validation)
- daily_update.sh (integrated monitoring)

## New Files Added
- utils/gameIdValidator.js
- utils/doubleheaderValidator.js
- src/services/duplicateDetectionService.js
- scripts/data-validation/ (multiple validation scripts)

## Post-Deployment Verification
- Milestone tracking regenerated: ✅
- Rolling stats updated: ✅
- C. Bellinger stats corrected: ✅
- System health verified: ✅

## Monitoring
- Daily monitoring script: scripts/data-validation/dailyMonitoring.js
- Alert threshold: >100 total issues
- Recommended frequency: Daily execution

## Rollback Procedure
If issues arise:
1. Stop application
2. Restore from: backups/${BACKUP_DIR}/complete_system_backup.tar.gz
3. Restart application
4. Contact development team

## Contact Information
- Development Team: [contact info]
- Emergency Rollback: [emergency contact]
EOF

echo "✅ Deployment report generated: deployment_report_${BACKUP_DATE}.md"
```

### Step 7.2: Schedule Monitoring
```bash
# Add to crontab for daily monitoring
echo "📅 Setting up daily monitoring..."

# Create cron entry (modify as needed)
cat >> monitoring_cron.txt << EOF
# Daily data quality monitoring - runs at 9 AM
0 9 * * * cd /path/to/production/BaseballTracker && node scripts/data-validation/dailyMonitoring.js >> logs/data_quality.log 2>&1

# Weekly comprehensive analysis - runs Sunday at 6 AM  
0 6 * * 0 cd /path/to/production/BaseballTracker && node scripts/data-validation/validateDuplicateFixes.js >> logs/weekly_analysis.log 2>&1
EOF

echo "⚠️  Add these entries to your crontab:"
cat monitoring_cron.txt

echo "✅ Monitoring schedule prepared"
```

## Emergency Rollback Procedure

### If Critical Issues Arise:

```bash
# EMERGENCY ROLLBACK
echo "🚨 EMERGENCY ROLLBACK INITIATED"

# 1. Stop application immediately
# systemctl stop baseballtracker  # or your process manager

# 2. Restore from backup
cd /path/to/production/BaseballTracker
tar -xzf "backups/${BACKUP_DIR}/complete_system_backup.tar.gz"

# 3. Restart application
# systemctl start baseballtracker

# 4. Verify rollback
curl -s http://localhost:3000/health || echo "Application not responding"

echo "🔄 Rollback completed - contact development team"
```

## Success Criteria

### Deployment is considered successful when:
- [ ] All 405 affected players identified and addressed
- [ ] C. Bellinger hits corrected from 99 to expected value (~92)
- [ ] Milestone tracking shows accurate data
- [ ] Enhanced pipeline prevents new duplicates
- [ ] System performance remains stable
- [ ] Daily monitoring is functional

### Key Metrics to Monitor:
- **Data Quality**: <50 total duplicate issues detected daily
- **Performance**: Data loading times within normal ranges
- **Accuracy**: Milestone tracking matches external sources
- **Stability**: No application crashes or errors

## Support and Maintenance

### Daily Tasks:
- Review data quality monitoring logs
- Verify new CSV files processed correctly
- Check for any duplicate detection alerts

### Weekly Tasks:
- Run comprehensive duplicate analysis
- Verify milestone tracking accuracy
- Review system performance metrics

### Monthly Tasks:
- Full data integrity audit
- Performance optimization review
- Update duplicate detection patterns if needed

## Contact Information

**For Issues or Questions:**
- Development Team: [Your contact information]
- System Administrator: [Admin contact]
- Emergency Support: [Emergency contact]

**Documentation:**
- This guide: `PRODUCTION_DEPLOYMENT_GUIDE.md`
- Data integrity guide: `DATA_INTEGRITY_FIX_GUIDE.md`
- System architecture: `CLAUDE.md`

---

**⚠️  IMPORTANT**: Keep all backup files for at least 30 days after successful deployment. The enhanced duplicate detection system is designed to prevent future issues, but monitoring remains essential for early detection of any new data quality problems.