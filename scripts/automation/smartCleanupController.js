#!/usr/bin/env node

/**
 * Smart Cleanup Controller
 * 
 * Intelligent automation system that detects safe cleanup opportunities
 * and executes them automatically when conditions are met. Integrates
 * with the daily data processing pipeline.
 * 
 * Usage: node scripts/automation/smartCleanupController.js [--force] [--dry-run]
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const duplicateDetectionService = require('../../src/services/duplicateDetectionService');

/**
 * Smart automation configuration
 */
const AUTOMATION_CONFIG = {
  // Conservative automatic execution thresholds
  AUTO_EXECUTE_THRESHOLDS: {
    MAX_HIGH_CONFIDENCE_REMOVALS: 20, // Very conservative for auto-execution
    MIN_JULY_CORRELATION: 0.8, // 80% must be in known problem period
    MAX_OVERALL_IMPACT: 0.5, // Less than 0.5% of total data
    MIN_CONFIDENCE: 0.95 // Higher confidence required for auto-execution
  },
  
  // Manual review thresholds (between auto and block)
  MANUAL_REVIEW_THRESHOLDS: {
    MAX_HIGH_CONFIDENCE_REMOVALS: 50,
    MIN_JULY_CORRELATION: 0.7,
    MAX_OVERALL_IMPACT: 1.0,
    MIN_CONFIDENCE: 0.9
  },
  
  // Safety settings
  ENABLE_AUTO_EXECUTION: true,
  BACKUP_RETENTION_DAYS: 30,
  LOG_RETENTION_DAYS: 90,
  
  // Paths and directories
  LOGS_DIR: 'scripts/automation/logs',
  REPORTS_DIR: 'scripts/automation/reports',
  BACKUPS_DIR: 'backups/smart_cleanup'
};

/**
 * Logging utility
 */
class SmartLogger {
  constructor() {
    this.logPath = null;
  }
  
