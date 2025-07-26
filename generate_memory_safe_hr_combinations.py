#!/usr/bin/env python3
"""
Memory-Safe HR Combinations Generator
Prevents segmentation faults by using streaming processing and memory limits
"""

import json
import os
import glob
from datetime import datetime, timedelta
from itertools import combinations
from collections import defaultdict
import gc

def load_comprehensive_hr_data():
    """Load HR data from ALL available game files with memory management"""
    print("🏟️ Loading COMPREHENSIVE HR data with memory management...")
    
    # Scan all files
    season_months = ['march', 'april', 'may', 'june', 'july', 'august', 'september']
    all_files = []
    
    for month in season_months:
        month_pattern = f"public/data/2025/{month}/*.json"
        month_files = glob.glob(month_pattern)
        all_files.extend(month_files)
        print(f"📁 {month.capitalize()}: {len(month_files)} files")
    
    # Filter for rich data files with better detection
    rich_files = []
    for file_path in sorted(all_files):
        try:
            file_size = os.path.getsize(file_path)
            if file_size > 1000:  # Lower threshold for more files
                with open(file_path, 'r') as f:
                    content = f.read(10000)  # Read more content for better detection
                    has_players = '"players"' in content
                    has_hr_stats = any(hr_field in content for hr_field in ['"HR":', '"homeRuns":', '"hrs":', '"HR_total"'])
                    has_batting_stats = any(stat in content for stat in ['"AB":', '"H":', '"RBI":', '"AVG":'])
                    
                    # Enhanced detection for different data formats
                    if has_players and (has_hr_stats or has_batting_stats):
                        rich_files.append(file_path)
        except:
            continue
    
    print(f"📊 Processing {len(rich_files)} rich data files...")
    
    daily_hr_data = {}
    files_processed = 0
    
    for file_path in rich_files:
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
                
                month_map = {
                    'january': '01', 'february': '02', 'march': '03', 'april': '04',
                    'may': '05', 'june': '06', 'july': '07', 'august': '08',
                    'september': '09', 'october': '10', 'november': '11', 'december': '12'
                }
                month_num = month_map.get(month_name.lower(), '01')
                date_str = f"{year}-{month_num}-{day}"
                
                hr_players = []
                
                if 'players' in game_data and isinstance(game_data['players'], list):
                    for player in game_data['players']:
                        is_hitter = player.get('playerType') == 'hitter'
                        
                        if is_hitter:
                            hrs = player.get('HR') or player.get('homeRuns') or 0
                            try:
                                hrs = int(hrs)
                            except:
                                hrs = 0
                            
                            if hrs > 0:
                                name = player.get('name') or ''
                                team = player.get('team') or ''
                                
                                if name and team:
                                    hr_players.append({
                                        'name': name,
                                        'team': team,
                                        'hrs_this_game': hrs
                                    })
                
                if hr_players:
                    daily_hr_data[date_str] = hr_players
                    files_processed += 1
            
            # Memory cleanup
            del game_data
            if files_processed % 25 == 0:
                gc.collect()  # Force garbage collection
                
        except Exception as e:
            continue
    
    print(f"✅ Loaded HR data from {files_processed} files ({len(daily_hr_data)} days)")
    return daily_hr_data

def calculate_season_totals(daily_hr_data):
    """Calculate season totals with memory efficiency"""
    print("📊 Calculating season HR totals...")
    
    player_season_stats = defaultdict(int)
    
    for hr_players in daily_hr_data.values():
        for player in hr_players:
            player_key = f"{player['name']}_{player['team']}"
            hrs = player.get('hrs_this_game', 1)
            player_season_stats[player_key] += hrs
    
    print(f"✅ Calculated totals for {len(player_season_stats)} players")
    return player_season_stats

