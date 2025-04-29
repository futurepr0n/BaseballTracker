import React from 'react';

/**
 * Modal for adding a new handicapper
 * 
 * @param {boolean} show - Whether to show the modal
 * @param {function} onClose - Function to close the modal
 * @param {string} playerType - Type of player ('hitter' or 'pitcher')
 * @param {string} newHandicapperName - New handicapper name input value
 * @param {function} setNewHandicapperName - Function to update handicapper name
 * @param {string} handicapperSearch - Handicapper search input value
 * @param {function} setHandicapperSearch - Function to update handicapper search
 * @param {Array} filteredHandicappers - Filtered list of handicappers based on search
 * @param {function} handleSelectHandicapper - Function to handle handicapper selection
 * @param {function} handleAddHandicapper - Function to handle adding a handicapper
 */
const AddHandicapperModal = ({
  show,
  onClose,
  playerType = 'hitter',
  newHandicapperName,
  setNewHandicapperName,
  handicapperSearch,
  setHandicapperSearch,
  filteredHandicappers,
  handleSelectHandicapper,
  handleAddHandicapper
}) => {
  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newHandicapperName.trim()) {
      handleAddHandicapper(playerType);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add New Handicapper for {playerType === 'hitter' ? 'Hitters' : 'Pitchers'}</h3>
          <button className="close-modal-btn" onClick={onClose}>×</button>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="handicapper-name">Handicapper Name/Username</label>
            <input 
              id="handicapper-name" 
              type="text" 
              value={newHandicapperName} 
              onChange={(e) => setNewHandicapperName(e.target.value)} 
              placeholder="Enter handicapper name (e.g., @CapperJoe)"
              autoFocus
            />
            <small>
              {newHandicapperName && !newHandicapperName.startsWith('@') && 
                "Note: @ symbol will be automatically added if missing"}
            </small>
          </div>
          <div className="form-group">
            <label>Quick Select from Predefined List</label>
            <input 
              type="text" 
              placeholder="Search existing handicappers..." 
              value={handicapperSearch} 
              onChange={(e) => setHandicapperSearch(e.target.value)}
            />
            <div className="handicapper-list">
              {filteredHandicappers.length > 0 ? (
                filteredHandicappers.slice(0, 10).map(handicapper => (
                  <div 
                    key={handicapper.id} 
                    className="handicapper-option" 
                    onClick={() => handleSelectHandicapper(handicapper)}
                  >
                    {handicapper.name}
                  </div>
                ))
              ) : (
                <div className="no-results">
                  {handicapperSearch ? 'No matches found' : 'Start typing to search'}
                </div>
              )}
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            <button 
              type="submit" 
              className="submit-btn" 
              disabled={!newHandicapperName.trim()}
            >
              Add Handicapper
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddHandicapperModal;