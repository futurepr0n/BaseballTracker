/**
 * W3Schools-style collapsible functionality for glass cards
 * Recreates https://www.w3schools.com/howto/howto_js_collapsible.asp
 * but adapted for glass aesthetic
 */

/**
 * Initialize collapsible functionality for a glass card
 * @param {HTMLElement} glassHeader - The glass-header element to make clickable
 * @param {HTMLElement} glassCardContainer - The glass-card-container element to collapse
 * @param {string} cardId - Unique identifier for the card (for localStorage)
 */
export const initializeCollapsibleGlass = (glassHeader, glassCardContainer, cardId) => {
  if (!glassHeader || !glassCardContainer) {
    console.log('❌ Collapsible initialization failed: missing elements', { glassHeader, glassCardContainer });
    return;
  }

  console.log('✅ Initializing collapsible for', cardId, { glassHeader, glassCardContainer });

  // Add collapsible class to header
  glassHeader.classList.add('collapsible');
  
  // Check localStorage for saved state
  const isCollapsed = localStorage.getItem(`collapsible_${cardId}`) === 'true';
  
  // Set initial state
  if (isCollapsed) {
    glassCardContainer.classList.add('collapsed');
    glassCardContainer.classList.remove('expanded');
    glassHeader.classList.add('collapsed');
  } else {
    glassCardContainer.classList.add('expanded');
    glassCardContainer.classList.remove('collapsed');
    glassHeader.classList.remove('collapsed');
  }

  // Add click event listener
  const toggleCollapse = () => {
    console.log('🔄 Toggle clicked for', cardId);
    const isCurrentlyCollapsed = glassCardContainer.classList.contains('collapsed');
    console.log('Current state:', isCurrentlyCollapsed ? 'collapsed' : 'expanded');
    
    if (isCurrentlyCollapsed) {
      // Expand
      glassCardContainer.classList.remove('collapsed');
      glassCardContainer.classList.add('expanded');
      glassHeader.classList.remove('collapsed');
      localStorage.setItem(`collapsible_${cardId}`, 'false');
    } else {
      // Collapse
      glassCardContainer.classList.remove('expanded');
      glassCardContainer.classList.add('collapsed');
      glassHeader.classList.add('collapsed');
      localStorage.setItem(`collapsible_${cardId}`, 'true');
    }
  };

  glassHeader.addEventListener('click', toggleCollapse);
  
  // Return cleanup function
  return () => {
    glassHeader.removeEventListener('click', toggleCollapse);
  };
};

/**
 * React hook for collapsible glass cards
 * @param {string} cardId - Unique identifier for the card
 */
export const useCollapsibleGlass = (cardId) => {
  const initializeRef = (headerRef, contentRef) => {
    if (headerRef && contentRef) {
      return initializeCollapsibleGlass(headerRef, contentRef, cardId);
    }
  };

  return { initializeRef };
};