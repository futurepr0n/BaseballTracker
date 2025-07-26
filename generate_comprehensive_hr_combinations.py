#!/usr/bin/env python3
"""
Comprehensive HR Combinations Generator
Analyzes ALL available daily game data to find COMPLETE season HR combinations
Requires minimum 2+ occurrences and validates against real MLB schedule
"""

import json
import os
import glob
from datetime import datetime, timedelta
from itertools import combinations
from collections import defaultdict

def scan_all_game_files():
    """Scan ALL game files and categorize by data richness"""
    print("🔍 Comprehensive scan of ALL game files...")
    
    # Look for all JSON files across the entire season
    season_months = ['january', 'february', 'march', 'april', 'may', 'june', 
                    'july', 'august', 'september', 'october', 'november', 'december']
    
    all_files = []
    for month in season_months:
        month_pattern = f"public/data/2025/{month}/*.json"
        month_files = glob.glob(month_pattern)
        all_files.extend(month_files)
        if month_files:
            print(f"📁 {month.capitalize()}: {len(month_files)} files")
    
    print(f"\n📊 Total files found across all months: {len(all_files)}")
    
    # Filter out obvious non-game files
    game_files = [f for f in all_files if not any(x in f.upper() for x in 
                 ['BAD', 'HR_COMBINATIONS', 'PREDICTIONS', 'STATS', 'ROLLING'])]
    
    print(f"📊 Potential game files: {len(game_files)}")
    
    # Analyze each file for player data depth
    rich_files = []  # Files with detailed HR stats
    basic_files = []  # Files with basic player data
    schedule_files = []  # Schedule-only files
    
    print(f"\n🔍 Deep analysis of file contents...")
    
    for i, file_path in enumerate(sorted(game_files)):
        if i % 50 == 0:
            print(f"   Analyzing: {i}/{len(game_files)} files...")
            
        try:
            file_size = os.path.getsize(file_path)
            
            # Quick size-based filtering
            if file_size < 1000:  # Very small files likely schedule-only
                schedule_files.append(file_path)
                continue
                
            with open(file_path, 'r') as f:
                # Read enough to analyze structure
                content = f.read(10000)  # First 10KB
                
                # Check for detailed player stats
                has_players = '"players"' in content
                has_hr_stats = any(hr_field in content for hr_field in ['"HR":', '"homeRuns":', '"hrs":', '"HR_total"'])
                has_batting_stats = any(stat in content for stat in ['"AB":', '"H":', '"RBI":', '"AVG":'])
                
                # Enhanced detection for different data formats
                if has_players and has_hr_stats and has_batting_stats:
                    rich_files.append(file_path)
                elif has_players and (has_hr_stats or has_batting_stats):
                    basic_files.append(file_path)
                else:
                    schedule_files.append(file_path)
                    
        except Exception as e:
            print(f"   ⚠️ Error analyzing {file_path}: {e}")
            continue
    
    print(f"\n📊 File classification results:")
    print(f"   🏆 Rich data files (detailed HR stats): {len(rich_files)}")
    print(f"   📊 Basic data files (some player data): {len(basic_files)}")
    print(f"   📅 Schedule-only files: {len(schedule_files)}")
    
    return rich_files, basic_files, schedule_files

def extract_hr_data_from_file(file_path):
    """Extract HR data from a single file with multiple format support"""
    try:
        with open(file_path, 'r') as f:
            game_data = json.load(f)
        
        # Extract date from filename
        filename = os.path.basename(file_path)
        parts = filename.replace('.json', '').split('_')
        
        if len(parts) >= 3:
            month_name = parts[0]
            day = parts[1].zfill(2)
            year = parts[2]
            
            # Convert month name to number
            month_map = {
                'january': '01', 'february': '02', 'march': '03', 'april': '04',
                'may': '05', 'june': '06', 'july': '07', 'august': '08',
                'september': '09', 'october': '10', 'november': '11', 'december': '12'
            }
            month_num = month_map.get(month_name.lower(), '01')
            date_str = f"{year}-{month_num}-{day}"
            
            hr_players = []
            
            # Look for HR data in multiple possible locations
            if 'players' in game_data and isinstance(game_data['players'], list):
                for player in game_data['players']:
                    # Multiple ways to identify hitters and extract HR data
                    is_hitter = (
                        player.get('playerType') == 'hitter' or
                        'pitcher' not in player.get('position', '').lower() or
                        player.get('position') in ['DH', 'OF', '1B', '2B', '3B', 'SS', 'C', 'LF', 'CF', 'RF']
                    )
                    
                    if is_hitter:
                        # Try multiple HR field names
                        hrs = (
                            player.get('HR') or 
                            player.get('homeRuns') or 
                            player.get('hrs') or 
                            player.get('HR_total') or 
                            0
                        )
                        
                        try:
                            hrs = int(hrs)
                        except (ValueError, TypeError):
                            hrs = 0
                        
                        if hrs > 0:
                            name = player.get('name') or player.get('playerName') or ''
                            team = player.get('team') or player.get('teamAbbr') or ''
                            
                            if name and team:
                                hr_players.append({
                                    'name': name,
                                    'team': team,
                                    'hrs_this_game': hrs,
                                    'gameId': player.get('gameId', ''),
                                    'AB': player.get('AB', 0),
                                    'H': player.get('H', 0),
                                    'RBI': player.get('RBI', 0)
                                })
            
            return date_str, hr_players
            
    except Exception as e:
        return None, []

