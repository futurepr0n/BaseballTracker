/**
 * Player Badge System
 * Defines badge types, emojis, and scoring system for dashboard integration
 */

// Badge definitions with emojis and descriptions
export const BADGE_TYPES = {
  HOT_STREAK: {
    emoji: '🔥',
    label: 'Hot Streak',
    description: 'Player has an active hitting streak of 8+ games',
    confidenceBoost: 15,
    priority: 1
  },
  ACTIVE_STREAK: {
    emoji: '🔥',
    label: 'Active Streak', 
    description: 'Player has an active hitting streak of 5-7 games',
    confidenceBoost: 10,
    priority: 2
  },
  DUE_FOR_HR: {
    emoji: '⚡',
    label: 'Due for HR',
    description: 'Player is in top 5 HR predictions',
    confidenceBoost: 12,
    priority: 1
  },
  HR_CANDIDATE: {
    emoji: '⚡',
    label: 'HR Candidate',
    description: 'Player is in top 15 HR predictions',
    confidenceBoost: 8,
    priority: 3
  },
  LIKELY_HIT: {
    emoji: '📈',
    label: 'Likely Hit',
    description: 'Player appears in likely to hit predictions',
    confidenceBoost: 8,
    priority: 2
  },
  MULTI_HIT: {
    emoji: '🎯',
    label: 'Multi-Hit',
    description: 'Player is candidate for multiple hits',
    confidenceBoost: 10,
    priority: 2
  },
  RISK: {
    emoji: '⚠️',
    label: 'Risk',
    description: 'Player identified as poor performance risk',
    confidenceBoost: -15,
    priority: 1
  },
  HOME_ADVANTAGE: {
    emoji: '🏠',
    label: 'Home Advantage',
    description: 'Player performs well at home venue',
    confidenceBoost: 6,
    priority: 4
  },
  TIME_SLOT: {
    emoji: '⏰',
    label: 'Time Slot',
    description: 'Player favors current game time slot',
    confidenceBoost: 5,
    priority: 4
  },
  MATCHUP_EDGE: {
    emoji: '🆚',
    label: 'Matchup Edge',
    description: 'Player has strong historical performance vs opponent',
    confidenceBoost: 8,
    priority: 3
  },
  BOUNCE_BACK: {
    emoji: '📉',
    label: 'Bounce Back',
    description: 'Player due to break out of hitting slump',
    confidenceBoost: 7,
    priority: 3
  },
  IMPROVED_FORM: {
    emoji: '📊',
    label: 'Improved Form',
    description: 'Player showing recent improvement in performance',
    confidenceBoost: 6,
    priority: 4
  },
  // Stadium Context Badges
  LAUNCH_PAD: {
    emoji: '🚀',
    label: 'Launch Pad',
    description: 'Playing at extreme hitter-friendly stadium',
    confidenceBoost: 12,
    priority: 2
  },
  HITTER_PARADISE: {
    emoji: '🏟️',
    label: 'Hitter Paradise',
    description: 'Playing at hitter-friendly stadium',
    confidenceBoost: 8,
    priority: 3
  },
  PITCHER_FORTRESS: {
    emoji: '🛡️',
    label: 'Pitcher Fortress',
    description: 'Playing at extreme pitcher-friendly stadium',
    confidenceBoost: -10,
    priority: 2
  },
  PITCHER_FRIENDLY: {
    emoji: '⚾',
    label: 'Pitcher Park',
    description: 'Playing at pitcher-friendly stadium',
    confidenceBoost: -6,
    priority: 3
  },
  // Weather Context Badges
  WIND_BOOST: {
    emoji: '🌪️',
    label: 'Wind Boost',
    description: 'Strong favorable wind for home runs',
    confidenceBoost: 10,
    priority: 2
  },
  WIND_HELPER: {
    emoji: '💨',
    label: 'Wind Helper',
    description: 'Favorable wind conditions',
    confidenceBoost: 6,
    priority: 3
  },
  HOT_WEATHER: {
    emoji: '🔥',
    label: 'Hot Weather',
    description: 'Hot weather helps ball carry',
    confidenceBoost: 5,
    priority: 4
  },
  DOME_GAME: {
    emoji: '🏟️',
    label: 'Dome Game',
    description: 'Indoor stadium - controlled conditions',
    confidenceBoost: 0,
    priority: 5
  },
  COLD_WEATHER: {
    emoji: '🥶',
    label: 'Cold Weather',
    description: 'Cold weather reduces ball flight',
    confidenceBoost: -8,
    priority: 3
  },
  WIND_AGAINST: {
    emoji: '🌬️',
    label: 'Wind Against',
    description: 'Unfavorable wind conditions',
    confidenceBoost: -6,
    priority: 3
  },
  // Multi-Hit Context Badges
  MULTI_HIT_SPECIALIST: {
    emoji: '🎯',
    label: 'Multi-Hit Pro',
    description: 'High multi-hit rate this season',
    confidenceBoost: 8,
    priority: 3
  },
  DUE_MULTI_HIT: {
    emoji: '📈',
    label: 'Due Multi-Hit',
    description: 'Due for multi-hit game based on patterns',
    confidenceBoost: 6,
    priority: 4
  },
  MULTI_HIT_STREAK: {
    emoji: '🔥',
    label: 'Multi-Hit Streak',
    description: 'Recent multi-hit performance',
    confidenceBoost: 7,
    priority: 3
  }
};

