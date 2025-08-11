// Reasoning Generator Service for Daily Matchup Analysis
// Generates comprehensive explanations for batting opportunities

/**
 * Generate comprehensive reasoning for a batting opportunity
 */
export const generateOpportunityReasoning = (opportunity, contextData = {}) => {
  const reasons = [];
  const { 
    component_breakdown = {},
    recent_performance = {},
    pitcher_stats = {},
    stadium_factors = {},
    weather_data = {}
  } = opportunity;

  // Analyze component breakdown for key insights
  if (component_breakdown) {
    reasons.push(...analyzeComponentBreakdown(component_breakdown));
  }

  // Add recent performance reasoning
  if (recent_performance) {
    reasons.push(...analyzeRecentPerformance(recent_performance, opportunity));
  }

  // Add pitcher vulnerability reasoning
  if (pitcher_stats) {
    reasons.push(...analyzePitcherVulnerabilities(pitcher_stats, opportunity));
  }

  // Add contextual factors
  if (opportunity.ab_since_last_hr !== undefined && opportunity.expected_ab_per_hr !== undefined) {
    reasons.push(...analyzeDueFactor(opportunity.ab_since_last_hr, opportunity.expected_ab_per_hr));
  }

  // Add stadium and weather factors if available
  if (stadium_factors.park_factor) {
    reasons.push(...analyzeStadiumFactors(stadium_factors));
  }

  if (weather_data.temperature || weather_data.wind_speed) {
    reasons.push(...analyzeWeatherFactors(weather_data));
  }

  // Add batting position reasoning if available
  if (opportunity.batting_position) {
    reasons.push(...analyzeBattingPosition(opportunity.batting_position, opportunity));
  }

  return {
    primary_reasons: reasons.slice(0, 3), // Top 3 most important
    supporting_factors: reasons.slice(3, 6), // Additional supporting evidence
    all_reasons: reasons,
    summary: generateSummary(reasons, opportunity)
  };
};

/**
 * Analyze component breakdown scores
 */
const analyzeComponentBreakdown = (breakdown) => {
  const reasons = [];
  
  // Arsenal matchup is the most heavily weighted (40%)
  if (breakdown.arsenal_matchup !== undefined) {
    if (breakdown.arsenal_matchup > 60) {
      reasons.push({
        type: 'arsenal_advantage',
        importance: 'high',
        text: `Strong matchup against pitcher's arsenal (${breakdown.arsenal_matchup.toFixed(1)} score)`,
        detail: 'Batter has demonstrated success against this pitcher\'s primary pitch types'
      });
    } else if (breakdown.arsenal_matchup < 30) {
      reasons.push({
        type: 'arsenal_weakness',
        importance: 'caution',
        text: `Struggles against pitcher's arsenal (${breakdown.arsenal_matchup.toFixed(1)} score)`,
        detail: 'Historical difficulty with this pitcher\'s pitch mix'
      });
    }
  }

  // Contextual factors (20% weight)
  if (breakdown.contextual !== undefined && breakdown.contextual > 55) {
    reasons.push({
      type: 'contextual_positive',
      importance: 'medium',
      text: `Favorable contextual factors (${breakdown.contextual.toFixed(1)} score)`,
      detail: 'Current conditions and matchup context favor the batter'
    });
  }

  // Batter overall quality (15% weight)
  if (breakdown.batter_overall !== undefined && breakdown.batter_overall > 60) {
    reasons.push({
      type: 'batter_quality',
      importance: 'medium',
      text: `Elite batter performance (${breakdown.batter_overall.toFixed(1)} score)`,
      detail: 'Consistently high-quality at-bats and power metrics'
    });
  }

  // Recent daily games (10% weight)
  if (breakdown.recent_daily_games !== undefined && breakdown.recent_daily_games > 55) {
    reasons.push({
      type: 'recent_hot',
      importance: 'medium',
      text: `Hot recent performance (${breakdown.recent_daily_games.toFixed(1)} score)`,
      detail: 'Strong performance in recent games indicates good timing'
    });
  }

  return reasons;
};

/**
 * Analyze recent performance trends
 */
const analyzeRecentPerformance = (recentPerf, opportunity) => {
  const reasons = [];

  if (recentPerf.hitting_streak && recentPerf.hitting_streak >= 5) {
    reasons.push({
      type: 'hot_streak',
      importance: 'high',
      text: `${recentPerf.hitting_streak}-game hitting streak`,
      detail: 'Consistent contact and confidence at the plate'
    });
  }

  if (recentPerf.last_10_avg && recentPerf.last_10_avg > 0.300) {
    reasons.push({
      type: 'recent_average',
      importance: 'medium',
      text: `Batting ${recentPerf.last_10_avg.toFixed(3)} in last 10 games`,
      detail: 'Above-average contact rate recently'
    });
  }

  if (recentPerf.last_10_hrs && recentPerf.last_10_hrs >= 3) {
    reasons.push({
      type: 'recent_power',
      importance: 'high',
      text: `${recentPerf.last_10_hrs} HRs in last 10 games`,
      detail: 'Demonstrating consistent power'
    });
  }

  return reasons;
};

/**
 * Analyze pitcher vulnerabilities
 */
