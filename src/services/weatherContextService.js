/**
 * Enhanced Weather Context Service
 * Integrates with MLBWeatherCard data to provide comprehensive weather-based context
 * for baseball predictions, including real-time wind factors, temperature effects,
 * precipitation impact, and detailed ballpark-specific weather analysis
 */

import { ballparkData } from '../components/cards/MLBWeatherCard/ballparkData';
import { getWindFactor } from '../components/cards/MLBWeatherCard/windUtils';
import { getTempClass, getPrecipClass, getWindSpeedClass, getWindFactorClass } from '../components/cards/MLBWeatherCard/stylingUtils';

class WeatherContextService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Get weather context for games
   * @param {Array} games - Array of game objects
   * @returns {Array} Games with weather context
   */
  async getWeatherContextForGames(games) {
    if (!games || games.length === 0) return [];

    const weatherGames = await Promise.all(
      games.map(async (game) => {
        const context = await this.getGameWeatherContext(game);
        return {
          ...game,
          weatherContext: context
        };
      })
    );

    return weatherGames;
  }

  /**
   * Get weather context for a specific game with real weather data
   * @param {Object} game - Game object with homeTeam, awayTeam, venue
   * @returns {Object} Enhanced weather context
   */
  async getGameWeatherContext(game) {
    if (!game.homeTeam || !game.venue) return null;

    const cacheKey = `${game.homeTeam}-${game.venue}-${new Date().toDateString()}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Get ballpark data
      const parkData = ballparkData[game.homeTeam];
      if (!parkData) {
        console.warn(`No ballpark data found for ${game.homeTeam}`);
        return null;
      }

      // Check if it's a dome stadium
      const isDome = ['Tropicana Field', 'Rogers Centre', 'Chase Field', 'Minute Maid Park', 
                     'American Family Field', 'Globe Life Field', 'T-Mobile Park'].includes(parkData.name);

      if (isDome) {
        const context = {
          isDome: true,
          venue: parkData.name,
          weatherImpact: 'none',
          badge: '🏟️ Dome Game',
          description: 'Indoor stadium - No weather factors affect game',
          category: 'neutral',
          parkData: parkData
        };
        
        this.cache.set(cacheKey, {
          data: context,
          timestamp: Date.now()
        });
        
        return context;
      }

      // For outdoor stadiums, fetch real weather data
      const context = await this.getEnhancedOutdoorWeather(game, parkData);
      
      this.cache.set(cacheKey, {
        data: context,
        timestamp: Date.now()
      });

      return context;

    } catch (error) {
      console.error('Error getting weather context:', error);
      return null;
    }
  }

  /**
   * Get enhanced weather context for outdoor stadium with real weather data
   * @param {Object} game - Game object
   * @param {Object} parkData - Ballpark data from MLBWeatherCard
   * @returns {Object} Enhanced weather context
   */
  async getEnhancedOutdoorWeather(game, parkData) {
    try {
      // Fetch real weather data using the same API as MLBWeatherCard
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${parkData.lat}&longitude=${parkData.lon}&hourly=temperature_2m,apparent_temperature,precipitation_probability,surface_pressure,windspeed_10m,winddirection_10m&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch&timezone=auto`;
      
      const weatherResponse = await fetch(weatherUrl);
      
      if (!weatherResponse.ok) {
        console.warn(`Weather API failed for ${game.homeTeam} (${weatherResponse.status})`);
        return this.getFallbackWeatherContext(game, parkData);
      }
      
      const weatherData = await weatherResponse.json();
      
      // Get current/game time weather
      const now = new Date();
      const currentHourIndex = weatherData.hourly.time.findIndex(t => {
        const weatherTime = new Date(t);
        return weatherTime.getHours() === now.getHours() && 
               weatherTime.toDateString() === now.toDateString();
      });
      
      if (currentHourIndex === -1) {
        console.warn('Could not find current hour in weather data');
        return this.getFallbackWeatherContext(game, parkData);
      }
      
      // Extract current weather conditions
      const currentWeather = {
        temperature: Math.round(weatherData.hourly.temperature_2m[currentHourIndex]),
        feelsLike: Math.round(weatherData.hourly.apparent_temperature[currentHourIndex]),
        precipitation: weatherData.hourly.precipitation_probability[currentHourIndex],
        pressure: Math.round(weatherData.hourly.surface_pressure[currentHourIndex]),
        windSpeed: Math.round(weatherData.hourly.windspeed_10m[currentHourIndex]),
        windDirection: weatherData.hourly.winddirection_10m[currentHourIndex]
      };
      
      // Calculate wind factor using park orientation
      const windFactor = getWindFactor(parkData.orientation, currentWeather.windDirection);
      
      // Analyze temperature impact
      const tempAnalysis = this.analyzeTemperatureImpact(currentWeather.temperature);
      
      // Determine overall weather impact
      const weatherImpact = this.calculateOverallWeatherImpact(currentWeather, windFactor, tempAnalysis);
      
      // Create comprehensive weather context
      const context = {
        isDome: false,
        hasWeatherData: true,
        venue: parkData.name,
        parkOrientation: parkData.orientation,
        currentWeather: currentWeather,
        windFactor: windFactor,
        temperatureAnalysis: tempAnalysis,
        weatherImpact: weatherImpact.impact,
        badge: weatherImpact.badge,
        description: weatherImpact.description,
        category: weatherImpact.category,
        parkData: parkData,
        // Additional details for rich tooltip
        details: {
          temperature: `${currentWeather.temperature}°F (feels like ${currentWeather.feelsLike}°F)`,
          wind: `${currentWeather.windSpeed}mph ${this.getWindDirectionText(currentWeather.windDirection)}`,
          windImpact: windFactor.description,
          precipitation: `${currentWeather.precipitation}% chance`,
          pressure: `${currentWeather.pressure} hPa`,
          tempImpact: tempAnalysis.description
        }
      };
      
      return context;
      
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return this.getFallbackWeatherContext(game, parkData);
    }
  }

  /**
   * Analyze wind impact on HR potential (when weather data available)
   * @param {Object} weatherData - Weather data from MLBWeatherCard
   * @param {Object} parkData - Ballpark orientation data
   * @returns {Object} Wind analysis
   */
  analyzeWindImpact(weatherData, parkData) {
    if (!weatherData || !parkData) return null;

    try {
      const windFactor = getWindFactor(parkData.orientation, weatherData.windDirection, weatherData.windSpeed);
      
      return {
        windSpeed: weatherData.windSpeed,
        windDirection: weatherData.windDirection,
        windFactor: windFactor,
        impact: this.categorizeWindImpact(windFactor, weatherData.windSpeed),
        badge: this.getWindBadge(windFactor, weatherData.windSpeed),
        description: windFactor.description
      };
    } catch (error) {
      console.error('Error analyzing wind impact:', error);
      return null;
    }
  }

  /**
   * Categorize wind impact
   */
  categorizeWindImpact(windFactor, windSpeed) {
    if (windSpeed < 5) return 'minimal';
    
    if (windFactor.factor > 1.2) return 'very_favorable';
    if (windFactor.factor > 1.1) return 'favorable';
    if (windFactor.factor < 0.8) return 'very_unfavorable';
    if (windFactor.factor < 0.9) return 'unfavorable';
    return 'neutral';
  }

  /**
   * Get wind badge
   */
  getWindBadge(windFactor, windSpeed) {
    if (windSpeed < 5) return '🕳️ Still Air';
    
    if (windFactor.factor > 1.2) return '🌪️ Wind Boost';
    if (windFactor.factor > 1.1) return '💨 Wind Helper';
    if (windFactor.factor < 0.8) return '🌬️ Strong Headwind';
    if (windFactor.factor < 0.9) return '↩️ Wind Against';
    return '🌀 Crosswind';
  }

  /**
   * Analyze temperature impact
   * @param {number} temperature - Temperature in Fahrenheit
   * @returns {Object} Temperature analysis
   */
  analyzeTemperatureImpact(temperature) {
    if (!temperature) return null;

    let impact = 'neutral';
    let badge = '🌡️ Normal Temp';
    let description = 'Normal temperature conditions';

    // Hot weather helps ball carry
    if (temperature >= 85) {
      impact = 'favorable';
      badge = '🔥 Hot Weather';
      description = `Hot weather (${temperature}°F) helps ball carry further`;
    } else if (temperature >= 75) {
      impact = 'slightly_favorable';
      badge = '☀️ Warm Weather';
      description = `Warm weather (${temperature}°F) slightly favors hitters`;
    } else if (temperature <= 50) {
      impact = 'unfavorable';
      badge = '🥶 Cold Weather';
      description = `Cold weather (${temperature}°F) reduces ball flight`;
    } else if (temperature <= 60) {
      impact = 'slightly_unfavorable';
      badge = '❄️ Cool Weather';
      description = `Cool weather (${temperature}°F) slightly reduces ball flight`;
    }

    return {
      temperature,
      impact,
      badge,
      description,
      factor: this.getTemperatureFactor(temperature)
    };
  }

  /**
   * Get temperature factor for HR probability adjustment
   */
  getTemperatureFactor(temperature) {
    // Every 10 degrees above 70 adds ~2% to HR distance
    // Every 10 degrees below 70 reduces ~2% from HR distance
    const baseline = 70;
    const factorPerDegree = 0.002;
    return 1 + ((temperature - baseline) * factorPerDegree);
  }

  /**
   * Get weather summary for multiple games
   * @param {Array} weatherGames - Games with weather context
   * @returns {Object} Weather summary
   */
  getWeatherSummary(weatherGames) {
    const summary = {
      totalGames: weatherGames.length,
      domeGames: 0,
      outdoorGames: 0,
      favorableWeather: 0,
      unfavorableWeather: 0,
      alerts: []
    };

    weatherGames.forEach(game => {
      if (!game.weatherContext) return;

      if (game.weatherContext.isDome) {
        summary.domeGames++;
      } else {
        summary.outdoorGames++;
      }

      if (game.weatherContext.weatherImpact === 'favorable' || 
          game.weatherContext.weatherImpact === 'very_favorable') {
        summary.favorableWeather++;
      } else if (game.weatherContext.weatherImpact === 'unfavorable' || 
                 game.weatherContext.weatherImpact === 'very_unfavorable') {
        summary.unfavorableWeather++;
      }

      // Add weather alerts
      if (game.weatherContext.weatherImpact === 'very_favorable') {
        summary.alerts.push({
          type: 'opportunity',
          game: `${game.awayTeam} @ ${game.homeTeam}`,
          message: game.weatherContext.description
        });
      } else if (game.weatherContext.weatherImpact === 'very_unfavorable') {
        summary.alerts.push({
          type: 'warning',
          game: `${game.awayTeam} @ ${game.homeTeam}`,
          message: game.weatherContext.description
        });
      }
    });

    return summary;
  }

  /**
   * Get fallback weather context when API fails
   */
  getFallbackWeatherContext(game, parkData) {
    return {
      isDome: false,
      hasWeatherData: false,
      venue: parkData.name,
      parkOrientation: parkData.orientation,
      weatherImpact: 'unknown',
      badge: '🌤️ Outdoor Game',
      description: 'Outdoor stadium - Weather data unavailable',
      category: 'outdoor',
      parkData: parkData,
      details: {
        status: 'Weather data unavailable',
        venue: parkData.name,
        type: 'Outdoor stadium'
      }
    };
  }
  
  /**
   * Calculate overall weather impact
   */
  calculateOverallWeatherImpact(weather, windFactor, tempAnalysis) {
    let impact = 'neutral';
    let badge = '🌤️ Outdoor Game';
    let description = 'Outdoor game with neutral weather conditions';
    let category = 'neutral';
    
    // Wind impact scoring
    let windScore = 0;
    if (windFactor.text === 'Blowing Out') {
      windScore = weather.windSpeed >= 15 ? 3 : (weather.windSpeed >= 10 ? 2 : 1);
    } else if (windFactor.text === 'Blowing In') {
      windScore = weather.windSpeed >= 15 ? -3 : (weather.windSpeed >= 10 ? -2 : -1);
    }
    
    // Temperature impact scoring
    let tempScore = 0;
    if (tempAnalysis.impact === 'favorable') tempScore = 2;
    else if (tempAnalysis.impact === 'slightly_favorable') tempScore = 1;
    else if (tempAnalysis.impact === 'unfavorable') tempScore = -2;
    else if (tempAnalysis.impact === 'slightly_unfavorable') tempScore = -1;
    
    // Combined scoring
    const totalScore = windScore + tempScore;
    
    if (totalScore >= 3) {
      impact = 'very_favorable';
      badge = '🌪️ Wind Boost';
      description = `Strong favorable conditions: ${windFactor.description} and ${tempAnalysis.description.toLowerCase()}`;
      category = 'very_favorable';
    } else if (totalScore >= 1) {
      impact = 'favorable';
      badge = '💨 Wind Helper';
      description = `Favorable conditions: ${windFactor.description}`;
      category = 'favorable';
    } else if (totalScore <= -3) {
      impact = 'very_unfavorable';
      badge = '❄️ Poor Conditions';
      description = `Poor conditions: ${windFactor.description} and ${tempAnalysis.description.toLowerCase()}`;
      category = 'very_unfavorable';
    } else if (totalScore <= -1) {
      impact = 'unfavorable';
      badge = '🌬️ Wind Against';
      description = `Unfavorable conditions: ${windFactor.description}`;
      category = 'unfavorable';
    }
    
    // Precipitation override
    if (weather.precipitation >= 70) {
      impact = 'unfavorable';
      badge = '🌧️ High Rain Risk';
      description = `${weather.precipitation}% chance of precipitation`;
      category = 'unfavorable';
    }
    
    return { impact, badge, description, category };
  }
  
  /**
   * Get wind direction text
   */
  getWindDirectionText(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export const weatherContextService = new WeatherContextService();
export default weatherContextService;