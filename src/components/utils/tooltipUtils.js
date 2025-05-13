/**
 * Utility function to create a CSS-safe ID from a player name and team
 * This removes all characters that would make an invalid CSS selector
 * 
 * @param {string} name - Player name
 * @param {string} team - Team abbreviation
 * @returns {string} CSS-safe ID
 */
export const createSafeId = (name, team) => {
  // Remove all special characters and spaces, replace with underscores
  const safeName = name ? name.replace(/[^a-zA-Z0-9]/g, '_') : '';
  const safeTeam = team ? team.replace(/[^a-zA-Z0-9]/g, '_') : '';
  
  return `${safeName}_${safeTeam}`;
};

/**
 * Position a tooltip element relative to its trigger element
 * 
 * @param {string} tooltipSelector - CSS selector for the tooltip element
 * @param {string} triggerSelector - CSS selector for the trigger element
 */
export const positionTooltip = (tooltipSelector, triggerSelector) => {
  setTimeout(() => {
    const tooltipElement = document.querySelector(tooltipSelector);
    const triggerElement = document.querySelector(triggerSelector);
    
    if (tooltipElement && triggerElement) {
      const rect = triggerElement.getBoundingClientRect();
      
      // Position tooltip so it's visible without being cut off
      let topPos = rect.bottom + window.scrollY + 10;
      let leftPos = rect.left + window.scrollX;
      
      // Check if tooltip would go off the right edge of screen
      if (leftPos + tooltipElement.offsetWidth > window.innerWidth) {
        leftPos = window.innerWidth - tooltipElement.offsetWidth - 20;
      }
      
      // Check if tooltip would go off the bottom of the screen
      if (topPos + tooltipElement.offsetHeight > window.innerHeight + window.scrollY) {
        // Position above the trigger element instead
        topPos = rect.top + window.scrollY - tooltipElement.offsetHeight - 10;
      }
      
      // Apply positioning
      tooltipElement.style.top = `${topPos}px`;
      tooltipElement.style.left = `${leftPos}px`;
    }
  }, 10);
};

/**
 * Add a document-level click handler to close tooltips when clicking outside
 * 
 * @param {Function} setActiveTooltip - State setter function for the active tooltip
 * @returns {Function} Cleanup function to remove the event listener
 */
export const setupTooltipCloseHandler = (setActiveTooltip) => {
  const handleDocumentClick = (e) => {
    // Check if click was outside tooltip-related elements
    if (!e.target.closest('.tooltip-container') && 
        !e.target.closest('.batter-tooltip') && 
        !e.target.closest('.streak-tooltip') &&
        !e.target.closest('.day-hit-tooltip')) {
      setActiveTooltip(null);
    }
  };
  
  // Add event listener
  document.addEventListener('click', handleDocumentClick);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('click', handleDocumentClick);
  };
};