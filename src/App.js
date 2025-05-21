import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router,
  Routes,
  Route,
  Link
} from 'react-router-dom';
import PlayerStats from './components/PlayerStats';
import TeamStats from './components/TeamStats';
import GameResults from './components/GameResults';
import Dashboard from './components/Dashboard';
import CapSheet from './components/CapSheet';
import MatchupAnalyzer from './components/MatchupAnalyzer';
import Navigation from './components/Navigation';
import { TeamFilterProvider } from './components/TeamFilterContext';
import { 
  fetchPlayerData, 
  fetchTeamData, 
  fetchGameData,
  formatDateString
} from './services/dataService';

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
    <Router>
      <div className="app">
        <header className="app-header">
          <h1>
            <img
              src='data/logos/Major_League_Baseball_logo.svg'
              style={{
                height: '1.2em',
                verticalAlign: 'middle'
              }}
              alt="MLB Logo"
            />
            MLB Statistics Tracker
          </h1>
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
              
              <Route path="/players" element={<PlayerStats 
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
            </Routes>
          </TeamFilterProvider>
        </main>
        
        <footer className="app-footer">
          <p>© 2025 MLB Statistics Tracker - Data updated daily</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;