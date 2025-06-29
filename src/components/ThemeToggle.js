import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeToggle.css';

const ThemeToggle = ({ className = '' }) => {
  const { themeMode, isGlassMode, isTransitioning, toggleTheme } = useTheme();

  return (
    <div className={`theme-toggle-container ${className}`}>
      <button
        className={`theme-toggle-button ${isTransitioning ? 'transitioning' : ''}`}
        onClick={toggleTheme}
        disabled={isTransitioning}
        title={`Switch to ${isGlassMode ? 'Classic' : 'Glass'} mode`}
        aria-label={`Current theme: ${themeMode}. Click to switch to ${isGlassMode ? 'classic' : 'glass'} mode`}
      >
        <div className="toggle-content">
          <div className="toggle-icons">
            <span className={`icon glass-icon ${isGlassMode ? 'active' : ''}`}>
              ✨
            </span>
            <span className={`icon classic-icon ${!isGlassMode ? 'active' : ''}`}>
              🎯
            </span>
          </div>
          <div className="toggle-labels">
            <span className={`label glass-label ${isGlassMode ? 'active' : ''}`}>
              Glass
            </span>
            <span className={`label classic-label ${!isGlassMode ? 'active' : ''}`}>
              Classic
            </span>
          </div>
        </div>
        
        {/* Toggle Slider */}
        <div className="toggle-slider">
          <div className={`slider-track ${themeMode}`}>
            <div className="slider-thumb"></div>
          </div>
        </div>
        
      </button>
    </div>
  );
};

export default ThemeToggle;