// Special bonus calculations
export const SPECIAL_BONUSES = {
  MULTI_CARD_3: {
    threshold: 3,
    bonus: 20,
    description: 'Appears in 3+ dashboard cards'
  },
  MULTI_CARD_4: {
    threshold: 4,
    bonus: 30,
    description: 'Appears in 4+ dashboard cards'
  },
  TOP_5_HR: {
    bonus: 15,
    description: 'Top 5 in HR predictions'
  },
  ELITE_STREAK: {
    threshold: 7,
    bonus: 18,
    description: 'Active 7+ game hit streak'
  }
};

/**
 * Badge Manager Class
 */
export class BadgeManager {
  constructor() {
    this.badges = BADGE_TYPES;
    this.bonuses = SPECIAL_BONUSES;
  }

  /**
   * Create a badge object
   * @param {string} type - Badge type key
   * @param {Object} data - Additional data for the badge
   * @returns {Object} Badge object
   */
  createBadge(type, data = {}) {
    const badgeType = this.badges[type];
    if (!badgeType) {
      console.warn(`Unknown badge type: ${type}`);
      return null;
    }

    return {
      type,
      emoji: badgeType.emoji,
      label: badgeType.label,
      description: badgeType.description,
      confidenceBoost: badgeType.confidenceBoost,
      priority: badgeType.priority,
      ...data
    };
  }

  /**
   * Format badge for display
   * @param {Object} badge - Badge object
   * @returns {string} Formatted badge string
   */
  formatBadge(badge) {
    if (!badge) return '';
    return `${badge.emoji} ${badge.label}`;
  }

  /**
   * Sort badges by priority
   * @param {Array} badges - Array of badge objects
   * @returns {Array} Sorted badges
   */
  sortBadges(badges) {
    return badges.sort((a, b) => {
      // First sort by priority (lower number = higher priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Then sort by confidence boost (higher boost first)
      return Math.abs(b.confidenceBoost) - Math.abs(a.confidenceBoost);
    });
  }

  /**
   * Calculate total confidence boost from badges
   * @param {Array} badges - Array of badge objects
   * @returns {number} Total confidence boost
   */
  calculateConfidenceBoost(badges) {
    if (!badges || badges.length === 0) return 0;

    let totalBoost = badges.reduce((sum, badge) => {
      return sum + (badge.confidenceBoost || 0);
    }, 0);

    // Apply special bonuses
    const badgeCount = badges.length;
    
    // Multi-card appearance bonus
    if (badgeCount >= this.bonuses.MULTI_CARD_4.threshold) {
      totalBoost += this.bonuses.MULTI_CARD_4.bonus;
    } else if (badgeCount >= this.bonuses.MULTI_CARD_3.threshold) {
      totalBoost += this.bonuses.MULTI_CARD_3.bonus;
    }

    return totalBoost;
  }

