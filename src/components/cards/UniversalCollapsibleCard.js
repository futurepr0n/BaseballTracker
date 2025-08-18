// UniversalCollapsibleCard.js - Universal wrapper to make any dashboard card collapsible
import React from 'react';
import { useCollapsibleCard, CollapsibleContent } from '../../hooks/useCollapsibleCard';
import './UniversalCollapsibleCard.css';

/**
 * Universal wrapper component that makes any dashboard card collapsible
 * Integrates with existing glass-header pattern while adding collapse functionality
 * 
 * @param {object} props
 * @param {React.ReactNode} props.children - The card content to wrap
 * @param {string} props.cardId - Unique identifier for localStorage persistence
 * @param {string} props.title - Card title for the header
 * @param {React.ReactNode} props.headerContent - Optional additional header content (filters, controls, etc.)
 * @param {string} props.cardClassName - CSS class for the card container 
 * @param {string} props.headerClassName - CSS class for the header
 * @param {boolean} props.defaultCollapsed - Whether card starts collapsed (default: false)
 * @param {boolean} props.disableCollapse - Disable collapse functionality (default: false)
 * @returns {JSX.Element}
 */
const UniversalCollapsibleCard = ({
  children,
  cardId,
  title,
  headerContent,
  cardClassName = '',
  headerClassName = '',
  defaultCollapsed = false,
  disableCollapse = false,
  ...props
}) => {
  const { isCollapsed, toggleCollapsed } = useCollapsibleCard(cardId, defaultCollapsed);

  // If collapse is disabled, render without collapsible functionality
  if (disableCollapse) {
    return (
      <div className={`card ${cardClassName}`} {...props}>
        {children}
      </div>
    );
  }

  return (
    <div className={`card collapsible-card ${cardClassName} ${isCollapsed ? 'collapsed' : 'expanded'}`} {...props}>
      <div className="glass-card-container">
        {/* Enhanced glass header with click-to-collapse functionality */}
        <div 
          className={`glass-header collapsible-header ${headerClassName}`}
          onClick={toggleCollapsed}
          role="button"
          tabIndex={0}
          aria-expanded={!isCollapsed}
          aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${title} card`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleCollapsed();
            }
          }}
        >
          <div className="header-content">
            <h3>{title}</h3>
            {headerContent && (
              <div className="header-additional-content" onClick={(e) => e.stopPropagation()}>
                {headerContent}
              </div>
            )}
          </div>
        </div>

        {/* Collapsible content wrapper */}
        <CollapsibleContent 
          isCollapsed={isCollapsed}
          className="card-content-wrapper"
        >
          {children}
        </CollapsibleContent>
      </div>
    </div>
  );
};

export default UniversalCollapsibleCard;