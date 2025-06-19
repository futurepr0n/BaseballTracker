# Baseball Statistics Documentation

This document provides comprehensive definitions and explanations for all statistical abbreviations and metrics found in the BaseballTracker CSV files. This reference helps AI agents and analysts understand the meaning and context of each statistic in Major League Baseball analytics.

## File Structure

Statistical CSV files are located in `/BaseballTracker/public/data/stats/` and organized by category and year.

## Custom Statistics Files

### custom_batter_2025.csv
**Comprehensive batting statistics with 160+ metrics**

#### Player Identification
- `last_name, first_name` - Player name
- `player_id` - Unique player identifier
- `year` - Season year
- `player_age` - Player's age during season

#### Basic Batting Statistics
- `ab` - At Bats (official plate appearances excluding walks, HBP, sacrifices)
- `pa` - Plate Appearances (total times batting)
- `hit` - Total hits (any safe arrival at base via batted ball)
- `single` - Single base hits
- `double` - Two-base hits
- `triple` - Three-base hits
- `home_run` - Home runs (four-base hits over fence)
- `strikeout` - Strikeouts (three strikes or swing-and-miss on third strike)
- `walk` - Base on balls (four balls)
- `k_percent` - Strikeout percentage (strikeouts / plate appearances)
- `bb_percent` - Walk percentage (walks / plate appearances)

#### Traditional Rate Statistics
- `batting_avg` - Batting Average (hits / at bats)
- `slg_percent` - Slugging Percentage (total bases / at bats)
- `on_base_percent` - On Base Percentage (times on base / plate appearances)
- `on_base_plus_slg` - OPS (On Base + Slugging percentages)
- `isolated_power` - ISO (Slugging - Batting Average, measures extra base power)
- `babip` - Batting Average on Balls In Play (hits on balls in play / balls in play)

#### Advanced Counting Stats
- `b_rbi` - Runs Batted In
- `b_lob` - Left On Base
- `b_total_bases` - Total bases accumulated
- `r_total_stolen_base` - Stolen bases
- `r_total_caught_stealing` - Caught stealing
- `b_ab_scoring` - At bats that resulted in runs scored

#### Pitch-by-Pitch Outcomes
- `b_ball` - Balls taken
- `b_called_strike` - Called strikes
- `b_foul` - Foul balls
- `b_foul_tip` - Foul tips caught by catcher
- `b_swinging_strike` - Swinging strikes
- `b_hit_by_pitch` - Hit by pitch
- `b_intent_walk` - Intentional walks

#### Batted Ball Types
- `b_hit_ground` - Ground balls hit
- `b_hit_fly` - Fly balls hit
- `b_hit_line_drive` - Line drives hit
- `b_hit_popup` - Pop ups hit
- `b_hit_into_play` - Total balls put into play

#### Batted Ball Outcomes
- `b_out_ground` - Ground ball outs
- `b_out_fly` - Fly ball outs
- `b_out_line_drive` - Line drive outs
- `b_out_popup` - Pop up outs

#### Situational Statistics
- `b_gnd_into_dp` - Grounded into double plays
- `b_sac_bunt` - Sacrifice bunts
- `b_sac_fly` - Sacrifice flies
- `b_pinch_hit` - Pinch hit appearances
- `b_walkoff` - Walk-off situations

#### Expected Statistics (Statcast)
- `xba` - Expected Batting Average (based on exit velocity and launch angle)
- `xslg` - Expected Slugging Percentage
- `woba` - Weighted On Base Average (values different offensive events)
- `xwoba` - Expected Weighted On Base Average
- `xobp` - Expected On Base Percentage
- `xiso` - Expected Isolated Power
- `wobacon` - wOBA on Contact
- `xwobacon` - Expected wOBA on Contact
- `bacon` - Batting Average on Contact
- `xbacon` - Expected Batting Average on Contact

#### Expected vs Actual Differentials
- `xbadiff` - Difference between actual and expected batting average
- `xslgdiff` - Difference between actual and expected slugging
- `wobadiff` - Difference between actual and expected wOBA

