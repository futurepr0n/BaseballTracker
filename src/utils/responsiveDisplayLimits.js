/**
 * Responsive Display Limits Utility
 * Provides dynamic display limits based on screen size and filtering state
 * Ensures desktop users see more content while preserving mobile experience
 */

import React from 'react';

/**
 * Get the current screen size category
 * @returns {string} Screen size category: 'mobile', 'tablet', 'desktop', 'large'
 */
export const getScreenSizeCategory = () => {
  if (typeof window === 'undefined') return 'desktop'; // SSR fallback
  
  const width = window.innerWidth;
  
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';  
  if (width < 1440) return 'desktop';
  return 'large';
};

/**
 * Get responsive display limit for dashboard cards
 * @param {Object} options Configuration options
 * @param {boolean} options.hasTeamFilter Whether team filtering is active
 * @param {boolean} options.hasMatchupFilter Whether matchup filtering is active  
 * @param {string} options.cardType Type of card (affects baseline limits)
 * @returns {number} Number of items to display
 */
export const getResponsiveDisplayLimit = (options = {}) => {
  const {
    hasTeamFilter = false,
    hasMatchupFilter = false,
    cardType = 'standard' // 'standard', 'compact', 'detailed'
  } = options;
  
  const screenSize = getScreenSizeCategory();
  
  // Base limits by card type
  const baseLimits = {
    compact: { mobile: 8, tablet: 12, desktop: 15, large: 20 },
    standard: { mobile: 15, tablet: 25, desktop: 40, large: 60 },
    detailed: { mobile: 10, tablet: 20, desktop: 30, large: 45 }
  };
  
  const limits = baseLimits[cardType] || baseLimits.standard;
  let displayLimit = limits[screenSize];
  
  // Apply filtering bonuses
  if (hasTeamFilter) {
    displayLimit = Math.floor(displayLimit * 1.5); // 50% increase for team filtering
  }
  
  if (hasMatchupFilter) {
    displayLimit = Math.floor(displayLimit * 1.25); // 25% increase for matchup filtering
  }
  
  return displayLimit;
};

/**
 * Get responsive CSS max-height for scrollable containers
 * @param {string} cardType Type of card affecting height needs
 * @returns {string} CSS max-height value
 */
export const getResponsiveMaxHeight = (cardType = 'standard') => {
  const screenSize = getScreenSizeCategory();
  
  const heights = {
    compact: { mobile: '300px', tablet: '400px', desktop: '500px', large: '600px' },
    standard: { mobile: '400px', tablet: '500px', desktop: '700px', large: '800px' },
    detailed: { mobile: '500px', tablet: '600px', desktop: '800px', large: '1000px' }
  };
  
  const cardHeights = heights[cardType] || heights.standard;
  return cardHeights[screenSize];
};

/**
 * Check if current screen is desktop or larger
 * @returns {boolean} True if desktop or larger screen
 */
export const isDesktopOrLarger = () => {
  const screenSize = getScreenSizeCategory();
  return screenSize === 'desktop' || screenSize === 'large';
};

/**
 * Hook for responsive display limits that updates on window resize
 * @param {Object} options Configuration options
 * @returns {Object} Object with displayLimit and maxHeight
 */
export const useResponsiveDisplayLimits = (options = {}) => {
  const [limits, setLimits] = React.useState(() => ({
    displayLimit: getResponsiveDisplayLimit(options),
    maxHeight: getResponsiveMaxHeight(options.cardType),
    isDesktop: isDesktopOrLarger()
  }));
  
  React.useEffect(() => {
    const updateLimits = () => {
      setLimits({
        displayLimit: getResponsiveDisplayLimit(options),
        maxHeight: getResponsiveMaxHeight(options.cardType),
        isDesktop: isDesktopOrLarger()
      });
    };
    
    // Update on window resize with debouncing
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateLimits, 250);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [options.hasTeamFilter, options.hasMatchupFilter, options.cardType]);
  
  return limits;
};

// Legacy compatibility - gradually migrate cards to use the above functions
export const DESKTOP_DISPLAY_LIMITS = {
  GLOBAL_STANDARD: 40,
  GLOBAL_COMPACT: 15, 
  TEAM_FILTERED: 75,
  MATCHUP_FILTERED: 60,
  LARGE_SCREEN_BONUS: 20
};

export const MOBILE_DISPLAY_LIMITS = {
  GLOBAL_STANDARD: 15,
  GLOBAL_COMPACT: 8,
  TEAM_FILTERED: 25,
  MATCHUP_FILTERED: 20
};