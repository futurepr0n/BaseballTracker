// src/components/cards/MLBWeatherCard/stylingUtils.js

// This map is needed to calculate wind direction relative to the park.
const directionToAngle = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5,
  SE: 135, SSE: 157.5, S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
  W: 270, WNW: 292.5, NW: 315, NNW: 337.5
};

/**
 * Returns a CSS class based on temperature.
 * 85°F+ is noticeably better for ball flight. 55°F- is noticeably worse.
 */
export const getTempClass = (temp) => {
  if (temp >= 85) return 'positive';
  if (temp <= 55) return 'negative';
  return '';
};

/**
 * Returns a CSS class based on precipitation probability.
 * Highlights significant chances of rain that could cause delays.
 */
export const getPrecipClass = (precip) => {
  if (precip >= 50) return 'negative';
  if (precip >= 25) return 'caution';
  return '';
};

/**
 * Returns a CSS class based on air pressure.
 * 995 hPa is roughly equivalent to the air pressure at Coors Field (high elevation).
 */
export const getPressureClass = (pressure) => {
  if (pressure <= 995) return 'positive';
  if (pressure >= 1025) return 'negative'; // Unusually high pressure
  return '';
};

/**
 * Returns a CSS class for an HOURLY wind detail based on speed AND direction.
 */
export const getWindSpeedClass = (parkOrientation, windDirectionDegrees, windSpeed) => {
  // We only highlight winds that are significant. 8mph is a good threshold.
  if (windSpeed < 8) return '';

  const parkAngle = directionToAngle[parkOrientation];
  
  // Calculate the difference between the wind direction and the park's orientation.
  let diff = Math.abs(windDirectionDegrees - parkAngle);
  if (diff > 180) diff = 360 - diff;

  // Is the wind blowing mostly out? (Within a 90-degree arc opposite the park's orientation)
  if (diff >= 135) return 'positive'; // Blowing Out
  
  // Is the wind blowing mostly in? (Within a 90-degree arc of the park's orientation)
  if (diff <= 45) return 'negative'; // Blowing In

  return ''; // Crosswinds are neutral
};

/**
 * Returns a CSS class for the SUMMARY "Wind Factor" text.
 * Uses a consistent threshold.
 */
export const getWindFactorClass = (windFactor, windSpeed) => {
  if (windSpeed >= 8) {
    if (windFactor.text === 'Blowing Out') return 'positive';
    if (windFactor.text === 'Blowing In') return 'negative';
  }
  return '';
};