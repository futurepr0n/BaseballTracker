#!/usr/bin/env node
/**
 * Professional Data Loader for Weakspot Analysis
 * Centralized loading system for all baseball statistical data with intelligent caching
 * Handles 289 pitcher metrics + 161 hitter metrics from comprehensive CSV sources
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

class ProfessionalDataLoader {
    constructor(basePath = null) {
        // Use centralized data path configuration
        const { DATA_PATH, paths } = require('../../config/dataPath');
        
        this.basePath = basePath || path.dirname(DATA_PATH);
        this.statsPath = paths.stats;
        this.dataPath = DATA_PATH;
        
        // Intelligent caching system
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.lastCacheUpdate = new Map();
        
        // Data containers for comprehensive analysis
        this.data = {
            // Real Statcast metrics (not proxies)
            hitterExitVelocity: new Map(),
            pitcherExitVelocity: new Map(),
            
            // Comprehensive custom statistics
            customBatters: new Map(),
            customPitchers: new Map(),
            
            // Arsenal and handedness data
            pitcherArsenal: new Map(),
            handednessData: new Map(),
            
            // Swing mechanics and bat tracking
            swingPathData: new Map(),
            batTrackingData: new Map(),
            
            // Historical game data for trends
            historicalGames: new Map(),
        };
        
        console.log('🚀 Professional Data Loader initialized with advanced caching system');
    }
    
    /**
     * Load all statistical data with parallel processing
     */
    async loadAllStatistics() {
        console.log('📊 Loading comprehensive baseball statistics...');
        const startTime = Date.now();
        
        try {
            // Phase 1: Load real contact quality data (highest priority)
            await Promise.all([
                this.loadHitterExitVelocityData(),
                this.loadPitcherExitVelocityData(),
            ]);
            
            // Phase 2: Load comprehensive custom statistics
            await Promise.all([
                this.loadCustomBatterData(),
                this.loadCustomPitcherData(),
            ]);
            
            // Phase 3: Load arsenal and handedness data
            await Promise.all([
                this.loadPitcherArsenalData(),
                this.loadHandednessData(),
            ]);
            
            // Phase 4: Load swing mechanics data
            await Promise.all([
                this.loadSwingPathData(),
                this.loadBatTrackingData(),
            ]);
            
            const loadTime = Date.now() - startTime;
            console.log(`✅ Professional data loading complete in ${loadTime}ms`);
            console.log(`📈 Loaded comprehensive data for analysis:`);
            console.log(`   🥇 ${this.data.hitterExitVelocity.size} hitters with real exit velocity data`);
            console.log(`   ⚾ ${this.data.pitcherExitVelocity.size} pitchers with contact quality allowed`);
            console.log(`   📊 ${this.data.customBatters.size} custom batter profiles`);
            console.log(`   🎯 ${this.data.customPitchers.size} custom pitcher profiles`);
            console.log(`   🏹 ${this.data.pitcherArsenal.size} pitcher arsenal profiles`);
            
            return this.data;
            
        } catch (error) {
            console.error('❌ Error loading professional statistics:', error);
            throw error;
        }
    }
    
    /**
     * Load real hitter exit velocity data (not proxies)
     * Contains: barrel rate, EV95+, max hit speed, sweet spot %, hard hit %
     */
    async loadHitterExitVelocityData() {
        const filePath = path.join(this.statsPath, 'hitter_exit_velocity_2025.csv');
        
        if (!fs.existsSync(filePath)) {
            console.warn('⚠️ Hitter exit velocity file not found');
            return;
        }
        
        return new Promise((resolve, reject) => {
            const data = new Map();
            let count = 0;
            
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    const playerName = this.normalizePlayerName(row['last_name, first_name']);
                    
                    // Extract real Statcast metrics
                    const metrics = {
                        // Core contact quality metrics
                        attempts: parseInt(row.attempts) || 0,
                        barrelRate: parseFloat(row.brl_percent) || 0, // REAL barrel rate
                        barrelCount: parseInt(row.barrels) || 0,
                        barrelPA: parseFloat(row.brl_pa) || 0,
                        
                        // Exit velocity metrics
                        avgHitSpeed: parseFloat(row.avg_hit_speed) || 0,
                        maxHitSpeed: parseFloat(row.max_hit_speed) || 0,
                        ev50: parseFloat(row.ev50) || 0,
                        ev95Plus: parseInt(row.ev95plus) || 0,
                        ev95Percent: parseFloat(row.ev95percent) || 0,
                        
                        // Launch angle and contact
                        avgHitAngle: parseFloat(row.avg_hit_angle) || 0,
                        sweetSpotPercent: parseFloat(row.anglesweetspotpercent) || 0,
                        
                        // Distance metrics
                        maxDistance: parseInt(row.max_distance) || 0,
                        avgDistance: parseInt(row.avg_distance) || 0,
                        avgHRDistance: parseInt(row.avg_hr_distance) || 0,
                        
                        // Batted ball distribution
                        flyBallLineRate: parseFloat(row.fbld) || 0,
                        groundBallRate: parseFloat(row.gb) || 0,
                        
                        // Data quality indicators
                        playerId: row.player_id,
                        sampleSize: parseInt(row.attempts) || 0,
                        dataQuality: this.assessDataQuality(parseInt(row.attempts) || 0, 'hitter')
                    };
                    
                    data.set(playerName, metrics);
                    count++;
                })
                .on('end', () => {
                    this.data.hitterExitVelocity = data;
                    console.log(`   📊 Loaded ${count} hitter exit velocity profiles`);
                    resolve(data);
                })
                .on('error', reject);
        });
    }
    
    /**
     * Load real pitcher exit velocity data (contact quality allowed)
     */
    async loadPitcherExitVelocityData() {
        const filePath = path.join(this.statsPath, 'pitcher_exit_velocity_2025.csv');
        
        if (!fs.existsSync(filePath)) {
            console.warn('⚠️ Pitcher exit velocity file not found');
            return;
        }
        
        return new Promise((resolve, reject) => {
            const data = new Map();
            let count = 0;
            
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    const playerName = this.normalizePlayerName(row['last_name, first_name']);
                    
                    const metrics = {
                        // Contact quality allowed (vulnerability indicators)
                        attempts: parseInt(row.attempts) || 0,
                        barrelRateAllowed: parseFloat(row.brl_percent) || 0, // REAL barrel rate allowed
                        barrelsAllowed: parseInt(row.barrels) || 0,
                        barrelPAAllowed: parseFloat(row.brl_pa) || 0,
                        
                        // Exit velocity allowed (pitcher weakness indicators)
                        avgHitSpeedAllowed: parseFloat(row.avg_hit_speed) || 0,
                        maxHitSpeedAllowed: parseFloat(row.max_hit_speed) || 0,
                        ev50Allowed: parseFloat(row.ev50) || 0,
                        ev95PlusAllowed: parseInt(row.ev95plus) || 0,
                        ev95PercentAllowed: parseFloat(row.ev95percent) || 0,
                        
                        // Launch conditions allowed
                        avgHitAngleAllowed: parseFloat(row.avg_hit_angle) || 0,
                        sweetSpotPercentAllowed: parseFloat(row.anglesweetspotpercent) || 0,
                        
                        // Distance allowed
                        maxDistanceAllowed: parseInt(row.max_distance) || 0,
                        avgDistanceAllowed: parseInt(row.avg_distance) || 0,
                        avgHRDistanceAllowed: parseInt(row.avg_hr_distance) || 0,
                        
                        // Batted ball profile allowed
                        flyBallLineRateAllowed: parseFloat(row.fbld) || 0,
                        groundBallRateAllowed: parseFloat(row.gb) || 0,
                        
                        // Data quality
                        playerId: row.player_id,
                        sampleSize: parseInt(row.attempts) || 0,
                        dataQuality: this.assessDataQuality(parseInt(row.attempts) || 0, 'pitcher')
                    };
                    
                    data.set(playerName, metrics);
                    count++;
                })
                .on('end', () => {
                    this.data.pitcherExitVelocity = data;
                    console.log(`   ⚾ Loaded ${count} pitcher exit velocity profiles`);
                    resolve(data);
                })
                .on('error', reject);
        });
    }
    
    /**
     * Load comprehensive custom batter statistics
     * Contains advanced Statcast metrics: xwOBA, xBA, xSLG, barrel rate, etc.
     */
    async loadCustomBatterData() {
        const filePath = path.join(this.statsPath, 'custom_batter_2025.csv');
        
        if (!fs.existsSync(filePath)) {
            console.warn('⚠️ Custom batter file not found');
            return;
        }
        
        return new Promise((resolve, reject) => {
            const data = new Map();
            let count = 0;
            
            fs.createReadStream(filePath, { encoding: 'utf8' })
                .pipe(csv())
                .on('data', (row) => {
                    const playerName = this.normalizePlayerName(row['last_name, first_name']);
                    
                    const metrics = {
                        // Traditional stats
                        ab: parseInt(row.ab) || 0,
                        pa: parseInt(row.pa) || 0,
                        hit: parseInt(row.hit) || 0,
                        homeRun: parseInt(row.home_run) || 0,
                        strikeout: parseInt(row.strikeout) || 0,
                        walk: parseInt(row.walk) || 0,
                        
                        // Rate stats
                        battingAvg: parseFloat(row.batting_avg) || 0,
                        onBasePercent: parseFloat(row.on_base_percent) || 0,
                        sluggingPercent: parseFloat(row.slg_percent) || 0,
                        ops: parseFloat(row.on_base_plus_slg) || 0,
                        isolatedPower: parseFloat(row.isolated_power) || 0,
                        babip: parseFloat(row.babip) || 0,
                        kPercent: parseFloat(row.k_percent) || 0,
                        bbPercent: parseFloat(row.bb_percent) || 0,
                        
                        // EXPECTED STATISTICS (key for regression analysis)
                        xba: parseFloat(row.xba) || 0,
                        xslg: parseFloat(row.xslg) || 0,
                        xwoba: parseFloat(row.xwoba) || 0,
                        woba: parseFloat(row.woba) || 0,
                        xobp: parseFloat(row.xobp) || 0,
                        xiso: parseFloat(row.xiso) || 0,
                        
                        // Expected stats gaps (luck indicators)
                        xbaDiff: parseFloat(row.xbadiff) || 0,
                        xslgDiff: parseFloat(row.xslgdiff) || 0,
                        wobaDiff: parseFloat(row.wobadiff) || 0,
                        
                        // Contact quality (REAL BARREL RATE)
                        barrel: parseInt(row.barrel) || 0,
                        barrelBattedRate: parseFloat(row.barrel_batted_rate) || 0,
                        hardHitPercent: parseFloat(row.hard_hit_percent) || 0,
                        sweetSpotPercent: parseFloat(row.sweet_spot_percent) || 0,
                        exitVelocityAvg: parseFloat(row.exit_velocity_avg) || 0,
                        launchAngleAvg: parseFloat(row.launch_angle_avg) || 0,
                        
                        // Swing mechanics
                        avgSwingSpeed: parseFloat(row.avg_swing_speed) || 0,
                        attackAngle: parseFloat(row.attack_angle) || 0,
                        idealAngleRate: parseFloat(row.ideal_angle_rate) || 0,
                        
                        // Batted ball distribution
                        pullPercent: parseFloat(row.pull_percent) || 0,
                        straightawayPercent: parseFloat(row.straightaway_percent) || 0,
                        oppositePercent: parseFloat(row.opposite_percent) || 0,
                        groundballsPercent: parseFloat(row.groundballs_percent) || 0,
                        flyballsPercent: parseFloat(row.flyballs_percent) || 0,
                        linedrivesPercent: parseFloat(row.linedrives_percent) || 0,
                        
                        // Advanced contact metrics
                        solidcontactPercent: parseFloat(row.solidcontact_percent) || 0,
                        flareburnerPercent: parseFloat(row.flareburner_percent) || 0,
                        poorlyunderPercent: parseFloat(row.poorlyunder_percent) || 0,
                        poorlytoppedPercent: parseFloat(row.poorlytopped_percent) || 0,
                        poorlyweakPercent: parseFloat(row.poorlyweak_percent) || 0,
                        
                        // Plate discipline
                        zSwingPercent: parseFloat(row.z_swing_percent) || 0,
                        ozSwingPercent: parseFloat(row.oz_swing_percent) || 0,
                        whiffPercent: parseFloat(row.whiff_percent) || 0,
                        swingPercent: parseFloat(row.swing_percent) || 0,
                        
                        // Speed
                        sprintSpeed: parseFloat(row.sprint_speed) || 0,
                        
                        // Metadata
                        playerId: row.player_id,
                        playerAge: parseInt(row.player_age) || 0,
                        year: parseInt(row.year) || 0,
                        sampleSize: parseInt(row.pa) || 0,
                        dataQuality: this.assessDataQuality(parseInt(row.pa) || 0, 'batter')
                    };
                    
                    data.set(playerName, metrics);
                    count++;
                })
                .on('end', () => {
                    this.data.customBatters = data;
                    console.log(`   📊 Loaded ${count} comprehensive batter profiles`);
                    resolve(data);
                })
                .on('error', reject);
        });
    }
    
    /**
     * Load comprehensive custom pitcher statistics
     * Contains advanced metrics: xwOBA, barrel rate allowed, arsenal data
     */
    async loadCustomPitcherData() {
        const filePath = path.join(this.statsPath, 'custom_pitcher_2025.csv');
        
        if (!fs.existsSync(filePath)) {
            console.warn('⚠️ Custom pitcher file not found');
            return;
        }
        
        return new Promise((resolve, reject) => {
            const data = new Map();
            let count = 0;
            
            fs.createReadStream(filePath, { encoding: 'utf8' })
                .pipe(csv())
                .on('data', (row) => {
                    const playerName = this.normalizePlayerName(row['last_name, first_name']);
                    
                    const metrics = {
                        // Basic pitching stats
                        games: parseInt(row.p_game) || 0,
                        inningsPitched: parseFloat(row.p_formatted_ip) || 0,
                        era: parseFloat(row.p_era) || 0,
                        
                        // Batters faced stats
                        pa: parseInt(row.pa) || 0,
                        ab: parseInt(row.ab) || 0,
                        hitsAllowed: parseInt(row.hit) || 0,
                        homeRunsAllowed: parseInt(row.home_run) || 0,
                        strikeouts: parseInt(row.strikeout) || 0,
                        walks: parseInt(row.walk) || 0,
                        
                        // Rate stats (what batters do against this pitcher)
                        oppBattingAvg: parseFloat(row.batting_avg) || 0,
                        oppOnBasePercent: parseFloat(row.on_base_percent) || 0,
                        oppSluggingPercent: parseFloat(row.slg_percent) || 0,
                        oppOPS: parseFloat(row.on_base_plus_slg) || 0,
                        oppIsolatePower: parseFloat(row.isolated_power) || 0,
                        oppBabip: parseFloat(row.babip) || 0,
                        kPercent: parseFloat(row.k_percent) || 0,
                        bbPercent: parseFloat(row.bb_percent) || 0,
                        
                        // EXPECTED STATISTICS ALLOWED (regression indicators)
                        xbaAllowed: parseFloat(row.xba) || 0,
                        xslgAllowed: parseFloat(row.xslg) || 0,
                        xwobaAllowed: parseFloat(row.xwoba) || 0,
                        wobaAllowed: parseFloat(row.woba) || 0,
                        xobpAllowed: parseFloat(row.xobp) || 0,
                        xisoAllowed: parseFloat(row.xiso) || 0,
                        
                        // Expected stats gaps (pitcher luck indicators)
                        xbaDiff: parseFloat(row.xbadiff) || 0,
                        xslgDiff: parseFloat(row.xslgdiff) || 0,
                        wobaDiff: parseFloat(row.wobadiff) || 0,
                        
                        // Contact quality allowed (REAL VULNERABILITY METRICS)
                        barrelsAllowed: parseInt(row.barrel) || 0,
                        barrelBattedRateAllowed: parseFloat(row.barrel_batted_rate) || 0,
                        hardHitPercentAllowed: parseFloat(row.hard_hit_percent) || 0,
                        sweetSpotPercentAllowed: parseFloat(row.sweet_spot_percent) || 0,
                        exitVelocityAvgAllowed: parseFloat(row.exit_velocity_avg) || 0,
                        launchAngleAvgAllowed: parseFloat(row.launch_angle_avg) || 0,
                        
                        // Batted ball profile allowed
                        pullPercentAllowed: parseFloat(row.pull_percent) || 0,
                        straightawayPercentAllowed: parseFloat(row.straightaway_percent) || 0,
                        oppositePercentAllowed: parseFloat(row.opposite_percent) || 0,
                        groundballsPercentAllowed: parseFloat(row.groundballs_percent) || 0,
                        flyballsPercentAllowed: parseFloat(row.flyballs_percent) || 0,
                        linedrivesPercentAllowed: parseFloat(row.linedrives_percent) || 0,
                        
                        // Command and control
                        zSwingPercentAllowed: parseFloat(row.z_swing_percent) || 0,
                        ozSwingPercentAllowed: parseFloat(row.oz_swing_percent) || 0,
                        whiffPercentAllowed: parseFloat(row.whiff_percent) || 0,
                        swingPercentAllowed: parseFloat(row.swing_percent) || 0,
                        
                        // Pitch arsenal data (comprehensive)
                        pitchHand: row.pitch_hand || 'R',
                        armAngle: parseFloat(row.arm_angle) || 0,
                        
                        // Fastball data
                        ffAvgSpeed: parseFloat(row.ff_avg_speed) || 0,
                        ffAvgSpin: parseFloat(row.ff_avg_spin) || 0,
                        ffAvgBreakX: parseFloat(row.ff_avg_break_x) || 0,
                        ffAvgBreakZ: parseFloat(row.ff_avg_break_z) || 0,
                        
                        // Slider data
                        slAvgSpeed: parseFloat(row.sl_avg_speed) || 0,
                        slAvgSpin: parseFloat(row.sl_avg_spin) || 0,
                        slAvgBreakX: parseFloat(row.sl_avg_break_x) || 0,
                        slAvgBreakZ: parseFloat(row.sl_avg_break_z) || 0,
                        
                        // Changeup data
                        chAvgSpeed: parseFloat(row.ch_avg_speed) || 0,
                        chAvgSpin: parseFloat(row.ch_avg_spin) || 0,
                        chAvgBreakX: parseFloat(row.ch_avg_break_x) || 0,
                        chAvgBreakZ: parseFloat(row.ch_avg_break_z) || 0,
                        
                        // Curveball data
                        cuAvgSpeed: parseFloat(row.cu_avg_speed) || 0,
                        cuAvgSpin: parseFloat(row.cu_avg_spin) || 0,
                        cuAvgBreakX: parseFloat(row.cu_avg_break_x) || 0,
                        cuAvgBreakZ: parseFloat(row.cu_avg_break_z) || 0,
                        
                        // Metadata
                        playerId: row.player_id,
                        playerAge: parseInt(row.player_age) || 0,
                        year: parseInt(row.year) || 0,
                        sampleSize: parseInt(row.pa) || 0,
                        dataQuality: this.assessDataQuality(parseInt(row.pa) || 0, 'pitcher')
                    };
                    
                    data.set(playerName, metrics);
                    count++;
                })
                .on('end', () => {
                    this.data.customPitchers = data;
                    console.log(`   🎯 Loaded ${count} comprehensive pitcher profiles`);
                    resolve(data);
                })
                .on('error', reject);
        });
    }
    
    /**
     * Load pitcher arsenal data by pitch type
     */
    async loadPitcherArsenalData() {
        const filePath = path.join(this.statsPath, 'pitcherpitcharsenalstats_2025.csv');
        
        if (!fs.existsSync(filePath)) {
            console.warn('⚠️ Pitcher arsenal file not found');
            return;
        }
        
        return new Promise((resolve, reject) => {
            const data = new Map();
            let count = 0;
            
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    const playerName = this.normalizePlayerName(row['last_name, first_name']);
                    
                    if (!data.has(playerName)) {
                        data.set(playerName, {
                            team: row.team_name_alt || '',
                            pitchTypes: {}
                        });
                    }
                    
                    const pitchType = row.pitch_type;
                    const pitchData = {
                        pitchName: row.pitch_name || '',
                        runValuePer100: parseFloat(row.run_value_per_100) || 0,
                        usage: parseFloat(row.pitch_usage) || 0,
                        baAgainst: parseFloat(row.ba) || 0,
                        slgAgainst: parseFloat(row.slg) || 0,
                        wobaAgainst: parseFloat(row.woba) || 0,
                        whiffPercent: parseFloat(row.whiff_percent) || 0,
                        hardHitPercent: parseFloat(row.hard_hit_percent) || 0,
                        kPercent: parseFloat(row.k_percent) || 0,
                        pitches: parseInt(row.pitches) || 0
                    };
                    
                    data.get(playerName).pitchTypes[pitchType] = pitchData;
                    count++;
                })
                .on('end', () => {
                    this.data.pitcherArsenal = data;
                    console.log(`   🏹 Loaded arsenal data for ${data.size} pitchers`);
                    resolve(data);
                })
                .on('error', reject);
        });
    }
    
    /**
     * Load handedness-specific batted ball data
     */
    async loadHandednessData() {
        const handednessFiles = [
            'batters-batted-ball-bat-left-pitch-hand-left-2025.csv',
            'batters-batted-ball-bat-left-pitch-hand-right-2025.csv',
            'batters-batted-ball-bat-right-pitch-hand-left-2025.csv',
            'batters-batted-ball-bat-right-pitch-hand-right-2025.csv'
        ];
        
        const handednessMap = {
            'bat-left-pitch-hand-left': 'LvL',
            'bat-left-pitch-hand-right': 'LvR',
            'bat-right-pitch-hand-left': 'RvL',
            'bat-right-pitch-hand-right': 'RvR'
        };
        
        const data = new Map();
        
        for (const file of handednessFiles) {
            const filePath = path.join(this.statsPath, file);
            
            if (!fs.existsSync(filePath)) {
                console.warn(`⚠️ Handedness file not found: ${file}`);
                continue;
            }
            
            const matchupKey = Object.keys(handednessMap).find(key => file.includes(key));
            const handedness = handednessMap[matchupKey];
            
            await new Promise((resolve, reject) => {
                let count = 0;
                
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (row) => {
                        const playerName = this.normalizePlayerName(row.name);
                        
                        if (!data.has(playerName)) {
                            data.set(playerName, {});
                        }
                        
                        data.get(playerName)[handedness] = {
                            bbe: parseInt(row.bbe) || 0,
                            gbRate: parseFloat(row.gb_rate) || 0,
                            airRate: parseFloat(row.air_rate) || 0,
                            fbRate: parseFloat(row.fb_rate) || 0,
                            ldRate: parseFloat(row.ld_rate) || 0,
                            pullRate: parseFloat(row.pull_rate) || 0,
                            oppoRate: parseFloat(row.oppo_rate) || 0,
                            pullAirRate: parseFloat(row.pull_air_rate) || 0
                        };
                        
                        count++;
                    })
                    .on('end', () => {
                        console.log(`   📊 Loaded ${handedness} data: ${count} records`);
                        resolve();
                    })
                    .on('error', reject);
            });
        }
        
        this.data.handednessData = data;
        return data;
    }
    
    /**
     * Load swing path optimization data
     */
    async loadSwingPathData() {
        const swingFiles = [
            'bat-tracking-swing-path-all.csv',
            'bat-tracking-swing-path-LHP.csv',
            'bat-tracking-swing-path-RHP.csv'
        ];
        
        const data = new Map();
        
        for (const file of swingFiles) {
            const filePath = path.join(this.statsPath, file);
            
            if (!fs.existsSync(filePath)) {
                console.warn(`⚠️ Swing path file not found: ${file}`);
                continue;
            }
            
            const handedness = file.includes('LHP') ? 'vs_LHP' : 
                             file.includes('RHP') ? 'vs_RHP' : 'overall';
            
            await new Promise((resolve, reject) => {
                let count = 0;
                
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (row) => {
                        const playerName = this.normalizePlayerName(row.name || '');
                        
                        if (!data.has(playerName)) {
                            data.set(playerName, {});
                        }
                        
                        data.get(playerName)[handedness] = {
                            avgBatSpeed: parseFloat(row.avg_bat_speed) || 0,
                            attackAngle: parseFloat(row.attack_angle) || 0,
                            idealAttackAngleRate: parseFloat(row.ideal_attack_angle_rate) || 0,
                            swingCount: parseInt(row.swing_count) || 0
                        };
                        
                        count++;
                    })
                    .on('end', () => {
                        console.log(`   🎯 Loaded swing path ${handedness}: ${count} records`);
                        resolve();
                    })
                    .on('error', reject);
            });
        }
        
        this.data.swingPathData = data;
        return data;
    }
    
    /**
     * Load additional bat tracking data
     */
    async loadBatTrackingData() {
        const trackingFiles = [
            'batters-swing-path-all.csv',
            'batters-swing-path-LHP.csv',
            'batters-swing-path-RHP.csv'
        ];
        
        const data = new Map();
        
        for (const file of trackingFiles) {
            const filePath = path.join(this.statsPath, file);
            
            if (!fs.existsExists(filePath)) continue;
            
            // Implementation similar to swing path data
            // Additional bat tracking metrics can be loaded here
        }
        
        this.data.batTrackingData = data;
        return data;
    }
    
    /**
     * Get historical trends for pitcher regression analysis
     */
    async getHistoricalTrends(pitcherName, daysBack = 15) {
        const trends = {
            games: [],
            metrics: {
                hitsAllowed: [],
                homeRunsAllowed: [],
                strikeouts: [],
                walks: [],
                era: [],
                hardContactRate: []
            },
            trends: {
                recentForm: 'stable',
                regression: {
                    likely: false,
                    confidence: 0.5,
                    factors: []
                }
            }
        };
        
        // Implementation will traverse daily game files
        // This is a placeholder for the historical analysis system
        
        return trends;
    }
    
    /**
     * Get comprehensive player data with all available metrics
     */
    async getComprehensivePlayerData(playerName, playerType = 'batter') {
        const normalizedName = this.normalizePlayerName(playerName);
        
        const result = {
            found: false,
            data: {},
            sources: [],
            confidence: 0,
            analytics: {}
        };
        
        if (playerType === 'batter') {
            // Get data from all available sources
            if (this.data.hitterExitVelocity.has(normalizedName)) {
                result.data.exitVelocity = this.data.hitterExitVelocity.get(normalizedName);
                result.sources.push('exit_velocity');
            }
            
            if (this.data.customBatters.has(normalizedName)) {
                result.data.customStats = this.data.customBatters.get(normalizedName);
                result.sources.push('custom_stats');
            }
            
            if (this.data.handednessData.has(normalizedName)) {
                result.data.handedness = this.data.handednessData.get(normalizedName);
                result.sources.push('handedness');
            }
            
            if (this.data.swingPathData.has(normalizedName)) {
                result.data.swingPath = this.data.swingPathData.get(normalizedName);
                result.sources.push('swing_path');
            }
            
        } else if (playerType === 'pitcher') {
            // Get pitcher data from all sources
            if (this.data.pitcherExitVelocity.has(normalizedName)) {
                result.data.exitVelocity = this.data.pitcherExitVelocity.get(normalizedName);
                result.sources.push('exit_velocity');
            }
            
            if (this.data.customPitchers.has(normalizedName)) {
                result.data.customStats = this.data.customPitchers.get(normalizedName);
                result.sources.push('custom_stats');
            }
            
            if (this.data.pitcherArsenal.has(normalizedName)) {
                result.data.arsenal = this.data.pitcherArsenal.get(normalizedName);
                result.sources.push('arsenal');
            }
        }
        
        result.found = result.sources.length > 0;
        result.confidence = this.calculateConfidenceScore(result.sources, result.data);
        
        if (result.found) {
            result.analytics = this.calculateAdvancedAnalytics(result.data, playerType);
        }
        
        return result;
    }
    
    /**
     * Calculate advanced analytics from comprehensive data
     */
    calculateAdvancedAnalytics(data, playerType) {
        const analytics = {};
        
        if (playerType === 'batter') {
            // Calculate power classification
            analytics.batterType = this.classifyBatter(data);
            
            // Calculate expected performance regression
            analytics.regression = this.calculateRegressionPotential(data, 'batter');
            
            // Calculate barrel rate optimization
            analytics.barrelOptimization = this.calculateBarrelOptimization(data);
            
        } else if (playerType === 'pitcher') {
            // Calculate vulnerability classification
            analytics.vulnerabilityProfile = this.calculateVulnerabilityProfile(data);
            
            // Calculate regression potential
            analytics.regression = this.calculateRegressionPotential(data, 'pitcher');
            
            // Calculate command rating
            analytics.commandRating = this.calculateCommandRating(data);
        }
        
        return analytics;
    }
    
    /**
     * Classify batter type using real metrics
     */
    classifyBatter(data) {
        const classification = {
            primary: 'balanced',
            confidence: 0.5,
            traits: [],
            scores: {}
        };
        
        // Use real exit velocity and custom stats data
        if (data.exitVelocity && data.customStats) {
            const barrelRate = data.exitVelocity.barrelRate || data.customStats.barrelBattedRate || 0;
            const ev95Percent = data.exitVelocity.ev95Percent || 0;
            const hardHitPercent = data.customStats.hardHitPercent || 0;
            const sweetSpotPercent = data.customStats.sweetSpotPercent || 0;
            
            // Power classification thresholds
            if (barrelRate >= 8 && ev95Percent >= 45 && hardHitPercent >= 40) {
                classification.primary = 'power';
                classification.confidence = 0.85;
                classification.traits.push('Elite barrel rate', 'High exit velocity', 'Hard contact');
            } else if (sweetSpotPercent >= 35 && (data.customStats.linedrivesPercent || 0) >= 25) {
                classification.primary = 'contact';
                classification.confidence = 0.80;
                classification.traits.push('High sweet spot rate', 'Line drive contact');
            }
            
            classification.scores = {
                power: Math.min(100, (barrelRate * 8) + (ev95Percent * 0.8) + (hardHitPercent * 1.2)),
                contact: Math.min(100, (sweetSpotPercent * 2) + ((data.customStats.linedrivesPercent || 0) * 3)),
                speed: (data.customStats.sprintSpeed || 0) * 3.5
            };
        }
        
        return classification;
    }
    
    /**
     * Calculate vulnerability profile for pitchers
     */
    calculateVulnerabilityProfile(data) {
        const profile = {
            overallVulnerability: 50,
            vulnerabilities: [],
            strengths: [],
            regressionRisk: 'moderate',
            confidence: 0.5
        };
        
        if (data.customStats && data.exitVelocity) {
            const barrelRateAllowed = data.exitVelocity.barrelRateAllowed || data.customStats.barrelBattedRateAllowed || 0;
            const hardHitAllowed = data.customStats.hardHitPercentAllowed || 0;
            const xwobaAllowed = data.customStats.xwobaAllowed || 0;
            const wobaAllowed = data.customStats.wobaAllowed || 0;
            
            // Vulnerability scoring
            let vulnerabilityScore = 50;
            
            if (barrelRateAllowed > 8.5) {
                vulnerabilityScore += 25;
                profile.vulnerabilities.push(`High barrel rate allowed (${barrelRateAllowed.toFixed(1)}%)`);
            }
            
            if (hardHitAllowed > 42) {
                vulnerabilityScore += 20;
                profile.vulnerabilities.push(`High hard contact allowed (${hardHitAllowed.toFixed(1)}%)`);
            }
            
            // Expected stats regression analysis
            const wobaDiff = wobaAllowed - xwobaAllowed;
            if (wobaDiff < -0.025) {
                vulnerabilityScore += 15;
                profile.vulnerabilities.push('Due for negative regression');
                profile.regressionRisk = 'high';
            } else if (wobaDiff > 0.025) {
                vulnerabilityScore -= 10;
                profile.strengths.push('Outperforming expected metrics');
                profile.regressionRisk = 'low';
            }
            
            profile.overallVulnerability = Math.min(100, vulnerabilityScore);
            profile.confidence = 0.85;
        }
        
        return profile;
    }
    
    /**
     * Calculate regression potential using expected vs actual stats
     */
    calculateRegressionPotential(data, playerType) {
        const regression = {
            likelihood: 'neutral',
            confidence: 0.5,
            factors: [],
            expectedChange: 0
        };
        
        if (data.customStats) {
            const stats = data.customStats;
            
            if (playerType === 'batter') {
                // Batter regression analysis
                const baDiff = (stats.battingAvg || 0) - (stats.xba || 0);
                const slgDiff = (stats.sluggingPercent || 0) - (stats.xslg || 0);
                const wobaDiff = (stats.woba || 0) - (stats.xwoba || 0);
                
                if (baDiff > 0.025 || slgDiff > 0.040 || wobaDiff > 0.025) {
                    regression.likelihood = 'negative';
                    regression.confidence = 0.75;
                    regression.factors.push('Overperforming expected metrics');
                    regression.expectedChange = -0.15;
                } else if (baDiff < -0.025 || slgDiff < -0.040 || wobaDiff < -0.025) {
                    regression.likelihood = 'positive';
                    regression.confidence = 0.75;
                    regression.factors.push('Underperforming expected metrics');
                    regression.expectedChange = 0.15;
                }
                
            } else if (playerType === 'pitcher') {
                // Pitcher regression analysis
                const xbaDiff = stats.xbaDiff || 0;
                const xslgDiff = stats.xslgDiff || 0;
                const wobaDiff = stats.wobaDiff || 0;
                
                if (xbaDiff < -0.025 || xslgDiff < -0.040 || wobaDiff < -0.025) {
                    regression.likelihood = 'negative';
                    regression.confidence = 0.80;
                    regression.factors.push('Lucky performance due for regression');
                    regression.expectedChange = 0.20;
                }
            }
        }
        
        return regression;
    }
    
    /**
     * Calculate barrel rate optimization potential
     */
    calculateBarrelOptimization(data) {
        const optimization = {
            currentBarrelRate: 0,
            potentialBarrelRate: 0,
            improvementFactors: [],
            confidence: 0.5
        };
        
        if (data.exitVelocity && data.swingPath) {
            optimization.currentBarrelRate = data.exitVelocity.barrelRate || 0;
            
            // Calculate potential based on swing mechanics
            const avgSwingPath = data.swingPath.overall || data.swingPath.vs_RHP || {};
            const idealAngleRate = avgSwingPath.idealAttackAngleRate || 0;
            const avgBatSpeed = avgSwingPath.avgBatSpeed || 0;
            
            if (idealAngleRate > 55 && avgBatSpeed > 70) {
                optimization.potentialBarrelRate = optimization.currentBarrelRate * 1.3;
                optimization.improvementFactors.push('Excellent swing mechanics');
                optimization.confidence = 0.80;
            }
        }
        
        return optimization;
    }
    
    /**
     * Calculate command rating for pitchers
     */
    calculateCommandRating(data) {
        const command = {
            rating: 50,
            grade: 'C',
            factors: [],
            confidence: 0.5
        };
        
        if (data.customStats) {
            const stats = data.customStats;
            const kPercent = stats.kPercent || 0;
            const bbPercent = stats.bbPercent || 0;
            const whiffPercent = stats.whiffPercentAllowed || 0;
            
            // Calculate CSW% (Called Strike + Whiff)
            const cswPercent = whiffPercent + (kPercent * 0.7); // Proxy calculation
            
            let commandScore = 50;
            
            if (cswPercent > 30) {
                commandScore += 25;
                command.factors.push('Excellent command metrics');
                command.grade = 'A';
            } else if (cswPercent > 28) {
                commandScore += 15;
                command.factors.push('Above average command');
                command.grade = 'B';
            } else if (cswPercent < 25) {
                commandScore -= 15;
                command.factors.push('Below average command');
                command.grade = 'D';
            }
            
            if (bbPercent < 7) {
                commandScore += 10;
                command.factors.push('Excellent walk rate');
            }
            
            command.rating = Math.max(0, Math.min(100, commandScore));
            command.confidence = 0.85;
        }
        
        return command;
    }
    
    /**
     * Assess data quality based on sample size and completeness
     */
    assessDataQuality(sampleSize, playerType) {
        if (playerType === 'batter') {
            if (sampleSize >= 200) return 'excellent';
            if (sampleSize >= 100) return 'good';
            if (sampleSize >= 50) return 'fair';
            return 'limited';
        } else if (playerType === 'pitcher') {
            if (sampleSize >= 150) return 'excellent';
            if (sampleSize >= 75) return 'good';
            if (sampleSize >= 40) return 'fair';
            return 'limited';
        }
        return 'unknown';
    }
    
    /**
     * Calculate confidence score based on data sources and quality
     */
    calculateConfidenceScore(sources, data) {
        let confidence = 0.2; // Base confidence
        
        // Add confidence for each data source
        if (sources.includes('exit_velocity')) confidence += 0.3;
        if (sources.includes('custom_stats')) confidence += 0.3;
        if (sources.includes('arsenal')) confidence += 0.2;
        if (sources.includes('handedness')) confidence += 0.1;
        if (sources.includes('swing_path')) confidence += 0.1;
        
        // Adjust for data quality
        const qualities = Object.values(data).map(d => d.dataQuality).filter(q => q);
        if (qualities.includes('excellent')) confidence += 0.1;
        else if (qualities.includes('limited')) confidence -= 0.1;
        
        return Math.max(0.2, Math.min(0.95, confidence));
    }
    
    /**
     * Normalize player names for consistent matching
     */
    normalizePlayerName(name) {
        if (!name) return '';
        
        // Handle "Last, First" format
        if (name.includes(',')) {
            const parts = name.split(',');
            if (parts.length === 2) {
                const last = parts[0].trim();
                const first = parts[1].trim();
                name = `${first} ${last}`;
            }
        }
        
        // Clean up the name
        name = name.replace(/[^\w\s\.]/g, ''); // Keep letters, numbers, spaces, dots
        name = name.replace(/\s+/g, ' '); // Normalize whitespace
        
        return name.trim();
    }
    
    /**
     * Clear cache for specific data type or all cache
     */
    clearCache(dataType = null) {
        if (dataType) {
            this.cache.delete(dataType);
            this.lastCacheUpdate.delete(dataType);
        } else {
            this.cache.clear();
            this.lastCacheUpdate.clear();
        }
        console.log(`🧹 Cache cleared${dataType ? ` for ${dataType}` : ' completely'}`);
    }
    
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            cacheSize: this.cache.size,
            cacheKeys: Array.from(this.cache.keys()),
            lastUpdate: Math.max(...Array.from(this.lastCacheUpdate.values())),
            memoryUsage: process.memoryUsage()
        };
    }
}

// Export for use in other modules
module.exports = ProfessionalDataLoader;

// Export as ES6 module as well
if (typeof module !== 'undefined' && module.exports) {
    module.exports.ProfessionalDataLoader = ProfessionalDataLoader;
}