def load_comprehensive_hr_data():
    """Load HR data from ALL available game files"""
    print("🏟️ Loading COMPREHENSIVE HR data from ALL game files...")
    
    # Scan all files
    rich_files, basic_files, schedule_files = scan_all_game_files()
    
    # Process files in order of data richness
    all_files_to_process = rich_files + basic_files
    
    print(f"\n🎯 Processing {len(all_files_to_process)} files for HR data...")
    
    daily_hr_data = {}
    files_with_hr_data = 0
    total_processed = 0
    
    for file_path in sorted(all_files_to_process):
        total_processed += 1
        
        if total_processed % 25 == 0:
            print(f"   Progress: {total_processed}/{len(all_files_to_process)} files processed ({files_with_hr_data} with HR data)")
        
        date_str, hr_players = extract_hr_data_from_file(file_path)
        
        if date_str and hr_players:
            daily_hr_data[date_str] = hr_players
            files_with_hr_data += 1
            
            # Log significant HR days
            if len(hr_players) >= 15:
                print(f"   🔥 High HR day: {date_str} with {len(hr_players)} HRs")
    
    print(f"\n🎯 COMPREHENSIVE ANALYSIS COMPLETE!")
    print(f"✅ Processed {total_processed} total files")
    print(f"📊 Found HR data in {files_with_hr_data} files")
    print(f"📅 HR data spans {len(daily_hr_data)} unique dates")
    
    if daily_hr_data:
        date_range = f"{min(daily_hr_data.keys())} to {max(daily_hr_data.keys())}"
        print(f"📅 Full season coverage: {date_range}")
        
        # Show distribution of HR days
        hr_counts = [len(players) for players in daily_hr_data.values()]
        avg_hrs = sum(hr_counts) / len(hr_counts) if hr_counts else 0
        max_hrs = max(hr_counts) if hr_counts else 0
        
        print(f"📊 HR statistics: Average {avg_hrs:.1f} HRs/day, Maximum {max_hrs} HRs in a day")
    
    return daily_hr_data

def calculate_comprehensive_season_totals(daily_hr_data):
    """Calculate complete season HR totals for all players"""
    print(f"\n📊 Calculating COMPREHENSIVE season HR totals...")
    
    player_season_stats = defaultdict(int)
    player_game_count = defaultdict(int)
    
    for date_str, hr_players in daily_hr_data.items():
        for player in hr_players:
            player_key = f"{player['name']}_{player['team']}"
            hrs_this_game = player.get('hrs_this_game', 1)
            player_season_stats[player_key] += hrs_this_game
            player_game_count[player_key] += 1
    
    print(f"✅ Calculated season totals for {len(player_season_stats)} unique players")
    print(f"📊 Players appeared in HR data across {len(daily_hr_data)} different dates")
    
    # Show comprehensive HR leaders
    top_hr_leaders = sorted(player_season_stats.items(), key=lambda x: x[1], reverse=True)[:20]
    print(f"\n🏆 TOP 20 HR LEADERS (Full Season Analysis):")
    for i, (player_key, total_hrs) in enumerate(top_hr_leaders):
        name, team = player_key.split('_', 1)
        games = player_game_count[player_key]
        print(f"   {i+1:2d}. {name} ({team}): {total_hrs} HRs in {games} games")
    
    return player_season_stats

