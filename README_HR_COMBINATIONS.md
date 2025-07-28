# MLB HR Combinations Scripts

This directory contains scripts for generating home run combination analysis from MLB game data.

## Current Script

### 🚀 `generate_hr_combinations_optimized.py` (PRODUCTION)
**The only script needed for HR combinations generation.**

**Features:**
- **Optimized thresholds** based on statistical analysis
- **Memory-efficient streaming** processing  
- **Separate output files** by combination size
- **No artificial limits** - processes all meaningful combinations

**Thresholds:**
- 2-player combinations: **4+ occurrences** (reduces file size by 69%)
- 3-player combinations: **2+ occurrences** (increases combinations by 20,562%)
- 4-player combinations: **2+ occurrences** (optimal threshold)

**Output:**
- `hr_combinations_by_2_adjusted_TIMESTAMP.json` (~2.1 MB)
- `hr_combinations_by_3_adjusted_TIMESTAMP.json` (~1.7 MB)
- `hr_combinations_by_4_adjusted_TIMESTAMP.json` (~0.03 MB)
- **Total file size:** ~3.9 MB

**Usage:**
```bash
python3 generate_hr_combinations_optimized.py
```

**Integration:** Used automatically in `daily_update.sh`

**Threshold Customization:**
To modify thresholds, edit line 235:
```python
min_occurrences = {2: 4, 3: 2, 4: 2}  # Adjust as needed
```

## File Output Structure

### Optimized Files (Recommended)
```
public/data/hr_combinations/
├── hr_combinations_by_2_adjusted_20250728_173915.json  # 2-player, 4+ occurrences
├── hr_combinations_by_3_adjusted_20250728_173915.json  # 3-player, 2+ occurrences
└── hr_combinations_by_4_adjusted_20250728_173915.json  # 4-player, 2+ occurrences
```

### Legacy Files (Historical)
```
public/data/hr_combinations/
├── hr_combinations_by_2.json     # Original thresholds
├── hr_combinations_by_3.json     # Original thresholds
└── hr_combinations_by_4.json     # Original thresholds
```

## Data Quality and Statistics

### Current Season Coverage (2025)
- **Days analyzed:** 120 days
- **Date range:** 2025-03-19 to 2025-07-27
- **Unique players:** 1,112 players with HR data
- **Files processed:** 121 files with detailed player statistics

### Performance Benchmarks
- **Processing time:** ~5 seconds for full season
- **Memory usage:** Optimized streaming (no memory overflow)
- **Raw combinations processed:** 400,000+ before filtering

### Top HR Leaders (Season Totals)
1. C. Raleigh (SEA): 41 HRs
2. S. Ohtani (LAD): 39 HRs
3. A. Judge (NYY): 37 HRs
4. E. Suarez (ARI): 36 HRs
5. K. Schwarber (PHI): 36 HRs

## Betting Intelligence

### High-Value Combinations
**2-Player (4+ occurrences):**
- **Judge + Schwarber:** 13 occurrences (10.8% of season)
- **Ohtani + Schwarber:** 12 occurrences (10.0% of season)
- **Raleigh + Crow-Armstrong:** 10 occurrences (8.3% of season)

**3-Player (2+ occurrences):**
- **Ohtani + Suarez + Perez:** 4 occurrences
- **Judge + Rooker + Zeferjahn:** 3 occurrences

### Statistical Significance
- **2-player combinations:** 2,469 meaningful combinations (vs 122,855 total)
- **3-player combinations:** 1,653 meaningful combinations (vs 343,071 total)
- **Filtering effectiveness:** Removes 99%+ of statistical noise while preserving all betting opportunities

## Maintenance

### Daily Updates
The optimized script runs automatically as part of `daily_update.sh`:
```bash
./daily_update.sh
```

### Manual Execution
```bash
# Run optimized script with adjusted thresholds
python3 generate_hr_combinations_optimized.py

# Run unlimited script for research
python3 generate_hr_combinations_unlimited.py
```

### Troubleshooting
- **Memory issues:** Use the optimized script (streaming processing)
- **File size concerns:** Thresholds are already optimized for balance
- **Missing data:** Check that game data files exist in `public/data/2025/`

## Integration with Frontend

The generated JSON files are consumed by:
- **Dashboard cards** for HR combination analysis
- **Betting intelligence systems** for daily picks
- **Historical analysis** for pattern recognition

File format is designed for direct consumption by JavaScript applications with comprehensive metadata and statistics included.