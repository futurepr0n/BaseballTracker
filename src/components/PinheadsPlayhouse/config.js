/**
 * Configuration settings for the Baseball HR Prediction System (JavaScript version).
 * Direct port from config.py to ensure calculation consistency.
 */

// Years to analyze
export const YEARS = [2022, 2023, 2024, 2025];

// Data path
export const DATA_PATH = "/data/";

// Thresholds
export const K_CONFIDENCE_PA = 100;  // Plate appearances needed for full confidence in stats
export const K_PA_THRESHOLD_FOR_LEAGUE_AVG = 30;  // Min PA to be included in league average calculation
export const K_PA_WARNING_THRESHOLD = 50;  // Min PA threshold before showing a warning
export const MIN_RECENT_PA_FOR_CONTACT_EVAL = 20;  // Min PA in recent games to evaluate contact trends
export const DEFAULT_EXPECTED_H_PER_HR = 10.0;  // Approx 1 HR every 10 hits as a fallback

// Default league average stats (fallback values if calculation fails)
export const LEAGUE_AVERAGE_STATS = {
    AVG: 0.245, 
    SLG: 0.400, 
    ISO: 0.155,
    AVG_K_PERCENT: 0.22, 
    AVG_BB_PERCENT: 0.08,
    AVG_HARD_HIT_PERCENT: 0.35, 
    AVG_BRL_PERCENT: 0.06,  // Barrel % of BBE
    AVG_BRL_PA_PERCENT: 0.035  // Barrel % of PA
};

// Factor weights for HR likelihood score calculation
export const WEIGHTS = {
    // Batter vs pitch type
    batter_vs_pitch_slg: 1.5, 
    batter_vs_pitch_hr: 2.0, 
    batter_vs_pitch_hard_hit: 1.0,
    
    // Batted ball profile
    batter_batted_ball_fb: 0.8, 
    batter_batted_ball_pull_air: 1.2,
    
    // Pitcher vulnerability
    pitcher_vulnerability_slg: 1.2, 
    pitcher_vulnerability_hr: 1.8, 
    pitcher_vulnerability_hard_hit: 0.8,
    pitcher_run_value_penalty: 1.0,
    
    // Batter overall quality
    batter_overall_brl_percent: 2.5, 
    batter_overall_hard_hit: 1.2, 
    batter_overall_iso: 1.5,
    
    // Pitcher overall vulnerability
    pitcher_overall_brl_percent_allowed: 2.0, 
    pitcher_overall_hard_hit_allowed: 1.0,
    
    // Historical factors
    historical_trend_bonus: 0.7, 
    historical_consistency_bonus: 0.3,
    
    // Recent performance
    recent_performance_bonus: 1.5,
    
    // Contextual factors
    ev_matchup_bonus: 1.0,
    due_for_hr_factor: 0.5,         // AB-based due factor
    due_for_hr_hits_factor: 0.3,    // Hits-based due factor
    heating_up_contact_factor: 0.4, // Bonus if high contact, low recent HR
    cold_batter_factor: 0.4,        // Penalty if very low recent contact
    
    // Pitch-specific factors
    hitter_pitch_rv_advantage: 0.8, 
    hitter_pitch_k_avoidance: 0.4,
    pitcher_pitch_k_ability: 0.4,
    
    // Year-over-year trend
    trend_2025_vs_2024_bonus: 0.8,
};

// Component weights for final score
export const W_ARSENAL_MATCHUP = 0.40;    // Weight for arsenal matchup component
export const W_BATTER_OVERALL = 0.15;     // Weight for batter overall quality component
export const W_PITCHER_OVERALL = 0.10;    // Weight for pitcher overall vulnerability component
export const W_HISTORICAL_YOY_CSV = 0.05; // Weight for historical year-over-year trends component
export const W_RECENT_DAILY_GAMES = 0.10; // Weight for recent performance component
export const W_CONTEXTUAL = 0.20;         // Weight for contextual factors component

// Metric ranges for normalization (will be calculated dynamically)
export const DEFAULT_METRIC_RANGES = {
    slg: { min: 0.250, max: 0.650 }, 
    iso: { min: 0.050, max: 0.350 },
    hard_hit_percent: { min: 0.20, max: 0.60 }, 
    brl_percent: { min: 0.02, max: 0.20 },
    fb_rate: { min: 0.1, max: 0.6 },
    pull_air_rate: { min: 0.1, max: 0.6 },
    woba: { min: 0.1, max: 0.6 },
    hr: { min: 0, max: 25 },
    run_value_per_100: { min: -10, max: 10 },
    pitch_usage: { min: 0, max: 100 },
    k_rate: { min: 0.05, max: 0.5 },
    hit_rate: { min: 0.1, max: 0.5 },
    hr_rate: { min: 0.0, max: 0.15 },
    obp: { min: 0.2, max: 0.5 }
};