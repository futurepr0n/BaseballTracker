import React from 'react';
import './GlassCard.css';

/**
 * GlassCard - A reusable component that applies glass effect styling
 * Inspired by the HR Matchups page glass-like transparency effects
 */
const GlassCard = ({ 
  children, 
  className = '', 
  variant = 'default', // 'default', 'dark', 'featured'
  animate = true,
  ...props 
}) => {
  const getCardClasses = () => {
    let classes = 'glass-card';
    
    // Add variant classes
    if (variant === 'dark') {
      classes += ' dark-theme';
    } else if (variant === 'featured') {
      classes += ' featured';
    }
    
    // Add animation class
    if (animate) {
      classes += ' glass-fade-in';
    }
    
    // Add any additional classes
    if (className) {
      classes += ` ${className}`;
    }
    
    return classes;
  };

  return (
    <div className={getCardClasses()} {...props}>
      {children}
    </div>
  );
};

/**
 * GlassScrollableContainer - For scrollable content within glass cards
 */
export const GlassScrollableContainer = ({ children, className = '', ...props }) => {
  return (
    <div className={`glass-scrollable ${className}`} {...props}>
      {children}
    </div>
  );
};

/**
 * GlassPlayerItem - For individual player items with glass effect
 */
export const GlassPlayerItem = ({ children, className = '', ...props }) => {
  return (
    <div className={`glass-player-item ${className}`} {...props}>
      {children}
    </div>
  );
};

/**
 * GlassStickyHeader - For sticky headers in scrollable containers
 */
export const GlassStickyHeader = ({ children, className = '', ...props }) => {
  return (
    <div className={`sticky-header ${className}`} {...props}>
      {children}
    </div>
  );
};

export default GlassCard;