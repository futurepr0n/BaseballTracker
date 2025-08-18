import React, { useEffect, useRef } from 'react';
import { initializeCollapsibleGlass } from '../../../utils/collapsibleGlass';
import './StatsSummaryCard.css';
import '../../../styles/CollapsibleGlass.css';

/**
 * StatsSummaryCard - Displays summary statistics for the day
 */
const StatsSummaryCard = ({ 
  batterData,
  pitcherData
}) => {
  const headerRef = useRef(null);
  const contentRef = useRef(null);
  // Calculate summary statistics
  const totalHomeRuns = batterData.reduce((sum, player) => 
    sum + (player.HR === 'DNP' ? 0 : (Number(player.HR) || 0)), 0);
  
  const totalHits = batterData.reduce((sum, player) => 
    sum + (player.H === 'DNP' ? 0 : (Number(player.H) || 0)), 0);
  
  const totalRuns = batterData.reduce((sum, player) => 
    sum + (player.R === 'DNP' ? 0 : (Number(player.R) || 0)), 0);
  
  const totalStrikeouts = pitcherData.reduce((sum, player) => 
    sum + (player.K === 'DNP' ? 0 : (Number(player.K) || 0)), 0);
  
  const totalInningsPitched = pitcherData.reduce((sum, player) => 
    sum + (player.IP === 'DNP' ? 0 : (Number(player.IP) || 0)), 0);

  // Initialize collapsible functionality
  useEffect(() => {
    if (headerRef.current && contentRef.current) {
      const cleanup = initializeCollapsibleGlass(
        headerRef.current, 
        contentRef.current, 
        'stats-summary-card'
      );
      return cleanup;
    }
  }, []);

  return (
    <div className="card stats-summary-card">
      <div className="glass-card-container">
        <div className="glass-header" ref={headerRef}>
          <h3>📊 Daily Statistics</h3>
        </div>
        
        {/* Collapsible Content */}
        <div className="glass-content expanded" ref={contentRef}>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{batterData.length}</span>
              <span className="stat-label">Batters</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{pitcherData.length}</span>
              <span className="stat-label">Pitchers</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{totalHomeRuns}</span>
              <span className="stat-label">Home Runs</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{totalHits}</span>
              <span className="stat-label">Hits</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{totalStrikeouts}</span>
              <span className="stat-label">Pitcher K's</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{totalInningsPitched.toFixed(1)}</span>
              <span className="stat-label">Innings Pitched</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsSummaryCard;