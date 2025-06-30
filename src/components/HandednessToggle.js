import React from 'react';
import './HandednessToggle.css';

const HandednessToggle = ({ value, onChange, showSplits, onSplitsToggle }) => {
  return (
    <div className="handedness-toggle-container">
      <div className="handedness-toggle">
        <button 
          className={`toggle-button ${value === 'BOTH' ? 'active' : ''}`}
          onClick={() => onChange('BOTH')}
        >
          All
        </button>
        <button 
          className={`toggle-button ${value === 'RHP' ? 'active' : ''}`}
          onClick={() => onChange('RHP')}
        >
          vs RHP
        </button>
        <button 
          className={`toggle-button ${value === 'LHP' ? 'active' : ''}`}
          onClick={() => onChange('LHP')}
        >
          vs LHP
        </button>
      </div>
      {onSplitsToggle && (
        <label className="splits-toggle">
          <input 
            type="checkbox" 
            checked={showSplits}
            onChange={(e) => onSplitsToggle(e.target.checked)}
          />
          <span>Show Splits</span>
        </label>
      )}
    </div>
  );
};

export default HandednessToggle;