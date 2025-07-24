import { useCallback, useRef, useState, useEffect } from 'react';

/**
 * Custom hook for implementing draggable functionality
 * @param {Object} options - Configuration options
 * @param {Object} options.initialPosition - Initial position {x, y}
 * @param {Function} options.onPositionChange - Callback when position changes
 * @param {Object} options.boundaries - Drag boundaries {minX, maxX, minY, maxY}
 * @param {boolean} options.disabled - Whether dragging is disabled
 * @returns {Object} - Drag handlers and state
 */
export const useDraggable = ({
  initialPosition = { x: 0, y: 0 },
  onPositionChange,
  boundaries,
  disabled = false
} = {}) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const dragRef = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const elementStartPos = useRef({ x: 0, y: 0 });

  // Update position when initialPosition changes
  useEffect(() => {
    if (!isDragging) {
      setPosition(initialPosition);
    }
  }, [initialPosition, isDragging]);

  // Calculate boundaries based on current viewport
  const calculateBoundaries = useCallback(() => {
    if (boundaries) return boundaries;
    
    // Default boundaries - keep widget within viewport with some padding
    const padding = 20;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    return {
      minX: padding,
      maxX: windowWidth - 300 - padding, // Assume widget width ~300px
      minY: padding,
      maxY: windowHeight - 200 - padding  // Assume widget height ~200px
    };
  }, [boundaries]);

  // Validate and constrain position within boundaries
  const constrainPosition = useCallback((pos) => {
    const bounds = calculateBoundaries();
    return {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, pos.x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, pos.y))
    };
  }, [calculateBoundaries]);

  // Handle drag start
  const handleDragStart = useCallback((event) => {
    if (disabled) return;
    
    // Prevent default to avoid text selection or other browser behaviors
    event.preventDefault();
    
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    
    startPos.current = { x: clientX, y: clientY };
    elementStartPos.current = { ...position };
    
    setIsDragging(true);
    setDragOffset({
      x: clientX - position.x,
      y: clientY - position.y
    });

    // Add cursor styling to body during drag
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  }, [disabled, position]);

  // Handle drag move
  const handleDragMove = useCallback((event) => {
    if (!isDragging || disabled) return;
    
    event.preventDefault();
    
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    
    const newPosition = constrainPosition({
      x: clientX - dragOffset.x,
      y: clientY - dragOffset.y
    });
    
    setPosition(newPosition);
    
    // Call position change callback if provided
    if (onPositionChange) {
      onPositionChange(newPosition);
    }
  }, [isDragging, disabled, dragOffset, constrainPosition, onPositionChange]);

  // Handle drag end
  const handleDragEnd = useCallback((event) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Reset cursor styling
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // Final position callback
    if (onPositionChange) {
      onPositionChange(position);
    }
  }, [isDragging, position, onPositionChange]);

  // Cleanup effect for removing event listeners
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e) => handleDragMove(e);
      const handleMouseUp = (e) => handleDragEnd(e);
      const handleTouchMove = (e) => handleDragMove(e);
      const handleTouchEnd = (e) => handleDragEnd(e);
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Position preset helpers
  const moveToLeft = useCallback(() => {
    const newPos = constrainPosition({ x: 20, y: position.y });
    setPosition(newPos);
    if (onPositionChange) onPositionChange(newPos);
  }, [position.y, constrainPosition, onPositionChange]);

  const moveToRight = useCallback(() => {
    const bounds = calculateBoundaries();
    const newPos = constrainPosition({ x: bounds.maxX, y: position.y });
    setPosition(newPos);
    if (onPositionChange) onPositionChange(newPos);
  }, [position.y, calculateBoundaries, constrainPosition, onPositionChange]);

  const moveToCenter = useCallback(() => {
    const centerX = (window.innerWidth - 300) / 2; // Assuming widget width 300px
    const newPos = constrainPosition({ x: centerX, y: position.y });
    setPosition(newPos);
    if (onPositionChange) onPositionChange(newPos);
  }, [position.y, constrainPosition, onPositionChange]);

  // Reset to original position
  const resetPosition = useCallback(() => {
    const resetPos = constrainPosition(initialPosition);
    setPosition(resetPos);
    if (onPositionChange) onPositionChange(resetPos);
  }, [initialPosition, constrainPosition, onPositionChange]);

  return {
    // Position state
    position,
    isDragging,
    
    // Event handlers for the draggable element
    dragHandlers: {
      onMouseDown: handleDragStart,
      onTouchStart: handleDragStart,
      style: {
        cursor: isDragging ? 'grabbing' : 'grab',
        transform: `translate(${position.x}px, ${position.y}px)`,
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: isDragging ? 1001 : 1000 // Higher z-index when dragging
      }
    },
    
    // Position control methods
    moveToLeft,
    moveToRight,
    moveToCenter,
    resetPosition,
    
    // Ref for the draggable element
    ref: dragRef
  };
};

export default useDraggable;