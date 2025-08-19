// Real Odds Service - Integration with actual betting odds data

class RealOddsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 2 * 60 * 1000; // 2 minutes for live odds
    this.oddsData = null;
    this.lastLoaded = null;
  }

  /**
   * Load and cache real odds data from CSV files
   */
  async loadOddsData() {
    const now = Date.now();
    
    // Return cached data if it's fresh
    if (this.oddsData && this.lastLoaded && (now - this.lastLoaded < this.cacheTimeout)) {
      return this.oddsData;
    }

    try {
      console.log('🎯 Loading real odds data from CSV files...');
      
      // Load both HR and hits odds data
      const [hrOdds, hitsOdds] = await Promise.all([
        this.loadOddsFromCSV('/data/odds/mlb-hr-odds-only.csv', 'HR'),
        this.loadOddsFromCSV('/data/odds/mlb-hits-odds-only.csv', 'Hit')
      ]);

      // Combine the data
      this.oddsData = {
        hr: hrOdds,
        hits: hitsOdds,
        loadedAt: now
      };
      
      this.lastLoaded = now;
      console.log(`✅ Loaded odds for ${hrOdds.size} HR players, ${hitsOdds.size} hits players`);
      
      return this.oddsData;
    } catch (error) {
      console.warn('⚠️ Failed to load real odds data:', error.message);
      return this.getEmptyOddsData();
    }
  }

  /**
   * Load odds data from a specific CSV file
   */
  async loadOddsFromCSV(csvPath, propType) {
    try {
      const response = await fetch(csvPath);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`📄 Odds file not found: ${csvPath}`);
          return new Map();
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const csvText = await response.text();
      const lines = csvText.trim().split('\n');
      
      if (lines.length <= 1) {
        console.warn(`📄 Empty or header-only CSV: ${csvPath}`);
        return new Map();
      }

      const oddsMap = new Map();
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Verify expected headers
      const expectedHeaders = ['player_name', 'odds', 'last_updated'];
      const hasValidHeaders = expectedHeaders.every(header => 
        headers.some(h => h.toLowerCase() === header.toLowerCase())
      );
      
      if (!hasValidHeaders) {
        console.warn(`📄 Unexpected CSV format in ${csvPath}. Expected: ${expectedHeaders.join(', ')}`);
        return new Map();
      }

      // Process data rows
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        
        if (row.length >= 3) {
          const playerName = row[0];
          const oddsStr = row[1];
          const lastUpdated = row[2];
          
          if (playerName && oddsStr) {
            oddsMap.set(this.normalizePlayerName(playerName), {
              odds: oddsStr,
              lastUpdated: lastUpdated,
              propType: propType,
              decimal: this.convertToDecimal(oddsStr),
              probability: this.calculateImpliedProbability(oddsStr)
            });
          }
        }
      }
      
      return oddsMap;
    } catch (error) {
      console.warn(`⚠️ Error loading CSV ${csvPath}:`, error.message);
      return new Map();
    }
  }

  /**
   * Get real odds for a specific player and prop type
   */
  async getRealOdds(playerName, propType) {
    const oddsData = await this.loadOddsData();
    const normalizedName = this.normalizePlayerName(playerName);
    
    // Determine which odds set to use
    let oddsMap;
    switch (propType) {
      case 'HR':
        oddsMap = oddsData.hr;
        break;
      case 'Hit':
      case 'Hits_1.5':
      case 'Hits_2.5':
        oddsMap = oddsData.hits;
        break;
      default:
        // For other prop types, try HR odds first, then hits
        oddsMap = oddsData.hr.has(normalizedName) ? oddsData.hr : oddsData.hits;
    }

    const playerOdds = oddsMap?.get(normalizedName);
    
    if (playerOdds) {
      console.log(`🎯 Found real odds for ${playerName} (${propType}): ${playerOdds.odds}`);
      return {
        found: true,
        odds: playerOdds.odds,
        decimal: playerOdds.decimal,
        probability: playerOdds.probability,
        lastUpdated: playerOdds.lastUpdated,
        source: 'real_odds'
      };
    }

    console.log(`📊 No real odds found for ${playerName} (${propType}), will use estimated odds`);
    return {
      found: false,
      source: 'estimated'
    };
  }

  /**
   * Get odds summary for all available players
   */
  async getOddsSummary() {
    const oddsData = await this.loadOddsData();
    
    const hrPlayers = Array.from(oddsData.hr.entries()).map(([name, data]) => ({
      player: name,
      odds: data.odds,
      decimal: data.decimal,
      probability: data.probability,
      type: 'HR'
    }));

    const hitPlayers = Array.from(oddsData.hits.entries()).map(([name, data]) => ({
      player: name,
      odds: data.odds,
      decimal: data.decimal,
      probability: data.probability,
      type: 'Hit'
    }));

    return {
      hrCount: hrPlayers.length,
      hitCount: hitPlayers.length,
      totalPlayers: hrPlayers.length + hitPlayers.length,
      hrPlayers: hrPlayers.slice(0, 10), // Top 10 for preview
      hitPlayers: hitPlayers.slice(0, 10),
      loadedAt: oddsData.loadedAt
    };
  }

  /**
   * Convert American odds to decimal odds
   */
  convertToDecimal(americanOdds) {
    if (!americanOdds) return 0;
    
    const odds = parseInt(americanOdds.replace('+', ''));
    
    if (odds > 0) {
      return (odds / 100) + 1;
    } else {
      return (100 / Math.abs(odds)) + 1;
    }
  }

  /**
   * Calculate implied probability from American odds
   */
  calculateImpliedProbability(americanOdds) {
    const decimal = this.convertToDecimal(americanOdds);
    return decimal > 0 ? (1 / decimal) : 0;
  }

  /**
   * Normalize player name for matching
   */
  normalizePlayerName(name) {
    if (!name) return '';
    
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z\s]/g, '') // Remove non-letters except spaces
      .replace(/\s+/g, ' '); // Normalize multiple spaces
  }

  /**
   * Get empty odds data structure
   */
  getEmptyOddsData() {
    return {
      hr: new Map(),
      hits: new Map(),
      loadedAt: Date.now()
    };
  }

  /**
   * Check if real odds data is available
   */
  async isRealOddsAvailable() {
    const oddsData = await this.loadOddsData();
    return oddsData.hr.size > 0 || oddsData.hits.size > 0;
  }

  /**
   * Get data quality metrics
   */
  async getDataQuality() {
    const oddsData = await this.loadOddsData();
    const isAvailable = await this.isRealOddsAvailable();
    
    return {
      isAvailable,
      hrPlayersCount: oddsData.hr.size,
      hitPlayersCount: oddsData.hits.size,
      totalPlayersCount: oddsData.hr.size + oddsData.hits.size,
      lastLoaded: this.lastLoaded,
      cacheStatus: this.lastLoaded ? 'cached' : 'not_loaded',
      dataAge: this.lastLoaded ? Date.now() - this.lastLoaded : null,
      recommendedAction: this.getRecommendedAction(oddsData)
    };
  }

  getRecommendedAction(oddsData) {
    if (oddsData.hr.size === 0 && oddsData.hits.size === 0) {
      return 'setup_odds_scraping';
    } else if (oddsData.hits.size === 0) {
      return 'fix_hits_odds_scraping';
    } else if (oddsData.hr.size + oddsData.hits.size < 10) {
      return 'verify_odds_data_quality';
    } else {
      return 'odds_data_good';
    }
  }
}

const realOddsService = new RealOddsService();
export default realOddsService;