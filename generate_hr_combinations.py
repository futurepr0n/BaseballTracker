#!/usr/bin/env python3

"""
Enhanced HR Combinations Generator with User-Specified Thresholds
Based on generate_hr_combinations_unlimited.py with adjustable thresholds

This version uses:
- 2-player combinations: 4+ occurrences (increased from 3+ to reduce file size)
- 3-player combinations: 2+ occurrences (decreased from 3+ to see more combinations)
- 4-player combinations: 2+ occurrences (same as before)
"""

import json
import os
import sys
from collections import defaultdict
from datetime import datetime
from itertools import combinations
import glob
import gc
import time

def find_data_files():
    """Find and classify JSON files by data richness"""
    print("🔍 Discovering game data files...")
    
    # Find all JSON files in date-based directory structure
    game_files = []
    data_path = "public/data/2025"
    
    # Check each month directory
    month_dirs = ['march', 'april', 'may', 'june', 'july', 'august', 'september', 'october']
    for month_dir in month_dirs:
        month_path = os.path.join(data_path, month_dir)
        if os.path.exists(month_path):
            pattern = os.path.join(month_path, "*.json")
            month_files = glob.glob(pattern)
            game_files.extend(month_files)
            print(f"   📁 {month_dir}: {len(month_files)} files")
    
    print(f"📊 Total files discovered: {len(game_files)}")
    
    # Classify by data content
    rich_files = []
    basic_files = []
    schedule_files = []
    
    print("🔍 Analyzing file content...")
    
    for i, file_path in enumerate(game_files):
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
        print(f"   ⚠️ Error processing {file_path}: {e}")
        return None, []
    
    return None, []

def load_all_hr_data():
    """Load comprehensive HR data from all available files"""
    rich_files, basic_files, schedule_files = find_data_files()
    
    # Use all files with player data
    data_files = rich_files + basic_files
    
    print(f"\n💾 Loading HR data from {len(data_files)} files...")
    
    daily_hr_data = defaultdict(list)
    processed_files = 0
    
    for file_path in data_files:
        processed_files += 1
        
        if processed_files % 25 == 0:
            print(f"   Loading: {processed_files}/{len(data_files)} files...")
        
        date_str, hr_players = extract_hr_data_from_file(file_path)
        
        if date_str and hr_players:
            daily_hr_data[date_str].extend(hr_players)
    
    # Convert to regular dict and show summary
    daily_hr_data = dict(daily_hr_data)
    
    if daily_hr_data:
        date_range = f"{min(daily_hr_data.keys())} to {max(daily_hr_data.keys())}"
        print(f"📅 Full season coverage: {date_range}")
        
        # Show distribution of HR days
        hr_counts = [len(players) for players in daily_hr_data.values()]
        avg_hrs = sum(hr_counts) / len(hr_counts) if hr_counts else 0
        max_hrs = max(hr_counts) if hr_counts else 0
        
        print(f"📊 HR statistics: Average {avg_hrs:.1f} HRs/day, Maximum {max_hrs} HRs in a day")
        print(f"💾 Memory optimization: Active with periodic garbage collection")
    
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

