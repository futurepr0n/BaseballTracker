// Shared Arsenal Data Service
// Provides comprehensive pitcher arsenal data for both PitcherArsenalDisplay and tooltips

import Papa from 'papaparse';

class ArsenalDataService {
  constructor() {
    this.cache = new Map();
    this.pitcherArsenalMap = new Map();
    this.hitterArsenalMap = new Map();
    this.isLoaded = false;
    this.loadPromise = null;
  }

  // Load and parse CSV data (singleton pattern)
  async loadArsenalData(year = 2025) {
    if (this.isLoaded) {
      return {
        pitcherArsenalMap: this.pitcherArsenalMap,
        hitterArsenalMap: this.hitterArsenalMap
      };
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this._performLoad(year);
    return this.loadPromise;
  }

  async _performLoad(year) {
    try {
      const [pitcherResponse, hitterResponse] = await Promise.all([
        fetch(`/data/stats/pitcherpitcharsenalstats_${year}.csv`),
        fetch(`/data/stats/hitterpitcharsenalstats_${year}.csv`)
      ]);

      if (!pitcherResponse.ok || !hitterResponse.ok) {
        throw new Error('Failed to load arsenal data');
      }

      const [pitcherText, hitterText] = await Promise.all([
        pitcherResponse.text(),
        hitterResponse.text()
      ]);

      // Parse CSV data
      const pitcherData = Papa.parse(pitcherText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim()
      });

      const hitterData = Papa.parse(hitterText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim()
      });

      // Process pitcher data
      pitcherData.data.forEach(row => {
        const fullName = row['last_name, first_name'];
        const playerId = row.player_id;
        const key = `${playerId}_${row.team_name_alt}`;
        
        if (!this.pitcherArsenalMap.has(key)) {
          this.pitcherArsenalMap.set(key, {
            playerId,
            fullName,
            team: row.team_name_alt,
            pitches: []
          });
        }
        
        this.pitcherArsenalMap.get(key).pitches.push({
          pitch_type: row.pitch_type,
          pitch_name: row.pitch_name,
          pitch_usage: row.pitch_usage,
          pitches: row.pitches,
          pa: row.pa,
          ba: row.ba,
          slg: row.slg,
          woba: row.woba,
          whiff_percent: row.whiff_percent,
          k_percent: row.k_percent,
          put_away: row.put_away,
          est_ba: row.est_ba,
          est_slg: row.est_slg,
          est_woba: row.est_woba,
          hard_hit_percent: row.hard_hit_percent,
          run_value_per_100: row.run_value_per_100,
          run_value: row.run_value
        });
      });

      // Process hitter data
      hitterData.data.forEach(row => {
        const fullName = row['last_name, first_name'];
        const playerId = row.player_id;
        const key = `${playerId}_${row.team_name_alt}`;
        
        if (!this.hitterArsenalMap.has(key)) {
          this.hitterArsenalMap.set(key, {
            playerId,
            fullName,
            team: row.team_name_alt,
            pitchStats: {}
          });
        }
        
        this.hitterArsenalMap.get(key).pitchStats[row.pitch_type] = {
          pitch_name: row.pitch_name,
          pitches: row.pitches,
          pa: row.pa,
          ba: row.ba,
          slg: row.slg,
          woba: row.woba,
          whiff_percent: row.whiff_percent,
          k_percent: row.k_percent,
          hard_hit_percent: row.hard_hit_percent,
          run_value_per_100: row.run_value_per_100
        };
      });

      this.isLoaded = true;
      return {
        pitcherArsenalMap: this.pitcherArsenalMap,
        hitterArsenalMap: this.hitterArsenalMap
      };
    } catch (error) {
      console.error('Error loading arsenal data:', error);
      return {
        pitcherArsenalMap: new Map(),
        hitterArsenalMap: new Map()
      };
    }
  }

  // Find pitcher arsenal data by name and team
  findPitcherArsenal(pitcherName, team) {
    // Try to find by exact match first
    for (const [key, data] of this.pitcherArsenalMap) {
      if (data.team === team && 
          (data.fullName.includes(pitcherName) || 
           pitcherName.includes(data.fullName.split(',')[0].trim()))) {
        return data.pitches;
      }
    }
    
    // Try fuzzy match
    for (const [key, data] of this.pitcherArsenalMap) {
      const lastName = data.fullName.split(',')[0].trim().toLowerCase();
      if (data.team === team && pitcherName.toLowerCase().includes(lastName)) {
        return data.pitches;
      }
    }
    
    return null;
  }

  // Get comprehensive pitcher arsenal data for tooltip
  async getPitcherArsenalForTooltip(pitcherName, team, opponentBatters = []) {
    try {
      await this.loadArsenalData();
      
      const pitcherStats = this.findPitcherArsenal(pitcherName, team);
      
      if (!pitcherStats || pitcherStats.length === 0) {
        return null;
      }

      // Sort by usage
      const sortedPitches = pitcherStats.sort((a, b) => b.pitch_usage - a.pitch_usage);

      // Calculate effectiveness ratings
      const pitchesWithEffectiveness = sortedPitches.map(pitch => ({
        ...pitch,
        effectiveness: this.getPitchEffectiveness(pitch)
      }));

      // Calculate arsenal summary
      const summary = this.calculateArsenalSummary(pitchesWithEffectiveness);

      return {
        pitches: pitchesWithEffectiveness,
        summary,
        classification: this.getArsenalClassification(pitchesWithEffectiveness.length),
        opponentMatchups: this.getOpponentMatchups(pitchesWithEffectiveness, opponentBatters)
      };
    } catch (error) {
      console.error('Error getting pitcher arsenal for tooltip:', error);
      return null;
    }
  }

  // Calculate effectiveness rating for each pitch
  getPitchEffectiveness(stats) {
    const score = (
      (1 - stats.ba) * 0.3 +
      (1 - stats.slg) * 0.3 +
      (stats.whiff_percent / 100) * 0.2 +
      (stats.k_percent / 100) * 0.2
    );
    
    if (score >= 0.7) return { rating: 'Elite', color: '#10b981' };
    if (score >= 0.6) return { rating: 'Good', color: '#3b82f6' };
    if (score >= 0.5) return { rating: 'Average', color: '#f59e0b' };
    return { rating: 'Below Avg', color: '#ef4444' };
  }

  // Calculate arsenal summary stats
  calculateArsenalSummary(pitches) {
    const totalUsage = pitches.reduce((sum, p) => sum + p.pitch_usage, 0);
    
    return {
      avgWhiffPercent: pitches.reduce((sum, p) => sum + p.whiff_percent * p.pitch_usage, 0) / totalUsage,
      avgKPercent: pitches.reduce((sum, p) => sum + p.k_percent * p.pitch_usage, 0) / totalUsage,
      primaryPitch: pitches[0],
      pitchCount: pitches.length,
      totalPitchesThrown: pitches.reduce((sum, p) => sum + p.pitches, 0)
    };
  }

  // Get arsenal classification
  getArsenalClassification(pitchCount) {
    if (pitchCount >= 5) {
      return { 
        type: 'versatile',
        label: '🎨 Versatile Arsenal',
        description: `${pitchCount} pitches`
      };
    } else if (pitchCount === 4) {
      return { 
        type: 'balanced',
        label: '⚖️ Balanced Mix',
        description: `${pitchCount} pitches`
      };
    } else if (pitchCount === 3) {
      return { 
        type: 'standard',
        label: '🎯 Standard Mix',
        description: `${pitchCount} pitches`
      };
    } else {
      return { 
        type: 'limited',
        label: '⚡ Power Pitcher',
        description: `${pitchCount} pitches`
      };
    }
  }

  // Get opponent matchup data
  getOpponentMatchups(pitches, opponentBatters) {
    // For now, return empty - can be enhanced later
    return [];
  }
}

// Export singleton instance
export default new ArsenalDataService();