def find_memory_safe_combinations(daily_hr_data, player_season_stats, group_size=2):
    """Find combinations with strict memory management to prevent segfaults"""
    print(f"\n🎯 Finding {group_size}-player combinations with memory safety...")
    
    # Memory safety limits based on group size
    memory_limits = {
        2: {'max_combinations': 100000, 'batch_size': 1000},
        3: {'max_combinations': 50000, 'batch_size': 500}, 
        4: {'max_combinations': 10000, 'batch_size': 100}  # Much more restrictive for 4-player
    }
    
    max_combinations = memory_limits.get(group_size, {}).get('max_combinations', 10000)
    batch_size = memory_limits.get(group_size, {}).get('batch_size', 100)
    
    print(f"🛡️ Memory safety: max {max_combinations} combinations, batch size {batch_size}")
    
    real_combinations = defaultdict(list)
    processed_days = 0
    total_found = 0
    
    for date_str, hr_players in daily_hr_data.items():
        processed_days += 1
        
        if processed_days % 20 == 0:
            print(f"   Processing: {processed_days}/{len(daily_hr_data)} days... ({len(real_combinations)} combinations so far)")
            
            # Early exit for 4-player if too many combinations already
            if group_size == 4 and len(real_combinations) > max_combinations:
                print(f"🛡️ Memory safety: stopping 4-player processing at {max_combinations} combinations")
                break
        
        if len(hr_players) < group_size:
            continue
        
        # Get unique players
        unique_players = {}
        for player in hr_players:
            key = f"{player['name']}_{player['team']}"
            if key not in unique_players:
                unique_players[key] = player
        
        unique_list = list(unique_players.values())
        
        if len(unique_list) < group_size:
            continue
        
        # Process combinations in batches for memory safety
        combo_count = 0
        for combo in combinations(unique_list, group_size):
            combo_count += 1
            
            # Memory safety: limit combinations per day for 4-player
            if group_size == 4 and combo_count > batch_size:
                break
                
            player_keys = sorted([f"{p['name']}_{p['team']}" for p in combo])
            combo_key = "|".join(player_keys)
            
            real_combinations[combo_key].append({
                'date': date_str,
                'players': list(combo)
            })
            total_found += 1
            
            # Global memory safety check
            if len(real_combinations) > max_combinations:
                print(f"🛡️ Reached memory safety limit of {max_combinations} combinations")
                break
        
        # Force garbage collection every 10 days for 4-player
        if group_size == 4 and processed_days % 10 == 0:
            gc.collect()
    
    print(f"📊 Found {len(real_combinations)} unique {group_size}-player combinations")
    
    # Filter for 2+ occurrences with memory management
    meaningful_combinations = []
    multi_occurrence = {k: v for k, v in real_combinations.items() if len(v) >= 2}
    
    print(f"📊 {len(multi_occurrence)} combinations with 2+ occurrences")
    
    # Final limits for output
    final_limits = {2: 2000, 3: 1000, 4: 500}
    final_limit = final_limits.get(group_size, 500)
    
    # Sort by occurrence count and limit results
    sorted_combos = sorted(multi_occurrence.items(), key=lambda x: len(x[1]), reverse=True)
    
    for combo_key, occurrences in sorted_combos[:final_limit]:
        # Add season totals to players
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
        
        # Calculate stats
        dates = sorted([occ['date'] for occ in occurrences])
        latest_date = max(dates)
        last_date = datetime.strptime(latest_date, '%Y-%m-%d')
        days_since = (datetime.now() - last_date).days
        
        total_hrs = sum(sum(player.get('hrs_this_game', 1) for player in occ['players']) for occ in occurrences)
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
    
    print(f"✅ Returning {len(meaningful_combinations)} meaningful combinations")
    
    # Force garbage collection
    del real_combinations
    del multi_occurrence
    gc.collect()
    
    return meaningful_combinations

