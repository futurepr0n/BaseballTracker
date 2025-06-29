// Scroll Performance Optimization for Glass Cards
// This utility adds performance mode during fast scrolling

export const initializeScrollPerformance = () => {
  const scrollContainers = document.querySelectorAll('.scrollable-container');
  
  scrollContainers.forEach(container => {
    let scrollTimeout;
    let lastScrollTop = 0;
    let scrollSpeed = 0;
    let lastScrollTime = Date.now();
    
    container.addEventListener('scroll', (e) => {
      const currentScrollTop = container.scrollTop;
      const currentTime = Date.now();
      const timeDiff = currentTime - lastScrollTime;
      
      // Calculate scroll speed
      if (timeDiff > 0) {
        scrollSpeed = Math.abs(currentScrollTop - lastScrollTop) / timeDiff;
      }
      
      // If scrolling fast (more than 2 pixels per millisecond)
      if (scrollSpeed > 2) {
        container.classList.add('fast-scrolling');
        document.body.classList.add('performance-mode');
      }
      
      // Clear existing timeout
      clearTimeout(scrollTimeout);
      
      // Remove performance mode after scrolling stops
      scrollTimeout = setTimeout(() => {
        container.classList.remove('fast-scrolling');
        document.body.classList.remove('performance-mode');
      }, 150);
      
      lastScrollTop = currentScrollTop;
      lastScrollTime = currentTime;
    }, { passive: true });
  });
};

// Initialize on component mount
export const useScrollPerformance = () => {
  // This can be called in a useEffect hook in components
  if (typeof window !== 'undefined') {
    // Small delay to ensure DOM is ready
    setTimeout(initializeScrollPerformance, 100);
  }
};