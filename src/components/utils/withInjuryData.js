// src/components/utils/withInjuryData.js
import React from 'react';
import InjuryBadge from './InjuryBadge';
import './InjuryBadge.css';

/**
 * Higher-order component that adds injury data support to card components
 * This allows you to add injury badges without modifying each card component
 */
const withInjuryData = (WrappedComponent, options = {}) => {
  // Default configuration
  const config = {
    nameField: 'name',          // Field used for player name
    fullNameField: 'fullName',  // Field used for player full name (optional)
    teamField: 'team',          // Field used for player team
    playerListField: null,      // Override to specify which prop contains the player list
    ...options
  };
  
  return function WithInjuryData(props) {
    const { injuryData, currentDate, ...passThroughProps } = props;
    
    // If no injury data, just render the original component
    if (!injuryData) {
      return <WrappedComponent {...props} />;
    }
    
    // Function to recursively process React elements and add injury badges
    const processChildren = (children) => {
      return React.Children.map(children, child => {
        // Only process React elements
        if (!React.isValidElement(child)) {
          return child;
        }
        
        // Process player name spans
        if (child.type === 'span' && child.props.className === 'player-name') {
          // Try to extract player data from parent component context
          const playerContext = child._owner?.stateNode?.props?.player;
          
          if (playerContext) {
            const playerName = playerContext[config.fullNameField] || playerContext[config.nameField];
            const playerTeam = playerContext[config.teamField];
            
            if (playerName && injuryData[playerName]) {
              return React.cloneElement(
                child,
                child.props,
                [
                  child.props.children,
                  <InjuryBadge
                    key="injury-badge"
                    playerName={playerName}
                    playerTeam={playerTeam}
                    injuryData={injuryData}
                    currentDate={currentDate}
                  />
                ]
              );
            }
          }
        }
        
        // Recursively process child's children
        if (child.props.children) {
          const newChildren = processChildren(child.props.children);
          return React.cloneElement(child, child.props, newChildren);
        }
        
        return child;
      });
    };
    
    // Render the wrapped component with processed children
    return (
      <WrappedComponent
        {...passThroughProps}
        ref={node => {
          // If we successfully get a reference to the component, process its output
          if (node) {
            const element = node.render ? node.render() : node;
            if (element) {
              processChildren(element.props.children);
            }
          }
        }}
      />
    );
  };
};

export default withInjuryData;