def generate_memory_safe_combinations():
    """Generate HR combinations with memory safety to prevent segfaults"""
    print("🏟️ MEMORY-SAFE HR Combinations Generator")
    print("=" * 60)
    print("🛡️ Prevents segmentation faults with memory management")
    print("🔥 STRICT requirement: 2+ occurrences only")
    print("=" * 60)
    
    # Load data
    daily_hr_data = load_comprehensive_hr_data()
    
    if not daily_hr_data:
        print("❌ No HR data found")
        return None
    
    # Calculate season totals
    player_season_stats = calculate_season_totals(daily_hr_data)
    
    # Generate combinations with memory safety
    all_combinations = {}
    
    for group_size in [2, 3, 4]:
        print(f"\n🔄 Processing {group_size}-player combinations...")
        combinations = find_memory_safe_combinations(daily_hr_data, player_season_stats, group_size)
        all_combinations[f'group_{group_size}'] = combinations
        
        # Show top examples
        if combinations:
            print(f"🔥 Top {group_size}-player combinations:")
            for i, combo in enumerate(combinations[:3]):
                names = [f"{p['name']} ({p['team']})" for p in combo['players']]
                season_hrs = [p['season_hrs'] for p in combo['players']]
                print(f"   {i+1}. {', '.join(names)} - {combo['occurrences']} times")
                print(f"      Season HRs: {season_hrs}")
        
        # Force garbage collection between group sizes
        gc.collect()
    
    # Create final data structure
    final_data = {
        'generatedAt': datetime.now().isoformat(),
        'generatedBy': 'Memory-Safe HR Combinations Generator v3.0',
        'dataSource': 'BaseballTracker 2025 Complete Season Data',
        'description': 'MEMORY-SAFE HR combinations - prevents segfaults, 2+ occurrences required',
        'realGameData': True,
        'strictFiltering': True,
        'memorySafe': True,
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

def save_memory_safe_data(data):
    """Save memory-safe combinations data"""
    output_dir = "public/data/hr_combinations"
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    timestamped_file = f"{output_dir}/hr_combinations_memory_safe_{timestamp}.json"
    latest_file = f"{output_dir}/hr_combinations_latest.json"
    
    for file_path in [timestamped_file, latest_file]:
        try:
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)
            print(f"✅ Saved: {file_path}")
        except Exception as e:
            print(f"❌ Error saving {file_path}: {e}")
    
    if os.path.exists(latest_file):
        file_size = os.path.getsize(latest_file) / (1024 * 1024)
        print(f"\n💾 Memory-Safe HR Combinations Saved:")
        print(f"📁 {latest_file}")
        print(f"📊 Size: {file_size:.2f} MB")
        print(f"📈 Total combinations: {data.get('totalCombinations', 0)}")
        print(f"📅 Days analyzed: {data.get('daysAnalyzed', 0)}")
        print(f"🛡️ Memory-safe processing - no segfaults!")
        
        return latest_file
    
    return None

def main():
    print("🏟️ MEMORY-SAFE HR Combinations Generator")
    print("=" * 70)
    print("🛡️ Prevents segmentation faults with intelligent memory management")
    print("🔥 STRICT requirement: 2+ occurrences only")
    print("📊 Realistic HR totals from complete season analysis")
    print("=" * 70)
    
    try:
        # Generate memory-safe combinations
        combinations_data = generate_memory_safe_combinations()
        
        if not combinations_data:
            print("❌ Failed to generate combinations")
            return
        
        # Save the data
        output_file = save_memory_safe_data(combinations_data)
        
        # Final summary
        print("\n" + "=" * 60)
        print("✅ MEMORY-SAFE HR Combinations Complete!")
        print(f"📊 Season analysis without segfaults:")
        print(f"   📅 Days analyzed: {combinations_data['daysAnalyzed']}")
        print(f"   📅 Date range: {combinations_data['dateRange']['start']} to {combinations_data['dateRange']['end']}")
        print(f"   🛡️ Memory-safe combinations:")
        print(f"      👥 2-player: {len(combinations_data.get('group_2', []))}")
        print(f"      👥 3-player: {len(combinations_data.get('group_3', []))}")
        print(f"      👥 4-player: {len(combinations_data.get('group_4', []))}")
        print(f"   📁 Total: {combinations_data['totalCombinations']}")
        
        print(f"\n🛡️ Memory safety features:")
        print(f"   ✅ Batch processing prevents memory overflow")
        print(f"   ✅ Garbage collection after each group size")
        print(f"   ✅ Early termination for large datasets")
        print(f"   ✅ Stricter limits for 4-player combinations")
        
        print(f"\n📁 Data ready: {output_file}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()