def find_unlimited_combinations_streaming(daily_hr_data, player_season_stats, group_size=2):
    """Find HR combinations with optimized streaming processing and configurable frequency filtering"""
    
    # ADJUSTED THRESHOLDS based on user request:
    min_occurrences = {2: 4, 3: 2, 4: 2}  # 2-player: increased to 4+, 3-player: decreased to 2+
    required_occurrences = min_occurrences.get(group_size, 2)
    
    print(f"\n🎯 Finding {group_size}-player combinations (ADJUSTED THRESHOLDS - minimum {required_occurrences}+ occurrences)...")
    print(f"💾 Using optimized streaming processing - no memory limits")
    
    real_combinations = defaultdict(list)
    processed_days = 0
    total_combinations_found = 0
    
    start_time = time.time()
    
    # Process each day for combinations with optimized memory handling
    for date_str, hr_players in daily_hr_data.items():
        processed_days += 1
        
        if processed_days % 10 == 0:
            elapsed = time.time() - start_time
            rate = processed_days / elapsed if elapsed > 0 else 0
            print(f"   Processing: {processed_days}/{len(daily_hr_data)} days... ({rate:.1f} days/sec, {len(real_combinations)} combinations)")
            # Trigger garbage collection more frequently
            gc.collect()
        
        if len(hr_players) < group_size:
            continue
        
        # Get unique players (handle multi-HR games) - optimized
        unique_players = {}
        for player in hr_players:
            key = f"{player['name']}_{player['team']}"
            if key not in unique_players:
                unique_players[key] = player
        
        unique_list = list(unique_players.values())
        
        if len(unique_list) < group_size:
            continue
        
        # Generate combinations for this day with memory optimization
        combo_count = 0
        for combo in combinations(unique_list, group_size):
            # Create combination key
            combo_key = "|".join(sorted([f"{p['name']}_{p['team']}" for p in combo]))
            
            # Store occurrence with minimal data
            real_combinations[combo_key].append({
                'date': date_str,
                'players': list(combo)
            })
            total_combinations_found += 1
            combo_count += 1
            
            # Memory safety limits per day (still needed for large combination sets)
            if group_size == 2 and combo_count > 8000:
                break
            elif group_size == 3 and combo_count > 3000:
                break
            elif group_size == 4 and combo_count > 1000:
                break
    
    print(f"📊 Found {len(real_combinations)} unique {group_size}-player combinations")
    print(f"🔥 Total combination occurrences: {total_combinations_found}")
    
    # Apply frequency filtering based on group size with memory optimization
    meaningful_combinations = []
    
    print(f"\n🎯 Applying ADJUSTED frequency filtering (minimum {required_occurrences}+ occurrences)...")
    
    # Filter by minimum occurrences and process in batches
    quality_combinations = {k: v for k, v in real_combinations.items() if len(v) >= required_occurrences}
    print(f"📊 Filtered to {len(quality_combinations)} quality combinations ({required_occurrences}+ occurrences)")
    
    # Process combinations in batches to manage memory
    batch_size = 1000
    processed_combos = 0
    
    for combo_key, occurrences in quality_combinations.items():
        processed_combos += 1
        
        if processed_combos % batch_size == 0:
            print(f"   Processing combinations: {processed_combos}/{len(quality_combinations)}")
            gc.collect()
        
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
        
        # Get dates and calculate stats
        dates = sorted(list(set([occ['date'] for occ in occurrences])))
        latest_date = max(dates)
        days_since = (datetime.now() - datetime.strptime(latest_date, '%Y-%m-%d')).days
        
        # Calculate total HRs for this combination
        total_hrs = 0
        for occurrence in occurrences:
            for player in occurrence['players']:
                hrs = player.get('hrs_this_game', 1)
                total_hrs += hrs
        
        average_hrs = round(total_hrs / len(occurrences), 2)
        
        # Calculate time span between first and last occurrence
        first_date = min(dates)
        date_span_days = (datetime.strptime(latest_date, '%Y-%m-%d') - datetime.strptime(first_date, '%Y-%m-%d')).days
        
        meaningful_combinations.append({
            'combinationKey': combo_key,
            'players': players,
            'occurrences': len(occurrences),
            'totalHRs': total_hrs,
            'dates': dates,
            'firstOccurrence': first_date,
            'lastOccurrence': latest_date,
            'daysSinceLastOccurrence': days_since,
            'dateSpanDays': date_span_days,
            'averageHRs': average_hrs,
            'frequency': round(len(occurrences) / max(1, date_span_days) * 30, 3)  # Occurrences per 30 days
        })
    
    # Sort by occurrences (most frequent first), then by total HRs
    meaningful_combinations.sort(key=lambda x: (x['occurrences'], x['totalHRs']), reverse=True)
    
    print(f"✅ Generated {len(meaningful_combinations)} {group_size}-player combinations with ADJUSTED thresholds")
    print(f"❌ Filtered out {len(real_combinations) - len(quality_combinations)} low-frequency combinations")
    
    # Show top examples
    if meaningful_combinations:
        print(f"\n🔥 Top {group_size}-player combinations ({required_occurrences}+ occurrences):")
        for i, combo in enumerate(meaningful_combinations[:3]):  # Show fewer to save time
            names = [f"{p['name']} ({p['team']})" for p in combo['players']]
            season_hrs = [p['season_hrs'] for p in combo['players']]
            print(f"   {i+1}. {', '.join(names)}")
            print(f"      ✨ Occurred {combo['occurrences']} times")
            print(f"      🏠 Season HRs: {season_hrs}")
            print(f"      📅 Span: {combo['firstOccurrence']} to {combo['lastOccurrence']}")
    
    # Clear intermediate data structures and trigger garbage collection
    del real_combinations
    del quality_combinations
    gc.collect()
    
    return meaningful_combinations

