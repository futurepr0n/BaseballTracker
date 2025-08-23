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
  const [colorMode, setColorMode] = useState('light'); // 'light' or 'dark'
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('baseball-tracker-theme');
      const savedColorMode = localStorage.getItem('baseball-tracker-color-mode');
      
      if (savedTheme && (savedTheme === 'glass' || savedTheme === 'classic')) {
        setThemeMode(savedTheme);
      }
      
      if (savedColorMode && (savedColorMode === 'light' || savedColorMode === 'dark')) {
        setColorMode(savedColorMode);
      }
    } catch (error) {
      console.warn('Failed to load theme preferences from localStorage:', error);
    }
  }, []);

  // Save preferences to localStorage and apply classes to body
  useEffect(() => {
    try {
      // Remove any existing theme classes from body
      document.body.classList.remove('theme-glass', 'theme-classic', 'color-light', 'color-dark');
      
      // Apply current theme and color mode classes to body
      document.body.classList.add(`theme-${themeMode}`, `color-${colorMode}`);
      
      // Save to localStorage
      localStorage.setItem('baseball-tracker-theme', themeMode);
      localStorage.setItem('baseball-tracker-color-mode', colorMode);
      
      console.log(`[ThemeContext] Applied: theme-${themeMode} color-${colorMode}`);
    } catch (error) {
      console.warn('Failed to save theme preferences to localStorage:', error);
    }
  }, [themeMode, colorMode]);

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

  const toggleColorMode = () => {
    setIsTransitioning(true);
    const newColorMode = colorMode === 'light' ? 'dark' : 'light';
    
    setTimeout(() => {
      setColorMode(newColorMode);
      setIsTransitioning(false);
    }, 100);
  };

  const setColorModeExplicit = (mode) => {
    if (mode === 'light' || mode === 'dark') {
      setIsTransitioning(true);
      setTimeout(() => {
        setColorMode(mode);
        setIsTransitioning(false);
      }, 100);
    }
  };

  const isGlassMode = themeMode === 'glass';
  const isClassicMode = themeMode === 'classic';
  const isLightMode = colorMode === 'light';
  const isDarkMode = colorMode === 'dark';

  // CSS class helpers for components
  const getThemeClass = (baseClass = '') => {
    return `${baseClass} theme-${themeMode} color-${colorMode}`.trim();
  };

  const getCardClass = (baseClass = 'card') => {
    const themeClass = isGlassMode ? `${baseClass} glass-card` : `${baseClass} classic-card`;
    return `${themeClass} color-${colorMode}`;
  };

  const value = {
    // Theme state
    themeMode,
    isGlassMode,
    isClassicMode,
    
    // Color mode state
    colorMode,
    isLightMode,
    isDarkMode,
    
    // Transition state
    isTransitioning,
    
    // Theme functions
    toggleTheme,
    setTheme,
    
    // Color mode functions
    toggleColorMode,
    setColorMode: setColorModeExplicit,
    
    // Helper functions
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