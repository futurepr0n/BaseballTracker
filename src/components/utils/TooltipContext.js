/**
 * Global Tooltip Context
 * Manages single tooltip state across all dashboard cards
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const TooltipContext = createContext();

export const useTooltip = () => {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error('useTooltip must be used within a TooltipProvider');
  }
  return context;
};

export const TooltipProvider = ({ children }) => {
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipData, setTooltipData] = useState(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleDocumentClick = (e) => {
      // Don't close if clicking on a tooltip or its trigger
      const isTooltipClick = e.target.closest('.tooltip-container') || 
                             e.target.closest('.global-tooltip') ||
                             e.target.closest('[data-tooltip-id]') ||
                             e.target.closest('.tooltip-trigger');
      
      if (!isTooltipClick) {
        setActiveTooltip(null);
        setTooltipData(null);
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Close tooltip on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setActiveTooltip(null);
        setTooltipData(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const openTooltip = useCallback((tooltipId, triggerElement, data = null) => {
    if (activeTooltip === tooltipId) {
      // Close if same tooltip
      setActiveTooltip(null);
      setTooltipData(null);
      return;
    }

    // Calculate position based on trigger element
    if (triggerElement) {
      const rect = triggerElement.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      setTooltipPosition({
        x: rect.left + scrollLeft + (rect.width / 2),
        y: rect.bottom + scrollTop + 10
      });
    }

    setActiveTooltip(tooltipId);
    setTooltipData(data);
  }, [activeTooltip]);

  const closeTooltip = useCallback(() => {
    setActiveTooltip(null);
    setTooltipData(null);
  }, []);

  const value = {
    activeTooltip,
    tooltipPosition,
    tooltipData,
    openTooltip,
    closeTooltip,
    isOpen: (tooltipId) => activeTooltip === tooltipId
  };

  return (
    <TooltipContext.Provider value={value}>
      {children}
    </TooltipContext.Provider>
  );
};