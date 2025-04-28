import React, { useState, useEffect } from 'react';
import { fetchTeamData } from '../services/dataService';
import './PlayerStats.css';

/**
 * PlayerStats component displays player statistics in a sortable, filterable table
 * Now supports both hitters and pitchers
 */
function PlayerStats({ playerData, currentDate }) {
  const [sortedData, setSortedData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [filter, setFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [teams, setTeams] = useState({});
  const [playerTypeFilter, setPlayerTypeFilter] = useState('hitters'); // 'hitters' or 'pitchers'
  
  // Load team data for colors and filtering
  useEffect(() => {
    const loadTeamData = async () => {
      const teamData = await fetchTeamData();
      setTeams(teamData);
    };
    
    loadTeamData();
  }, []);
  
  // Apply sorting and filtering to player data
  useEffect(() => {
    let filteredData = [...playerData];
    
    // Apply player type filter (hitters or pitchers)
    if (playerTypeFilter === 'hitters') {
      filteredData = filteredData.filter(player => 
        player.playerType === 'hitter' || !player.playerType);
    } else if (playerTypeFilter === 'pitchers') {
      filteredData = filteredData.filter(player => 
        player.playerType === 'pitcher');
    }
    
    // Apply team filter
    if (teamFilter !== 'all') {
      filteredData = filteredData.filter(player => player.team === teamFilter);
    }
    
    // Apply name/text filter
    if (filter) {
      filteredData = filteredData.filter(player => 
        player.name.toLowerCase().includes(filter.toLowerCase()) ||
        (player.team && player.team.toLowerCase().includes(filter.toLowerCase()))
      );
    }
    
    // Apply sorting
    const sortableData = [...filteredData];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        // Handle fields that might have DNP values
        const isDNPField = ['AB', 'H', 'R', 'HR', 'IP', 'ER', 'K'].includes(sortConfig.key);
        
        if (isDNPField) {
          const aValue = a[sortConfig.key] === 'DNP' ? -1 : (a[sortConfig.key] || 0);
          const bValue = b[sortConfig.key] === 'DNP' ? -1 : (b[sortConfig.key] || 0);
          
          if (sortConfig.direction === 'ascending') {
            return aValue - bValue;
          } else {
            return bValue - aValue;
          }
        } 
        // Handle string fields
        else {
          const aValue = a[sortConfig.key] || '';
          const bValue = b[sortConfig.key] || '';
          
          if (sortConfig.direction === 'ascending') {
            return aValue.localeCompare(bValue);
          } else {
            return bValue.localeCompare(aValue);
          }
        }
      });
    }
    
    setSortedData(sortableData);
  }, [playerData, sortConfig, filter, teamFilter, playerTypeFilter]);
  
  // Handle sort request
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  // Format date for display
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Get team list for filter dropdown
  const teamList = Array.from(new Set(playerData.map(player => player.team))).filter(Boolean);

  // Calculate summary statistics based on player type
  const calculateSummary = () => {
    if (playerTypeFilter === 'hitters') {
      return {
        totalPlayers: sortedData.length,
        homeRuns: sortedData.reduce((sum, player) => 
          sum + (player.HR === 'DNP' ? 0 : (Number(player.HR) || 0)), 0),
        totalHits: sortedData.reduce((sum, player) => 
          sum + (player.H === 'DNP' ? 0 : (Number(player.H) || 0)), 0),
        totalRuns: sortedData.reduce((sum, player) => 
          sum + (player.R === 'DNP' ? 0 : (Number(player.R) || 0)), 0)
      };
    } else {
      return {
        totalPlayers: sortedData.length,
        totalIP: sortedData.reduce((sum, player) => 
          sum + (player.IP === 'DNP' ? 0 : (Number(player.IP) || 0)), 0).toFixed(1),
        totalK: sortedData.reduce((sum, player) => 
          sum + (player.K === 'DNP' ? 0 : (Number(player.K) || 0)), 0),
        totalER: sortedData.reduce((sum, player) => 
          sum + (player.ER === 'DNP' ? 0 : (Number(player.ER) || 0)), 0)
      };
    }
  };
  
  const summary = calculateSummary();
  
  return (
    <div className="player-stats">
      <h2>Player Statistics - {formattedDate}</h2>
      
      <div className="player-type-toggle">
        <button 
          className={playerTypeFilter === 'hitters' ? 'active' : ''} 
          onClick={() => setPlayerTypeFilter('hitters')}
        >
          Hitting Stats
        </button>
        <button 
          className={playerTypeFilter === 'pitchers' ? 'active' : ''} 
          onClick={() => setPlayerTypeFilter('pitchers')}
        >
          Pitching Stats
        </button>
      </div>
      
      <div className="filters">
        <div className="search-filter">
          <input
            type="text"
            placeholder="Search by player name..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        
        <div className="team-filter">
          <label>Filter by team:</label>
          <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
            <option value="all">All Teams</option>
            {teamList.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="table-container">
        {playerTypeFilter === 'hitters' ? (
          // Hitting Stats Table
          <table className="stats-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('name')}>
                  Player {sortConfig.key === 'name' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('team')}>
                  Team {sortConfig.key === 'team' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('AB')}>
                  AB {sortConfig.key === 'AB' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('H')}>
                  H {sortConfig.key === 'H' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('R')}>
                  R {sortConfig.key === 'R' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('HR')}>
                  HR {sortConfig.key === 'HR' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('RBI')}>
                  RBI {sortConfig.key === 'RBI' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('BB')}>
                  BB {sortConfig.key === 'BB' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('K')}>
                  K {sortConfig.key === 'K' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('AVG')}>
                  AVG {sortConfig.key === 'AVG' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((player, index) => {
                // Get team colors for styling
                const teamColors = teams[player.team] ? {
                  backgroundColor: `${teams[player.team].primaryColor}10`,
                  borderLeft: `4px solid ${teams[player.team].primaryColor}`
                } : {};
                
                return (
                  <tr key={index} style={teamColors}>
                    <td className="player-name">{player.name}</td>
                    <td>{player.team}</td>
                    <td>{player.AB}</td>
                    <td>{player.H}</td>
                    <td>{player.R}</td>
                    <td>{player.HR}</td>
                    <td>{player.RBI}</td>
                    <td>{player.BB}</td>
                    <td>{player.K}</td>
                    <td>{player.AVG}</td>
                  </tr>
                );
              })}
              
              {sortedData.length === 0 && (
                <tr>
                  <td colSpan="10" className="no-data">No hitting data available for this date</td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          // Pitching Stats Table
          <table className="stats-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('name')}>
                  Player {sortConfig.key === 'name' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('team')}>
                  Team {sortConfig.key === 'team' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('IP')}>
                  IP {sortConfig.key === 'IP' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('H')}>
                  H {sortConfig.key === 'H' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('R')}>
                  R {sortConfig.key === 'R' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('ER')}>
                  ER {sortConfig.key === 'ER' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('BB')}>
                  BB {sortConfig.key === 'BB' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('K')}>
                  K {sortConfig.key === 'K' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('HR')}>
                  HR {sortConfig.key === 'HR' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestSort('ERA')}>
                  ERA {sortConfig.key === 'ERA' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((player, index) => {
                // Get team colors for styling
                const teamColors = teams[player.team] ? {
                  backgroundColor: `${teams[player.team].primaryColor}10`,
                  borderLeft: `4px solid ${teams[player.team].primaryColor}`
                } : {};
                
                return (
                  <tr key={index} style={teamColors}>
                    <td className="player-name">{player.name}</td>
                    <td>{player.team}</td>
                    <td>{player.IP}</td>
                    <td>{player.H}</td>
                    <td>{player.R}</td>
                    <td>{player.ER}</td>
                    <td>{player.BB}</td>
                    <td>{player.K}</td>
                    <td>{player.HR}</td>
                    <td>{player.ERA}</td>
                  </tr>
                );
              })}
              
              {sortedData.length === 0 && (
                <tr>
                  <td colSpan="10" className="no-data">No pitching data available for this date</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      
      <div className="stats-summary">
        <h3>Summary</h3>
        {playerTypeFilter === 'hitters' ? (
          <ul>
            <li>Total Players: {summary.totalPlayers}</li>
            <li>Home Runs: {summary.homeRuns}</li>
            <li>Total Hits: {summary.totalHits}</li>
            <li>Total Runs: {summary.totalRuns}</li>
          </ul>
        ) : (
          <ul>
            <li>Total Pitchers: {summary.totalPlayers}</li>
            <li>Innings Pitched: {summary.totalIP}</li>
            <li>Total Strikeouts: {summary.totalK}</li>
            <li>Earned Runs: {summary.totalER}</li>
          </ul>
        )}
      </div>
    </div>
  );
}

export default PlayerStats;