import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

/**
 * Navigation component for the MLB Statistics Tracker
 */
function Navigation() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Define navigation links
  const navLinks = [
    { path: '/', label: 'Dashboard' },
    { path: '/players', label: 'Players' },
    { path: '/teams', label: 'Teams' },
    { path: '/games', label: 'Games' },
    { path: '/capsheet', label: 'CapSheet' },
    { path: '/matchup-analyzer', label: 'Matchup Analyzer' } // Add the new link
  ];
  
  // Toggle mobile menu
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  // Close mobile menu
  const closeMenu = () => {
    setMenuOpen(false);
  };
  
  return (
    <nav className="main-nav">
      {/* Mobile menu button */}
      <button 
        className={`menu-toggle ${menuOpen ? 'active' : ''}`}
        onClick={toggleMenu}
        aria-label="Toggle navigation menu"
      >
        <span className="bar"></span>
        <span className="bar"></span>
        <span className="bar"></span>
      </button>
      
      {/* Navigation links */}
      <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
        {navLinks.map((link, index) => (
          <li key={index} className="nav-item">
            <Link 
              to={link.path}
              className={location.pathname === link.path ? 'active' : ''}
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      
      {/* Search input */}
      <div className="nav-search">
        <input 
          type="text"
          placeholder="Search players..."
          aria-label="Search players"
        />
        <button className="search-button" aria-label="Submit search">
          🔍
        </button>
      </div>
    </nav>
  );
}

export default Navigation;