#### Swing Metrics (Hawk-Eye)
- `avg_swing_speed` - Average bat speed at impact
- `fast_swing_rate` - Percentage of fastest swings
- `blasts_contact` - Hard contact events
- `blasts_swing` - Swing attempts with maximum effort
- `squared_up_contact` - Optimal bat-to-ball contact
- `squared_up_swing` - Swings with optimal mechanics
- `avg_swing_length` - Average length of swing path
- `swords` - Swing decisions (advanced metric)
- `attack_angle` - Bat angle at contact
- `attack_direction` - Swing direction relative to pitch
- `ideal_angle_rate` - Percentage of swings with optimal angle
- `vertical_swing_path` - Vertical component of swing plane

#### Exit Velocity and Launch Angle
- `exit_velocity_avg` - Average speed of batted ball off bat
- `launch_angle_avg` - Average angle of batted ball trajectory
- `sweet_spot_percent` - Percentage of balls hit at optimal launch angle (8-32°)
- `barrel` - Count of "barreled" balls (optimal exit velocity + launch angle combo)
- `barrel_batted_rate` - Percentage of batted balls that were barrels
- `avg_best_speed` - Average of hardest hit balls
- `avg_hyper_speed` - Average of top-tier exit velocities

#### Quality of Contact Categories
- `solidcontact_percent` - Well-struck balls percentage
- `flareburner_percent` - Weakly hit balls that fall for hits
- `poorlyunder_percent` - Balls hit with poor contact underneath
- `poorlytopped_percent` - Balls hit with poor contact on top
- `poorlyweak_percent` - Weak contact percentage
- `hard_hit_percent` - Percentage of balls hit 95+ mph

#### Plate Discipline Metrics
- `z_swing_percent` - Swing rate on pitches in strike zone
- `z_swing_miss_percent` - Miss rate on swings in zone
- `oz_swing_percent` - Swing rate on pitches outside zone
- `oz_swing_miss_percent` - Miss rate on swings outside zone
- `oz_contact_percent` - Contact rate on pitches outside zone
- `iz_contact_percent` - Contact rate on pitches in zone
- `whiff_percent` - Overall swing-and-miss rate
- `swing_percent` - Overall swing rate
- `meatball_swing_percent` - Swing rate on hittable pitches
- `meatball_percent` - Percentage of hittable pitches seen

#### Zone and Edge Metrics
- `out_zone_swing_miss` - Misses on pitches outside zone
- `out_zone_swing` - Swings on pitches outside zone
- `out_zone_percent` - Percentage of pitches outside zone
- `out_zone` - Count of pitches outside zone
- `in_zone_swing_miss` - Misses on pitches in zone
- `in_zone_swing` - Swings on pitches in zone
- `in_zone_percent` - Percentage of pitches in zone
- `in_zone` - Count of pitches in zone
- `edge_percent` - Percentage of pitches on zone edge
- `edge` - Count of pitches on zone edge

#### Pitch Mix Faced
- `pitch_count_offspeed` - Offspeed pitches faced
- `pitch_count_fastball` - Fastballs faced
- `pitch_count_breaking` - Breaking balls faced
- `pitch_count` - Total pitches faced
- `f_strike_percent` - First strike percentage

#### Batted Ball Direction
- `pull_percent` - Percentage of balls pulled
- `straightaway_percent` - Percentage hit to center field
- `opposite_percent` - Percentage hit to opposite field
- `batted_ball` - Total batted balls

#### Batted Ball Types (Detailed)
- `groundballs_percent` - Ground ball percentage
- `groundballs` - Ground ball count
- `flyballs_percent` - Fly ball percentage
- `flyballs` - Fly ball count
- `linedrives_percent` - Line drive percentage
- `linedrives` - Line drive count
- `popups_percent` - Pop up percentage
- `popups` - Pop up count

#### Baserunning Metrics
- `pop_2b_sba_count` - Stolen base attempts to second
- `pop_2b_sba` - Stolen base attempt rate to second
- `pop_2b_sb` - Successful steals to second
- `pop_2b_cs` - Caught stealing to second
- `pop_3b_sba_count` - Stolen base attempts to third
- `pop_3b_sba` - Stolen base attempt rate to third
- `pop_3b_sb` - Successful steals to third
- `pop_3b_cs` - Caught stealing to third
- `r_stolen_base_pct` - Stolen base success percentage

#### Speed and Defense Metrics
- `hp_to_1b` - Home to first base time
- `sprint_speed` - Maximum sprint speed (ft/sec)
- `n_outs_above_average` - Defensive outs above average

