import React, { useEffect, useRef, useState } from 'react';

/**
 * WidthMonitor Component
 * Monitors dynamic width changes during dashboard loading
 * Detects the 1859px expansion issue and verifies CSS constraints
 */
const WidthMonitor = ({ enabled = true, showVisualFeedback = false }) => {
  const [measurements, setMeasurements] = useState([]);
  const [expansionAlerts, setExpansionAlerts] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const observersRef = useRef([]);
  const startTimeRef = useRef(null);
  
  const EXPANSION_THRESHOLD = 1520;
  const PROBLEMATIC_WIDTH = 1859;

  const logMeasurement = (element, selector, trigger, timestamp) => {
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    
    const measurement = {
      timestamp,
      trigger,
      selector,
      elementId: element.id || 'no-id',
      width: Math.round(rect.width),
      offsetWidth: element.offsetWidth,
      scrollWidth: element.scrollWidth,
      computedWidth: computedStyle.width,
      computedMaxWidth: computedStyle.maxWidth,
      boxSizing: computedStyle.boxSizing,
      overflow: computedStyle.overflow
    };
    
    setMeasurements(prev => [...prev, measurement]);
    
    // Check for expansions
    if (rect.width > EXPANSION_THRESHOLD) {
      const alert = {
        timestamp,
        selector,
        width: rect.width,
        trigger,
        overage: rect.width - EXPANSION_THRESHOLD,
        isCritical: rect.width >= PROBLEMATIC_WIDTH
      };
      
      setExpansionAlerts(prev => [...prev, alert]);
      
      console.warn(`🚨 WIDTH EXPANSION: ${selector} = ${rect.width}px (${trigger})`, alert);
      
      if (rect.width >= PROBLEMATIC_WIDTH) {
        console.error(`🔥 CRITICAL: ${PROBLEMATIC_WIDTH}px expansion detected!`, measurement);
      }
    }
  };

  const monitorElement = (element, selector) => {
    if (!element || !isMonitoring) return;
    
    const timestamp = Date.now() - startTimeRef.current;
    
    // Initial measurement
    logMeasurement(element, selector, 'initial', timestamp);
    
    // ResizeObserver for size changes
    const resizeObserver = new ResizeObserver(entries => {
      entries.forEach(entry => {
        const currentTimestamp = Date.now() - startTimeRef.current;
        logMeasurement(entry.target, selector, 'resize', currentTimestamp);
      });
    });
    
    resizeObserver.observe(element);
    observersRef.current.push(resizeObserver);
    
    // MutationObserver for style changes
    const styleObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
          const currentTimestamp = Date.now() - startTimeRef.current;
          logMeasurement(element, selector, 'style-change', currentTimestamp);
        }
      });
    });
    
    styleObserver.observe(element, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    
    observersRef.current.push(styleObserver);
  };

  const setupMonitoring = () => {
    if (!enabled) return;
    
    const selectors = [
      '.dashboard-grid',
      '.stats-controls',
      '.stats-time-selector',
      '.dashboard',
      '.card',
      '.strategic-intelligence-card',
      '.barrel-matchup-card',
      '.launch-angle-masters-card',
      '.milestone-tracking-card'
    ];
    
    // Monitor existing elements
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => monitorElement(element, selector));
    });
    
    // Set up mutation observer for new elements
    const mutationObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            selectors.forEach(selector => {
              if (node.matches && node.matches(selector)) {
                console.log(`📱 New element: ${selector}`);
                monitorElement(node, selector);
              }
              
              const children = node.querySelectorAll && node.querySelectorAll(selector);
              if (children) {
                children.forEach(child => monitorElement(child, selector));
              }
            });
          }
        });
      });
    });
    
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    observersRef.current.push(mutationObserver);
  };

  const generateReport = () => {
    if (measurements.length === 0) {
      console.log('📊 No measurements collected yet');
      return;
    }
    
    console.log('\n📊 === WIDTH MONITORING REPORT ===');
    console.log(`Total measurements: ${measurements.length}`);
    console.log(`Monitoring duration: ${Date.now() - startTimeRef.current}ms`);
    
    const maxWidth = Math.max(...measurements.map(m => m.width));
    const expansions = measurements.filter(m => m.width > EXPANSION_THRESHOLD);
    const criticalExpansions = measurements.filter(m => m.width >= PROBLEMATIC_WIDTH);
    
    console.log(`Max width observed: ${maxWidth}px`);
    console.log(`Expansion attempts: ${expansions.length}`);
    console.log(`Critical expansions: ${criticalExpansions.length}`);
    
    if (criticalExpansions.length === 0) {
      console.log('✅ No critical expansions detected - CSS constraints working!');
    } else {
      console.log('❌ Critical expansions detected - constraints may be failing');
      criticalExpansions.forEach((exp, i) => {
        console.log(`${i + 1}. ${exp.selector}: ${exp.width}px at ${exp.timestamp}ms`);
      });
    }
    
    // Group by element
    const elementGroups = measurements.reduce((groups, m) => {
      const key = `${m.selector}-${m.elementId}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
      return groups;
    }, {});
    
    console.log('\n🎯 Element Analysis:');
    Object.entries(elementGroups).forEach(([key, measures]) => {
      const maxW = Math.max(...measures.map(m => m.width));
      const finalW = measures[measures.length - 1].width;
      console.log(`${key}: max ${maxW}px, final ${finalW}px`);
      
      if (maxW > EXPANSION_THRESHOLD) {
        console.log(`  ⚠️ Exceeded threshold by ${maxW - EXPANSION_THRESHOLD}px`);
      }
    });
    
    console.log('\n💾 Raw data:', measurements);
    console.log('📊 === END REPORT ===\n');
  };

  useEffect(() => {
    if (!enabled) return;
    
    setIsMonitoring(true);
    startTimeRef.current = Date.now();
    
    console.log('🔍 Starting width monitoring...');
    
    // Start monitoring after a brief delay to catch initial renders
    const setupTimer = setTimeout(setupMonitoring, 100);
    
    // Monitor at specific intervals during loading
    const intervals = [500, 1000, 2000, 3000, 5000].map(delay => 
      setTimeout(() => {
        const dashboardGrid = document.querySelector('.dashboard-grid');
        const statsControls = document.querySelector('.stats-controls');
        const timestamp = Date.now() - startTimeRef.current;
        
        if (dashboardGrid) {
          logMeasurement(dashboardGrid, '.dashboard-grid', `checkpoint-${delay}ms`, timestamp);
        }
        if (statsControls) {
          logMeasurement(statsControls, '.stats-controls', `checkpoint-${delay}ms`, timestamp);
        }
      }, delay)
    );
    
    // Generate final report
    const reportTimer = setTimeout(() => {
      generateReport();
      setIsMonitoring(false);
    }, 8000);
    
    return () => {
      clearTimeout(setupTimer);
      clearTimeout(reportTimer);
      intervals.forEach(clearTimeout);
      
      observersRef.current.forEach(observer => observer.disconnect());
      observersRef.current = [];
      setIsMonitoring(false);
    };
  }, [enabled]);

  // Expose functions globally for manual testing
  useEffect(() => {
    window.widthMonitorReport = generateReport;
    window.widthMonitorData = measurements;
    window.widthExpansionAlerts = expansionAlerts;
  }, [measurements, expansionAlerts]);

  if (!showVisualFeedback) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <div><strong>🔍 Width Monitor</strong></div>
      <div>Status: {isMonitoring ? '📊 Active' : '⏸️ Stopped'}</div>
      <div>Measurements: {measurements.length}</div>
      <div>Expansions: {expansionAlerts.length}</div>
      {expansionAlerts.length > 0 && (
        <div style={{ color: '#ff6b6b', marginTop: '5px' }}>
          ⚠️ Expansion detected!
        </div>
      )}
      {expansionAlerts.some(alert => alert.isCritical) && (
        <div style={{ color: '#ff3838', fontWeight: 'bold' }}>
          🔥 Critical expansion!
        </div>
      )}
    </div>
  );
};

export default WidthMonitor;