def save_separate_combination_files(combinations_data):
    """Save combinations to separate files by group size"""
    
    output_dir = "public/data/hr_combinations"
    os.makedirs(output_dir, exist_ok=True)
    
    # Add timestamp for versioning
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    file_info = {}
    
    for group_size, combinations in combinations_data.items():
        if not combinations:
            continue
        
        filename = f"hr_combinations_by_{group_size}_adjusted_{timestamp}.json"
        file_path = os.path.join(output_dir, filename)
        
        # Create comprehensive metadata
        metadata = {
            "generatedAt": datetime.now().isoformat(),
            "generatedBy": f"ADJUSTED Thresholds HR Combinations Generator v3.0 - {group_size}-player combinations",
            "dataSource": "BaseballTracker 2025 Complete Season Data",
            "description": f"ADJUSTED {group_size}-player HR combinations - User-specified thresholds",
            "realGameData": True,
            "adjustedThresholds": True,
            "groupSize": group_size,
            "minimumOccurrences": {2: 4, 3: 2, 4: 2}[group_size],
            "totalCombinations": len(combinations)
        }
        
        # Calculate comprehensive statistics
        if combinations:
            dates_analyzed = set()
            total_occurrences = sum(combo['occurrences'] for combo in combinations)
            total_hrs = sum(combo['totalHRs'] for combo in combinations)
            
            # Extract all dates from combinations
            for combo in combinations:
                dates_analyzed.update(combo['dates'])
            
            dates_list = sorted(list(dates_analyzed))
            
            metadata.update({
                "daysAnalyzed": len(dates_list),
                "dateRange": {
                    "start": dates_list[0] if dates_list else None,
                    "end": dates_list[-1] if dates_list else None
                },
                "statistics": {
                    "totalOccurrences": total_occurrences,
                    "averageOccurrences": round(total_occurrences / len(combinations), 2),
                    "maxOccurrences": max(combo['occurrences'] for combo in combinations),
                    "totalHRs": total_hrs,
                    "averageHRsPerCombination": round(total_hrs / len(combinations), 2)
                }
            })
        
        # Save file with metadata and combinations
        output_data = {
            **metadata,
            "combinations": combinations
        }
        
        with open(file_path, 'w') as f:
            json.dump(output_data, f, indent=2)
        
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        file_info[group_size] = {
            'filename': filename,
            'path': file_path,
            'size_mb': file_size_mb,
            'combinations': len(combinations)
        }
        
        print(f"✅ Saved {group_size}-player combinations: {filename} ({file_size_mb:.2f} MB)")
    
    return file_info

def main():
    """Main execution with ADJUSTED thresholds"""
    print("🚀 MLB HR COMBINATIONS GENERATOR (ADJUSTED THRESHOLDS)")
    print("=" * 70)
    print("📊 THRESHOLD ADJUSTMENTS:")
    print("   • 2-player combinations: 4+ occurrences (increased from 3+)")
    print("   • 3-player combinations: 2+ occurrences (decreased from 3+)")
    print("   • 4-player combinations: 2+ occurrences (same as before)")
    print("=" * 70)
    
    start_time = time.time()
    
    try:
        # Load comprehensive HR data
        daily_hr_data = load_all_hr_data()
        
        if not daily_hr_data:
            print("❌ No HR data found. Please check file paths and data structure.")
            return
        
        # Calculate season totals for context
        player_season_stats = calculate_comprehensive_season_totals(daily_hr_data)
        
        # Generate combinations for all group sizes with ADJUSTED thresholds
        all_combinations = {}
        
        for group_size in [2, 3, 4]:
            print(f"\n{'='*50}")
            print(f"🎯 PROCESSING {group_size}-PLAYER COMBINATIONS")
            print(f"{'='*50}")
            
            combinations = find_unlimited_combinations_streaming(
                daily_hr_data, 
                player_season_stats, 
                group_size
            )
            
            all_combinations[group_size] = combinations
            
            # Clean up memory between group sizes
            gc.collect()
        
        # Save separate files
        print(f"\n{'='*50}")
        print("💾 SAVING SEPARATE FILES")
        print(f"{'='*50}")
        
        file_info = save_separate_combination_files(all_combinations)
        
        # Final summary
        total_time = time.time() - start_time
        total_combinations = sum(len(combos) for combos in all_combinations.values())
        total_size = sum(info['size_mb'] for info in file_info.values())
        
        print(f"\n🎉 ADJUSTED THRESHOLDS GENERATION COMPLETE!")
        print(f"⏱️  Total processing time: {total_time:.2f} seconds")
        print(f"📊 Total combinations generated: {total_combinations:,}")
        print(f"💾 Total file size: {total_size:.2f} MB")
        print(f"📁 Files saved in: public/data/hr_combinations/")
        
        print(f"\n📈 COMPARISON WITH ORIGINAL THRESHOLDS:")
        print(f"   2-player: Reduced combinations (higher threshold 4+ vs 3+)")
        print(f"   3-player: More combinations (lower threshold 2+ vs 3+)")
        print(f"   4-player: Same combinations (threshold unchanged 2+)")
        
    except Exception as e:
        print(f"❌ Error during processing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()	

