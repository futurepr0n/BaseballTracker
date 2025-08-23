import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './DarkModeToggle.css';

const DarkModeToggle = ({ className = '' }) => {
  const { colorMode, isLightMode, isTransitioning, toggleColorMode } = useTheme();

  return (
    <div className={`dark-mode-toggle-container ${className}`}>
      <button
        className={`dark-mode-toggle-button ${isTransitioning ? 'transitioning' : ''}`}
        onClick={toggleColorMode}
        disabled={isTransitioning}
        title={`Switch to ${isLightMode ? 'Dark' : 'Light'} mode`}
        aria-label={`Current color mode: ${colorMode}. Click to switch to ${isLightMode ? 'dark' : 'light'} mode`}
      >
        <div className="toggle-content">
          <div className="toggle-icons">
            <span className={`icon light-icon ${isLightMode ? 'active' : ''}`}>
              ☀️
            </span>
            <span className={`icon dark-icon ${!isLightMode ? 'active' : ''}`}>
              🌙
            </span>
          </div>
          <div className="toggle-labels">
            <span className={`label light-label ${isLightMode ? 'active' : ''}`}>
              Light
            </span>
            <span className={`label dark-label ${!isLightMode ? 'active' : ''}`}>
              Dark
            </span>
          </div>
        </div>
        
        {/* Toggle Slider */}
        <div className="toggle-slider">
          <div className={`slider-track ${colorMode}`}>
            <div className="slider-thumb"></div>
          </div>
        </div>
        
      </button>
    </div>
  );
};

export default DarkModeToggle;