import React, { useState } from 'react';

const ExportTools = ({ analysis, opportunities, selectedDate, classificationMode }) => {
  const [exportFormat, setExportFormat] = useState('json');
  const [includeDetails, setIncludeDetails] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  if (!analysis || !opportunities) {
    return null;
  }

  const generateExportData = () => {
    const baseData = {
      export_info: {
        generated_at: new Date().toISOString(),
        date_analyzed: selectedDate,
        classification_mode: classificationMode,
        total_opportunities: opportunities.length,
        export_format: exportFormat
      },
      analysis_summary: analysis.summary,
      opportunities: opportunities.map(opp => ({
        ...opp,
        // Include/exclude detailed analysis based on setting
        ...(includeDetails ? {} : { 
          details: undefined, 
          sequences: undefined, 
          additional_metrics: undefined 
        })
      }))
    };

    if (includeDetails) {
      baseData.full_analysis = {
        metadata: {
          total_matchups: analysis.total_matchups,
          successful_analyses: analysis.successful_analyses,
          enhanced_with_api: analysis.enhanced_with_api,
          errors: analysis.errors
        },
        generated_at: analysis.generated_at
      };
    }

    return baseData;
  };

  const exportToJSON = () => {
    const data = generateExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `matchup-analysis-${selectedDate}-${classificationMode}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const headers = [
      'Pitcher',
      'Pitcher Team',
      'Opposing Team',
      'Opportunity Type',
      'Confidence Score',
      'Vulnerability Score',
      'Success Rate',
      'Position',
      'Inning',
      'Predictability Score',
      'Sample Size',
      'Risk Level',
      'HR Frequency'
    ];

    const rows = opportunities.map(opp => [
      opp.pitcher || '',
      opp.pitcher_team || '',
      opp.opposing_team || '',
      opp.type || '',
      Math.round(opp.confidence_score || 0),
      Math.round(opp.vulnerability_score || 0),
      Math.round((opp.success_rate || 0) * 100),
      opp.position || '',
      opp.inning || '',
      Math.round(opp.predictability_score || 0),
      opp.sample_size || '',
      opp.risk_level || '',
      Math.round((opp.hr_frequency || 0) * 100)
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `matchup-analysis-${selectedDate}-${classificationMode}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    try {
      const data = generateExportData();
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      if (exportFormat === 'json') {
        exportToJSON();
      } else if (exportFormat === 'csv') {
        exportToCSV();
      } else if (exportFormat === 'clipboard') {
        await copyToClipboard();
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const generateSummaryReport = () => {
    const highConfidence = opportunities.filter(o => (o.confidence_score || 0) >= 70);
    const positionOpps = opportunities.filter(o => o.type === 'position_vulnerability');
    const timingOpps = opportunities.filter(o => o.type === 'inning_vulnerability');
    const patternOpps = opportunities.filter(o => o.type === 'predictability');

    return `Daily Matchup Analysis Summary - ${new Date(selectedDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}

OVERVIEW:
• Total Opportunities: ${opportunities.length}
• High Confidence Plays: ${highConfidence.length}
• Average Confidence: ${Math.round(analysis.summary?.avg_confidence || 0)}%

TOP OPPORTUNITIES:
${highConfidence.slice(0, 5).map((opp, i) => 
  `${i + 1}. ${opp.pitcher} vs ${opp.opposing_team} - ${Math.round(opp.confidence_score)}% confidence`
).join('\n')}

BREAKDOWN BY TYPE:
• Position Vulnerabilities: ${positionOpps.length}
• Timing Windows: ${timingOpps.length}  
• Pattern Recognition: ${patternOpps.length}

CLASSIFICATION: ${classificationMode.replace('_', ' ').toUpperCase()}
Generated: ${new Date().toLocaleString('en-US')}`;
  };

  const copySummaryReport = async () => {
    try {
      const report = generateSummaryReport();
      await navigator.clipboard.writeText(report);
    } catch (err) {
      console.error('Failed to copy summary:', err);
    }
  };

  return (
    <div className="export-tools">
      <div className="export-header">
        <h2>Research & Export Tools</h2>
        <p>Save your analysis for further research and comparison</p>
      </div>

      <div className="export-content">
        <div className="export-options">
          <div className="export-section">
            <h3>Export Analysis Data</h3>
            <div className="export-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Export Format:</label>
                  <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                    <option value="json">JSON (Complete Data)</option>
                    <option value="csv">CSV (Spreadsheet)</option>
                    <option value="clipboard">Copy to Clipboard</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={includeDetails}
                      onChange={(e) => setIncludeDetails(e.target.checked)}
                    />
                    Include detailed analysis
                  </label>
                </div>
              </div>
              <button
                onClick={handleExport}
                disabled={exportLoading}
                className="export-button"
              >
                {exportLoading ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
              </button>
            </div>
          </div>

          <div className="export-section">
            <h3>Quick Summary</h3>
            <div className="summary-actions">
              <button onClick={copySummaryReport} className="summary-button">
                📋 Copy Summary Report
              </button>
              <p className="summary-description">
                Generate a quick text summary perfect for sharing or notes
              </p>
            </div>
          </div>
        </div>

        <div className="research-tools">
          <h3>Research Features</h3>
          <div className="research-grid">
            <div className="research-item">
              <h4>🔍 Historical Comparison</h4>
              <p>Export data from multiple dates to identify season-long patterns and pitcher development trends.</p>
            </div>
            <div className="research-item">
              <h4>📊 Performance Tracking</h4>
              <p>Track your prediction accuracy by comparing exported opportunities with actual game outcomes.</p>
            </div>
            <div className="research-item">
              <h4>🎯 Strategy Refinement</h4>
              <p>Analyze which classification methods (confidence, position, timing) produce the best results.</p>
            </div>
            <div className="research-item">
              <h4>⚡ Quick Analysis</h4>
              <p>Save high-confidence opportunities for quick reference during live games or betting windows.</p>
            </div>
          </div>
        </div>

        <div className="export-metadata">
          <div className="metadata-grid">
            <div className="metadata-item">
              <span className="metadata-label">Analysis Date:</span>
              <span className="metadata-value">{new Date(selectedDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Classification Mode:</span>
              <span className="metadata-value">{classificationMode.replace('_', ' ')}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Total Opportunities:</span>
              <span className="metadata-value">{opportunities.length}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Generated:</span>
              <span className="metadata-value">{new Date(analysis.generated_at).toLocaleString('en-US')}</span>
            </div>
          </div>
        </div>

        <div className="usage-tips">
          <h3>💡 Usage Tips</h3>
          <div className="tips-list">
            <div className="tip-item">
              <strong>JSON Export:</strong> Contains complete analysis data including sequences, details, and metadata. Best for programmatic analysis.
            </div>
            <div className="tip-item">
              <strong>CSV Export:</strong> Spreadsheet-friendly format for manual analysis, filtering, and charting in Excel or Google Sheets.
            </div>
            <div className="tip-item">
              <strong>Summary Report:</strong> Human-readable summary perfect for sharing with others or keeping as notes.
            </div>
            <div className="tip-item">
              <strong>Daily Tracking:</strong> Export data daily to build a comprehensive database of opportunities and outcomes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportTools;