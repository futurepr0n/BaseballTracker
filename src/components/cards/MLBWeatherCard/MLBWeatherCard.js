// src/components/cards/MLBWeatherCard/MLBWeatherCard.js
import React, { useState, useEffect } from 'react';
import { ballparkData } from './ballparkData';
import { getWindFactor, getWindIcon } from './windUtils';
import WindDiagram from './WindDiagram';
import { 
  getTempClass, 
  getPrecipClass, 
  getPressureClass, 
  getWindSpeedClass,
  getWindFactorClass 
} from './stylingUtils';
import { useTeamFilter } from '../../TeamFilterContext';
import './MLBWeatherCard.css';

/**
 * Mini GameWeatherCard Component for use within the scrollable container
 */
const MiniGameWeatherCard = ({ game }) => {
  if (!game.weather) {
    return (
      <div className="mini-weather-card">
        <div className="mini-card-header">
          <h4>{game.awayTeam} @ {game.homeTeam}</h4>
          <p className="venue-name">{game.venue}</p>
        </div>
        <div className="dome-message">
          <p>Indoor stadium - No weather factors</p>
        </div>
      </div>
    );
  }

  const { awayTeam, homeTeam, venue, gameTime, weather, windFactor, parkOrientation } = game;
  const startTime = new Date(gameTime);
  const startIndex = weather.hourly.time.findIndex(t => new Date(t) >= startTime);

  let hourlyData = [];
  if (startIndex !== -1) {
    hourlyData = weather.hourly.time.slice(startIndex, startIndex + 4).map((t, i) => {
        const currentIndex = startIndex + i;
        return {
            time: new Date(t),
            temp: Math.round(weather.hourly.temperature_2m[currentIndex]),
            feelsLike: Math.round(weather.hourly.apparent_temperature[currentIndex]),
            precip: weather.hourly.precipitation_probability[currentIndex],
            pressure: Math.round(weather.hourly.surface_pressure[currentIndex]),
            windSpeed: Math.round(weather.hourly.windspeed_10m[currentIndex]),
            windDirection: weather.hourly.winddirection_10m[currentIndex],
        };
    });
  }

  const gameStartHour = hourlyData.length > 0 ? hourlyData[0] : { windSpeed: 0, windDirection: 0 };

  return (
    <div className="mini-weather-card">
      <div className="mini-card-header">
        <h4>{awayTeam} @ {homeTeam}</h4>
        <p className="venue-name">{venue}</p>
      </div>
      
      <div className="mini-hourly-forecast">
        {hourlyData.map(hour => (
          <div key={hour.time.toISOString()} className="mini-hour-slot">
            <p className="hour-time">{hour.time.toLocaleTimeString([], { hour: 'numeric', hour12: true }).replace(' ', '')}</p>
            <p className={`temp ${getTempClass(hour.temp)}`}>{hour.temp}°</p>
            <p className={`precip ${getPrecipClass(hour.precip)}`}>{hour.precip}% 💧</p>
            <p className={`wind ${getWindSpeedClass(parkOrientation, hour.windDirection, hour.windSpeed)}`}>
              {getWindIcon(hour.windDirection)} {hour.windSpeed}mph
            </p>
          </div>
        ))}
      </div>

      <div className="mini-wind-factor">
        <div className={`wind-factor-text ${getWindFactorClass(windFactor, gameStartHour.windSpeed)}`}>
          <strong>{windFactor.text}</strong>
          <span>{windFactor.description}</span>
        </div>
        <WindDiagram 
          parkOrientation={parkOrientation}
          windDirection={gameStartHour.windDirection}
        />
      </div>
    </div>
  );
};

/**
 * MLB Weather Card Component - Displays weather for all games today
 */
