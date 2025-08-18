# Collapsible Dashboard Cards Implementation Guide

This guide provides comprehensive instructions for implementing and fixing collapsible functionality across dashboard cards in the BaseballTracker application.

## 🎯 Overview

The collapsible card system allows dashboard cards to collapse/expand when users click the header, providing a clean and organized interface. The implementation uses a glass effect design with different behaviors for desktop and mobile views.

## 📋 Core Requirements

### Required Components for Collapsible Functionality

1. **JavaScript Implementation:**
   - Import `initializeCollapsibleGlass` utility
   - Create `useRef` hooks for header and container
   - Add `useEffect` for initialization

2. **JSX Structure:**
   - `glass-card-container` with containerRef
   - `glass-header` with headerRef
   - `glass-content expanded` wrapper around ALL content

3. **CSS Implementation:**
   - Import `CollapsibleGlass.css`
   - Desktop collapsible styles
   - Mobile-specific responsive styles

## 🔧 Standard Implementation Pattern

### 1. JavaScript Setup

```javascript
import React, { useEffect, useRef } from 'react';
import { initializeCollapsibleGlass } from '../../../utils/collapsibleGlass';
import './CardName.css';
import '../../../styles/CollapsibleGlass.css'; // CRITICAL: Must import

const CardComponent = ({ props }) => {
  const headerRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize collapsible functionality
  useEffect(() => {
    if (headerRef.current && containerRef.current) {
      const cleanup = initializeCollapsibleGlass(
        headerRef.current, 
        containerRef.current,
        'card-class-name' // Use the card's CSS class
      );
      return cleanup;
    }
  }, []);

  return (
    <div className="card card-class-name">
      <div className="glass-card-container" ref={containerRef}>
        <div className="glass-header" ref={headerRef}>
          <h3>Card Title</h3>
          <p className="card-subtitle">Subtitle if needed</p>
        </div>
        
        <div className="glass-content expanded">
          <div className="scrollable-container">
            {/* ALL CARD CONTENT GOES HERE */}
            {/* Desktop and mobile views */}
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 2. CSS Structure Requirements

```css
/* Import required base styles */
@import '../../../styles/CollapsibleGlass.css';

/* Desktop collapsible functionality (provided by CollapsibleGlass.css) */
.card-class-name .glass-card-container {
  position: relative;
  height: 100%;
  min-height: 420px; /* Adjust based on card content */
  transition: all 0.3s ease;
  overflow: hidden;
}

.card-class-name .glass-card-container.collapsed {
  height: 84px;
  min-height: 84px;
}

.card-class-name .glass-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  padding: 20px;
  cursor: pointer;
  backdrop-filter: blur(30px);
  transition: all 0.3s ease;
}

.card-class-name .glass-content {
  opacity: 1;
  transition: opacity 0.3s ease;
}

.card-class-name .glass-content.collapsed {
  opacity: 0;
}