const analyzePitcherVulnerabilities = (pitcherStats, opportunity) => {
  const reasons = [];

  if (pitcherStats.hr_per_9 && pitcherStats.hr_per_9 > 1.5) {
    reasons.push({
      type: 'pitcher_hr_prone',
      importance: 'high',
      text: `Pitcher allows ${pitcherStats.hr_per_9.toFixed(2)} HR/9`,
      detail: 'Above-average home run vulnerability'
    });
  }

  if (pitcherStats.whip && pitcherStats.whip > 1.4) {
    reasons.push({
      type: 'pitcher_control',
      importance: 'medium',
      text: `Pitcher has ${pitcherStats.whip.toFixed(2)} WHIP`,
      detail: 'Control issues lead to hittable pitches'
    });
  }

  if (pitcherStats.vs_hand_avg && pitcherStats.vs_hand_avg > 0.280) {
    reasons.push({
      type: 'handedness_advantage',
      importance: 'medium',
      text: `Pitcher allows .${Math.round(pitcherStats.vs_hand_avg * 1000)} vs ${opportunity.batter_hand}HB`,
      detail: 'Vulnerable to this handedness matchup'
    });
  }

  return reasons;
};

/**
 * Analyze due factor based on AB since last HR
 */
const analyzeDueFactor = (abSinceHR, expectedABPerHR) => {
  const reasons = [];

  if (abSinceHR > expectedABPerHR * 1.5) {
    reasons.push({
      type: 'overdue_hr',
      importance: 'high',
      text: `Overdue for HR (${abSinceHR} AB since last, expects every ${expectedABPerHR.toFixed(0)})`,
      detail: 'Statistical regression suggests increased probability'
    });
  } else if (abSinceHR < expectedABPerHR * 0.5) {
    reasons.push({
      type: 'recent_hr',
      importance: 'low',
      text: `Recent HR (${abSinceHR} AB ago)`,
      detail: 'Recently demonstrated power, confidence high'
    });
  }

  return reasons;
};

/**
 * Analyze stadium factors
 */
const analyzeStadiumFactors = (stadium) => {
  const reasons = [];

  if (stadium.park_factor > 1.1) {
    reasons.push({
      type: 'hitter_friendly',
      importance: 'medium',
      text: `Hitter-friendly park (${((stadium.park_factor - 1) * 100).toFixed(0)}% above average)`,
      detail: 'Stadium dimensions favor offense'
    });
  } else if (stadium.park_factor < 0.9) {
    reasons.push({
      type: 'pitcher_friendly',
      importance: 'caution',
      text: `Pitcher-friendly park (${((1 - stadium.park_factor) * 100).toFixed(0)}% below average)`,
      detail: 'Stadium suppresses offense'
    });
  }

  return reasons;
};

/**
 * Analyze weather factors
 */
const analyzeWeatherFactors = (weather) => {
  const reasons = [];

  if (weather.temperature > 85) {
    reasons.push({
      type: 'hot_weather',
      importance: 'low',
      text: `Hot conditions (${weather.temperature}°F)`,
      detail: 'Ball carries better in heat'
    });
  }

  if (weather.wind_speed > 10 && weather.wind_direction === 'out') {
    reasons.push({
      type: 'wind_assistance',
      importance: 'medium',
      text: `Wind blowing out at ${weather.wind_speed} mph`,
      detail: 'Favorable wind conditions for power'
    });
  }

  return reasons;
};

/**
 * Analyze batting position impact
 */
const analyzeBattingPosition = (position, opportunity) => {
  const reasons = [];

  if (position >= 3 && position <= 5) {
    reasons.push({
      type: 'heart_of_order',
      importance: 'medium',
      text: `Batting ${position}th in lineup`,
      detail: 'Heart of the order, RBI opportunities'
    });
  }

  if (position === 1 || position === 2) {
    reasons.push({
      type: 'table_setter',
      importance: 'low',
      text: `Leading off from ${position} spot`,
      detail: 'Focus on getting on base'
    });
  }

  return reasons;
};

/**
 * Generate a summary based on all reasons
 */
const generateSummary = (reasons, opportunity) => {
  if (reasons.length === 0) {
    return 'Limited data available for comprehensive analysis';
  }

  const highImportance = reasons.filter(r => r.importance === 'high');
  const cautions = reasons.filter(r => r.importance === 'caution');

  let summary = '';

  if (highImportance.length >= 2) {
    summary = `Strong opportunity based on ${highImportance[0].type.replace(/_/g, ' ')} and ${highImportance[1].type.replace(/_/g, ' ')}.`;
  } else if (highImportance.length === 1) {
    summary = `Opportunity driven primarily by ${highImportance[0].type.replace(/_/g, ' ')}.`;
  } else {
    summary = `Moderate opportunity based on multiple supporting factors.`;
  }

  if (cautions.length > 0) {
    summary += ` Note: ${cautions[0].text}`;
  }

  return summary;
};

/**
 * Format reasoning for display
 */
export const formatReasoningForDisplay = (reasoning) => {
  const { primary_reasons = [], supporting_factors = [], summary = '' } = reasoning;

  return {
    summary,
    primaryPoints: primary_reasons.map(r => ({
      text: r.text,
      detail: r.detail,
      importance: r.importance,
      icon: getReasonIcon(r.type)
    })),
    supportingPoints: supporting_factors.map(r => ({
      text: r.text,
      detail: r.detail,
      importance: r.importance,
      icon: getReasonIcon(r.type)
    }))
  };
};

/**
 * Get icon for reason type
 */
const getReasonIcon = (type) => {
  const iconMap = {
    'arsenal_advantage': '⚔️',
    'arsenal_weakness': '⚠️',
    'contextual_positive': '📊',
    'batter_quality': '⭐',
    'recent_hot': '🔥',
    'hot_streak': '🔥',
    'recent_average': '📈',
    'recent_power': '💪',
    'pitcher_hr_prone': '🎯',
    'pitcher_control': '🎲',
    'handedness_advantage': '🤝',
    'overdue_hr': '⚡',
    'recent_hr': '✅',
    'hitter_friendly': '🏟️',
    'pitcher_friendly': '🛡️',
    'hot_weather': '☀️',
    'wind_assistance': '🌬️',
    'heart_of_order': '💎',
    'table_setter': '🏃'
  };

  return iconMap[type] || '•';
};