#### Defensive Star Ratings
- `n_5star_percent` - Percentage of 5-star defensive plays
- `n_4star_percent` - Percentage of 4-star defensive plays
- `n_3star_percent` - Percentage of 3-star defensive plays
- `n_2star_percent` - Percentage of 2-star defensive plays
- `n_1star_percent` - Percentage of 1-star defensive plays

### custom_pitcher_2025.csv
**Comprehensive pitching statistics with 280+ metrics**

#### Basic Pitching Statistics
- `p_game` - Games pitched
- `p_formatted_ip` - Innings pitched (formatted as X.Y)
- `p_earned_run` - Earned runs allowed
- `p_run` - Total runs allowed
- `p_save` - Saves recorded
- `p_blown_save` - Blown saves
- `p_out` - Outs recorded
- `p_win` - Wins
- `p_loss` - Losses
- `p_wild_pitch` - Wild pitches
- `p_balk` - Balks
- `p_shutout` - Shutouts
- `p_era` - Earned Run Average
- `p_opp_batting_avg` - Opponent batting average
- `p_opp_on_base_avg` - Opponent on-base average

#### Advanced Pitching Metrics
- `p_quality_start` - Quality starts (6+ IP, 3 or fewer ER)
- `p_complete_game` - Complete games
- `p_game_finished` - Games finished
- `p_game_in_relief` - Relief appearances
- `p_starting_p` - Starting pitcher appearances
- `p_hold` - Holds recorded
- `p_run_support` - Run support received

#### Pickoff and Baserunner Control
- `p_pickoff_attempt_1b` - Pickoff attempts at first base
- `p_pickoff_attempt_2b` - Pickoff attempts at second base  
- `p_pickoff_attempt_3b` - Pickoff attempts at third base
- `p_pickoff_1b` - Successful pickoffs at first
- `p_pickoff_2b` - Successful pickoffs at second
- `p_pickoff_3b` - Successful pickoffs at third
- `p_total_pickoff` - Total successful pickoffs
- `p_total_pickoff_attempt` - Total pickoff attempts

#### Inherited Runners
- `p_inh_runner` - Inherited runners
- `p_inh_runner_scored` - Inherited runners who scored
- `p_beq_runner` - Bequeathed runners (left on base for next pitcher)
- `p_beq_runner_scored` - Bequeathed runners who scored

#### Pitch Arsenal Data
For each pitch type, the following metrics are recorded:
- **FF** - Four-seam Fastball
- **SL** - Slider  
- **CH** - Changeup
- **CU** - Curveball
- **SI** - Sinker/Two-seam Fastball
- **FC** - Cutter
- **FS** - Splitter
- **KN** - Knuckleball
- **ST** - Sweeper
- **SV** - Slurve
- **FO** - Forkball
- **SC** - Screwball

For each pitch type [PITCH]:
- `n_[PITCH]_formatted` - Number of pitches thrown
- `[PITCH]_avg_speed` - Average velocity (mph)
- `[PITCH]_avg_spin` - Average spin rate (rpm)
- `[PITCH]_avg_break_x` - Average horizontal break (inches)
- `[PITCH]_avg_break_z` - Average vertical break (inches)
- `[PITCH]_avg_break_z_induced` - Average induced vertical break (inches)
- `[PITCH]_avg_break` - Average total break (inches)
- `[PITCH]_range_speed` - Velocity range (max - min)

#### Pitch Categories
- `fastball_*` - Combined metrics for all fastball types (FF, SI)
- `breaking_*` - Combined metrics for breaking balls (SL, CU, ST, SV)
- `offspeed_*` - Combined metrics for offspeed pitches (CH, FS, FO, SC)

#### Pitch Grip and Release
- `pitch_hand` - Pitching hand (L/R)
- `arm_angle` - Release point arm angle
- `n` - Sample size for measurements

## Specialized Files

### Batted Ball Data Files
**Pattern**: `batters-batted-ball-bat-[L/R]-pitch-hand-[L/R]-[year].csv`

