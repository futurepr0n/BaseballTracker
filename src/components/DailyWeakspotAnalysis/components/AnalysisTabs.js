import React, { useState } from 'react';
import EnhancedWeakspotResults from './EnhancedWeakspotResults';
import BatterOpportunitySection from './BatterOpportunitySection';
import BestBetsAnalysis from './BestBetsAnalysis';
import ComprehensiveAnalysisDisplay from './ComprehensiveAnalysisDisplay';
import FirstInningCashAnalysis from './FirstInningCashAnalysis';
import './AnalysisTabs.css';

const AnalysisTabs = ({ analysis, opportunities, loading, enhanced, matchups, lineupData }) => {
  const [activeTab, setActiveTab] = useState('comprehensive-display');

  const tabs = [
    {
      id: 'comprehensive-display',
      label: 'Comprehensive Analysis',
      icon: '📊',
      description: 'Complete API response data in organized format'
    },
    {
      id: 'pitcher-vulnerabilities',
      label: 'Pitcher Vulnerabilities',
      icon: '🎯',
      description: 'Analyze pitcher weakspots and timing patterns'
    },
    {
      id: 'batter-opportunities', 
      label: 'Batter Opportunities',
      icon: '🏏',
      description: 'Individual batter vs pitcher analysis and recommendations'
    },
    {
      id: 'first-inning-cash',
      label: '1st Inning Cash',
      icon: '🥇',
      description: 'Elite first inning opportunities based on inning patterns, position vulnerability, and recent performance'
    },
    {
      id: 'best-bets',
      label: 'Best Bets',
      icon: '⭐',
      description: 'Top combined recommendations with confidence scoring'
    },
    {
      id: 'detailed-breakdown',
      label: 'Detailed Analysis',
      icon: '📈',
      description: 'Comprehensive matchup breakdowns and strategic context'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'comprehensive-display':
        return (
          <ComprehensiveAnalysisDisplay
            analysis={analysis}
            loading={loading}
          />
        );
      
      case 'pitcher-vulnerabilities':
        return (
          <EnhancedWeakspotResults
            analysis={analysis}
            opportunities={opportunities}
            loading={loading}
            enhanced={enhanced}
          />
        );
      
      case 'batter-opportunities':
        return (
          <BatterOpportunitySection
            analysis={analysis}
            matchups={matchups}
            loading={loading}
            enhanced={enhanced}
          />
        );
      
      case 'first-inning-cash':
        return (
          <FirstInningCashAnalysis
            analysis={analysis}
            opportunities={opportunities}
            matchups={matchups}
            lineupData={lineupData}
            loading={loading}
          />
        );
      
      case 'best-bets':
        return (
          <BestBetsAnalysis
            opportunities={opportunities}
            matchups={matchups}
            loading={loading}
            enhanced={enhanced}
            comprehensiveAnalysis={analysis}
          />
        );
      
      case 'detailed-breakdown':
        return (
          <div className="detailed-breakdown-section">
            <div className="coming-soon">
              <span className="coming-soon-icon">🚧</span>
              <h3>Detailed Analysis Breakdown</h3>
              <p>In-depth strategic context and comprehensive matchup analysis coming soon!</p>
              <div className="preview-features">
                <div className="feature-item">
                  <span className="feature-icon">🌤️</span>
                  <span>Weather and stadium factor integration</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📅</span>
                  <span>Historical head-to-head performance analysis</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🏥</span>
                  <span>Injury report and lineup change impact</span>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="analysis-tabs">
      <div className="tabs-header">
        <div className="tabs-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.description}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
        <div className="tab-description">
          {tabs.find(tab => tab.id === activeTab)?.description}
        </div>
      </div>
      
      <div className="tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AnalysisTabs;