import { useCallback, useRef, useState } from 'react';

/**
 * Custom hook for detecting long press events
 * @param {Function} onLongPress - Callback function to execute on long press
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Time in ms to trigger long press (default: 750)
 * @param {Function} options.onStart - Callback when long press starts
 * @param {Function} options.onFinish - Callback when long press finishes
 * @param {Function} options.onCancel - Callback when long press is cancelled
 * @returns {Object} - Event handlers and state
 */
export const useLongPress = (
  onLongPress,
  { threshold = 750, onStart, onFinish, onCancel } = {}
) => {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const timeout = useRef();
  const prevented = useRef(false);
  const target = useRef();
  const startPos = useRef({ x: 0, y: 0 });

  const start = useCallback(
    (event) => {
      // Store starting position for movement detection
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const clientY = event.touches ? event.touches[0].clientY : event.clientY;
      startPos.current = { x: clientX, y: clientY };

      // Prevent default context menu on right click
      if (event.type === 'mousedown' && event.button === 2) {
        return;
      }

      prevented.current = false;
      target.current = event.target;
      setIsLongPressing(true);

      // Call onStart callback
      if (onStart) {
        onStart(event);
      }

      timeout.current = setTimeout(() => {
        if (!prevented.current) {
          onLongPress(event);
          setIsLongPressing(false);
          if (onFinish) {
            onFinish(event);
          }
        }
      }, threshold);
    },
    [onLongPress, threshold, onStart, onFinish]
  );

  const clear = useCallback(
    (event, shouldCancel = true) => {
      timeout.current && clearTimeout(timeout.current);
      prevented.current = true;
      
      if (shouldCancel && isLongPressing && onCancel) {
        onCancel(event);
      }
      
      setIsLongPressing(false);
    },
    [isLongPressing, onCancel]
  );

  const handleMove = useCallback(
    (event) => {
      if (!isLongPressing) return;

      // Get current position
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const clientY = event.touches ? event.touches[0].clientY : event.clientY;

      // Calculate movement distance
      const deltaX = Math.abs(clientX - startPos.current.x);
      const deltaY = Math.abs(clientY - startPos.current.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Cancel long press if user moves too much (> 10px)
      if (distance > 10) {
        clear(event, true);
      }
    },
    [isLongPressing, clear]
  );

  return {
    // Event handlers
    onMouseDown: (event) => start(event),
    onTouchStart: (event) => start(event),
    onMouseUp: (event) => clear(event, false),
    onTouchEnd: (event) => clear(event, false),
    onMouseMove: handleMove,
    onTouchMove: handleMove,
    onMouseLeave: (event) => clear(event, true),
    onContextMenu: (event) => {
      if (isLongPressing) {
        event.preventDefault();
      }
    },

    // State
    isLongPressing,
    
    // Manual control
    cancel: () => clear(null, true)
  };
};

export default useLongPress;