  /**
   * Get standout score based on badges and base score
   * @param {number} baseScore - Base API score
   * @param {Array} badges - Array of badge objects
   * @returns {Object} Standout score details
   */
  getStandoutScore(baseScore, badges) {
    const confidenceBoost = this.calculateConfidenceBoost(badges);
    const standoutScore = baseScore + confidenceBoost;
    
    return {
      baseScore,
      confidenceBoost,
      standoutScore,
      badgeCount: badges.length,
      isStandout: badges.length >= 2 || confidenceBoost >= 15
    };
  }

  /**
   * Categorize player based on badges
   * @param {Array} badges - Array of badge objects
   * @param {number} baseScore - Base API score
   * @returns {Object} Player category
   */
  categorizePlayer(badges, baseScore) {
    const badgeCount = badges.length;
    const confidenceBoost = this.calculateConfidenceBoost(badges);
    const hasRisk = badges.some(badge => badge.type === 'RISK');
    const hasHotStreak = badges.some(badge => ['HOT_STREAK', 'ACTIVE_STREAK'].includes(badge.type));
    const hasHRPotential = badges.some(badge => ['DUE_FOR_HR', 'HR_CANDIDATE'].includes(badge.type));
    
    // Risk Warning: Has risk factors (highest priority)
    if (hasRisk) {
      return {
        category: 'risk',
        label: 'Risk Warning',
        description: 'Proceed with caution'
      };
    }
    
    // High Confidence: High base score + dashboard support
    if (baseScore >= 70 && confidenceBoost >= 10) {
      return {
        category: 'high_confidence',
        label: 'High Confidence',
        description: 'Strong metrics with dashboard support'
      };
    }
    
    // Hidden Gem: Lower base score but strong dashboard presence
    if (baseScore < 70 && badgeCount >= 2 && confidenceBoost >= 8) {
      return {
        category: 'hidden_gem',
        label: 'Hidden Gem',
        description: 'High dashboard context, potentially undervalued'
      };
    }
    
    // Hot Hand: Active hitting streaks
    if (hasHotStreak) {
      return {
        category: 'hot_hand',
        label: 'Hot Hand',
        description: 'Currently on a hitting streak'
      };
    }
    
    // Power Play: HR potential
    if (hasHRPotential) {
      return {
        category: 'power_play',
        label: 'Power Play',
        description: 'Strong home run potential'
      };
    }
    
    // Situational Star: Strong in specific contexts or multiple badges
    if (badgeCount >= 2 || badges.some(badge => ['TIME_SLOT', 'MATCHUP_EDGE', 'HOME_ADVANTAGE'].includes(badge.type))) {
      return {
        category: 'situational',
        label: 'Situational Star',
        description: 'Strong contextual advantages'
      };
    }
    
    // Enhanced: Has any dashboard context
    if (badgeCount > 0 || confidenceBoost > 0) {
      return {
        category: 'enhanced',
        label: 'Enhanced',
        description: 'Additional context available'
      };
    }
    
    // Standard: No additional context
    return {
      category: 'standard',
      label: 'Standard',
      description: 'Base analysis only'
    };
  }

  /**
   * Generate tooltip content for badges
   * @param {Array} badges - Array of badge objects
   * @returns {string} HTML tooltip content
   */
  generateTooltipContent(badges) {
    if (!badges || badges.length === 0) {
      return 'No dashboard context available';
    }

    const sortedBadges = this.sortBadges(badges);
    const tooltipLines = sortedBadges.map(badge => 
      `${badge.emoji} ${badge.label}: ${badge.description}`
    );

    const confidenceBoost = this.calculateConfidenceBoost(badges);
    tooltipLines.push(`\nTotal Confidence Boost: ${confidenceBoost > 0 ? '+' : ''}${confidenceBoost}%`);

    return tooltipLines.join('\n');
  }
}

// Export singleton instance
export const badgeManager = new BadgeManager();
export default badgeManager;