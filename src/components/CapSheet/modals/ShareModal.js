// Share Modal Component for CapSheet URL sharing
import React, { useState, useEffect } from 'react';
import './ShareModal.css';

const ShareModal = ({ show, onClose, shareResult, isGenerating }) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(null);

  // Reset copy state when modal opens/closes
  useEffect(() => {
    if (!show) {
      setCopied(false);
      setCopyError(null);
    }
  }, [show]);

  const handleCopyToClipboard = async () => {
    if (!shareResult?.url) return;

    try {
      await navigator.clipboard.writeText(shareResult.url);
      setCopied(true);
      setCopyError(null);
      
      // Reset copy state after 3 seconds
      setTimeout(() => {
        setCopied(false);
      }, 3000);
    } catch (error) {
      console.error('[ShareModal] Copy failed:', error);
      setCopyError('Failed to copy to clipboard');
      
      // Fallback: select the text for manual copy
      const input = document.querySelector('.share-url-input');
      if (input) {
        input.select();
        input.setSelectionRange(0, 99999); // For mobile devices
      }
    }
  };

  const handleEmailShare = () => {
    if (!shareResult?.url) return;
    
    const subject = encodeURIComponent('Check out my CapSheet setup');
    const body = encodeURIComponent(
      `I've shared my baseball handicapping CapSheet with you!\n\n` +
      `View it here: ${shareResult.url}\n\n` +
      `This CapSheet contains ${shareResult.summary?.totalHitters || 0} hitters and ${shareResult.summary?.totalPitchers || 0} pitchers.\n\n` +
      `Created with CapSheet from Capping.Pro`
    );
    
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleTwitterShare = () => {
    if (!shareResult?.url) return;
    
    const text = encodeURIComponent(
      `Check out my baseball handicapping CapSheet! ` +
      `${shareResult.summary?.totalHitters || 0} hitters, ${shareResult.summary?.totalPitchers || 0} pitchers. ` +
      `#Baseball #Handicapping`
    );
    const url = encodeURIComponent(shareResult.url);
    
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const handleViewGist = () => {
    if (!shareResult?.gistUrl) return;
    window.open(shareResult.gistUrl, '_blank');
  };

  if (!show) return null;

  return (
    <div className="modal-overlay share-modal-overlay">
      <div className="modal-content share-modal">
        <div className="modal-header">
          <h2>Share Your CapSheet</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="share-modal-content">
          {isGenerating && (
            <div className="share-generating">
              <div className="loading-spinner"></div>
              <p>Creating your shareable link...</p>
              <span className="loading-subtitle">This may take a few seconds</span>
            </div>
          )}

          {shareResult && !isGenerating && (
            <>
              <div className="share-summary">
                <h3>📊 CapSheet Summary</h3>
                <div className="summary-stats">
                  <div className="stat-item">
                    <span className="stat-label">Hitters:</span>
                    <span className="stat-value">{shareResult.summary?.totalHitters || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Pitchers:</span>
                    <span className="stat-value">{shareResult.summary?.totalPitchers || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Handicappers:</span>
                    <span className="stat-value">{shareResult.summary?.totalHandicappers || 0}</span>
                  </div>
                </div>
              </div>

              <div className="share-url-section">
                <label htmlFor="shareUrl" className="share-url-label">
                  📎 Share Link
                </label>
                <div className="share-url-container">
                  <input 
                    id="shareUrl"
                    type="text" 
                    value={shareResult.url} 
                    readOnly 
                    className="share-url-input"
                  />
                  <button 
                    onClick={handleCopyToClipboard}
                    className={`copy-btn ${copied ? 'copied' : ''}`}
                    title={copied ? 'Copied!' : 'Copy to clipboard'}
                  >
                    {copied ? '✅' : '📋'}
                  </button>
                </div>
                
                {copied && (
                  <div className="copy-success">
                    ✅ Link copied to clipboard!
                  </div>
                )}
                
                {copyError && (
                  <div className="copy-error">
                    ⚠️ {copyError}
                  </div>
                )}
              </div>
              
              <div className="share-options">
                <h4>Share via:</h4>
                <div className="share-buttons">
                  <button className="share-btn email" onClick={handleEmailShare}>
                    ✉️ Email
                  </button>
                  <button className="share-btn twitter" onClick={handleTwitterShare}>
                    🐦 Twitter
                  </button>
                  {shareResult.method === 'github-gist' && shareResult.gistUrl && (
                    <button className="share-btn gist" onClick={handleViewGist}>
                      📄 View Details
                    </button>
                  )}
                </div>
              </div>
              
              <div className="share-info">
                <h4>📋 How it works:</h4>
                {shareResult.method === 'github-gist' ? (
                  <ul>
                    <li>✅ Your CapSheet data is stored securely on GitHub</li>
                    <li>🔗 Anyone with the link can view your player selections</li>
                    <li>🔒 No sensitive information is shared</li>
                    <li>⏳ Links persist until manually deleted from GitHub</li>
                  </ul>
                ) : (
                  <ul>
                    <li>🔗 Your CapSheet data is encoded directly in the URL</li>
                    <li>📱 Works offline - no external dependencies</li>
                    <li>🔒 No sensitive information is shared</li>
                    <li>⚡ Instant sharing - no GitHub required</li>
                  </ul>
                )}
                
                {shareResult.method === 'base64' && (
                  <div className="share-method-info">
                    <strong>💡 Method:</strong> URL-based sharing (fallback)
                  </div>
                )}
                
                {shareResult.method === 'github-gist' && (
                  <div className="share-method-info">
                    <strong>💡 Method:</strong> GitHub Gist storage
                  </div>
                )}
              </div>
            </>
          )}

          {!shareResult && !isGenerating && (
            <div className="share-error">
              <p>❌ Failed to generate share link</p>
              <p>Please try again or check your internet connection.</p>
            </div>
          )}
        </div>
        
        <div className="modal-actions">
          <button onClick={onClose} className="close-btn">
            {shareResult ? 'Done' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;