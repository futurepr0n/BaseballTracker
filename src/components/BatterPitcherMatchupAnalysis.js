// BatterPitcherMatchupAnalysis.js - Fixed version
// Utility functions for analyzing batter vs pitcher matchups

/**
 * Analyzes the matchup between a batter and pitcher
 * @param {Object} batter - Batter player object
 * @param {Object} pitcher - Pitcher player object
 * @returns {Object} Analysis results with advantage scores and potentials
 */
export const analyzeBatterPitcherMatchup = (batter, pitcher) => {
  // Default result structure
  let result = {
    advantage: 0,
    advantageLabel: 'Neutral',
    hitPotential: 'Medium',
    hrPotential: 'Low',
    tbPotential: 'Medium',
    kPotential: 'Medium',
    details: {
      handednessAdvantage: 0,
      pitchTypeAdvantage: 0,
      matchupHistory: []
    }
  };
  
  // Basic advantage calculation based on handedness
  let handednessAdvantage = 0;
  
  // Check if we have handedness data
  if (batter.bats && (pitcher.throwingArm || pitcher.ph)) {
    const pitcherHand = pitcher.throwingArm || pitcher.ph;
    
    // Switch hitters generally have advantage
    if (batter.bats === 'B') {
      handednessAdvantage = 1.5;
      result.advantageLabel = 'Switch Hitter Advantage';
    }
    // Same-handed matchup (typically pitcher advantage)
    // L vs L or R vs R
    else if (batter.bats === pitcherHand) {
      handednessAdvantage = -1.2;
      result.advantageLabel = 'Pitcher Advantage (Same Hand)';
    }
    // Opposite-handed matchup (typically batter advantage)
    // L vs R or R vs L
    else {
      handednessAdvantage = 1.2;
      result.advantageLabel = 'Batter Advantage (Opposite Hand)';
    }
  }
  
  // Store handedness advantage in details
  result.details.handednessAdvantage = handednessAdvantage;
  
  // Consider pitcher's arsenal (if available)
  let pitchTypeAdvantage = 0;
  if (pitcher.pitches && pitcher.pitches.length > 0) {
    // Simplified logic - in a real implementation, you would match pitch types
    // against batter's historical performance vs pitch types
    const hasFastball = pitcher.pitches.some(p => ['FF', 'FT', 'SI', 'FC'].includes(p));
    const hasBreakingBall = pitcher.pitches.some(p => ['SL', 'CU', 'KC'].includes(p));
    const hasOffspeed = pitcher.pitches.some(p => ['CH', 'FS', 'FO'].includes(p));
    
    // Balanced arsenal is generally more effective
    if (hasFastball && hasBreakingBall && hasOffspeed) {
      pitchTypeAdvantage = -0.8; // Advantage to pitcher
    } else if (hasFastball && (hasBreakingBall || hasOffspeed)) {
      pitchTypeAdvantage = -0.4; // Slight advantage to pitcher
    } else {
      pitchTypeAdvantage = 0.5; // Limited arsenal gives advantage to batter
    }
  }
  
  // Store pitch type advantage in details
  result.details.pitchTypeAdvantage = pitchTypeAdvantage;
  
  // Add all advantage factors
  const totalAdvantage = handednessAdvantage + pitchTypeAdvantage;
  result.advantage = totalAdvantage;
  
  // Adjust label based on final advantage
  if (totalAdvantage > 2) {
    result.advantageLabel = 'Strong Batter Advantage';
  } else if (totalAdvantage > 1) {
    result.advantageLabel = 'Batter Advantage';
  } else if (totalAdvantage > 0.3) {
    result.advantageLabel = 'Slight Batter Advantage';
  } else if (totalAdvantage > -0.3) {
    result.advantageLabel = 'Neutral Matchup';
  } else if (totalAdvantage > -1) {
    result.advantageLabel = 'Slight Pitcher Advantage';
  } else if (totalAdvantage > -2) {
    result.advantageLabel = 'Pitcher Advantage';
  } else {
    result.advantageLabel = 'Strong Pitcher Advantage';
  }
  
  // Calculate potentials based on advantage
  result.hitPotential = calculatePotential(totalAdvantage, 0);
  result.hrPotential = calculatePotential(totalAdvantage, -0.8); // HRs are harder
  result.tbPotential = calculatePotential(totalAdvantage, -0.3); // Total bases
  result.kPotential = calculatePotential(-totalAdvantage, -0.2); // Strikeouts (inverse of batter advantage)
  
  return result;
};

/**
 * Calculate potential rating based on advantage score
 * @param {number} advantage - Advantage score
 * @param {number} adjustment - Adjustment to the baseline
 * @returns {string} Potential rating (Low, Medium, High)
 */
const calculatePotential = (advantage, adjustment = 0) => {
  const adjustedAdvantage = advantage + adjustment;
  
  if (adjustedAdvantage > 1.5) return 'High';
  if (adjustedAdvantage > 0) return 'Medium';
  return 'Low';
};

/**
 * Get descriptive explanation of the matchup
 * @param {Object} analysis - Analysis result from analyzeBatterPitcherMatchup
 * @returns {string} Descriptive explanation
 */
export const getMatchupExplanation = (analysis) => {
  const { advantageLabel, details } = analysis;
  
  let explanation = `This is a ${advantageLabel.toLowerCase()} matchup. `;
  
  if (details.handednessAdvantage > 0) {
    explanation += 'The batter has a handedness advantage. ';
  } else if (details.handednessAdvantage < 0) {
    explanation += 'The pitcher has a handedness advantage. ';
  }
  
  if (details.pitchTypeAdvantage > 0) {
    explanation += 'The pitcher\'s arsenal may favor the batter. ';
  } else if (details.pitchTypeAdvantage < 0) {
    explanation += 'The pitcher has an effective arsenal against this batter. ';
  }
  
  return explanation;
};