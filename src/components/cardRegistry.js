/**
 * cardRegistry.js
 * This file contains the configuration for all dashboard cards
 */

// Define the registry of available dashboard cards
const cardRegistry = [
  {
    id: "stats-summary",
    title: "Daily Statistics",
    type: "stats-grid",
    priority: 10, // Higher priority cards appear first
    dataSource: null, // Uses props directly
    enabled: true,
    gridSpan: 1, // How many columns the card spans
    config: {
      items: [
        { key: "batterData.length", label: "Batters" },
        { key: "pitcherData.length", label: "Pitchers" },
        { key: "totalHomeRuns", label: "Home Runs" },
        { key: "totalHits", label: "Hits" },
        { key: "totalStrikeouts", label: "Pitcher K's" },
        { key: "totalInningsPitched", label: "Innings Pitched", format: "toFixed(1)" }
      ]
    }
  },
  {
    id: "weakspot-exploiters",
    title: "🎯 Weakspot Exploiters",
    type: "custom-component",
    priority: 9.5,
    component: "WeakspotExploitersCard",
    dataSource: null, // Uses currentDate prop
    enabled: true,
    gridSpan: 2, // Wider card for detailed table
    backgroundColor: "#0f1419",
    borderColor: "#ff4d4f",
    config: {
      description: "Today's lineup confirmed hitters who exploit opposing pitcher weaknesses"
    }
  },
  {
    id: "hr-prediction",
    title: "Players Due for Home Runs",
    type: "player-list",
    priority: 9,
    dataSource: "/data/predictions/hr_predictions_${dateStr}.json",
    fallbackSource: "/data/predictions/hr_predictions_latest.json",
    dataPath: "predictions",
    enabled: true,
    gridSpan: 1,
    config: {
      maxItems: 10,
      itemTemplate: [
        { type: "text", field: "fullName", fallback: "name", className: "player-name" },
        { type: "text", field: "team", className: "player-team" },
        { type: "stat", value: "${gamesSinceLastHR} games without HR", className: "hr-deficit" },
        { type: "stat", value: "Expected: ${expectedHRs.toFixed(1)} / Actual: ${actualHRs}", className: "hr-detail" },
        { type: "stat", value: "Last HR: ${daysSinceLastHR} days ago", className: "hr-detail" }
      ]
    }
  },
  {
    id: "top-hitters",
    title: "Top Hitters",
    type: "player-list",
    priority: 8,
    dataSource: null, // Uses rollingStats from props
    dataPath: "hitters",
    enabled: true,
    gridSpan: 1,
    config: {
      titleSuffix: "(${getTimePeriodText()})",
      maxItems: 5,
      itemTemplate: [
        { type: "text", field: "name", className: "player-name" },
        { type: "text", field: "team", className: "player-team" },
        { type: "stat", value: "${H} hits", className: "" },
        { type: "conditional", condition: "games > 1", 
          content: { type: "stat", value: "(${games} games)", className: "stat-note" } }
      ]
    }
  },
  {
    id: "hr-leaders",
    title: "Home Run Leaders",
    type: "player-list",
    priority: 7,
    dataSource: null, // Uses rollingStats from props
    dataPath: "homers",
    enabled: true,
    gridSpan: 1,
    config: {
      titleSuffix: "(${getTimePeriodText()})",
      maxItems: 5,
      itemTemplate: [
        { type: "text", field: "name", className: "player-name" },
        { type: "text", field: "team", className: "player-team" },
        { type: "stat", value: "${HR} HR", className: "" },
        { type: "conditional", condition: "games > 1", 
          content: { type: "stat", value: "(${games} games)", className: "stat-note" } }
      ]
    }
  },
  {
    id: "k-leaders",
    title: "Strikeout Leaders",
    type: "player-list",
    priority: 6,
    dataSource: null, // Uses rollingStats from props
    dataPath: "strikeouts",
    enabled: true,
    gridSpan: 1,
    showIfEmpty: false,
    config: {
      titleSuffix: "(${getTimePeriodText()})",
      maxItems: 5,
      itemTemplate: [
        { type: "text", field: "name", className: "player-name" },
        { type: "text", field: "team", className: "player-team" },
        { type: "stat", value: "${K} K", className: "" },
        { type: "conditional", condition: "games > 1", 
          content: { type: "stat", value: "(${games} games)", className: "stat-note" } }
      ]
    }
  },
  {
    id: "hr-rate",
    title: "Top HR Rate This Season",
    type: "player-list",
    priority: 5,
    dataSource: null, // Uses topPerformers from props
    dataPath: "hrRate",
    enabled: true,
    gridSpan: 1,
    showIfEmpty: false,
    config: {
      maxItems: 10,
      itemTemplate: [
        { type: "text", field: "fullName", fallback: "name", className: "player-name" },
        { type: "text", field: "team", className: "player-team" },
        { type: "stat", value: "${(homeRunsThisSeason / gamesPlayed).toFixed(3)} HR/G", className: "stat-highlight" },
        { type: "stat", value: "${homeRunsThisSeason} HR in ${gamesPlayed} games", className: "small" }
      ]
    }
  },
  {
    id: "day-of-week-hits",
    title: "${dayOfWeek} Hit Leaders",
    type: "player-list",
    priority: 4,
    dataSource: "/data/predictions/day_of_week_hits_${dateStr}.json",
    fallbackSource: "/data/predictions/day_of_week_hits_latest.json",
    dataPath: "topHitsByTotal",
    enabled: true,
    gridSpan: 1,
    backgroundColor: "#f8f4e5",
    borderColor: "#ffc107",
    config: {
      maxItems: 10,
      itemTemplate: [
        { type: "text", field: "name", className: "player-name" },
        { type: "text", field: "team", className: "player-team" },
        { type: "stat", value: "${hits} hits", className: "stat-highlight" },
        { type: "stat", value: "in ${games} ${dayOfWeek}s", className: "small" },
        { type: "stat", value: "(${(hitRate * 100).toFixed(1)}%)", className: "small" }
      ]
    }
  },
  {
    id: "hit-streak",
    title: "Current Hit Streaks",
    type: "player-list",
    priority: 3,
    dataSource: "/data/predictions/hit_streak_analysis_${dateStr}.json",
    fallbackSource: "/data/predictions/hit_streak_analysis_latest.json",
    dataPath: "hitStreaks",
    enabled: true,
    gridSpan: 1,
    backgroundColor: "#e6f7ff",
    borderColor: "#1890ff",
    config: {
      maxItems: 10,
      itemTemplate: [
        { type: "text", field: "name", className: "player-name" },
        { type: "text", field: "team", className: "player-team" },
        { type: "stat", value: "${currentStreak} games", className: "stat-highlight" },
        { type: "stat", value: "Avg streak: ${avgHitStreakLength.toFixed(1)}", className: "small" },
        { type: "stat", value: "Continue: ${(continuationProbability * 100).toFixed(1)}%", className: "small" }
      ]
    }
  },
  {
    id: "likely-to-hit",
    title: "Players Due for a Hit",
    type: "player-list",
    priority: 2,
    dataSource: "/data/predictions/hit_streak_analysis_${dateStr}.json",
    fallbackSource: "/data/predictions/hit_streak_analysis_latest.json",
    dataPath: "likelyToGetHit",
    enabled: true,
    gridSpan: 1,
    backgroundColor: "#f0f9eb",
    borderColor: "#52c41a",
    config: {
      maxItems: 10,
      itemTemplate: [
        { type: "text", field: "name", className: "player-name" },
        { type: "text", field: "team", className: "player-team" },
        { type: "stat", value: "${Math.abs(currentStreak)} games without hit", className: "stat-highlight" },
        { type: "stat", value: "Next game hit: ${(streakEndProbability * 100).toFixed(1)}%", className: "small" },
        { type: "stat", value: "Max drought: ${longestNoHitStreak} games", className: "small" }
      ]
    }
  },
  {
    id: "recent-updates",
    title: "Recent Updates",
    type: "updates-list",
    priority: 1,
    dataSource: null, // Generated dynamically
    enabled: true,
    gridSpan: 1,
    config: {
      updates: [
        { icon: "📊", text: "Statistics updated for ${formattedDate}" },
        { 
          icon: "🏆", 
          template: "${topPerformers.hrRate.length > 0 ? `${topPerformers.hrRate[0].fullName || topPerformers.hrRate[0].name} leads with ${topPerformers.hrRate[0].homeRunsThisSeason} home runs` : (rollingStats.homers.length > 0 ? `${rollingStats.homers[0].name} leads with ${rollingStats.homers[0].HR} home runs` : 'No home runs recorded recently')}"
        },
        {
          icon: "📈",
          template: "${topPerformers.overPerforming.length > 0 ? `${topPerformers.overPerforming[0].fullName || topPerformers.overPerforming[0].name} over-performing by ${topPerformers.overPerforming[0].performanceIndicator.toFixed(1)}%` : 'No performance indicators available'}"
        },
        { icon: "🔄", text: "Next update: Tomorrow at 12:00 AM" }
      ]
    }
  }
];

export default cardRegistry;