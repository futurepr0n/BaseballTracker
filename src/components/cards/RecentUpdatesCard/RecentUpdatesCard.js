import React from 'react';

const RecentUpdatesCard = ({ 
  currentDate, 
  dataDate, 
  dateStatus, 
  topPerformers, 
  rollingStats,
  visitCount = 0,
  visitLoading = false 
}) => {
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getDataSourceText = () => {
    switch(dateStatus) {
      case 'current':
        return "Today's games";
      case 'previous':
        return `${dataDate.toLocaleDateString('en-US', { weekday: 'short' })} games`;
      case 'historical':
        return "Last 7 days";
      case 'season':
        return "Season stats";
      default:
        return "Recent data";
    }
  };

  const getTopPerformerCounts = () => {
    if (!topPerformers) return { hr: 0, recent: 0, improved: 0 };
    
    return {
      hr: topPerformers.hrRate?.length || 0,
      recent: topPerformers.recent?.length || 0,
      improved: topPerformers.improved?.length || 0
    };
  };

  const getRollingStatsCounts = () => {
    if (!rollingStats) return { hitters: 0, homers: 0, strikeouts: 0 };
    
    return {
      hitters: rollingStats.hitters?.length || 0,
      homers: rollingStats.homers?.length || 0,
      strikeouts: rollingStats.strikeouts?.length || 0
    };
  };

  const performerCounts = getTopPerformerCounts();
  const rollingCounts = getRollingStatsCounts();

  return (
    <div className="card">
      <h3>📊 Recent Updates</h3>
      <div className="updates-list">
        
        {/* Page Load Counter Row */}
        <div className="update-item">
          <div className="update-icon">🎩</div>
          <div className="update-text">
            {visitLoading ? (
              <span>Loading page views...</span>
            ) : (
              <span>
                <strong>{Number(visitCount || 0).toLocaleString()}</strong> Smart Cappers Checked In
              </span>
            )}
          </div>
        </div>

        {/* Data Source */}
        <div className="update-item">
          <div className="update-icon">📅</div>
          <div className="update-text">
            Data from <strong>{getDataSourceText()}</strong>
            {dateStatus !== 'current' && (
              <span className="text-muted"> (most recent available)</span>
            )}
          </div>
        </div>

        {/* Rolling Stats Summary */}
        <div className="update-item">
          <div className="update-icon">⚾</div>
          <div className="update-text">
            <strong>{rollingCounts.hitters}</strong> top hitters, 
            <strong> {rollingCounts.homers}</strong> home run leaders, 
            <strong> {rollingCounts.strikeouts}</strong> strikeout leaders
          </div>
        </div>

        {/* Performance Analysis */}
        <div className="update-item">
          <div className="update-icon">📈</div>
          <div className="update-text">
            <strong>{performerCounts.hr}</strong> HR rate leaders, 
            <strong> {performerCounts.improved}</strong> improved performers, 
            <strong> {performerCounts.recent}</strong> recent HR hitters
          </div>
        </div>

        {/* Last Updated */}
        <div className="update-item">
          <div className="update-icon">🔄</div>
          <div className="update-text">
            Last updated: <strong>{formatDate(new Date())}</strong>
          </div>
        </div>

        {/* Season Progress */}
        <div className="update-item">
          <div className="update-icon">🏆</div>
          <div className="update-text">
            <strong>2025 MLB Season</strong> - Analytics & Predictions Active
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentUpdatesCard;