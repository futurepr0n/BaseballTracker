/**
 * Weather Context Service
 * Integrates with MLBWeatherCard data to provide weather-based context
 * for baseball predictions, including wind factors, temperature effects,
 * and precipitation impact
 */

import { ballparkData } from '../components/cards/MLBWeatherCard/ballparkData';
import { getWindFactor } from '../components/cards/MLBWeatherCard/windUtils';

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
   * Get weather context for a specific game
   * @param {Object} game - Game object with homeTeam, awayTeam, venue
   * @returns {Object} Weather context
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
      // Check if it's a dome stadium
      const parkData = ballparkData[game.homeTeam];
      if (parkData?.isDome) {
        const context = {
          isDome: true,
          weatherImpact: 'none',
          badge: '🏟️ Dome Game',
          description: 'Indoor stadium - No weather factors',
          category: 'neutral'
        };
        
        this.cache.set(cacheKey, {
          data: context,
          timestamp: Date.now()
        });
        
        return context;
      }

      // For outdoor stadiums, we would typically fetch weather data here
      // Since MLBWeatherCard already handles this, we'll use a simplified approach
      // In a full implementation, you'd integrate with the weather API used by MLBWeatherCard
      
      const context = await this.getOutdoorStadiumWeather(game, parkData);
      
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
   * Get weather context for outdoor stadium
   * @param {Object} game - Game object
   * @param {Object} parkData - Ballpark data from MLBWeatherCard
   * @returns {Object} Weather context
   */
  async getOutdoorStadiumWeather(game, parkData) {
    // This is a simplified version. In a full implementation,
    // you'd fetch actual weather data from the same source as MLBWeatherCard
    
    // For now, we'll create a basic context structure
    // that can be enhanced when actual weather data is available
    
    const context = {
      isDome: false,
      hasWeatherData: false, // Set to true when actual weather data is integrated
      parkOrientation: parkData?.orientation || 'unknown',
      elevation: parkData?.elevation || 'sea level',
      weatherImpact: 'unknown',
      badge: '⛅ Outdoor Game',
      description: 'Outdoor stadium - Weather factors may apply',
      category: 'outdoor'
    };

    // If park data includes favorable characteristics for HRs
    if (parkData?.hrFactor && parkData.hrFactor > 1.1) {
      context.badge = '🌪️ Wind Helper';
      context.description = 'Stadium orientation typically favors home runs';
      context.weatherImpact = 'favorable';
    }

    return context;
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
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export const weatherContextService = new WeatherContextService();
export default weatherContextService;