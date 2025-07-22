// useCollapsibleCard.js - Custom hook for collapsible card functionality
import { useState, useCallback } from 'react';

/**
 * Custom hook for managing collapsible card state
 * @param {string} cardId - Unique identifier for the card
 * @param {boolean} defaultCollapsed - Whether the card starts collapsed (default: false)
 * @returns {object} - { isCollapsed, toggleCollapsed, setCollapsed }
 */
export const useCollapsibleCard = (cardId, defaultCollapsed = false) => {
  // Use localStorage to persist card states
  const getStoredState = () => {
    try {
      const stored = localStorage.getItem(`card-collapsed-${cardId}`);
      return stored ? JSON.parse(stored) : defaultCollapsed;
    } catch (error) {
      console.warn(`Failed to load collapsed state for card ${cardId}:`, error);
      return defaultCollapsed;
    }
  };

  const [isCollapsed, setIsCollapsed] = useState(getStoredState);

  const setCollapsed = useCallback((collapsed) => {
    setIsCollapsed(collapsed);
    try {
      localStorage.setItem(`card-collapsed-${cardId}`, JSON.stringify(collapsed));
    } catch (error) {
      console.warn(`Failed to save collapsed state for card ${cardId}:`, error);
    }
  }, [cardId]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(!isCollapsed);
  }, [isCollapsed, setCollapsed]);

  return {
    isCollapsed,
    toggleCollapsed,
    setCollapsed
  };
};

/**
 * Component for rendering a collapsible header with toggle button
 * @param {object} props
 * @param {React.ReactNode} props.children - Header content
 * @param {boolean} props.isCollapsed - Whether the content is collapsed
 * @param {function} props.onToggle - Function to call when toggle is clicked
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element}
 */
export const CollapsibleHeader = ({ children, isCollapsed, onToggle, className = '', ...props }) => {
  return (
    <div className={`collapsible-header ${className}`} {...props}>
      <div className="header-content">
        {children}
      </div>
      <button 
        className="collapse-toggle-btn"
        onClick={onToggle}
        aria-label={isCollapsed ? 'Expand card' : 'Collapse card'}
        aria-expanded={!isCollapsed}
      >
        <svg 
          className={`chevron-icon ${isCollapsed ? 'collapsed' : 'expanded'}`}
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>
      </button>
    </div>
  );
};

/**
 * Wrapper component for collapsible content with smooth transitions
 * @param {object} props
 * @param {React.ReactNode} props.children - Content to show/hide
 * @param {boolean} props.isCollapsed - Whether the content is collapsed
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element}
 */
export const CollapsibleContent = ({ children, isCollapsed, className = '', ...props }) => {
  return (
    <div 
      className={`collapsible-content ${isCollapsed ? 'collapsed' : 'expanded'} ${className}`}
      aria-hidden={isCollapsed}
      {...props}
    >
      <div className="content-wrapper">
        {children}
      </div>
    </div>
  );
};

export default useCollapsibleCard;