  async initialize() {
    await fs.mkdir(AUTOMATION_CONFIG.LOGS_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logPath = path.join(AUTOMATION_CONFIG.LOGS_DIR, `smart_cleanup_${timestamp}.log`);
  }
  
  async log(level, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}\\n`;
    
    console.log(`${this.getIcon(level)} ${message}`);
    
    if (this.logPath) {
      try {
        await fs.appendFile(this.logPath, logEntry);
      } catch (error) {
        console.warn(`Warning: Could not write to log file: ${error.message}`);
      }
    }
  }
  
  getIcon(level) {
    const icons = {
      info: '📋',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🔍'
    };
    return icons[level] || '📋';
  }
  
  async info(message) { await this.log('info', message); }
  async success(message) { await this.log('success', message); }
  async warning(message) { await this.log('warning', message); }
  async error(message) { await this.log('error', message); }
  async debug(message) { await this.log('debug', message); }
}

/**
 * Intelligent cleanup decision engine
 */
class CleanupDecisionEngine {
  constructor(logger) {
    this.logger = logger;
  }
  
  async analyzeCleanupOpportunity() {
    await this.logger.info('Analyzing current duplicate state for cleanup opportunities...');
    
    try {
      const analysis = await duplicateDetectionService.analyzeDatasetForDuplicates();
      const highConfidenceRemovals = analysis.removalRecommendations.filter(r => 
        r.confidence >= AUTOMATION_CONFIG.MANUAL_REVIEW_THRESHOLDS.MIN_CONFIDENCE
      );
      
      // Calculate metrics
      const metrics = await this.calculateMetrics(analysis, highConfidenceRemovals);
      const decision = this.makeDecision(metrics);
      
      await this.logger.info(`Analysis complete: ${decision.action} (${highConfidenceRemovals.length} high-confidence removals)`);
      
      return {
        analysis,
        highConfidenceRemovals,
        metrics,
        decision
      };
      
    } catch (error) {
      await this.logger.error(`Analysis failed: ${error.message}`);
      throw error;
    }
  }
  
  async calculateMetrics(analysis, highConfidenceRemovals) {
    // July correlation
    const julyRemovals = highConfidenceRemovals.filter(r => 
      r.date >= '2025-07-02' && r.date <= '2025-07-09'
    );
    const julyCorrelation = highConfidenceRemovals.length > 0 ? 
      julyRemovals.length / highConfidenceRemovals.length : 0;
    
    // Overall data impact estimation
    const estimatedTotalPlayers = analysis.metadata.totalPlayers * 30; // Rough estimate
    const overallImpact = estimatedTotalPlayers > 0 ? 
      highConfidenceRemovals.length / estimatedTotalPlayers : 0;
    
    // Confidence analysis
    const avgConfidence = highConfidenceRemovals.length > 0 ?
      highConfidenceRemovals.reduce((sum, r) => sum + r.confidence, 0) / highConfidenceRemovals.length : 0;
    
    // File impact
    const affectedFiles = new Set(highConfidenceRemovals.map(r => r.file)).size;
    
    const metrics = {
      totalIssues: analysis.summary.totalIssues,
      affectedPlayers: analysis.summary.affectedPlayers,
      highConfidenceCount: highConfidenceRemovals.length,
      julyCorrelation,
      overallImpact,
      avgConfidence,
      affectedFiles
    };
    
    await this.logger.debug(`Metrics calculated: ${JSON.stringify(metrics, null, 2)}`);
    return metrics;
  }
  
  makeDecision(metrics) {
    const autoThresholds = AUTOMATION_CONFIG.AUTO_EXECUTE_THRESHOLDS;
    const manualThresholds = AUTOMATION_CONFIG.MANUAL_REVIEW_THRESHOLDS;
    
    // Check if safe for automatic execution
    const autoSafe = 
      metrics.highConfidenceCount <= autoThresholds.MAX_HIGH_CONFIDENCE_REMOVALS &&
      metrics.julyCorrelation >= autoThresholds.MIN_JULY_CORRELATION &&
      metrics.overallImpact <= autoThresholds.MAX_OVERALL_IMPACT &&
      metrics.avgConfidence >= autoThresholds.MIN_CONFIDENCE;
    
    if (autoSafe && AUTOMATION_CONFIG.ENABLE_AUTO_EXECUTION) {
      return {
        action: 'auto_execute',
        reason: 'All automatic execution thresholds met',
        confidence: 'high'
      };
    }
    
    // Check if suitable for manual review
    const manualSafe = 
      metrics.highConfidenceCount <= manualThresholds.MAX_HIGH_CONFIDENCE_REMOVALS &&
      metrics.julyCorrelation >= manualThresholds.MIN_JULY_CORRELATION &&
      metrics.overallImpact <= manualThresholds.MAX_OVERALL_IMPACT &&
      metrics.avgConfidence >= manualThresholds.MIN_CONFIDENCE;
    
    if (manualSafe) {
      return {
        action: 'manual_review',
        reason: 'Safe for manual review but exceeds automatic thresholds',
        confidence: 'medium'
      };
    }
    
    // Too risky for any cleanup
    return {
      action: 'block',
      reason: 'Exceeds safety thresholds - manual investigation required',
      confidence: 'low'
    };
  }
}

/**
 * Cleanup execution engine
 */
class CleanupExecutor {
  constructor(logger) {
    this.logger = logger;
  }
  
  async executeAutomaticCleanup(highConfidenceRemovals, isDryRun = false) {
    await this.logger.info(`${isDryRun ? 'Simulating' : 'Executing'} automatic cleanup of ${highConfidenceRemovals.length} removals...`);
    
    try {
      // Create backup if not dry run
      let backupPath = null;
      if (!isDryRun) {
        backupPath = await this.createBackup();
      }
      
      // Execute cleanup using staged production test
      const command = `node scripts/data-validation/stagedProductionTest.js ${isDryRun ? '' : '--execute'}`;
      const result = execSync(command, { encoding: 'utf8', cwd: process.cwd() });
      
      await this.logger.success(`Cleanup ${isDryRun ? 'simulation' : 'execution'} completed successfully`);
      
      if (!isDryRun) {
        // Verify results
        const verification = await this.verifyCleanupResults();
        
        // Regenerate dependent data
        await this.regenerateDependentData();
        
        return {
          success: true,
          backupPath,
          verification,
          output: result
        };
      } else {
        return {
          success: true,
          simulation: true,
          output: result
        };
      }
      
    } catch (error) {
      await this.logger.error(`Cleanup ${isDryRun ? 'simulation' : 'execution'} failed: ${error.message}`);
      throw error;
    }
  }
  
  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(AUTOMATION_CONFIG.BACKUPS_DIR, `auto_cleanup_${timestamp}`);
    
    await fs.mkdir(backupDir, { recursive: true });
    
    // Create compressed backup of data directory
    const command = `tar -czf ${backupDir}/data_backup.tar.gz public/data/2025/`;
    execSync(command, { cwd: process.cwd() });
    
    await this.logger.success(`Backup created: ${backupDir}/data_backup.tar.gz`);
    return backupDir;
  }
  
  async verifyCleanupResults() {
    await this.logger.info('Verifying cleanup results...');
    
    try {
      const postCleanupAnalysis = await duplicateDetectionService.analyzeDatasetForDuplicates();
      
      const verification = {
        postCleanupIssues: postCleanupAnalysis.summary.totalIssues,
        postCleanupPlayers: postCleanupAnalysis.summary.affectedPlayers,
        postCleanupHighConfidence: postCleanupAnalysis.removalRecommendations.filter(r => r.confidence >= 0.9).length
      };
      
      await this.logger.success(`Verification complete: ${verification.postCleanupIssues} issues remaining`);
      return verification;
      
    } catch (error) {
      await this.logger.warning(`Verification failed: ${error.message}`);
      return { error: error.message };
    }
  }
  
  async regenerateDependentData() {
    await this.logger.info('Regenerating dependent data...');
    
    try {
      // Regenerate milestone tracking
      execSync('npm run generate-milestones', { cwd: process.cwd() });
      await this.logger.success('Milestone tracking regenerated');
      
      // Regenerate rolling stats
      execSync('./generate_rolling_stats.sh', { cwd: process.cwd() });
      await this.logger.success('Rolling stats regenerated');
      
    } catch (error) {
      await this.logger.warning(`Data regeneration partially failed: ${error.message}`);
    }
  }
}

/**
 * Notification system
 */
class NotificationManager {
  constructor(logger) {
    this.logger = logger;
  }
  
  async sendNotification(type, data) {
    // For now, just log notifications
    // In production, this could send email, Slack, etc.
    
    const notifications = {
      auto_cleanup_success: `✅ Automatic cleanup completed successfully: ${data.removalsCount} duplicates removed`,
      auto_cleanup_failed: `❌ Automatic cleanup failed: ${data.error}`,
      manual_review_required: `🔍 Manual review required: ${data.removalsCount} high-confidence duplicates detected`,
      safety_threshold_exceeded: `⚠️  Safety thresholds exceeded: ${data.reason}`,
      backup_created: `💾 Backup created: ${data.backupPath}`,
      data_regenerated: `🔄 Dependent data regenerated successfully`
    };
    
    const message = notifications[type] || `Unknown notification type: ${type}`;
    await this.logger.info(`NOTIFICATION: ${message}`);
    
    // TODO: Implement actual notification delivery (email, Slack, webhook, etc.)
  }
}

/**
 * Generate comprehensive report
 */
async function generateAutomationReport(results, logger) {
  await logger.info('Generating automation report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    executionType: 'smart_cleanup_automation',
    
    analysis: {
      totalIssues: results.metrics.totalIssues,
      affectedPlayers: results.metrics.affectedPlayers,
      highConfidenceRemovals: results.metrics.highConfidenceCount,
      julyCorrelation: results.metrics.julyCorrelation,
      overallImpact: results.metrics.overallImpact,
      avgConfidence: results.metrics.avgConfidence
    },
    
    decision: results.decision,
    execution: results.execution || null,
    
    performance: {
      analysisTime: results.timing?.analysis || 0,
      executionTime: results.timing?.execution || 0,
      totalTime: results.timing?.total || 0
    },
    
    recommendations: []
  };
  
  // Generate recommendations based on results
  if (results.decision.action === 'auto_execute' && results.execution?.success) {
    report.recommendations.push('Automatic cleanup completed successfully');
    report.recommendations.push('Monitor system for any remaining data quality issues');
  } else if (results.decision.action === 'manual_review') {
    report.recommendations.push('Manual review required for high-confidence duplicates');
    report.recommendations.push('Run interactive review system: node scripts/review/interactiveReview.js');
  } else if (results.decision.action === 'block') {
    report.recommendations.push('Safety thresholds exceeded - investigate before cleanup');
    report.recommendations.push('Review duplicate patterns manually');
  }
  
  // Save report
  await fs.mkdir(AUTOMATION_CONFIG.REPORTS_DIR, { recursive: true });
  const reportPath = path.join(AUTOMATION_CONFIG.REPORTS_DIR, 
    `automation_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  await logger.success(`Automation report saved: ${reportPath}`);
  
  return report;
}

/**
 * Main smart cleanup function
 */
async function runSmartCleanup(options = {}) {
  const { force = false, dryRun = false } = options;
  
  const logger = new SmartLogger();
  await logger.initialize();
  
  const startTime = Date.now();
  
  try {
    await logger.info('🚀 Smart Cleanup Controller started');
    await logger.info(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'} | Force: ${force}`);
    
    // Initialize engines
    const decisionEngine = new CleanupDecisionEngine(logger);
    const executor = new CleanupExecutor(logger);
    const notifier = new NotificationManager(logger);
    
    // Analyze cleanup opportunity
    const analysisStart = Date.now();
    const analysisResults = await decisionEngine.analyzeCleanupOpportunity();
    const analysisTime = Date.now() - analysisStart;
    
    const { decision, metrics, highConfidenceRemovals } = analysisResults;
    
    await logger.info(`Decision: ${decision.action} - ${decision.reason}`);
    
    let executionResults = null;
    
    // Execute based on decision
    if (decision.action === 'auto_execute' || force) {
      if (force && decision.action !== 'auto_execute') {
        await logger.warning('Force flag enabled - executing despite safety recommendations');
      }
      
      const executionStart = Date.now();
      executionResults = await executor.executeAutomaticCleanup(highConfidenceRemovals, dryRun);
      const executionTime = Date.now() - executionStart;
      
      if (executionResults.success) {
        await notifier.sendNotification('auto_cleanup_success', {
          removalsCount: highConfidenceRemovals.length
        });
      } else {
        await notifier.sendNotification('auto_cleanup_failed', {
          error: executionResults.error
        });
      }
      
      analysisResults.timing = { analysis: analysisTime, execution: executionTime };
      
    } else if (decision.action === 'manual_review') {
      await notifier.sendNotification('manual_review_required', {
        removalsCount: highConfidenceRemovals.length
      });
      
    } else if (decision.action === 'block') {
      await notifier.sendNotification('safety_threshold_exceeded', {
        reason: decision.reason
      });
    }
    
    const totalTime = Date.now() - startTime;
    analysisResults.timing = { 
      ...(analysisResults.timing || {}), 
      total: totalTime 
    };
    analysisResults.execution = executionResults;
    
    // Generate comprehensive report
    const report = await generateAutomationReport(analysisResults, logger);
    
    await logger.success(`Smart cleanup completed in ${Math.round(totalTime / 1000)}s`);
    
    return {
      success: true,
      decision: decision.action,
      report,
      execution: executionResults
    };
    
  } catch (error) {
    await logger.error(`Smart cleanup failed: ${error.message}`);
    throw error;
  }
}

/**
 * Command line interface
 */
async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const dryRun = args.includes('--dry-run');
  
  try {
    const result = await runSmartCleanup({ force, dryRun });
    
    console.log(`\\n🎯 SMART CLEANUP RESULT: ${result.decision.toUpperCase()}`);
    
    if (result.execution) {
      console.log(`✅ Execution: ${result.execution.success ? 'SUCCESS' : 'FAILED'}`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = {
  runSmartCleanup,
  CleanupDecisionEngine,
  CleanupExecutor,
  NotificationManager,
  AUTOMATION_CONFIG
};