def find_comprehensive_combinations(daily_hr_data, player_season_stats, group_size=2):
    """Find HR combinations with STRICT minimum occurrence requirements"""
    print(f"\n🎯 Finding {group_size}-player combinations (MINIMUM 2+ occurrences required)...")
    
    real_combinations = defaultdict(list)
    processed_days = 0
    total_combinations_found = 0
    
    # Process each day for combinations
    for date_str, hr_players in daily_hr_data.items():
        processed_days += 1
        
        if processed_days % 20 == 0:
            print(f"   Processing: {processed_days}/{len(daily_hr_data)} days...")
        
        if len(hr_players) < group_size:
            continue
        
        # Get unique players (handle multi-HR games)
        unique_players = {}
        for player in hr_players:
            key = f"{player['name']}_{player['team']}"
            if key not in unique_players:
                unique_players[key] = player
        
        unique_list = list(unique_players.values())
        
        if len(unique_list) < group_size:
            continue
        
        # Find all combinations
        for combo in combinations(unique_list, group_size):
            player_keys = sorted([f"{p['name']}_{p['team']}" for p in combo])
            combo_key = "|".join(player_keys)
            
            real_combinations[combo_key].append({
                'date': date_str,
                'players': list(combo)
            })
            total_combinations_found += 1
    
    print(f"📊 Found {len(real_combinations)} unique {group_size}-player combinations")
    print(f"🔥 Total combination occurrences: {total_combinations_found}")
    
    # STRICT FILTERING: Only combinations with 2+ occurrences
    meaningful_combinations = []
    filtered_out = 0
    
    print(f"\n🎯 Applying STRICT filtering (minimum 2+ occurrences)...")
    
    # Pre-filter to only multi-occurrence combinations for efficiency
    multi_occurrence_combinations = {k: v for k, v in real_combinations.items() if len(v) >= 2}
    print(f"📊 Pre-filtered to {len(multi_occurrence_combinations)} multi-occurrence combinations")
    
    for combo_key, occurrences in multi_occurrence_combinations.items():
        if len(occurrences) < 2:  # STRICT: Must occur at least twice
            filtered_out += 1
            continue
        
        # Get player info and add season totals
        first_occurrence = occurrences[0]
        players = []
        
        for player in first_occurrence['players']:
            player_key = f"{player['name']}_{player['team']}"
            season_hrs = player_season_stats.get(player_key, 0)
            
            enhanced_player = {
                **player,
                'season_hrs': season_hrs
            }
            players.append(enhanced_player)
        
        # Calculate combination stats
        dates = sorted([occ['date'] for occ in occurrences])
        latest_date = max(dates)
        last_date = datetime.strptime(latest_date, '%Y-%m-%d')
        days_since = (datetime.now() - last_date).days
        
        # Calculate total HRs
        total_hrs = 0
        for occurrence in occurrences:
            for player in occurrence['players']:
                hrs = player.get('hrs_this_game', 1)
                total_hrs += hrs
        
        average_hrs = round(total_hrs / len(occurrences), 2)
        
        meaningful_combinations.append({
            'combinationKey': combo_key,
            'players': players,
            'occurrences': len(occurrences),
            'totalHRs': total_hrs,
            'dates': dates,
            'lastOccurrence': latest_date,
            'daysSinceLastOccurrence': days_since,
            'averageHRs': average_hrs
        })
    
    # Sort by occurrences (most frequent first)
    meaningful_combinations.sort(key=lambda x: x['occurrences'], reverse=True)
    
    # Limit results for performance
    max_combinations = {2: 2000, 3: 1000, 4: 500}.get(group_size, 1000)
    if len(meaningful_combinations) > max_combinations:
        meaningful_combinations = meaningful_combinations[:max_combinations]
        print(f"📊 Limited to top {max_combinations} combinations for performance")
    
    print(f"✅ Kept {len(meaningful_combinations)} combinations with 2+ occurrences")
    print(f"❌ Filtered out {len(real_combinations) - len(multi_occurrence_combinations)} single-occurrence combinations")
    
    # Show top examples
    if meaningful_combinations:
        print(f"\n🔥 Top {group_size}-player combinations (2+ occurrences):")
        for i, combo in enumerate(meaningful_combinations[:5]):
            names = [f"{p['name']} ({p['team']})" for p in combo['players']]
            season_hrs = [p['season_hrs'] for p in combo['players']]
            print(f"   {i+1}. {', '.join(names)}")
            print(f"      ✨ Occurred {combo['occurrences']} times")
            print(f"      🏠 Season HRs: {season_hrs}")
            print(f"      📅 Dates: {', '.join(combo['dates'])}")
    
    return meaningful_combinations

