/**
 * Enhanced tooltip utilities for MLB dashboard
 * Now uses global tooltip system to prevent multiple tooltips and z-index issues
 */

// Create a safe ID from player name and team
export const createSafeId = (name, team) => {
  if (!name) return 'unknown';
  return `${name.replace(/[^a-zA-Z0-9]/g, '_')}_${team?.replace(/[^a-zA-Z0-9]/g, '_') || 'team'}`;
};

// This utility file now focuses on helper functions
// For tooltip state management, import useTooltip directly from './TooltipContext'

// Position the tooltip relative to its trigger element
// Returns the positioned element for chaining
export const positionTooltip = (tooltipSelector, triggerSelector) => {
  const tooltipElement = document.querySelector(tooltipSelector);
  const triggerElement = document.querySelector(triggerSelector);
  
  if (!tooltipElement || !triggerElement) return null;
  
  // Get positions and dimensions
  const triggerRect = triggerElement.getBoundingClientRect();
  const tooltipRect = tooltipElement.getBoundingClientRect();
  
  // Get viewport dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Default positioning (below and to the right of trigger)
  let top = triggerRect.bottom + 10; // 10px gap
  let left = triggerRect.left;
  
  // Check if tooltip would go off the right edge
  if (left + tooltipRect.width > viewportWidth - 20) {
    left = viewportWidth - tooltipRect.width - 20;
  }
  
  // Check if tooltip would go off the left edge
  if (left < 20) {
    left = 20;
  }
  
  // Check if tooltip would go off the bottom edge
  if (top + tooltipRect.height > viewportHeight - 20) {
    // Position above the trigger instead
    top = triggerRect.top - tooltipRect.height - 10;
    
    // If still off-screen, position at a fixed distance from top
    if (top < 20) {
      top = Math.min(viewportHeight - tooltipRect.height - 20, triggerRect.top + 40);
    }
  }
  
  // Apply the positioning
  tooltipElement.style.top = `${top}px`;
  tooltipElement.style.left = `${left}px`;
  
  // Store original trigger for reference
  tooltipElement.dataset.triggerSelector = triggerSelector;
  
  // Return the tooltipElement for chaining
  return tooltipElement;
};

// Set up hover and click handlers for tooltips
// This improves the tooltip behavior by keeping it open when hovered
export const setupTooltipBehavior = (tooltipSelector) => {
  const tooltipElement = document.querySelector(tooltipSelector);
  if (!tooltipElement) return;
  
  // Add hover behavior to keep tooltip open when hovered
  tooltipElement.addEventListener('mouseenter', () => {
    tooltipElement.dataset.hovered = 'true';
  });
  
  tooltipElement.addEventListener('mouseleave', () => {
    tooltipElement.dataset.hovered = 'false';
  });
  
  return tooltipElement;
};

// Setup document-level click handler to close tooltips when clicking outside
// Modified to fix flickering issue
export const setupTooltipCloseHandler = (setActiveTooltipCallback) => {
  let isTooltipBeingProcessed = false; // Flag to prevent rapid toggling
  
  const handleDocumentClick = (e) => {
    // Skip if we're currently processing a tooltip event
    if (isTooltipBeingProcessed) return;
    
    // Don't close if clicking on a tooltip or its trigger
    const isTooltipClick = e.target.closest('.tooltip-container') || 
                           e.target.closest('.streak-tooltip') ||
                           e.target.closest('.batter-tooltip') || 
                           e.target.closest('.day-hit-tooltip');
    
    // Don't close if clicking on trigger elements
    const isTriggerClick = e.target.dataset.tooltipId || 
                           e.target.closest('[data-tooltip-id]');
    
    if (!isTooltipClick && !isTriggerClick) {
      // Check if any tooltip is currently being hovered
      const hoveredTooltips = document.querySelectorAll('[data-hovered="true"]');
      
      // Only close tooltips if none are being hovered
      if (hoveredTooltips.length === 0) {
        // Set flag, execute, then unset flag
        isTooltipBeingProcessed = true;
        setActiveTooltipCallback(null);
        setTimeout(() => { isTooltipBeingProcessed = false; }, 100);
      }
    }
  };
  
  // Modified dashboard click outside handler
  const handleDashboardClickOutside = () => {
    // Skip if we're currently processing a tooltip event
    if (isTooltipBeingProcessed) return;
    
    // Check if any tooltip is currently being hovered
    const hoveredTooltips = document.querySelectorAll('[data-hovered="true"]');
    
    // Only close tooltips if none are being hovered
    if (hoveredTooltips.length === 0) {
      // Set flag, execute, then unset flag
      isTooltipBeingProcessed = true;
      setActiveTooltipCallback(null);
      setTimeout(() => { isTooltipBeingProcessed = false; }, 100);
    }
  };
  
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('dashboard-click-outside', handleDashboardClickOutside);
  
  // Cleanup function
  return () => {
    document.removeEventListener('click', handleDocumentClick);
    document.removeEventListener('dashboard-click-outside', handleDashboardClickOutside);
  };
};

