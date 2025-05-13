import React from 'react';
import './RecentUpdatesCard.css';

/**
 * RecentUpdatesCard - Shows recent updates and highlights
 */
const RecentUpdatesCard = ({ 
  currentDate,
  dataDate,
  dateStatus,
  topPerformers,
  rollingStats
}) => {
  // Format dates for display
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const formattedDataDate = dataDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="card recent-updates-card">
      <h3>Recent Updates</h3>
      <div className="updates-list">
        <div className="update-item">
          <span className="update-icon">📊</span>
          <span className="update-text">
            Statistics updated for {dateStatus === 'previous' ? formattedDataDate : formattedDate}
          </span>
        </div>
        <div className="update-item">
          <span className="update-icon">🏆</span>
          <span className="update-text">
            {topPerformers.hrRate && topPerformers.hrRate.length > 0 
              ? `${topPerformers.hrRate[0].fullName || topPerformers.hrRate[0].name} leads with ${topPerformers.hrRate[0].homeRunsThisSeason} home runs` 
              : (rollingStats.homers && rollingStats.homers.length > 0 
                ? `${rollingStats.homers[0].name} leads with ${rollingStats.homers[0].HR} home runs` 
                : 'No home runs recorded recently')}
          </span>
        </div>
        <div className="update-item">
          <span className="update-icon">📈</span>
          <span className="update-text">
            {topPerformers.overPerforming && topPerformers.overPerforming.length > 0 
              ? `${topPerformers.overPerforming[0].fullName || topPerformers.overPerforming[0].name} over-performing by ${topPerformers.overPerforming[0].performanceIndicator.toFixed(1)}%` 
              : 'No performance indicators available'}
          </span>
        </div>
        <div className="update-item">
          <span className="update-icon">🔄</span>
          <span className="update-text">Next update: Tomorrow at 12:00 AM</span>
        </div>
      </div>
    </div>
  );
};

export default RecentUpdatesCard;