const MLBWeatherCard = ({ teams }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { selectedTeam, includeMatchup, matchupTeam, shouldIncludePlayer } = useTeamFilter();

  useEffect(() => {
    const fetchGameData = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];

        // Fetch MLB Schedule for today
        const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&date=${todayString}`;
        const scheduleResponse = await fetch(scheduleUrl);
        const scheduleData = await scheduleResponse.json();

        if (scheduleData.dates.length === 0) {
            setGames([]);
            setLoading(false);
            return;
        }

        const dailyGames = scheduleData.dates[0].games;

        // Process all games concurrently to fetch their weather data
        const gamesWithWeather = await Promise.all(
          dailyGames.map(async (game) => {
            const homeTeamName = game.teams.home.team.name;
            const parkInfo = ballparkData[homeTeamName];
            
            if (!parkInfo) return null; // Skip if we don't have park data

            const isDome = ['Tropicana Field', 'Rogers Centre', 'Chase Field', 'Minute Maid Park', 
                           'American Family Field', 'Globe Life Field', 'T-Mobile Park'].includes(parkInfo.name);

            let weatherData = null;
            let windFactor = { text: 'Indoor', description: 'This is an indoor or retractable roof stadium.' };
            
            if (!isDome) {
                // Fetch weather only for open-air stadiums
                const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${parkInfo.lat}&longitude=${parkInfo.lon}&hourly=temperature_2m,apparent_temperature,precipitation_probability,surface_pressure,windspeed_10m,winddirection_10m&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch&timezone=auto`;
                const weatherResponse = await fetch(weatherUrl);
                weatherData = await weatherResponse.json();
                
                // Calculate the wind factor for the game's start time
                const gameStartHourIndex = weatherData.hourly.time.findIndex(t => new Date(t) >= new Date(game.gameDate));
                if(gameStartHourIndex !== -1) {
                    const gameTimeWindDirection = weatherData.hourly.winddirection_10m[gameStartHourIndex];
                    windFactor = getWindFactor(parkInfo.orientation, gameTimeWindDirection);
                } else {
                    windFactor = {text: 'N/A', description: 'Could not determine game time wind.'};
                }
            }

            // Return a clean object for each game
            return {
              id: game.gamePk,
              awayTeam: game.teams.away.team.name,
              homeTeam: homeTeamName,
              venue: parkInfo.name,
              gameTime: game.gameDate,
              weather: weatherData, // Will be null for domes
              windFactor: windFactor,
              parkOrientation: parkInfo.orientation,
            };
          })
        );
        
        // Filter out any games we skipped (e.g., neutral site games not in our data)
        const validGames = gamesWithWeather.filter(g => g !== null);
        setGames(validGames);
      } catch (err) {
        setError('Failed to fetch weather data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGameData();
  }, []);

  // Apply team filtering to games
  const filteredGames = React.useMemo(() => {
    if (!selectedTeam) return games;
    
    return games.filter(game => {
      const homeTeamAbbr = teams ? Object.keys(teams).find(key => 
        teams[key].name === game.homeTeam || teams[key].abbreviation === game.homeTeam
      ) : null;
      
      const awayTeamAbbr = teams ? Object.keys(teams).find(key => 
        teams[key].name === game.awayTeam || teams[key].abbreviation === game.awayTeam
      ) : null;
      
      // Check if either team should be included based on team filter
      return shouldIncludePlayer(homeTeamAbbr) || shouldIncludePlayer(awayTeamAbbr);
    });
  }, [games, selectedTeam, includeMatchup, matchupTeam, shouldIncludePlayer, teams]);

  return (
    <div className="card mlb-weather-card">
      <div className="glass-card-container">
        <div className="glass-header">
          <h3>⛅ Today's Game Weather</h3>
          <p className="card-subtitle">Weather conditions affecting today's MLB games</p>
        </div>
        
        <div className="scrollable-container">
          {loading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading weather data...</p>
            </div>
          )}
          
          {error && (
            <div className="error-state">
              <p className="error-message">{error}</p>
            </div>
          )}
          
          {!loading && !error && filteredGames.length === 0 && (
            <div className="empty-state">
              <p>{selectedTeam ? 'No games for selected team(s) today' : 'No games scheduled for today'}</p>
            </div>
          )}
          
          {!loading && !error && filteredGames.length > 0 && (
            <div className="weather-cards-scroll-container">
              {filteredGames.map(game => (
                <MiniGameWeatherCard key={game.id} game={game} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MLBWeatherCard;