// Enhanced tooltip toggle function with flickering prevention
export const enhancedToggleTooltip = (player, type, activeTooltip, setActiveTooltip) => {
  const safeId = createSafeId(player.name, player.team);
  const tooltipKey = `${type}_${safeId}`;
  
  // Add a small delay to prevent rapid toggling
  if (activeTooltip === tooltipKey) {
    // No delay for closing
    setActiveTooltip(null);
  } else {
    // Close any existing tooltip
    if (activeTooltip) {
      cleanupTooltip(`.tooltip-${activeTooltip}`);
    }
    
    setActiveTooltip(tooltipKey);
    
    // Use setTimeout to ensure the tooltip is rendered before positioning
    setTimeout(() => {
      const tooltipElement = positionTooltip(
        `.tooltip-${tooltipKey}`, 
        `[data-tooltip-id="${tooltipKey}"]`
      );
      
      if (tooltipElement) {
        setupTooltipBehavior(`.tooltip-${tooltipKey}`);
        adjustTooltipForDevice(`.tooltip-${tooltipKey}`);
      }
    }, 50); // Slightly longer delay for more stability
  }
};

// Function to determine if we're on a mobile device
export const isMobileDevice = () => {
  return window.innerWidth < 768 || 
         /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Function to adjust tooltip style for mobile vs desktop
export const adjustTooltipForDevice = (tooltipSelector) => {
  const tooltipElement = document.querySelector(tooltipSelector);
  if (!tooltipElement) return;
  
  const isMobile = isMobileDevice();
  
  if (isMobile) {
    // For mobile: center the tooltip and make it larger
    tooltipElement.style.left = '50%';
    tooltipElement.style.top = '50%';
    tooltipElement.style.transform = 'translate(-50%, -50%)';
    tooltipElement.style.maxWidth = '90vw';
    tooltipElement.style.width = '320px';
    tooltipElement.style.maxHeight = '70vh';
    
    // Add a semi-transparent backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'tooltip-backdrop';
    backdrop.style.position = 'fixed';
    backdrop.style.top = '0';
    backdrop.style.left = '0';
    backdrop.style.right = '0';
    backdrop.style.bottom = '0';
    backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    backdrop.style.zIndex = '1400';
    
    // Insert the backdrop before the tooltip
    document.body.insertBefore(backdrop, tooltipElement);
    
    // Store reference for cleanup
    tooltipElement.dataset.hasBackdrop = 'true';
  }
  
  return tooltipElement;
};

// Function to clean up tooltips (remove backdrops, etc.)
export const cleanupTooltip = (tooltipSelector) => {
  const tooltipElement = document.querySelector(tooltipSelector);
  if (!tooltipElement) return;
  
  // Remove backdrop if present
  if (tooltipElement.dataset.hasBackdrop === 'true') {
    const backdrop = document.querySelector('.tooltip-backdrop');
    if (backdrop) {
      backdrop.remove();
    }
  }
};