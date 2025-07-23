import React from 'react';
import { usePlayerScratchpad } from '../../contexts/PlayerScratchpadContext';
import './SimpleDesktopScratchpadIcon.css';

/**
 * Simple, always-visible scratchpad icon for desktop players
 * Based on existing scratchpad-indicator pattern
 * No hover effects - just a clean, clickable icon
 * 
 * @param {Object} props - Component props
 * @param {Object} props.player - Player data object with name, team, etc.
 * @param {string} props.className - Additional CSS classes
 */
const SimpleDesktopScratchpadIcon = React.memo(({ 
  player, 
  className = '' 
}) => {
  const { togglePlayer, isPlayerInScratchpad } = usePlayerScratchpad();
  
  // Determine if player is in scratchpad
  const isInScratchpad = isPlayerInScratchpad(player);
  
  // Handle icon click - toggle scratchpad status
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Use optimized toggle function
    const playerData = {
      name: player.name,
      fullName: player.fullName || player.name,
      team: player.team,
      playerType: player.playerType || (player.IP !== undefined ? 'pitcher' : 'hitter'),
      source: 'simple-icon'
    };
    
    togglePlayer(playerData);
  };

  // Build CSS classes
  const iconClasses = [
    'simple-scratchpad-icon',
    isInScratchpad ? 'in-scratchpad' : 'not-in-scratchpad',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={iconClasses}
      onClick={handleClick}
      title={isInScratchpad ? 'Remove from scratchpad' : 'Add to scratchpad'}
      aria-label={isInScratchpad ? `Remove ${player.name} from scratchpad` : `Add ${player.name} to scratchpad`}
    >
      <span className="icon-symbol">
        {isInScratchpad ? '★' : '☆'}
      </span>
    </button>
  );
});

export default SimpleDesktopScratchpadIcon;