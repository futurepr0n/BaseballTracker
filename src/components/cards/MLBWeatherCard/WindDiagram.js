// src/components/cards/MLBWeatherCard/WindDiagram.js
import React from 'react';
import { FaLongArrowAltUp } from 'react-icons/fa';

// This map converts cardinal directions (from ballparkData) to a rotation angle in degrees.
const directionToAngle = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5,
  SE: 135, SSE: 157.5, S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
  W: 270, WNW: 292.5, NW: 315, NNW: 337.5
};

const WindDiagram = ({ parkOrientation, windDirection }) => {
  const parkAngle = directionToAngle[parkOrientation] || 0;

  // FINAL CORRECT LOGIC:
  // 1. The wind API gives the direction the wind is COMING FROM (e.g., 180° is a Southerly wind).
  // 2. The arrow icon points TO a direction. We want to show where the wind is GOING.
  //    So we add 180° to the wind's 'from' direction.
  const windTravelDirection = (windDirection + 180) % 360;

  // 3. To show the wind relative to the field (which faces `parkAngle`), we subtract the park's
  //    orientation from the wind's travel direction.
  const relativeArrowRotation = windTravelDirection - parkAngle;

  const arrowStyle = {
    transform: `rotate(${relativeArrowRotation}deg)`,
  };

  return (
    <div className="wind-diagram-container">
      {/* A static, non-rotating diamond. Home plate is always at the bottom. */}
      <svg viewBox="0 0 100 100" className="field-svg">
        <title>Baseball field with home plate at the bottom</title>
        <path d="M50 90 L10 50 L50 10 L90 50 Z" stroke="#B0B0B0" fill="#fcfcfc" strokeWidth="3" />
        <circle cx="50" cy="84" r="5" fill="#B0B0B0" /> {/* Home Plate */}
      </svg>
      {/* The arrow layer, which rotates correctly on top of the static field. */}
      <div className="arrow-layer" style={arrowStyle}>
        <FaLongArrowAltUp size="2.5em" color="#d93025" />
      </div>
    </div>
  );
};

export default WindDiagram;