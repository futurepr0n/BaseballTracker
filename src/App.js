import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router,
  Routes,
  Route,
  Link
} from 'react-router-dom';

// Import debug control for immediate availability in console
import './utils/debugControl';
// Console quiet mode disabled for Enhanced Player Analysis debugging
// import './utils/consoleQuiet';
import PlayerStats from './components/PlayerStats';
import EnhancedPlayerAnalysis from './components/EnhancedPlayerAnalysis';
import TeamStats from './components/TeamStats';
import GameResults from './components/GameResults';
import Dashboard from './components/Dashboard';
import CapSheet from './components/CapSheet';
import MatchupAnalyzer from './components/MatchupAnalyzer';
import Navigation from './components/Navigation';
import { TeamFilterProvider } from './components/TeamFilterContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { 
  fetchPlayerData, 
  fetchTeamData, 
  fetchGameData,
  formatDateString
} from './services/dataService';

import PinheadsPlayhouse from './components/PinheadsPlayhouse/PinheadsPlayhouse';
import HRMatchupHub from './components/HRMatchupHub/HRMatchupHub';
import CSSFixesTest from './components/test/CSSFixesTest';

import './App.css';
import './styles/theme-variables.css';
import './styles/classic-mode.css';

function App() {
  const [playerData, setPlayerData] = useState([]);
  const [teamData, setTeamData] = useState({});
  const [gameData, setGameData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Format date as YYYY-MM-DD
        const dateStr = formatDateString(currentDate);
        
        // Load player data for the selected date
        const players = await fetchPlayerData(dateStr);
        setPlayerData(players);
        
        // Load team data
        const teams = await fetchTeamData();
        setTeamData(teams);
        
        // Load game data for the selected date
        const games = await fetchGameData(dateStr);
        setGameData(games);
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data. Please try again.');
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentDate]);

  const handleDateChange = (newDate) => {
    setCurrentDate(newDate);
  };

  if (loading) return <div className="loading">Loading MLB statistics...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <ThemeProvider>
      <Router>
        <div className="app">
          <header className="app-header">
           <div className="header-top-row">
              <h1>
                Capping.Pro
              </h1>
              <div className="header-controls">
                <div className="social-icons">
                  <a href="https://x.com/capping_pro" target="_blank" rel="noopener noreferrer" aria-label="Capping.Pro on X">
                    <img src="/data/logos/x_logo_icon.svg" alt="X (formerly Twitter) Logo" />
                  </a>
                  <a href="https://discord.gg/YYSWGcWnZm" target="_blank" rel="noopener noreferrer" aria-label="Capping.Pro Discord Server">
                    <img src="/data/logos/discord_icon.svg" alt="Discord Logo" />
                  </a>
                </div>
              </div>
            </div>
          <Navigation />
          
          <div className="date-selector">
            <button 
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setDate(newDate.getDate() - 1);
                handleDateChange(newDate);
              }}
            >
              Previous Day
            </button>
            
            <span className="current-date">
              {currentDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
            
            <button 
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setDate(newDate.getDate() + 1);
                handleDateChange(newDate);
              }}
            >
              Next Day
            </button>
          </div>
        </header>
        
        <main className="app-content">
          {/* Wrap routes with TeamFilterProvider to enable filtering */}
          <TeamFilterProvider teamData={teamData} gameData={gameData}>
            <Routes>
              <Route path="/" element={<Dashboard 
                playerData={playerData} 
                teamData={teamData} 
                gameData={gameData} 
                currentDate={currentDate}
              />} />
              
              <Route path="/players" element={<EnhancedPlayerAnalysis 
                currentDate={currentDate}
              />} />
              
              <Route path="/player-stats" element={<PlayerStats 
                playerData={playerData} 
                currentDate={currentDate}
              />} />
              
              <Route path="/teams" element={<TeamStats 
                teamData={teamData} 
                gameData={gameData} 
                playerData={playerData} 
                currentDate={currentDate}
              />} />
              
              <Route path="/games" element={<GameResults 
                gameData={gameData} 
                teamData={teamData} 
                currentDate={currentDate}
              />} />
              
              <Route path="/capsheet" element={<CapSheet 
                playerData={playerData} 
                gameData={gameData} 
                currentDate={currentDate}
              />} />
              
              <Route path="/matchup-analyzer" element={<MatchupAnalyzer 
                playerData={playerData} 
                gameData={gameData} 
                teamData={teamData}
                currentDate={currentDate}
              />} />

              <Route path="/pinheads-playhouse" element={<PinheadsPlayhouse 
                  playerData={playerData} 
                  teamData={teamData} 
                  gameData={gameData} 
                  currentDate={currentDate}
                />} />

              <Route path="/hr-matchups" element={<HRMatchupHub 
                  playerData={playerData} 
                  teamData={teamData} 
                  gameData={gameData} 
                  currentDate={currentDate}
                />} />

              <Route path="/css-test" element={<CSSFixesTest />} />

            </Routes>
          </TeamFilterProvider>
        </main>
        
        <footer className="app-footer">
          <p>© 2025 Capping.Pro - MLB Stat Tracker Dashboard - Data updated daily - Absolutely and totally unafiliated with MLB and or any Team or Organization.</p>
        </footer>
      </div>
    </Router>
    </ThemeProvider>
  );
}

export default App;