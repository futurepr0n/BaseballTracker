// src/components/cards/MLBWeatherCard/windUtils.js
import React from 'react';
import { FaArrowUp, FaArrowDown, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { LuArrowUpLeft, LuArrowUpRight, LuArrowDownLeft, LuArrowDownRight } from 'react-icons/lu';

const directionToAngle = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5,
  SE: 135, SSE: 157.5, S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
  W: 270, WNW: 292.5, NW: 315, NNW: 337.5
};

export const getWindFactor = (parkOrientation, windDirectionDegrees) => {
  // If park is a dome, no wind factor
  if (!parkOrientation) return { text: 'Dome', description: 'No wind factor.' };

  const parkAngle = directionToAngle[parkOrientation];
  
  // Angle difference (wind is FROM this direction)
  let diff = Math.abs(windDirectionDegrees - parkAngle);
  if (diff > 180) diff = 360 - diff;

  // Determine factor based on angle difference
  if (diff <= 45) return { text: 'Blowing In', description: 'Wind is blowing in from the outfield.' };
  if (diff >= 135) return { text: 'Blowing Out', description: 'Wind is blowing out toward the outfield.' };
  
  // Crosswind logic
  let cross_diff = (windDirectionDegrees - parkAngle + 360) % 360;
  if (cross_diff > 45 && cross_diff < 135) return { text: 'Crosswind', description: 'Blowing from Left to Right.' };
  return { text: 'Crosswind', description: 'Blowing from Right to Left.' };
};

export const getWindIcon = (deg) => {
  if (deg > 337.5 || deg <= 22.5) return <FaArrowDown title={`N (${deg}°)`} />; // From N
  if (deg > 22.5 && deg <= 67.5) return <LuArrowDownLeft title={`NE (${deg}°)`} />; // From NE
  if (deg > 67.5 && deg <= 112.5) return <FaArrowLeft title={`E (${deg}°)`} />; // From E
  if (deg > 112.5 && deg <= 157.5) return <LuArrowUpLeft title={`SE (${deg}°)`} />; // From SE
  if (deg > 157.5 && deg <= 202.5) return <FaArrowUp title={`S (${deg}°)`} />; // From S
  if (deg > 202.5 && deg <= 247.5) return <LuArrowUpRight title={`SW (${deg}°)`} />; // From SW
  if (deg > 247.5 && deg <= 292.5) return <FaArrowRight title={`W (${deg}°)`} />; // From W
  if (deg > 292.5 && deg <= 337.5) return <LuArrowDownRight title={`NW (${deg}°)`} />; // From NW
  return null;
};