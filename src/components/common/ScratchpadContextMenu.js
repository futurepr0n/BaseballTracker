import React, { useEffect, useRef } from 'react';
import './ScratchpadContextMenu.css';

/**
 * Context menu for scratchpad actions
 * Appears on right-click with accessible keyboard navigation
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isVisible - Whether menu is visible
 * @param {Object} props.position - Menu position {x, y}
 * @param {boolean} props.isInScratchpad - Whether player is in scratchpad
 * @param {function} props.onAddToScratchpad - Handler for adding to scratchpad
 * @param {function} props.onRemoveFromScratchpad - Handler for removing from scratchpad
 * @param {function} props.onClose - Handler for closing menu
 * @param {string} props.playerName - Player name for context
 */
const ScratchpadContextMenu = ({
  isVisible,
  position,
  isInScratchpad,
  onAddToScratchpad,
  onRemoveFromScratchpad,
  onClose,
  playerName = ''
}) => {
  const menuRef = useRef(null);

  // Handle keyboard navigation and click outside
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' || e.key === ' ') {
        // Handle enter/space on focused menu item
        const focusedElement = document.activeElement;
        if (focusedElement && focusedElement.classList.contains('context-menu-item')) {
          e.preventDefault();
          focusedElement.click();
        }
      }
    };

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('contextmenu', handleClickOutside);

    // Focus first menu item
    if (menuRef.current) {
      const firstItem = menuRef.current.querySelector('.context-menu-item');
      if (firstItem) {
        firstItem.focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [isVisible, onClose]);

  if (!isVisible) {
    return null;
  }

  const handleAction = (action) => {
    action();
    onClose();
  };

  // Adjust position to stay within viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - 100)
  };

  return (
    <div
      ref={menuRef}
      className="scratchpad-context-menu"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y
      }}
      role="menu"
      aria-label="Player actions"
    >
      {isInScratchpad ? (
        <button
          className="context-menu-item remove-item"
          onClick={() => handleAction(onRemoveFromScratchpad)}
          role="menuitem"
          tabIndex={0}
        >
          <span className="menu-icon">★</span>
          <span className="menu-text">Remove from Scratchpad</span>
        </button>
      ) : (
        <button
          className="context-menu-item add-item"
          onClick={() => handleAction(onAddToScratchpad)}
          role="menuitem"
          tabIndex={0}
        >
          <span className="menu-icon">☆</span>
          <span className="menu-text">Add to Scratchpad</span>
        </button>
      )}
      
      {/* Divider */}
      <div className="menu-divider" role="separator"></div>
      
      {/* Player info for context */}
      <div className="menu-info">
        <span className="player-name">{playerName}</span>
      </div>
    </div>
  );
};

export default ScratchpadContextMenu;