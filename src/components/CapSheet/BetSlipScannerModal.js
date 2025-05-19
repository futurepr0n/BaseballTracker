import React, { useState, useRef } from 'react';
import axios from 'axios';
import './BetSlipScannerModal.css';

function BetSlipScannerModal({ isOpen, onClose, onScanComplete, context }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setPreview(null);
      setError(null);
    }
  }, [isOpen]);

  // Handle clicking on the dropzone
  const handleDropzoneClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      console.log("File selected:", selectedFile.name, selectedFile.size);
    }
    setFile(selectedFile);
    setError(null);
    
    // Create preview
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  // Handle drag and drop events
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(droppedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('context', context || 'capsheet'); // Send context to API

    // API endpoint URL - REPLACE WITH YOUR ACTUAL SERVER
    const API_URL = 'http://scan.capping.pro/api/scan';
    // Alternatively use: 'http://scan.capping.pro/api/scan'

    try {
      console.log("Uploading file to:", API_URL);
      const response = await axios.post(API_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log("API Response:", response.data);
      
      if (response.data.success) {
        // Pass data back to the parent component
        onScanComplete(response.data);
        // Close the modal
        onClose();
      } else {
        setError(response.data.error || 'Unknown error occurred');
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      setError('Error scanning bet slip: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="scanner-modal">
        <div className="modal-header">
          <h2>Scan Bet Slip</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="upload-area">
              {preview ? (
                <div className="preview-container">
                  <img src={preview} alt="Preview" className="file-preview" />
                  <button 
                    type="button" 
                    className="remove-file" 
                    onClick={() => {setFile(null); setPreview(null);}}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div 
                  className="dropzone"
                  onClick={handleDropzoneClick}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <p>Drop bet slip image here or click to browse</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="betSlipFile"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </div>
              )}
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="modal-actions">
              <button type="button" className="cancel-button" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="scan-button" disabled={loading || !file}>
                {loading ? 'Scanning...' : 'Scan Bet Slip'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default BetSlipScannerModal;