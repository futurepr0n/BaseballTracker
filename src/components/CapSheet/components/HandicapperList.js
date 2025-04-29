import React, { useState } from 'react';
import Select from 'react-select';

/**
 * Component for displaying active handicappers and selecting from master list
 * 
 * @param {Array} activeHandicappers - Currently active handicappers
 * @param {Array} masterHandicappersList - Complete list of all available handicappers
 * @param {function} onAddHandicapper - Function to show add handicapper modal
 * @param {function} onRemoveHandicapper - Function to remove a handicapper
 * @param {function} onActivateHandicapper - Function to activate an existing handicapper
 * @param {boolean} isLoading - Whether handicappers are loading
 */
const HandicapperList = ({ 
  activeHandicappers, 
  masterHandicappersList,
  onAddHandicapper, 
  onRemoveHandicapper,
  onActivateHandicapper,
  isLoading
}) => {
  const [showAll, setShowAll] = useState(false);
  
  // Show only first 5 active handicappers by default or all if expanded
  const displayedHandicappers = showAll 
    ? activeHandicappers 
    : activeHandicappers.slice(0, 5);
  
  // Create select options from master list, excluding already active ones
  const selectOptions = masterHandicappersList
    .filter(h => !activeHandicappers.some(a => a.id === h.id))
    .map(h => ({ 
      value: h.id, 
      label: h.name 
    }));
  
  // Handle selection from dropdown
  const handleHandicapperSelect = (option) => {
    if (option && option.value) {
      onActivateHandicapper(option.value);
    }
  };
  
  return (
    <div className="handicapper-list-container">
      <div className="handicapper-list-header">
        <h3>Active Handicappers</h3>
        <div className="handicapper-actions">
          {masterHandicappersList.length > activeHandicappers.length && (
            <div className="handicapper-select-container">
              <Select
                options={selectOptions}
                onChange={handleHandicapperSelect}
                placeholder="Add existing handicapper..."
                isLoading={isLoading}
                isDisabled={isLoading || selectOptions.length === 0}
                isClearable
                className="handicapper-select"
                classNamePrefix="handicapper-select"
                noOptionsMessage={() => 
                  isLoading 
                    ? 'Loading handicappers...' 
                    : selectOptions.length === 0 
                      ? 'All handicappers already active' 
                      : 'No handicappers found'
                }
              />
            </div>
          )}
          <button
            className="action-btn add-handicapper-btn"
            onClick={onAddHandicapper}
            title="Add a new handicapper"
          >
            <span>+</span> Create New
          </button>
        </div>
      </div>
      
      {activeHandicappers.length === 0 ? (
        <div className="no-handicappers-message">
          <p>No handicappers active in this CapSheet. Add handicappers using the dropdown or "Create New" button above.</p>
        </div>
      ) : (
        <>
          <div className="handicapper-chips">
            {displayedHandicappers.map(handicapper => (
              <div key={handicapper.id} className="handicapper-chip">
                <span className="handicapper-name">{handicapper.name}</span>
                <button
                  className="remove-handicapper-btn"
                  onClick={() => onRemoveHandicapper(handicapper.id)}
                  title={`Remove ${handicapper.name} from active list`}
                >
                  ×
                </button>
              </div>
            ))}
            
            {activeHandicappers.length > 5 && !showAll && (
              <button
                className="show-more-btn"
                onClick={() => setShowAll(true)}
              >
                +{activeHandicappers.length - 5} more
              </button>
            )}
            
            {showAll && activeHandicappers.length > 5 && (
              <button
                className="show-less-btn"
                onClick={() => setShowAll(false)}
              >
                Show less
              </button>
            )}
          </div>
        </>
      )}
      
      {masterHandicappersList.length > 0 && (
        <div className="handicapper-stats">
          <small>{activeHandicappers.length} active of {masterHandicappersList.length} total handicappers</small>
        </div>
      )}
    </div>
  );
};

export default HandicapperList;