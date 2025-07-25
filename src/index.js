import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Import console optimization systems
import './utils/consoleQuiet';
import { debugPresets } from './utils/debugConfig';

// Auto-configure production logging optimization
if (process.env.NODE_ENV === 'production') {
  // Enable console quiet mode to suppress legacy console.log statements
  if (window.consoleQuiet) {
    window.consoleQuiet.enable();
  }
  
  // Ensure debug system is in production mode
  debugPresets.production();
  
  console.log('🔇 Production logging optimization enabled');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);