import React from 'react';
import './HandednessToggle.css';

const HandednessToggle = ({ selectedHandedness, onHandednessChange, className = '' }) => {
  const handednessOptions = [
    { value: 'ALL', label: 'All', icon: '⚾' },
    { value: 'RHP', label: 'vs RHP', icon: '👉' },
    { value: 'LHP', label: 'vs LHP', icon: '👈' }
  ];

  return (
    <div className={`handedness-toggle ${className}`}>
      <div className="toggle-label">Pitcher Handedness:</div>
      <div className="toggle-options">
        {handednessOptions.map(option => (
          <button
            key={option.value}
            className={`toggle-option ${selectedHandedness === option.value ? 'active' : ''}`}
            onClick={() => onHandednessChange(option.value)}
            title={`Show data vs ${option.label}`}
          >
            <span className="option-icon">{option.icon}</span>
            <span className="option-label">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HandednessToggle;