Tracks outcomes by handedness matchups:
- `id` - Player ID
- `name` - Player name
- `bbe` - Batted Ball Events
- `gb_rate` - Ground ball rate
- `air_rate` - Air ball rate (fly balls + line drives + pop ups)
- `fb_rate` - Fly ball rate
- `ld_rate` - Line drive rate  
- `pu_rate` - Pop up rate
- `pull_rate` - Pull rate (balls hit to pull side)
- `straight_rate` - Straight away rate (balls hit to center)
- `oppo_rate` - Opposite field rate
- `pull_gb_rate` - Pull rate on ground balls specifically
- `straight_gb_rate` - Straight away rate on ground balls
- `oppo_gb_rate` - Opposite field rate on ground balls
- `pull_air_rate` - Pull rate on air balls
- `straight_air_rate` - Straight away rate on air balls  
- `oppo_air_rate` - Opposite field rate on air balls

### Exit Velocity Files  
**Files**: `hitter_exit_velocity_[year].csv`, `pitcher_exit_velocity_[year].csv`

Exit velocity and launch metrics:
- `attempts` - Number of batted ball events tracked
- `avg_hit_angle` - Average launch angle (degrees)
- `anglesweetspotpercent` - Percentage in sweet spot launch angle range
- `max_hit_speed` - Maximum exit velocity recorded (mph)
- `avg_hit_speed` - Average exit velocity (mph)
- `ev50` - 50th percentile exit velocity
- `fbld` - Fly balls and line drives count
- `gb` - Ground balls count
- `max_distance` - Maximum batted ball distance (feet)
- `avg_distance` - Average batted ball distance (feet)  
- `avg_hr_distance` - Average home run distance (feet)
- `ev95plus` - Count of balls hit 95+ mph
- `ev95percent` - Percentage of balls hit 95+ mph
- `barrels` - Count of barreled balls
- `brl_percent` - Barrel percentage (barrels/batted ball events)
- `brl_pa` - Barrels per plate appearance

### Pitch Arsenal Performance Files
**Files**: `hitterpitcharsenalstats_[year].csv`, `pitcherarsenalstats_[year].csv`, `pitcherpitcharsenalstats_[year].csv`

Performance against specific pitch types:
- `team_name_alt` - Team abbreviation
- `pitch_type` - Pitch type code (FF, SL, CH, etc.)
- `pitch_name` - Full pitch name
- `run_value_per_100` - Run value per 100 pitches of this type
- `run_value` - Total run value generated/allowed
- `pitches` - Number of this pitch type thrown/faced
- `pitch_usage` - Usage rate (percentage of total pitches)
- `pa` - Plate appearances involving this pitch type
- `ba` - Batting average against this pitch
- `slg` - Slugging percentage against this pitch  
- `woba` - wOBA against this pitch
- `whiff_percent` - Swing and miss rate
- `k_percent` - Strikeout rate
- `put_away` - Put away rate (strikeouts on two-strike counts)
- `est_ba` - Estimated batting average
- `est_slg` - Estimated slugging percentage
- `est_woba` - Estimated wOBA
- `hard_hit_percent` - Hard hit percentage (95+ mph exit velocity)

### Betting Data Files
**Files**: `mlb-hr-odds.csv`, `mlb-hr-odds-history.csv`, `mlb-hr-odds-tracking.csv`

Home run prop betting information:
- `player_name` - Player name for prop bet
- `prop_type` - Type of prop (usually "To Hit a Home Run")
- `odds` - Betting odds (American format, e.g., +450)
- `last_updated` - Timestamp of last odds update

## Key Baseball Analytics Concepts

### Expected Statistics (xStats)
Based on Statcast data using exit velocity and launch angle to predict outcomes. Higher values indicate better underlying performance that may not be reflected in traditional stats due to luck or defense.

### Barrels
Optimal combination of exit velocity and launch angle that historically produces the best offensive outcomes. Generally requires 98+ mph exit velocity with launch angles between 26-30 degrees.

### Launch Angle
The vertical angle at which the ball leaves the bat. Sweet spot is typically 8-32 degrees. Lower angles produce ground balls, higher angles produce pop ups.

### Plate Discipline  
Metrics measuring a hitter's ability to identify balls and strikes. Good plate discipline involves swinging at strikes and taking balls.

### Pitch Movement
- **Break**: Total deviation from straight path due to spin and gravity
- **Induced Break**: Movement caused by spin, separate from gravity  
- **Horizontal Break**: Side-to-side movement
- **Vertical Break**: Up-and-down movement

### Quality of Contact
Classification system for batted balls based on exit velocity and launch angle combinations, ranging from poor contact to barrels.

This documentation provides the foundation for understanding all statistical metrics available in the BaseballTracker system.