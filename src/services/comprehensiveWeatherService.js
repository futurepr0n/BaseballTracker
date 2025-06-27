/**
 * Comprehensive Weather Service
 * Integrates MLBWeatherCard data with player exit velocity profiles
 */

import { ballparkData } from '../components/cards/MLBWeatherCard/ballparkData';
import { getWindFactor } from '../components/cards/MLBWeatherCard/windUtils';

class ComprehensiveWeatherService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes (weather changes)
  }

  /**
   * Analyze comprehensive weather impact for players
   */
  async analyzeWeatherImpact(venue, gameTime, playerProfiles) {
    const cacheKey = `weather_${venue}_${gameTime}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Get weather data for the venue and time
      const weatherData = await this.getGameWeatherData(venue, gameTime);
      
      if (!weatherData) {
        return this.getDomeOrFallbackWeather(venue);
      }

      // Calculate comprehensive weather impact
      const weatherImpact = this.calculateComprehensiveWeatherImpact(
        weatherData, 
        venue, 
        playerProfiles
      );

      this.cache.set(cacheKey, {
        data: weatherImpact,
        timestamp: Date.now()
      });

      return weatherImpact;
    } catch (error) {
      console.error('Error analyzing weather impact:', error);
      return this.getDomeOrFallbackWeather(venue);
    }
  }

  /**
   * Get weather data from MLBWeatherCard source
   */
  async getGameWeatherData(venue, gameTime) {
    try {
      // Get ballpark data for the venue
      const ballpark = this.findBallparkData(venue);
      
      if (!ballpark) {
        return null;
      }

      // Check if it's a dome
      if (ballpark.isDome) {
        return null; // Will return dome conditions
      }

      // Simulate getting weather data (in real implementation, this would call the weather API)
      // For now, we'll use sample data structure that matches MLBWeatherCard
      return await this.fetchWeatherForVenue(ballpark, gameTime);
    } catch (error) {
      console.warn('Could not fetch weather data:', error);
      return null;
    }
  }

  /**
   * Find ballpark data for venue
   */
  findBallparkData(venue) {
    // ballparkData is organized by team names, but contains ballpark names
    // First try to find by ballpark name match
    for (const [teamName, parkInfo] of Object.entries(ballparkData)) {
      if (parkInfo.name === venue ||
          parkInfo.name.toLowerCase().includes(venue.toLowerCase()) ||
          venue.toLowerCase().includes(parkInfo.name.toLowerCase())) {
        return { ...parkInfo, teamName };
      }
    }
    
    // If not found, try team name match (fallback)
    for (const [teamName, parkInfo] of Object.entries(ballparkData)) {
      if (teamName.toLowerCase().includes(venue.toLowerCase()) ||
          venue.toLowerCase().includes(teamName.toLowerCase())) {
        return { ...parkInfo, teamName };
      }
    }
    
    return null;
  }

  /**
   * Fetch weather data for venue using Open-Meteo API (same as MLBWeatherCard)
   */
  async fetchWeatherForVenue(ballpark, gameTime) {
    try {
      // Use the same Open-Meteo API that MLBWeatherCard uses
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${ballpark.lat}&longitude=${ballpark.lon}&hourly=temperature_2m,apparent_temperature,precipitation_probability,surface_pressure,windspeed_10m,winddirection_10m&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch&timezone=auto`;
      
      const response = await fetch(weatherUrl);
      
      if (!response.ok) {
        console.warn('Weather API failed, using fallback');
        return this.generateDefaultWeatherData(ballpark, gameTime);
      }

      const weatherData = await response.json();
      console.log(`Fetched real weather data for ${ballpark.name}:`, weatherData);
      
      return this.processRealWeatherData(weatherData, ballpark, gameTime);
    } catch (error) {
      console.warn('Error fetching real weather data:', error);
      return this.generateDefaultWeatherData(ballpark, gameTime);
    }
  }

  /**
   * Process real Open-Meteo weather data
   */
  processRealWeatherData(weatherData, ballpark, gameTime) {
    const gameDate = new Date(gameTime);
    const gameHour = gameDate.getHours();
    
    // Find the closest time in hourly data for game time
    let weatherAtGameTime = null;
    
    if (weatherData.hourly && weatherData.hourly.time) {
      // Find the index that matches the game hour
      const gameTimeIndex = weatherData.hourly.time.findIndex(time => {
        const weatherHour = new Date(time).getHours();
        return Math.abs(weatherHour - gameHour) <= 1; // Within 1 hour
      });
      
      if (gameTimeIndex !== -1) {
        weatherAtGameTime = {
          temperature: weatherData.hourly.temperature_2m[gameTimeIndex] || 75,
          windSpeed: weatherData.hourly.windspeed_10m[gameTimeIndex] || 5,
          windDirection: weatherData.hourly.winddirection_10m[gameTimeIndex] || 180,
          precipitation: weatherData.hourly.precipitation_probability[gameTimeIndex] || 0,
          pressure: weatherData.hourly.surface_pressure[gameTimeIndex] || 1013,
          apparentTemperature: weatherData.hourly.apparent_temperature[gameTimeIndex] || 75
        };
      }
    }
    
    // Fallback to first available data if no matching hour
    if (!weatherAtGameTime && weatherData.hourly) {
      weatherAtGameTime = {
        temperature: weatherData.hourly.temperature_2m[0] || 75,
        windSpeed: weatherData.hourly.windspeed_10m[0] || 5,
        windDirection: weatherData.hourly.winddirection_10m[0] || 180,
        precipitation: weatherData.hourly.precipitation_probability[0] || 0,
        pressure: weatherData.hourly.surface_pressure[0] || 1013,
        apparentTemperature: weatherData.hourly.apparent_temperature[0] || 75
      };
    }
    
    // Final fallback
    if (!weatherAtGameTime) {
      return this.generateDefaultWeatherData(ballpark, gameTime);
    }

    // Generate weather description based on actual conditions
    const description = this.generateRealWeatherDescription(weatherAtGameTime);

    return {
      venue: ballpark.name,
      isDome: ballpark.isDome || false,
      temperature: Math.round(weatherAtGameTime.temperature),
      windSpeed: Math.round(weatherAtGameTime.windSpeed),
      windDirection: Math.round(weatherAtGameTime.windDirection),
      precipitation: Math.round(weatherAtGameTime.precipitation),
      pressure: Math.round(weatherAtGameTime.pressure),
      parkOrientation: ballpark.orientation,
      description: description,
      windFactor: getWindFactor(ballpark.orientation, weatherAtGameTime.windDirection),
      isRealWeatherData: true // Flag to indicate this is real data
    };
  }

  /**
   * Generate description from real weather data
   */
  generateRealWeatherDescription(weather) {
    const temp = Math.round(weather.temperature);
    const wind = Math.round(weather.windSpeed);
    const precip = Math.round(weather.precipitation);
    
    let desc = `${temp}°F`;
    
    if (wind > 15) {
      desc += `, ${wind}mph winds`;
    } else if (wind > 8) {
      desc += `, ${wind}mph breeze`;
    }
    
    // Real precipitation handling
    if (precip >= 80) {
      desc += ', severe weather - game delay likely';
    } else if (precip >= 60) {
      desc += ', heavy rain likely';
    } else if (precip >= 40) {
      desc += ', moderate rain possible';
    } else if (precip >= 20) {
      desc += ', light rain possible';
    }
    
    return desc;
  }

  /**
   * Process real weather data from game files
   */
  processWeatherData(weatherData, ballpark, gameTime) {
    const startTime = new Date(gameTime);
    const currentHour = startTime.getHours();
    
    // Find the closest time in hourly data
    let weatherAtGameTime = weatherData.current || {};
    
    if (weatherData.hourly && weatherData.hourly.time) {
      const gameTimeIndex = weatherData.hourly.time.findIndex(time => 
        new Date(time).getHours() === currentHour
      );
      
      if (gameTimeIndex !== -1) {
        weatherAtGameTime = {
          temperature: weatherData.hourly.temperature_2m?.[gameTimeIndex] || 75,
          windSpeed: weatherData.hourly.windspeed_10m?.[gameTimeIndex] || 5,
          windDirection: weatherData.hourly.winddirection_10m?.[gameTimeIndex] || 180,
          precipitation: weatherData.hourly.precipitation_probability?.[gameTimeIndex] || 0,
          pressure: weatherData.hourly.surface_pressure?.[gameTimeIndex] || 1013
        };
      }
    }

    return {
      venue: ballpark.name,
      isDome: ballpark.isDome || false,
      temperature: weatherAtGameTime.temperature || 75,
      windSpeed: weatherAtGameTime.windSpeed || 5,
      windDirection: weatherAtGameTime.windDirection || 180,
      precipitation: weatherAtGameTime.precipitation || 0,
      pressure: weatherAtGameTime.pressure || 1013,
      parkOrientation: ballpark.orientation,
      description: this.generateWeatherDescription(weatherAtGameTime),
      windFactor: getWindFactor(ballpark.orientation, weatherAtGameTime.windDirection || 180)
    };
  }

  /**
   * Generate default weather data when real data unavailable
   */
  generateDefaultWeatherData(ballpark, gameTime) {
    console.warn(`Using fallback weather data for ${ballpark.name} - real API unavailable`);
    
    // Basic fallback when API fails
    const currentDate = new Date(gameTime || new Date());
    const month = currentDate.getMonth();
    const hour = currentDate.getHours();
    
    // Conservative defaults based on season
    let baseTemp = month >= 4 && month <= 8 ? 75 : 65;
    if (hour >= 19 || hour <= 6) baseTemp -= 5;
    
    return {
      venue: ballpark.name,
      isDome: ballpark.isDome || false,
      temperature: Math.round(baseTemp),
      windSpeed: 5, // Light wind
      windDirection: 180, // Straight out to center field
      precipitation: 0, // Clear conditions as fallback
      pressure: 1013,
      parkOrientation: ballpark.orientation,
      description: `${Math.round(baseTemp)}°F, light winds - weather data unavailable`,
      windFactor: getWindFactor(ballpark.orientation, 180),
      isRealWeatherData: false
    };
  }

  /**
   * Calculate comprehensive weather impact
   */
  calculateComprehensiveWeatherImpact(weatherData, venue, playerProfiles = []) {
    if (weatherData.isDome) {
      return {
        overallImpact: 0,
        totalEnvironmentalImpact: 0,
        conditions: 'Indoor stadium - controlled environment',
        windImpact: 'None (dome)',
        temperatureImpact: 'Controlled (dome)',
        precipitationImpact: 'None (dome)',
        playerImpacts: playerProfiles.map(player => ({
          playerName: player.name || player.playerName,
          windImpact: 0,
          temperatureImpact: 0,
          overallWeatherBoost: 0,
          explanation: 'Dome game - no weather factors'
        })),
        environmentalFactors: {
          description: 'Indoor controlled environment',
          impacts: ['No wind effects', 'Consistent temperature', 'No precipitation']
        },
        environmentalImpacts: {
          climate: { factor: 0, description: 'Controlled temperature (dome)' },
          altitude: { factor: 0, description: 'Standard altitude' },
          dome: { factor: 0, description: 'Indoor stadium' }
        },
        classification: 'neutral',
        recommendation: 'Indoor conditions - no weather impact'
      };
    }

    // Calculate wind impact based on player profiles
    const playerWindImpacts = this.calculatePlayerWindImpacts(weatherData, playerProfiles);
    
    // Calculate temperature impact
    const temperatureImpact = this.calculateTemperatureImpact(weatherData.temperature);
    
    // Calculate precipitation impact with weather description
    const precipitationImpact = this.calculatePrecipitationImpact(
      weatherData.precipitation, 
      weatherData.description || weatherData.conditions || ''
    );
    
    // Overall environmental impact
    const overallImpact = this.calculateOverallEnvironmentalImpact(
      weatherData, 
      playerWindImpacts, 
      temperatureImpact, 
      precipitationImpact
    );

    return {
      overallImpact,
      totalEnvironmentalImpact: overallImpact,
      conditions: weatherData.description,
      windImpact: this.describeWindImpact(weatherData.windFactor, weatherData.windSpeed),
      temperatureImpact: this.describeTemperatureImpact(weatherData.temperature),
      precipitationImpact: this.describePrecipitationImpact(
        weatherData.precipitation, 
        weatherData.description || weatherData.conditions || ''
      ),
      playerImpacts: playerWindImpacts,
      environmentalFactors: {
        description: this.generateEnvironmentalDescription(weatherData),
        impacts: this.identifyEnvironmentalImpacts(weatherData, overallImpact)
      },
      // Add the expected structure for the component
      environmentalImpacts: {
        climate: {
          factor: temperatureImpact,
          description: this.describeTemperatureImpact(weatherData.temperature)
        },
        altitude: {
          factor: 0, // Not currently calculated
          description: 'Standard altitude'
        },
        dome: {
          factor: weatherData.isDome ? 0 : -2,
          description: weatherData.isDome ? 'Indoor stadium' : 'Outdoor stadium'
        }
      },
      classification: this.classifyEnvironmentalImpact(overallImpact, weatherData),
      recommendation: this.generateWeatherRecommendation(overallImpact, weatherData),
      rawWeatherData: weatherData
    };
  }

  /**
   * Calculate wind impact for individual players based on exit velocity
   */
  calculatePlayerWindImpacts(weatherData, playerProfiles) {
    return playerProfiles.map(player => {
      const playerName = player.name || player.playerName;
      const exitVelocity = this.estimatePlayerExitVelocity(player);
      
      const windImpact = this.calculateWindImpactForPlayer(
        weatherData.windFactor,
        weatherData.windSpeed,
        exitVelocity
      );

      return {
        playerName,
        exitVelocity,
        windImpact: windImpact.score,
        temperatureImpact: this.calculateTemperatureImpactForPlayer(weatherData.temperature, exitVelocity),
        overallWeatherBoost: windImpact.score + this.calculateTemperatureImpactForPlayer(weatherData.temperature, exitVelocity),
        explanation: windImpact.explanation
      };
    });
  }

  /**
   * Estimate player exit velocity from available data
   */
  estimatePlayerExitVelocity(player) {
    // Try to get from HR prediction data or estimate from power stats
    if (player.hrPredictionData?.hrRate) {
      // Higher HR rate typically correlates with higher exit velocity
      const hrRate = player.hrPredictionData.hrRate;
      return 85 + (hrRate * 100); // Rough estimation
    }
    
    if (player.baseStats?.homeRuns) {
      // Estimate based on HR count
      const hrCount = player.baseStats.homeRuns;
      return 85 + (hrCount * 2); // Rough estimation
    }
    
    // Default to league average
    return 87.5;
  }

  /**
   * Calculate wind impact for specific player
   */
  calculateWindImpactForPlayer(windFactor, windSpeed, exitVelocity) {
    const speedFactor = windSpeed / 10; // Normalize wind speed
    const velocityFactor = (exitVelocity - 85) / 15; // Normalize exit velocity
    
    switch (windFactor.text) {
      case 'Blowing Out':
        const tailwindBoost = speedFactor * (1 + velocityFactor) * 8;
        return {
          score: Math.min(15, tailwindBoost),
          explanation: `Tailwind helps carry ball (${windSpeed}mph, ${exitVelocity.toFixed(1)} mph exit velocity)`
        };
        
      case 'Blowing In':
        const headwindPenalty = -speedFactor * (1 + velocityFactor) * 6;
        return {
          score: Math.max(-12, headwindPenalty),
          explanation: `Headwind reduces ball flight (${windSpeed}mph vs ${exitVelocity.toFixed(1)} mph exit velocity)`
        };
        
      case 'Crosswind':
        const crosswindEffect = speedFactor * velocityFactor * 2;
        return {
          score: Math.max(-3, Math.min(3, crosswindEffect)),
          explanation: `Crosswind may affect ball direction (${windSpeed}mph)`
        };
        
      default:
        return {
          score: 0,
          explanation: 'No significant wind impact'
        };
    }
  }

  /**
   * Calculate temperature impact
   */
  calculateTemperatureImpact(temperature) {
    // Hot air is less dense, helps ball flight
    if (temperature > 85) return Math.min(8, (temperature - 85) * 0.4);
    if (temperature < 50) return Math.max(-8, (temperature - 50) * 0.3);
    return 0;
  }

  /**
   * Calculate temperature impact for individual player
   */
  calculateTemperatureImpactForPlayer(temperature, exitVelocity) {
    const tempImpact = this.calculateTemperatureImpact(temperature);
    const velocityFactor = exitVelocity > 90 ? 1.2 : 1.0; // High exit velocity benefits more
    return tempImpact * velocityFactor;
  }

  /**
   * Calculate precipitation impact
   */
  calculatePrecipitationImpact(precipitation, weatherDescription = '') {
    // Check for severe weather indicators
    const severityIndicators = this.assessWeatherSeverity(precipitation, weatherDescription);
    
    if (severityIndicators.isGameDelaying) {
      return -15; // Severe negative impact for game-delaying weather
    }
    
    if (precipitation > 70) return -12; // Very heavy rain
    if (precipitation > 50) return -10; // Heavy rain
    if (precipitation > 30) return -7;  // Moderate rain
    if (precipitation > 20) return -5;  // Light rain
    if (precipitation > 10) return -3;  // Drizzle
    return 0;
  }

  /**
   * Assess weather severity for game delays
   */
  assessWeatherSeverity(precipitation, weatherDescription = '') {
    const description = weatherDescription.toLowerCase();
    
    // Keywords that indicate severe weather
    const gameDelayingKeywords = [
      'delay', 'delayed', 'postpone', 'postponed', 'thunderstorm', 'storm', 
      'heavy rain', 'downpour', 'severe', 'lightning', 'tornado', 'hail'
    ];
    
    const isGameDelaying = gameDelayingKeywords.some(keyword => 
      description.includes(keyword)
    ) || precipitation > 80; // Very high precipitation probability
    
    const severity = {
      isGameDelaying,
      isSevere: precipitation > 60 || description.includes('severe') || description.includes('storm'),
      isModerate: precipitation > 30 && precipitation <= 60,
      isLight: precipitation > 10 && precipitation <= 30,
      category: this.categorizePrecipitation(precipitation, description)
    };

    return severity;
  }

  /**
   * Categorize precipitation severity
   */
  categorizePrecipitation(precipitation, description) {
    const desc = description.toLowerCase();
    
    if (desc.includes('delay') || desc.includes('postpone')) return 'game-affecting';
    if (precipitation > 80 || desc.includes('severe') || desc.includes('storm')) return 'severe';
    if (precipitation > 60) return 'heavy';
    if (precipitation > 30) return 'moderate';
    if (precipitation > 10) return 'light';
    return 'none';
  }

  /**
   * Calculate overall environmental impact
   */
  calculateOverallEnvironmentalImpact(weatherData, playerWindImpacts, temperatureImpact, precipitationImpact) {
    const avgPlayerImpact = playerWindImpacts.length > 0 
      ? playerWindImpacts.reduce((sum, p) => sum + p.overallWeatherBoost, 0) / playerWindImpacts.length
      : 0;
    
    return Math.round((avgPlayerImpact + temperatureImpact + precipitationImpact) * 0.7);
  }

  /**
   * Generate weather description
   */
  generateWeatherDescription(weather) {
    const temp = Math.round(weather.temperature);
    const wind = Math.round(weather.windSpeed);
    const precip = weather.precipitation;
    
    let desc = `${temp}°F`;
    
    if (wind > 10) {
      desc += `, ${wind}mph winds`;
    } else if (wind > 5) {
      desc += `, light breeze`;
    }
    
    if (precip > 20) {
      desc += ', rain possible';
    }
    
    return desc;
  }

  /**
   * Generate environmental description
   */
  generateEnvironmentalDescription(weatherData) {
    if (weatherData.isDome) {
      return 'Indoor controlled environment';
    }
    
    const impacts = [];
    const severity = this.assessWeatherSeverity(
      weatherData.precipitation, 
      weatherData.description || weatherData.conditions || ''
    );
    
    // Check for severe weather first
    if (severity.isGameDelaying) {
      impacts.push('⚠️ SEVERE WEATHER CONDITIONS - Game delay/postponement risk');
    } else if (severity.category === 'severe') {
      impacts.push('Severe precipitation conditions - major impact on play');
    } else if (severity.category === 'heavy') {
      impacts.push('Heavy precipitation expected - significant impact');
    } else if (weatherData.precipitation > 20) {
      impacts.push('Precipitation may affect play');
    }
    
    if (weatherData.windSpeed > 10) {
      impacts.push(`${weatherData.windFactor.text} winds (${weatherData.windSpeed}mph)`);
    }
    
    if (weatherData.temperature > 85) {
      impacts.push(`Hot weather aids ball flight (${Math.round(weatherData.temperature)}°F)`);
    } else if (weatherData.temperature < 50) {
      impacts.push(`Cold weather reduces ball flight (${Math.round(weatherData.temperature)}°F)`);
    }
    
    return impacts.length > 0 ? impacts.join(', ') : 'Favorable conditions';
  }

  /**
   * Identify environmental impacts
   */
  identifyEnvironmentalImpacts(weatherData, overallImpact) {
    const impacts = [];
    const severity = this.assessWeatherSeverity(
      weatherData.precipitation, 
      weatherData.description || weatherData.conditions || ''
    );
    
    // Severe weather impacts take priority
    if (severity.isGameDelaying) {
      impacts.push('⚠️ SEVERE WEATHER ALERT - Game delay/postponement highly likely');
      impacts.push('Major negative impact on all offensive production');
    } else if (severity.category === 'severe') {
      impacts.push('Severe precipitation significantly hurts offensive production');
    } else if (overallImpact > 5) {
      impacts.push('Weather favors offensive production');
    } else if (overallImpact < -10) {
      impacts.push('Weather significantly hurts offensive production');
    } else if (overallImpact < -5) {
      impacts.push('Weather hurts offensive production');
    } else {
      impacts.push('Neutral weather conditions');
    }
    
    if (weatherData.windSpeed > 15) {
      impacts.push('Strong winds will significantly affect ball flight');
    }
    
    if (weatherData.temperature > 90 || weatherData.temperature < 45) {
      impacts.push('Extreme temperatures may affect player performance');
    }
    
    // Add specific precipitation warnings
    if (severity.category === 'heavy') {
      impacts.push('Heavy rain may delay game or reduce hitting conditions');
    } else if (severity.category === 'moderate') {
      impacts.push('Moderate rain may impact hitting performance');
    }
    
    return impacts;
  }

  // Description helper methods
  describeWindImpact(windFactor, windSpeed) {
    if (windSpeed < 5) return 'Minimal wind impact';
    return `${windFactor.text} at ${windSpeed}mph - ${windFactor.description}`;
  }

  describeTemperatureImpact(temperature) {
    if (temperature > 85) return `Hot weather (${Math.round(temperature)}°F) helps ball carry`;
    if (temperature < 50) return `Cold weather (${Math.round(temperature)}°F) reduces ball flight`;
    return `Comfortable temperature (${Math.round(temperature)}°F)`;
  }

  describePrecipitationImpact(precipitation, weatherDescription = '') {
    const severity = this.assessWeatherSeverity(precipitation, weatherDescription);
    
    if (severity.isGameDelaying) {
      return '⚠️ SEVERE WEATHER - Game delay/postponement likely - major negative impact';
    }
    
    switch (severity.category) {
      case 'severe':
        return 'Severe precipitation - very significant negative impact';
      case 'heavy':
        return 'Heavy rain likely - significant negative impact';
      case 'moderate':
        return 'Moderate rain possible - notable negative impact';
      case 'light':
        return 'Light rain possible - minor negative impact';
      default:
        return 'Clear conditions - no precipitation impact';
    }
  }

  /**
   * Classify environmental impact
   */
  classifyEnvironmentalImpact(overallImpact, weatherData = null) {
    // Check for severe weather conditions first
    if (weatherData) {
      const severity = this.assessWeatherSeverity(
        weatherData.precipitation, 
        weatherData.description || weatherData.conditions || ''
      );
      
      if (severity.isGameDelaying) {
        return 'severe_weather_alert';
      }
    }
    
    if (overallImpact > 10) return 'highly_favorable';
    if (overallImpact > 5) return 'favorable';
    if (overallImpact > -5) return 'neutral';
    if (overallImpact > -10) return 'unfavorable';
    return 'highly_unfavorable';
  }

  /**
   * Generate weather recommendation
   */
  generateWeatherRecommendation(overallImpact, weatherData) {
    if (weatherData.isDome) {
      return 'Indoor conditions - no weather impact on play';
    }
    
    // Check for severe weather first
    const severity = this.assessWeatherSeverity(
      weatherData.precipitation, 
      weatherData.description || weatherData.conditions || ''
    );
    
    if (severity.isGameDelaying) {
      return '⚠️ SEVERE WEATHER WARNING - Consider game delay/postponement risk in all decisions';
    }
    
    if (severity.category === 'severe') {
      return 'Severe weather conditions - avoid power plays, consider under totals';
    }
    
    if (severity.category === 'heavy') {
      return 'Heavy precipitation expected - reduces offensive potential significantly';
    }
    
    if (overallImpact > 10) {
      return 'Excellent weather conditions for power hitting';
    } else if (overallImpact > 5) {
      return 'Favorable weather conditions for offense';
    } else if (overallImpact < -10) {
      return 'Weather significantly hurts offensive production';
    } else if (overallImpact < -5) {
      return 'Weather slightly unfavorable for hitting';
    }
    
    return 'Neutral weather conditions';
  }

  /**
   * Get dome or fallback weather conditions
   */
  getDomeOrFallbackWeather(venue) {
    return {
      overallImpact: 0,
      totalEnvironmentalImpact: 0,
      conditions: 'Indoor stadium or weather data unavailable',
      windImpact: 'None',
      temperatureImpact: 'Controlled',
      precipitationImpact: 'None',
      playerImpacts: [],
      environmentalFactors: {
        description: 'Standard controlled conditions',
        impacts: ['No weather factors']
      },
      environmentalImpacts: {
        climate: { factor: 0, description: 'Controlled temperature' },
        altitude: { factor: 0, description: 'Standard altitude' },
        dome: { factor: 0, description: 'Indoor or unknown conditions' }
      },
      classification: 'neutral',
      recommendation: 'No weather impact available'
    };
  }
}

const comprehensiveWeatherService = new ComprehensiveWeatherService();
export default comprehensiveWeatherService;