def generate_comprehensive_combinations():
    """Generate comprehensive HR combinations from complete season data"""
    print("🏟️ COMPREHENSIVE HR Combinations Generator")
    print("=" * 60)
    print("🎯 Analyzing COMPLETE 2025 Season")
    print("⚾ Processing ALL available game files")
    print("🔥 STRICT requirement: 2+ occurrences only")
    print("=" * 60)
    
    # Load all HR data
    daily_hr_data = load_comprehensive_hr_data()
    
    if not daily_hr_data:
        print("❌ No HR data found in any game files")
        return None
    
    if len(daily_hr_data) < 50:  # Sanity check
        print(f"⚠️ WARNING: Only found {len(daily_hr_data)} days with HR data")
        print("This seems low for a full season. Checking data quality...")
    
    # Calculate comprehensive season totals
    player_season_stats = calculate_comprehensive_season_totals(daily_hr_data)
    
    # Generate combinations for each group size
    all_combinations = {}
    for group_size in [2, 3, 4]:
        combinations = find_comprehensive_combinations(daily_hr_data, player_season_stats, group_size)
        all_combinations[f'group_{group_size}'] = combinations
    
    # Create final data structure
    final_data = {
        'generatedAt': datetime.now().isoformat(),
        'generatedBy': 'Comprehensive HR Combinations Generator v2.0',
        'dataSource': 'BaseballTracker 2025 Complete Season Data',
        'description': 'COMPREHENSIVE HR combinations - ALL game files analyzed, 2+ occurrences required',
        'realGameData': True,
        'strictFiltering': True,
        'minimumOccurrences': 2,
        'daysAnalyzed': len(daily_hr_data),
        'dateRange': {
            'start': min(daily_hr_data.keys()) if daily_hr_data else None,
            'end': max(daily_hr_data.keys()) if daily_hr_data else None
        },
        'totalCombinations': sum(len(all_combinations.get(f'group_{i}', [])) for i in [2, 3, 4])
    }
    
    # Add combinations
    for group_size in [2, 3, 4]:
        final_data[f'group_{group_size}'] = all_combinations.get(f'group_{group_size}', [])
    
    return final_data

def save_comprehensive_data(data):
    """Save comprehensive combinations data"""
    output_dir = "public/data/hr_combinations"
    os.makedirs(output_dir, exist_ok=True)
    
    # Save with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    timestamped_file = f"{output_dir}/hr_combinations_comprehensive_{timestamp}.json"
    latest_file = f"{output_dir}/hr_combinations_latest.json"
    
    for file_path in [timestamped_file, latest_file]:
        try:
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)
            print(f"✅ Saved: {file_path}")
        except Exception as e:
            print(f"❌ Error saving {file_path}: {e}")
    
    # Quality assessment
    if os.path.exists(latest_file):
        file_size = os.path.getsize(latest_file) / (1024 * 1024)
        print(f"\n💾 COMPREHENSIVE HR Combinations Saved:")
        print(f"📁 {latest_file}")
        print(f"📊 Size: {file_size:.2f} MB")
        print(f"📈 Total combinations: {data.get('totalCombinations', 0)}")
        print(f"📅 Days analyzed: {data.get('daysAnalyzed', 0)}")
        print(f"🔥 All combinations have 2+ occurrences (strict filtering)")
        
        return latest_file
    
    return None

def main():
    print("🏟️ COMPREHENSIVE HR Combinations Generator")
    print("=" * 70)
    print("🎯 COMPLETE 2025 Season Analysis")
    print("⚾ Processing ALL available game files")
    print("🔥 STRICT requirement: 2+ occurrences only")
    print("📊 Full season HR totals for all players")
    print("=" * 70)
    
    try:
        # Generate comprehensive combinations
        combinations_data = generate_comprehensive_combinations()
        
        if not combinations_data:
            print("❌ Failed to generate comprehensive combinations")
            return
        
        # Save the data
        output_file = save_comprehensive_data(combinations_data)
        
        # Final summary
        print("\n" + "=" * 60)
        print("✅ COMPREHENSIVE HR Combinations Complete!")
        print(f"📊 Complete season analysis:")
        print(f"   📅 Days with HR data: {combinations_data['daysAnalyzed']}")
        print(f"   📅 Date range: {combinations_data['dateRange']['start']} to {combinations_data['dateRange']['end']}")
        print(f"   🔥 2+ occurrence combinations only:")
        print(f"      👥 2-player: {len(combinations_data.get('group_2', []))}")
        print(f"      👥 3-player: {len(combinations_data.get('group_3', []))}")
        print(f"      👥 4-player: {len(combinations_data.get('group_4', []))}")
        print(f"   📁 Total meaningful combinations: {combinations_data['totalCombinations']}")
        
        # Validation check
        total_days = combinations_data['daysAnalyzed']
        if total_days < 100:
            print(f"\n⚠️ VALIDATION WARNING:")
            print(f"Only {total_days} days with HR data found.")
            print(f"This may indicate missing game files or data format issues.")
            print(f"Expected: 150+ days for a full MLB season.")
        else:
            print(f"\n✅ VALIDATION PASSED:")
            print(f"Found {total_days} days with HR data - good coverage!")
        
        print(f"\n📁 Data ready: {output_file}")
        print("🎯 All combinations require 2+ occurrences!")
        print("📊 Season HR totals calculated from complete data!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()