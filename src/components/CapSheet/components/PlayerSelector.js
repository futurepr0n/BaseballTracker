import React from 'react';
import Select from 'react-select';

/**
 * Component for player selection dropdown
 * Modified to prevent dropdown cutoff issues
 * 
 * @param {Array} options - Array of player options for the select
 * @param {function} onSelect - Function to handle player selection
 * @param {boolean} isLoading - Whether player data is loading
 * @param {boolean} isDisabled - Whether the selector is disabled
 * @param {string} placeholder - Placeholder text
 * @param {string} noOptionsMessage - Message to show when no options are available
 * @param {string} selectId - Unique ID for the select element (required to avoid duplicate IDs)
 */
const PlayerSelector = ({
  options,
  onSelect,
  isLoading,
  isDisabled,
  placeholder = "Search and select a player...",
  noOptionsMessage = "No players found",
  selectId = "player-selector" // Default ID, but should be overridden by parent
}) => {
  // Custom styles for select to fix dropdown cutoff issues
  const customStyles = {
    // Control is the main input element
    control: (base) => ({
      ...base,
      minHeight: '36px',
      fontSize: '0.95em'
    }),
    // Make sure dropdown menu appears correctly
    menu: (base) => ({
      ...base,
      zIndex: 9999,
      width: 'auto', // Let it expand beyond control width if needed
      minWidth: '100%' // Start at control width
    }),
    // Ensure the menu portal is positioned correctly
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999
    })
  };

  return (
    <div className="player-selector player-search-select">
      <Select
        options={options}
        onChange={(selectedOption) => {
          if (selectedOption) {
            onSelect(selectedOption.value);
          }
        }}
        value={null} // Resets after selection
        placeholder={placeholder}
        isLoading={isLoading}
        isDisabled={isLoading || isDisabled}
        isClearable
        isSearchable
        className="react-select-container"
        classNamePrefix="react-select"
        noOptionsMessage={() => isLoading ? 'Loading players...' : noOptionsMessage}
        // Add a unique ID for the select element to fix duplicate ID issue
        inputId={selectId}
        // Apply the custom styles
        styles={customStyles}
        // Render dropdown in a portal to avoid clipping issues
        menuPortalTarget={document.body}
        menuPosition="fixed"
      />
      {options.length === 0 && !isLoading && (
        <span className="no-players-message">No players found for this date.</span>
      )}
    </div>
  );
};

export default PlayerSelector;