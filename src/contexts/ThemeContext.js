import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState('glass'); // 'glass' or 'classic'
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Load theme preference from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('baseball-tracker-theme');
      if (savedTheme && (savedTheme === 'glass' || savedTheme === 'classic')) {
        setThemeMode(savedTheme);
      }
    } catch (error) {
      console.warn('Failed to load theme preference from localStorage:', error);
    }
  }, []);

  // Save theme preference to localStorage (but don't apply globally)
  useEffect(() => {
    try {
      // Remove any existing global theme classes from body
      document.body.classList.remove('theme-glass', 'theme-classic');
      
      // Save to localStorage
      localStorage.setItem('baseball-tracker-theme', themeMode);
      
      console.log(`[ThemeContext] Saved theme preference: ${themeMode}`);
    } catch (error) {
      console.warn('Failed to save theme preference to localStorage:', error);
    }
  }, [themeMode]);

  const toggleTheme = () => {
    setIsTransitioning(true);
    const newTheme = themeMode === 'glass' ? 'classic' : 'glass';
    
    // Small delay to show transition state
    setTimeout(() => {
      setThemeMode(newTheme);
      setIsTransitioning(false);
    }, 100);
  };

  const setTheme = (theme) => {
    if (theme === 'glass' || theme === 'classic') {
      setIsTransitioning(true);
      setTimeout(() => {
        setThemeMode(theme);
        setIsTransitioning(false);
      }, 100);
    }
  };

  const isGlassMode = themeMode === 'glass';
  const isClassicMode = themeMode === 'classic';

  // CSS class helpers for components
  const getThemeClass = (baseClass = '') => {
    return `${baseClass} theme-${themeMode}`.trim();
  };

  const getCardClass = (baseClass = 'card') => {
    return isGlassMode ? `${baseClass} glass-card` : `${baseClass} classic-card`;
  };

  const value = {
    themeMode,
    isGlassMode,
    isClassicMode,
    isTransitioning,
    toggleTheme,
    setTheme,
    getThemeClass,
    getCardClass
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;