/**
 * Template for adding mobile view to CurrentSeriesCards
 * 
 * This shows the pattern to add mobile view to both CurrentSeriesHitsCard and CurrentSeriesHRCard
 * Replace the existing scrollable-container sections with this pattern
 */

// 1. Add imports at the top of CurrentSeriesCards.js
import MobilePlayerCard from '../../common/MobilePlayerCard';
import '../../common/MobilePlayerCard.css';

// 2. Replace the scrollable-container section with this pattern:

// For CurrentSeriesHitsCard:
{seriesData.length === 0 ? (
  <div className="no-data">No current series hits data available</div>
) : (
  <>
    {/* Desktop View */}
    <div className="scrollable-container">
      <ul className="player-list">
        {/* Existing desktop player-item structure */}
      </ul>
    </div>
    
    {/* Mobile View */}
    <div className="mobile-view">
      <div className="mobile-cards">
        {seriesData.slice(0, 10).map((player, index) => {
          const secondaryMetrics = [
            { label: 'Series Games', value: player.seriesGames },
            { label: 'Hit Rate', value: `${(player.hitRate * 100).toFixed(1)}%` }
          ];

          const expandableContent = (
            <div className="mobile-series-details">
              {/* Summary Metrics */}
              <div className="mobile-metrics-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px'}}>
                <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                  <div style={{fontSize: '16px', fontWeight: 'bold', color: '#2196F3'}}>{player.hits}</div>
                  <div style={{fontSize: '11px', color: '#ccc'}}>Series Hits</div>
                </div>
                <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                  <div style={{fontSize: '16px', fontWeight: 'bold', color: '#FF9800'}}>{player.seriesGames}</div>
                  <div style={{fontSize: '11px', color: '#ccc'}}>Games</div>
                </div>
                <div className="mobile-metric-item" style={{textAlign: 'center'}}>
                  <div style={{fontSize: '16px', fontWeight: 'bold', color: '#4CAF50'}}>{(player.hitRate * 100).toFixed(1)}%</div>
                  <div style={{fontSize: '11px', color: '#ccc'}}>Hit Rate</div>
                </div>
              </div>

              {/* Series Context */}
              <div className="mobile-series-context" style={{marginBottom: '16px', textAlign: 'center'}}>
                <strong>Current Series vs {player.opponent}:</strong>
                <div style={{marginTop: '8px', fontSize: '12px', color: '#ccc'}}>
                  {player.hits} hits in {player.seriesGames} games this series
                </div>
              </div>

              {/* Performance Analysis */}
              <div className="mobile-performance-analysis">
                <strong>Series Analysis:</strong>
                <div style={{marginTop: '8px', fontSize: '11px', color: '#ccc'}}>
                  {player.hitRate >= 0.5 ? 
                    `Excellent series performance with ${(player.hitRate * 100).toFixed(1)}% hit rate` :
                  player.hitRate >= 0.3 ? 
                    `Good series production vs ${player.opponent}` :
                    `Building momentum in current series vs ${player.opponent}`
                  }
                </div>
              </div>
            </div>
          );

          return (
            <MobilePlayerCard
              key={index}
              item={{
                name: player.name,
                team: player.team
              }}
              index={index}
              showRank={true}
              showExpandButton={true}
              primaryMetric={{
                value: player.hits,
                label: 'Hits vs ' + player.opponent,
                color: '#2196F3'
              }}
              secondaryMetrics={secondaryMetrics}
              expandableContent={expandableContent}
              className="mobile-current-series-hits-card"
              scratchpadSource="current-series-hits"
            />
          );
        })}
      </div>
    </div>
  </>
)}

// For CurrentSeriesHRCard - similar pattern but with HR-specific metrics:
// primaryMetric: { value: player.homeRuns, label: 'HRs vs ' + player.opponent, color: '#e63946' }
// secondaryMetrics: [
//   { label: 'Series Games', value: player.seriesGames },
//   { label: 'HR Rate', value: player.hrRate.toFixed(3) + '/G' }
// ]