/* CRITICAL: Mobile responsive collapsible pattern */
@media (max-width: 768px) {
  /* Mobile glass header positioning */
  .card-class-name .glass-header {
    position: absolute !important;
    top: 0 !important;
    z-index: 25 !important;
    cursor: pointer !important;
    backdrop-filter: blur(25px) !important;
  }
  
  /* Mobile collapsed state - 84px height */
  .card-class-name .glass-card-container.collapsed {
    height: 84px !important;
    min-height: 84px !important;
    max-height: 84px !important;
  }
  
  /* Mobile expanded state - 60vh max height */
  .card-class-name .glass-card-container.expanded {
    min-height: 60vh !important;
    height: auto !important;
  }
  
  /* Hide content when collapsed */
  .card-class-name .glass-card-container.collapsed .glass-content,
  .card-class-name .glass-card-container.collapsed .scrollable-container {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
  }
  
  /* Show content when expanded */
  .card-class-name .glass-card-container.expanded .glass-content,
  .card-class-name .glass-card-container.expanded .scrollable-container {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
  
  /* Mobile glass content setup */
  .card-class-name .glass-content {
    padding-top: 110px !important; /* Space for header */
    max-height: 60vh !important;
    z-index: 10 !important;
  }
}
```

## 🚨 Common Issues and Solutions

### Issue 1: Missing Chevron Icon / Card Not Collapsible

**Symptoms:**
- No dropdown chevron appears in header
- Clicking header does nothing
- Card appears static

**Solution:**
```javascript
// Missing import - ADD THIS:
import '../../../styles/CollapsibleGlass.css';
```

**Root Cause:** The `CollapsibleGlass.css` file contains the CSS that creates the chevron icon via `::after` pseudo-element and enables the collapsible styling.

### Issue 2: Card Structure Missing glass-content Wrapper

**Symptoms:**
- Card content is outside collapsible area
- Desktop may work but mobile doesn't respond
- Content always visible regardless of collapse state

**Wrong Structure:**
```jsx
<div className="glass-card-container" ref={containerRef}>
  <div className="glass-header" ref={headerRef}>Title</div>
  <div className="scrollable-container">Content</div> {/* WRONG */}
</div>
```

**Correct Structure:**
```jsx
<div className="glass-card-container" ref={containerRef}>
  <div className="glass-header" ref={headerRef}>Title</div>
  <div className="glass-content expanded">
    <div className="scrollable-container">Content</div> {/* CORRECT */}
  </div>
</div>
```

### Issue 3: Mobile Microcollapse (Content Invisible When Expanded)

**Symptoms:**
- Mobile card becomes extremely small when expanded
- Content not visible even in expanded state
- Desktop works fine

**Solution:** Add mobile CSS pattern:
```css
@media (max-width: 768px) {
  .card-name .glass-card-container.expanded {
    min-height: 60vh !important;
    height: auto !important;
  }
  
  .card-name .glass-card-container.expanded .glass-content {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
}
```

### Issue 4: Mobile Non-Responsive Collapse

**Symptoms:**
- Mobile header doesn't respond to taps
- Card doesn't toggle between collapsed/expanded states
- Desktop functionality works

**Solution:** Ensure mobile header is properly positioned:
```css
@media (max-width: 768px) {
  .card-name .glass-header {
    position: absolute !important;
    top: 0 !important;
    z-index: 25 !important;
    cursor: pointer !important;
  }
}
```

### Issue 5: Content Appears Above Header When Collapsed

**Symptoms:**
- Card content bleeds through header when collapsed
- Header not fully visible
- Layering issues

**Solution:** Fix z-index layering:
```css
.card-name .glass-header {
  z-index: 20; /* Desktop */
}

@media (max-width: 768px) {
  .card-name .glass-header {
    z-index: 25 !important; /* Mobile needs higher z-index */
  }
  
  .card-name .glass-content {
    z-index: 10 !important; /* Content below header */
  }
}
```

## 🔍 Debugging Checklist

When a card's collapsible functionality isn't working, check these items in order:

### 1. JavaScript Implementation
- [ ] `initializeCollapsibleGlass` imported?
- [ ] `useRef` hooks created for header and container?
- [ ] `useEffect` calling `initializeCollapsibleGlass`?
- [ ] Refs properly attached to JSX elements?

### 2. JSX Structure
- [ ] `glass-card-container` has `ref={containerRef}`?
- [ ] `glass-header` has `ref={headerRef}`?
- [ ] ALL content wrapped in `glass-content expanded`?
- [ ] No content outside the `glass-content` wrapper?

### 3. CSS Implementation
- [ ] `CollapsibleGlass.css` imported?
- [ ] Desktop collapsible styles present?
- [ ] Mobile `@media (max-width: 768px)` styles added?
- [ ] Mobile collapsed/expanded state styles implemented?

### 4. CSS Syntax
- [ ] No extra closing braces `}`?
- [ ] Proper CSS selector nesting?
- [ ] `!important` declarations used in mobile styles?

## 📱 Mobile-Specific Considerations

### Standard Mobile Pattern

All cards should use this exact mobile pattern for consistency:

```css
@media (max-width: 768px) {
  /* Header positioning - enables touch interaction */
  .card-name .glass-header {
    position: absolute !important;
    top: 0 !important;
    z-index: 25 !important;
    cursor: pointer !important;
    backdrop-filter: blur(25px) !important;
  }
  
  /* Collapsed state - header only visible */
  .card-name .glass-card-container.collapsed {
    height: 84px !important;
    min-height: 84px !important;
    max-height: 84px !important;
  }
  
  /* Expanded state - content visible with scroll */
  .card-name .glass-card-container.expanded {
    min-height: 60vh !important;
    height: auto !important;
  }
  
  /* Content visibility management */
  .card-name .glass-card-container.collapsed .glass-content {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
  }
  
  .card-name .glass-card-container.expanded .glass-content {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
  
  /* Content spacing and scrolling */
  .card-name .glass-content {
    padding-top: 110px !important; /* Space for header */
    max-height: 60vh !important;
    z-index: 10 !important;
  }
}
```

### Mobile Height Standards

- **Collapsed Height:** `84px` - Shows header only
- **Expanded Max Height:** `60vh` - Allows content to be visible while maintaining reasonable screen usage
- **Header Space:** `110px` padding-top to prevent content from appearing behind header

## 🎨 Visual Behavior Specifications

### Desktop Experience
- **Dropdown chevron icon** appears in header (▼ expanded, ◀ collapsed)
- **Smooth animations** between collapsed/expanded states
- **Glass blur effects** maintained throughout interactions
- **Hover effects** on header indicate interactivity

### Mobile Experience
- **Touch-responsive headers** with proper touch targets
- **Consistent 84px collapsed height** across all cards
- **Scrollable content** when expanded with max 60vh height
- **Clear visual feedback** when transitioning between states

## 📁 File Organization

When implementing collapsible functionality:

```
src/components/cards/CardName/
├── CardName.js          # Component with collapsible JS implementation
├── CardName.css         # Card-specific styles + mobile collapsible pattern
└── ...                  # Other card files

src/styles/
└── CollapsibleGlass.css # Base collapsible functionality (MUST import)

src/utils/
└── collapsibleGlass.js  # Utility function for initialization
```

## 🧪 Testing Guidelines

### Desktop Testing
1. **Visual Check:** Dropdown chevron appears in header
2. **Click Test:** Header click toggles collapse/expand
3. **Animation Test:** Smooth transitions between states
4. **Content Test:** All content hidden when collapsed, visible when expanded

### Mobile Testing (Responsive Design Mode)
1. **Responsive Check:** Switch to mobile view (< 768px width)
2. **Touch Test:** Tap header to toggle states
3. **Height Test:** Collapsed = 84px, Expanded = readable content
4. **Scroll Test:** Content scrollable when expanded if needed
5. **Content Visibility:** Content hidden when collapsed, visible when expanded

### Cross-Device Testing
1. **Refresh Test:** Functionality persists across page refreshes
2. **State Persistence:** Cards remember their state during user session
3. **Performance Test:** No lag or blocking during animations
4. **Layout Test:** No content overflow or positioning issues

## 🚀 Implementation Checklist

For adding collapsible functionality to a new card:

### Phase 1: JavaScript Setup
- [ ] Import `initializeCollapsibleGlass` and `useRef`
- [ ] Create header and container refs
- [ ] Add useEffect with initialization
- [ ] Import `CollapsibleGlass.css`

### Phase 2: JSX Structure
- [ ] Add `ref={containerRef}` to `glass-card-container`
- [ ] Add `ref={headerRef}` to `glass-header`
- [ ] Wrap ALL content in `glass-content expanded`
- [ ] Verify no content is outside wrapper

### Phase 3: CSS Implementation
- [ ] Add desktop collapsible styles
- [ ] Implement mobile `@media (max-width: 768px)` pattern
- [ ] Set appropriate min-height for desktop
- [ ] Test both desktop and mobile functionality

### Phase 4: Testing & Validation
- [ ] Desktop chevron icon appears
- [ ] Desktop collapse/expand works
- [ ] Mobile touch interaction works
- [ ] Mobile content visibility correct
- [ ] No CSS compilation errors
- [ ] Cross-device functionality verified

## 📚 Reference Examples

### Working Card Examples
Reference these successfully implemented cards for pattern examples:

- `TopHittersCard` - Standard implementation
- `MilestoneTrackingCard` - Complex content with filters
- `TeamLastResultCards` - Multiple cards in one file
- `OpponentMatchupHitsCard` - Mobile and desktop views

### CSS Pattern Files
- `CollapsibleGlass.css` - Base functionality
- `TopHittersCard.css` - Standard desktop + mobile pattern
- `MilestoneTrackingCard.css` - Complex card with filters

## 🔧 Troubleshooting Quick Fixes

### Quick Fix: Missing Chevron
```javascript
// Add this import to component file:
import '../../../styles/CollapsibleGlass.css';
```

### Quick Fix: Mobile Not Responsive
```css
/* Add this mobile CSS block: */
@media (max-width: 768px) {
  .your-card-name .glass-header {
    position: absolute !important;
    cursor: pointer !important;
    z-index: 25 !important;
  }
}
```

### Quick Fix: Content Outside Wrapper
```jsx
{/* Wrap content like this: */}
<div className="glass-content expanded">
  <div className="scrollable-container">
    {/* All your content here */}
  </div>
</div>
```

### Quick Fix: Microcollapse on Mobile
```css
@media (max-width: 768px) {
  .your-card-name .glass-card-container.expanded {
    min-height: 60vh !important;
  }
  .your-card-name .glass-card-container.expanded .glass-content {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
}
```

---

## 📝 Notes

- **Desktop Priority:** Always preserve desktop functionality when fixing mobile issues
- **Consistency:** Use the standardized mobile pattern across all cards
- **Performance:** Import `CollapsibleGlass.css` only once per component
- **Maintenance:** Keep mobile styles in `@media (max-width: 768px)` blocks for organization

This guide should provide comprehensive coverage for implementing and maintaining collapsible dashboard cards. For any edge cases or new requirements, follow the established patterns and extend as needed while maintaining consistency across the application.